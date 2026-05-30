"use client";

import { useState } from "react";
import Link from "next/link";
import CoreLoopDemo from "@/components/CoreLoopDemo";
import SprintGame from "@/components/SprintGame";
import RoadmapPath from "@/components/RoadmapPath";

const features = [
  {
    icon: "🔁",
    title: "Core Loop: Nói bắt buộc",
    desc: "Tiếp nhận → tự nhớ lại → NÓI ra → chấm phát âm. Không nói thì không qua bài.",
    color: "from-indigo-500/20 to-purple-500/20",
  },
  {
    icon: "📔",
    title: "Nhật ký 5–10 câu/ngày",
    desc: "Gợi ý chủ đề mỗi ngày, AI sửa 2–3 lỗi quan trọng, đọc to lại bài viết.",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    icon: "🎧",
    title: "Shadowing",
    desc: "Nghe giọng bản xứ, nhại lại, so khớp điểm phát âm. Chỉnh tốc độ 0.5–1x.",
    color: "from-cyan-500/20 to-blue-500/20",
  },
  {
    icon: "📝",
    title: "Sổ tay thông minh",
    desc: "Lưu cấu trúc câu & từ mới, một chạm đẩy vào hệ thống ôn tập để không quên.",
    color: "from-teal-500/20 to-emerald-500/20",
  },
  {
    icon: "📊",
    title: "Hiểu vs Nói được",
    desc: "Theo dõi khoảng cách giữa từ bạn hiểu và từ bạn nói được — mục tiêu là thu hẹp nó.",
    color: "from-amber-500/20 to-orange-500/20",
  },
  {
    icon: "🔥",
    title: "Streak & nhắc học",
    desc: "Học đều 2h/ngày. Chuỗi ngày học và nhắc nhở giữ động lực.",
    color: "from-red-500/20 to-rose-600/20",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"sprint" | "core">("sprint");

  return (
    <div className="pt-10">
      <main className="mx-auto max-w-5xl px-5">
        {/* Hero */}
        <section className="py-20 text-center relative animate-fadeIn">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Lộ trình A1 → Giao tiếp chuyên nghiệp · 2h/ngày
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl leading-[1.1] text-foreground">
            Hiểu tiếng Anh nhưng <br className="hidden sm:inline" />
            <span className="text-gradient-iridescent">không nói được?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted font-medium leading-relaxed">
            SpeakUp ép bạn biến kiến thức bị động thành phản xạ nói thật — qua cụm
            từ, nói bắt buộc mỗi ngày, journal, shadowing và sổ tay, tất cả đổ về
            một hệ thống ôn tập thông minh.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/today"
              className="liquid-glass-btn px-7 py-3 text-sm font-bold active:scale-95 w-full sm:w-auto"
            >
              Bắt đầu học hôm nay →
            </Link>
            <Link
              href="/lesson/greetings"
              className="rounded-full border border-border bg-white/30 dark:bg-white/5 px-7 py-3 text-sm font-bold text-foreground backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 active:scale-95 w-full sm:w-auto"
            >
              Học thử bài đầu tiên
            </Link>
          </div>
        </section>

        {/* Interactive Showcase Switcher */}
        <section className="pb-24 max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="flex p-1 rounded-2xl border border-border bg-white/20 dark:bg-white/5 backdrop-blur-md shadow-sm">
              <button
                onClick={() => setActiveTab("sprint")}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  activeTab === "sprint"
                    ? "bg-gradient-to-r from-accent to-indigo-500 text-white shadow-md scale-102 font-extrabold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                ⚡ Game Từ Vựng Sprint
              </button>
              <button
                onClick={() => setActiveTab("core")}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  activeTab === "core"
                    ? "bg-gradient-to-r from-accent to-indigo-500 text-white shadow-md scale-102 font-extrabold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                🔁 Vòng Luyện Nói Cốt Lõi
              </button>
            </div>
          </div>
          
          <div className="transition-all duration-500">
            {activeTab === "sprint" ? <SprintGame /> : <CoreLoopDemo />}
          </div>
        </section>

        {/* Features */}
        <section className="pb-24">
          <h2 className="mb-8 text-center text-3xl font-extrabold tracking-tight">Tính năng công nghệ</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="liquid-glass-interactive p-6 relative overflow-hidden group"
              >
                {/* Decorative fluid sphere inside card */}
                <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-gradient-to-tr ${f.color} filter blur-xl opacity-30 group-hover:scale-150 transition-transform duration-500`} />
                
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 dark:bg-white/5 border border-border/80 text-3xl shadow-sm">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="pb-28">
          <h2 className="mb-2 text-center text-3xl font-extrabold tracking-tight">Lộ trình 4 giai đoạn</h2>
          <p className="mb-10 text-center text-sm font-medium text-muted">
            Mở khóa dần từ phát âm cơ bản đến hội thoại tự tin toàn cầu.
          </p>
          <RoadmapPath />
        </section>
      </main>

      <footer className="border-t border-border/40 bg-surface/10 backdrop-blur-md py-10 text-center text-sm text-muted font-medium">
        SpeakUp · Bản demo lộ trình & vòng học cốt lõi Liquid Glass 💎
      </footer>
    </div>
  );
}

