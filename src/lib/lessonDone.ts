"use client";

// Đánh dấu bài học đã "hoàn thành" (qua quiz) — lưu cục bộ theo thiết bị.
// Tách khỏi tiến độ SRS (đẩy cụm vào ôn tập) — đây là dấu "đã luyện xong bài".

const KEY = "speakup.lessonDone";

function readAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function isLessonDone(slug: string): boolean {
  return !!readAll()[slug];
}

export function markLessonDone(slug: string): void {
  try {
    const all = readAll();
    all[slug] = new Date().toISOString().slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // bỏ qua
  }
}

export function listDoneSlugs(): string[] {
  return Object.keys(readAll());
}
