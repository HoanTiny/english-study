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
      className="shimmer-edge rounded-xl border border-border bg-surface backdrop-blur-md px-4 py-2 text-xs font-bold text-muted transition-all duration-300 hover:text-foreground hover:border-primary/50 hover:scale-[1.03] active:scale-95 shadow-sm"
    >
      {dark ? "☀️ Sáng" : "🌙 Tối"}
    </button>
  );
}
