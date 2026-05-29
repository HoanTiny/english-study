// Thuật toán lặp lại ngắt quãng SM-2 (SuperMemo 2).
// Trạng thái mỗi thẻ ôn tập, độc lập với nguồn (note/vocab/shadowing).

export type SrsState = {
  ease: number; // hệ số dễ, >= 1.3
  interval: number; // số ngày đến lần ôn kế
  repetitions: number; // số lần nhớ đúng liên tiếp
  due: string; // ngày đến hạn (YYYY-MM-DD)
};

// 4 nút đánh giá quen thuộc → quality 0..5 của SM-2.
export type Grade = "again" | "hard" | "good" | "easy";
export const GRADE_QUALITY: Record<Grade, number> = { again: 2, hard: 3, good: 4, easy: 5 };

export function initialState(today: string): SrsState {
  return { ease: 2.5, interval: 0, repetitions: 0, due: today };
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function review(state: SrsState, grade: Grade, today: string): SrsState {
  const q = GRADE_QUALITY[grade];

  let { ease, interval, repetitions } = state;

  if (q < 3) {
    // Nhớ sai → học lại từ đầu, ôn lại trong ngày/hôm sau.
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease);
    repetitions += 1;
  }

  // Cập nhật hệ số dễ theo công thức SM-2.
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  return { ease: Math.round(ease * 100) / 100, interval, repetitions, due: addDays(today, interval) };
}

export function isDue(state: SrsState, today: string): boolean {
  return state.due <= today;
}
