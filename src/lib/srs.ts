import { localDate } from "./calendar";
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  type Card,
  type Grade as FsrsGrade,
} from "ts-fsrs";

export type StoredCard = Omit<Card, "due" | "last_review"> & { due: string; last_review?: string };

export type SrsState = {
  card?: StoredCard;
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
function toCard(state: SrsState, now: Date): Card {
  if (state.card) return { ...state.card, due: new Date(state.card.due), last_review: state.card.last_review ? new Date(state.card.last_review) : undefined };
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

export function review(state: SrsState, grade: Grade, today: string, now = new Date(today + "T00:00:00")): SrsState {
  const card = toCard(state, now);
  const { card: next } = scheduler.next(card, now, RATING[grade]);
  return {
    card: { ...next, due: next.due.toISOString(), last_review: next.last_review?.toISOString() },
    ease: next.difficulty,
    interval: Math.max(1, Math.round(next.stability)),
    repetitions: next.reps,
    due: localDate(next.due),
  };
}

export function isDue(state: SrsState, today: string, now = new Date()): boolean {
  return state.card ? new Date(state.card.due).getTime() <= now.getTime() : state.due <= today;
}

// "Sức mạnh trí nhớ" 0..100 cho thanh hiển thị — từ stability (≈ interval ngày), thang log.
// ~1 ngày → thấp, ~180 ngày → ~100%.
export function memoryStrength(state: SrsState): number {
  const s = Math.max(0, state.card?.stability ?? state.interval);
  return Math.min(100, Math.round((Math.log10(s + 1) / Math.log10(181)) * 100));
}
