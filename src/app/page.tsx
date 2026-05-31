"use client";

import { useState } from "react";
import Link from "next/link";
import CoreLoopDemo from "@/components/CoreLoopDemo";
import SprintGame from "@/components/SprintGame";
import RoadmapPath from "@/components/RoadmapPath";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"sprint" | "core">("sprint");

  return (
    <div className="overflow-hidden">
      {/* ===== HERO ===== */}
      <section className="mx-auto max-w-6xl px-5 animate-fadeIn relative">
        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-12 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 -right-12 w-64 h-64 rounded-full bg-pink-soft/10 blur-3xl pointer-events-none animate-pulse" />

        <div className="grid items-center gap-12 py-20 md:grid-cols-12 md:py-28 lg:py-32">
          {/* Hero Content */}
          <div className="md:col-span-7 flex flex-col gap-6 text-left">
            <span className="inline-flex self-start items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Nền tảng học nói tiếng Anh từ A1
            </span>
            <h1 className="font-display text-4xl leading-[1.05] text-foreground sm:text-6xl lg:text-[4rem] font-bold tracking-tight">
              Học nói tiếng Anh, <br />
              <span className="bg-gradient-to-r from-primary via-primary to-emerald-600 bg-clip-text text-transparent dark:from-primary dark:to-accent">theo cách dễ nhất.</span>
            </h1>
            <p className="max-w-xl text-base sm:text-lg font-medium leading-relaxed text-muted">
              Luyện phản xạ nói qua cụm từ, nhật ký, shadowing và hội thoại AI —
              tất cả đổ về một hệ thống ôn tập thông minh FSRS tối ưu.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link href="/today" className="liquid-glass-btn px-8 py-4 text-sm font-bold active:scale-[0.98] shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all">
                Bắt đầu học hôm nay →
              </Link>
              <Link
                href="/lesson/greetings"
                className="rounded-full border border-border/80 bg-surface/50 backdrop-blur-sm px-8 py-4 text-sm font-bold text-foreground transition-all hover:bg-surface hover:scale-[1.02] active:scale-[0.98]"
              >
                Học thử bài đầu
              </Link>
            </div>
            
            {/* Stats Block */}
            <div className="mt-4 flex items-center gap-10">
              <div>
                <p className="font-display text-4xl font-extrabold text-foreground tracking-tight">
                  180<span className="text-primary font-bold">+</span>
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">cụm thông dụng</p>
              </div>
              <span className="h-10 w-px bg-border/60" />
              <div>
                <p className="font-display text-4xl font-extrabold text-foreground tracking-tight">
                  22<span className="text-primary font-bold">+</span>
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">bài học chọn lọc</p>
              </div>
            </div>
          </div>

          {/* Hero Visual (Generated 3D asset with status pill) */}
          <div className="md:col-span-5 flex justify-center md:justify-end animate-fadeIn">
            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden liquid-glass-card border border-border/60 shadow-2xl p-2 flex items-center justify-center bg-white/40 dark:bg-black/20 backdrop-blur-sm group hover:border-primary/40 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-pink-soft/5 pointer-events-none" />
              <img
                src="/hero_wave_3d.png"
                alt="SpeakUp Voice Waves"
                className="w-full h-full object-cover rounded-2xl shadow-inner group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border border-border p-4 shadow-xl flex items-center gap-3 animate-pulse">
                <span className="flex h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Hội thoại AI đang trực tuyến</p>
                  <p className="text-[10px] font-medium text-muted">Luyện phản xạ giao tiếp A1 → C1</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE 1: MINI-GAME (Split layout) ===== */}
      <section className="bg-background border-t border-border/40 relative">
        <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-pink-soft/5 blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 grid items-center gap-12 md:grid-cols-12">
          {/* Text Side */}
          <div className="md:col-span-6 flex flex-col gap-5 text-left md:order-1">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-pink bg-pink-soft/30 px-3.5 py-1 rounded-full self-start">
              HỌC QUA TRÒ CHƠI
            </span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl tracking-tight">
              Học qua trò chơi vui nhộn
            </h2>
            <p className="max-w-md text-base sm:text-lg font-medium leading-relaxed text-muted">
              Biến việc luyện cụm từ thành phản xạ tự nhiên với mini-game Sprint và Hội thoại AI sinh động.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 mt-2">
              <Link href="#play" className="liquid-glass-card liquid-glass-interactive p-5 flex flex-col gap-3 group">
                <span className="text-3xl">⚡</span>
                <div>
                  <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Game Sprint →</p>
                  <p className="text-xs text-muted font-medium mt-0.5">Phản xạ nhanh từ vựng</p>
                </div>
              </Link>
              <Link href="/roleplay" className="liquid-glass-card liquid-glass-interactive p-5 flex flex-col gap-3 group">
                <span className="text-3xl">📞</span>
                <div>
                  <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Audio Call AI →</p>
                  <p className="text-xs text-muted font-medium mt-0.5">Hội thoại thực tế</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Visual Side (Mock game block) */}
          <div className="md:col-span-6 flex justify-center md:order-2">
            <div className="relative w-full aspect-[4/3] rounded-3xl liquid-glass-card overflow-hidden border border-border/60 shadow-xl bg-gradient-to-br from-pink-soft/10 to-primary-soft/10 p-6 flex flex-col justify-between">
              {/* Game Header */}
              <div className="flex justify-between items-center">
                <span className="rounded-full bg-pink/15 px-3 py-1 text-xs font-extrabold text-pink tracking-wider">SPRINT ROUND</span>
                <span className="text-sm font-mono font-bold text-foreground">Score: <span className="text-pink font-black">940</span></span>
              </div>
              {/* Main Card */}
              <div className="my-auto flex flex-col items-center gap-2.5">
                <p className="text-xs font-bold tracking-wider text-muted uppercase">Nghĩa của cụm từ có đúng không?</p>
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">break a leg</p>
                <span className="h-5 w-px bg-border/80" />
                <p className="font-display text-xl sm:text-2xl font-bold text-pink">gãy chân</p>
              </div>
              {/* Game Buttons */}
              <div className="flex gap-4">
                <button className="w-1/2 rounded-2xl bg-zinc-200 dark:bg-zinc-800 py-3.5 text-sm font-bold text-muted hover:text-foreground active:scale-95 transition-all">
                  SAI ✕
                </button>
                <button className="w-1/2 rounded-2xl bg-pink py-3.5 text-sm font-bold text-white shadow-lg shadow-pink/20 hover:bg-pink/90 active:scale-95 transition-all">
                  ĐÚNG ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE 2: TỪ VỰNG (Bento Grid layout) ===== */}
      <section className="bg-surface border-t border-border/40 relative">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 grid items-center gap-12 md:grid-cols-12">
          {/* Text Side */}
          <div className="md:col-span-5 flex flex-col gap-5 text-left md:order-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary bg-primary-soft/40 px-3.5 py-1 rounded-full self-start">
              TỪ VỰNG & SRS
            </span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl tracking-tight">
              Mở rộng vốn từ của bạn
            </h2>
            <p className="max-w-md text-base sm:text-lg font-medium leading-relaxed text-muted">
              Học theo cụm từ thông dụng, đẩy trực tiếp vào hệ thống ôn tập SRS thuật toán Spaced Repetition thông minh để lưu trữ và khắc sâu vĩnh viễn.
            </p>
            <Link href="/notes" className="liquid-glass-btn inline-flex px-7 py-3.5 text-sm font-bold active:scale-95 mt-2 self-start">
              Vào sổ tay từ vựng →
            </Link>
          </div>

          {/* Visual Side (Bento Layout) */}
          <div className="md:col-span-7 flex justify-center md:order-1">
            <div className="grid gap-5 sm:grid-cols-12 w-full">
              {/* Card 1 (SRS Card) */}
              <div className="sm:col-span-8 liquid-glass-card p-6 flex flex-col justify-between aspect-[4/3] relative overflow-hidden bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-border/60 shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold text-muted">HỌC CỤM TỪ</span>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Đã thuộc (Level 5)</span>
                </div>
                <div className="my-4">
                  <p className="font-display text-xl font-bold text-foreground">once in a blue moon</p>
                  <p className="text-xs font-mono font-medium text-muted mt-1">/wʌns ɪn ə bluː muːn/</p>
                  <p className="text-sm font-semibold text-foreground mt-3">Hiếm khi, năm thì mười họa mới xảy ra.</p>
                </div>
                <div className="border-t border-border/50 pt-3 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted">Ôn lại: <span className="text-primary font-extrabold">sau 12 ngày</span></span>
                  <span className="h-1.5 w-16 rounded-full bg-primary/20 overflow-hidden"><span className="block h-full w-[85%] bg-primary" /></span>
                </div>
              </div>
              
              {/* Card 2 (SRS Stats) */}
              <div className="sm:col-span-4 bg-primary text-primary-fg p-6 rounded-3xl flex flex-col justify-between aspect-[1/1] sm:aspect-auto shadow-lg relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">SRS Algorithm</div>
                <div className="my-auto py-4">
                  <p className="text-4xl font-display font-black leading-none">88%</p>
                  <p className="text-[11px] font-medium opacity-90 mt-1.5">Hiệu suất ghi nhớ dài hạn</p>
                </div>
                <div className="text-[10px] font-bold tracking-wider uppercase bg-white/15 px-2.5 py-1.5 rounded-xl text-center">
                  124 cụm từ lưu trữ
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE 3: TIẾN ĐỘ (Analytical layout) ===== */}
      <section className="bg-background border-t border-border/40 relative">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 grid items-center gap-12 md:grid-cols-12">
          {/* Text Side */}
          <div className="md:col-span-6 flex flex-col gap-5 text-left md:order-1">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary bg-primary-soft/30 px-3.5 py-1 rounded-full self-start">
              TIẾN ĐỘ THÀNH TÍCH
            </span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl tracking-tight">
              Theo dõi tiến bộ mỗi ngày
            </h2>
            <p className="max-w-md text-base sm:text-lg font-medium leading-relaxed text-muted">
              Lưu trữ thống kê thành tích, số cụm đã phản xạ tự nhiên và thu hẹp khoảng cách từ Hiểu (Thụ động) → Nói tự tin (Chủ động).
            </p>
            <Link href="/today" className="rounded-full bg-primary-soft px-6 py-3.5 text-sm font-bold text-primary transition-transform hover:scale-105 active:scale-95 self-start mt-2">
              Xem hôm nay →
            </Link>
          </div>

          {/* Visual Side (Mock Chart Dashboard) */}
          <div className="md:col-span-6 flex justify-center md:order-2">
            <div className="relative w-full aspect-[4/3] rounded-3xl liquid-glass-card p-6 flex flex-col justify-between bg-white/40 dark:bg-black/20 backdrop-blur-sm shadow-xl border border-border/60">
              <div className="flex justify-between items-center border-b border-border/50 pb-4">
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">Phản xạ tuần này</h4>
                  <p className="text-xs font-medium text-muted">Hoàn thành mục tiêu học tập</p>
                </div>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">Streak: 5 ngày 🔥</span>
              </div>
              <div className="grid grid-cols-4 gap-3 my-4 items-end h-28">
                {[
                  { day: "T2", val: "70%", active: true },
                  { day: "T3", val: "85%", active: true },
                  { day: "T4", val: "60%", active: true },
                  { day: "T5", val: "95%", active: true }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-primary/10 rounded-t-xl relative overflow-hidden flex items-end" style={{ height: item.val }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-primary to-accent opacity-80" />
                    </div>
                    <p className="text-xs font-bold text-muted">{item.day}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 pt-4 flex justify-between items-center text-xs font-bold">
                <p className="text-muted">Tổng thời gian luyện nói</p>
                <p className="text-primary font-black">4.8 giờ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SHOWCASE (game tương tác) ===== */}
      <section id="play" className="bg-surface border-t border-border/40 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse" />
        <div className="mx-auto max-w-5xl px-5 py-24 relative">
          <h2 className="mb-3 text-center font-display text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight">
            Thử ngay vòng luyện nói
          </h2>
          <p className="mb-8 text-center text-sm sm:text-base font-semibold text-muted max-w-md mx-auto">
            Chọn một chế độ tương tác trực tiếp phía dưới và bắt đầu kiểm tra khả năng phản xạ.
          </p>
          <div className="mb-10 flex justify-center">
            <div className="flex gap-1.5 rounded-2xl border border-border/60 bg-background/50 backdrop-blur-sm p-1.5 shadow-md">
              <button
                onClick={() => setActiveTab("sprint")}
                className={`rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === "sprint"
                    ? "bg-primary text-primary-fg shadow-md"
                    : "text-muted hover:text-foreground"
                }`}
              >
                ⚡ Game Từ Vựng Sprint
              </button>
              <button
                onClick={() => setActiveTab("core")}
                className={`rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === "core"
                    ? "bg-primary text-primary-fg shadow-md"
                    : "text-muted hover:text-foreground"
                }`}
              >
                🔁 Vòng Luyện Nói Cốt Lõi
              </button>
            </div>
          </div>
          
          <div className="animate-fadeIn p-2 md:p-4 rounded-3xl border border-border/50 bg-background/30 backdrop-blur-sm shadow-xl">
            {activeTab === "sprint" ? <SprintGame /> : <CoreLoopDemo />}
          </div>
        </div>
      </section>

      {/* ===== ROADMAP ===== */}
      <section className="bg-background border-t border-border/40 relative">
        <div className="absolute bottom-0 right-1/4 w-84 h-84 rounded-full bg-pink-soft/5 blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-5xl px-5 py-24 relative">
          <h2 className="mb-2 text-center font-display text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight">
            Lộ trình 4 giai đoạn
          </h2>
          <p className="mb-12 text-center text-sm sm:text-base font-semibold text-muted max-w-md mx-auto">
            Mở khóa từng bước từ phát âm cơ bản đến phản xạ giao tiếp trôi chảy tự tin.
          </p>
          <RoadmapPath />
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/50 bg-surface/30 backdrop-blur-md py-12 text-center text-sm font-bold text-muted/80">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>SpeakUp · Lộ trình A1 → giao tiếp thành thạo · Học nói mỗi ngày</p>
          <div className="flex gap-6">
            <span className="text-primary hover:underline cursor-pointer">Điều khoản</span>
            <span className="text-primary hover:underline cursor-pointer">Bảo mật</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
