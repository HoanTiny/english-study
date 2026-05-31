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

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }

  const nextQuestion = useCallback((lvl: string) => {
    const list = WORDS[lvl] || WORDS.A1;
    const w = list[Math.floor(Math.random() * list.length)];
    const distractors = shuffle(list.filter((x) => x.en !== w.en)).slice(0, 4).map((x) => x.vi);
    setWord(w);
    setOptions(shuffle([w.vi, ...distractors]));
    setPicked(null);
    speak(w.en);
  }, []);

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

  function next() {
    if (livesRef.current <= 0) {
      setPhase("results");
      return;
    }
    nextQuestion(level);
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, word, options, picked]);

  const known = history.filter((h) => h.correct);
  const unknown = history.filter((h) => !h.correct);
  const answered = picked !== null;

  return (
    <div className="mx-auto max-w-3xl px-2">
      {/* WELCOME */}
      {phase === "welcome" && (
        <div className="liquid-glass-card flex flex-col items-center gap-7 p-8 text-center md:p-12">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary-soft text-6xl">🎧</div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="font-display text-3xl text-foreground sm:text-4xl">Audio-call</h2>
              <span className="rounded-full bg-pink-soft px-2.5 py-0.5 text-[10px] font-bold text-pink">audition task</span>
            </div>
            <p className="mx-auto max-w-md text-sm font-medium leading-relaxed text-muted">
              Nghe từ tiếng Anh rồi chọn nghĩa đúng trong các lựa chọn. Bạn có {MAX_LIVES} mạng —
              chọn sai sẽ mất một mạng. Bấm 🔊 để nghe lại.
            </p>
          </div>
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Chọn trình độ</p>
            <div className="flex justify-center gap-2">
              {Object.keys(WORDS).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`h-11 w-11 rounded-full border-2 text-sm font-black transition-all ${
                    level === lvl
                      ? "scale-110 border-primary bg-primary text-white shadow-md"
                      : "border-border text-muted hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => start(level)} className="liquid-glass-btn px-8 py-3.5 text-sm font-bold">
            Bắt đầu nghe →
          </button>
        </div>
      )}

      {/* PLAYING */}
      {phase === "playing" && word && (
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-8 text-center md:p-10">
          {/* Vòng tròn Play / ảnh từ sau khi trả lời */}
          <button
            onClick={() => speak(word.en)}
            className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 border-primary text-primary transition-transform hover:scale-105 active:scale-95"
            title="Nghe lại (Space)"
          >
            {answered ? (
              <span className="text-6xl">{word.emoji}</span>
            ) : (
              <>
                <span className="text-5xl">🔊</span>
                <span className="mt-1 text-sm font-bold">Play</span>
              </>
            )}
          </button>

          {/* Nhãn từ (hiện sau khi trả lời) */}
          {answered && (
            <div className="flex items-center gap-2 rounded-full bg-surface px-5 py-2 shadow-sm">
              <span className="text-lg">🎵</span>
              <span className="font-bold text-foreground">{word.en}</span>
              <span className="text-muted">- {word.vi}</span>
            </div>
          )}

          {/* Mạng (tim) */}
          <div className="flex gap-1.5 text-2xl">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={i < lives ? "" : "opacity-25 grayscale"}>❤️</span>
            ))}
          </div>

          {/* Lựa chọn */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {options.map((opt, i) => {
              let cls = "border-border bg-surface text-foreground hover:border-primary/60";
              if (answered) {
                if (opt === word.vi) cls = "border-primary bg-primary-soft text-primary";
                else if (opt === picked) cls = "border-pink bg-pink-soft text-pink";
                else cls = "border-border bg-surface text-muted opacity-60";
              }
              return (
                <button
                  key={opt}
                  disabled={answered}
                  onClick={() => choose(opt)}
                  className={`rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-all active:scale-95 ${cls}`}
                >
                  <span className="mr-1 text-[10px] opacity-50">{i + 1}</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Hành động: I don't know / Next */}
          {!answered ? (
            <button
              onClick={() => choose(null)}
              className="rounded-full bg-primary-soft px-6 py-2.5 text-sm font-bold text-primary transition-transform hover:scale-105 active:scale-95"
            >
              I don&apos;t know
            </button>
          ) : (
            <button onClick={next} className="liquid-glass-btn px-8 py-2.5 text-sm font-bold">
              {lives <= 0 ? "Xem kết quả →" : "Next →"}
            </button>
          )}

          <p className="text-[10px] font-semibold text-muted">
            💡 Phím 1–{options.length} để chọn · Space nghe lại · Enter sang câu kế
          </p>
        </div>
      )}

      {/* RESULTS */}
      {phase === "results" && (
        <div className="liquid-glass-card flex flex-col gap-8 p-6 md:flex-row md:p-10">
          <div className="flex w-full flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-surface p-6 text-center md:w-5/12">
            <span className="text-6xl">🎧</span>
            <h3 className="font-display text-xl text-foreground">Kết quả Audio-call</h3>
            <p className="text-xs font-semibold text-muted">Bạn đã làm khá tốt!</p>
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-2xl border-2 border-pink py-3">
                <p className="text-xl font-black text-pink">❤ {Math.max(0, lives)}</p>
                <p className="text-[10px] font-bold uppercase text-muted">mạng còn</p>
              </div>
              <div className="rounded-2xl border-2 border-primary py-3">
                <p className="text-xl font-black text-primary">{history.length}</p>
                <p className="text-[10px] font-bold uppercase text-muted">từ đã nghe</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button onClick={() => start(level)} className="liquid-glass-btn py-3 text-xs font-bold">🔄 Chơi lại</button>
              <button onClick={() => setPhase("welcome")} className="rounded-2xl border border-border bg-surface py-3 text-xs font-bold text-foreground hover:border-primary/40">
                🏠 Về sảnh
              </button>
            </div>
          </div>
          <div className="flex w-full flex-col md:w-7/12">
            <h4 className="mb-3 text-sm font-black uppercase tracking-wider text-muted">📋 Ôn lại từ vựng</h4>
            <div className="grid flex-1 grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-extrabold text-primary">✓ Nghe đúng ({known.length})</p>
                {known.length === 0 ? (
                  <p className="p-2 text-center text-[11px] italic text-muted">Chưa có.</p>
                ) : known.map((it, i) => (
                  <div key={i} onClick={() => speak(it.en)} className="cursor-pointer rounded-xl border border-border bg-surface p-2.5 transition-all hover:border-primary/40" title="Nghe">
                    <span className="block text-xs font-extrabold text-foreground">{it.en}</span>
                    <span className="text-[10px] text-muted">{it.vi}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="rounded-lg bg-pink-soft px-2.5 py-1 text-xs font-extrabold text-pink">✗ Chưa thuộc ({unknown.length})</p>
                {unknown.length === 0 ? (
                  <p className="p-2 text-center text-[11px] font-bold text-primary">✓ Tuyệt vời!</p>
                ) : unknown.map((it, i) => (
                  <div key={i} onClick={() => speak(it.en)} className="cursor-pointer rounded-xl border border-border bg-surface p-2.5 transition-all hover:border-pink/40" title="Nghe">
                    <span className="block text-xs font-extrabold text-foreground">{it.en}</span>
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
