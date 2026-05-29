"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Lộ trình" },
  { href: "/today", label: "Hôm nay" },
  { href: "/journal", label: "Nhật ký" },
  { href: "/shadowing", label: "Shadowing" },
  { href: "/notes", label: "Sổ tay" },
  { href: "/review", label: "Ôn tập" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-5xl px-4 pointer-events-none">
      <div className="liquid-nav pointer-events-auto flex items-center justify-between gap-4 rounded-2xl px-5 py-3 transition-all duration-500">
        <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight transition-transform hover:scale-105 active:scale-95">
          <span className="text-gradient-iridescent">SpeakUp</span>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent"></span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-3.5 py-2 transition-all duration-300 ${
                  active
                    ? "bg-primary/15 text-primary shadow-[0_4px_16px_-4px_rgba(99,102,241,0.25)] border border-primary/20 backdrop-blur-md font-semibold scale-102"
                    : "text-muted hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 border border-transparent"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

