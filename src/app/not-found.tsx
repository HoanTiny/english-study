import Link from "next/link";

export const metadata = { title: "Không tìm thấy trang — SpeakUp" };

// Trang 404 tùy chỉnh — thay cho màn đen mặc định của Next.js.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center animate-fadeIn relative">
      {/* Nền highlight nhẹ cho đồng bộ với các trang khác */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <p className="font-display text-7xl font-black text-gradient-iridescent sm:text-8xl">404</p>

      <h1 className="mt-4 font-display text-xl font-black text-foreground sm:text-2xl">
        Ốp! Trang này không tồn tại
      </h1>
      <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-muted">
        “I think I&apos;m lost.” — câu này có trong bài <em>Du lịch &amp; sân bay</em> đấy 😄
        Đường dẫn có thể đã đổi hoặc gõ nhầm. Quay lại học tiếp nhé!
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider active:scale-95"
        >
          🎯 Về lộ trình học
        </Link>
        <Link
          href="/today"
          className="rounded-full border border-border bg-surface px-6 py-3.5 text-xs font-black uppercase tracking-wider text-muted shadow-sm transition-all hover:border-primary/40 hover:text-foreground active:scale-95"
        >
          📅 Nhiệm vụ hôm nay
        </Link>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
        <span className="text-muted/70">Hoặc đi nhanh tới:</span>
        <Link href="/vocab" className="rounded-full border border-border/60 bg-surface px-3 py-1.5 text-muted transition-colors hover:text-primary hover:border-primary/40">🎒 Từ vựng</Link>
        <Link href="/grammar" className="rounded-full border border-border/60 bg-surface px-3 py-1.5 text-muted transition-colors hover:text-primary hover:border-primary/40">📚 Cấu trúc câu</Link>
        <Link href="/listening" className="rounded-full border border-border/60 bg-surface px-3 py-1.5 text-muted transition-colors hover:text-primary hover:border-primary/40">🎧 Luyện nghe</Link>
        <Link href="/review" className="rounded-full border border-border/60 bg-surface px-3 py-1.5 text-muted transition-colors hover:text-primary hover:border-primary/40">🔁 Ôn tập</Link>
      </div>
    </main>
  );
}
