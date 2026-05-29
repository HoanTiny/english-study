"use client";

import { supabase } from "@/lib/supabase";

export type DashboardStats = {
  // Ôn tập
  inReview: number; // tổng thẻ note đang ôn
  dueToday: number; // số thẻ đến hạn hôm nay
  recognized: number; // đã "hiểu"
  mastered: number; // đã "nói được"
  // Nhật ký
  journalToday: boolean; // đã viết hôm nay chưa
  journalStreak: number; // chuỗi ngày viết liên tiếp
  journalTotal: number;
  // Shadowing
  shadowDone: number; // số câu đã luyện
  shadowAvg: number | null; // điểm trung bình
};

type RiRow = {
  source_id: string;
  recognized: boolean;
  mastered: boolean;
  due_date: string;
};

export async function loadDashboard(today: string): Promise<DashboardStats> {
  const [notesRes, riRes, jRes, sRes] = await Promise.all([
    supabase.from("notes").select("id, in_review"),
    supabase
      .from("review_items")
      .select("source_id, recognized, mastered, due_date")
      .eq("source_type", "note"),
    supabase.from("journal_entries").select("entry_date"),
    supabase.from("shadowing_attempts").select("pronunciation_score"),
  ]);

  if (notesRes.error) throw notesRes.error;
  if (riRes.error) throw riRes.error;
  if (jRes.error) throw jRes.error;
  if (sRes.error) throw sRes.error;

  const notes = notesRes.data as { id: string; in_review: boolean }[];
  const ri = riRes.data as RiRow[];
  const riBySource = new Map(ri.map((r) => [r.source_id, r]));

  const inReviewNotes = notes.filter((n) => n.in_review);
  const inReview = inReviewNotes.length;

  // Đến hạn: thẻ đang ôn mà chưa có trạng thái (thẻ mới) hoặc due_date <= hôm nay.
  let dueToday = 0;
  for (const n of inReviewNotes) {
    const s = riBySource.get(n.id);
    if (!s || s.due_date <= today) dueToday++;
  }
  const recognized = ri.filter((r) => r.recognized).length;
  const mastered = ri.filter((r) => r.mastered).length;

  // Nhật ký: streak ngày liên tiếp tính từ hôm nay (hoặc hôm qua) lùi về.
  const dates = new Set((jRes.data as { entry_date: string }[]).map((r) => r.entry_date));
  const journalTotal = dates.size;
  const journalToday = dates.has(today);
  let journalStreak = 0;
  {
    const d = new Date(today + "T00:00:00Z");
    // nếu hôm nay chưa viết, vẫn cho phép streak tính tới hôm qua
    if (!dates.has(today)) d.setUTCDate(d.getUTCDate() - 1);
    while (dates.has(d.toISOString().slice(0, 10))) {
      journalStreak++;
      d.setUTCDate(d.getUTCDate() - 1);
    }
  }

  const scores = (sRes.data as { pronunciation_score: number | null }[])
    .map((r) => r.pronunciation_score)
    .filter((v): v is number => v != null);
  const shadowDone = scores.length;
  const shadowAvg =
    shadowDone > 0
      ? Math.round(scores.reduce((a, b) => a + Number(b), 0) / shadowDone)
      : null;

  return {
    inReview,
    dueToday,
    recognized,
    mastered,
    journalToday,
    journalStreak,
    journalTotal,
    shadowDone,
    shadowAvg,
  };
}
