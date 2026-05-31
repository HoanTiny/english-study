"use client";

import { useMemo, useState } from "react";
import grammarData from "@/data/grammar.json";
import { TENSES } from "@/data/tenses";

// Tính năng Ngữ pháp — cấu trúc câu hay dùng + chế độ luyện tập (đặt câu → AI chấm).
type Struct = { structure: string; vi: string; example: string; exampleVi: string; level: string };
const ALL = grammarData as Struct[];

const LEVELS = [
  { key: "all", label: "Tất cả" },
  { key: "A1", label: "Cơ bản A1" },
  { key: "A2", label: "Trung cấp A2" },
  { key: "B1", label: "Nâng cao B1" },
];
const LEVEL_CLS: Record<string, string> = {
  A1: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  A2: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400",
  B1: "bg-pink-soft border border-pink/20 text-pink",
};

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

type Result = { ok: boolean | null; feedback: string; suggestion: string };

export default function GrammarPage() {
  const [mode, setMode] = useState<"browse" | "tenses" | "practice">("browse");
  const [level, setLevel] = useState("all");

  // practice state
  const [deck, setDeck] = useState<Struct[]>([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const list = useMemo(
    () => (level === "all" ? ALL : ALL.filter((s) => s.level === level)),
    [level],
  );

  function startPractice() {
    setDeck(shuffle(ALL));
    setIdx(0);
    setTyped("");
    setResult(null);
    setMode("practice");
  }

  const cur = deck[idx];

  async function check() {
    if (!cur || !typed.trim() || checking) return;
    setChecking(true);
    try {
      const res = await fetch("/api/grammar-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structure: cur.structure, sentence: typed }),
      });
      const d = await res.json();
      if (d.source === "unconfigured") {
        setResult({ ok: null, feedback: "Chưa cấu hình Gemini (cần GEMINI_API_KEY) để chấm câu.", suggestion: "" });
      } else if (d.source === "error") {
        setResult({ ok: null, feedback: "Không chấm được lúc này, thử lại sau.", suggestion: "" });
      } else {
        setResult({ ok: d.ok, feedback: d.feedback, suggestion: d.suggestion });
        if (d.suggestion) speak(d.suggestion);
      }
    } catch {
      setResult({ ok: null, feedback: "Lỗi mạng, thử lại sau.", suggestion: "" });
    } finally {
      setChecking(false);
    }
  }

  function nextItem() {
    const n = idx + 1;
    if (n >= deck.length) {
      setMode("browse");
      return;
    }
    setIdx(n);
    setTyped("");
    setResult(null);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 pt-16 animate-fadeIn relative">
      <div className="mb-8 text-center flex flex-col items-center gap-3">
        <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          🧩 CẤU TRÚC NGỮ PHÁP CỐT LÕI
        </span>
        <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">Cấu trúc câu</h1>
        <p className="mt-1 text-xs sm:text-sm font-semibold text-muted max-w-md">
          {ALL.length} cấu trúc tiếng Anh thực chiến. Thực hành rèn đặt câu để ghi nhớ ngữ pháp tự nhiên.
        </p>
      </div>

      {/* Toggle chế độ */}
      <div className="mb-8 flex justify-center">
        <div className="flex gap-1.5 rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-sm p-1.5 shadow-sm">
          <button onClick={() => setMode("browse")} className={`rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 ${mode === "browse" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            📖 Cấu trúc
          </button>
          <button onClick={() => setMode("tenses")} className={`rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 ${mode === "tenses" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            🕐 3 thì cơ bản
          </button>
          <button onClick={() => (mode === "practice" ? null : startPractice())} className={`rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 ${mode === "practice" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            ✍️ Luyện tập đặt câu
          </button>
        </div>
      </div>

      {/* ===== BROWSE ===== */}
      {mode === "browse" && (
        <>
          <div className="mb-8 flex justify-center gap-2.5 flex-wrap">
            {LEVELS.map((l) => (
              <button key={l.key} onClick={() => setLevel(l.key)} className={`rounded-full border px-4 py-2 text-xs font-black transition-all duration-300 active:scale-95 cursor-pointer ${level === l.key ? "border-primary bg-primary text-primary-fg shadow-sm" : "border-border/60 bg-surface text-muted hover:border-primary/50 hover:text-foreground shadow-sm"}`}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="space-y-5">
            {list.map((s, i) => (
              <div key={i} className="liquid-glass-card p-6 shadow-md border border-border/60 bg-white/20 dark:bg-black/10">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <p className="font-display text-base font-extrabold text-primary tracking-tight leading-snug">{s.structure}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${LEVEL_CLS[s.level] ?? "bg-primary-soft border border-primary/20 text-primary"}`}>{s.level}</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-muted">{s.vi}</p>
                {s.example && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface border border-border p-4 shadow-sm">
                    <button onClick={() => speak(s.example)} className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs text-primary transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm" title="Nghe câu mẫu">🔊</button>
                    <div>
                      <p className="text-xs sm:text-sm font-bold italic text-foreground">“{s.example}”</p>
                      {s.exampleVi && <p className="mt-1 text-[10px] font-bold text-muted">{s.exampleVi}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== 3 THÌ CƠ BẢN ===== */}
      {mode === "tenses" && (
        <div className="space-y-8">
          {TENSES.map((t) => (
            <div key={t.id} className="liquid-glass-card p-6 md:p-8 shadow-md border border-border/65">
              <div className="mb-4 flex items-baseline gap-2.5">
                <h2 className="font-display text-2xl font-extrabold text-primary tracking-tight">{t.name}</h2>
                <span className="text-xs font-bold text-muted">· {t.vi}</span>
              </div>

              {/* Công thức */}
              <div className="space-y-3.5">
                {t.form.map((f) => (
                  <div key={f.label} className="flex flex-col gap-2 rounded-2xl bg-surface border border-border p-4 sm:flex-row sm:items-center sm:gap-4.5 shadow-sm">
                    <span className="w-20 shrink-0 text-[9px] font-black uppercase tracking-wider text-muted">{f.label}</span>
                    <code className="font-display text-xs font-black text-foreground bg-black/5 dark:bg-white/5 border border-border/40 px-2.5 py-1 rounded-lg">{f.formula}</code>
                    <span className="text-xs italic font-semibold text-muted sm:ml-auto leading-relaxed">{f.example}</span>
                  </div>
                ))}
              </div>

              {/* Khi nào dùng */}
              <div className="mt-5 border-t border-border/40 pt-5">
                <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-muted">Khi nào dùng</p>
                <ul className="list-inside list-disc space-y-1 text-xs font-semibold text-foreground/90">
                  {t.when.map((w) => <li key={w} className="leading-relaxed">{w}</li>)}
                </ul>
              </div>

              {/* Dấu hiệu */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted">Dấu hiệu nhận biết:</span>
                {t.signals.map((s) => (
                  <span key={s} className="rounded-full bg-primary-soft border border-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary">{s}</span>
                ))}
              </div>

              {/* Ví dụ */}
              <div className="mt-5 space-y-3">
                {t.examples.map((ex) => (
                  <div key={ex.en} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-background/30 p-3.5 shadow-sm">
                    <button onClick={() => speak(ex.en)} className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs text-primary cursor-pointer shadow-sm">🔊</button>
                    <div>
                      <p className="text-xs sm:text-sm font-bold italic text-foreground">“{ex.en}”</p>
                      <p className="text-[10px] font-bold text-muted mt-0.5">{ex.vi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-center text-xs font-bold text-muted">
            Đã nắm rõ lý thuyết? Thử ngay <button onClick={() => setMode("practice")} className="text-primary font-black underline cursor-pointer">Luyện tập đặt câu</button> với AI.
          </p>
        </div>
      )}

      {/* ===== PRACTICE ===== */}
      {mode === "practice" && cur && (
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border border border-border/40 shadow-inner">
              <div className="h-full rounded-full bg-primary transition-all duration-300 animate-pulse" style={{ width: `${(idx / deck.length) * 100}%` }} />
            </div>
            <span className="shrink-0 text-[10px] font-black text-muted bg-surface border border-border px-2.5 py-1 rounded-full shadow-sm">{idx + 1}/{deck.length}</span>
          </div>

          <div className="liquid-glass-card flex flex-col gap-5 p-6 md:p-8 text-center shadow-2xl bg-white/20 dark:bg-black/10 border border-border/80">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted">Đặt câu thực tế chứa cấu trúc:</p>
            <p className="font-display text-2xl font-black text-primary tracking-tight leading-normal">{cur.structure}</p>
            <p className="text-xs sm:text-sm font-bold text-muted leading-relaxed px-4">{cur.vi}</p>

            {result === null ? (
              <>
                <textarea
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  rows={2}
                  placeholder="Nhập câu tiếng Anh của bạn tại đây..."
                  className="w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-3.5 text-center text-sm font-semibold text-foreground outline-none focus:border-primary shadow-inner placeholder:text-muted/60 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all"
                />
                <div className="flex items-center justify-center gap-3 mt-2">
                  <button onClick={nextItem} className="rounded-full border border-border bg-surface px-6 py-3.5 text-xs font-black uppercase tracking-wider text-muted hover:text-foreground active:scale-95 transition-all shadow-sm cursor-pointer">Bỏ qua</button>
                  <button onClick={check} disabled={!typed.trim() || checking} className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider active:scale-95 disabled:opacity-50">
                    {checking ? "Đang chấm câu…" : "Kiểm tra với AI"}
                  </button>
                </div>
              </>
            ) : (
              <div className="animate-fadeIn space-y-4 border-t border-border/40 pt-5 text-left">
                <p className="rounded-2xl bg-surface border border-border p-4 text-xs italic font-semibold text-foreground/90 shadow-sm">“{typed}”</p>
                <p className={`font-display text-lg font-black ${result.ok === true ? "text-primary animate-pulse" : result.ok === false ? "text-pink" : "text-muted"}`}>
                  {result.ok === true ? "✓ Đặt câu tốt!" : result.ok === false ? "✗ Cần cải thiện" : "ℹ️ Nhận xét"}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed">{result.feedback}</p>
                {result.suggestion && (
                  <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-soft/80 p-4 shadow-sm">
                    <button onClick={() => speak(result.suggestion)} className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs text-primary hover:scale-105 active:scale-95 cursor-pointer shadow-sm">🔊</button>
                    <p className="text-xs sm:text-sm font-bold italic text-foreground leading-relaxed">“{result.suggestion}”</p>
                  </div>
                )}
                <div className="flex justify-center pt-2">
                  <button onClick={nextItem} className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider">Câu tiếp theo →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
