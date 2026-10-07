import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, checkAdmin } from "@/lib/server/supabaseAdmin";
import { stages } from "@/lib/curriculum";
import { getLesson } from "@/lib/lessons";

export const runtime = "nodejs";

// Đổ toàn bộ bài học tĩnh (lessons.ts) xuống DB làm điểm xuất phát cho CMS.
// Idempotent: upsert theo slug, ghi đè phrases. KHÔNG ghi đè audio_url đã có.
export async function POST(req: NextRequest) {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY ." }, { status: 503 });
  if (!(await checkAdmin(req))) return NextResponse.json({ error: "Cần đăng nhập bằng tài khoản admin." }, { status: 401 });

  const db = supabaseAdmin();
  let lessonCount = 0;
  let phraseCount = 0;
  const errors: string[] = [];

  for (const stage of stages) {
    for (let i = 0; i < stage.lessons.length; i++) {
      const meta = stage.lessons[i];
      const content = getLesson(meta.slug);
      if (!content) continue; // bài chưa có nội dung (vd ai-roleplay)

      // Giữ audio_url nếu lesson đã tồn tại (không ghi đè khi seed lại).
      const { data: existing } = await db
        .from("cms_lessons")
        .select("id, audio_url")
        .eq("slug", meta.slug)
        .maybeSingle();

      const { data: up, error: upErr } = await db
        .from("cms_lessons")
        .upsert(
          {
            slug: content.slug,
            title: content.title,
            cefr: content.cefr,
            intro: content.intro ?? null,
            tip: content.tip ?? null,
            stage: stage.id,
            order_index: i,
            youtube_id: content.youtubeId ?? null,
            audio_url: existing?.audio_url ?? null,
            visible: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();

      if (upErr || !up) {
        errors.push(`${meta.slug}: ${upErr?.message ?? "no id"}`);
        continue;
      }
      lessonCount++;

      const { error: pErr } = await db.rpc("replace_lesson_phrases", { p_lesson: up.id, p_phrases: content.phrases });
      if (pErr) errors.push(meta.slug + ": " + pErr.message);
      else phraseCount += content.phrases.length;

    }
  }

  return NextResponse.json({ ok: errors.length === 0, lessonCount, phraseCount, errors });
}
