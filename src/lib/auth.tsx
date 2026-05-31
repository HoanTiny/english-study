"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile, touchStreak, getProfile } from "@/lib/profileRepo";

type AuthState = {
  userId: string | null;
  /** true khi đã xác định xong trạng thái đăng nhập */
  ready: boolean;
  /** lỗi đăng nhập (vd. anonymous auth chưa bật) */
  error: string | null;
  /** email nếu là tài khoản thật (null nếu ẩn danh) */
  email: string | null;
  /** đang dùng phiên ẩn danh? */
  isAnonymous: boolean;
  displayName: string | null;
  streak: number;
  /** đã chọn trình độ (onboarding) chưa */
  onboarded: boolean;
  /** đã tải xong profile (để cổng onboarding không hành động sớm) */
  profileReady: boolean;
  // Hành động
  signUpEmail: (email: string, password: string, name?: string) => Promise<{ needConfirm: boolean }>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** đánh dấu đã onboard (gọi sau khi chọn trình độ để cổng không đá lại) */
  markOnboarded: () => void;
};

const noop = async () => {};
const Ctx = createContext<AuthState>({
  userId: null,
  ready: false,
  error: null,
  email: null,
  isAnonymous: true,
  displayName: null,
  streak: 0,
  onboarded: false,
  profileReady: false,
  signUpEmail: async () => ({ needConfirm: false }),
  signInEmail: noop,
  signInGoogle: noop,
  signOut: noop,
  markOnboarded: () => {},
});

type UserLite = { id: string; email: string | null; isAnonymous: boolean };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [onboarded, setOnboarded] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastProfiledId = useRef<string | null>(null);

  const markOnboarded = useCallback(() => setOnboarded(true), []);

  // Đồng bộ profile + streak cho user hiện tại (chạy 1 lần / user).
  const syncProfile = useCallback(async (u: UserLite) => {
    if (lastProfiledId.current === u.id) return;
    lastProfiledId.current = u.id;
    setProfileReady(false);
    try {
      await ensureProfile(u.id, u.email, (u as { displayName?: string }).displayName ?? null);
      const [p, s] = await Promise.all([getProfile(u.id), touchStreak(u.id)]);
      setOnboarded(p.onboarded);
      setStreak(s);
    } catch {
      /* bỏ qua lỗi profile để không chặn app */
    } finally {
      setProfileReady(true);
    }
  }, []);

  const applyUser = useCallback(
    (user: { id: string; email?: string | null; is_anonymous?: boolean; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) {
        setUserId(null);
        setEmail(null);
        setIsAnonymous(true);
        setDisplayName(null);
        return;
      }
      const anon = user.is_anonymous ?? !user.email;
      setUserId(user.id);
      setEmail(user.email ?? null);
      setIsAnonymous(anon);
      const name = (user.user_metadata?.display_name as string) ?? (user.user_metadata?.full_name as string) ?? null;
      setDisplayName(name);
      void syncProfile({ id: user.id, email: user.email ?? null, isAnonymous: anon });
    },
    [syncProfile],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData.session?.user ?? null;

      if (!user) {
        const { data, error: err } = await supabase.auth.signInAnonymously();
        if (err) {
          if (!cancelled) {
            setError(err.message);
            setReady(true);
          }
          return;
        }
        user = data.user;
      }

      if (!cancelled) {
        applyUser(user);
        setReady(true);
      }
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      applyUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applyUser]);

  const signUpEmail = useCallback(async (em: string, pw: string, name?: string) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email: em,
      password: pw,
      options: { data: name ? { display_name: name } : undefined },
    });
    if (err) throw new Error(err.message);
    // Nếu bật "Confirm email", session sẽ null → cần xác nhận qua email.
    return { needConfirm: !data.session };
  }, []);

  const signInEmail = useCallback(async (em: string, pw: string) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: em, password: pw });
    if (err) throw new Error(err.message);
  }, []);

  const signInGoogle = useCallback(async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined },
    });
    if (err) throw new Error(err.message);
  }, []);

  const signOut = useCallback(async () => {
    lastProfiledId.current = null;
    setOnboarded(false);
    await supabase.auth.signOut();
    // Đăng nhập ẩn danh lại để app vẫn hoạt động.
    const { data } = await supabase.auth.signInAnonymously();
    applyUser(data.user ?? null);
  }, [applyUser]);

  return (
    <Ctx.Provider
      value={{ userId, ready, error, email, isAnonymous, displayName, streak, onboarded, profileReady, signUpEmail, signInEmail, signInGoogle, signOut, markOnboarded }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
