"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

type AuthState = {
  userId: string | null;
  /** true khi đã xác định xong trạng thái đăng nhập (dù có user hay không) */
  ready: boolean;
  /** lỗi đăng nhập (vd. anonymous auth chưa bật trong dashboard) */
  error: string | null;
};

const Ctx = createContext<AuthState>({ userId: null, ready: false, error: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    userId: null,
    ready: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // 1) Có session sẵn chưa?
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData.session?.user ?? null;

      // 2) Chưa có → đăng nhập ẩn danh.
      if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          if (!cancelled)
            setState({ userId: null, ready: true, error: error.message });
          return;
        }
        user = data.user;
      }

      if (!user) {
        if (!cancelled)
          setState({ userId: null, ready: true, error: "Không tạo được phiên." });
        return;
      }

      // 3) Bootstrap hàng profiles (id = auth.uid()). Bỏ qua nếu đã có.
      await supabase
        .from("profiles")
        .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

      if (!cancelled)
        setState({ userId: user.id, ready: true, error: null });
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled)
        setState((s) => ({ ...s, userId: session?.user?.id ?? null }));
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
