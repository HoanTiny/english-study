"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import grammarData from "@/data/grammar.json";
import { TENSES } from "@/data/tenses";
import { lessonContent } from "@/lib/lessons";
import { useAuth } from "@/lib/auth";
import { addNote, listNotes } from "@/lib/notesRepo";

// Tính năng Ngữ pháp — cấu trúc câu hay dùng + chế độ luyện tập (đặt câu → AI chấm).
type Struct = { structure: string; vi: string; example: string; exampleVi: string; level: string; topic?: string; lessons?: string[] };

// Tên bài học để hiển thị chip liên kết (slug → title).
function lessonTitle(slug: string): string {
  return lessonContent[slug]?.title ?? slug;
}
const ALL = grammarData as Struct[];

const LEVELS = [
  { key: "all", label: "Tất cả" },
  { key: "A1", label: "Cơ bản A1" },
  { key: "A2", label: "Trung cấp A2" },
  { key: "B1", label: "Nâng cao B1" },
  { key: "B2", label: "Thành thạo B2" },
];
const LEVEL_CLS: Record<string, string> = {
  A1: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  A2: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400",
  B1: "bg-pink-soft border border-pink/20 text-pink",
  B2: "bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400",
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

// Hiển thị cấu trúc: phần trong [ngoặc vuông] được tô thành "chip" để dễ đọc,
// người mới không bị ngợp bởi ký hiệu ngữ pháp.
function StructureText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("[") ? (
          <span key={i} className="mx-0.5 inline-block rounded-md border border-primary/25 bg-primary/10 px-1.5 py-px text-[0.82em] font-bold text-primary align-baseline">
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const LEVEL_ORDER: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };
// Nhóm theo MỤC ĐÍCH SỬ DỤNG — người học tra theo "muốn nói gì" thay vì theo ngữ pháp.
const CATS: { key: string; label: string }[] = [
  { key: "social", label: "💬 Xã giao & kết nối" },
  { key: "question", label: "❓ Hỏi thông tin" },
  { key: "request", label: "🙏 Nhờ vả & xin phép" },
  { key: "suggest", label: "🤝 Rủ rê & gợi ý" },
  { key: "plan", label: "🎯 Kế hoạch & dự định" },
  { key: "feeling", label: "❤️ Cảm xúc & sở thích" },
  { key: "opinion", label: "🧠 Ý kiến & phản hồi" },
  { key: "advice", label: "💡 Khuyên & nhắc nhở" },
  { key: "story", label: "📖 Kể chuyện & trải nghiệm" },
  { key: "describe", label: "🔍 Mô tả & so sánh" },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATS.map((c) => [c.key, c.label]));
const CAT_ORDER: Record<string, number> = Object.fromEntries(CATS.map((c, i) => [c.key, i]));

type Result = { ok: boolean | null; feedback: string; suggestion: string };

export default function GrammarPage() {
  const [mode, setMode] = useState<"browse" | "tenses" | "practice">("browse");
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const { userId } = useAuth();
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [savingNote, setSavingNote] = useState<string | null>(null);

  // Hỗ trợ deep-link: /grammar?q=… (từ ô "Cấu trúc liên quan" trong bài học).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  // Đánh dấu các cấu trúc đã lưu vào ôn tập.
  useEffect(() => {
    if (!userId) return;
    listNotes()
      .then((notes) => setSavedSet(new Set(notes.filter((n) => n.kind === "structure").map((n) => n.content))))
      .catch((e) => console.error("listNotes", e));
  }, [userId]);

  async function saveToReview(s: Struct) {
    if (!userId || savedSet.has(s.structure) || savingNote) return;
    setSavingNote(s.structure);
    try {
      await addNote(userId, {
        kind: "structure",
        content: s.structure,
        meaning: s.vi,
        example: s.example,
        tags: ["grammar", s.level, ...(s.topic ? [s.topic] : [])],
        inReview: true,
      });
      setSavedSet((prev) => new Set(prev).add(s.structure));
    } catch (e) {
      console.error("saveToReview", e);
    } finally {
      setSavingNote(null);
    }
  }

  // practice state
  const [deck, setDeck] = useState<Struct[]>([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const list = useMemo(() => {
    let r = level === "all" ? ALL : ALL.filter((s) => s.level === level);
    if (cat !== "all") r = r.filter((s) => s.topic === cat);
    const q = query.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (s) =>
          s.structure.toLowerCase().includes(q) ||
          s.vi.toLowerCase().includes(q) ||
          s.example.toLowerCase().includes(q) ||
          s.exampleVi.toLowerCase().includes(q),
      );
    }
    // Trong mỗi nhóm: cấu trúc dễ (A1) lên trước.
    return [...r].sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9));
  }, [level, cat, query]);

  // Gom nhóm theo MỤC ĐÍCH sử dụng — mỗi nhóm có tiêu đề riêng cho dễ tra.
  const groups = useMemo(() => {
    const m = new Map<string, Struct[]>();
    for (const s of list) {
      const k = s.topic ?? "describe";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return [...m.entries()].sort((a, b) => (CAT_ORDER[a[0]] ?? 99) - (CAT_ORDER[b[0]] ?? 99));
  }, [list]);

  function startPractice(first?: Struct) {
    const rest = first ? ALL.filter((s) => s.structure !== first.structure) : ALL;
    setDeck(first ? [first, ...shuffle(rest)] : shuffle(rest));
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
          {/* Tìm kiếm */}
          <div className="relative mx-auto mb-4 max-w-md">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">🔍</span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(null); }}
              placeholder="Tìm cấu trúc, ý nghĩa hoặc câu ví dụ…"
              className="w-full rounded-full border border-border/60 bg-surface/70 py-3 pl-11 pr-10 text-sm font-semibold text-foreground shadow-sm outline-none transition-all placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-border/60 text-[10px] font-black text-muted hover:text-foreground cursor-pointer" title="Xóa tìm kiếm">✕</button>
            )}
          </div>

          {/* Lọc theo cấp + số lượng */}
          <div className="mb-6 flex justify-center gap-2.5 flex-wrap">
            {LEVELS.map((l) => {
              const n = l.key === "all" ? ALL.length : ALL.filter((s) => s.level === l.key).length;
              return (
                <button key={l.key} onClick={() => { setLevel(l.key); setOpen(null); }} className={`rounded-full border px-4 py-2 text-xs font-black transition-all duration-300 active:scale-95 cursor-pointer ${level === l.key ? "border-primary bg-primary text-primary-fg shadow-sm" : "border-border/60 bg-surface text-muted hover:border-primary/50 hover:text-foreground shadow-sm"}`}>
                  {l.label} <span className={level === l.key ? "opacity-80" : "opacity-60"}>· {n}</span>
                </button>
              );
            })}
          </div>

          {/* Lọc theo mục đích sử dụng */}
          <div className="mb-6 flex justify-center gap-2 flex-wrap">
            <button onClick={() => { setCat("all"); setOpen(null); }} className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition-all active:scale-95 cursor-pointer ${cat === "all" ? "border-primary bg-primary text-primary-fg shadow-sm" : "border-border/60 bg-surface text-muted hover:border-primary/50 hover:text-foreground"}`}>
              Tất cả mục đích
            </button>
            {CATS.map((c) => (
              <button key={c.key} onClick={() => { setCat(cat === c.key ? "all" : c.key); setOpen(null); }} className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition-all active:scale-95 cursor-pointer ${cat === c.key ? "border-primary bg-primary text-primary-fg shadow-sm" : "border-border/60 bg-surface text-muted hover:border-primary/50 hover:text-foreground"}`}>
                {c.label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/60 py-14 text-center">
              <p className="text-sm font-bold text-muted">Không tìm thấy cấu trúc nào khớp “{query}”.</p>
              <button onClick={() => setQuery("")} className="mt-3 text-xs font-black text-primary underline cursor-pointer">Xóa tìm kiếm</button>
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map(([lv, items]) => (
                <section key={lv}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="text-xs font-black uppercase tracking-wider text-muted">{CAT_LABEL[lv] ?? lv}</h2>
                    <span className="text-[10px] font-bold text-muted/70">{items.length} cấu trúc</span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                  <div className="space-y-2.5">
                    {items.map((s) => {
                      const id = s.structure;
                      const expanded = open === id;
                      return (
                        <div key={id} className={`rounded-2xl border bg-surface/60 shadow-sm transition-all ${expanded ? "border-primary/40 shadow-md" : "border-border/60 hover:border-primary/30"}`}>
                          {/* Hàng tiêu đề — bấm để mở/đóng */}
                          <button onClick={() => setOpen(expanded ? null : id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left cursor-pointer" aria-expanded={expanded}>
                            <div className="min-w-0 flex-1">
                              <p className="font-display text-sm sm:text-[15px] font-extrabold leading-snug text-foreground">
                                <StructureText text={s.structure} />
                              </p>
                              {!expanded && <p className="mt-1 truncate text-xs font-semibold text-muted">{s.vi}</p>}
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${LEVEL_CLS[s.level] ?? "bg-primary-soft border border-primary/20 text-primary"}`}>{s.level}</span>
                            <span className={`shrink-0 text-xs text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>▾</span>
                          </button>

                          {/* Nội dung mở rộng */}
                          {expanded && (
                            <div className="animate-fadeIn border-t border-border/40 px-4 pb-4 pt-3">
                              <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed">{s.vi}</p>
                              {s.example && (
                                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-background/50 border border-border p-3.5 shadow-sm">
                                  <button onClick={() => speak(s.example)} className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs text-primary transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm" title="Nghe câu mẫu">🔊</button>
                                  <div>
                                    <p className="text-xs sm:text-sm font-bold italic text-foreground">“{s.example}”</p>
                                    {s.exampleVi && <p className="mt-1 text-[10px] font-bold text-muted">{s.exampleVi}</p>}
                                  </div>
                                </div>
                              )}
                              {(s.lessons?.length ?? 0) > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-muted">Học trong bài:</span>
                                  {s.lessons!.map((sl) => (
                                    <Link key={sl} href={`/lesson/${sl}`} className="rounded-full border border-accent/25 bg-accent/5 px-2.5 py-1 text-[10px] font-bold text-accent hover:bg-accent/10 transition-colors">
                                      📖 {lessonTitle(sl)}
                                    </Link>
                                  ))}
                                </div>
                              )}
                              <div className="mt-3 flex items-center justify-end gap-2">
                                {userId && (
                                  <button
                                    onClick={() => saveToReview(s)}
                                    disabled={savedSet.has(s.structure) || savingNote === s.structure}
                                    className={`rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                                      savedSet.has(s.structure)
                                        ? "bg-teal-500/10 border border-teal-500/25 text-teal-600 dark:text-teal-400 cursor-default"
                                        : "border border-border bg-surface text-muted hover:text-foreground hover:border-primary/40 shadow-sm"
                                    }`}
                                  >
                                    {savedSet.has(s.structure) ? "✓ Đã lưu ôn tập" : savingNote === s.structure ? "Đang lưu…" : "+ Lưu ôn tập"}
                                  </button>
                                )}
                                <button onClick={() => startPractice(s)} className="rounded-full bg-primary px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-primary-fg shadow-sm active:scale-95 transition-transform cursor-pointer">
                                  ✍️ Luyện cấu trúc này
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
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
            <p className="font-display text-2xl font-black text-primary tracking-tight leading-normal"><StructureText text={cur.structure} /></p>
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
