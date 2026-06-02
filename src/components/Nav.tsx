"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import DictionaryModal from "./DictionaryModal";
import { useAuth } from "@/lib/auth";

const directLinks = [
  { href: "/", label: "Lộ trình học", icon: "🎯" },
  { href: "/today", label: "Nhiệm vụ hôm nay", icon: "📅" },
  { href: "/statistics", label: "Thống kê tiến độ", icon: "📊" },
];

const skillLinks = [
  { href: "/sprint", label: "Game Sprint", desc: "Phản xạ từ vựng siêu tốc", icon: "⚡" },
  { href: "/roleplay", label: "Hội thoại AI", desc: "Luyện nói tự nhiên cùng AI", icon: "📞" },
  { href: "/journal", label: "Nhật ký phản xạ", desc: "Viết nhật ký, sửa lỗi cùng AI", icon: "✍️" },
  { href: "/shadowing", label: "Luyện Shadowing", desc: "Nhại giọng cải thiện phát âm", icon: "🗣️" },
  { href: "/listening", label: "Luyện nghe thụ động", desc: "Nghe hội thoại theo ngữ cảnh", icon: "🎧" },
  { href: "/listening-exercises", label: "Bài tập nghe hiểu", desc: "Nghe & trả lời trắc nghiệm", icon: "📝" },
];

const resourceLinks = [
  { href: "/notes", label: "Sổ tay từ vựng", desc: "Từ vựng cá nhân lưu trữ", icon: "📓" },
  { href: "/review", label: "Hệ thống Ôn tập", desc: "SRS nhớ lâu, phản xạ nhanh", icon: "🔁" },
  { href: "/errors", label: "Sổ lỗi cá nhân", desc: "Gom lỗi từ nhật ký/hội thoại", icon: "📕" },
  { href: "/vocab", label: "Từ vựng cốt lõi", desc: "Thư viện cụm từ thông dụng", icon: "🎒" },
  { href: "/grammar", label: "Kiến thức Ngữ pháp", desc: "Học cấu trúc & làm bài tập", icon: "📚" },
];

export default function Nav() {
  const pathname = usePathname();
  const { isAnonymous, displayName, email, streak } = useAuth();
  const [open, setOpen] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // CMS admin bypass
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* ==========================================
          DESKTOP: Left Sidebar Navigation
          ========================================== */}
      <nav className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border/45 bg-surface/95 backdrop-blur-xl hidden md:flex flex-col justify-between py-6 px-4 select-none">
        
        {/* Branding Logo */}
        <div className="px-3 pb-5 border-b border-border/40">
          <Link href="/" className="group flex flex-col gap-0.5">
            <span className="font-display text-2xl font-black tracking-tight text-gradient-iridescent transition-all duration-300 group-hover:scale-[1.02]">
              SpeakUp
            </span>
            <span className="text-[9px] font-black tracking-[0.25em] text-muted/70 uppercase">
              ACADEMY
            </span>
          </Link>
        </div>

        {/* Scrollable Grouped Links */}
        <div className="flex-1 overflow-y-auto py-5 space-y-7 pr-1 scrollbar-thin">
          
          {/* Group 1: HỌC TẬP */}
          <div className="space-y-2">
            <h3 className="px-3 text-[9px] font-black uppercase tracking-wider text-muted/70">
              Học tập
            </h3>
            <div className="grid gap-1">
              {directLinks.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-black transition-all duration-200 active:scale-98 ${
                      active
                        ? "bg-primary-soft text-primary shadow-sm border border-primary/10"
                        : "text-muted hover:bg-primary-soft/40 hover:text-foreground border border-transparent"
                    }`}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Group 2: KỸ NĂNG NÓI */}
          <div className="space-y-2">
            <h3 className="px-3 text-[9px] font-black uppercase tracking-wider text-muted/70">
              Kỹ năng nói
            </h3>
            <div className="grid gap-1">
              {skillLinks.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-black transition-all duration-200 active:scale-98 ${
                      active
                        ? "bg-primary-soft text-primary shadow-sm border border-primary/10"
                        : "text-muted hover:bg-primary-soft/40 hover:text-foreground border border-transparent"
                    }`}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Group 3: SỔ TAY & TÀI NGUYÊN */}
          <div className="space-y-2">
            <h3 className="px-3 text-[9px] font-black uppercase tracking-wider text-muted/70">
              Sổ tay & Ôn tập
            </h3>
            <div className="grid gap-1">
              {resourceLinks.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-black transition-all duration-200 active:scale-98 ${
                      active
                        ? "bg-primary-soft text-primary shadow-sm border border-primary/10"
                        : "text-muted hover:bg-primary-soft/40 hover:text-foreground border border-transparent"
                    }`}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Footer Area */}
        <div className="pt-4 border-t border-border/40 space-y-4">
          {/* Policy Links */}
          <div className="flex justify-between px-3 text-[9px] font-bold text-muted/60 hover:text-muted/95 transition-colors">
            <Link href="/privacy" className="hover:underline">Chính sách bảo mật</Link>
            <Link href="/terms" className="hover:underline">Điều khoản</Link>
          </div>

          {/* Profile Card / Login Button */}
          {isAnonymous ? (
            <Link
              href="/login"
              className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-primary-fg transition-all duration-300 hover:opacity-90 active:scale-98 shadow-sm"
            >
              👤 <span>Đăng nhập</span>
            </Link>
          ) : (
            <Link
              href="/account"
              className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-all duration-300 active:scale-98 hover:shadow-md ${
                isActive("/account")
                  ? "border-primary bg-primary-soft/60 text-primary"
                  : "border-border/60 bg-surface/50 text-foreground hover:border-primary/40 hover:bg-surface"
              }`}
            >
              <div className="relative shrink-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-xs font-black text-primary-fg shadow-inner">
                  {(displayName || email || "U").charAt(0).toUpperCase()}
                </span>
                {streak > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-white shadow-md animate-pulse">
                    🔥
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-black truncate text-foreground leading-tight">
                  {displayName || "Học viên"}
                </p>
                <p className="text-[10px] font-semibold truncate text-muted mt-0.5 leading-none">
                  {email || "Chưa có email"}
                </p>
              </div>
            </Link>
          )}
        </div>
      </nav>

      {/* ==========================================
          MOBILE: Sticky Top Header & Drawer
          ========================================== */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-surface/90 backdrop-blur-md md:hidden flex items-center justify-between px-5 py-3 select-none">
        
        {/* Left: Branding Logo */}
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-gradient-iridescent">
          SpeakUp
        </Link>

        {/* Right: Actions & Hamburger */}
        <div className="flex items-center gap-2">
          {/* Quick Dictionary Button */}
          <button
            onClick={() => setDictOpen(true)}
            aria-label="Tra từ điển"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface text-sm transition-all duration-300 hover:border-primary/50 active:scale-95 cursor-pointer shadow-sm"
          >
            🔎
          </button>

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-surface text-foreground transition-all duration-300 hover:border-primary/50 active:scale-95 cursor-pointer shadow-sm"
          >
            <span className="relative flex h-3.5 w-4 flex-col justify-between">
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "translate-y-[6px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "opacity-0" : ""}`} />
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </header>

      {/* MOBILE drawer drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-fadeIn" onClick={() => setOpen(false)}>
          <nav
            onClick={(e) => e.stopPropagation()}
            className="absolute top-[53px] right-0 bottom-0 w-80 max-w-[85vw] bg-background border-l border-border/40 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl animate-fadeIn"
          >
            {/* Scrollable list */}
            <div className="space-y-6 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              
              {/* Group 1 */}
              <div className="space-y-1.5">
                <h4 className="px-3 text-[9px] font-black uppercase tracking-wider text-muted/70">Học tập</h4>
                <div className="grid gap-0.5">
                  {directLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-black transition-all ${
                        isActive(item.href) ? "bg-primary-soft text-primary shadow-sm" : "text-muted hover:bg-primary-soft/20"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span> {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Group 2 */}
              <div className="space-y-1.5">
                <h4 className="px-3 text-[9px] font-black uppercase tracking-wider text-muted/70">Kỹ năng nói</h4>
                <div className="grid gap-0.5">
                  {skillLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-black transition-all ${
                        isActive(item.href) ? "bg-primary-soft text-primary shadow-sm" : "text-muted hover:bg-primary-soft/20"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span> {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Group 3 */}
              <div className="space-y-1.5">
                <h4 className="px-3 text-[9px] font-black uppercase tracking-wider text-muted/70">Sổ tay & Ôn tập</h4>
                <div className="grid gap-0.5">
                  {resourceLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-black transition-all ${
                        isActive(item.href) ? "bg-primary-soft text-primary shadow-sm" : "text-muted hover:bg-primary-soft/20"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span> {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile & bottom */}
            <div className="pt-4 border-t border-border/40 mt-4 space-y-4">
              <div className="flex justify-between px-3 text-[9px] font-bold text-muted/60">
                <Link href="/privacy" className="hover:underline">Chính sách bảo mật</Link>
                <Link href="/terms" className="hover:underline">Điều khoản</Link>
              </div>

              {isAnonymous ? (
                <Link
                  href="/login"
                  className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-primary-fg"
                >
                  👤 <span>Đăng nhập</span>
                </Link>
              ) : (
                <Link
                  href="/account"
                  className={`flex items-center gap-3 rounded-2xl border p-2.5 ${
                    isActive("/account") ? "border-primary bg-primary-soft text-primary" : "border-border/60 bg-surface text-foreground"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-xs font-black text-primary-fg">
                    {(displayName || email || "U").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-black truncate">{displayName || "Học viên"}</p>
                    <p className="text-[10px] font-semibold truncate text-muted">{email}</p>
                  </div>
                  {streak > 0 && <span className="text-amber-500 font-bold">🔥{streak}</span>}
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Dictionary Modal for Mobile Quick Lookup */}
      <DictionaryModal open={dictOpen} onClose={() => setDictOpen(false)} />
    </>
  );
}
