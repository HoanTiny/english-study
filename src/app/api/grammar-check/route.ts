import { NextRequest } from "next/server";
import { geminiConfigured, geminiGenerate } from "@/lib/server/gemini";

export const runtime = "nodejs";

// Chấm câu người học tự đặt theo một cấu trúc ngữ pháp.
// POST { structure, sentence } → { ok, feedback, suggestion, source }

const SYSTEM = `Bạn là gia sư tiếng Anh cho người Việt (A1–B1), thân thiện và khích lệ.
Người học được yêu cầu đặt MỘT câu tiếng Anh dùng đúng một CẤU TRÚC cho trước.
Hãy đánh giá: câu có (1) dùng đúng cấu trúc đó và (2) đúng ngữ pháp/tự nhiên không.
Trả về DUY NHẤT JSON: {
 "ok": true/false,   // true nếu câu dùng đúng cấu trúc và chấp nhận được
 "feedback": "<nhận xét NGẮN bằng tiếng Việt, khen nếu đúng / chỉ lỗi nếu sai>",
 "suggestion": "<MỘT câu tiếng Anh mẫu/sửa đúng theo cấu trúc; để rỗng nếu câu đã tốt>"
}
Không thêm chữ nào ngoài JSON.`;

export async function POST(req: NextRequest) {
  let structure = "";
  let sentence = "";
  try {
    const j = await req.json();
    structure = typeof j?.structure === "string" ? j.structure : "";
    sentence = typeof j?.sentence === "string" ? j.sentence : "";
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (!sentence.trim()) {
    return Response.json({ ok: false, feedback: "Hãy nhập một câu.", source: "empty" }, { status: 400 });
  }
  if (!geminiConfigured()) {
    return Response.json({ ok: null, source: "unconfigured" });
  }
  try {
    const text = await geminiGenerate(
      [{ role: "user", parts: [{ text: `Cấu trúc: ${structure}\nCâu của học viên: ${sentence}` }] }],
      { system: SYSTEM, jsonMode: true, temperature: 0.3 },
    );
    const p = JSON.parse(text) as { ok?: boolean; feedback?: string; suggestion?: string };
    return Response.json({
      ok: !!p.ok,
      feedback: p.feedback ?? "",
      suggestion: p.suggestion ?? "",
      source: "gemini",
    });
  } catch (e) {
    console.error("grammar-check error", e);
    return Response.json({ ok: null, source: "error" });
  }
}
