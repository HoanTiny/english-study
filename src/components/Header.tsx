"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import DictionaryModal from "./DictionaryModal";
import { useAuth } from "@/lib/auth";

export default function Header() {
  const { isAnonymous, streak } = useAuth();
  const [dictOpen, setDictOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setDictOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex h-16 items-center justify-between gap-4 px-6 md:px-8">
          
          {/* Left Side: Interactive Search Input (Trigger for DictionaryModal) */}
          <div className="flex-1 max-w-md">
            <button
              onClick={() => setDictOpen(true)}
              className="flex w-full items-center justify-between gap-3 rounded-full border border-border/60 bg-surface/50 px-4 py-2 text-left text-xs font-semibold text-muted transition-all duration-300 hover:border-primary/50 hover:bg-surface active:scale-[0.99] cursor-pointer shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span>🔎</span>
                <span>Tìm cụm từ, bài học, ghi chú...</span>
              </span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/80 bg-background px-1.5 font-mono text-[9px] font-bold text-muted/80">
                <span className="text-[10px]">Ctrl</span>K
              </kbd>
            </button>
          </div>

          {/* Right Side: Utilities & Quick Profile */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Quick Streak Pop for Logged-in User */}
            {!isAnonymous && streak > 0 && (
              <div className="flex h-9 items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/5 px-3 text-xs font-black text-orange-600 dark:text-orange-400 select-none">
                <span>🔥</span>
                <span>{streak} ngày</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dictionary Modal Popup */}
      <DictionaryModal open={dictOpen} onClose={() => setDictOpen(false)} />
    </>
  );
}
