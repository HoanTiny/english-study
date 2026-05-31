import { NextRequest } from "next/server";
import { geminiConfigured, geminiGenerate } from "@/lib/server/gemini";

export const runtime = "nodejs";

// Tra từ điển trong app — nguồn FREE:
//  • Gemini: nghĩa Việt + định nghĩa + ví dụ (tra được cả Anh→Việt lẫn Việt→Anh)
//  • Free Dictionary (dictionaryapi.dev): audio + IPA giọng US/UK thật
// GET /api/dict?q=hello  → { results: [{ en, pos, vi, definition, example, exampleVi, ipa, us, uk }] }

const FD = "https://api.dictionaryapi.dev/api/v2/entries/en";

type Accent = { ipa?: string; audio?: string };
type Sense = {
  en: string; pos: string; vi: string; definition: string; example: string; exampleVi: string;
  ipa?: string; us?: Accent; uk?: Accent;
};

const SYSTEM = `Bạn là từ điển Anh–Việt cho người học. Người dùng nhập một TỪ/CỤM bằng tiếng Anh hoặc tiếng Việt.
Trả về DUY NHẤT một object JSON:
{
  "senses": [ tối đa 3 mục, mỗi mục:
    { "en": "<từ/cụm tiếng Anh>", "pos": "<loại từ tiếng Việt: danh từ/động từ/tính từ/trạng từ...>",
      "vi": "<nghĩa tiếng Việt ngắn>", "definition": "<định nghĩa tiếng Anh ngắn>",
      "example": "<câu ví dụ tiếng Anh>", "exampleVi": "<dịch câu ví dụ>" } ],
  "family": [ các từ CÙNG HỌ (word family) liên quan, tối đa 6, gồm cả từ gốc,
    mỗi mục: { "word": "<từ tiếng Anh>", "pos": "<viết tắt: n/v/adj/adv/prep/conj...>", "vi": "<nghĩa Việt ngắn>" } ]
}
Ví dụ "adventure" → family: adventure (n), adventure (v), adventurous (adj), adventurously (adv).
Nếu input là tiếng Việt: senses là các từ tiếng Anh tương ứng; family theo từ tiếng Anh chính.`;

// Loại từ tiếng Anh → nhãn tiếng Việt (cho fallback Free Dictionary).
const POS_VI: Record<string, string> = {
  noun: "danh từ", verb: "động từ", adjective: "tính từ", adverb: "trạng từ",
  pronoun: "đại từ", preposition: "giới từ", conjunction: "liên từ",
  interjection: "thán từ", exclamation: "thán từ", determiner: "từ hạn định", numeral: "số từ",
};

type FDEntry = {
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: { partOfSpeech?: string; definitions?: { definition?: string; example?: string }[] }[];
};

async function fetchFD(en: string): Promise<FDEntry[] | null> {
  if (/\s/.test(en.trim())) return null; // FD chỉ tra từ đơn
  try {
    const res = await fetch(`${FD}/${encodeURIComponent(en.trim().toLowerCase())}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as FDEntry[];
  } catch {
    return null;
  }
}

const stripSlash = (s?: string) =>
  s
    ? s
        .replace(/^\/+|\/+$/g, "")
        .replace(/[͜͡]/g, "")
        .replace(/ʧ/g, "tʃ")
        .replace(/ʤ/g, "dʒ")
        .replace(/ɚ/g, "ər")
        .replace(/ɝ/g, "ɜr")
        .replace(/\s+/g, " ")
        .trim() || undefined
    : s;

function accentsFrom(json: FDEntry[]): { ipa?: string; us?: Accent; uk?: Accent } {
  const ph = json.flatMap((e) => e.phonetics ?? []);
  const ipa = stripSlash(json.find((e) => e.phonetic)?.phonetic || ph.find((p) => p.text)?.text);
  const pick = (tag: string): Accent | undefined => {
    const p = ph.find((x) => x.audio?.toLowerCase().includes(tag));
    return p ? { ipa: stripSlash(p.text), audio: p.audio } : undefined;
  };
  return { ipa, us: pick("-us."), uk: pick("-uk.") };
}

// Dịch sang tiếng Việt qua endpoint Google Translate công khai (không cần key).
async function translateToVi(text: string): Promise<string> {
  const t = (text || "").trim();
  if (!t) return "";
  try {
    const r = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(t)}`,
      { next: { revalidate: 86400 } },
    );
    if (!r.ok) return "";
    const data = await r.json();
    if (Array.isArray(data?.[0])) {
      return (data[0] as [string][]).map((seg) => seg?.[0] || "").join("").trim();
    }
    return "";
  } catch {
    return "";
  }
}

async function enrich(en: string): Promise<{ ipa?: string; us?: Accent; uk?: Accent }> {
  const json = await fetchFD(en);
  return json ? accentsFrom(json) : {};
}

// Fallback khi Gemini lỗi/hết quota: dựng nghĩa từ Free Dictionary (định nghĩa tiếng Anh).
async function freeDictSenses(q: string): Promise<Sense[]> {
  const json = await fetchFD(q);
  if (!json || json.length === 0) return [];
  const acc = accentsFrom(json);
  const out: Sense[] = [];
  for (const e of json) {
    for (const m of e.meanings ?? []) {
      const def = m.definitions?.find((d) => d.definition);
      if (!def) continue;
      out.push({
        en: q,
        pos: POS_VI[(m.partOfSpeech || "").toLowerCase()] || m.partOfSpeech || "",
        vi: "",
        definition: def.definition ?? "",
        example: def.example ?? "",
        exampleVi: "",
        ipa: acc.ipa,
        us: acc.us,
        uk: acc.uk,
      });
      if (out.length >= 3) break;
    }
    if (out.length >= 3) break;
  }
  // Bổ sung nghĩa tiếng Việt (dịch máy) cho từ + ví dụ.
  const viWord = await translateToVi(q);
  await Promise.all(
    out.map(async (s) => {
      s.vi = viWord;
      if (s.example) s.exampleVi = await translateToVi(s.example);
    }),
  );
  return out;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length > 60) return Response.json({ results: [], error: "invalid" }, { status: 400 });

  // 1) Ưu tiên Gemini (có nghĩa tiếng Việt + tra được cả Việt→Anh).
  let geminiFailed = false;
  if (geminiConfigured()) {
    try {
      const text = await geminiGenerate(
        [{ role: "user", parts: [{ text: `Tra: ${q}` }] }],
        { system: SYSTEM, jsonMode: true, temperature: 0.2 },
      );
      const parsed = JSON.parse(text);
      const arr: Sense[] = Array.isArray(parsed?.senses)
        ? parsed.senses.slice(0, 3)
        : Array.isArray(parsed)
        ? parsed.slice(0, 3)
        : [];
      const family = Array.isArray(parsed?.family)
        ? (parsed.family as { word?: string; pos?: string; vi?: string }[])
            .filter((f) => f?.word)
            .slice(0, 6)
        : [];
      const enriched = (
        await Promise.all(
          arr.map(async (s) => {
            if (!s?.en) return null;
            const acc = await enrich(s.en);
            return { ...s, ipa: acc.ipa, us: acc.us, uk: acc.uk };
          }),
        )
      ).filter(Boolean);
      if (enriched.length) return Response.json({ results: enriched, family, source: "gemini" });
    } catch (e) {
      geminiFailed = true;
      console.error("dict gemini error", e instanceof Error ? e.message : e);
    }
  }

  // 2) Fallback Free Dictionary (từ tiếng Anh) — vẫn có loại từ + định nghĩa + audio.
  const fd = await freeDictSenses(q);
  if (fd.length) return Response.json({ results: fd, source: "freedict" });

  // 3) Không có gì — báo rõ nếu do Gemini quá tải.
  return Response.json({
    results: [],
    source: geminiFailed ? "overloaded" : geminiConfigured() ? "notfound" : "unconfigured",
  });
}
