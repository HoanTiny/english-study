"use client";

import Link from "next/link";
import SprintGame from "@/components/SprintGame";

export default function SprintPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 pt-24 animate-fadeIn relative">
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="mb-10 text-center flex flex-col items-center gap-3">
        <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          ⚡ GAME PHẢN XẠ TỪ VỰNG
        </span>
        <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight">Sprint — Phản xạ từ vựng</h1>
        <p className="max-w-md text-xs sm:text-sm font-semibold text-muted leading-relaxed">
          Luyện dịch nghĩa siêu tốc trong 30 giây. Chọn nguồn từ theo <b>cấp độ CEFR</b>, <b>chủ đề kho từ</b>, hoặc để <b>AI tạo bộ từ mới</b>.
        </p>
        <Link href="/vocab" className="text-[11px] font-bold text-muted hover:text-foreground">Xem thư viện từ vựng đầy đủ →</Link>
      </div>

      <SprintGame />
    </main>
  );
}
