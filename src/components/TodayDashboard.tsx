"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { loadDashboard, type DashboardStats } from "@/lib/statsRepo";
import StudyReminder from "@/components/StudyReminder";

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

  // SVG Circular Ring parameters
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (gapPct / 100) * circumference;

  if (!loaded) {
    return (
      <div className="rounded-3xl border border-border/20 bg-surface/50 dark:bg-black/20 p-12 text-center backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            Đang đồng bộ tiến trình…
          </p>
        </div>
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Hiểu vs Nói được (Circular SVG Premium Panel) */}
      <div className="rounded-3xl border border-border/30 dark:border-white/5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-accent/5 to-transparent opacity-60 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[8.5px] font-black uppercase tracking-wider text-primary">
                📊 Chỉ số chuyển đổi
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider text-muted font-display">Hiểu → Nói được</span>
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-sm font-black text-foreground uppercase tracking-wide">Vốn từ thực tế của bạn</h2>
              <p className="text-xs font-semibold text-muted leading-relaxed max-w-xl">
                Tổng số từ vựng bạn đã chuyển hóa thành công từ dạng <b>thụ động (chỉ hiểu khi nghe/đọc)</b> sang dạng <b>chủ động (nói ra tự nhiên được)</b> thông qua các bài luyện nói FSRS hằng ngày.
              </p>
            </div>

            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Từ đã thạo:</span>
              <p className="font-display text-3xl font-black text-foreground tracking-tight leading-none">
                {stats.mastered}
                <span className="text-sm font-semibold text-muted font-sans ml-1.5">/ {stats.recognized} từ tiếp cận</span>
              </p>
            </div>
          </div>

          {/* Epic Circular SVG Progress Gauge */}
          <div className="relative shrink-0 flex items-center justify-center w-28 h-28 group-hover:scale-102 transition-transform duration-500">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-black/5 dark:stroke-white/5"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Highlight dynamic ring */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-primary"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-display font-black text-foreground tracking-tight">{gapPct}%</span>
              <span className="text-[7.5px] font-black uppercase tracking-widest text-muted mt-0.5">Tốc độ</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Lưới 3 nhiệm vụ (Sleek Compact Bento Grid) */}
      <div className="grid gap-5 sm:grid-cols-3">
        {/* Ôn tập */}
        <Link
          href="/review"
          className="rounded-3xl border border-border/30 dark:border-white/5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-5 flex flex-col justify-between min-h-[170px] shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:-translate-y-1 hover:border-primary/30 dark:hover:border-primary/20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft/80 border border-primary/20 text-md shadow-inner transition-transform duration-500 group-hover:scale-105">
              🔁
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-wider text-primary">ÔN TẬP FSRS</p>
              <p className="text-[7.5px] font-semibold text-muted uppercase tracking-widest">Lặp lại ngắt quãng</p>
            </div>
          </div>
          
          <div className="my-3 text-left">
            <p className="text-3xl font-display font-black text-foreground leading-none tracking-tight">
              {stats.dueToday}
            </p>
            <p className="mt-1 text-[9px] font-bold text-muted uppercase tracking-wider">Thẻ đến hạn hôm nay</p>
          </div>
          
          <div className="border-t border-border/10 pt-3 flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{stats.inReview} thẻ ôn xong</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 ${
              stats.dueToday > 0 
                ? "bg-primary text-primary-fg shadow-sm shadow-primary/20 group-hover:px-4" 
                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25"
            }`}>
              {stats.dueToday > 0 ? "Ôn ngay →" : "Xong ✓"}
            </span>
          </div>
        </Link>

        {/* Nhật ký */}
        <Link
          href="/journal"
          className="rounded-3xl border border-border/30 dark:border-white/5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-5 flex flex-col justify-between min-h-[170px] shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:-translate-y-1 hover:border-pink/30 dark:hover:border-pink/20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-soft/80 border border-pink/20 text-md shadow-inner transition-transform duration-500 group-hover:scale-105">
              📔
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-wider text-pink">NHẬT KÝ PHẢN XẠ</p>
              <p className="text-[7.5px] font-semibold text-muted uppercase tracking-widest">Viết tự do kích hoạt</p>
            </div>
          </div>
          
          <div className="my-3 text-left">
            <p className="text-3xl font-display font-black text-foreground leading-none tracking-tight flex items-center gap-1">
              <span className="text-xl animate-pulse">🔥</span> {stats.journalStreak}
            </p>
            <p className="mt-1 text-[9px] font-bold text-muted uppercase tracking-wider">Ngày streak liên tiếp</p>
          </div>
          
          <div className="border-t border-border/10 pt-3 flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Nhật ký hôm nay</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 ${
              !stats.journalToday 
                ? "bg-pink text-pink-fg shadow-sm shadow-pink/20 group-hover:px-4" 
                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25"
            }`}>
              {stats.journalToday ? "Đã viết ✓" : "Viết ngay →"}
            </span>
          </div>
        </Link>

        {/* Shadowing */}
        <Link
          href="/shadowing"
          className="rounded-3xl border border-border/30 dark:border-white/5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-5 flex flex-col justify-between min-h-[170px] shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:-translate-y-1 hover:border-primary/30 dark:hover:border-primary/20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft/80 border border-primary/20 text-md shadow-inner transition-transform duration-500 group-hover:scale-105">
              🎧
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-wider text-primary">SHADOWING</p>
              <p className="text-[7.5px] font-semibold text-muted uppercase tracking-widest">Phát âm phản xạ</p>
            </div>
          </div>
          
          <div className="my-3 text-left">
            <p className="text-3xl font-display font-black text-foreground leading-none tracking-tight">
              {stats.shadowAvg != null ? `${stats.shadowAvg}` : "—"}
            </p>
            <p className="mt-1 text-[9px] font-bold text-muted uppercase tracking-wider">Điểm phát âm TB</p>
          </div>
          
          <div className="border-t border-border/10 pt-3 flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{stats.shadowDone} câu hoàn thành</span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-primary-fg shadow-sm shadow-primary/20 group-hover:px-4 text-[8.5px] font-black uppercase tracking-wider transition-all duration-300">
              Shadow →
            </span>
          </div>
        </Link>
      </div>

      {/* 3. Nhắc học hằng ngày */}
      <StudyReminder studiedToday={stats.journalToday || (stats.inReview > 0 && stats.dueToday === 0)} />

      {/* 4. Tip & Quickstart Pointer (Redesigned as Elegant Card) */}
      {stats.inReview === 0 && !stats.journalToday && stats.shadowDone === 0 && (
        <div className="rounded-3xl border border-primary/10 bg-gradient-to-tr from-primary/5 via-accent/5 to-transparent p-6 md:p-8 text-center backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-xl pointer-events-none" />
          <div className="relative flex flex-col items-center justify-center gap-3.5 max-w-lg mx-auto">
            <span className="text-2xl animate-bounce">✨</span>
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Khởi động lộ trình học hôm nay</h3>
            <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed">
              Bạn chưa có hoạt động nào trong hôm nay. Hãy bắt đầu bằng cách chọn lưu một vài cụm từ thông dụng trong{" "}
              <Link href="/vocab" className="text-primary font-black underline hover:text-primary-dark transition-all">
                Thư viện từ vựng
              </Link>
              , hệ thống thuật toán FSRS sẽ tự động lên lịch nhắc nhở và tối ưu hóa chu kỳ ôn tập dành riêng cho bạn!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
