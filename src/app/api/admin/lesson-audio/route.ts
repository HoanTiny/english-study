import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, checkCms } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

const BUCKET = "lesson-audio";

// POST (multipart): file + target=lesson|phrase + id  → upload bucket, set audio_url (storage path).
export async function POST(req: NextRequest) {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình service role / passcode." }, { status: 503 });
  if (!(await checkCms(req))) return NextResponse.json({ error: "Cần đăng nhập bằng tài khoản admin." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form không hợp lệ." }, { status: 400 });
  const file = form.get("file") as File | null;
  const target = String(form.get("target") || "lesson"); // lesson | phrase | exercise
  const id = String(form.get("id") || "");
  if (!file || !id) return NextResponse.json({ error: "Thiếu file/id." }, { status: 400 });

  const db = supabaseAdmin();
  const ext = (file.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${target}/${id}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await db.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type || "audio/mpeg", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Cột & bảng đích theo target.
  const map = {
    phrase: { table: "cms_lesson_phrases", col: "audio_url" },
    exercise: { table: "listening_exercises", col: "audio_path" },
    lesson: { table: "cms_lessons", col: "audio_url" },
  } as const;
  const t = map[(target as keyof typeof map)] ?? map.lesson;
  const { error: updErr } = await db.from(t.table).update({ [t.col]: path }).eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}

// DELETE (?target=&id=&path=) — gỡ audio.
export async function DELETE(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!(await checkCms(req))) return NextResponse.json({ error: "Cần đăng nhập bằng tài khoản admin." }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const target = sp.get("target") || "lesson";
  const id = sp.get("id");
  const path = sp.get("path");
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  const db = supabaseAdmin();
  if (path) await db.storage.from(BUCKET).remove([path]).catch(() => {});
  const map = {
    phrase: { table: "cms_lesson_phrases", col: "audio_url" },
    exercise: { table: "listening_exercises", col: "audio_path" },
    lesson: { table: "cms_lessons", col: "audio_url" },
  } as const;
  const t = map[(target as keyof typeof map)] ?? map.lesson;
  await db.from(t.table).update({ [t.col]: null }).eq("id", id);
  return NextResponse.json({ ok: true });
}
