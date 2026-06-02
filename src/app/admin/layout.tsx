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
    if (!val.trim()) return;
    setBusy(true);
    await login(val.trim());
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-5 select-none font-sans">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#161619] p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-2xl relative z-1">
          🔐
        </div>
        
        <div className="relative z-1 space-y-1">
          <h1 className="font-display text-xl font-black text-white">SpeakUp CMS</h1>
          <p className="text-[11px] font-bold text-muted">Đăng nhập quản trị nội dung</p>
        </div>

        <div className="relative z-1 mt-6">
          <input
            type="password"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Mật mã admin"
            autoFocus
            className="w-full rounded-2xl border-2 border-white/10 bg-black/25 px-4 py-3 text-xs font-bold text-white outline-none focus:border-primary placeholder:text-muted/65 transition-all shadow-inner"
          />
          {error && (
            <p className="mt-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-400">
              {error}
            </p>
          )}
          
          <button
            onClick={submit}
            disabled={busy || !val.trim()}
            className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-xs font-black uppercase tracking-wider text-primary-fg transition-all hover:opacity-90 active:scale-98 disabled:opacity-40 shadow-lg shadow-primary/25 cursor-pointer"
          >
            {busy ? "Đang kiểm tra…" : "Vào CMS →"}
          </button>
          
          <Link
            href="/"
            className="mt-4 inline-block text-[10px] font-bold text-muted hover:text-white transition-colors"
          >
            ← Quay lại ứng dụng chính
          </Link>
        </div>
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
    <div className="dark min-h-screen bg-[#09090b] text-[#f8fafc] font-sans">
      
      {/* ========================================================
          DESKTOP: Left CMS Sidebar (fixed w-60)
          ======================================================== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/5 bg-[#161619]/95 backdrop-blur-md p-4 md:flex select-none">
        
        {/* Branding Title */}
        <Link href="/admin/lessons" className="mb-6 flex items-center gap-2.5 px-2.5 pb-4 border-b border-white/5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-fg shadow-inner">
            S
          </span>
          <div className="flex flex-col">
            <span className="font-display text-sm font-black text-white leading-none">SpeakUp CMS</span>
            <span className="text-[8px] font-bold text-muted tracking-wider uppercase mt-1">ADMINISTRATOR</span>
          </div>
        </Link>

        {/* Sidebar Nav */}
        <nav className="flex flex-col gap-1.5 flex-1">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all border ${
                  active
                    ? "bg-primary-soft text-primary border-primary/20 shadow-sm"
                    : "border-transparent text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base shrink-0">{n.icon}</span>
                <span className="flex flex-col min-w-0">
                  <span className={`text-xs font-black truncate leading-tight ${active ? "text-primary" : "text-zinc-200 group-hover:text-white"}`}>
                    {n.label}
                  </span>
                  <span className={`text-[9px] font-bold mt-0.5 truncate leading-none ${active ? "text-primary/75" : "text-muted"}`}>
                    {n.desc}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto flex flex-col gap-1.5 border-t border-white/5 pt-4">
          <Link
            href="/"
            className="rounded-xl px-3 py-2 text-xs font-bold text-muted hover:bg-white/5 hover:text-white transition-colors"
          >
            ← Về ứng dụng
          </Link>
          <button
            onClick={logout}
            className="rounded-xl px-3 py-2 text-left text-xs font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 active:scale-98 transition-all cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ========================================================
          MOBILE: Top CMS Navbar & Drawer
          ======================================================== */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-[#161619] px-4 py-3 md:hidden select-none">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-base active:scale-95 bg-black/10"
        >
          ☰
        </button>
        <span className="font-display text-xs font-black text-white">
          SpeakUp CMS · {current?.label}
        </span>
        <button onClick={logout} className="text-[10px] font-black uppercase tracking-wider text-rose-500">
          Thoát
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {open && (
        <div className="border-b border-white/5 bg-[#161619] p-3 md:hidden space-y-1 select-none">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/5"
            >
              <span>{n.icon}</span> <span>{n.label}</span>
            </Link>
          ))}
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-muted hover:bg-white/5"
          >
            ← Quay lại ứng dụng chính
          </Link>
        </div>
      )}

      {/* ========================================================
          CONTENT AREA: (md:pl-60 offset matched to sidebar)
          ======================================================== */}
      <div className="md:pl-60">
        
        {/* Desktop Sticky Header */}
        <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-white/5 bg-[#09090b]/80 px-8 py-4.5 backdrop-blur-md md:flex select-none">
          <h1 className="font-display text-base font-black text-white flex items-center gap-2.5">
            <span>{current?.icon}</span>
            <span>{current?.label ?? "CMS Dashboard"}</span>
          </h1>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted">
            Quản trị nội dung SpeakUp
          </span>
        </header>

        {/* Page children container */}
        <main className="p-5 md:p-8 animate-fadeIn">{children}</main>
      </div>

    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { authed, ready } = useAdminAuth();
  
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
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
