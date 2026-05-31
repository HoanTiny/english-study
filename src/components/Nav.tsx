"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import DictionaryModal from "./DictionaryModal";
import { useAuth } from "@/lib/auth";

const directLinks = [
  { href: "/", label: "Lộ trình", icon: "🎯" },
  { href: "/today", label: "Hôm nay", icon: "📅" },
  { href: "/statistics", label: "Thống kê", icon: "📊" },
];

const skillLinks = [
  { href: "/sprint", label: "Game Sprint", desc: "Phản xạ từ vựng siêu tốc + AI", icon: "⚡" },
  { href: "/roleplay", label: "Hội thoại AI", desc: "Luyện nói tự nhiên cùng AI", icon: "📞" },
  { href: "/journal", label: "Nhật ký phản xạ", desc: "Viết nhật ký, nhận phản hồi AI", icon: "✍️" },
  { href: "/listening", label: "Luyện nghe", desc: "Nghe hội thoại theo ngữ cảnh", icon: "🎧" },
  { href: "/shadowing", label: "Luyện Shadowing", desc: "Nhại giọng, cải thiện phát âm", icon: "🗣️" },
];

const resourceLinks = [
  { href: "/notes", label: "Sổ tay từ vựng", desc: "Từ vựng cá nhân lưu trữ", icon: "📓" },
  { href: "/review", label: "Hệ thống Ôn tập", desc: "SRS nhớ lâu, phản xạ nhanh", icon: "🔁" },
  { href: "/vocab", label: "Từ vựng cốt lõi", desc: "Thư viện cụm từ thông dụng", icon: "🎒" },
  { href: "/grammar", label: "Kiến thức Ngữ pháp", desc: "Học cấu trúc, làm bài tập", icon: "📚" },
];

export default function Nav() {
  const pathname = usePathname();
  const { isAnonymous, displayName, email, streak } = useAuth();
  const [open, setOpen] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);
  const [mobileSkillsOpen, setMobileSkillsOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isChildActive = (items: { href: string }[]) =>
    items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="liquid-nav sticky top-0 z-50 w-full transition-all duration-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight text-gradient-iridescent transition-all duration-300 hover:scale-[1.05] active:scale-95 flex items-center gap-2"
          >
            SpeakUp
          </Link>
        </div>

        {/* Menu ngang — từ md trở lên (Grouped) */}
        <nav className="hidden items-center gap-1.5 text-xs font-bold md:flex">
          {/* Lộ trình */}
          <Link
            href="/"
            className={`rounded-xl px-3.5 py-2.5 transition-all duration-300 active:scale-95 ${
              isActive("/")
                ? "bg-primary-soft text-primary shadow-sm"
                : "text-muted hover:bg-primary-soft/40 hover:text-foreground"
            }`}
          >
            Lộ trình
          </Link>

          {/* Hôm nay */}
          <Link
            href="/today"
            className={`rounded-xl px-3.5 py-2.5 transition-all duration-300 active:scale-95 ${
              isActive("/today")
                ? "bg-primary-soft text-primary shadow-sm"
                : "text-muted hover:bg-primary-soft/40 hover:text-foreground"
            }`}
          >
            Hôm nay
          </Link>

          {/* Dropdown Kỹ năng */}
          <div className="relative group py-2">
            <button
              className={`flex items-center gap-1 cursor-pointer rounded-xl px-3.5 py-2.5 transition-all duration-300 ${
                isChildActive(skillLinks)
                  ? "bg-primary-soft text-primary font-black"
                  : "text-muted hover:bg-primary-soft/40 hover:text-foreground"
              }`}
            >
              Kỹ năng <span className="text-[9px] opacity-80">▼</span>
            </button>
            
            {/* Popover container */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-80 invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="liquid-glass-card p-3 grid gap-1 bg-surface/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl">
                <div className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-muted/70 border-b border-border/40 mb-1">Kỹ năng phản xạ nói</div>
                {skillLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-primary-soft/50 group/item ${
                      pathname.startsWith(item.href) ? "bg-primary-soft/60 text-primary" : "text-foreground"
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-black transition-colors group-hover/item:text-primary ${
                        pathname.startsWith(item.href) ? "text-primary" : "text-foreground"
                      }`}>
                        {item.label}
                      </p>
                      <p className="text-[10px] font-bold text-muted mt-0.5 leading-normal">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Dropdown Tài nguyên */}
          <div className="relative group py-2">
            <button
              className={`flex items-center gap-1 cursor-pointer rounded-xl px-3.5 py-2.5 transition-all duration-300 ${
                isChildActive(resourceLinks)
                  ? "bg-primary-soft text-primary font-black"
                  : "text-muted hover:bg-primary-soft/40 hover:text-foreground"
              }`}
            >
              Sổ tay & Ôn tập <span className="text-[9px] opacity-80">▼</span>
            </button>
            
            {/* Popover container */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-80 invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="liquid-glass-card p-3 grid gap-1 bg-surface/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl">
                <div className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-muted/70 border-b border-border/40 mb-1">Sổ tay học tập</div>
                {resourceLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-primary-soft/50 group/item ${
                      pathname.startsWith(item.href) ? "bg-primary-soft/60 text-primary" : "text-foreground"
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-black transition-colors group-hover/item:text-primary ${
                        pathname.startsWith(item.href) ? "text-primary" : "text-foreground"
                      }`}>
                        {item.label}
                      </p>
                      <p className="text-[10px] font-bold text-muted mt-0.5 leading-normal">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Thống kê */}
          <Link
            href="/statistics"
            className={`rounded-xl px-3.5 py-2.5 transition-all duration-300 active:scale-95 ${
              isActive("/statistics")
                ? "bg-primary-soft text-primary shadow-sm"
                : "text-muted hover:bg-primary-soft/40 hover:text-foreground"
            }`}
          >
            Thống kê
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Tra từ điển"
            onClick={() => setDictOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-4 text-xs font-black text-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary-soft/20 active:scale-95 cursor-pointer shadow-sm"
          >
            🔎 <span className="hidden sm:inline">Tra từ</span>
          </button>
          <ThemeToggle />

          {/* Tài khoản / Đăng nhập */}
          {isAnonymous ? (
            <Link
              href="/login"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-black text-primary-fg transition-all duration-300 hover:opacity-90 active:scale-95 shadow-sm"
            >
              👤 <span className="hidden sm:inline">Đăng nhập</span>
            </Link>
          ) : (
            <Link
              href="/account"
              title={email ?? "Tài khoản"}
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-black transition-all duration-300 active:scale-95 shadow-sm ${
                isActive("/account") ? "border-primary bg-primary-soft text-primary" : "border-border/60 bg-surface text-foreground hover:border-primary/50"
              }`}
            >
              {streak > 0 && <span className="text-amber-500">🔥{streak}</span>}
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-[11px] text-primary-fg">
                {(displayName || email || "U").charAt(0).toUpperCase()}
              </span>
            </Link>
          )}
          
          {/* Hamburger Mobile */}
          <button
            type="button"
            aria-label="Mở menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-surface text-foreground transition-all duration-300 hover:border-primary/50 active:scale-95 md:hidden cursor-pointer shadow-sm"
          >
            <span className="relative flex h-4 w-5 flex-col justify-between">
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "opacity-0" : ""}`} />
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Panel menu mobile (Responsive Fold) */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-border bg-background p-4 text-sm font-semibold md:hidden animate-fadeIn max-h-[calc(100vh-80px)] overflow-y-auto">
          {/* Direct Lộ trình */}
          <Link
            href="/"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
              pathname === "/" ? "bg-primary-soft text-primary shadow-sm" : "text-muted hover:bg-primary-soft/20"
            }`}
          >
            <span>🎯</span> Lộ trình
          </Link>
          
          {/* Direct Hôm nay */}
          <Link
            href="/today"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
              pathname.startsWith("/today") ? "bg-primary-soft text-primary shadow-sm" : "text-muted hover:bg-primary-soft/20"
            }`}
          >
            <span>📅</span> Hôm nay
          </Link>

          {/* Accordion Kỹ năng */}
          <div className="border-t border-border/40 my-1 pt-1">
            <button
              onClick={() => setMobileSkillsOpen(!mobileSkillsOpen)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                isChildActive(skillLinks) ? "text-primary font-bold" : "text-muted hover:bg-primary-soft/20"
              }`}
            >
              <span className="flex items-center gap-3">🎙️ Kỹ năng phản xạ</span>
              <span className="text-xs transition-transform duration-300">{mobileSkillsOpen ? "▲" : "▼"}</span>
            </button>
            {mobileSkillsOpen && (
              <div className="pl-6 grid gap-1 mt-1 animate-fadeIn">
                {skillLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all text-xs ${
                      pathname.startsWith(item.href) ? "bg-primary-soft/60 text-primary shadow-sm" : "text-muted hover:bg-primary-soft/20 hover:text-foreground"
                    }`}
                  >
                    <span>{item.icon}</span> {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Accordion Tài nguyên */}
          <div className="border-t border-border/40 my-1 pt-1">
            <button
              onClick={() => setMobileResourcesOpen(!mobileResourcesOpen)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                isChildActive(resourceLinks) ? "text-primary font-bold" : "text-muted hover:bg-primary-soft/20"
              }`}
            >
              <span className="flex items-center gap-3">📚 Sổ tay & Ôn tập</span>
              <span className="text-xs transition-transform duration-300">{mobileResourcesOpen ? "▲" : "▼"}</span>
            </button>
            {mobileResourcesOpen && (
              <div className="pl-6 grid gap-1 mt-1 animate-fadeIn">
                {resourceLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all text-xs ${
                      pathname.startsWith(item.href) ? "bg-primary-soft/60 text-primary shadow-sm" : "text-muted hover:bg-primary-soft/20 hover:text-foreground"
                    }`}
                  >
                    <span>{item.icon}</span> {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Direct Thống kê */}
          <div className="border-t border-border/40 my-1 pt-1">
            <Link
              href="/statistics"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                pathname.startsWith("/statistics") ? "bg-primary-soft text-primary shadow-sm" : "text-muted hover:bg-primary-soft/20"
              }`}
            >
              <span>📊</span> Thống kê
            </Link>
          </div>
        </nav>
      )}

      <DictionaryModal open={dictOpen} onClose={() => setDictOpen(false)} />
    </header>
  );
}
