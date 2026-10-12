"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import DictionaryModal from "./DictionaryModal";
import AppIcon from "./AppIcon";
import { useAuth } from "@/lib/auth";
import { routeTitle } from "@/lib/navigation";
export default function Header() {
  const { displayName, streak, isAnonymous } = useAuth();
  const pathname = usePathname();
  const [dictOpen, setDictOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setDictOpen(true); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <><header className="desktop-header"><div className="header-location"><span>Không gian học</span><span aria-hidden="true">/</span><strong>{routeTitle(pathname)}</strong></div><div className="header-actions"><button className="dictionary-trigger" onClick={() => setDictOpen(true)}><AppIcon name="search" size={18} /><span>Tra từ điển…</span><kbd>Ctrl K</kbd></button>{!isAnonymous && streak > 0 && <span className="header-streak">{streak} ngày liên tiếp</span>}<ThemeToggle /><Link href={isAnonymous ? "/login" : "/account"} className="avatar" aria-label="Tài khoản">{(displayName || "S").charAt(0).toUpperCase()}</Link></div></header><DictionaryModal open={dictOpen} onClose={() => setDictOpen(false)} /></>;
}
