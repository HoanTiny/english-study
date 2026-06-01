"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/lib/adminAuth";

const NAV = [
  { href: "/admin/lessons", label: "Bài học", icon: "📘", desc: "Nội dung & audio" },
  { href: "/admin/listening-exercises", label: "Bài tập nghe", icon: "📝", desc: "Audio + câu hỏi" },
  { href: "/admin/listening", label: "Video nghe", icon: "🎧", desc: "Kho YouTube" },
];

function LoginScreen() {
  const { login, error } = useAdminAuth();
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    await login(val.trim());
    setBusy(false);
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-5">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-3xl">🔐</div>
        <h1 className="font-display text-xl font-black text-white">SpeakUp CMS</h1>
        <p className="mt-1 text-xs font-semibold text-zinc-400">Đăng nhập quản trị nội dung</p>
        <input
          type="password"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && val.trim() && submit()}
          placeholder="Mật mã admin"
          autoFocus
          className="mt-5 w-full rounded-xl border border-white/15 bg-zinc-800 px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary placeholder:text-zinc-500"
        />
        {error && <p className="mt-2 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !val.trim()}
          className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-fg transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
        >
          {busy ? "Đang kiểm tra…" : "Vào CMS"}
        </button>
        <Link href="/" className="mt-4 inline-block text-[11px] font-bold text-zinc-500 hover:text-zinc-300">← Về ứng dụng</Link>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { logout } = useAdminAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = NAV.find((n) => pathname === n.href || pathname?.startsWith(n.href + "/"));

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/10 bg-zinc-900 p-4 md:flex">
        <Link href="/admin/lessons" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-fg">S</span>
          <span className="font-display text-base font-black">SpeakUp CMS</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors border ${
                  active
                    ? "bg-primary/15 border-primary/30"
                    : "border-transparent hover:bg-white/5"
                }`}
              >
                <span className="text-lg">{n.icon}</span>
                <span className="flex flex-col">
                  <span className={`text-sm font-black ${active ? "text-white" : "text-zinc-200 group-hover:text-white"}`}>
                    {n.label}
                  </span>
                  <span className={`text-[10px] font-semibold ${active ? "text-primary" : "text-zinc-500"}`}>
                    {n.desc}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-3">
          <Link href="/" className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-zinc-100">← Về ứng dụng</Link>
          <button onClick={logout} className="rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10">Đăng xuất</button>
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-zinc-900 px-4 py-3 md:hidden">
        <button onClick={() => setOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-lg">☰</button>
        <span className="font-display text-sm font-black">SpeakUp CMS · {current?.label}</span>
        <button onClick={logout} className="text-[11px] font-black text-rose-400">Thoát</button>
      </header>
      {open && (
        <div className="border-b border-white/10 bg-zinc-900 p-3 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5">
              {n.icon} {n.label}
            </Link>
          ))}
          <Link href="/" className="block rounded-lg px-3 py-2 text-sm font-bold text-zinc-500">← Về ứng dụng</Link>
        </div>
      )}

      {/* Content */}
      <div className="md:pl-60">
        {/* Topbar (desktop) */}
        <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-white/10 bg-zinc-950/80 px-8 py-4 backdrop-blur md:flex">
          <h1 className="font-display text-lg font-black">{current?.icon} {current?.label ?? "CMS"}</h1>
          <span className="text-[11px] font-bold text-zinc-500">Quản trị nội dung SpeakUp</span>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { authed, ready } = useAdminAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
      </div>
    );
  }
  if (!authed) return <LoginScreen />;
  return <Shell>{children}</Shell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <Gate>{children}</Gate>
    </AdminAuthProvider>
  );
}
