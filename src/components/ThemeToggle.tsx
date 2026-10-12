"use client";

import { useEffect, useState } from "react";
import AppIcon from "./AppIcon";

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
      className="theme-toggle"
    >
      <AppIcon name={dark ? "sun" : "moon"} size={16} />{dark ? "Sáng" : "Tối"}
    </button>
  );
}
