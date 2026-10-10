"use client";

import TodayDashboard from "@/components/TodayDashboard";
import { useAuth } from "@/lib/auth";

export default function TodayPage() {
  const { displayName, email, isAnonymous } = useAuth();
  const name = isAnonymous ? "Học viên" : (displayName || email || "Học viên");

  return (
    <main className="study-page animate-fadeIn">
      <div className="mb-8 text-left flex flex-col gap-2 select-none">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">
          • XIN CHÀO, {name.split("@")[0].toUpperCase()}
        </span>
        <h1 className="font-display text-4.5xl font-black text-foreground tracking-tight leading-none mt-1">
          Sẵn sàng học tiếp?
        </h1>
        <p className="max-w-2xl text-xs font-semibold text-muted leading-relaxed mt-2">
          Chọn một buổi học vừa sức, ôn điều sắp quên và luyện dùng tiếng Anh từng bước. Bạn có thể tiếp tục buổi đang học bất cứ lúc nào trong hôm nay.
        </p>
      </div>
      <TodayDashboard />
    </main>
  );
}
