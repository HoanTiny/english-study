"use client";

import { useState } from "react";
import Link from "next/link";
import CoreLoopDemo from "@/components/CoreLoopDemo";
import SprintGame from "@/components/SprintGame";
import RoadmapPath from "@/components/RoadmapPath";

const sections = [
  {
    surface: false,
    eyebrow: "MINI-GAME",
    title: "Học qua trò chơi vui nhộn",
    desc: "Biến việc luyện cụm từ thành phản xạ với Sprint và Hội thoại AI.",
    emoji: "🧘",
    reverse: false,
    cards: [
      { label: "Sprint →", cls: "bg-pink-soft text-pink", href: "#play" },
      { label: "Audio-call →", cls: "bg-primary-soft text-primary", href: "/audio-call" },
    ],
    button: null as null | { label: string; href: string },
  },
  {
    surface: true,
    eyebrow: "TỪ VỰNG",
    title: "Mở rộng vốn từ của bạn",
    desc: "Học theo cụm, đẩy vào hệ thống ôn tập SRS để không bao giờ quên.",
    emoji: "🎒",
    reverse: true,
    cards: [],
    button: { label: "Vào sổ tay →", href: "/notes" },
  },
  {
    surface: false,
    eyebrow: "TIẾN ĐỘ",
    title: "Theo dõi tiến bộ mỗi ngày",
    desc: "Lưu thống kê thành tích, số cụm đã nói được và khoảng cách Hiểu → Nói.",
    emoji: "📊",
    reverse: false,
    cards: [],
    button: { label: "Xem hôm nay →", href: "/today" },
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"sprint" | "core">("sprint");

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="mx-auto max-w-6xl px-6 animate-fadeIn">
        <div className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col gap-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Nền tảng học nói tiếng Anh
            </p>
            <h1 className="font-display text-[2.6rem] leading-[1.15] text-foreground sm:text-6xl">
              Học nói tiếng Anh,{" "}
              <span className="text-primary">theo cách dễ nhất.</span>
            </h1>
            <p className="max-w-md text-lg font-medium leading-relaxed text-muted">
              Luyện phản xạ nói qua cụm từ, nhật ký, shadowing và hội thoại AI —
              tất cả đổ về một hệ thống ôn tập thông minh.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/today" className="liquid-glass-btn px-7 py-3.5 text-sm font-bold active:scale-95">
                Bắt đầu học hôm nay →
              </Link>
              <Link
                href="/lesson/greetings"
                className="rounded-full bg-primary-soft px-7 py-3.5 text-sm font-bold text-primary transition-transform hover:scale-105 active:scale-95"
              >
                Học thử bài đầu
              </Link>
            </div>
            <div className="mt-2 flex items-center gap-8">
              <div>
                <p className="font-display text-4xl text-foreground">
                  180<span className="text-primary">+</span>
                </p>
                <p className="mt-1 text-sm font-semibold text-muted">cụm thông dụng</p>
              </div>
              <span className="h-12 w-px bg-border" />
              <div>
                <p className="font-display text-4xl text-foreground">
                  22<span className="text-primary">+</span>
                </p>
                <p className="mt-1 text-sm font-semibold text-muted">bài học</p>
              </div>
            </div>
          </div>
          {/* Visual */}
          <div className="flex justify-center">
            <div className="liquid-glass-card relative flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-4 p-10">
              <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-primary-soft opacity-70 blur-2xl" />
              <div className="absolute -bottom-5 -left-5 h-24 w-24 rounded-full bg-pink-soft opacity-60 blur-2xl" />
              <span className="text-8xl">🗣️</span>
              <p className="font-display text-xl text-foreground">Speak with confidence</p>
              <p className="text-center text-sm font-semibold text-muted">A1 → giao tiếp, 2h mỗi ngày</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE SECTIONS ===== */}
      {sections.map((s) => (
        <section key={s.title} className={s.surface ? "bg-surface" : "bg-background"}>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-20">
            <div className={`flex flex-col gap-5 ${s.reverse ? "md:order-2" : ""}`}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{s.eyebrow}</p>
              <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">{s.title}</h2>
              <p className="max-w-md text-lg font-medium leading-relaxed text-muted">{s.desc}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {s.button && (
                  <Link
                    href={s.button.href}
                    className="rounded-full bg-primary-soft px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-105 active:scale-95"
                  >
                    {s.button.label}
                  </Link>
                )}
                {s.cards.map((c) => (
                  <Link
                    key={c.label}
                    href={c.href}
                    className={`rounded-2xl px-5 py-3 text-sm font-bold transition-transform hover:scale-105 active:scale-95 ${c.cls}`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className={s.reverse ? "md:order-1" : ""}>
              <div className="liquid-glass-card flex aspect-[4/3] w-full items-center justify-center">
                <span className="text-8xl">{s.emoji}</span>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ===== SHOWCASE (game tương tác) ===== */}
      <section id="play" className="bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="mb-3 text-center font-display text-3xl text-foreground sm:text-4xl">
            Thử ngay vòng luyện nói
          </h2>
          <p className="mb-8 text-center text-sm font-semibold text-muted">
            Chọn một chế độ và bắt đầu phản xạ.
          </p>
          <div className="mb-8 flex justify-center">
            <div className="flex gap-1 rounded-2xl border border-border bg-background p-1">
              <button
                onClick={() => setActiveTab("sprint")}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  activeTab === "sprint" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                ⚡ Game Từ Vựng Sprint
              </button>
              <button
                onClick={() => setActiveTab("core")}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  activeTab === "core" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                🔁 Vòng Luyện Nói Cốt Lõi
              </button>
            </div>
          </div>
          {activeTab === "sprint" ? <SprintGame /> : <CoreLoopDemo />}
        </div>
      </section>

      {/* ===== ROADMAP ===== */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="mb-2 text-center font-display text-3xl text-foreground sm:text-4xl">
            Lộ trình 4 giai đoạn
          </h2>
          <p className="mb-10 text-center text-sm font-semibold text-muted">
            Mở khóa dần từ phát âm cơ bản đến hội thoại tự tin.
          </p>
          <RoadmapPath />
        </div>
      </section>

      <footer className="border-t border-border bg-surface py-10 text-center text-sm font-medium text-muted">
        SpeakUp · Lộ trình A1 → giao tiếp · Học nói mỗi ngày
      </footer>
    </div>
  );
}
