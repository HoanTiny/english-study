import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, checkAdmin } from "@/lib/server/supabaseAdmin";
import { geminiConfigured, geminiGenerate } from "@/lib/server/gemini";
import { anthropicConfigured, anthropicVision } from "@/lib/server/anthropic";
import { openaiCompatConfigured, openaiCompatVision } from "@/lib/server/openaiCompat";

export const runtime = "nodejs";

const SYSTEM = `Bạn là công cụ trích xuất bài tập NGHE từ ảnh trang giáo trình tiếng Anh, xuất ra ĐÚNG định dạng khối dưới đây để import. CHỈ xuất các khối, không thêm lời giải thích.

Định dạng mỗi bài:
=== EXERCISE ===
unit: <số nếu thấy>
section: <tên section, vd Numbers>
activity: <số Activity>
level: A1
type: <mc | truefalse | fill | ordering | speaking>
instructions: <đề bài, dịch ngắn gọn sang tiếng Việt>
<các dòng câu hỏi theo type>
transcript:
<để trống nếu ảnh không có>

Quy ước câu hỏi theo type:
- speaking (vd "Say ... out loud" / đọc to rồi nghe kiểm tra): mỗi mục một dòng "- <nội dung>". KHÔNG có đáp án.
- mc (vd "Tick the correct ..." / chọn 1 trong nhiều): "- <đề> :: opt1 | opt2 | opt3". Đánh dấu "*" TRƯỚC lựa chọn đúng CHỈ KHI trong ảnh có tick/khoanh rõ; nếu không rõ thì KHÔNG đánh dấu nào.
- truefalse (right/wrong): "- <mệnh đề> :: right" hoặc ":: wrong" — chỉ khi ảnh có đáp án; nếu không thì bỏ ":: ...".
- fill (viết/điền): "- <đề> :: <đáp án>" — đáp án chỉ điền nếu ảnh có; nếu không thì "- <đề> ::".
- ordering ("Number ... from 1-8"): liệt kê "1. <mục>", "2. <mục>"... theo thứ tự đúng nếu ảnh có; nếu không rõ thứ tự thì dùng type mc/speaking phù hợp.

TRANG TRANSCRIPT (lời thoại): nếu ảnh là trang "TRANSCRIPT" (chỉ có lời nói, không có ô câu hỏi), thì với MỖI Activity xuất một khối CHỈ gồm header (unit, section, activity) + phần "transcript:" chứa toàn bộ lời của Activity đó. KHÔNG thêm dòng câu hỏi nào. (Dùng để khớp transcript vào bài đã có theo Unit·Activity.)

TRANG ĐÁP ÁN (KEY): nếu ảnh là trang "KEY" (đáp án), thì với MỖI Activity xuất một khối gồm header (unit, section, activity) + danh sách đáp án MỖI DÒNG MỘT mục dạng "<số> <đáp án>", theo đúng số thứ tự câu (gộp các cột về một danh sách tăng dần). KHÔNG dùng "::" hay "*". Giữ nguyên văn đáp án (số điện thoại, tên, right/wrong, số…). Ví dụ:
unit: 1
section: Numbers
activity: 2
1 22
2 190
3 13

Quy tắc:
- Giữ NGUYÊN VĂN số/từ tiếng Anh trong ảnh (không sửa).
- Activity có dấu "*" trong sách = không có trên băng → vẫn trích nhưng ghi chú ở instructions "(không có trên băng)".
- Nếu ảnh có NHIỀU activity, xuất nhiều khối === EXERCISE ===.
- Nếu không chắc đáp án, để trống — KHÔNG bịa.`;

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: "Chưa cấu hình admin." }, { status: 503 });
  if (!checkAdmin(req)) return NextResponse.json({ error: "Sai mật mã admin." }, { status: 401 });
  if (!anthropicConfigured() && !openaiCompatConfigured() && !geminiConfigured())
    return NextResponse.json({ error: "Chưa cấu hình provider AI nào (ANTHROPIC / OPENAI_COMPAT / GEMINI)." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const mimeType = body?.mimeType as string | undefined;
  const data = body?.data as string | undefined; // base64 (không kèm tiền tố data:)
  const hint = typeof body?.hint === "string" ? body.hint : "";
  if (!mimeType || !data) return NextResponse.json({ error: "Thiếu ảnh." }, { status: 400 });

  const userText = hint
    ? `Trích xuất bài tập từ ảnh này. Gợi ý thêm: ${hint}`
    : "Trích xuất bài tập từ ảnh trang sách này.";

  // Thứ tự thử: Gemini (free) trước; lỗi/hết quota → tự rớt sang provider kế.
  const providers: { name: string; run: () => Promise<string> }[] = [];
  if (geminiConfigured())
    providers.push({
      name: "gemini",
      run: () =>
        geminiGenerate(
          [{ role: "user", parts: [{ text: userText }, { inlineData: { mimeType, data } }] }],
          { system: SYSTEM, temperature: 0.2 },
        ),
    });
  if (openaiCompatConfigured())
    providers.push({ name: "openai-compat", run: () => openaiCompatVision({ system: SYSTEM, text: userText, image: { mimeType, data } }) });
  if (anthropicConfigured())
    providers.push({ name: "claude", run: () => anthropicVision({ system: SYSTEM, text: userText, image: { mimeType, data } }) });

  const tried: string[] = [];
  let lastErr = "";
  for (const p of providers) {
    try {
      const text = await p.run();
      const block = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
      return NextResponse.json({ ok: true, block, provider: p.name, fellBackFrom: tried });
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      tried.push(p.name);
      console.error(`ocr-exercise ${p.name} lỗi → thử provider kế`, lastErr);
    }
  }
  return NextResponse.json(
    { error: `Tất cả provider OCR đều lỗi (${tried.join(" → ")}). Chi tiết cuối: ${lastErr}` },
    { status: 502 },
  );
}
