import { NextRequest } from "next/server";
import { geminiConfigured, geminiGenerate } from "@/lib/server/gemini";

export const runtime = "nodejs";

type Feedback = { fragment: string; issue: string; suggestion: string };

const SYSTEM = `Bạn là gia sư tiếng Anh cho người Việt trình độ A1–B1.
Nhiệm vụ: đọc đoạn nhật ký tiếng Anh của học viên và chỉ ra TỐI ĐA 4 lỗi quan trọng nhất
(ngữ pháp, thì, từ vựng, hoặc cách diễn đạt chưa tự nhiên).
Trả về DUY NHẤT một mảng JSON, mỗi phần tử có dạng:
{"fragment": "<đoạn chữ có lỗi, trích nguyên văn>", "issue": "<tên lỗi ngắn gọn bằng tiếng Việt>", "suggestion": "<gợi ý sửa bằng tiếng Việt, có thể kèm câu đúng>"}
Nếu bài viết không có lỗi đáng kể, trả về mảng rỗng [].
Tuyệt đối không thêm chữ nào ngoài JSON.`;

export async function POST(req: NextRequest) {
  let body = "";
  let prompt = "";
  try {
    const json = await req.json();
    body = typeof json?.body === "string" ? json.body : "";
    prompt = typeof json?.prompt === "string" ? json.prompt : "";
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  if (!body.trim()) {
    return Response.json({ feedback: [], source: "empty" });
  }

  // Chưa cấu hình key → báo client tự dùng mock.
  if (!geminiConfigured()) {
    return Response.json({ feedback: null, source: "unconfigured" });
  }

  try {
    const userMsg = prompt
      ? `Chủ đề: ${prompt}\n\nBài viết của học viên:\n${body}`
      : `Bài viết của học viên:\n${body}`;
    const text = await geminiGenerate(
      [{ role: "user", parts: [{ text: userMsg }] }],
      { system: SYSTEM, jsonMode: true, temperature: 0.3 },
    );
    const parsed = JSON.parse(text);
    const feedback: Feedback[] = Array.isArray(parsed)
      ? parsed
          .filter(
            (f) =>
              f &&
              typeof f.fragment === "string" &&
              typeof f.issue === "string" &&
              typeof f.suggestion === "string",
          )
          .slice(0, 4)
      : [];
    return Response.json({ feedback, source: "gemini" });
  } catch (e) {
    console.error("journal-feedback gemini error", e);
    // Lỗi API → để client fallback sang mock.
    return Response.json({ feedback: null, source: "error" });
  }
}
