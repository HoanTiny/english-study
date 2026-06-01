"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { loadDashboard, type DashboardStats } from "@/lib/statsRepo";
import StudyReminder from "@/components/StudyReminder";
import SuggestedLesson from "@/components/SuggestedLesson";

// Bảng tiến độ "Hôm nay": tỉ lệ Hiểu→Nói + 3 nhiệm vụ + nhắc học.
// Dùng chung cho trang /today và /account.
export default function TodayDashboard() {
  const today = todayKey();
  const { userId, ready } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    loadDashboard(today)
      .then((s) => {
        if (active) {
          setStats(s);
          setLoaded(true);
        }
      })
      .catch((e) => console.error("loadDashboard", e));
    return () => {
      active = false;
    };
  }, [ready, userId, today]);

  const gapPct = stats && stats.recognized > 0 ? Math.round((stats.mastered / stats.recognized) * 100) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (gapPct / 100) * circumference;

  if (!loaded) {
    return (
      <div className="rounded-3xl border border-border/40 bg-surface/50 p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Đang đồng bộ tiến trình…</p>
        </div>
      </div>
    );
  }
  if (!stats) return null;

  const empty = stats.inReview === 0 && !stats.journalToday && stats.shadowDone === 0;

  // 3 nhiệm vụ chính — cấu hình gọn để render đồng nhất.
  const tasks = [
    {
      href: "/review",
      icon: "🔁",
      title: "Ôn tập",
      value: String(stats.dueToday),
      unit: "thẻ đến hạn hôm nay",
      foot: `Đã ôn ${stats.inReview} thẻ`,
      cta: stats.dueToday > 0 ? "Ôn ngay →" : "Hoàn tất ✓",
      done: stats.dueToday === 0,
      tint: "primary" as const,
    },
    {
      href: "/journal",
      icon: "📔",
      title: "Nhật ký",
      value: `🔥 ${stats.journalStreak}`,
      unit: "ngày streak liên tiếp",
      foot: stats.journalToday ? "Đã viết hôm nay" : "Chưa viết hôm nay",
      cta: stats.journalToday ? "Đã viết ✓" : "Viết ngay →",
      done: !!stats.journalToday,
      tint: "pink" as const,
    },
    {
      href: "/shadowing",
      icon: "🎧",
      title: "Shadowing",
      value: stats.shadowAvg != null ? String(stats.shadowAvg) : "—",
      unit: "điểm phát âm TB",
      foot: `Đã học ${stats.shadowDone} câu`,
      cta: "Luyện nói →",
      done: false,
      tint: "primary" as const,
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Hero: tỉ lệ Hiểu → Nói được */}
      <div className="rounded-3xl border border-border/40 bg-white/70 dark:bg-zinc-900/60 p-6 md:p-7 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-1 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft/70 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
            📊 Hiểu → Nói được
          </span>
          <h2 className="mt-3 font-display text-xl md:text-2xl font-extrabold text-foreground">Vốn từ chủ động của bạn</h2>
          <p className="mt-1 text-xs sm:text-sm font-medium text-muted">Số từ bạn đã luyện đến mức nói ra tự nhiên được.</p>
          <p className="mt-3 font-display text-3xl font-black text-foreground leading-none">
            {stats.mastered}
            <span className="ml-1.5 text-sm font-semibold text-muted">/ {stats.recognized} từ đã tiếp cận</span>
          </p>
        </div>

        {/* Vòng % */}
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90">
            <circle cx="48" cy="48" r={radius} className="stroke-black/5 dark:stroke-white/10" strokeWidth="7" fill="transparent" />
            <circle cx="48" cy="48" r={radius} className="stroke-primary" strokeWidth="7" fill="transparent" strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-display text-xl font-black text-foreground">{gapPct}%</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted">chuyển hóa</span>
          </div>
        </div>
      </div>

      {/* 3 nhiệm vụ */}
      <div className="grid gap-4 sm:grid-cols-3">
        {tasks.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex flex-col gap-3 rounded-3xl border border-border/40 bg-white/70 dark:bg-zinc-900/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${t.tint === "pink" ? "bg-pink-soft/70" : "bg-primary-soft/70"}`}>{t.icon}</span>
              <span className="font-display text-sm font-extrabold text-foreground">{t.title}</span>
            </div>
            <div>
              <p className="font-display text-3xl font-black text-foreground leading-none">{t.value}</p>
              <p className="mt-1 text-[11px] font-medium text-muted">{t.unit}</p>
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-border/30 pt-3">
              <span className="text-[11px] font-semibold text-muted">{t.foot}</span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${t.done ? "bg-emerald-500/10 text-emerald-500" : t.tint === "pink" ? "bg-pink text-pink-fg" : "bg-primary text-primary-fg"}`}>
                {t.cta}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Gợi ý bài học */}
      <SuggestedLesson />

      {/* Nhắc học hằng ngày */}
      <StudyReminder studiedToday={stats.journalToday || (stats.inReview > 0 && stats.dueToday === 0)} />

      {/* Khởi động khi chưa có hoạt động */}
      {empty && (
        <div className="rounded-3xl border border-primary/15 bg-primary-soft/20 p-5 text-center">
          <p className="text-sm font-semibold text-muted leading-relaxed">
            ✨ Chưa có hoạt động hôm nay. Lưu vài từ trong{" "}
            <Link href="/vocab" className="font-black text-primary underline">Thư viện từ vựng</Link>{" "}
            để FSRS tự lên lịch ôn cho bạn nhé!
          </p>
        </div>
      )}
    </div>
  );
}
