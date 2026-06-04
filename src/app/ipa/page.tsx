"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IPA_SOUNDS, MINIMAL_PAIRS, TYPE_LABEL, IPA_VIDEO, type IpaSound, type SoundType } from "@/data/ipa";
import { fetchPronounce } from "@/lib/pronounce";
import WordCardDeck from "@/components/WordCardDeck";

type Mode = "chart" | "shadow" | "discriminate" | "quiz";

// Phát âm 1 từ: ưu tiên audio người bản xứ (Free Dictionary), fallback TTS.
async function playWord(word: string) {
  try {
    const p = await fetchPronounce(word);
    const url = p.us?.audio || p.uk?.audio || p.audio;
    if (url) {
      await new Audio(url).play();
      return;
    }
  } catch {
    /* fallback */
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
}

const TYPES: SoundType[] = ["consonant", "monophthong", "diphthong"];

export default function IpaPage() {
  const [mode, setMode] = useState<Mode>("chart");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 pt-24 animate-fadeIn">
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
          🔤 IPA
        </span>
        <h1 className="mt-2.5 font-display text-2xl font-extrabold text-foreground sm:text-3xl">Học phát âm IPA</h1>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-muted leading-relaxed">
          Nghe nhận diện → nhại lại → phân biệt cặp âm dễ nhầm (HVPT). Tai phân biệt rõ thì miệng mới nói đúng.
        </p>
      </div>

      {/* Tabs — segmented control */}
      <div className="mb-7 grid grid-cols-4 gap-1 rounded-2xl border border-border/60 bg-black/[0.03] p-1 dark:bg-white/5">
        {([
          ["chart", "📋", "Bảng 44 âm"],
          ["shadow", "🎧", "Nghe & nhại"],
          ["discriminate", "🎯", "Phân biệt"],
          ["quiz", "📝", "Kiểm tra"],
        ] as [Mode, string, string][]).map(([m, icon, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-wider transition-all sm:text-xs ${
              mode === m ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {mode === "chart" && <ChartMode />}
      {mode === "shadow" && <ShadowMode />}
      {mode === "discriminate" && <DiscriminateMode />}
      {mode === "quiz" && <QuizMode />}
    </main>
  );
}

// ============ CHẾ ĐỘ 1: BẢNG ÂM ============
function ChartMode() {
  const [sel, setSel] = useState<IpaSound | null>(null);

  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // khoá cuộn nền khi mở modal
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sel]);

  return (
    <div className="space-y-6">
      {TYPES.map((type) => (
        <div key={type}>
          <h2 className="mb-2.5 text-xs font-black uppercase tracking-wider text-muted">{TYPE_LABEL[type]}</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
            {IPA_SOUNDS.filter((s) => s.type === type).map((s) => (
              <button
                key={s.symbol}
                onClick={() => { setSel(s); playWord(s.words[0]); }}
                className="group relative flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-black/10 bg-white/80 px-1.5 py-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary-soft/40 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60"
                title={s.tip}
              >
                <span className="font-display text-xl font-black leading-none text-foreground group-hover:text-primary">{s.symbol.replace(/\//g, "")}</span>
                <span className="max-w-full truncate text-[10px] font-semibold leading-none text-muted">{s.words[0]}</span>
                {s.hard && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pink" title="Người Việt hay sai" />}
              </button>
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-[11px] font-medium text-muted">💡 Chấm <span className="inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-pink align-middle" /> = âm người Việt hay sai. Bấm 1 ô để xem chi tiết & nghe.</p>

      {/* Modal chi tiết âm — render qua portal ra body để không bị "nhốt" trong layout */}
      {sel && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-fadeIn sm:items-center sm:p-4"
          onClick={() => setSel(null)}
        >
          <div
            className="relative max-h-[90vh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-black/5 bg-white px-6 pb-7 pt-8 shadow-2xl dark:border-white/10 dark:bg-zinc-900 sm:max-h-[88vh] sm:max-w-lg sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setSel(null)} className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 dark:hover:bg-white/10" aria-label="Đóng">✕</button>

            {/* Hero: ký hiệu lớn căn giữa */}
            <div className="flex flex-col items-center text-center">
              <span className="font-display text-6xl font-black leading-none text-primary">{sel.symbol}</span>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-muted dark:border-white/10 dark:bg-white/5">
                  {TYPE_LABEL[sel.type].replace(/\s*\(\d+\)/, "")}
                </span>
                {sel.hard && <span className="rounded-full bg-pink-soft px-2.5 py-0.5 text-[10px] font-black text-pink">⚠ Hay sai</span>}
              </div>
              <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-muted">{sel.tip}</p>
            </div>

            <button onClick={() => playWord(sel.words[0])} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-black text-primary-fg shadow-md shadow-primary/20 transition-transform active:scale-95">
              🔊 Nghe âm mẫu
            </button>

            {/* Video khẩu hình để shadow: nhúng iframe nếu có videoId, ngược lại mở tìm kiếm YouTube (luôn sống) */}
            {IPA_VIDEO[sel.symbol] ? (
              <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-black/10 shadow-sm dark:border-white/10">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${IPA_VIDEO[sel.symbol]}`}
                  title={`Khẩu hình âm ${sel.symbol}`}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`BBC Learning English the sounds of English ${sel.symbol}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white/60 py-3 text-xs font-black text-foreground transition-colors hover:border-primary/40 dark:bg-white/5"
              >
                🎬 Xem video khẩu hình để nhại (YouTube)
              </a>
            )}

            {/* Từ ví dụ — bộ thẻ trượt (mỗi từ + IPA + câu ví dụ, vuốt để chuyển) */}
            <p className="mt-5 text-center text-[10px] font-black uppercase tracking-wider text-muted">Luyện nghe từ ví dụ · vuốt để chuyển</p>
            <div className="mt-3">
              <WordCardDeck key={sel.symbol} words={sel.words} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ============ CHẾ ĐỘ 2: NGHE & NHẠI (record + compare) ============
function ShadowMode() {
  const [type, setType] = useState<SoundType | "hard">("hard");
  const list = useMemo(
    () => (type === "hard" ? IPA_SOUNDS.filter((s) => s.hard) : IPA_SOUNDS.filter((s) => s.type === type)),
    [type],
  );
  const [idx, setIdx] = useState(0);
  const cur = list[Math.min(idx, list.length - 1)];

  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setRecUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      alert("Không truy cập được micro. Hãy cho phép quyền micro.");
    }
  }

  function go(d: number) {
    setRecUrl(null);
    setIdx((i) => Math.max(0, Math.min(list.length - 1, i + d)));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-center gap-2">
        {([["hard", "⚠ Âm hay sai"], ["consonant", "Phụ âm"], ["monophthong", "Nguyên âm đơn"], ["diphthong", "Nguyên âm đôi"]] as [SoundType | "hard", string][]).map(([t, l]) => (
          <button key={t} onClick={() => { setType(t); setIdx(0); setRecUrl(null); }} className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all ${type === t ? "border-primary bg-primary-soft text-primary" : "border-border/60 text-muted hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="liquid-glass-card border border-border/40 p-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Âm {idx + 1}/{list.length}</p>
        <p className="mt-2 font-display text-5xl font-black text-primary">{cur.symbol}</p>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium text-muted leading-relaxed">{cur.tip}</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {cur.words.map((w) => (
            <button key={w} onClick={() => playWord(w)} className="rounded-xl border border-border/60 bg-surface/60 px-4 py-2 text-sm font-bold text-foreground hover:border-primary/50">🔊 {w}</button>
          ))}
        </div>

        {/* Thu âm & nghe lại */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button onClick={toggleRecord} className={`rounded-full px-6 py-3 text-sm font-black text-white transition-all ${recording ? "bg-pink animate-pulse" : "bg-primary"}`}>
            {recording ? "⏹ Dừng thu" : "🎙️ Thu âm nhại lại"}
          </button>
          {recUrl && (
            <audio controls src={recUrl} className="h-9 w-full max-w-xs" />
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={() => go(-1)} disabled={idx === 0} className="rounded-full border border-border/60 px-5 py-2 text-xs font-bold text-muted disabled:opacity-40">← Trước</button>
          <button onClick={() => go(1)} disabled={idx >= list.length - 1} className="rounded-full bg-primary px-5 py-2 text-xs font-black text-primary-fg disabled:opacity-40">Tiếp →</button>
        </div>
      </div>

      <p className="text-center text-[11px] font-medium text-muted">💡 Nghe mẫu → nhại NGAY (phóng đại khẩu hình) → thu âm → nghe lại so sánh. Muốn chấm điểm tự động → <Link href="/shadowing" className="font-bold text-primary underline">Shadowing</Link>.</p>
    </div>
  );
}

// ============ CHẾ ĐỘ 3: PHÂN BIỆT CẶP ÂM (HVPT forced-choice) ============
function DiscriminateMode() {
  const [pairIdx, setPairIdx] = useState(0); // -1 = trộn tất cả
  const [target, setTarget] = useState<"a" | "b">("a");
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const curPair = pairIdx < 0 ? MINIMAL_PAIRS[Math.floor(total) % MINIMAL_PAIRS.length] : MINIMAL_PAIRS[pairIdx];
  const [activePair, setActivePair] = useState(curPair);

  function newRound(fromIdx = pairIdx) {
    const pool = fromIdx < 0 ? MINIMAL_PAIRS : [MINIMAL_PAIRS[fromIdx]];
    const p = pool[Math.floor(Math.random() * pool.length)];
    const t: "a" | "b" = Math.random() < 0.5 ? "a" : "b";
    setActivePair(p);
    setTarget(t);
    setPicked(null);
    playWord(p[t].word);
  }

  function pick(choice: "a" | "b") {
    if (picked) return;
    setPicked(choice);
    setTotal((n) => n + 1);
    if (choice === target) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  return (
    <div className="space-y-5">
      {/* Chọn cặp */}
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={() => { setPairIdx(-1); }} className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold ${pairIdx === -1 ? "border-primary bg-primary-soft text-primary" : "border-border/60 text-muted hover:text-foreground"}`}>🔀 Trộn tất cả</button>
        {MINIMAL_PAIRS.map((p, i) => (
          <button key={i} onClick={() => setPairIdx(i)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${pairIdx === i ? "border-primary bg-primary-soft text-primary" : "border-border/60 text-muted hover:text-foreground"}`}>
            {p.a.word}/{p.b.word}
          </button>
        ))}
      </div>

      <div className="liquid-glass-card border border-border/40 p-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-4 text-xs font-black uppercase tracking-wider text-muted">
          <span>Đúng: <b className="text-primary">{score}/{total}</b></span>
          <span>🔥 Chuỗi: <b className="text-pink">{streak}</b></span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px]">{activePair.sound}</span>
        </div>

        <p className="text-sm font-bold text-foreground">Bạn nghe được từ nào?</p>
        <p className="mt-1 text-[11px] font-medium text-muted">{activePair.tip}</p>

        <button onClick={() => playWord(activePair[target].word)} className="mx-auto my-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl text-primary-fg shadow-lg transition-transform hover:scale-105 active:scale-95" title="Nghe lại">
          🔊
        </button>

        <div className="grid grid-cols-2 gap-3">
          {(["a", "b"] as const).map((key) => {
            const w = activePair[key];
            const isAnswer = key === target;
            const isPicked = picked === key;
            let cls = "border-border/60 bg-surface/50 text-foreground hover:border-primary/40";
            if (picked) {
              if (isAnswer) cls = "border-primary bg-primary-soft text-primary";
              else if (isPicked) cls = "border-pink bg-pink-soft text-pink";
              else cls = "border-border/40 opacity-60";
            }
            return (
              <button key={key} onClick={() => pick(key)} disabled={!!picked} className={`rounded-2xl border-2 p-4 transition-all ${cls}`}>
                <span className="block font-display text-lg font-black">{w.word}</span>
                <span className="block text-xs font-semibold text-muted">{w.ipa}</span>
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="mt-5">
            <p className={`text-sm font-black ${picked === target ? "text-primary" : "text-pink"}`}>
              {picked === target ? "✓ Chính xác!" : `✗ Sai — đáp án: ${activePair[target].word}`}
            </p>
            <button onClick={() => newRound()} className="mt-3 rounded-full bg-primary px-6 py-2.5 text-xs font-black text-primary-fg">Câu tiếp →</button>
          </div>
        )}
        {!picked && total === 0 && (
          <button onClick={() => newRound()} className="mt-2 rounded-full bg-primary px-6 py-2.5 text-xs font-black text-primary-fg">▶ Bắt đầu nghe</button>
        )}
      </div>

      <p className="text-center text-[11px] font-medium text-muted">💡 Bấm 🔊 nghe rồi chọn — luyện TAI phân biệt trước (phương pháp HVPT). Nghe lại nhiều lần nếu cần.</p>
    </div>
  );
}

// ============ CHẾ ĐỘ 4: KIỂM TRA (hữu hạn, có điểm — nhận âm + phân biệt cặp) ============
// 2 dạng câu: "sound" = âm /X/ có trong từ nào · "pair" = nghe → chọn từ trong cặp dễ nhầm.
type QuizQ =
  | { kind: "sound"; symbol: string; tip: string; answer: string; options: string[] }
  | { kind: "pair"; label: string; tip: string; answer: string; options: string[] };

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuizMode() {
  const QN_SOUND = 6; // câu nhận âm
  const QN_PAIR = 6; // câu phân biệt cặp dễ nhầm
  const [started, setStarted] = useState(false);
  const [qs, setQs] = useState<QuizQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  function buildQuestions(): QuizQ[] {
    // Dạng A — nhận âm: cho ký hiệu, chọn từ chứa âm đó.
    const sounds: QuizQ[] = shuffleArr(IPA_SOUNDS)
      .slice(0, QN_SOUND)
      .map((s) => {
        const answer = s.words[0];
        const distractors = shuffleArr(
          IPA_SOUNDS.filter((x) => x.symbol !== s.symbol).flatMap((x) => x.words),
        )
          .filter((w) => !s.words.includes(w))
          .slice(0, 3);
        return { kind: "sound", symbol: s.symbol, tip: s.tip, answer, options: shuffleArr([answer, ...distractors]) };
      });
    // Dạng B — phân biệt cặp âm giống nhau: nghe 1 từ trong cặp, chọn đúng từ.
    const pairs: QuizQ[] = shuffleArr(MINIMAL_PAIRS)
      .slice(0, QN_PAIR)
      .map((p) => {
        const answer = Math.random() < 0.5 ? p.a.word : p.b.word;
        return { kind: "pair", label: p.sound, tip: p.tip, answer, options: shuffleArr([p.a.word, p.b.word]) };
      });
    return shuffleArr([...sounds, ...pairs]);
  }

  function start() {
    setQs(buildQuestions());
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setStarted(true);
  }

  // Câu phân biệt cặp: tự phát từ cần nghe khi chuyển sang câu đó.
  useEffect(() => {
    if (started && !done && qs[idx]?.kind === "pair") playWord(qs[idx].answer);
  }, [idx, started, done, qs]);

  function pick(opt: string) {
    if (picked) return;
    setPicked(opt);
    if (opt === qs[idx].answer) setScore((s) => s + 1);
    playWord(qs[idx].answer); // nghe lại từ đúng để xác nhận
  }

  function next() {
    if (idx + 1 >= qs.length) setDone(true);
    else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }

  if (!started) {
    return (
      <div className="rounded-3xl border border-primary/20 bg-primary-soft/30 p-7 text-center shadow-sm">
        <p className="text-4xl">📝</p>
        <p className="mt-2 font-display text-lg font-black text-foreground">Kiểm tra nhận âm</p>
        <p className="mt-1.5 text-xs font-semibold text-muted leading-relaxed">
          {QN_SOUND + QN_PAIR} câu trộn 2 dạng: <b>nhận âm</b> (âm /X/ có trong từ nào) và <b>phân biệt cặp âm giống nhau</b> (nghe → chọn đúng từ). Vừa nhớ ký hiệu, vừa luyện tai.
        </p>
        <button onClick={start} className="mt-5 rounded-full bg-primary px-7 py-3 text-xs font-black uppercase tracking-wider text-primary-fg active:scale-95">
          Bắt đầu kiểm tra →
        </button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / qs.length) * 100);
    const great = pct >= 80;
    return (
      <div className="rounded-3xl border border-border/60 bg-white/70 p-8 text-center shadow-sm animate-fadeIn dark:bg-zinc-900/60">
        <p className="text-4xl">{great ? "🎉" : "💪"}</p>
        <p className="mt-2 font-display text-2xl font-black text-foreground">
          {score}/{qs.length} <span className="text-base text-muted">({pct}%)</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-muted">
          {great ? "Tuyệt vời! Tai bạn nhận âm tốt." : "Tốt rồi — nghe lại Bảng âm vài lần rồi thử lại nhé."}
        </p>
        <button onClick={start} className="mt-5 rounded-full border border-border/80 bg-white/50 px-6 py-2.5 text-[10px] font-black uppercase tracking-wider text-muted transition-all hover:border-primary/40 hover:text-foreground active:scale-95 dark:bg-black/30">
          ↻ Làm lại
        </button>
      </div>
    );
  }

  const q = qs[idx];
  return (
    <div className="rounded-3xl border border-border/60 bg-white/70 p-6 shadow-sm dark:bg-zinc-900/60 sm:p-7">
      <div className="mb-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
        <span className="text-muted">Câu {idx + 1}/{qs.length}</span>
        <span className="text-primary">Điểm: {score}</span>
      </div>

      {q.kind === "sound" ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Âm nào dưới đây có trong từ?</p>
          <p className="mt-1 font-display text-4xl font-black text-primary">{q.symbol}</p>
          <p className="mt-1 text-[11px] font-medium text-muted">{q.tip}</p>
        </>
      ) : (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Nghe và chọn từ bạn nghe được</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => playWord(q.answer)}
              title="Nghe lại"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-primary-fg shadow-md shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
            >
              🔊
            </button>
            <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-black text-muted">{q.label}</span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-muted">{q.tip}</p>
        </>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {q.options.map((opt) => {
          const isAnswer = opt === q.answer;
          const isPicked = opt === picked;
          let cls = "border-border/70 bg-white/50 text-foreground hover:border-primary/50 dark:bg-black/20";
          if (picked) {
            if (isAnswer) cls = "border-primary bg-primary-soft text-primary";
            else if (isPicked) cls = "border-pink bg-pink-soft text-pink";
            else cls = "border-border/40 opacity-60";
          }
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={!!picked}
              className={`rounded-2xl border-2 px-4 py-3.5 text-center font-display text-base font-black transition-all active:scale-[0.98] ${cls} ${picked ? "cursor-default" : "cursor-pointer"}`}
            >
              {opt}
              {picked && isAnswer && <span className="ml-1.5">✓</span>}
              {picked && isPicked && !isAnswer && <span className="ml-1.5">✗</span>}
            </button>
          );
        })}
      </div>

      {picked && (
        <button onClick={next} className="mt-5 w-full rounded-full bg-primary py-3 text-xs font-black uppercase tracking-wider text-primary-fg active:scale-95">
          {idx + 1 >= qs.length ? "Xem kết quả →" : "Câu tiếp →"}
        </button>
      )}
    </div>
  );
}
