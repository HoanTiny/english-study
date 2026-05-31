"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import DictionaryModal from "./DictionaryModal";

const links = [
  { href: "/", label: "Lộ trình" },
  { href: "/today", label: "Hôm nay" },
  { href: "/journal", label: "Nhật ký" },
  { href: "/vocab", label: "Từ vựng" },
  { href: "/grammar", label: "Ngữ pháp" },
  { href: "/listening", label: "Luyện nghe" },
  { href: "/shadowing", label: "Shadowing" },
  { href: "/roleplay", label: "Hội thoại" },
  { href: "/notes", label: "Sổ tay" },
  { href: "/review", label: "Ôn tập" },
  { href: "/statistics", label: "Thống kê" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-xl text-primary transition-transform hover:scale-105 active:scale-95"
          >
            SpeakUp
          </Link>
        </div>

        {/* Menu ngang — từ md trở lên */}
        <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3 py-2 transition-all duration-200 ${
                isActive(l.href)
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-primary-soft/40 hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Tra từ điển"
            onClick={() => setDictOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition-all duration-300 hover:border-primary/50 active:scale-95"
          >
            🔎 <span className="hidden sm:inline">Tra từ</span>
          </button>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Mở menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-all duration-300 hover:border-primary/50 active:scale-95 md:hidden"
          >
            <span className="relative flex h-4 w-5 flex-col justify-between">
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "opacity-0" : ""}`} />
              <span className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Panel menu mobile */}
      {open && (
        <nav className="grid grid-cols-2 gap-1.5 border-t border-border bg-background p-3 text-sm font-semibold animate-fadeIn md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3.5 py-2.5 text-center transition-all duration-200 ${
                isActive(l.href)
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-primary-soft/40 hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}

      <DictionaryModal open={dictOpen} onClose={() => setDictOpen(false)} />
    </header>
  );
}
