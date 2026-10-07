"use client";

import { localDate } from "./calendar";
import { supabase } from "@/lib/supabase";
import { listShadowActivity } from "./shadowingRepo";

export type DashboardStats = {
  // Ôn tập
  inReview: number; // tổng thẻ note đang ôn
  dueToday: number; // số thẻ đến hạn hôm nay
  recognized: number; // đã "hiểu"
  mastered: number; // ghi nhớ vững
  // Nhật ký
  journalToday: boolean; // đã viết hôm nay chưa
  journalStreak: number; // chuỗi ngày viết liên tiếp
  journalTotal: number;
  // Shadowing
  shadowToday: number;
  shadowDone: number; // số câu đã luyện
  shadowAvg: number | null; // điểm trung bình
};

type RiRow = {
  source_id: string;
  recognized: boolean;
  mastered: boolean;
  due_date: string;
  fsrs_card: { due: string } | null;
};

// Một ngày trong dòng thời gian hoạt động.
export type ActivityDay = {
  date: string; // YYYY-MM-DD (ngày địa phương)
  label: string; // nhãn ngắn hiển thị trên trục (vd "2/6")
  reviews: number; // số lần ôn (review_logs) trong ngày
  journaled: boolean; // có viết nhật ký không
  shadowAvg: number | null; // điểm phát âm TB của các câu shadowing trong ngày
  shadowCount: number; // số lượt chấm, kể cả luyện lại cùng câu
  shadowTotal: number; // tổng điểm chưa làm tròn để tính TB nhiều ngày chính xác
};

export function averagePronunciation(days: ActivityDay[]): number | null {
  const count = days.reduce((sum, day) => sum + day.shadowCount, 0);
  return count ? Math.round(days.reduce((sum, day) => sum + day.shadowTotal, 0) / count) : null;
}

function nextDayInstant(today: string): string {
  const end = new Date(today + "T00:00:00");
  end.setDate(end.getDate() + 1);
  return end.toISOString();
}

function activityDate(ts: string): string {
  return localDate(new Date(ts));
}

// Dòng thời gian hoạt động `days` ngày gần nhất (gồm hôm nay).
// Dữ liệu từ review_logs / journal_entries / shadowing_history (scoped theo user qua RLS).
export async function loadActivityTimeline(today: string, days = 14): Promise<ActivityDay[]> {
  const start = new Date(today + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startStr = start.toISOString().slice(0, 10);

  const startInstant = new Date(startStr + "T00:00:00").toISOString();
  const [logsRes, jRes, attempts] = await Promise.all([
    supabase.from("review_logs").select("reviewed_at").gte("reviewed_at", startInstant),
    supabase.from("journal_entries").select("entry_date").gte("entry_date", startStr),
    listShadowActivity(startInstant, nextDayInstant(today)),
  ]);

  if (logsRes.error) throw logsRes.error;
  if (jRes.error) throw jRes.error;

  // Khởi tạo khung ngày rỗng theo thứ tự thời gian.
  const buckets = new Map<string, { reviews: number; journaled: boolean; scores: number[] }>();
  const order: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    order.push(key);
    buckets.set(key, { reviews: 0, journaled: false, scores: [] });
  }

  for (const r of logsRes.data as { reviewed_at: string }[]) {
    const b = buckets.get(activityDate(r.reviewed_at));
    if (b) b.reviews++;
  }
  for (const r of jRes.data as { entry_date: string }[]) {
    const b = buckets.get(r.entry_date);
    if (b) b.journaled = true;
  }
  for (const r of attempts) {
    if (r.pronunciation_score == null) continue;
    const b = buckets.get(activityDate(r.created_at));
    if (b) b.scores.push(Number(r.pronunciation_score));
  }

  return order.map((key) => {
    const b = buckets.get(key)!;
    const [, m, d] = key.split("-");
    return {
      date: key,
      label: `${Number(d)}/${Number(m)}`,
      reviews: b.reviews,
      journaled: b.journaled,
      shadowCount: b.scores.length,
      shadowTotal: b.scores.reduce((a, c) => a + c, 0),
      shadowAvg: b.scores.length
        ? Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length)
        : null,
    };
  });
}

export async function loadDashboard(today: string): Promise<DashboardStats> {
  const [notesRes, riRes, jRes, sRes, todayAttempts] = await Promise.all([
    supabase.from("notes").select("id, in_review"),
    supabase
      .from("review_items")
      .select("source_id, recognized, mastered, due_date, fsrs_card")
      .eq("source_type", "note"),
    supabase.from("journal_entries").select("entry_date"),
    supabase.from("shadowing_attempts")
      .select("pronunciation_score, created_at").eq("score_source", "azure"),
    listShadowActivity(new Date(today + "T00:00:00").toISOString(), nextDayInstant(today)),
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
    if (!s || (s.fsrs_card ? new Date(s.fsrs_card.due).getTime() <= Date.now() : s.due_date <= today)) dueToday++;
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
  const shadowToday = new Set(todayAttempts.map(r => r.client_key)).size;
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
    shadowToday,
    shadowAvg,
  };
}
