"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import RoadmapPath from "@/components/RoadmapPath";

export default function Home() {
  const { displayName, isAnonymous, streak } = useAuth();
  const firstName = displayName ? displayName.trim().split(/\s+/).pop() : "";
  const greeting = !isAnonymous && firstName ? `Chào ${firstName} 👋` : "Lộ trình học của bạn";

  return (
    <div className="overflow-hidden">
      {/* ===== HEADER GỌN: chào + lối tắt ===== */}
      <section className="mx-auto max-w-5xl px-5 pt-10 pb-2 animate-fadeIn">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="inline-flex self-start items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
              🧭 Lộ trình học
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {greeting}
            </h1>
            <p className="max-w-xl text-sm font-semibold leading-relaxed text-muted">
              Hành trình A1 → giao tiếp, mở khóa từng bước theo tiến độ thật của bạn. Chọn bài đang học bên dưới hoặc tiếp tục nhiệm vụ hôm nay.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <Link href="/today" className="liquid-glass-btn px-7 py-3.5 text-xs font-black uppercase tracking-wider active:scale-95 shadow-lg">
                Học hôm nay →
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-border bg-surface/60 backdrop-blur-md px-7 py-3.5 text-xs font-black uppercase tracking-wider text-foreground transition-all hover:border-primary/40 hover:scale-[1.02] active:scale-95 shadow-sm"
              >
                Bảng điều khiển
              </Link>
            </div>
          </div>

          {!isAnonymous && streak > 0 && (
            <div className="flex h-12 shrink-0 items-center gap-2 self-start rounded-2xl border border-orange-500/20 bg-orange-500/5 px-5 text-sm font-black text-orange-600 dark:text-orange-400">
              <span className="text-lg">🔥</span> {streak} ngày streak
            </div>
          )}
        </div>
      </section>

      {/* ===== TRỌNG TÂM: LỘ TRÌNH HỌC ===== */}
      <section className="mx-auto max-w-5xl px-5 pt-8 pb-20 animate-fadeIn">
        <RoadmapPath />
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/10 bg-white/[0.03] dark:bg-black/[0.15] backdrop-blur-md py-10 text-[11px] font-black uppercase tracking-wider text-muted/80">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>SpeakUp · Lộ trình A1 → Giao tiếp thành thạo · Học nói mỗi ngày</p>
          <div className="flex gap-6">
            <Link href="/account" className="text-primary hover:underline">Tài khoản</Link>
            <Link href="/statistics" className="text-primary hover:underline">Thống kê</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
