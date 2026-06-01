"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const KEY_STORE = "speakup_admin_key";

type AdminAuthCtx = {
  key: string;
  authed: boolean;
  ready: boolean; // đã thử tự đăng nhập từ localStorage xong chưa
  error: string;
  login: (k: string) => Promise<boolean>;
  logout: () => void;
};

const Ctx = createContext<AdminAuthCtx>({
  key: "",
  authed: false,
  ready: false,
  error: "",
  login: async () => false,
  logout: () => {},
});

async function validate(k: string): Promise<boolean> {
  try {
    const r = await fetch("/api/admin/ping", { headers: { "x-admin-key": k } });
    return r.ok;
  } catch {
    return false;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // Tự đăng nhập lại từ localStorage (1 lần) — không bắt nhập lại mỗi trang.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(KEY_STORE) : null;
    if (!saved) {
      setReady(true);
      return;
    }
    validate(saved).then((ok) => {
      if (ok) {
        setKey(saved);
        setAuthed(true);
      } else {
        localStorage.removeItem(KEY_STORE);
      }
      setReady(true);
    });
  }, []);

  const login = useCallback(async (k: string) => {
    setError("");
    const ok = await validate(k);
    if (ok) {
      setKey(k);
      setAuthed(true);
      localStorage.setItem(KEY_STORE, k);
    } else {
      setError("Sai mật mã admin (hoặc server chưa cấu hình).");
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    setKey("");
    setAuthed(false);
    localStorage.removeItem(KEY_STORE);
  }, []);

  return (
    <Ctx.Provider value={{ key, authed, ready, error, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAdminAuth = () => useContext(Ctx);
