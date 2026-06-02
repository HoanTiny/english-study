"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getProfile, updateDisplayName, type Profile } from "@/lib/profileRepo";
import { loadDashboard, type DashboardStats } from "@/lib/statsRepo";
import { todayKey } from "@/lib/store";

export default function AccountPage() {
  const router = useRouter();
  const { userId, ready, email, isAnonymous, displayName, streak, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userId && !isAnonymous) {
      // Fetch profile
      getProfile(userId).then((p) => {
        setProfile(p);
        setName(p.displayName ?? "");
      });
      // Fetch daily stats
      loadDashboard(todayKey()).then((s) => {
        setStats(s);
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
    return (
      <main className="mx-auto max-w-xl px-6 py-32 text-center select-none">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">Đang tải hồ sơ…</p>
        </div>
      </main>
    );
  }

  // --- ANONYMOUS GUEST TRIAL VIEW ---
  if (isAnonymous) {
    return (
      <main className="mx-auto max-w-xl px-5 py-12 sm:py-20 animate-fadeIn select-none">
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-8 sm:p-10 border border-border/80 shadow-2xl text-center">
          <span className="text-5xl filter drop-shadow-sm animate-bounce">👤</span>
          
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink bg-pink-soft/80 px-3 py-1 rounded-full border border-pink/10">
              Chế độ khách
            </span>
            <h1 className="font-display text-2xl font-black text-foreground tracking-tight">
              Tài khoản khách ẩn danh
            </h1>
            <p className="text-xs font-semibold text-muted max-w-md mx-auto leading-relaxed">
              Bạn đang trải nghiệm học thử SpeakUp. Hãy tạo tài khoản chính thức để nhận đầy đủ đặc quyền học tập vượt trội:
            </p>
          </div>

          <div className="w-full max-w-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-border/40 p-4 text-left space-y-2.5 text-xs font-semibold text-muted">
            <p className="flex items-center gap-2 text-foreground">
              <span className="text-emerald-500">✓</span> Lưu trữ vĩnh viễn lộ trình học
            </p>
            <p className="flex items-center gap-2 text-foreground">
              <span className="text-emerald-500">✓</span> Theo dõi streak 🔥 và tích lũy phản xạ
            </p>
            <p className="flex items-center gap-2 text-foreground">
              <span className="text-emerald-500">✓</span> Đồng bộ FSRS thông minh đa thiết bị
            </p>
          </div>

          <Link
            href="/login"
            className="liquid-glass-btn w-full max-w-sm py-4 text-xs font-black uppercase tracking-wider shadow-lg active:scale-98"
          >
            Đăng nhập / Đăng ký ngay
          </Link>
        </div>
      </main>
    );
  }

  const streakVal = profile?.streak ?? streak;
  const mastered = stats?.mastered ?? 0;
  const recognized = stats?.recognized ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 animate-fadeIn">
      
      {/* Page Title */}
      <div className="mb-6 select-none">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">
          • HỒ SƠ HỌC VIÊN
        </span>
        <h1 className="font-display text-4.5xl font-black text-foreground tracking-tight leading-none mt-1">
          Học viên SpeakUp
        </h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* ========================================================
            LEFT COLUMN: PROFILE IDENTITY & SETTINGS (lg:col-span-5)
            ======================================================== */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="liquid-glass-card p-6 sm:p-7 border border-border/80 shadow-xl flex flex-col gap-6 bg-white/70 dark:bg-[#161619] backdrop-blur-md">
            
            {/* Identity badge */}
            <div className="flex items-center gap-4 border-b border-border/30 pb-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-lg font-black text-white shadow-inner select-none">
                {(displayName || email || "U").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-black text-foreground leading-tight">
                  {displayName || "Học viên"}
                </h3>
                <p className="truncate text-[11px] font-bold text-muted/90 mt-1.5 leading-none">
                  {email}
                </p>
              </div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-2 select-none">
              <label className="text-[9px] font-black uppercase tracking-wider text-muted">
                Tên hiển thị học viên
              </label>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên hiển thị của bạn…"
                  className="flex-1 rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary focus:bg-background transition-all shadow-inner dark:border-white/10"
                />
                <button
                  onClick={save}
                  disabled={!name.trim() || name.trim() === displayName}
                  className="liquid-glass-btn px-5 text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saved ? "✓" : "Lưu"}
                </button>
              </div>
            </div>

            {/* Sign Out Button - Upgraded Color Contrast */}
            <button
              onClick={() => {
                signOut().then(() => router.push("/"));
              }}
              className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/5 py-3 text-xs font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500 hover:text-white active:scale-98 transition-all duration-300 cursor-pointer shadow-sm"
            >
              Đăng xuất tài khoản
            </button>

          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: METRICS & TASKS (lg:col-span-7)
            ======================================================= */}
        <div className="lg:col-span-7 space-y-7">
          
          {/* A. Clean 4-Grid Achievement Stats (No Duplicate Streaks) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
            
            {/* Streak */}
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-border/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm hover:border-primary/20 transition-all duration-300">
              <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-muted">
                  Streak học tập
                </p>
                <p className="font-display text-lg font-black text-orange-600 dark:text-orange-400 mt-1 leading-none">
                  {streakVal} ngày
                </p>
              </div>
              <span className="text-xl filter drop-shadow-sm">🔥</span>
            </div>

            {/* Stage */}
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-border/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm hover:border-primary/20 transition-all duration-300">
              <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-muted">
                  Lớp lộ trình
                </p>
                <p className="font-display text-lg font-black text-foreground mt-1 leading-none">
                  Lớp {profile?.currentStage ?? 1}
                </p>
              </div>
              <span className="text-xl filter drop-shadow-sm">🎯</span>
            </div>

            {/* Active Vocab */}
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-border/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm hover:border-primary/20 transition-all duration-300">
              <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-muted">
                  Vốn từ chủ động
                </p>
                <p className="font-display text-lg font-black text-foreground mt-1 leading-none">
                  {mastered} cụm
                </p>
              </div>
              <span className="text-xl filter drop-shadow-sm">🧠</span>
            </div>

            {/* Total words */}
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-border/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm hover:border-primary/20 transition-all duration-300">
              <div>
                <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-muted">
                  Từ tiếp cận
                </p>
                <p className="font-display text-lg font-black text-foreground mt-1 leading-none">
                  {recognized} từ
                </p>
              </div>
              <span className="text-xl filter drop-shadow-sm">📖</span>
            </div>

          </div>

          {/* B. Integrated Progress Bar */}
          {recognized > 0 && (
            <div className="bg-white/40 dark:bg-zinc-900/40 border border-border/30 rounded-2xl p-5 select-none space-y-3">
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                <span className="text-primary">Hiệu suất tích lũy vốn từ chủ động</span>
                <span className="text-foreground">
                  {Math.round((mastered / recognized) * 100)}% chuyển hóa
                </span>
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 h-2 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.round((mastered / recognized) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* C. 3 Clean Action Task Cards (Compact & High Contrast) */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 font-display text-base font-black text-foreground select-none">
              🎯 Nhiệm vụ ôn tập hôm nay
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-4">
              
              {/* Task 1 */}
              <Link
                href="/review"
                className="group liquid-glass-interactive p-4.5 flex flex-col justify-between gap-4 rounded-2xl border border-border/40 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🔁</span>
                  <span className="font-display text-xs font-black text-foreground">Học & Ôn SRS</span>
                </div>
                <div>
                  <p className="font-display text-2.5xl font-black text-foreground leading-none">
                    {stats?.dueToday ?? 0}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-muted">thẻ đến hạn hôm nay</p>
                </div>
                <div className="border-t border-border/30 pt-2.5 text-[9px] font-bold text-muted flex justify-between items-center">
                  <span>Đã học {stats?.inReview ?? 0} thẻ</span>
                  <span className="text-primary font-black group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </Link>

              {/* Task 2 */}
              <Link
                href="/journal"
                className="group liquid-glass-interactive p-4.5 flex flex-col justify-between gap-4 rounded-2xl border border-border/40 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📔</span>
                  <span className="font-display text-xs font-black text-foreground">Nhật ký AI</span>
                </div>
                <div>
                  <p className="font-display text-2.5xl font-black text-pink leading-none">
                    🔥 {stats?.journalStreak ?? 0}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-muted">ngày streak viết nhật ký</p>
                </div>
                <div className="border-t border-border/30 pt-2.5 text-[9px] font-bold text-muted flex justify-between items-center">
                  <span>{stats?.journalToday ? "Đã viết hôm nay ✓" : "Chưa viết hôm nay"}</span>
                  <span className="text-pink font-black group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </Link>

              {/* Task 3 */}
              <Link
                href="/shadowing"
                className="group liquid-glass-interactive p-4.5 flex flex-col justify-between gap-4 rounded-2xl border border-border/40 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🎙️</span>
                  <span className="font-display text-xs font-black text-foreground">Shadowing</span>
                </div>
                <div>
                  <p className="font-display text-2.5xl font-black text-foreground leading-none">
                    {stats?.shadowDone ?? 0}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-muted">câu đã luyện nhại giọng</p>
                </div>
                <div className="border-t border-border/30 pt-2.5 text-[9px] font-bold text-muted flex justify-between items-center">
                  <span>Điểm phát âm: {stats?.shadowAvg ?? "—"}</span>
                  <span className="text-primary font-black group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </Link>

            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
