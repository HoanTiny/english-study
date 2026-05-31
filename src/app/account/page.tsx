"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getProfile, updateDisplayName, type Profile } from "@/lib/profileRepo";
import TodayDashboard from "@/components/TodayDashboard";

export default function AccountPage() {
  const router = useRouter();
  const { userId, ready, email, isAnonymous, displayName, streak, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userId && !isAnonymous) {
      getProfile(userId).then((p) => {
        setProfile(p);
        setName(p.displayName ?? "");
      });
    }
  }, [userId, isAnonymous]);

  async function save() {
    if (!userId) return;
    await updateDisplayName(userId, name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!ready) {
    return <main className="mx-auto max-w-md px-6 py-24 text-center text-sm font-semibold text-muted animate-fadeIn">Đang tải…</main>;
  }

  // Chưa đăng nhập (ẩn danh) → mời đăng nhập
  if (isAnonymous) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 animate-fadeIn">
        <div className="liquid-glass-card flex flex-col items-center gap-4 p-8 text-center border border-border/80 shadow-2xl">
          <span className="text-5xl">👤</span>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Bạn đang dùng thử ẩn danh</h1>
          <p className="text-xs font-semibold text-muted">
            Đăng nhập để lưu tiến độ, theo dõi streak 🔥 và đồng bộ giữa điện thoại – máy tính.
          </p>
          <Link href="/login" className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider">Đăng nhập / Đăng ký</Link>
        </div>
      </main>
    );
  }

  const streakVal = profile?.streak ?? streak;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 pt-24 animate-fadeIn">
      <div className="liquid-glass-card flex flex-col gap-6 p-8 border border-border/80 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-fg shadow-md">
            {(displayName || email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-extrabold text-foreground">{displayName || "Học viên"}</h1>
            <p className="truncate text-xs font-semibold text-muted">{email}</p>
          </div>
        </div>

        {/* Streak + giai đoạn */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-surface/50 p-4 text-center">
            <p className="text-3xl font-black text-foreground">🔥 {streakVal}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted">Ngày streak</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface/50 p-4 text-center">
            <p className="text-3xl font-black text-foreground">{profile?.currentStage ?? 1}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted">Giai đoạn</p>
          </div>
        </div>

        {/* Đổi tên hiển thị */}
        <div>
          <label className="text-[9px] font-black uppercase tracking-wider text-muted">Tên hiển thị</label>
          <div className="mt-1 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-2.5 text-sm font-bold text-foreground outline-none focus:border-primary" />
            <button onClick={save} className="liquid-glass-btn px-5 text-xs font-black uppercase tracking-wider">{saved ? "✓" : "Lưu"}</button>
          </div>
        </div>

        <button onClick={() => { signOut().then(() => router.push("/")); }} className="rounded-2xl border-2 border-rose-500/30 bg-rose-500/5 py-3 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-500/10">
          Đăng xuất
        </button>
      </div>

      {/* Tiến độ hôm nay (gộp từ trang Hôm nay) */}
      <div className="mt-10">
        <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-extrabold text-foreground">
          📅 Tiến độ hôm nay
        </h2>
        <TodayDashboard />
      </div>
    </main>
  );
}
