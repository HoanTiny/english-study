"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Audio-call (theo design Figma): NGHE từ tiếng Anh (TTS) → chọn nghĩa đúng trong 5 lựa chọn.
// Có hệ thống MẠNG (5 tim): chọn sai / "I don't know" mất 1 tim. Hết tim → kết thúc.
// Sau khi chọn: hiện đáp án đúng (teal) + lựa chọn sai (đỏ) + nút Next. Phím 1-5 chọn, Space nghe lại.

const WORDS: Record<string, { en: string; vi: string; emoji: string }[]> = {
  A1: [
    { en: "hello", vi: "xin chào", emoji: "👋" },
    { en: "family", vi: "gia đình", emoji: "👨‍👩‍👧" },
    { en: "food", vi: "đồ ăn", emoji: "🍜" },
    { en: "friend", vi: "người bạn", emoji: "🧑‍🤝‍🧑" },
    { en: "weather", vi: "thời tiết", emoji: "⛅" },
    { en: "school", vi: "trường học", emoji: "🏫" },
    { en: "water", vi: "nước", emoji: "💧" },
    { en: "morning", vi: "buổi sáng", emoji: "🌅" },
  ],
  A2: [
    { en: "depends on", vi: "phụ thuộc vào", emoji: "⚖️" },
    { en: "routine", vi: "thói quen", emoji: "🔁" },
    { en: "restaurant", vi: "nhà hàng", emoji: "🍽️" },
    { en: "opinion", vi: "ý kiến", emoji: "💬" },
    { en: "weekend", vi: "cuối tuần", emoji: "📅" },
    { en: "expensive", vi: "đắt đỏ", emoji: "💸" },
    { en: "delicious", vi: "ngon", emoji: "😋" },
    { en: "ticket", vi: "vé", emoji: "🎫" },
  ],
  B1: [
    { en: "conversation", vi: "cuộc hội thoại", emoji: "🗣️" },
    { en: "confidence", vi: "sự tự tin", emoji: "💪" },
    { en: "improve", vi: "cải thiện", emoji: "📈" },
    { en: "recommend", vi: "gợi ý, đề xuất", emoji: "👍" },
    { en: "experience", vi: "trải nghiệm", emoji: "✨" },
    { en: "decision", vi: "quyết định", emoji: "🤔" },
    { en: "journey", vi: "hành trình", emoji: "🧭" },
    { en: "average", vi: "trung bình", emoji: "📊" },
  ],
  B2: [
    { en: "fluency", vi: "sự trôi chảy", emoji: "🌊" },
    { en: "pronunciation", vi: "sự phát âm", emoji: "🔉" },
    { en: "rewarding", vi: "xứng đáng", emoji: "🏆" },
    { en: "assessment", vi: "sự đánh giá", emoji: "📝" },
    { en: "anniversary", vi: "lễ kỷ niệm", emoji: "🎉" },
    { en: "overwhelmed", vi: "quá tải cảm xúc", emoji: "🤯" },
    { en: "approach", vi: "cách tiếp cận", emoji: "🧩" },
    { en: "achievement", vi: "thành tựu", emoji: "🥇" },
  ],
};

const MAX_LIVES = 5;
type Phase = "welcome" | "playing" | "results";
type Word = { en: string; vi: string; emoji: string };
type Hist = { en: string; vi: string; correct: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function AudioCallGame() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [level, setLevel] = useState("A1");
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<Hist[]>([]);
  const [word, setWord] = useState<Word | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const livesRef = useRef(MAX_LIVES);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }, []);

  const nextQuestion = useCallback((lvl: string) => {
    const list = WORDS[lvl] || WORDS.A1;
    const w = list[Math.floor(Math.random() * list.length)];
    const distractors = shuffle(list.filter((x) => x.en !== w.en)).slice(0, 4).map((x) => x.vi);
    setWord(w);
    setOptions(shuffle([w.vi, ...distractors]));
    setPicked(null);
    speak(w.en);
  }, [speak]);

  function start(lvl: string) {
    setHistory([]);
    setScore(0);
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setPhase("playing");
    nextQuestion(lvl);
  }

  const choose = useCallback(
    (opt: string | null) => {
      if (!word || picked !== null) return;
      const correct = opt === word.vi;
      setPicked(opt ?? "__skip__");
      setHistory((p) => [...p, { en: word.en, vi: word.vi, correct }]);
      if (correct) {
        setScore((p) => p + 10);
      } else {
        const left = livesRef.current - 1;
        livesRef.current = left;
        setLives(left);
      }
    },
    [word, picked],
  );

  const next = useCallback(() => {
    if (livesRef.current <= 0) {
      setPhase("results");
      return;
    }
    nextQuestion(level);
  }, [level, nextQuestion]);

  // Phím tắt: 1-5 chọn, Space nghe lại, Enter sang câu kế khi đã trả lời.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "playing") return;
      if (e.key === " ") {
        e.preventDefault();
        if (word) speak(word.en);
        return;
      }
      if (picked === null) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length) choose(options[n - 1]);
      } else if (e.key === "Enter") {
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, word, options, picked, choose, next, speak]);

  const known = history.filter((h) => h.correct);
  const unknown = history.filter((h) => !h.correct);
  const answered = picked !== null;

  return (
    <div className="mx-auto max-w-3xl px-2">
      {/* WELCOME */}
      {phase === "welcome" && (
        <div className="liquid-glass-card flex flex-col items-center gap-7 p-8 text-center md:p-12 border border-border/80 shadow-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md animate-fadeIn">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft border border-primary/20 text-5xl shadow-inner animate-bounce">🎧</div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
                ⚡ LUYỆN THÍNH GIÁC PHẢN XẠ
              </span>
              <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl leading-none mt-2 w-full">Audio-call</h2>
            </div>
            <p className="mx-auto max-w-md text-xs sm:text-sm font-semibold leading-relaxed text-muted">
              Lắng nghe phát âm từ trợ lý tiếng Anh rồi tìm nghĩa chính xác trong 5 lựa chọn. Bạn có {MAX_LIVES} mạng — chọn sai mất một mạng.
            </p>
          </div>
          
          <div className="space-y-2.5">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted">Chọn trình độ CEFR</p>
            <div className="flex justify-center gap-3">
              {Object.keys(WORDS).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`h-11 w-11 rounded-full border-2 text-xs font-black transition-all duration-300 active:scale-95 cursor-pointer shadow-sm ${
                    level === lvl
                      ? "border-primary bg-primary text-primary-fg shadow-md scale-110"
                      : "border-border/60 bg-surface/50 text-muted hover:border-primary/50"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          
          <button onClick={() => start(level)} className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider shadow-md">
            Bắt đầu nghe
          </button>
        </div>
      )}

      {/* PLAYING */}
      {phase === "playing" && word && (
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-6 md:p-8 text-center border border-border/80 shadow-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md animate-fadeIn">
          {/* Vòng tròn Play / ảnh từ sau khi trả lời */}
          <button
            onClick={() => speak(word.en)}
            className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 border-primary text-primary transition-all duration-300 hover:scale-105 active:scale-95 bg-surface/50 shadow-lg cursor-pointer"
            title="Nghe lại (Phím Space)"
          >
            {answered ? (
              <span className="text-6xl animate-bounce">{word.emoji}</span>
            ) : (
              <>
                <span className="text-4xl animate-pulse">🔊</span>
                <span className="mt-1.5 text-[9px] font-black uppercase tracking-widest">Nghe lại</span>
              </>
            )}
          </button>

          {/* Nhãn từ (hiện sau khi trả lời) */}
          {answered && (
            <div className="flex items-center gap-2 rounded-full bg-primary-soft/80 border border-primary/20 px-5 py-2 shadow-sm animate-fadeIn">
              <span className="text-base">🎵</span>
              <span className="text-sm font-black text-primary tracking-tight">{word.en}</span>
              <span className="text-xs font-semibold text-muted">- {word.vi}</span>
            </div>
          )}

          {/* Mạng (tim) */}
          <div className="flex gap-1.5 text-2xl">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={`transition-all duration-500 ${i < lives ? "scale-100" : "opacity-20 grayscale scale-75"}`}>❤️</span>
            ))}
          </div>

          {/* Lựa chọn */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 max-w-lg mt-2">
            {options.map((opt, i) => {
              let cls = "border-border/60 bg-surface/50 text-foreground hover:border-primary/60 hover:scale-[1.02] shadow-sm";
              if (answered) {
                if (opt === word.vi) cls = "border-primary bg-primary-soft text-primary font-black shadow-sm";
                else if (opt === picked) cls = "border-pink bg-pink-soft text-pink font-black shadow-sm";
                else cls = "border-border bg-surface/20 text-muted opacity-50";
              }
              return (
                <button
                  key={opt}
                  disabled={answered}
                  onClick={() => choose(opt)}
                  className={`rounded-full border-2 px-5 py-3 text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center gap-2 ${cls}`}
                >
                  <span className="rounded-lg bg-black/5 dark:bg-white/5 border border-border/40 text-[9px] font-black w-5 h-5 flex items-center justify-center shrink-0">{i + 1}</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Hành động: I don't know / Next */}
          <div className="mt-2 w-full flex justify-center">
            {!answered ? (
              <button
                onClick={() => choose(null)}
                className="rounded-full border border-primary/20 bg-primary-soft px-8 py-3 text-xs font-black uppercase tracking-wider text-primary transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              >
                Bỏ qua
              </button>
            ) : (
              <button onClick={next} className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider shadow-md">
                {lives <= 0 ? "Xem kết quả →" : "Đoạn tiếp →"}
              </button>
            )}
          </div>

          <p className="text-[10px] font-black uppercase tracking-wider text-muted mt-2">
            * Bấm phím 1–{options.length} để chọn nhanh · Phím Space để nghe lại · Phím Enter để đi tiếp
          </p>
        </div>
      )}

      {/* RESULTS */}
      {phase === "results" && (
        <div className="liquid-glass-card flex flex-col gap-8 p-6 md:flex-row md:p-10 border border-border/80 shadow-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md animate-fadeIn">
          <div className="flex w-full flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-surface p-6 text-center md:w-5/12 shadow-sm">
            <span className="text-6xl animate-bounce">🏆</span>
            <h3 className="font-display text-xl font-extrabold text-foreground">Kết quả đàm thoại</h3>
            <p className="text-xs font-semibold text-muted">Bạn đã làm rất xuất sắc!</p>
            <div className="grid w-full grid-cols-2 gap-3 mt-2">
              <div className="rounded-2xl border border-pink/20 bg-pink-soft py-3 shadow-sm">
                <p className="text-xl font-black text-pink">❤ {Math.max(0, lives)}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted mt-0.5">mạng còn</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary-soft py-3 shadow-sm">
                <p className="text-xl font-black text-primary">{history.length}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted mt-0.5">từ đã nghe</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2.5 mt-4">
              <button onClick={() => start(level)} className="liquid-glass-btn py-3 text-xs font-black uppercase tracking-wider shadow-md">🔄 Chơi lại</button>
              <button onClick={() => setPhase("welcome")} className="rounded-full border border-border/60 bg-surface py-3 text-xs font-black uppercase tracking-wider text-foreground hover:border-primary/45 cursor-pointer shadow-sm">
                🏠 Về sảnh chờ
              </button>
            </div>
          </div>
          
          <div className="flex w-full flex-col md:w-7/12">
            <h4 className="mb-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted">📋 Danh sách từ ôn luyện lại</h4>
            <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto max-h-[45vh] pr-1">
              <div className="space-y-2">
                <p className="rounded-lg bg-primary-soft border border-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary sticky top-0 bg-background/95 z-1 shadow-sm">✓ Đúng ({known.length})</p>
                {known.length === 0 ? (
                  <p className="p-2 text-center text-[10px] italic text-muted">Chưa có.</p>
                ) : known.map((it, i) => (
                  <div key={i} onClick={() => speak(it.en)} className="cursor-pointer rounded-xl border border-border/40 bg-surface/50 p-2.5 transition-all hover:border-primary/45 shadow-sm flex flex-col gap-0.5" title="Bấm nghe lại">
                    <span className="block text-xs font-black text-foreground">{it.en}</span>
                    <span className="text-[10px] text-muted">{it.vi}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="rounded-lg bg-pink-soft border border-pink/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-pink sticky top-0 bg-background/95 z-1 shadow-sm">✗ Sai ({unknown.length})</p>
                {unknown.length === 0 ? (
                  <p className="p-2 text-center text-[10px] font-black text-primary bg-primary-soft border border-primary/10 rounded-xl">✓ Hoàn hảo!</p>
                ) : unknown.map((it, i) => (
                  <div key={i} onClick={() => speak(it.en)} className="cursor-pointer rounded-xl border border-border/40 bg-surface/50 p-2.5 transition-all hover:border-pink/45 shadow-sm flex flex-col gap-0.5" title="Bấm nghe lại">
                    <span className="block text-xs font-black text-foreground">{it.en}</span>
                    <span className="text-[10px] text-muted">{it.vi}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
