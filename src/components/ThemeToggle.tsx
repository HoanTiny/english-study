"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Đổi giao diện sáng/tối"
      className="rounded-xl border border-border bg-white/20 dark:bg-white/5 backdrop-blur-md px-3.5 py-2 text-sm text-muted transition-all duration-300 hover:text-foreground hover:scale-105 active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_var(--glow-color)]"
    >
      {dark ? "☀️ Sáng" : "🌙 Tối"}
    </button>
  );
}
