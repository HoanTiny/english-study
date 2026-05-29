"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { loadDashboard, type DashboardStats } from "@/lib/statsRepo";
import StudyReminder from "@/components/StudyReminder";

export default function TodayPage() {
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

  // Khoảng cách Hiểu → Nói được (%)
  const gapPct =
    stats && stats.recognized > 0
      ? Math.round((stats.mastered / stats.recognized) * 100)
      : 0;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 pt-16 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-iridescent">
          Hôm nay
        </h1>
        <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
          Tổng quan tiến độ học và khoảng cách giữa điều bạn <b>hiểu</b> và điều bạn{" "}
          <b>nói được</b> — mục tiêu mỗi ngày là thu hẹp nó.
        </p>
      </div>

      {!loaded ? (
        <div className="liquid-glass-card py-16 text-center border border-dashed border-border/60">
          <p className="text-sm font-bold text-muted">Đang tải tổng quan… ⏳</p>
        </div>
      ) : !stats ? null : (
        <>
          {/* Hiểu vs Nói được */}
          <div className="liquid-glass-card p-6 md:p-8 border border-border relative overflow-hidden mb-6">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent/10 rounded-full filter blur-xl pointer-events-none" />
            <p className="text-xs font-black uppercase tracking-wider text-primary">
              Hiểu → Nói được
            </p>
            <div className="mt-4 flex items-end gap-6">
              <div>
                <p className="text-4xl font-black text-foreground leading-none">
                  {stats.mastered}
                  <span className="text-lg font-bold text-muted">
                    /{stats.recognized}
                  </span>
                </p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  thẻ đã nói được / đã hiểu
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-black text-accent leading-none">
                  {gapPct}%
                </p>
                <p className="mt-1 text-xs font-semibold text-muted">đã chuyển hoá</p>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/5 border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700 rounded-full"
                style={{ width: `${gapPct}%` }}
              />
            </div>
          </div>

          {/* Lưới 3 nhiệm vụ */}
          <div className="grid gap-5 sm:grid-cols-3">
            {/* Ôn tập */}
            <Link
              href="/review"
              className="liquid-glass-card p-5 border border-border transition-all duration-300 hover:shadow-md group"
            >
              <div className="text-2xl">🔁</div>
              <p className="mt-3 text-3xl font-black text-foreground leading-none">
                {stats.dueToday}
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">thẻ đến hạn</p>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {stats.inReview} thẻ đang ôn ·{" "}
                {stats.dueToday > 0 ? "ôn ngay →" : "đã xong hôm nay ✓"}
              </p>
            </Link>

            {/* Nhật ký */}
            <Link
              href="/journal"
              className="liquid-glass-card p-5 border border-border transition-all duration-300 hover:shadow-md group"
            >
              <div className="text-2xl">📔</div>
              <p className="mt-3 text-3xl font-black text-foreground leading-none">
                🔥 {stats.journalStreak}
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">ngày liên tiếp</p>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {stats.journalToday ? "hôm nay đã viết ✓" : "chưa viết hôm nay →"}
              </p>
            </Link>

            {/* Shadowing */}
            <Link
              href="/shadowing"
              className="liquid-glass-card p-5 border border-border transition-all duration-300 hover:shadow-md group"
            >
              <div className="text-2xl">🎧</div>
              <p className="mt-3 text-3xl font-black text-foreground leading-none">
                {stats.shadowAvg != null ? stats.shadowAvg : "—"}
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">điểm phát âm TB</p>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                đã luyện {stats.shadowDone} câu →
              </p>
            </Link>
          </div>

          <StudyReminder
            studiedToday={
              stats.journalToday || (stats.inReview > 0 && stats.dueToday === 0)
            }
          />

          {stats.inReview === 0 && !stats.journalToday && stats.shadowDone === 0 && (
            <div className="mt-6 liquid-glass-card py-10 text-center border border-dashed border-border/60">
              <p className="text-sm font-bold text-muted">
                Bắt đầu hành trình hôm nay: lưu vài cụm trong{" "}
                <Link href="/notes" className="text-primary underline">
                  Sổ tay
                </Link>{" "}
                rồi đẩy vào ôn tập nhé!
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
