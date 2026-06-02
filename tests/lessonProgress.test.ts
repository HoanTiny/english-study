import { describe, it, expect } from "vitest";
import { countSavedByLesson, computeStatuses } from "@/lib/lessonProgress";
import { stages, type LessonStatus } from "@/lib/curriculum";
import { getLesson } from "@/lib/lessons";
import type { Note } from "@/lib/notesRepo";

const VALID: LessonStatus[] = ["done", "in_progress", "available", "locked"];

// Tạo Note tối thiểu cho test (chỉ tags là quan trọng với countSavedByLesson).
function note(tags: string[]): Note {
  return { tags } as unknown as Note;
}

// Bài học đầu tiên CÓ nội dung trong lộ trình (làm mốc cho các bất biến).
const firstWithContent = stages
  .flatMap((s) => s.lessons)
  .find((l) => !!getLesson(l.slug));

describe("countSavedByLesson", () => {
  it("đếm số lần xuất hiện mỗi tag (slug bài học)", () => {
    const map = countSavedByLesson([
      note(["greetings", "family"]),
      note(["greetings"]),
      note([]),
    ]);
    expect(map.greetings).toBe(2);
    expect(map.family).toBe(1);
  });

  it("danh sách rỗng → object rỗng", () => {
    expect(countSavedByLesson([])).toEqual({});
  });
});

describe("computeStatuses", () => {
  it("mọi bài đều nhận trạng thái hợp lệ", () => {
    const out = computeStatuses({});
    for (const slug of Object.keys(out)) {
      expect(VALID).toContain(out[slug]);
    }
  });

  it("chưa lưu gì: bài đầu (có nội dung) được mở, không bị khoá", () => {
    expect(firstWithContent).toBeDefined();
    const out = computeStatuses({});
    expect(out[firstWithContent!.slug]).toBe("available");
  });

  it("lưu đủ số cụm của bài đầu → bài đó 'done'", () => {
    const slug = firstWithContent!.slug;
    const total = getLesson(slug)!.phrases.length;
    const out = computeStatuses({ [slug]: total });
    expect(out[slug]).toBe("done");
  });

  it("lưu 1 cụm (chưa đủ) → bài đang học 'in_progress'", () => {
    const slug = firstWithContent!.slug;
    const out = computeStatuses({ [slug]: 1 });
    expect(out[slug]).toBe("in_progress");
  });

  it("hoàn thành bài đầu sẽ mở khoá bài kế tiếp (có nội dung)", () => {
    const lessons = stages.flatMap((s) => s.lessons);
    const startIdx = lessons.findIndex((l) => l.slug === firstWithContent!.slug);
    const next = lessons.slice(startIdx + 1).find((l) => !!getLesson(l.slug));
    if (!next) return; // chỉ có 1 bài có nội dung → bỏ qua

    const total = getLesson(firstWithContent!.slug)!.phrases.length;
    const lockedBefore = computeStatuses({})[next.slug];
    const afterStart = computeStatuses({ [firstWithContent!.slug]: total })[next.slug];
    // Trước khi bắt đầu bài đầu, bài kế có thể đã mở (nếu liền kề) — nhưng sau khi
    // hoàn thành bài đầu thì chắc chắn không còn 'locked'.
    expect(afterStart).not.toBe("locked");
    expect(VALID).toContain(lockedBefore);
  });
});
