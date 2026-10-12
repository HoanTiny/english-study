"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import AppIcon, { type IconName } from "@/components/AppIcon";
import ThemeToggle from "@/components/ThemeToggle";

const NAV: { href: string; label: string; icon: IconName; desc: string }[] = [
  { href: "/admin/lessons", label: "Bài học", icon: "book", desc: "Nội dung & audio" },
  { href: "/admin/vocabulary", label: "Từ vựng", icon: "grid", desc: "Ảnh minh họa & audio US/UK" },
  { href: "/admin/listening-exercises", label: "Bài tập nghe", icon: "edit", desc: "Audio & câu hỏi" },
  { href: "/admin/listening", label: "Video nghe", icon: "headphones", desc: "Thư viện YouTube" },
];
async function adminSignOut(redirect: string) {
  try { await supabase.auth.signOut(); } catch { /* Navigate to the login even if local sign-out fails. */ }
  window.location.href = redirect;
}
function AccessScreen() {
  const { email } = useAdminAuth();
  return <main className="cms-access"><div className="study-panel"><span className="feature-icon"><AppIcon name="settings" size={24} /></span><p className="eyebrow mt-5">Không gian quản trị</p><h1 className="mt-2 text-2xl font-bold">SpeakUp CMS</h1><p className="mt-3 text-sm text-muted">{email ? <>Tài khoản <strong>{email}</strong> chưa có quyền quản trị.</> : "Đăng nhập bằng tài khoản quản trị để quản lý nội dung học tập."}</p>{email ? <button onClick={() => adminSignOut("/login")} className="liquid-glass-btn mt-6 w-full">Đăng nhập tài khoản khác</button> : <Link href="/login" className="liquid-glass-btn mt-6 w-full">Đăng nhập</Link>}<Link href="/today" className="mt-5 block text-center text-sm text-muted">← Quay lại học tập</Link></div></main>;
}
function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { isAdmin, email } = useAdminAuth();
  const nav = isAdmin ? [...NAV, { href: "/admin/users", label: "Tài khoản", icon: "user" as const, desc: "Phân quyền & token AI" }] : NAV;
  const current = nav.find(i => path === i.href || path.startsWith(i.href + "/"));
  return <div className="app-shell cms-shell">
    <a href="#cms-content" className="skip-link">Đến nội dung quản trị</a>
    <aside className="sidebar"><Link href="/admin/lessons" className="brand"><span className="brand-mark"><AppIcon name="chat" /></span><span>SpeakUp<span className="brand-caption">Không gian quản trị</span></span></Link><nav className="sidebar-scroll" aria-label="Điều hướng quản trị"><p className="nav-group-label">Quản lý nội dung</p>{nav.map(i => <Link key={i.href} href={i.href} className={`nav-item ${current?.href === i.href ? "is-active" : ""}`} aria-current={current?.href === i.href ? "page" : undefined}><AppIcon name={i.icon} /><span>{i.label}<small className="block text-xs font-normal text-muted mt-1">{i.desc}</small></span></Link>)}</nav><div className="sidebar-footer"><Link href="/today" className="nav-item"><AppIcon name="home" />Về ứng dụng</Link><p className="px-3 py-2 text-xs text-muted truncate">{email}</p><button onClick={() => adminSignOut("/")} className="nav-item text-warn">Đăng xuất</button></div></aside>
    <header className="mobile-header"><Link href="/today" className="brand"><span className="brand-mark"><AppIcon name="chat" /></span>SpeakUp <small className="text-xs text-muted font-normal">CMS</small></Link><div className="mobile-actions"><ThemeToggle /><button onClick={() => adminSignOut("/")} className="icon-button" aria-label="Đăng xuất"><AppIcon name="user" /></button></div></header>
    <div className="app-content"><header className="desktop-header"><div className="header-location"><span>Quản trị</span><span>/</span><strong>{current?.label ?? "Nội dung"}</strong></div><ThemeToggle /></header><main id="cms-content" tabIndex={-1} className="admin-content p-4 sm:p-6 xl:p-8 animate-fadeIn"><header className="page-heading"><p className="eyebrow">Không gian quản trị</p><h1 className="text-2xl font-semibold">{current?.label ?? "Nội dung"}</h1><p>{current?.desc}</p></header>{children}</main></div>
    <nav className="mobile-tabs" aria-label="Điều hướng quản trị" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>{nav.map(i => <Link key={i.href} href={i.href} className={current?.href === i.href ? "is-active" : ""} aria-current={current?.href === i.href ? "page" : undefined}><span><AppIcon name={i.icon} /></span>{i.label}</Link>)}</nav>
  </div>;
}
function Gate({ children }: { children: React.ReactNode }) {
  const { authed, ready } = useAdminAuth();
  if (!ready) return <div className="cms-access" role="status"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /><span className="sr-only">Đang kiểm tra quyền truy cập…</span></div>;
  if (!authed) return <AccessScreen />;
  return <Shell>{children}</Shell>;
}
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider><Gate>{children}</Gate></AdminAuthProvider>;
}
