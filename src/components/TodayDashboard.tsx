"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { loadDashboard, loadActivityTimeline, type DashboardStats, type ActivityDay } from "@/lib/statsRepo";
import StudyReminder from "@/components/StudyReminder";
import SuggestedLesson from "@/components/SuggestedLesson";
import ProgressRing from "@/components/ProgressRing";

// Thẻ kính trong suốt — DÙNG CHUNG class `.glass-card` với Bảng điều khiển (nền trong, không màu).
const GLASS = "glass-card rounded-3xl";

// Nền trong suốt (không gradient/glow màu) — chỉ là khung chứa; thẻ glass-card tự nổi.
function Stage({ children }: { children: ReactNode }) {
  return <div className="relative">{children}</div>;
}

// Biểu đồ mini "Hoạt động 7 ngày" — bars CSS thuần (nhẹ, không recharts), khớp Quick Analytics của Dashboard.
function WeeklyChart({ week }: { week: ActivityDay[] }) {
  const max = Math.max(1, ...week.map((d) => d.reviews));
  const totalReviews = week.reduce((s, d) => s + d.reviews, 0);
  const activeDays = week.filter((d) => d.reviews > 0 || d.journaled).length;
  const todayIdx = week.length - 1;

  return (
    <div className={`${GLASS} p-5 sm:p-6`}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Hoạt động 7 ngày</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-black text-foreground leading-none">{totalReviews}</span>
            <span className="text-[11px] font-semibold text-muted">lượt ôn · {activeDays}/7 ngày học</span>
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          {activeDays >= 5 ? "🔥 Đều đặn" : activeDays >= 2 ? "Giữ nhịp nhé" : "Bắt đầu nào"}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2 h-24">
        {week.map((d, i) => {
          const h = Math.round((d.reviews / max) * 100);
          const isToday = i === todayIdx;
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="relative flex w-full flex-1 items-end justify-center">
                <div
                  className={`w-full max-w-[18px] rounded-lg transition-all duration-500 ${
                    d.reviews > 0
                      ? "bg-gradient-to-t from-emerald-400/70 to-emerald-300/90"
                      : "bg-foreground/[0.06]"
                  } ${isToday ? "ring-2 ring-emerald-400/60 ring-offset-1 ring-offset-transparent" : ""}`}
                  style={{ height: `${Math.max(d.reviews > 0 ? 14 : 6, h)}%` }}
                  title={`${d.reviews} lượt ôn`}
                />
                {d.journaled && (
                  <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-400" title="Có viết nhật ký" />
                )}
              </div>
              <span className={`text-[8.5px] font-bold ${isToday ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-white/40 pt-3 text-[8.5px] font-bold uppercase tracking-wider text-muted dark:border-white/10">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-gradient-to-t from-emerald-400/70 to-emerald-300/90" /> Lượt ôn</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Có nhật ký</span>
      </div>
    </div>
  );
}

type Task = {
  href: string;
  icon: string;
  label: string;
  title: string;
  value: string;
  note: string;
  cta: string;
  done: boolean;
  tint: string;
};

export default function TodayDashboard() {
  const today = todayKey();
  const { userId, ready, streak } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [week, setWeek] = useState<ActivityDay[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    Promise.all([loadDashboard(today), loadActivityTimeline(today, 7)])
      .then(([s, w]) => {
        if (active) {
          setStats(s);
          setWeek(w);
          setLoaded(true);
        }
      })
      .catch((e) => console.error("loadDashboard", e));
    return () => {
      active = false;
    };
  }, [ready, userId, today]);

  if (!loaded) {
    return (
      <Stage>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center select-none">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/15 border-t-[var(--gold)]" />
          <p className="text-[10px] font-black uppercase tracking-wider text-muted/80">Đang đồng bộ tiến trình học…</p>
        </div>
      </Stage>
    );
  }

  if (!stats) return null;

  const gapPct = stats.recognized > 0 ? Math.round((stats.mastered / stats.recognized) * 100) : 0;
  const empty = stats.inReview === 0 && !stats.journalToday && stats.shadowDone === 0;

  const chips = [
    { label: "Thẻ đến hạn", value: `${stats.dueToday}`, accent: "text-primary" },
    { label: "Streak", value: `${streak}`, accent: "text-orange-500" },
    { label: "Streak nhật ký", value: `${stats.journalStreak}`, accent: "text-pink" },
    { label: "Phát âm TB", value: stats.shadowAvg != null ? `${stats.shadowAvg}đ` : "—", accent: "text-violet-500" },
  ];

  const tasks: Task[] = [
    { href: "/review", icon: "🔁", label: "Vòng ôn tập", title: "Học & Ôn SRS", value: `${stats.dueToday}`, note: "thẻ đến hạn hôm nay", cta: stats.dueToday > 0 ? "Ôn ngay →" : "Hoàn thành ✓", done: stats.dueToday === 0 && stats.inReview > 0, tint: "emerald" },
    { href: "/journal", icon: "✍️", label: "Phản xạ viết", title: "Nhật ký cùng AI", value: `${stats.journalStreak}`, note: "ngày streak viết", cta: stats.journalToday ? "Đã viết ✓" : "Viết ngay →", done: stats.journalToday, tint: "amber" },
    { href: "/shadowing", icon: "🗣️", label: "Luyện nói", title: "Shadowing", value: `${stats.shadowDone}`, note: "câu đã luyện", cta: "Luyện ngay →", done: stats.shadowDone > 0, tint: "violet" },
  ];

  const tintCls: Record<string, { dot: string; icon: string; cta: string }> = {
    emerald: { dot: "bg-emerald-400", icon: "bg-emerald-500/10 border-emerald-500/20", cta: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    amber: { dot: "bg-amber-400", icon: "bg-amber-500/10 border-amber-500/20", cta: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    violet: { dot: "bg-violet-400", icon: "bg-violet-500/10 border-violet-500/20", cta: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  };

  return (
    <Stage>
      <div className="space-y-5 animate-fadeIn">
        {/* ── Tổng quan: vòng "Nói được" + chip số liệu ── */}
        <div className={`${GLASS} flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7`}>
          <ProgressRing value={gapPct} size={104} stroke={10} color="#34D399">
            <span className="font-display text-2xl font-black text-foreground leading-none">{gapPct}%</span>
            <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-muted">nói được</span>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Vốn từ chủ động</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <span className="font-display text-2xl font-black text-foreground leading-none">{stats.mastered}</span>
              <span className="text-[11px] font-semibold text-muted">nói được / {stats.recognized} đã tiếp cận</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {chips.map((c) => (
                <div key={c.label} className="rounded-2xl border border-white/50 bg-white/30 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className={`font-display text-lg font-black leading-none ${c.accent}`}>{c.value}</p>
                  <p className="mt-1 text-[8.5px] font-black uppercase tracking-wider text-muted">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Biểu đồ mini: hoạt động 7 ngày ── */}
        <WeeklyChart week={week} />

        {/* ── Gợi ý bài học hôm nay ── */}
        <div className={`${GLASS} p-5`}>
          <SuggestedLesson />
        </div>

        {/* ── 3 VIỆC CẦN LÀM (trọng tâm) ── */}
        <div>
          <p className="mb-2.5 px-1 text-[10px] font-black uppercase tracking-wider text-muted">Việc cần làm hôm nay</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {tasks.map((t) => {
              const c = tintCls[t.tint];
              return (
                <Link key={t.href} href={t.href} className={`group ${GLASS} flex flex-col justify-between gap-4 p-5 transition-all duration-300 hover:-translate-y-1`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-lg ${c.icon}`}>{t.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted">{t.label}</p>
                      <p className="font-display text-sm font-black text-foreground">{t.title}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-display text-4xl font-black text-foreground leading-none">{t.value}</p>
                    <p className="mt-1 text-[11px] font-medium text-muted">{t.note}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/40 pt-3 dark:border-white/10">
                    <span className={`h-1.5 w-1.5 rounded-full ${t.done ? c.dot : "bg-foreground/15"}`} />
                    <span className={`rounded-full px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider ${c.cta}`}>{t.cta}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Nhắc học ── */}
        <div className={`${GLASS} p-5`}>
          <StudyReminder studiedToday={stats.journalToday || (stats.inReview > 0 && stats.dueToday === 0)} />
        </div>

        {empty && (
          <div className="rounded-2xl border border-primary/15 bg-primary-soft/30 p-5 text-center select-none">
            <p className="text-xs font-semibold text-muted leading-relaxed">
              ✨ Bạn chưa có hoạt động nào hôm nay. Hãy lưu vài cụm từ trong{" "}
              <Link href="/vocab" className="font-black text-primary underline">Thư viện từ vựng</Link>{" "}
              để kích hoạt lịch ôn FSRS nhé!
            </p>
          </div>
        )}
      </div>
    </Stage>
  );
}
