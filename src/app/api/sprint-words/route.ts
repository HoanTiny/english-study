import { NextRequest, NextResponse } from "next/server";
import { geminiGenerate, geminiConfigured } from "@/lib/server/gemini";

export const runtime = "nodejs";

// Sinh bộ từ vựng cho game Sprint bằng Gemini, theo cấp độ CEFR (+ chủ đề tuỳ chọn).
export async function GET(req: NextRequest) {
  if (!geminiConfigured()) {
    return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY." }, { status: 503 });
  }
  const sp = req.nextUrl.searchParams;
  const level = (sp.get("level") || "A1").toUpperCase();
  const topic = (sp.get("topic") || "").trim();
  const n = Math.min(30, Math.max(6, parseInt(sp.get("n") || "16", 10)));

  const sys =
    "Bạn tạo danh sách từ/cụm từ tiếng Anh để luyện phản xạ dịch nghĩa. " +
    "Trả về JSON dạng {\"words\":[{\"en\":\"...\",\"vi\":\"...\"}]}. " +
    "QUY TẮC: 'en' là 1 từ hoặc cụm ngắn (≤3 từ) phù hợp trình độ CEFR yêu cầu; " +
    "'vi' là nghĩa tiếng Việt NGẮN GỌN, chính xác; không lặp từ; không thêm chú thích.";
  const prompt = topic
    ? `Tạo ${n} từ vựng tiếng Anh trình độ ${level} thuộc chủ đề "${topic}".`
    : `Tạo ${n} từ vựng tiếng Anh thông dụng trình độ ${level}.`;

  try {
    const out = await geminiGenerate([{ role: "user", parts: [{ text: prompt }] }], {
      jsonMode: true,
      temperature: 0.7,
      system: sys,
    });
    const parsed = JSON.parse(out);
    const raw = Array.isArray(parsed) ? parsed : parsed.words;
    const words = (raw as { en?: string; vi?: string }[])
      .filter((w) => w && typeof w.en === "string" && typeof w.vi === "string" && w.en.trim() && w.vi.trim())
      .map((w) => ({ en: w.en!.trim(), vi: w.vi!.trim() }))
      .slice(0, n);
    if (words.length < 4) throw new Error("Không tạo đủ từ.");
    return NextResponse.json({ level, topic, words });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tạo từ.";
    return NextResponse.json({ error: `Không tạo được bộ từ (${msg}).` }, { status: 502 });
  }
}
