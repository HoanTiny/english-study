"use client";

import { useMemo, useState } from "react";
import grammarData from "@/data/grammar.json";
import { TENSES } from "@/data/tenses";

// Tính năng Ngữ pháp — cấu trúc câu hay dùng + chế độ luyện tập (đặt câu → AI chấm).
type Struct = { structure: string; vi: string; example: string; exampleVi: string; level: string };
const ALL = grammarData as Struct[];

const LEVELS = [
  { key: "all", label: "Tất cả" },
  { key: "A1", label: "A1" },
  { key: "A2", label: "A2" },
  { key: "B1", label: "B1" },
];
const LEVEL_CLS: Record<string, string> = {
  A1: "bg-emerald-400/20 text-emerald-600",
  A2: "bg-amber-400/20 text-amber-600",
  B1: "bg-pink-soft text-pink",
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
    <main className="mx-auto max-w-3xl px-6 py-12 pt-16 animate-fadeIn">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">🧩 Cấu trúc câu</h1>
        <p className="mt-2 text-sm font-semibold text-muted">
          {ALL.length} cấu trúc hay dùng, rút từ câu giao tiếp thực tế. Học khung → đặt câu của bạn.
        </p>
      </div>

      {/* Toggle chế độ */}
      <div className="mb-6 flex justify-center">
        <div className="flex gap-1 rounded-2xl border border-border bg-surface p-1">
          <button onClick={() => setMode("browse")} className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${mode === "browse" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            📖 Cấu trúc
          </button>
          <button onClick={() => setMode("tenses")} className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${mode === "tenses" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            🕐 3 thì cơ bản
          </button>
          <button onClick={() => (mode === "practice" ? null : startPractice())} className={`rounded-xl px-5 py-2 text-sm font-bold transition-all ${mode === "practice" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"}`}>
            ✍️ Luyện tập
          </button>
        </div>
      </div>

      {/* ===== BROWSE ===== */}
      {mode === "browse" && (
        <>
          <div className="mb-6 flex justify-center gap-2">
            {LEVELS.map((l) => (
              <button key={l.key} onClick={() => setLevel(l.key)} className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-all ${level === l.key ? "border-primary bg-primary text-white" : "border-border text-muted hover:border-primary/50 hover:text-foreground"}`}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {list.map((s, i) => (
              <div key={i} className="liquid-glass-card p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-display text-lg text-primary">{s.structure}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${LEVEL_CLS[s.level] ?? "bg-primary-soft text-primary"}`}>{s.level}</span>
                </div>
                <p className="text-sm font-medium text-muted">{s.vi}</p>
                {s.example && (
                  <div className="mt-3 flex items-start gap-3 rounded-xl bg-surface p-3">
                    <button onClick={() => speak(s.example)} className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-white transition-transform hover:scale-105 active:scale-95" title="Nghe">🔊</button>
                    <div>
                      <p className="text-sm font-semibold italic text-foreground">“{s.example}”</p>
                      {s.exampleVi && <p className="mt-0.5 text-xs text-muted">{s.exampleVi}</p>}
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
        <div className="space-y-6">
          {TENSES.map((t) => (
            <div key={t.id} className="liquid-glass-card p-6">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="font-display text-2xl text-primary">{t.name}</h2>
                <span className="text-sm font-bold text-muted">· {t.vi}</span>
              </div>

              {/* Công thức */}
              <div className="space-y-2">
                {t.form.map((f) => (
                  <div key={f.label} className="flex flex-col gap-1 rounded-xl bg-surface p-3 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-20 shrink-0 text-xs font-bold uppercase text-muted">{f.label}</span>
                    <code className="font-display text-sm text-foreground">{f.formula}</code>
                    <span className="text-xs italic text-muted sm:ml-auto">{f.example}</span>
                  </div>
                ))}
              </div>

              {/* Khi nào dùng */}
              <div className="mt-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Khi nào dùng</p>
                <ul className="list-inside list-disc space-y-0.5 text-sm font-medium text-foreground/90">
                  {t.when.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>

              {/* Dấu hiệu */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Dấu hiệu:</span>
                {t.signals.map((s) => (
                  <span key={s} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary">{s}</span>
                ))}
              </div>

              {/* Ví dụ */}
              <div className="mt-4 space-y-2">
                {t.examples.map((ex) => (
                  <div key={ex.en} className="flex items-start gap-2 rounded-xl border border-border p-2.5">
                    <button onClick={() => speak(ex.en)} className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">🔊</button>
                    <div>
                      <p className="text-sm font-semibold italic text-foreground">“{ex.en}”</p>
                      <p className="text-xs text-muted">{ex.vi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-center text-sm font-semibold text-muted">
            Nắm vững → thử <button onClick={() => setMode("practice")} className="text-primary underline">Luyện tập đặt câu</button> để áp dụng.
          </p>
        </div>
      )}

      {/* ===== PRACTICE ===== */}
      {mode === "practice" && cur && (
        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(idx / deck.length) * 100}%` }} />
            </div>
            <span className="shrink-0 text-xs font-bold text-muted">{idx + 1}/{deck.length}</span>
          </div>

          <div className="liquid-glass-card flex flex-col gap-4 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Đặt một câu dùng cấu trúc:</p>
            <p className="font-display text-2xl text-primary">{cur.structure}</p>
            <p className="text-sm font-medium text-muted">{cur.vi}</p>

            {result === null ? (
              <>
                <textarea
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  rows={2}
                  placeholder="Viết câu tiếng Anh của bạn…"
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-center text-lg font-semibold text-foreground outline-none focus:border-primary"
                />
                <div className="flex items-center justify-center gap-3">
                  <button onClick={nextItem} className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-muted hover:text-foreground">Bỏ qua</button>
                  <button onClick={check} disabled={!typed.trim() || checking} className="liquid-glass-btn px-7 py-2.5 text-sm font-bold disabled:opacity-50">
                    {checking ? "Đang chấm…" : "Kiểm tra (AI)"}
                  </button>
                </div>
              </>
            ) : (
              <div className="animate-fadeIn space-y-3 border-t border-border pt-4 text-left">
                <p className="rounded-xl bg-surface p-3 text-sm italic text-foreground">“{typed}”</p>
                <p className={`font-display text-lg ${result.ok === true ? "text-primary" : result.ok === false ? "text-pink" : "text-muted"}`}>
                  {result.ok === true ? "✓ Tốt lắm!" : result.ok === false ? "✗ Cần chỉnh" : "ℹ️ Lưu ý"}
                </p>
                <p className="text-sm font-medium text-foreground">{result.feedback}</p>
                {result.suggestion && (
                  <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft/40 p-3">
                    <button onClick={() => speak(result.suggestion)} className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">🔊</button>
                    <p className="text-sm font-semibold italic text-foreground">{result.suggestion}</p>
                  </div>
                )}
                <div className="flex justify-center pt-1">
                  <button onClick={nextItem} className="liquid-glass-btn px-8 py-2.5 text-sm font-bold">Câu tiếp →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
