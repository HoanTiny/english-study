"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Lộ trình" },
  { href: "/today", label: "Hôm nay" },
  { href: "/journal", label: "Nhật ký" },
  { href: "/shadowing", label: "Shadowing" },
  { href: "/roleplay", label: "Hội thoại" },
  { href: "/notes", label: "Sổ tay" },
  { href: "/review", label: "Ôn tập" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Đóng menu mobile mỗi khi chuyển trang.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-5xl px-4 pointer-events-none">
      <div className="liquid-nav pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all duration-500 sm:px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-xl font-extrabold tracking-tight transition-transform hover:scale-105 active:scale-95"
        >
          <span className="text-gradient-iridescent">SpeakUp</span>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent"></span>
        </Link>

        {/* Menu ngang — chỉ hiện từ md trở lên */}
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3.5 py-2 transition-all duration-300 ${
                isActive(l.href)
                  ? "bg-primary/15 text-primary shadow-[0_4px_16px_-4px_rgba(99,102,241,0.25)] border border-primary/20 backdrop-blur-md font-semibold scale-102"
                  : "text-muted hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 border border-transparent"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {/* Nút hamburger — chỉ hiện dưới md */}
          <button
            type="button"
            aria-label="Mở menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/30 text-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 active:scale-95 dark:bg-white/5 md:hidden"
          >
            <span className="relative flex h-4 w-5 flex-col justify-between">
              <span
                className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`}
              />
              <span
                className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Panel menu mobile */}
      {open && (
        <nav className="liquid-nav pointer-events-auto mt-2 grid grid-cols-2 gap-1.5 rounded-2xl p-3 text-sm font-medium animate-fadeIn md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3.5 py-2.5 text-center transition-all duration-300 ${
                isActive(l.href)
                  ? "bg-primary/15 text-primary border border-primary/20 font-semibold"
                  : "text-muted hover:text-foreground hover:bg-white/10 border border-transparent dark:hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
