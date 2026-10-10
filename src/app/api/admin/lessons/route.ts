import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, checkCms } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

async function guard(req: Request): Promise<NextResponse | null> {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY ." }, { status: 503 });
  if (!(await checkCms(req))) return NextResponse.json({ error: "Cần đăng nhập bằng tài khoản admin." }, { status: 401 });
  return null;
}

// GET — danh sách bài (gồm ẩn) + số cụm.
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;
  const db = supabaseAdmin();
  const slug = new URL(req.url).searchParams.get("slug");

  if (slug) {
    // chi tiết 1 bài + phrases
    const { data: lesson, error } = await db
      .from("cms_lessons")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!lesson) return NextResponse.json({ error: "not found" }, { status: 404 });
    const { data: phrases } = await db
      .from("cms_lesson_phrases")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("order_index", { ascending: true });
    return NextResponse.json({ lesson, phrases: phrases ?? [] });
  }

  const { data, error } = await db
    .from("cms_lessons")
    .select("id, slug, title, cefr, stage, order_index, visible, audio_url")
    .order("stage", { ascending: true })
    .order("order_index", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // đếm cụm theo bài
  const { data: counts } = await db.from("cms_lesson_phrases").select("lesson_id");
  const byLesson: Record<string, number> = {};
  for (const r of counts ?? []) byLesson[r.lesson_id] = (byLesson[r.lesson_id] ?? 0) + 1;
  const lessons = (data ?? []).map((l) => ({ ...l, phraseCount: byLesson[l.id] ?? 0 }));
  return NextResponse.json({ lessons });
}

// POST — { action: "saveLesson" | "savePhrases" | "delete" | "toggleVisible", ... }
export async function POST(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;
  const db = supabaseAdmin();
  const body = await req.json().catch(() => ({}));

  if (body.action === "saveLesson") {
    const l = body.lesson ?? {};
    if (!l.slug || !l.title) return NextResponse.json({ error: "Thiếu slug/title." }, { status: 400 });
    const { data, error } = await db
      .from("cms_lessons")
      .upsert(
        {
          slug: l.slug,
          title: l.title,
          cefr: l.cefr ?? "A1",
          intro: l.intro ?? null,
          tip: l.tip ?? null,
          stage: l.stage ?? 1,
          order_index: l.order_index ?? 0,
          youtube_id: l.youtube_id ?? null,
          visible: l.visible ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (body.action === "savePhrases") {
    const lessonId = body.lessonId as string;
    const phrases = (body.phrases ?? []) as Array<Record<string, unknown>>;
    if (!lessonId) return NextResponse.json({ error: "Thiếu lessonId." }, { status: 400 });
    if (!Array.isArray(phrases) || phrases.length > 500 || phrases.some(p =>
      !p || typeof p.en !== "string" || !p.en.trim() || p.en.length > 2000 ||
      [p.vi, p.ipa, p.example, p.audio_url].some(v => v != null && (typeof v !== "string" || v.length > 8000))))
      return NextResponse.json({ error: "Nội dung cụm từ không hợp lệ." }, { status: 400 });
    const { error } = await db.rpc("replace_lesson_phrases", { p_lesson: lessonId, p_phrases: phrases });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: phrases.length });
  }

  if (body.action === "toggleVisible") {
    const { error } = await db
      .from("cms_lessons")
      .update({ visible: !!body.visible, updated_at: new Date().toISOString() })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    const { error } = await db.from("cms_lessons").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
