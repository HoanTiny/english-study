import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, checkAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

function guard(req: Request): NextResponse | null {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSCODE." }, { status: 503 });
  if (!checkAdmin(req)) return NextResponse.json({ error: "Sai mật mã admin." }, { status: 401 });
  return null;
}

// GET — danh sách bài (gồm ẩn) + số cụm.
export async function GET(req: NextRequest) {
  const g = guard(req);
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
  const g = guard(req);
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
    // giữ audio cụm theo en
    const { data: old } = await db.from("cms_lesson_phrases").select("en, audio_url").eq("lesson_id", lessonId);
    const audioByEn = new Map((old ?? []).map((p) => [p.en, p.audio_url]));
    await db.from("cms_lesson_phrases").delete().eq("lesson_id", lessonId);
    const rows = phrases
      .filter((p) => (p.en as string)?.trim())
      .map((p, idx) => ({
        lesson_id: lessonId,
        en: (p.en as string).trim(),
        vi: (p.vi as string) ?? null,
        ipa: (p.ipa as string) ?? null,
        example: (p.example as string) ?? null,
        audio_url: (p.audio_url as string) ?? audioByEn.get(p.en as string) ?? null,
        order_index: idx,
      }));
    if (rows.length) {
      const { error } = await db.from("cms_lesson_phrases").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: rows.length });
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
