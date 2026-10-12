"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AppIcon from "@/components/AppIcon";

export default function LoginPage() {
  const router = useRouter();
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function submit() {
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "in") {
        await signInEmail(email.trim(), pw);
        router.push("/today");
      } else {
        const { needConfirm } = await signUpEmail(email.trim(), pw, name.trim() || undefined);
        if (needConfirm) {
          setInfo("Đã gửi email xác nhận. Vui lòng mở email và bấm link để kích hoạt tài khoản, rồi đăng nhập.");
          setMode("in");
        } else {
          router.push("/onboarding");
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr("");
    setBusy(true);
    try {
      await signInGoogle(); // sẽ chuyển hướng sang Google
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không mở được đăng nhập Google.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md items-center px-4 py-8 sm:py-12 animate-fadeIn">
      <div className="w-full liquid-glass-card flex flex-col gap-5 p-5 sm:p-8">
        <div className="text-center">
          <span className="brand-mark mx-auto"><AppIcon name="chat" /></span>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-foreground">
            {mode === "in" ? "Đăng nhập SpeakUp" : "Tạo tài khoản"}
          </h1>
          <p className="mt-1 text-xs font-semibold text-muted">
            Giữ lại tiến bộ của bạn, học tiếp trên mọi thiết bị.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-full border border-border/60 bg-surface/50 p-1">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setErr(""); setInfo(""); }}
              className={`flex-1 rounded-full py-2 text-xs font-bold tracking-normal transition-all ${mode === m ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {m === "in" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        {/* Google */}
        <button
          onClick={google}
          disabled={busy}
          className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-border/60 bg-background/50 py-3 text-xs font-bold tracking-normal text-foreground hover:border-primary/50 disabled:opacity-50"
        >
          <svg viewBox="0 0 48 48" className="h-4.5 w-4.5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C42.5 35.4 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
          Tiếp tục với Google
        </button>

        <div className="flex items-center gap-3 text-xs font-bold uppercase text-muted">
          <span className="h-px flex-1 bg-border/60" /> hoặc <span className="h-px flex-1 bg-border/60" />
        </div>

        {/* Form email */}
        <div className="space-y-3">
          {mode === "up" && (
            <label className="block text-sm font-medium">Tên hiển thị <span className="text-muted font-normal">(tuỳ chọn)</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên của bạn" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-normal text-foreground focus:border-primary" /></label>
          )}
          <label className="block text-sm font-medium">Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-normal text-foreground focus:border-primary" /></label>
          <label className="block text-sm font-medium">Mật khẩu<input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && email.trim() && pw && submit()} placeholder="Nhập mật khẩu" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-normal text-foreground focus:border-primary" /></label>
        </div>

        {err && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600">{err}</p>}
        {info && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600">{info}</p>}

        <button onClick={submit} disabled={busy || !email.trim() || !pw} className="liquid-glass-btn py-3.5 text-xs font-bold tracking-normal disabled:opacity-50">
          {busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>

        <Link href="/today" className="text-center text-xs font-bold text-muted hover:text-foreground">
          Tiếp tục dùng thử không cần tài khoản →
        </Link>
      </div>
    </main>
  );
}
