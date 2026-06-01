"use client";

import { supabase } from "@/lib/supabase";
import { getLesson, type LessonContent, type LessonPhrase } from "@/lib/lessons";

// Đọc bài học: ưu tiên DB (CMS); nếu DB trống/lỗi → fallback file tĩnh lessons.ts.
// Dùng dần ở GĐ3 (thay getLesson đồng bộ bằng bản async này).

export type LessonPhraseDB = LessonPhrase & { audioUrl?: string | null };
export type LessonContentDB = Omit<LessonContent, "phrases"> & {
  audioUrl?: string | null;
  phrases: LessonPhraseDB[];
};

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  cefr: string;
  intro: string | null;
  tip: string | null;
  audio_url: string | null;
  youtube_id: string | null;
};
type PhraseRow = {
  en: string;
  vi: string | null;
  ipa: string | null;
  example: string | null;
  audio_url: string | null;
  order_index: number;
};

function staticToDB(c: LessonContent | undefined): LessonContentDB | undefined {
  if (!c) return undefined;
  return { ...c, audioUrl: null, phrases: c.phrases.map((p) => ({ ...p, audioUrl: null })) };
}

/** Lấy 1 bài theo slug (DB trước, fallback tĩnh). */
export async function fetchLesson(slug: string): Promise<LessonContentDB | undefined> {
  try {
    const { data: row } = await supabase
      .from("cms_lessons")
      .select("id, slug, title, cefr, intro, tip, audio_url, youtube_id")
      .eq("slug", slug)
      .eq("visible", true)
      .maybeSingle<LessonRow>();
    if (!row) return staticToDB(getLesson(slug));

    const { data: phrases } = await supabase
      .from("cms_lesson_phrases")
      .select("en, vi, ipa, example, audio_url, order_index")
      .eq("lesson_id", row.id)
      .order("order_index", { ascending: true })
      .returns<PhraseRow[]>();

    return {
      slug: row.slug,
      title: row.title,
      cefr: row.cefr,
      intro: row.intro ?? "",
      tip: row.tip ?? undefined,
      youtubeId: row.youtube_id ?? undefined,
      audioUrl: row.audio_url,
      phrases: (phrases ?? []).map((p) => ({
        en: p.en,
        vi: p.vi ?? "",
        ipa: p.ipa ?? undefined,
        example: p.example ?? "",
        audioUrl: p.audio_url,
      })),
    };
  } catch {
    return staticToDB(getLesson(slug));
  }
}

export type LessonMeta = {
  slug: string;
  title: string;
  cefr: string;
  stage: number;
  orderIndex: number;
  phraseCount: number;
};

/**
 * Danh sách bài (meta + số cụm) từ DB, sắp theo stage + order.
 * Trả null nếu DB trống/lỗi → caller dùng fallback tĩnh.
 */
export async function fetchLessonList(): Promise<LessonMeta[] | null> {
  try {
    const { data: rows } = await supabase
      .from("cms_lessons")
      .select("id, slug, title, cefr, stage, order_index")
      .eq("visible", true)
      .order("stage", { ascending: true })
      .order("order_index", { ascending: true })
      .returns<{ id: string; slug: string; title: string; cefr: string; stage: number; order_index: number }[]>();
    if (!rows || rows.length === 0) return null;

    const { data: ph } = await supabase
      .from("cms_lesson_phrases")
      .select("lesson_id")
      .returns<{ lesson_id: string }[]>();
    const counts: Record<string, number> = {};
    for (const r of ph ?? []) counts[r.lesson_id] = (counts[r.lesson_id] ?? 0) + 1;

    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      cefr: r.cefr,
      stage: r.stage,
      orderIndex: r.order_index,
      phraseCount: counts[r.id] ?? 0,
    }));
  } catch {
    return null;
  }
}

/** DB đã có bài chưa (để biết nên dùng DB hay seed tĩnh). */
export async function lessonsInDB(): Promise<number> {
  try {
    const { count } = await supabase
      .from("cms_lessons")
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}
