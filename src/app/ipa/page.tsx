"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IPA_SOUNDS, MINIMAL_PAIRS, TYPE_LABEL, type IpaSound, type SoundType } from "@/data/ipa";
import { fetchPronounce } from "@/lib/pronounce";
import WordCardDeck from "@/components/WordCardDeck";

type Mode = "chart" | "shadow" | "discriminate";

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
      <div className="mb-7 grid grid-cols-3 gap-1 rounded-2xl border border-border/60 bg-black/[0.03] p-1 dark:bg-white/5">
        {([
          ["chart", "📋", "Bảng 44 âm"],
          ["shadow", "🎧", "Nghe & nhại"],
          ["discriminate", "🎯", "Phân biệt"],
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
            className="relative w-full rounded-t-3xl border border-black/5 bg-white px-6 pb-7 pt-8 shadow-2xl dark:border-white/10 dark:bg-zinc-900 sm:max-w-sm sm:rounded-3xl"
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
