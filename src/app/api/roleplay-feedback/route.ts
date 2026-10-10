import { tokenErrorResponse } from "@/lib/server/tokenUsage";
import { guardPaidApi } from "@/lib/server/apiGuard";
import { NextRequest, NextResponse } from "next/server";
import { generateText, parseJsonLoose, textProviderConfigured } from "@/lib/server/generateText";

export const runtime = "nodejs";

type ChatMsg = { role: "user" | "model"; text: string; assisted?: boolean };

const SYSTEM = `Bạn là huấn luyện viên hội thoại tiếng Anh. Đánh giá CHỈ các lượt "Học viên tự diễn đạt" trong đoạn hội thoại nhập vai.
Các lượt "Có hỗ trợ dịch — không chấm" chỉ cung cấp ngữ cảnh, không dùng làm bằng chứng năng lực hoặc tạo corrections.
Chỉ đánh giá ngữ pháp, từ vựng và độ tự nhiên của văn bản. Không suy ra điểm phát âm, tốc độ nói hoặc độ trôi chảy âm thanh từ văn bản. Cấp độ chỉ là nhận xét tham khảo trên mẫu ngắn, không phải kết quả xếp lớp.
Trả về DUY NHẤT một JSON:
{
  "score": <0-100>,
  "level": "<A1|A2|B1|B2|C1>",
  "fluency": "<nhận xét ngắn về sự mạch lạc và tự nhiên của văn bản, bằng tiếng Việt>",
  "strengths": ["<điểm tốt, tiếng Việt>"],
  "corrections": [{"original": "<câu người học nói có lỗi>", "better": "<câu sửa tiếng Anh tự nhiên hơn>", "why": "<giải thích ngắn tiếng Việt>"}],
  "vocab": [{"phrase": "<cụm tiếng Anh nên dùng>", "vi": "<nghĩa>"}],
  "tip": "<một lời khuyên luyện tập tiếng Việt>"
}
Tối đa 4 corrections (lỗi quan trọng nhất), 4 vocab. Giải thích bằng tiếng Việt, ví dụ bằng tiếng Anh. Nếu người học nói tốt, corrections có thể rỗng.`;

export async function POST(req: NextRequest) {
  const denied = await guardPaidApi(req);
  if (denied) return denied;
  if (!textProviderConfigured())
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 200 });

  let scenario = "";
  let messages: ChatMsg[] = [];
  try {
    const j = await req.json();
    scenario = typeof j?.scenario === "string" ? j.scenario : "";
    messages = Array.isArray(j?.messages) ? j.messages : [];
  } catch (cause) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  if (messages.length > 40 || messages.some(m => !m || typeof m.text !== "string" || m.text.length > 2000 || !["user", "model"].includes(m.role) || (m.assisted !== undefined && typeof m.assisted !== "boolean")))
    return Response.json({ error: "Hội thoại quá dài hoặc không hợp lệ." }, { status: 400 });
  const userTurns = messages.filter((m) => m.role === "user" && !m.assisted && m.text?.trim());
  if (userTurns.length === 0)
    return NextResponse.json({ ok: false, error: "no_independent_turns" });

  const transcript = messages
    .map((m) => `${m.role === "model" ? "AI" : m.assisted ? "Có hỗ trợ dịch — không chấm" : "Học viên tự diễn đạt"}: ${m.text}`)
    .join("\n");

  try {
    const { text } = await generateText({ request: req,
      system: SYSTEM,
      user: `Tình huống: ${scenario || "general chat"}\n\nHội thoại:\n${transcript}`,
      jsonMode: true,
      temperature: 0.3,
    });
    const data = parseJsonLoose<Record<string, unknown>>(text);
    if (!data) return NextResponse.json({ ok: false, error: "parse" });
    // Assisted text is context only, and must never enter the learner's error log.
    if (Array.isArray(data.corrections)) {
      data.corrections = data.corrections.filter(c => {
        if (!c || typeof c !== "object") return false;
        const item = c as Record<string, unknown>;
        return typeof item.original === "string" && !!item.original.trim() &&
          typeof item.better === "string" && typeof item.why === "string" &&
          userTurns.some(turn => turn.text.includes(item.original as string));
      }).slice(0, 4);
    }
    return NextResponse.json({ ok: true, feedback: data });
  } catch (e) {
      const budgetResponse = tokenErrorResponse(e); if (budgetResponse) return budgetResponse;
    console.error("roleplay-feedback", e);
    return NextResponse.json({ ok: false, error: "ai_error" });
  }
}
