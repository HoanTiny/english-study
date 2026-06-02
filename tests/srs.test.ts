import { describe, it, expect } from "vitest";
import {
  initialState,
  review,
  isDue,
  memoryStrength,
  GRADE_QUALITY,
  type Grade,
} from "@/lib/srs";

const TODAY = "2026-06-02";

describe("initialState", () => {
  it("tạo thẻ mới chưa ôn, đến hạn ngay hôm nay", () => {
    const s = initialState(TODAY);
    expect(s).toEqual({ ease: 0, interval: 0, repetitions: 0, due: TODAY });
    expect(isDue(s, TODAY)).toBe(true);
  });
});

describe("isDue", () => {
  it("đến hạn khi due <= hôm nay", () => {
    expect(isDue({ ease: 5, interval: 3, repetitions: 1, due: "2026-06-01" }, TODAY)).toBe(true);
    expect(isDue({ ease: 5, interval: 3, repetitions: 1, due: "2026-06-02" }, TODAY)).toBe(true);
    expect(isDue({ ease: 5, interval: 3, repetitions: 1, due: "2026-06-03" }, TODAY)).toBe(false);
  });
});

describe("review", () => {
  const grades: Grade[] = ["again", "hard", "good", "easy"];

  it("mọi đánh giá đều trả về trạng thái hợp lệ", () => {
    const start = initialState(TODAY);
    for (const g of grades) {
      const next = review(start, g, TODAY);
      expect(next.interval).toBeGreaterThanOrEqual(1);
      expect(next.repetitions).toBeGreaterThanOrEqual(1);
      expect(next.ease).toBeGreaterThan(0);
      expect(next.due >= TODAY).toBe(true); // due không lùi về quá khứ
    }
  });

  it("due có định dạng YYYY-MM-DD và không lùi về trước hôm nay", () => {
    // Lưu ý: due do FSRS sinh (gồm learning-step + fuzz), KHÔNG nhất thiết bằng
    // hôm nay + interval (interval = round(stability)). Chỉ kiểm tra bất biến an toàn.
    const next = review(initialState(TODAY), "good", TODAY);
    expect(next.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(next.due >= TODAY).toBe(true);
  });

  it("'easy' cho khoảng ôn dài hơn (hoặc bằng) 'good' trên thẻ mới", () => {
    const start = initialState(TODAY);
    const good = review(start, "good", TODAY);
    const easy = review(start, "easy", TODAY);
    expect(easy.interval).toBeGreaterThanOrEqual(good.interval);
  });

  it("'again' cho khoảng ôn ngắn (≈1 ngày) — cần ôn lại sớm", () => {
    const again = review(initialState(TODAY), "again", TODAY);
    expect(again.interval).toBeLessThanOrEqual(2);
  });

  it("ôn 'good' nhiều lần liên tiếp thì interval tăng dần (học thuộc dần)", () => {
    let s = initialState(TODAY);
    let prev = 0;
    let day = TODAY;
    for (let i = 0; i < 4; i++) {
      s = review(s, "good", day);
      expect(s.interval).toBeGreaterThanOrEqual(prev);
      prev = s.interval;
      day = s.due; // ôn đúng ngày đến hạn
    }
    expect(prev).toBeGreaterThan(1);
  });
});

describe("memoryStrength", () => {
  it("thẻ mới (interval 0) → 0%", () => {
    expect(memoryStrength({ ease: 0, interval: 0, repetitions: 0, due: TODAY })).toBe(0);
  });

  it("interval lớn → tiến gần 100% và bị kẹp ở 100", () => {
    expect(memoryStrength({ ease: 6, interval: 180, repetitions: 5, due: TODAY })).toBe(100);
    expect(memoryStrength({ ease: 6, interval: 9999, repetitions: 9, due: TODAY })).toBe(100);
  });

  it("đơn điệu tăng theo interval và luôn nằm trong [0, 100]", () => {
    let prev = -1;
    for (const interval of [0, 1, 7, 21, 60, 120, 181]) {
      const v = memoryStrength({ ease: 5, interval, repetitions: 1, due: TODAY });
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("GRADE_QUALITY", () => {
  it("ánh xạ 4 nút sang chất lượng 1..4 cho review_logs", () => {
    expect(GRADE_QUALITY).toEqual({ again: 1, hard: 2, good: 3, easy: 4 });
  });
});
