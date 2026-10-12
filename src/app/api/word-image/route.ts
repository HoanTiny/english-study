import { NextRequest, NextResponse } from "next/server";
import { findWordImages } from "@/lib/server/wordImages";

export const runtime = "nodejs";

// Only curated uploads; never search Openverse or generate an image.
export async function GET(req: NextRequest) {
  const word = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const meaning = (req.nextUrl.searchParams.get("vi") ?? "").trim();
  if (!word || word.length > 160 || meaning.length > 300 || !/[a-z]/i.test(word)) {
    return NextResponse.json({ error: "Từ hoặc cụm từ không hợp lệ." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await findWordImages(word, meaning);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Never persist a transient timeout/rate limit as a permanent empty image.
    return NextResponse.json({ error: "Chưa tải được ảnh. Bạn có thể tiếp tục học và thử lại sau." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "15" } });
  }
}
