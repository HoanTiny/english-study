"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import DictionaryModal from "./DictionaryModal";
import AppIcon from "./AppIcon";
import { useAuth } from "@/lib/auth";
import { useCmsRole } from "@/lib/adminAuth";
import { learningLinks, practiceLinks, libraryLinks, type NavItem } from "@/lib/navigation";

export default function Nav() {
  const pathname = usePathname();
  const { isAnonymous, displayName, email } = useAuth();
  const cmsRole = useCmsRole();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  const practicing = pathname === "/practice" || practiceLinks.some(i => active(i.href)) || libraryLinks.some(i => active(i.href)) || active("/roleplay");
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const content = document.getElementById("app-content");
    const bottom = document.getElementById("mobile-tabs");
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (content) content.inert = true;
    if (bottom) bottom.inert = true;
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (media.matches) setOpen(false); };
    const focusable = () => Array.from(document.querySelectorAll<HTMLElement>("#mobile-app-header a, #mobile-app-header button, #mobile-navigation a, #mobile-navigation button")).filter(e => e.getClientRects().length);
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
      if (e.key !== "Tab") return;
      const all = focusable(), first = all[0], last = all.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    document.getElementById("mobile-navigation")?.querySelector<HTMLElement>("a")?.focus();
    document.addEventListener("keydown", keydown);
    media.addEventListener("change", closeOnDesktop);
    const trigger = menuButton.current;
    return () => {
      document.body.style.overflow = oldOverflow;
      if (content) content.inert = false;
      if (bottom) bottom.inert = false;
      document.removeEventListener("keydown", keydown);
      media.removeEventListener("change", closeOnDesktop);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);
  function navLink(item: NavItem) {
    return <Link key={item.href} href={item.href} className={`nav-item ${active(item.href) ? "is-active" : ""}`} aria-current={active(item.href) ? "page" : undefined} title={collapsed ? item.label : undefined} onClick={() => setOpen(false)}><AppIcon name={item.icon} /><span className="nav-label">{item.label}</span></Link>;
  }
  const name = isAnonymous ? "Khách học tập" : displayName || email || "Học viên";
  const profile = <Link href={isAnonymous ? "/login" : "/account"} className="nav-profile" onClick={() => setOpen(false)} title={collapsed ? name : undefined}><span className="avatar">{isAnonymous ? <AppIcon name="user" /> : name.charAt(0).toUpperCase()}</span><span className="nav-label"><strong>{name}</strong><small>{isAnonymous ? "Đăng nhập để đồng bộ" : "Tài khoản của bạn"}</small></span><AppIcon name="chevron" size={16} className="nav-label" /></Link>;
  const practiceItem: NavItem = { href: "/practice", label: "Tất cả kỹ năng", icon: "grid", description: "" };
  return <>
    <aside className="sidebar" data-collapsed={collapsed}>
      <Link href="/today" className="brand" aria-label="SpeakUp, học hôm nay"><span className="brand-mark"><AppIcon name="chat" size={22} /></span><span className="nav-label">SpeakUp<span className="brand-caption">Mỗi ngày một chút tiến bộ</span></span></Link>
      <nav className="sidebar-scroll" aria-label="Điều hướng chính"><p className="nav-group-label">Không gian học</p>{learningLinks.map(navLink)}<p className="nav-group-label">Khám phá</p>{navLink(practiceItem)}{libraryLinks.filter(i => ["/vocab", "/grammar", "/notes"].includes(i.href)).map(navLink)}{cmsRole && <Link href="/admin/lessons" className="nav-item" title="Quản trị"><AppIcon name="settings" /><span className="nav-label">Quản trị</span></Link>}</nav>
      <div className="sidebar-footer"><button className="nav-item collapse-toggle" onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"} title={collapsed ? "Mở rộng sidebar" : undefined}><AppIcon name="collapse" /><span className="nav-label">Thu gọn menu</span></button>{profile}<div className="nav-legal nav-label"><Link href="/privacy">Bảo mật</Link><Link href="/terms">Điều khoản</Link></div></div>
    </aside>
    <header id="mobile-app-header" className="mobile-header"><Link href="/today" className="brand"><span className="brand-mark"><AppIcon name="chat" /></span><span>SpeakUp</span></Link><div className="mobile-actions"><button className="icon-button" onClick={() => { setOpen(false); setDictOpen(true); }} aria-label="Tra từ điển"><AppIcon name="search" /></button><button ref={menuButton} className="icon-button" onClick={() => setOpen(v => !v)} aria-label={open ? "Đóng menu" : "Menu"} aria-expanded={open} aria-controls="mobile-navigation"><AppIcon name={open ? "close" : "menu"} /></button></div></header>
    {open && <div className="mobile-menu-backdrop" onClick={() => setOpen(false)}><nav id="mobile-navigation" className="mobile-menu" aria-label="Điều hướng trên điện thoại" onClick={e => e.stopPropagation()}><p className="nav-group-label">Học tập</p>{learningLinks.map(navLink)}<p className="nav-group-label">Luyện tập</p>{navLink(practiceItem)}{practiceLinks.map(navLink)}<p className="nav-group-label">Thư viện của bạn</p>{libraryLinks.map(navLink)}{cmsRole && <Link href="/admin/lessons" className="nav-item" onClick={() => setOpen(false)}><AppIcon name="settings" />Quản trị</Link>}<div className="mobile-menu-footer"><ThemeToggle />{profile}<div className="nav-legal"><Link href="/privacy">Bảo mật</Link><Link href="/terms">Điều khoản</Link></div></div></nav></div>}
    <nav id="mobile-tabs" className="mobile-tabs" aria-label="Điều hướng nhanh">{([{ href: "/today", label: "Hôm nay", icon: "home", selected: active("/today") }, { href: "/", label: "Lộ trình", icon: "map", selected: pathname === "/" || pathname.startsWith("/lesson/") }, { href: "/practice", label: "Luyện tập", icon: "headphones", selected: practicing || active("/review") }, { href: "/account", label: "Cá nhân", icon: "user", selected: active("/account") || active("/statistics") }] as const).map(i => <Link key={i.href} href={i.href} aria-current={i.selected ? "page" : undefined} className={i.selected ? "is-active" : ""}><span><AppIcon name={i.icon} /></span>{i.label}</Link>)}</nav>
    <DictionaryModal open={dictOpen} onClose={() => setDictOpen(false)} />
  </>;
}
