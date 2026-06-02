import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, checkAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

const BUCKET = "lesson-audio"; // dùng chung bucket private (ảnh + audio)

// POST (multipart): file + folder? → upload, trả về { path }. KHÔNG ghi DB.
export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!checkAdmin(req)) return NextResponse.json({ error: "Sai mật mã admin." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form không hợp lệ." }, { status: 400 });
  const file = form.get("file") as File | null;
  const folder = String(form.get("folder") || "exercise-img").replace(/[^a-z0-9_-]/gi, "");
  if (!file) return NextResponse.json({ error: "Thiếu file." }, { status: 400 });

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e6)}`);
  const path = `${folder}/${id}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, buf, { contentType: file.type || "image/png", upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}
