"use client";

import { recordStudyEvent } from "./studySession";
import { touchStreak } from "@/lib/profileRepo";
import { supabase } from "@/lib/supabase";
import {
  review,
  initialState,
  GRADE_QUALITY,
  type Grade,
  type SrsState,
  type StoredCard,
} from "@/lib/srs";

// Trạng thái SRS của một thẻ note, kèm id hàng review_items (nếu đã tồn tại).
export type NoteReviewState = SrsState & { reviewItemId: string };

type Row = {
  id: string;
  source_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_date: string;
  fsrs_card: StoredCard | null;
};

function fromRow(r: Row): NoteReviewState {
  return {
    reviewItemId: r.id,
    ease: Number(r.ease_factor),
    interval: r.interval_days,
    repetitions: r.repetitions,
    due: r.due_date,
    card: r.fsrs_card ?? undefined,
  };
}

/** Lấy trạng thái SRS của tất cả note đang ôn, map theo noteId (= source_id). */
export async function listNoteReviewStates(): Promise<
  Record<string, NoteReviewState>
> {
  const { data, error } = await supabase
    .from("review_items")
    .select("id, source_id, ease_factor, interval_days, repetitions, due_date, fsrs_card")
    .eq("source_type", "note");
  if (error) throw error;
  const map: Record<string, NoteReviewState> = {};
  for (const r of data as Row[]) map[r.source_id] = fromRow(r);
  return map;
}

/**
 * Chấm một thẻ note: tính FSRS, upsert review_items, ghi review_logs.
 * `prev` là trạng thái hiện tại (null nếu thẻ chưa từng ôn).
 * Trả về trạng thái mới.
 */
export async function gradeNote(
  userId: string,
  noteId: string,
  prev: NoteReviewState | null,
  grade: Grade,
  today: string,
): Promise<NoteReviewState> {
  const prevState: SrsState = prev ?? initialState(today);
  const next = review(prevState, grade, today, new Date());

  const { data, error } = await supabase
    .from("review_items")
    .upsert(
      {
        user_id: userId,
        source_type: "note",
        source_id: noteId,
        ease_factor: next.ease,
        interval_days: next.interval,
        repetitions: next.repetitions,
        due_date: next.due,
        fsrs_card: next.card,
        // Recognition and stable recall are distinct from speaking ability.
        recognized: grade !== "again",
        mastered: grade !== "again" && (next.card?.stability ?? 0) >= 21,
      },
      { onConflict: "user_id,source_type,source_id" },
    )
    .select("id, source_id, ease_factor, interval_days, repetitions, due_date, fsrs_card")
    .single();
  if (error) throw error;
  recordStudyEvent(userId, { kind: "review", id: noteId });
  void touchStreak(userId).then(() => window.dispatchEvent(new Event("study-activity"))).catch(console.error);

  const saved = fromRow(data as Row);

  // Ghi nhật ký lần ôn (không chặn nếu lỗi log).
  const { error: logErr } = await supabase.from("review_logs").insert({
    review_item_id: saved.reviewItemId,
    quality: GRADE_QUALITY[grade],
  });
  if (logErr) console.error("review_logs insert", logErr);

  return saved;
}
