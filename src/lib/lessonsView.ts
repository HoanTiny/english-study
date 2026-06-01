"use client";

import { stages, type LessonStatus } from "@/lib/curriculum";
import { getLesson } from "@/lib/lessons";
import { fetchLessonList } from "@/lib/lessonsRepo";

export type ViewLesson = {
  slug: string;
  title: string;
  topic: string;
  cefr: string;
  phraseCount: number;
};
export type ViewStage = {
  id: number;
  title: string;
  cefr: string;
  goal: string;
  months: string;
  lessons: ViewLesson[];
};

// slug → meta tĩnh (topic, title) để bù cho dữ liệu DB (DB không có cột topic).
const staticMeta = new Map<string, { title: string; topic: string }>();
for (const s of stages) for (const l of s.lessons) staticMeta.set(l.slug, { title: l.title, topic: l.topic });

function staticPhraseCount(slug: string): number {
  return getLesson(slug)?.phrases.length ?? 0;
}

/** Danh sách giai đoạn dựng từ file tĩnh (đồng bộ, để render ngay lần đầu). */
export function staticStages(): ViewStage[] {
  return stages.map((s) => ({
    id: s.id,
    title: s.title,
    cefr: s.cefr,
    goal: s.goal,
    months: s.months,
    lessons: s.lessons.map((l) => ({
      slug: l.slug,
      title: l.title,
      topic: l.topic,
      cefr: s.cefr,
      phraseCount: staticPhraseCount(l.slug),
    })),
  }));
}

/**
 * Danh sách giai đoạn ưu tiên DB (CMS): bài trong mỗi giai đoạn lấy từ DB theo
 * order_index; bài tĩnh chưa có trong DB (vd ai-roleplay) được nối thêm vào cuối.
 * Fallback hoàn toàn về tĩnh nếu DB trống/lỗi.
 */
export async function loadStages(): Promise<ViewStage[]> {
  const db = await fetchLessonList();
  if (!db) return staticStages();

  const byStage = new Map<number, typeof db>();
  for (const m of db) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }

  return stages.map((s) => {
    const dbLessons = (byStage.get(s.id) ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const dbSlugs = new Set(dbLessons.map((d) => d.slug));
    const lessons: ViewLesson[] = dbLessons.map((d) => ({
      slug: d.slug,
      title: d.title,
      topic: staticMeta.get(d.slug)?.topic ?? d.cefr,
      cefr: d.cefr,
      phraseCount: d.phraseCount,
    }));
    // Bài tĩnh chưa có nội dung trong DB (vd ai-roleplay) → giữ lại trên lộ trình.
    for (const l of s.lessons) {
      if (!dbSlugs.has(l.slug)) {
        lessons.push({
          slug: l.slug,
          title: l.title,
          topic: l.topic,
          cefr: s.cefr,
          phraseCount: staticPhraseCount(l.slug),
        });
      }
    }
    return { id: s.id, title: s.title, cefr: s.cefr, goal: s.goal, months: s.months, lessons };
  });
}

/**
 * Tính trạng thái mở khoá động trên danh sách giai đoạn (view).
 * Bài đầu mở; bài kế mở khi bài trước "bắt đầu" (lưu ≥1 cụm); "done" khi lưu đủ cụm;
 * bài không có nội dung (phraseCount=0) → khoá & gãy chuỗi.
 */
export function computeStatusesView(
  viewStages: ViewStage[],
  savedByLesson: Record<string, number>,
): Record<string, LessonStatus> {
  const out: Record<string, LessonStatus> = {};
  let prevStarted = true;
  for (const stage of viewStages) {
    for (const l of stage.lessons) {
      if (l.phraseCount <= 0) {
        out[l.slug] = "locked";
        prevStarted = false;
        continue;
      }
      const saved = savedByLesson[l.slug] ?? 0;
      const done = saved >= l.phraseCount;
      const started = saved > 0;
      if (done) out[l.slug] = "done";
      else if (prevStarted) out[l.slug] = started ? "in_progress" : "available";
      else out[l.slug] = "locked";
      prevStarted = started || done;
    }
  }
  return out;
}
