import { NextRequest } from "next/server";
import { geminiConfigured, geminiGenerate } from "@/lib/server/gemini";

export const runtime = "nodejs";

// Sinh MỘT câu ví dụ tiếng Anh MỚI dùng một cụm từ — để đa dạng ngữ cảnh khi ôn,
// chống học vẹt (theo khuyến nghị dùng LLM tạo câu ngữ cảnh đa dạng).
//
// POST { en, vi } → { sentence, vi, source: "gemini" | "unconfigured" | "error" }

const SYSTEM = `Bạn là gia sư tiếng Anh cho người Việt (trình độ A2–B1).
Nhiệm vụ: viết MỘT câu tiếng Anh tự nhiên, ngắn gọn, dễ hiểu, có dùng đúng cụm từ được cho.
Câu phải KHÁC với ví dụ mẫu, đặt cụm trong ngữ cảnh đời thường mới.
Trả về DUY NHẤT JSON: {"sentence": "<câu tiếng Anh>", "vi": "<dịch tiếng Việt>"}.
Không thêm chữ nào ngoài JSON.`;

export async function POST(req: NextRequest) {
  let en = "";
  let vi = "";
  try {
    const json = await req.json();
    en = typeof json?.en === "string" ? json.en : "";
    vi = typeof json?.vi === "string" ? json.vi : "";
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  if (!en.trim()) {
    return Response.json({ sentence: null, source: "empty" }, { status: 400 });
  }

  if (!geminiConfigured()) {
    return Response.json({ sentence: null, source: "unconfigured" });
  }

  try {
    const text = await geminiGenerate(
      [
        {
          role: "user",
          parts: [{ text: `Cụm: "${en}"${vi ? ` (nghĩa: ${vi})` : ""}` }],
        },
      ],
      { system: SYSTEM, jsonMode: true, temperature: 0.9 },
    );
    const parsed = JSON.parse(text) as { sentence?: string; vi?: string };
    if (!parsed.sentence) {
      return Response.json({ sentence: null, source: "error" });
    }
    return Response.json({
      sentence: parsed.sentence,
      vi: parsed.vi ?? "",
      source: "gemini",
    });
  } catch (e) {
    console.error("example-sentence gemini error", e);
    return Response.json({ sentence: null, source: "error" });
  }
}
