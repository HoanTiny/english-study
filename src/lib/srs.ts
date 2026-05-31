// Lặp lại ngắt quãng bằng FSRS (Free Spaced Repetition Scheduler) — mô hình hiện đại
// dựa trên 3 biến: Độ khó (difficulty), Độ ổn định (stability), Khả năng nhớ lại (retrievability).
//
// LƯU Ý KIẾN TRÚC: để KHÔNG phải migration DB, ta tái dùng các cột SM-2 cũ:
//   - ease_factor  ↔ FSRS difficulty (1..10)
//   - interval_days↔ FSRS stability (làm tròn ngày)
//   - repetitions  ↔ reps
//   - due_date     ↔ ngày đến hạn
// Nhờ vậy reviewRepo/giao diện giữ nguyên, chỉ thuật toán bên trong đổi sang FSRS.

import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  type Card,
  type Grade as FsrsGrade,
} from "ts-fsrs";

export type SrsState = {
  ease: number; // = FSRS difficulty (1..10)
  interval: number; // = FSRS stability làm tròn (ngày)
  repetitions: number; // = reps
  due: string; // ngày đến hạn (YYYY-MM-DD)
};

// 4 nút đánh giá quen thuộc → Rating của FSRS.
export type Grade = "again" | "hard" | "good" | "easy";
const RATING: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};
// Vẫn ghi review_logs.quality (1..4) cho tương thích.
export const GRADE_QUALITY: Record<Grade, number> = { again: 1, hard: 2, good: 3, easy: 4 };

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export function initialState(today: string): SrsState {
  return { ease: 0, interval: 0, repetitions: 0, due: today };
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Dựng lại một thẻ FSRS từ trạng thái đã lưu (xấp xỉ last_review từ due - interval).
function toCard(state: SrsState, today: string): Card {
  const now = new Date(today + "T00:00:00Z");
  if (state.repetitions === 0 && state.interval === 0) {
    return createEmptyCard(now);
  }
  const lastReview = addDays(state.due, -Math.max(1, state.interval));
  return {
    due: new Date(state.due + "T00:00:00Z"),
    stability: Math.max(0.1, state.interval),
    difficulty: state.ease >= 1 ? state.ease : 5,
    elapsed_days: state.interval,
    scheduled_days: state.interval,
    reps: state.repetitions,
    lapses: 0,
    learning_steps: 0,
    state: State.Review,
    last_review: new Date(lastReview + "T00:00:00Z"),
  };
}

export function review(state: SrsState, grade: Grade, today: string): SrsState {
  const card = toCard(state, today);
  const now = new Date(today + "T00:00:00Z");
  const { card: next } = scheduler.next(card, now, RATING[grade]);
  return {
    ease: Math.round(next.difficulty * 100) / 100,
    interval: Math.max(1, Math.round(next.stability)),
    repetitions: next.reps,
    due: next.due.toISOString().slice(0, 10),
  };
}

export function isDue(state: SrsState, today: string): boolean {
  return state.due <= today;
}

// "Sức mạnh trí nhớ" 0..100 cho thanh hiển thị — từ stability (≈ interval ngày), thang log.
// ~1 ngày → thấp, ~180 ngày → ~100%.
export function memoryStrength(state: SrsState): number {
  const s = Math.max(0, state.interval);
  return Math.min(100, Math.round((Math.log10(s + 1) / Math.log10(181)) * 100));
}
