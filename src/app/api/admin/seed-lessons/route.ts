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

      // Thay toàn bộ phrases của bài (giữ nguyên audio cụm nếu trùng en).
      const { data: oldPhrases } = await db
        .from("cms_lesson_phrases")
        .select("en, audio_url")
        .eq("lesson_id", up.id);
      const audioByEn = new Map((oldPhrases ?? []).map((p) => [p.en, p.audio_url]));

      await db.from("cms_lesson_phrases").delete().eq("lesson_id", up.id);
      const rows = content.phrases.map((p, idx) => ({
        lesson_id: up.id,
        en: p.en,
        vi: p.vi ?? null,
        ipa: p.ipa ?? null,
        example: p.example ?? null,
        audio_url: audioByEn.get(p.en) ?? null,
        order_index: idx,
      }));
      if (rows.length) {
        const { error: pErr } = await db.from("cms_lesson_phrases").insert(rows);
        if (pErr) errors.push(`${meta.slug} phrases: ${pErr.message}`);
        else phraseCount += rows.length;
      }
    }
  }

  return NextResponse.json({ ok: errors.length === 0, lessonCount, phraseCount, errors });
}
