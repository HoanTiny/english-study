"use client";

import { useEffect, useMemo, useState } from "react";
import { listExercises, exAudioSrc, type ListeningExercise } from "@/lib/listeningExercisesRepo";

const LEVELS = ["Tất cả", "A1", "A2", "B1", "B2"];

function norm(s: string) {
  return s.toLowerCase().trim().replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " ");
}

export default function ListeningExercisesPage() {
  const [all, setAll] = useState<ListeningExercise[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [level, setLevel] = useState("Tất cả");
  const [active, setActive] = useState<ListeningExercise | null>(null);

  useEffect(() => {
    listExercises()
      .then((x) => setAll(x))
      .catch((e) => console.error("listExercises failed", e))
      .finally(() => setLoaded(true));
  }, []);

  const filtered = useMemo(
    () => (level === "Tất cả" ? all : all.filter((e) => e.level === level)),
    [all, level],
  );

  if (active) return <Player ex={active} onBack={() => setActive(null)} />;

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 animate-fadeIn">
      <h1 className="font-display text-3xl font-black text-gradient-iridescent">Bài tập nghe</h1>
      <p className="mt-2 text-sm font-semibold text-muted">Nghe audio và trả lời câu hỏi — chấm điểm tự động, xem lại transcript sau khi làm.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button key={l} onClick={() => setLevel(l)} className={`rounded-full border px-3 py-1.5 text-xs font-black transition-all ${level === l ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-foreground hover:border-primary/40"}`}>{l}</button>
        ))}
      </div>

      {!loaded ? (
        <div className="mt-10 text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border/60 py-14 text-center">
          <p className="text-sm font-bold text-muted">Chưa có bài tập nghe nào{level !== "Tất cả" ? ` ở cấp ${level}` : ""}. Quản trị viên thêm trong CMS nhé.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {filtered.map((e) => (
            <button key={e.id} onClick={() => setActive(e)} className="w-full text-left flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 px-4 py-3.5 hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.99]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-lg">🎧</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{e.title}</p>
                <p className="text-[11px] font-semibold text-muted">{e.unit ? `Unit ${e.unit} · ` : ""}{e.section ?? ""} · {e.level} · {e.items.length} câu</p>
              </div>
              <span className="text-xs font-black text-primary shrink-0">Làm →</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

function Player({ ex, onBack }: { ex: ListeningExercise; onBack: () => void }) {
  // câu trả lời người dùng
  const [answers, setAnswers] = useState<Record<number, string | number | boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const gradable = ex.type !== "speaking";

  function isCorrect(i: number): boolean {
    const it = ex.items[i];
    const a = answers[i];
    if (ex.type === "mc") return a === it.answer;
    if (ex.type === "truefalse") return a === it.answer;
    if (ex.type === "fill") return typeof a === "string" && norm(a) === norm(String(it.answer ?? ""));
    if (ex.type === "ordering") return Number(a) === i + 1; // vị trí đúng = index+1
    return true;
  }

  const score = ex.items.reduce((n, _, i) => n + (isCorrect(i) ? 1 : 0), 0);

  // Thứ tự hiển thị: ordering thì xáo trộn (cố định theo bài) để không lộ đáp án.
  const order = useMemo(() => {
    const idx = ex.items.map((_, i) => i);
    if (ex.type !== "ordering") return idx;
    // Xáo trộn TẤT ĐỊNH theo ex.id (seeded PRNG) — không dùng Math.random trong render,
    // nên thứ tự ổn định qua mỗi lần render và không lộ đáp án.
    let seed = 0;
    for (let c = 0; c < ex.id.length; c++) seed = (seed * 31 + ex.id.charCodeAt(c)) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let k = idx.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [idx[k], idx[j]] = [idx[j], idx[k]];
    }
    return idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 animate-fadeIn">
      <button onClick={onBack} className="text-xs font-black text-muted">← Danh sách bài tập</button>
      <h1 className="mt-3 font-display text-2xl font-black text-foreground">{ex.title}</h1>
      {ex.instructions && <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">{ex.instructions}</p>}

      {/* Audio */}
      {ex.audio_path ? (
        <audio controls src={exAudioSrc(ex.audio_path)} className="mt-4 w-full" />
      ) : (
        <p className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400">Bài này chưa có audio.</p>
      )}

      {/* Items — riêng ordering thì xáo trộn thứ tự hiển thị (đáp án = vị trí gốc) */}
      <div className="mt-6 space-y-3">
        {order.map((i, pos) => {
          const it = ex.items[i];
          const correct = submitted && isCorrect(i);
          const wrong = submitted && gradable && !isCorrect(i);
          return (
            <div key={i} className={`rounded-2xl border p-4 transition-colors ${correct ? "border-teal-500/40 bg-teal-500/5" : wrong ? "border-rose-500/40 bg-rose-500/5" : "border-border/60 bg-surface/50"}`}>
              <div className="flex items-start gap-2">
                <span className="text-xs font-black text-muted mt-0.5">{pos + 1}</span>
                <div className="flex-1">
                  {it.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={exAudioSrc(it.image)} alt="" className="mb-2 h-28 w-28 rounded-xl object-contain border border-border/60 bg-white" />
                  )}
                  {ex.type === "speaking" ? (
                    it.text ? <p className="text-sm font-bold text-foreground">{it.text}</p> : null
                  ) : (
                    <p className="text-sm font-bold text-foreground">{it.prompt ?? it.label}</p>
                  )}

                  {/* MC */}
                  {ex.type === "mc" && (
                    <div className="mt-2 space-y-1.5">
                      {(it.options ?? []).map((opt, oi) => {
                        const isAnswer = oi === it.answer; // đáp án đúng
                        const isPicked = answers[i] === oi; // lựa chọn của người dùng
                        const isWrongPick = submitted && isPicked && !isAnswer; // chọn sai → giữ màu đỏ
                        return (
                          <label
                            key={oi}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold cursor-pointer ${
                              submitted && isAnswer
                                ? "text-teal-600 dark:text-teal-400"
                                : isWrongPick
                                  ? "text-rose-600 dark:text-rose-400 line-through decoration-rose-400/60"
                                  : "text-foreground"
                            }`}
                          >
                            <input type="radio" disabled={submitted} checked={isPicked} onChange={() => setAnswers({ ...answers, [i]: oi })} />
                            {opt}
                            {isWrongPick && <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-rose-500">bạn chọn</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* True/False */}
                  {ex.type === "truefalse" && (
                    <div className="mt-2 flex gap-4">
                      {[true, false].map((v) => {
                        const isAnswer = v === it.answer;
                        const isPicked = answers[i] === v;
                        const isWrongPick = submitted && isPicked && !isAnswer;
                        return (
                          <label
                            key={String(v)}
                            className={`flex items-center gap-1.5 text-sm font-bold cursor-pointer ${
                              submitted && isAnswer
                                ? "text-teal-600 dark:text-teal-400"
                                : isWrongPick
                                  ? "text-rose-600 dark:text-rose-400 line-through decoration-rose-400/60"
                                  : "text-foreground"
                            }`}
                          >
                            <input type="radio" disabled={submitted} checked={isPicked} onChange={() => setAnswers({ ...answers, [i]: v })} />
                            {v ? "Đúng (right)" : "Sai (wrong)"}
                            {isWrongPick && <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-rose-500">bạn chọn</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Fill */}
                  {ex.type === "fill" && (
                    <input disabled={submitted} value={(answers[i] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} placeholder="Nhập đáp án nghe được" className="mt-2 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm font-semibold outline-none focus:border-primary text-foreground" />
                  )}

                  {/* Ordering — nhập số thứ tự nghe được */}
                  {ex.type === "ordering" && (
                    <input type="number" min={1} disabled={submitted} value={(answers[i] as number) ?? ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value ? +e.target.value : "" })} placeholder="Số thứ tự" className="mt-2 w-28 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm font-semibold outline-none focus:border-primary text-foreground" />
                  )}

                  {/* đáp án đúng khi đã nộp */}
                  {submitted && wrong && (
                    <p className="mt-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                      Đáp án: {ex.type === "mc" ? (it.options ?? [])[it.answer as number]
                        : ex.type === "truefalse" ? (it.answer ? "Đúng" : "Sai")
                        : ex.type === "ordering" ? `vị trí ${i + 1}`
                        : String(it.answer)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <button onClick={() => setSubmitted(true)} disabled={ex.items.length === 0} className="mt-6 w-full liquid-glass-btn py-3 text-sm font-black uppercase tracking-wider disabled:opacity-40">
          {gradable ? "Nộp & chấm điểm" : "Hoàn thành"}
        </button>
      ) : (
        <div className="mt-6 rounded-3xl border border-border/60 bg-surface/60 p-5 text-center">
          {gradable && <p className="font-display text-2xl font-black text-foreground">{score}/{ex.items.length} đúng</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="rounded-full border border-border px-4 py-2 text-xs font-black text-muted hover:text-foreground">↻ Làm lại</button>
            {ex.transcript && <button onClick={() => setShowScript((v) => !v)} className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-black text-primary">{showScript ? "Ẩn transcript" : "📄 Xem transcript"}</button>}
            <button onClick={onBack} className="rounded-full bg-primary text-primary-fg px-4 py-2 text-xs font-black">Bài khác →</button>
          </div>
          {showScript && ex.transcript && (
            <p className="mt-4 whitespace-pre-wrap text-left text-sm font-medium text-foreground/90 bg-background/50 border border-border/40 rounded-xl p-4">{ex.transcript}</p>
          )}
        </div>
      )}
    </main>
  );
}
