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
Trả về tối đa 3 mục phù hợp nhất. Mỗi mục là object:
{ "en": "<từ/cụm tiếng Anh>", "pos": "<loại từ tiếng Việt: danh từ/động từ/tính từ/trạng từ/thán từ...>",
  "vi": "<nghĩa tiếng Việt ngắn>", "definition": "<định nghĩa tiếng Anh ngắn>",
  "example": "<câu ví dụ tiếng Anh>", "exampleVi": "<dịch câu ví dụ>" }
Nếu input là tiếng Việt: đưa ra các từ tiếng Anh tương ứng. Trả về DUY NHẤT mảng JSON.`;

async function enrich(en: string): Promise<{ ipa?: string; us?: Accent; uk?: Accent }> {
  const empty: { ipa?: string; us?: Accent; uk?: Accent } = {};
  if (/\s/.test(en.trim())) return empty; // chỉ tra audio cho từ đơn
  try {
    const res = await fetch(`${FD}/${encodeURIComponent(en.trim().toLowerCase())}`, { next: { revalidate: 86400 } });
    if (!res.ok) return empty;
    const json = (await res.json()) as { phonetic?: string; phonetics?: { text?: string; audio?: string }[] }[];
    const ph = json.flatMap((e) => e.phonetics ?? []);
    const ipa = json.find((e) => e.phonetic)?.phonetic || ph.find((p) => p.text)?.text;
    const pick = (tag: string): Accent | undefined => {
      const p = ph.find((x) => x.audio?.toLowerCase().includes(tag));
      return p ? { ipa: p.text, audio: p.audio } : undefined;
    };
    return { ipa, us: pick("-us."), uk: pick("-uk.") };
  } catch {
    return empty;
  }
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length > 60) return Response.json({ results: [], error: "invalid" }, { status: 400 });
  if (!geminiConfigured()) return Response.json({ results: [], source: "unconfigured" });

  try {
    const text = await geminiGenerate(
      [{ role: "user", parts: [{ text: `Tra: ${q}` }] }],
      { system: SYSTEM, jsonMode: true, temperature: 0.2 },
    );
    const parsed = JSON.parse(text);
    const arr: Sense[] = Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    const enriched = await Promise.all(
      arr.map(async (s) => {
        if (!s?.en) return null;
        const acc = await enrich(s.en);
        return { ...s, ipa: acc.ipa, us: acc.us, uk: acc.uk };
      }),
    );
    return Response.json({ results: enriched.filter(Boolean), source: "gemini" });
  } catch (e) {
    console.error("dict error", e);
    return Response.json({ results: [], source: "error" });
  }
}
