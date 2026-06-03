"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { loadDashboard, loadActivityTimeline, type DashboardStats, type ActivityDay } from "@/lib/statsRepo";
import { lessonContent } from "@/lib/lessons";
import ProgressRing from "@/components/ProgressRing";

// Tổng số cụm trong toàn bộ lộ trình — mốc để tính "Vốn từ".
const TOTAL_PHRASES = Object.values(lessonContent).reduce((n, l) => n + l.phrases.length, 0);

// Màu pastel cho 3 vòng (mint / peach / lavender như mẫu).
const MINT = "#34D399";
const PEACH = "#FB923C";
const LAVENDER = "#A78BFA";

export default function DashboardPage() {
  const today = todayKey();
  const { userId, ready } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [week, setWeek] = useState<ActivityDay[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    Promise.all([loadDashboard(today), loadActivityTimeline(today, 7)])
      .then(([s, w]) => {
        if (!active) return;
        setStats(s);
        setWeek(w);
        setLoaded(true);
      })
      .catch((e) => console.error("dashboard", e));
    return () => {
      active = false;
    };
  }, [ready, userId, today]);

  // 3 chỉ số THẬT (0..100).
  const noiDuoc = stats && stats.recognized > 0 ? Math.round((stats.mastered / stats.recognized) * 100) : 0;
  const phatAm = stats?.shadowAvg ?? 0;
  const vonTu = stats ? Math.min(100, Math.round((stats.recognized / Math.max(1, TOTAL_PHRASES)) * 100)) : 0;

  const rings = [
    {
      label: "Nói được",
      subLabel: "Presentation Confidence",
      value: noiDuoc,
      color: MINT,
      note: stats ? `${stats.mastered}/${stats.recognized} cụm` : "",
    },
    {
      label: "Phát âm",
      subLabel: "Clarity & Pace",
      value: phatAm,
      color: PEACH,
      note: stats?.shadowAvg != null ? `TB ${stats.shadowAvg}đ` : "chưa có",
    },
    {
      label: "Vốn từ",
      subLabel: "Vocabulary Richness",
      value: vonTu,
      color: LAVENDER,
      note: stats ? `${stats.recognized}/${TOTAL_PHRASES} cụm` : "",
    },
  ];

  const avgScore = Math.round((noiDuoc + phatAm + vonTu) / 3);
  const maxWeek = useMemo(() => Math.max(1, ...week.map((d) => d.reviews)), [week]);

  // Gợi ý động dựa trên chỉ số thấp nhất.
  const insight = (() => {
    const min = Math.min(noiDuoc, phatAm, vonTu);
    if (min === phatAm) return "Luyện Shadowing để cải thiện phát âm.";
    if (min === noiDuoc) return "Ôn tập để chuyển 'hiểu' thành 'nói được'.";
    return "Học thêm cụm mới ở Từ vựng.";
  })();

  // Việc cần làm hôm nay.
  const tasks = stats
    ? [
        { href: "/review", title: "Ôn tập SRS", note: stats.dueToday > 0 ? `${stats.dueToday} thẻ đến hạn` : stats.inReview > 0 ? "Đã ôn hết hôm nay" : "Chưa có thẻ", done: stats.inReview > 0 && stats.dueToday === 0 },
        { href: "/journal", title: "Viết nhật ký", note: stats.journalToday ? "Đã viết hôm nay" : "Chưa viết hôm nay", done: stats.journalToday },
        { href: "/shadowing", title: "Luyện Shadowing", note: stats.shadowDone > 0 ? `${stats.shadowDone} câu đã luyện` : "Chưa luyện câu nào", done: stats.shadowDone > 0 },
      ]
    : [];

  const startHref = stats ? (stats.dueToday > 0 ? "/review" : !stats.journalToday ? "/journal" : "/today") : "/today";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden px-4 py-10 transition-colors duration-500 sm:px-6 sm:py-14 lg:px-8 flex flex-col justify-center">

      {/* Soft background floor shadow */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 h-10 w-[75%] -translate-x-1/2 rounded-full bg-slate-900/[0.02] blur-[40px] dark:bg-black/30" />

      <div className="mx-auto w-full max-w-6xl relative z-10">
        <div className="mb-8 flex items-end justify-between gap-3 px-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-zinc-400">Bảng điều khiển</p>
            <h1 className="font-display text-2xl font-black tracking-tight text-slate-800 dark:text-zinc-100">Mục tiêu học tập</h1>
          </div>
          <Link href="/today" className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
            Xem bản đầy đủ →
          </Link>
        </div>

        {!ready || !loaded ? (
          <div className="relative flex items-center justify-center py-28">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
          </div>
        ) : !userId ? (
          <div className="glass-card relative flex flex-col items-center gap-4 py-24 text-center rounded-[32px]">
            <span className="text-5xl">🎯</span>
            <p className="max-w-sm text-sm font-semibold text-slate-600 dark:text-zinc-300">Đăng nhập để xem mục tiêu học tập và tiến độ thật của bạn.</p>
            <Link href="/login" className="rounded-full bg-gradient-to-r from-emerald-300 to-orange-200 px-7 py-3 text-xs font-black uppercase tracking-wider text-emerald-950 shadow-lg active:scale-95 transition-all">
              Bắt đầu →
            </Link>
          </div>
        ) : (
          <div className="relative z-10 grid gap-6 md:grid-cols-12 md:items-stretch">
            
            {/* ── Trái: Phân tích nhanh (Quick Analytics) ── */}
            <div className="glass-card relative overflow-hidden rounded-[32px] p-6 md:col-span-3 flex flex-col justify-between min-h-[290px]">
              <div>
                <h3 className="font-display text-sm font-black text-slate-800 dark:text-zinc-100 text-center">Phân tích nhanh</h3>
                <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-center mt-0.5">Quick Analytics</p>
                
                {/* Custom CSS Bar Chart matching mockup */}
                <div className="mt-6 flex h-24 items-end justify-between gap-1.5 px-1 relative">
                  {/* Subtle Grid Lines in the background */}
                  <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none px-1">
                    <div className="border-t border-slate-200/40 dark:border-white/5 w-full" />
                    <div className="border-t border-slate-200/40 dark:border-white/5 w-full" />
                    <div className="border-t border-slate-200/40 dark:border-white/5 w-full" />
                    <div className="border-t border-slate-200/40 dark:border-white/5 w-full" />
                  </div>

                  {week.some((d) => d.reviews > 0) ? (
                    week.map((d, i) => {
                      const val = d.reviews;
                      const percent = maxWeek > 0 ? (val / maxWeek) * 100 : 0;
                      const colors = [
                        "bg-emerald-300/80 dark:bg-emerald-400/70 shadow-[0_2px_6px_rgba(52,211,153,0.2)]",
                        "bg-amber-300/80 dark:bg-amber-400/70 shadow-[0_2px_6px_rgba(251,146,60,0.2)]",
                        "bg-indigo-300/80 dark:bg-indigo-400/70 shadow-[0_2px_6px_rgba(167,139,250,0.2)]"
                      ];
                      const barColor = colors[i % colors.length];

                      return (
                        <div key={i} className="group relative flex h-full flex-1 flex-col justify-end items-center z-10">
                          <span className="absolute -top-7 scale-0 rounded bg-slate-900/90 dark:bg-zinc-800/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-md transition-all group-hover:scale-100 whitespace-nowrap z-20">
                            {val} ôn tập
                          </span>
                          <div
                            className={`w-2.5 rounded-full ${barColor} transition-all duration-500 hover:scale-y-105 origin-bottom`}
                            style={{ height: `${Math.max(15, percent)}%` }}
                          />
                          <span className="mt-2 text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                            {d.label.split("/")[0]}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback visual mock bars
                    Array.from({ length: 7 }).map((_, i) => {
                      const heights = [30, 45, 25, 60, 35, 75, 40];
                      const colors = [
                        "bg-emerald-300/80 dark:bg-emerald-400/70 shadow-[0_2px_6px_rgba(52,211,153,0.2)]",
                        "bg-amber-300/80 dark:bg-amber-400/70 shadow-[0_2px_6px_rgba(251,146,60,0.2)]",
                        "bg-indigo-300/80 dark:bg-indigo-400/70 shadow-[0_2px_6px_rgba(167,139,250,0.2)]"
                      ];
                      const barColor = colors[i % colors.length];

                      return (
                        <div key={i} className="relative flex h-full flex-1 flex-col justify-end items-center z-10">
                          <div
                            className={`w-2.5 rounded-full ${barColor}`}
                            style={{ height: `${heights[i]}%` }}
                          />
                          <span className="mt-2 text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                            -{7-i}d
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-white/30 dark:border-white/5 pt-3 relative z-10">
                <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">
                  Điểm TB: <span className="text-emerald-500 dark:text-emerald-400 font-extrabold">{avgScore}%</span>
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500 dark:text-zinc-400">
                  💡 {insight}
                </p>
              </div>
            </div>

            {/* ── Giữa: 3 vòng chỉ số (SpeakUp Dashboard) ── */}
            <div className="glass-card relative overflow-hidden rounded-[32px] p-6 sm:p-9 md:col-span-6 flex flex-col justify-between">
              <div>
                <h2 className="text-center font-display text-lg font-black tracking-tight text-slate-800 dark:text-zinc-100">SpeakUp Dashboard</h2>
                <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-center mt-0.5">Tiến độ kỹ năng</p>
              </div>
              
              <div className="mt-8 grid grid-cols-3 gap-4 relative z-10">
                {rings.map((r) => (
                  <div key={r.label} className="flex flex-col items-center gap-3">
                    <ProgressRing value={r.value} size={96} stroke={9} color={r.color} track={`${r.color}2b`} glow>
                      <span className="font-display text-xl font-extrabold text-slate-800 dark:text-zinc-100 leading-none">{r.value}%</span>
                    </ProgressRing>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 leading-tight min-h-[28px] flex items-center justify-center">{r.subLabel}</p>
                      <p className="mt-1.5 text-[9px] font-extrabold text-emerald-500 dark:text-emerald-400">{r.note}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block" />
            </div>

            {/* ── Phải: Việc cần làm (Recent Sessions / Tasks) ── */}
            <div className="glass-card relative overflow-hidden rounded-[32px] p-6 md:col-span-3 flex flex-col justify-between min-h-[290px]">
              <div>
                <h3 className="font-display text-sm font-black text-slate-800 dark:text-zinc-100 text-center">Việc cần làm</h3>
                <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-center mt-0.5">Recent Tasks</p>
                
                <ul className="mt-6 space-y-3.5">
                  {tasks.map((t) => (
                    <li key={t.href} className="group border-b border-white/30 dark:border-white/5 pb-2.5 last:border-b-0 last:pb-0">
                      <Link href={t.href} className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black transition-all ${t.done ? "bg-emerald-400 text-emerald-950 shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "border border-slate-300 dark:border-zinc-700 text-transparent group-hover:border-emerald-400/60"}`}>✓</span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-slate-800 dark:text-zinc-200 leading-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">{t.title}</p>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">{t.note}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 transition-transform group-hover:translate-x-0.5">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <Link href={startHref} className="relative z-10 mt-6 w-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#fbcfe8] py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-slate-800 shadow-[0_8px_20px_-6px_rgba(52,211,153,0.45)] transition-all hover:shadow-[0_12px_24px_-4px_rgba(52,211,153,0.55)] hover:scale-[1.02] active:scale-[0.98] duration-300">
                Bắt đầu học →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
