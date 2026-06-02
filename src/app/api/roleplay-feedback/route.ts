import { NextRequest, NextResponse } from "next/server";
import { generateText, parseJsonLoose, textProviderConfigured } from "@/lib/server/generateText";

export const runtime = "nodejs";

type ChatMsg = { role: "user" | "model"; text: string };

const SYSTEM = `Bạn là huấn luyện viên nói tiếng Anh. Đánh giá CHỈ các lượt của NGƯỜI HỌC (role "user") trong đoạn hội thoại nhập vai.
Trả về DUY NHẤT một JSON:
{
  "score": <0-100>,
  "level": "<A1|A2|B1|B2|C1>",
  "fluency": "<nhận xét ngắn về độ trôi chảy & tự nhiên, bằng tiếng Việt>",
  "strengths": ["<điểm tốt, tiếng Việt>"],
  "corrections": [{"original": "<câu người học nói có lỗi>", "better": "<câu sửa tiếng Anh tự nhiên hơn>", "why": "<giải thích ngắn tiếng Việt>"}],
  "vocab": [{"phrase": "<cụm tiếng Anh nên dùng>", "vi": "<nghĩa>"}],
  "tip": "<một lời khuyên luyện tập tiếng Việt>"
}
Tối đa 4 corrections (lỗi quan trọng nhất), 4 vocab. Giải thích bằng tiếng Việt, ví dụ bằng tiếng Anh. Nếu người học nói tốt, corrections có thể rỗng.`;

export async function POST(req: NextRequest) {
  if (!textProviderConfigured())
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 200 });

  let scenario = "";
  let messages: ChatMsg[] = [];
  try {
    const j = await req.json();
    scenario = typeof j?.scenario === "string" ? j.scenario : "";
    messages = Array.isArray(j?.messages) ? j.messages : [];
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userTurns = messages.filter((m) => m.role === "user" && m.text?.trim());
  if (userTurns.length === 0)
    return NextResponse.json({ ok: false, error: "no_user_turns" });

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Học viên" : "AI"}: ${m.text}`)
    .join("\n");

  try {
    const { text } = await generateText({
      system: SYSTEM,
      user: `Tình huống: ${scenario || "general chat"}\n\nHội thoại:\n${transcript}`,
      jsonMode: true,
      temperature: 0.3,
    });
    const data = parseJsonLoose<Record<string, unknown>>(text);
    if (!data) return NextResponse.json({ ok: false, error: "parse" });
    return NextResponse.json({ ok: true, feedback: data });
  } catch (e) {
    console.error("roleplay-feedback", e);
    return NextResponse.json({ ok: false, error: "ai_error" });
  }
}
