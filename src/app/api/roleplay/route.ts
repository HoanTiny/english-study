import { NextRequest } from "next/server";
import { geminiConfigured, geminiGenerate } from "@/lib/server/gemini";

export const runtime = "nodejs";

type ChatMsg = { role: "user" | "model"; text: string };

function systemFor(scenario: string): string {
  return `Bạn là bạn hội thoại tiếng Anh thân thiện, đóng vai trong tình huống: "${scenario}".
Quy tắc:
- Luôn trả lời bằng tiếng Anh đơn giản, tự nhiên, đúng trình độ A2–B1 (câu ngắn, từ thông dụng).
- Mỗi lượt chỉ nói 1–3 câu và LUÔN kết thúc bằng một câu hỏi để duy trì hội thoại.
- Giữ đúng vai diễn; đừng phá vai, đừng giải thích bằng tiếng Việt.
- Nếu người học mắc lỗi nặng làm khó hiểu, có thể nhắc nhẹ trong ngoặc rất ngắn rồi tiếp tục vai diễn.`;
}

export async function POST(req: NextRequest) {
  let scenario = "";
  let messages: ChatMsg[] = [];
  try {
    const json = await req.json();
    scenario = typeof json?.scenario === "string" ? json.scenario : "a friendly chat";
    messages = Array.isArray(json?.messages) ? json.messages : [];
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  if (!geminiConfigured()) {
    return Response.json({ reply: null, source: "unconfigured" });
  }

  try {
    const contents = messages
      .filter((m) => m && typeof m.text === "string" && m.text.trim())
      .map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.text }],
      }));
    // Nếu chưa có lượt nào, mồi để AI mở lời.
    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Let's start the conversation." }] });
    }
    const reply = await geminiGenerate(contents, {
      system: systemFor(scenario),
      temperature: 0.8,
    });
    return Response.json({ reply, source: "gemini" });
  } catch (e) {
    console.error("roleplay gemini error", e);
    return Response.json({ reply: null, source: "error" });
  }
}
