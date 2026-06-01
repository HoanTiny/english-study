import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "lesson-audio";

// GET ?path=... — tạo signed URL (bucket private) và redirect tới đó để phát.
export async function GET(req: NextRequest) {
  if (!adminConfigured())
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const path = new URL(req.url).searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Thiếu path." }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(path, 3600); // 1 giờ
  if (error || !data?.signedUrl)
    return NextResponse.json({ error: error?.message ?? "no url" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
