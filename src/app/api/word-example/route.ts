import { NextRequest, NextResponse } from "next/server";
import { geminiGenerate, geminiConfigured } from "@/lib/server/gemini";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

// Câu ví dụ cho 1 TỪ, cache trong DB (bảng word_examples). Sinh 1 lần rồi tái dùng.
// GET /api/word-example?w=very → { word, en, vi, source }

const FD = "https://api.dictionaryapi.dev/api/v2/entries/en";

const SYSTEM =
  "Bạn tạo câu ví dụ cho người Việt học tiếng Anh. Cho một TỪ tiếng Anh, trả về DUY NHẤT JSON " +
  '{ "en": "<một câu tiếng Anh NGẮN, tự nhiên, CÓ CHỨA từ đó>", "vi": "<dịch tiếng Việt>" }.';

function hasServiceKey() {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}

// Lấy câu ví dụ tiếng Anh từ Free Dictionary (không cần Gemini) nếu có.
async function fdExample(word: string): Promise<string | null> {
  try {
    const r = await fetch(`${FD}/${encodeURIComponent(word)}`, { next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const json = (await r.json()) as { meanings?: { definitions?: { example?: string }[] }[] }[];
    for (const e of json) for (const m of e.meanings ?? []) for (const d of m.definitions ?? []) {
      if (d.example && d.example.toLowerCase().includes(word.toLowerCase())) return d.example;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function GET(req: NextRequest) {
  const word = (req.nextUrl.searchParams.get("w") ?? "").trim().toLowerCase();
  if (!word || word.length > 40 || !/^[a-z][a-z'’-]*$/.test(word)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // 1) Đọc cache DB
  if (hasServiceKey()) {
    try {
      const { data } = await supabaseAdmin()
        .from("word_examples")
        .select("example_en, example_vi")
        .eq("word", word)
        .maybeSingle();
      if (data?.example_en) {
        return NextResponse.json({ word, en: data.example_en, vi: data.example_vi ?? "", source: "db" });
      }
    } catch {
      /* bảng chưa migrate → bỏ qua, vẫn sinh mới */
    }
  }

  // 2) Sinh mới: ưu tiên Gemini (có nghĩa Việt); fallback Free Dictionary (chỉ Anh).
  let en = "";
  let vi = "";
  if (geminiConfigured()) {
    try {
      const t = await geminiGenerate([{ role: "user", parts: [{ text: `Từ: ${word}` }] }], {
        system: SYSTEM,
        jsonMode: true,
        temperature: 0.5,
      });
      const p = JSON.parse(t);
      if (typeof p.en === "string" && p.en.trim()) {
        en = p.en.trim();
        vi = typeof p.vi === "string" ? p.vi.trim() : "";
      }
    } catch {
      /* fallback */
    }
  }
  if (!en) {
    const fd = await fdExample(word);
    if (fd) en = fd;
  }
  if (!en) return NextResponse.json({ word, en: null });

  // 3) Lưu cache DB (nếu có thể)
  if (hasServiceKey()) {
    try {
      await supabaseAdmin().from("word_examples").upsert({ word, example_en: en, example_vi: vi || null });
    } catch {
      /* bảng chưa migrate → bỏ qua */
    }
  }

  return NextResponse.json({ word, en, vi, source: "gen" });
}
