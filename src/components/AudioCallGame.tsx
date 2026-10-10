"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import vocabData from "@/data/vocab.json";
import { CEFR_WORDS, type CefrLevel } from "@/data/cefrWords";

// Audio-call (theo design Figma): NGHE từ tiếng Anh (TTS) → chọn nghĩa đúng trong 5 lựa chọn.
// Có hệ thống MẠNG (5 tim): chọn sai / "I don't know" mất 1 tim. Hết tim → kết thúc.
// Sau khi chọn: hiện đáp án đúng (teal) + lựa chọn sai (đỏ) + nút Next. Phím 1-5 chọn, Space nghe lại.
// Chống lặp: bốc từ theo "bộ bài" (hết từ mới rồi mới quay lại), ưu tiên từ chưa nghe ở các lượt trước.

type Word = { en: string; vi: string; emoji?: string };
type Source = "cefr" | "topic" | "ai";

const VOCAB = vocabData as { en: string; vi: string; topic: string }[];
const VOCAB_TOPICS = [...new Set(VOCAB.map((v) => v.topic))];
const LEVELS = Object.keys(CEFR_WORDS) as CefrLevel[];
const CEFR_TOTAL = LEVELS.reduce((n, l) => n + CEFR_WORDS[l].length, 0);
// Kho dự phòng lấy phương án nhiễu khi bộ từ đang chơi quá nhỏ (vd. bộ AI chỉ vài từ).
const ALL_WORDS: Word[] = [...LEVELS.flatMap((l) => CEFR_WORDS[l]), ...VOCAB];

const TOPIC_EMOJI: Record<string, string> = {
  "Con vật nuôi": "🐾", "Cơ thể người": "🫀", "Cảm xúc": "😊", "Du lịch": "✈️", "Gia đình": "👨‍👩‍👧",
  "Kinh doanh": "💼", "Mua sắm": "🛍️", "Màu sắc": "🎨", "Máy tính & Internet": "💻", "Món ăn thực phẩm": "🍲",
  "Môi trường": "🌍", "Ngoại hình": "🪞", "Quần áo và thời trang": "👗", "Sở thích": "🎯", "Thời tiết": "⛅",
  "Thức uống": "🥤", "Truyền hình báo chí": "📰", "Trường học": "🏫", "Tính cách": "🧠", "Điện thoại - Thư tín": "📮",
};

const MAX_LIVES = 5;
const SEEN_KEY = "audiocall-seen-v1";
type Phase = "welcome" | "playing" | "results";
type Hist = { en: string; vi: string; correct: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lịch sử nghe theo từng bộ từ (chỉ là tiện ích trên máy — storage lỗi/bị chặn thì coi như chưa nghe gì).
function loadSeen(poolKey: string): string[] {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    return Array.isArray(all[poolKey]) ? all[poolKey] : [];
  } catch {
    return [];
  }
}
function markSeen(poolKey: string, en: string, cap: number) {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    const list: string[] = (Array.isArray(all[poolKey]) ? all[poolKey] : []).filter((x: string) => x !== en);
    list.push(en);
    all[poolKey] = list.slice(-cap);
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch {
    // bỏ qua
  }
}

// Bộ bài: từ chưa nghe gần đây (xáo trộn) lên trước, từ đã nghe xếp sau — nghe lâu nhất thì ra trước.
function buildDeck(pool: Word[], recent: string[], avoidFirst: string | null): Word[] {
  const rank = new Map(recent.map((en, i) => [en, i]));
  const fresh = shuffle(pool.filter((w) => !rank.has(w.en)));
  const stale = pool.filter((w) => rank.has(w.en)).sort((a, b) => rank.get(a.en)! - rank.get(b.en)!);
  const deck = [...fresh, ...stale];
  if (avoidFirst && deck.length > 1 && deck[0].en === avoidFirst) deck.push(deck.shift()!);
  return deck;
}

// Hai nghĩa "quá giống" (trùng một vế, hoặc vế này nằm trọn trong vế kia: "ăn" ~ "đồ ăn")
// thì không cho cùng xuất hiện, tránh câu hỏi có 2 đáp án đều hợp lý.
function meaningParts(vi: string): string[] {
  return vi
    .toLowerCase()
    .split(/[,;]/)
    .map((s) => s.replace(/\(.*?\)/g, "").replace(/\.\.\./g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
function tooSimilar(a: string, b: string): boolean {
  for (const x of meaningParts(a)) {
    for (const y of meaningParts(b)) {
      const [s, l] = x.length < y.length ? [x, y] : [y, x];
      if (` ${l} `.includes(` ${s} `)) return true;
    }
  }
  return false;
}

function pickOptions(answer: Word, pool: Word[]): string[] {
  const out: string[] = [];
  const fits = (w: Word) =>
    w.en !== answer.en && !tooSimilar(w.vi, answer.vi) && out.every((o) => !tooSimilar(o, w.vi));
  for (const src of [pool, ALL_WORDS]) {
    for (const w of shuffle(src)) {
      if (out.length === 4) break;
      if (fits(w)) out.push(w.vi);
    }
  }
  return shuffle([answer.vi, ...out]);
}

function dedupe(pool: Word[]): Word[] {
  return [...new Map(pool.map((w) => [w.en.toLowerCase(), w])).values()];
}

export default function AudioCallGame() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [source, setSource] = useState<Source>("cefr");
  const [level, setLevel] = useState<CefrLevel>("A1");
  const [vocabTopic, setVocabTopic] = useState(VOCAB_TOPICS[0]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [poolLabel, setPoolLabel] = useState("");
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<Hist[]>([]);
  const [word, setWord] = useState<Word | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const livesRef = useRef(MAX_LIVES);
  const poolRef = useRef<Word[]>([]);
  const poolKeyRef = useRef<string | null>(null);
  const deckRef = useRef<Word[]>([]);
  const lastEnRef = useRef<string | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }, []);

  const nextQuestion = useCallback(() => {
    const pool = poolRef.current;
    // Hết bộ bài → xáo lại cả bộ, tránh từ vừa nghe lặp ngay câu kế.
    if (deckRef.current.length === 0) deckRef.current = buildDeck(pool, [], lastEnRef.current);
    const w = deckRef.current.shift()!;
    lastEnRef.current = w.en;
    if (poolKeyRef.current) markSeen(poolKeyRef.current, w.en, pool.length);
    setWord(w);
    setOptions(pickOptions(w, pool));
    setPicked(null);
    speak(w.en);
  }, [speak]);

  function startWith(rawPool: Word[], label: string, key: string | null) {
    const pool = dedupe(rawPool);
    poolRef.current = pool;
    poolKeyRef.current = key;
    deckRef.current = buildDeck(pool, key ? loadSeen(key) : [], null);
    lastEnRef.current = null;
    setPoolLabel(label);
    setHistory([]);
    setScore(0);
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setPhase("playing");
    nextQuestion();
  }

  function startCefr() {
    startWith(CEFR_WORDS[level], `Cấp độ ${level}`, `cefr:${level}`);
  }
  function startTopic() {
    const emoji = TOPIC_EMOJI[vocabTopic];
    const pool = VOCAB.filter((v) => v.topic === vocabTopic).map(({ en, vi }) => ({ en, vi, emoji }));
    startWith(pool, vocabTopic, `topic:${vocabTopic}`);
  }
  async function startAi() {
    setAiErr("");
    setAiLoading(true);
    try {
      const qs = new URLSearchParams({ level, n: "30" });
      if (aiTopic.trim()) qs.set("topic", aiTopic.trim());
      const res = await fetch(`/api/sprint-words?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được từ.");
      startWith(data.words as Word[], `AI · ${level}${aiTopic.trim() ? " · " + aiTopic.trim() : ""}`, null);
    } catch (e) {
      setAiErr(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setAiLoading(false);
    }
  }
  // Chơi lại đúng bộ từ hiện tại — bộ bài tiếp tục ưu tiên những từ chưa nghe.
  function replay() {
    startWith(poolRef.current, poolLabel, poolKeyRef.current);
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
    nextQuestion();
  }, [nextQuestion]);

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

  const startBtn = "liquid-glass-btn w-full max-w-xs px-8 py-3.5 text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50";

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

          {/* Nguồn từ vựng */}
          <div className="flex w-full max-w-sm gap-1.5 rounded-2xl border border-border/60 bg-background/50 p-1 text-[10px] font-black uppercase tracking-wider">
            {([["cefr", "Cấp độ"], ["topic", "Chủ đề"], ["ai", "🤖 AI tạo"]] as [Source, string][]).map(([s, lbl]) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`flex-1 rounded-xl py-2 transition-all cursor-pointer ${source === s ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-foreground"}`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {(source === "cefr" || source === "ai") && (
            <div className="space-y-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted">Chọn trình độ CEFR</p>
              <div className="flex flex-wrap justify-center gap-3">
                {LEVELS.map((lvl) => (
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
              {source === "cefr" && (
                <p className="text-[10px] font-semibold text-muted">
                  {CEFR_WORDS[level].length} từ ở cấp {level} · ưu tiên từ bạn chưa nghe ở các lượt trước
                </p>
              )}
            </div>
          )}

          {source === "topic" && (
            <div className="w-full max-w-sm space-y-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted">Chủ đề từ vựng ({VOCAB.length} từ trong kho)</p>
              <select
                value={vocabTopic}
                onChange={(e) => setVocabTopic(e.target.value)}
                className="w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-primary"
              >
                {VOCAB_TOPICS.map((t) => (
                  <option key={t} value={t}>{t} ({VOCAB.filter((v) => v.topic === t).length})</option>
                ))}
              </select>
            </div>
          )}

          {source === "ai" && (
            <div className="w-full max-w-sm space-y-2.5">
              <input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Chủ đề (tuỳ chọn): du lịch, công sở…"
                className="w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-2.5 text-sm font-bold text-foreground outline-none focus:border-primary"
              />
              <p className="text-[10px] font-semibold text-muted">AI tạo bộ 30 từ mới mỗi lần bấm — không lần nào giống lần nào.</p>
              {aiErr && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600">{aiErr}</p>}
            </div>
          )}

          {source === "cefr" && <button onClick={startCefr} className={startBtn}>Bắt đầu nghe</button>}
          {source === "topic" && <button onClick={startTopic} className={startBtn}>Bắt đầu nghe</button>}
          {source === "ai" && (
            <button onClick={startAi} disabled={aiLoading} className={startBtn}>
              {aiLoading ? "🤖 Đang tạo bộ từ…" : "🤖 Tạo bằng AI & nghe"}
            </button>
          )}

          <p className="text-[10px] font-semibold text-muted">
            Kho {CEFR_TOTAL} từ A1–C2 + {VOCAB.length} từ theo {VOCAB_TOPICS.length} chủ đề
          </p>
        </div>
      )}

      {/* PLAYING */}
      {phase === "playing" && word && (
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-6 md:p-8 text-center border border-border/80 shadow-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md animate-fadeIn">
          <div className="flex w-full items-center justify-between gap-3 text-[9px] font-black uppercase tracking-wider text-muted">
            <span className="truncate">{poolLabel}</span>
            <span className="shrink-0">Câu {history.length + (answered ? 0 : 1)} · {score} điểm</span>
          </div>

          {/* Vòng tròn Play / ảnh từ sau khi trả lời */}
          <button
            onClick={() => speak(word.en)}
            className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 border-primary text-primary transition-all duration-300 hover:scale-105 active:scale-95 bg-surface/50 shadow-lg cursor-pointer"
            title="Nghe lại (Phím Space)"
          >
            {answered ? (
              <span className="text-6xl animate-bounce">{word.emoji ?? "🎧"}</span>
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
            <p className="text-xs font-semibold text-muted">{poolLabel}</p>
            <div className="mt-1">
              <p className="font-display text-4xl font-black text-primary leading-none">{score}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-muted mt-1">điểm</p>
            </div>
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
              <button onClick={replay} className="liquid-glass-btn py-3 text-xs font-black uppercase tracking-wider shadow-md">🔄 Chơi tiếp bộ này</button>
              <button onClick={() => setPhase("welcome")} className="rounded-full border border-border/60 bg-surface py-3 text-xs font-black uppercase tracking-wider text-foreground hover:border-primary/45 cursor-pointer shadow-sm">
                🏠 Đổi bộ từ
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
