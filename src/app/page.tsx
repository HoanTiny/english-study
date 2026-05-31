"use client";

import { useState } from "react";
import Link from "next/link";
import CoreLoopDemo from "@/components/CoreLoopDemo";
import RoadmapPath from "@/components/RoadmapPath";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"sprint" | "core">("sprint");

  return (
    <div className="overflow-hidden">
      {/* ===== HERO SECTION (Left-Aligned Asymmetric Layout) ===== */}
      <section className="mx-auto max-w-6xl px-5 animate-fadeIn relative pt-6 pb-20 md:pb-28">
        <div className="grid items-center gap-12 md:grid-cols-12">
          {/* Hero Content */}
          <div className="md:col-span-7 flex flex-col gap-6 text-left">
            <span className="shimmer-edge inline-flex self-start items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
              🚀 Nền tảng học nói tiếng Anh từ A1
            </span>
            <h1 className="font-display text-4xl leading-[1.05] text-foreground sm:text-5xl lg:text-[3.8rem] font-extrabold tracking-tight">
              Học nói tiếng Anh, <br />
              <span className="bg-gradient-to-r from-primary via-accent to-pink bg-clip-text text-transparent">
                theo cách dễ nhất.
              </span>
            </h1>
            <p className="max-w-xl text-sm sm:text-base font-semibold leading-relaxed text-muted">
              Luyện phản xạ nói tự nhiên qua cụm từ thông dụng, viết nhật ký, shadowing và hội thoại AI — 
              tất cả đồng bộ tự động về một hệ thống ôn tập FSRS tối ưu.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <Link href="/today" className="liquid-glass-btn px-8 py-4 text-xs font-black tracking-wider uppercase active:scale-[0.98] shadow-lg">
                Học hôm nay →
              </Link>
              <Link
                href="/lesson/greetings"
                className="rounded-full border border-border bg-surface backdrop-blur-md px-8 py-4 text-xs font-black tracking-wider uppercase text-foreground transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                Học thử bài đầu
              </Link>
            </div>
            
            {/* Stats Block */}
            <div className="mt-6 flex items-center gap-12 border-t border-border/40 pt-8">
              <div>
                <p className="font-display text-4xl font-black text-foreground tracking-tight">
                  180<span className="text-primary font-bold">+</span>
                </p>
                <p className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-muted">cụm thông dụng</p>
              </div>
              <span className="h-10 w-px bg-border/60" />
              <div>
                <p className="font-display text-4xl font-black text-foreground tracking-tight">
                  22<span className="text-primary font-bold">+</span>
                </p>
                <p className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-muted">bài học chọn lọc</p>
              </div>
            </div>
          </div>

          {/* Hero Visual (Refined Glass Card Overlay) */}
          <div className="md:col-span-5 flex justify-center md:justify-end animate-fadeIn">
            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden liquid-glass-card border border-border/80 shadow-2xl p-2.5 flex items-center justify-center bg-white/10 dark:bg-black/10 group transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-pink-soft/10 pointer-events-none" />
              <img
                src="/hero_wave_3d.png"
                alt="SpeakUp Voice Waves"
                className="w-full h-full object-cover rounded-2xl shadow-inner group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-surface/90 dark:bg-zinc-950/80 backdrop-blur-md border border-border/80 p-4 shadow-xl flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-foreground">Hội thoại AI đang trực tuyến</p>
                  <p className="text-[10px] font-bold text-muted mt-0.5">Luyện phản xạ giao tiếp A1 → C1</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE 1: MINI-GAME (Spacious Asymmetric Split Layout) ===== */}
      <section className="bg-background border-t border-border/30 relative">
        <div className="mx-auto max-w-6xl px-5 py-24 md:py-32 grid items-center gap-12 md:grid-cols-12">
          {/* Text Side */}
          <div className="md:col-span-6 flex flex-col gap-6 text-left md:order-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink bg-pink-soft/80 border border-pink/10 px-4 py-1.5 rounded-full self-start">
              🎯 HỌC QUA TRÒ CHƠI
            </span>
            <h2 className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl tracking-tight">
              Biến từ vựng thành phản xạ tự nhiên
            </h2>
            <p className="max-w-md text-sm sm:text-base font-semibold leading-relaxed text-muted">
              Quên đi cách học chép giấy truyền thống. Rèn phản xạ nhanh tức thì với trò chơi từ vựng tốc độ cao và hội thoại nhập vai.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <Link href="#play" className="liquid-glass-interactive p-6 flex flex-col gap-4 group">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors">Game Sprint →</p>
                  <p className="text-[11px] text-muted font-bold mt-1">Luyện tốc độ phản xạ nghĩa từ</p>
                </div>
              </Link>
              <Link href="/roleplay" className="liquid-glass-interactive p-6 flex flex-col gap-4 group">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-black text-sm text-foreground group-hover:text-primary transition-colors">Audio Call AI →</p>
                  <p className="text-[11px] text-muted font-bold mt-1">Đàm thoại thực tế theo chủ đề</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Visual Side (Premium Interactive Mock Game Card) */}
          <div className="md:col-span-6 flex justify-center md:order-2">
            <div className="relative w-full aspect-[4/3] rounded-3xl liquid-glass-card overflow-hidden border border-border/80 shadow-2xl bg-gradient-to-br from-pink-soft/10 to-primary-soft/10 p-6 flex flex-col justify-between">
              {/* Game Header */}
              <div className="flex justify-between items-center">
                <span className="rounded-full bg-pink-soft/80 border border-pink/20 px-3.5 py-1.5 text-[9px] font-black text-pink tracking-wider">SPRINT ROUND</span>
                <span className="text-xs font-mono font-black text-foreground">Score: <span className="text-pink font-extrabold">940</span></span>
              </div>
              {/* Main Card */}
              <div className="my-auto flex flex-col items-center gap-3">
                <p className="text-[10px] font-black tracking-wider text-muted uppercase">Nghĩa của cụm từ có đúng không?</p>
                <p className="font-display text-3xl font-black text-foreground tracking-tight">break a leg</p>
                <span className="h-6 w-px bg-border/80" />
                <p className="font-display text-2xl font-bold text-pink">Chúc may mắn!</p>
              </div>
              {/* Game Buttons */}
              <div className="flex gap-4">
                <button className="w-1/2 rounded-2xl bg-surface hover:bg-black/5 dark:hover:bg-white/5 py-4 text-xs font-black text-muted hover:text-foreground active:scale-95 transition-all border border-border/80 shadow-sm cursor-pointer">
                  SAI ✕
                </button>
                <button className="w-1/2 rounded-2xl bg-pink py-4 text-xs font-black text-white shadow-lg shadow-pink/20 hover:bg-pink/90 active:scale-95 transition-all cursor-pointer">
                  ĐÚNG ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE 2: TỪ VỰNG (Advanced Bento Grid & Diversity Backgrounds) ===== */}
      <section className="bg-surface border-t border-border/30 relative">
        <div className="mx-auto max-w-6xl px-5 py-24 md:py-32 grid items-center gap-12 md:grid-cols-12">
          {/* Text Side */}
          <div className="md:col-span-5 flex flex-col gap-6 text-left md:order-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary-soft/80 border border-primary/10 px-4 py-1.5 rounded-full self-start">
              🎒 TỪ VỰNG & THUẬT TOÁN SRS
            </span>
            <h2 className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl tracking-tight">
              Khắc sâu vĩnh viễn với FSRS
            </h2>
            <p className="max-w-md text-sm sm:text-base font-semibold leading-relaxed text-muted">
              Đồng bộ trực tiếp cụm từ vào sổ tay ôn tập FSRS. Thẻ được nhắc lại thông minh đúng thời điểm bạn sắp quên để chuyển từ bộ nhớ tạm thời sang dài hạn.
            </p>
            <Link href="/notes" className="liquid-glass-btn inline-flex px-8 py-4 text-xs font-black uppercase tracking-wider active:scale-95 self-start mt-2">
              Vào sổ tay từ vựng →
            </Link>
          </div>

          {/* Visual Side (Luxe Bento Layout with Diverse Backgrounds) */}
          <div className="md:col-span-7 flex justify-center md:order-1">
            <div className="grid gap-6 sm:grid-cols-12 w-full">
              {/* Card 1 (SRS Flashcard - Translucent Liquid Glass) */}
              <div className="sm:col-span-8 liquid-glass-card p-6 flex flex-col justify-between aspect-[4/3] bg-surface border border-border/80 shadow-xl">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted">Học cụm từ</span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400">Đã thuộc (Level 5)</span>
                </div>
                <div className="my-auto py-4">
                  <p className="font-display text-2xl font-black text-foreground">once in a blue moon</p>
                  <p className="text-xs font-mono font-bold text-muted mt-1.5">/wʌns ɪn ə bluː muːn/</p>
                  <p className="text-sm font-bold text-foreground mt-4 leading-relaxed">Năm thì mười họa mới xảy ra, cực kỳ hiếm khi.</p>
                </div>
                <div className="border-t border-border/40 pt-4 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted">Lịch ôn lại: <span className="text-primary font-black">sau 12 ngày</span></span>
                  <span className="h-1.5 w-20 rounded-full bg-primary/10 overflow-hidden border border-primary/10"><span className="block h-full w-[85%] bg-primary" /></span>
                </div>
              </div>
              
              {/* Card 2 (SRS Stats Card - High Contrast Color Pop background) */}
              <div className="sm:col-span-4 bg-gradient-to-br from-primary to-accent text-primary-fg p-6 rounded-3xl flex flex-col justify-between aspect-[1/1] sm:aspect-auto shadow-2xl relative overflow-hidden">
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="text-[9px] font-black uppercase tracking-wider opacity-90">FSRS ALGORITHM</div>
                <div className="my-auto py-4">
                  <p className="text-5xl font-display font-black leading-none text-white">88%</p>
                  <p className="text-[11px] font-bold text-white/90 mt-2 leading-tight">Hiệu suất ghi nhớ thực tế</p>
                </div>
                <div className="text-[9px] font-black tracking-wider uppercase bg-white/15 border border-white/10 py-2 rounded-xl text-center text-white">
                  124 cụm đã thuộc
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE 3: TIẾN ĐỘ (Luxe Dashboard Analytics) ===== */}
      <section className="bg-background border-t border-border/30 relative animate-fadeIn">
        <div className="mx-auto max-w-6xl px-5 py-24 md:py-32 grid items-center gap-12 md:grid-cols-12">
          {/* Text Side */}
          <div className="md:col-span-6 flex flex-col gap-6 text-left md:order-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary-soft/80 border border-primary/10 px-4 py-1.5 rounded-full self-start">
              📊 THỐNG KÊ CHI TIẾT
            </span>
            <h2 className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl tracking-tight">
              Chuyển hóa vốn từ thụ động thành chủ động
            </h2>
            <p className="max-w-md text-sm sm:text-base font-semibold leading-relaxed text-muted">
              Đo lường chính xác khoảng cách giữa số từ bạn chỉ "hiểu khi nghe đọc" và số cụm từ bạn thực sự "tự tin nói được" trong giao tiếp hàng ngày.
            </p>
            <Link href="/today" className="rounded-full bg-primary-soft px-8 py-4 text-xs font-black uppercase tracking-wider text-primary border border-primary/15 transition-all hover:scale-105 active:scale-95 self-start mt-2 shadow-sm">
              Xem tiến độ hôm nay →
            </Link>
          </div>

          {/* Visual Side (Luxe Dashboard Card) */}
          <div className="md:col-span-6 flex justify-center md:order-2">
            <div className="relative w-full aspect-[4/3] rounded-3xl liquid-glass-card p-6 flex flex-col justify-between bg-surface border border-border/80 shadow-2xl">
              <div className="flex justify-between items-center border-b border-border/40 pb-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Phản xạ trong tuần</h4>
                  <p className="text-[11px] font-bold text-muted mt-0.5">Hoàn thành mục tiêu đề ra</p>
                </div>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 text-[9px] font-black text-amber-600 dark:text-amber-400">Streak: 5 ngày 🔥</span>
              </div>
              <div className="grid grid-cols-4 gap-4 my-6 items-end h-28">
                {[
                  { day: "T2", val: "70%" },
                  { day: "T3", val: "85%" },
                  { day: "T4", val: "60%" },
                  { day: "T5", val: "95%" }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2.5 h-full justify-end">
                    <div className="w-full bg-primary/10 rounded-t-xl relative overflow-hidden flex items-end" style={{ height: item.val }}>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary to-accent h-full opacity-90 rounded-t-xl" />
                    </div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-wider">{item.day}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/40 pt-4 flex justify-between items-center text-xs font-black uppercase tracking-wider">
                <p className="text-muted">Tổng thời gian luyện nói</p>
                <p className="text-primary font-extrabold text-sm">4.8 giờ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INTERACTIVE PLAYGROUND (Tabbed Game & Core Loop Showcase) ===== */}
      <section id="play" className="bg-surface border-t border-border/30 relative">
        <div className="mx-auto max-w-5xl px-5 py-24 relative">
          <div className="text-center mb-10 flex flex-col items-center gap-3">
            <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
              ⚡ SÂN CHƠI TƯƠNG TÁC
            </span>
            <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight leading-none">
              Thử ngay vòng luyện phản xạ
            </h2>
            <p className="max-w-md text-xs sm:text-sm font-semibold text-muted leading-relaxed">
              Trải nghiệm thực tế hai vòng phản xạ ưu việt nhất ngay tại giao diện phía dưới.
            </p>
          </div>
          
          <div className="mb-10 flex justify-center">
            <div className="flex gap-1.5 rounded-2xl border border-border/60 bg-background/50 backdrop-blur-sm p-1.5 shadow-md">
              <button
                onClick={() => setActiveTab("sprint")}
                className={`rounded-xl px-6 py-3 text-xs font-black tracking-wider uppercase transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === "sprint"
                    ? "bg-primary text-primary-fg shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                ⚡ Game Từ Vựng Sprint
              </button>
              <button
                onClick={() => setActiveTab("core")}
                className={`rounded-xl px-6 py-3 text-xs font-black tracking-wider uppercase transition-all duration-300 cursor-pointer active:scale-95 ${
                  activeTab === "core"
                    ? "bg-primary text-primary-fg shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                🔁 Vòng Luyện Nói Cốt Lõi
              </button>
            </div>
          </div>
          
          <div className="animate-fadeIn p-4 md:p-6 rounded-3xl border border-border/50 bg-background/30 backdrop-blur-sm shadow-2xl">
            {activeTab === "sprint" ? (
              <div className="flex flex-col items-center gap-5 py-10 text-center">
                <span className="text-5xl">⚡</span>
                <h3 className="font-display text-2xl font-extrabold text-foreground">Game Sprint — Phản xạ từ vựng</h3>
                <p className="max-w-md text-sm font-medium text-muted leading-relaxed">
                  Luyện dịch nghĩa siêu tốc 30 giây. Chọn từ theo <b>cấp độ CEFR</b>, <b>chủ đề</b>, hoặc để <b>AI tạo bộ từ mới</b>.
                </p>
                <Link href="/sprint" className="py-3.5 px-8 rounded-2xl bg-primary hover:opacity-90 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_8px_24px_rgba(43,120,139,0.3)]">
                  Mở trang Sprint →
                </Link>
              </div>
            ) : (
              <CoreLoopDemo />
            )}
          </div>
        </div>
      </section>

      {/* ===== ROADMAP SECTION ===== */}
      <section className="bg-background border-t border-border/30 relative">
        <div className="mx-auto max-w-5xl px-5 py-24 relative">
          <div className="text-center mb-12 flex flex-col items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary-soft/80 border border-primary/10 px-4 py-1.5 rounded-full">
              🧭 LỘ TRÌNH PHÁT TRIỂN
            </span>
            <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight leading-none">
              Lộ trình 4 giai đoạn toàn diện
            </h2>
            <p className="max-w-md text-xs sm:text-sm font-semibold text-muted leading-relaxed">
              Mở khóa từng bước từ phát âm cơ bản đến phản xạ giao tiếp trôi chảy tự nhiên.
            </p>
          </div>
          <RoadmapPath />
        </div>
      </section>

      {/* ===== FOOTER SECTION ===== */}
      <footer className="border-t border-border/40 bg-surface/30 backdrop-blur-md py-12 text-[11px] font-black uppercase tracking-wider text-muted/80">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>SpeakUp · Lộ trình A1 → Giao tiếp thành thạo · Học nói mỗi ngày</p>
          <div className="flex gap-6">
            <span className="text-primary hover:underline cursor-pointer">Điều khoản dịch vụ</span>
            <span className="text-primary hover:underline cursor-pointer">Chính sách bảo mật</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
