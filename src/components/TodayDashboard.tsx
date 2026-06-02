"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { loadDashboard, type DashboardStats } from "@/lib/statsRepo";
import StudyReminder from "@/components/StudyReminder";
import SuggestedLesson from "@/components/SuggestedLesson";

export default function TodayDashboard() {
  const today = todayKey();
  const { userId, ready, streak } = useAuth();
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

  if (!loaded) {
    return (
      <div className="rounded-3xl border border-border/40 bg-surface/50 p-16 text-center select-none shadow-sm animate-pulse">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-[10px] font-black uppercase tracking-wider text-muted/80">Đang đồng bộ tiến trình học…</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const gapPct = stats.recognized > 0 ? Math.round((stats.mastered / stats.recognized) * 100) : 0;
  const empty = stats.inReview === 0 && !stats.journalToday && stats.shadowDone === 0;

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* ========================================================
          1. FEATURED CORE LOOP PANEL (Image + Suggested Lesson)
          ======================================================== */}
      <div className="grid lg:grid-cols-12 gap-5">
        
        {/* Left column: Visual Learning Graphic */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#1e3a8a] via-[#3b82f6] to-pink text-white rounded-3xl p-6 flex flex-col justify-between aspect-[16/10] lg:aspect-auto shadow-lg border border-white/10 relative overflow-hidden group select-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
          
          <div className="relative z-1">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/70">
              SpeakUp English
            </span>
            <h3 className="font-display text-2xl font-black tracking-tight text-white mt-1 leading-none">
              Core Path
            </h3>
          </div>

          {/* Animated custom CSS voice wave inside the card */}
          <div className="h-10 flex items-end gap-1 px-1 my-4">
            <span className="wave-bar h-12" style={{ animationDelay: "0.1s" }} />
            <span className="wave-bar h-16" style={{ animationDelay: "0.3s" }} />
            <span className="wave-bar h-8"  style={{ animationDelay: "0.5s" }} />
            <span className="wave-bar h-14" style={{ animationDelay: "0.2s" }} />
            <span className="wave-bar h-10" style={{ animationDelay: "0.4s" }} />
          </div>

          <div className="relative z-1 flex justify-between items-center text-[10px] font-black tracking-wider text-white/90">
            <span>A1 → Giao tiếp</span>
            <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/10 uppercase text-[8px] animate-pulse">
              • Hoạt động
            </span>
          </div>
        </div>

        {/* Right column: Progress Details & Quick Suggested Lesson */}
        <div className="lg:col-span-8 liquid-glass-card p-6 flex flex-col justify-between bg-white/80 dark:bg-zinc-900/60 border border-border/40 shadow-sm rounded-3xl">
          <div className="space-y-4">
            <div className="flex justify-between items-center select-none">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                📊 Vốn từ chủ động của bạn
              </span>
              <span className="text-[10px] font-bold text-muted">
                Độ chuyển hóa: <span className="font-black text-foreground">{gapPct}%</span>
              </span>
            </div>
            
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-3xl font-black text-foreground leading-none">
                {stats.mastered}
              </span>
              <span className="text-[11px] font-bold text-muted">
                cụm đã thuộc nói được / {stats.recognized} từ đã tiếp cận
              </span>
            </div>

            {/* Custom linear progress bar */}
            <div className="w-full bg-black/5 dark:bg-white/10 h-2.5 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
              <div
                className="bg-primary h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(3, gapPct)}%` }}
              />
            </div>
          </div>

          {/* Integrated Suggested Lesson */}
          <div className="mt-5 border-t border-border/30 pt-4">
            <SuggestedLesson />
          </div>
        </div>

      </div>

      {/* ========================================================
          2. SLEEK STATS GRID ROW
          ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Thẻ đã ôn hôm nay", value: `${stats.inReview} thẻ`, icon: "🔁" },
          { label: "Streak hiện tại", value: `${streak} ngày`, icon: "🔥", highlight: true },
          { label: "Streak viết nhật ký", value: `${stats.journalStreak} ngày`, icon: "✍️" },
          { label: "Điểm phát âm shadow", value: stats.shadowAvg != null ? `${stats.shadowAvg}đ` : "—", icon: "🗣️" }
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-border/30 rounded-2xl p-4 flex items-center justify-between gap-3 select-none hover:border-primary/20 hover:scale-[1.01] transition-all duration-300"
          >
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-muted">
                {item.label}
              </p>
              <p className={`font-display text-lg font-black mt-1 leading-none ${item.highlight ? "text-orange-600 dark:text-orange-400" : "text-foreground"}`}>
                {item.value}
              </p>
            </div>
            <span className="text-xl shrink-0 filter drop-shadow-sm">{item.icon}</span>
          </div>
        ))}
      </div>

      {/* ========================================================
          3. 3 INTERACTIVE GLASSMORPHIC TASK BLOCKS
          ======================================================== */}
      <div className="grid sm:grid-cols-3 gap-4">
        
        {/* Task 1: SRS Ôn Tập */}
        <Link
          href="/review"
          className="group liquid-glass-interactive p-5 flex flex-col justify-between gap-5 rounded-3xl border border-border/40 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft/80 text-xl border border-primary/10">
              🔁
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted">Vòng ôn tập</p>
              <p className="font-display text-sm font-black text-foreground">Học & Ôn SRS</p>
            </div>
          </div>
          <div>
            <p className="font-display text-4xl font-black text-foreground leading-none">
              {stats.dueToday}
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted">thẻ đến hạn hôm nay</p>
          </div>
          <div className="flex items-center justify-between border-t border-border/30 pt-3 text-[10px] font-black uppercase tracking-wider mt-1">
            <span className="text-muted/80">Đã học {stats.inReview} thẻ</span>
            <span className={`rounded-full px-3.5 py-1.5 transition-all text-[9px] ${stats.dueToday === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-primary text-primary-fg shadow-md shadow-primary/20 group-hover:opacity-95"}`}>
              {stats.dueToday > 0 ? "Ôn ngay →" : "Hoàn thành ✓"}
            </span>
          </div>
        </Link>

        {/* Task 2: Nhật Ký AI */}
        <Link
          href="/journal"
          className="group liquid-glass-interactive p-5 flex flex-col justify-between gap-5 rounded-3xl border border-border/40 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-soft/80 text-xl border border-pink/10">
              📔
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted">Luyện phản xạ viết</p>
              <p className="font-display text-sm font-black text-foreground">Nhật ký cùng AI</p>
            </div>
          </div>
          <div>
            <p className="font-display text-4xl font-black text-pink leading-none">
              🔥 {stats.journalStreak}
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted">ngày streak viết nhật ký</p>
          </div>
          <div className="flex items-center justify-between border-t border-border/30 pt-3 text-[10px] font-black uppercase tracking-wider mt-1">
            <span className="text-muted/80">{stats.journalToday ? "Đã viết hôm nay ✓" : "Chưa viết hôm nay"}</span>
            <span className={`rounded-full px-3.5 py-1.5 transition-all text-[9px] ${stats.journalToday ? "bg-emerald-500/10 text-emerald-500" : "bg-pink text-pink-fg shadow-md shadow-pink/20 group-hover:opacity-95"}`}>
              {stats.journalToday ? "Đã viết ✓" : "Viết ngay →"}
            </span>
          </div>
        </Link>

        {/* Task 3: Shadowing */}
        <Link
          href="/shadowing"
          className="group liquid-glass-interactive p-5 flex flex-col justify-between gap-5 rounded-3xl border border-border/40 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft/80 text-xl border border-primary/10">
              🎙️
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted">Luyện nhại giọng</p>
              <p className="font-display text-sm font-black text-foreground">Luyện Shadowing</p>
            </div>
          </div>
          <div>
            <p className="font-display text-4xl font-black text-foreground leading-none">
              {stats.shadowDone}
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted">câu đã luyện nhại giọng</p>
          </div>
          <div className="flex items-center justify-between border-t border-border/30 pt-3 text-[10px] font-black uppercase tracking-wider mt-1">
            <span className="text-muted/80">Điểm phát âm: {stats.shadowAvg != null ? `${stats.shadowAvg}` : "Chưa có"}</span>
            <span className="rounded-full bg-primary text-primary-fg px-3.5 py-1.5 transition-all text-[9px] shadow-md shadow-primary/20 group-hover:opacity-95">
              Luyện ngay →
            </span>
          </div>
        </Link>

      </div>

      {/* ========================================================
          4. NHẮC HỌC HẰNG NGÀY & ĐIỀU CHỈNH THÔNG BÁO
          ======================================================== */}
      <div className="pt-2 border-t border-border/30">
        <StudyReminder studiedToday={stats.journalToday || (stats.inReview > 0 && stats.dueToday === 0)} />
      </div>

      {/* Welcome popup empty block */}
      {empty && (
        <div className="rounded-2xl border border-primary/15 bg-primary-soft/20 p-5 text-center select-none">
          <p className="text-xs font-semibold text-muted leading-relaxed">
            ✨ Bạn chưa có hoạt động nào hôm nay. Hãy lưu vài cụm từ hữu ích trong{" "}
            <Link href="/vocab" className="font-black text-primary underline">Thư viện từ vựng</Link>{" "}
            để kích hoạt thuật toán FSRS tự động lên lịch học nhé!
          </p>
        </div>
      )}

    </div>
  );
}
