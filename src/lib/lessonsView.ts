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
 * Danh sách giai đoạn lấy từ CMS: bài trong mỗi giai đoạn sắp theo
 * order_index; chỉ công cụ IPA/hội thoại được nối thêm vào cuối.
 * Không phục hồi bài đã ẩn/xóa từ nội dung tĩnh.
 */
export async function loadStages(): Promise<ViewStage[]> {
  const db = await fetchLessonList();


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
    for (const l of s.lessons.filter(l => TOOL_SLUGS.has(l.slug))) {
      if (!dbSlugs.has(l.slug)) lessons.push({ ...l, cefr: s.cefr, phraseCount: 0 });
    }
    return { id: s.id, title: s.title, cefr: s.cefr, goal: s.goal, months: s.months, lessons };
  });
}

/**
 * Tính trạng thái mở khoá động trên danh sách giai đoạn (view).
 * Bài đầu mở; bài kế mở khi bài trước bắt đầu; "done" khi đạt quiz;
 * bài không có nội dung (phraseCount=0) → khoá & gãy chuỗi.
 */
// Bài "công cụ" — mở thẳng sang trang luyện riêng (không phải bài học cụm/SRS).
// Luôn mở & KHÔNG chặn chuỗi mở khoá (bỏ qua khi tính prevStarted).
export const TOOL_SLUGS = new Set(["ipa-sounds", "ai-roleplay"]);

export function computeStatusesView(
  viewStages: ViewStage[],
  savedByLesson: Record<string, number>,
  passedSlugs: string[] = [],
  currentStage = 1,
): Record<string, LessonStatus> {
  const out: Record<string, LessonStatus> = {};
  let prevStarted = true;
  for (const stage of viewStages) {
    if (stage.id === currentStage) prevStarted = true;
    for (const l of stage.lessons) {
      if (TOOL_SLUGS.has(l.slug)) {
        out[l.slug] = "available"; // công cụ: luôn mở, không ảnh hưởng chuỗi
        continue;
      }
      if (l.phraseCount <= 0) {
        out[l.slug] = "locked";
        prevStarted = false;
        continue;
      }
      const saved = savedByLesson[l.slug] ?? 0;
      const done = passedSlugs.includes(l.slug);
      const started = saved > 0;
      if (done) out[l.slug] = "done";
      else if (stage.id < currentStage || prevStarted || started) out[l.slug] = started ? "in_progress" : "available";
      else out[l.slug] = "locked";
      prevStarted = started || done;
    }
  }
  return out;
}

export function suggestedLesson(
  viewStages: ViewStage[], saved: Record<string, number>, passed: string[], currentStage: number,
): ViewLesson | null {
  const statuses = computeStatusesView(viewStages, saved, passed, currentStage);
  const candidates = viewStages.filter(s => s.id >= currentStage).flatMap(s => s.lessons)
    .filter(l => l.phraseCount > 0 && !TOOL_SLUGS.has(l.slug) && !passed.includes(l.slug));
  return candidates.find(l => statuses[l.slug] === "in_progress")
    ?? candidates.find(l => statuses[l.slug] === "available") ?? null;
}
