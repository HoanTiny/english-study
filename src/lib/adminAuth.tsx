"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

// Quyền admin giờ ĐỒNG BỘ với tài khoản đăng nhập: user có email trong ADMIN_EMAILS
// (kiểm tra ở server qua /api/admin/ping). Không còn mật mã riêng.
type AdminAuthCtx = {
  key: string; // access token Supabase — gửi qua header x-admin-key cho API admin
  authed: boolean; // có quyền vào CMS (admin hoặc editor)
  isAdmin: boolean; // toàn quyền (quản lý tài khoản)
  role: "admin" | "editor" | null;
  ready: boolean; // đã kiểm tra xong
  email: string | null; // email tài khoản đang đăng nhập (để hiển thị)
};

const Ctx = createContext<AdminAuthCtx>({
  key: "",
  authed: false,
  isAdmin: false,
  role: null,
  ready: false,
  email: null,
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<"admin" | "editor" | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const session = data.session;
      const token = session?.access_token ?? "";
      setEmail(session?.user?.email ?? null);
      setKey(token);
      if (!token) {
        setAuthed(false);
        setRole(null);
        setReady(true);
        return;
      }
      try {
        const r = await fetch("/api/admin/ping", { headers: { "x-admin-key": token } });
        const data = (await r.json().catch(() => ({}))) as { role?: "admin" | "editor" };
        if (active) {
          setRole(data.role ?? null);
          setAuthed(!!data.role);
        }
      } catch {
        if (active) {
          setAuthed(false);
          setRole(null);
        }
      } finally {
        if (active) setReady(true);
      }
    }

    refresh();
    // Cập nhật khi đăng nhập/đăng xuất hoặc token được làm mới.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider value={{ key, authed, isAdmin: role === "admin", role, ready, email }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAdminAuth = () => useContext(Ctx);

// Hook độc lập (không cần AdminAuthProvider) — kiểm tra quyền CMS của user hiện tại.
// Dùng ở ngoài khu /admin (vd trang chủ) để hiện nút điều hướng sang CMS.
export function useCmsRole(): "admin" | "editor" | null {
  const [role, setRole] = useState<"admin" | "editor" | null>(null);
  useEffect(() => {
    let active = true;
    async function check() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (active) setRole(null);
        return;
      }
      try {
        const r = await fetch("/api/admin/ping", { headers: { "x-admin-key": token } });
        if (!r.ok) {
          if (active) setRole(null);
          return;
        }
        const d = (await r.json().catch(() => ({}))) as { role?: "admin" | "editor" };
        if (active) setRole(d.role ?? null);
      } catch {
        if (active) setRole(null);
      }
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return role;
}
