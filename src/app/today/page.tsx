"use client";

import TodayDashboard from "@/components/TodayDashboard";

export default function TodayPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 animate-fadeIn relative">
      <div className="mb-10 text-left flex flex-col gap-3">
        <span className="shimmer-edge inline-flex self-start items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          📅 TIẾN TRÌNH HỌC TẬP
        </span>
        <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-5xl tracking-tight leading-none mt-1">
          Hôm nay
        </h1>
        <p className="max-w-2xl text-xs sm:text-sm font-semibold text-muted leading-relaxed">
          Tổng quan tiến độ thực hành thực tế và chỉ số chuyển đổi từ <b>Hiểu (Thụ động)</b> sang <b>Nói được (Chủ động)</b>. Mục tiêu hàng ngày của chúng ta là tối ưu hóa và thu hẹp tỷ lệ này.
        </p>
      </div>
      <TodayDashboard />
    </main>
  );
}
