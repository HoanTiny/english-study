"use client";

import { stages, type LessonStatus } from "@/lib/curriculum";
import { getLesson } from "@/lib/lessons";
import type { Note } from "@/lib/notesRepo";

// Đếm số cụm đã đẩy vào ôn tập theo từng bài (tag = slug bài học).
export function countSavedByLesson(notes: Note[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const n of notes) {
    for (const tag of n.tags) map[tag] = (map[tag] ?? 0) + 1;
  }
  return map;
}

/**
 * Tính trạng thái mở khoá động cho mọi bài học.
 * Quy tắc: bài đầu luôn mở; bài kế mở khi bài trước đã "bắt đầu" (lưu ≥1 cụm).
 * "done" khi đã lưu hết số cụm của bài. Bài chưa có nội dung → luôn khoá.
 */
export function computeStatuses(
  savedByLesson: Record<string, number>,
): Record<string, LessonStatus> {
  const out: Record<string, LessonStatus> = {};
  let prevStarted = true; // để bài đầu tiên được mở

  for (const stage of stages) {
    for (const lesson of stage.lessons) {
      const content = getLesson(lesson.slug);
      if (!content) {
        out[lesson.slug] = "locked";
        prevStarted = false; // bài chưa soạn làm gãy chuỗi mở khoá
        continue;
      }
      const total = content.phrases.length;
      const saved = savedByLesson[lesson.slug] ?? 0;
      const done = total > 0 && saved >= total;
      const started = saved > 0;

      if (done) out[lesson.slug] = "done";
      else if (prevStarted) out[lesson.slug] = started ? "in_progress" : "available";
      else out[lesson.slug] = "locked";

      prevStarted = started || done;
    }
  }
  return out;
}
