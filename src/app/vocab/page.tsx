"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { lessonContent } from "@/lib/lessons";
import { fetchPronounce, isSingleWord } from "@/lib/pronounce";
import PronounceBar from "@/components/PronounceBar";
import { useAuth } from "@/lib/auth";
import { addNote } from "@/lib/notesRepo";
import { gradeNote } from "@/lib/reviewRepo";
import { todayKey } from "@/lib/store";
import type { Grade } from "@/lib/srs";
import vocabWords from "@/data/vocab.json";
import sentencesData from "@/data/sentences.json";

// Nhãn thời gian cho 4 nút đánh giá (xấp xỉ FSRS cho thẻ mới).
const GRADES: { g: Grade; label: string; when: string; cls: string }[] = [
  { g: "again", label: "Học lại", when: "trong ngày", cls: "bg-pink-soft text-pink" },
  { g: "hard", label: "Khó", when: "1–2 ngày", cls: "bg-amber-400/20 text-amber-600 dark:text-amber-400" },
  { g: "good", label: "Tốt", when: "vài ngày", cls: "bg-primary-soft text-primary" },
  { g: "easy", label: "Dễ", when: "~1 tuần", cls: "bg-emerald-400/20 text-emerald-600 dark:text-emerald-400" },
];

type Card = { en: string; vi: string; ipa?: string; example?: string; cefr: string };
type Deck = { slug: string; title: string; cefr: string; emoji: string; cards: Card[]; isWord?: boolean };
type Mode = "flashcard" | "type" | "choice";

// Emoji theo chủ đề (tên file Excel = chủ đề tiếng Việt)
const TOPIC_EMOJI: Record<string, string> = {
  "Con vật nuôi": "🐾", "Cơ thể người": "🦴", "Cảm xúc": "😊", "Du lịch": "✈️",
  "Gia đình": "👨‍👩‍👧", "Kinh doanh": "💼", "Mua sắm": "🛍️", "Màu sắc": "🎨",
  "Máy tính & Internet": "💻", "Món ăn thực phẩm": "🍽️", "Môi trường": "🌍",
  "Mẫu câu chào hỏi tiếng anh với người nước ngoài": "👋", "Ngoại hình": "🧑",
  "Quần áo và thời trang": "👗", "Sở thích": "🎮", "Thời tiết": "⛅", "Thức uống": "🥤",
  "Truyền hình báo chí": "📺", "Trường học": "🏫", "Tính cách": "✨", "Điện thoại - Thư tín": "📱",
};

type WordRow = { en: string; vi: string; ipa?: string; pos: string; topic: string };
// Bộ thẻ TỪ ĐƠN — gom theo chủ đề từ 21 file Excel (có IPA + nghĩa Việt).
const WORD_DECKS: Deck[] = (() => {
  const byTopic = new Map<string, Card[]>();
  for (const w of vocabWords as WordRow[]) {
    if (!byTopic.has(w.topic)) byTopic.set(w.topic, []);
    byTopic.get(w.topic)!.push({ en: w.en, vi: w.vi, ipa: w.ipa, cefr: "A1–A2" });
  }
  return [...byTopic.entries()].map(([topic, cards]) => ({
    slug: "w-" + topic,
    title: topic,
    cefr: "A1–A2",
    emoji: TOPIC_EMOJI[topic] ?? "📘",
    cards,
    isWord: true,
  }));
})();

// Bộ thẻ MẪU CÂU GIAO TIẾP — gom theo nhóm (từ 7 file câu giao tiếp).
type SentRow = { en: string; vi: string; topic: string };
const SENTENCE_DECKS: Deck[] = (() => {
  const byTopic = new Map<string, Card[]>();
  for (const s of sentencesData as SentRow[]) {
    if (!byTopic.has(s.topic)) byTopic.set(s.topic, []);
    byTopic.get(s.topic)!.push({ en: s.en, vi: s.vi, cefr: "Giao tiếp" });
  }
  return [...byTopic.entries()].map(([topic, cards]) => ({
    slug: "s-" + topic,
    title: topic,
    cefr: "Giao tiếp",
    emoji: "💬",
    cards,
    isWord: true,
  }));
})();

const EMOJI: Record<string, string> = {
  greetings: "👋", family: "👨‍👩‍👧", "numbers-time": "🕐", food: "🍜", "ipa-sounds": "🔤",
  "describe-compare": "📐", "daily-routine": "🔁", "past-simple": "⏪", "places-directions": "🧭",
  "health-body": "🩺", "free-time": "⚽", "present-continuous": "🎬", "future-plans": "📅",
  "present-perfect": "✅", "weather-seasons": "⛅", "jobs-ambitions": "💼", "adverbs-manner": "🏃",
  "first-conditional": "🔀", restaurant: "🍽️", travel: "✈️", opinions: "💬", "think-in-english": "🧠",
};

const DECKS: Deck[] = Object.values(lessonContent).map((l) => ({
  slug: l.slug,
  title: l.title,
  cefr: l.cefr,
  emoji: EMOJI[l.slug] ?? "📘",
  cards: l.phrases.map((p) => ({ ...p, cefr: l.cefr })),
}));

function bucket(cefr: string): "A1" | "A2" | "B1" {
  const c = cefr.toUpperCase();
  if (c.startsWith("A1")) return "A1";
  if (c.startsWith("A2")) return "A2";
  return "B1";
}

const COLLECTIONS: { key: "A1" | "A2" | "B1"; name: string; grad: string }[] = [
  { key: "A1", name: "Khởi đầu A1", grad: "from-emerald-400/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400" },
  { key: "A2", name: "Mở rộng A2", grad: "from-amber-400/20 to-orange-500/20 text-amber-600 dark:text-amber-400" },
  { key: "B1", name: "Giao tiếp B1+", grad: "from-pink-400/20 to-fuchsia-500/20 text-pink dark:text-pink-soft" },
];

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: "flashcard", label: "Flashcard", icon: "🔁" },
  { key: "type", label: "Đoán (gõ)", icon: "⌨️" },
  { key: "choice", label: "Trắc nghiệm", icon: "📝" },
];

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/…|\.\.\./g, "").replace(/[.,!?"'’]/g, "").replace(/\s+/g, " ").trim();
}

function speak(text: string, rate = 0.95) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

async function play(text: string) {
  if (isSingleWord(text)) {
    try {
      const p = await fetchPronounce(text);
      if (p.audio) {
        await new Audio(p.audio).play();
        return;
      }
    } catch {
      /* fallback */
    }
  }
  speak(text);
}

// Lưới thẻ dùng chung cho mọi danh mục.
function DeckGrid({ decks, grad, badge, unit, onPick }: {
  decks: Deck[];
  grad: string;
  badge?: string;
  unit: string;
  onPick: (d: Deck) => void;
}) {
  if (decks.length === 0)
    return <p className="py-8 text-center text-sm font-semibold text-muted">Không tìm thấy bộ thẻ nào.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((d) => (
        <button
          key={d.slug}
          onClick={() => onPick(d)}
          className="liquid-glass-interactive group flex flex-col overflow-hidden p-0 text-left border border-border/60 shadow-md rounded-2xl relative cursor-pointer"
        >
          {/* Subtle Background Glow inside the card */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-pink-soft/5 blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-4 p-5">
            {/* Elegant glassmorphic squircle for emoji */}
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-3xl shadow-inner border border-border/40 relative group-hover:scale-105 transition-transform duration-300`}>
              <div className="absolute inset-0 bg-white/10 dark:bg-black/10 rounded-2xl" />
              <span className="relative z-1">{d.emoji}</span>
            </div>
            
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary-soft/60 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-primary">{badge ?? d.cefr}</span>
                <span className="text-[10px] font-bold text-muted">{d.cards.length} {unit}</span>
              </div>
              <h3 className="font-display text-sm font-bold leading-tight text-foreground truncate mt-1">{d.title}</h3>
              <span className="text-[10px] font-bold text-primary inline-flex items-center gap-1 mt-1 group-hover:translate-x-1 transition-all duration-300">
                Học ngay <span className="text-[12px]">→</span>
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

const CATS = [
  { key: "lesson" as const, label: "Theo bài học", icon: "📗", count: DECKS.length },
  { key: "word" as const, label: "Từ chủ đề", icon: "🔤", count: WORD_DECKS.length },
  { key: "sentence" as const, label: "Mẫu câu giao tiếp", icon: "💬", count: SENTENCE_DECKS.length },
];

export default function VocabPage() {
  const { userId } = useAuth();
  const [cat, setCat] = useState<"lesson" | "word" | "sentence">("lesson");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [deck, setDeck] = useState<Deck | null>(null);
  const [phase, setPhase] = useState<"library" | "playing" | "done">("library");
  const [mode, setMode] = useState<Mode>("flashcard");
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [known, setKnown] = useState(0);
  const [again, setAgain] = useState(0);
  
  // Trạng thái mỗi thẻ
  const [revealed, setRevealed] = useState(false); // flashcard
  const [typed, setTyped] = useState(""); // type
  const [hinted, setHinted] = useState(false); // type
  const [chosen, setChosen] = useState<string | null>(null); // choice
  const [resolved, setResolved] = useState<null | boolean>(null); // type/choice: đúng/sai
  const [extra, setExtra] = useState<{ sentence: string; vi: string } | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);

  const card = cards[idx];

  // Lựa chọn trắc nghiệm (ổn định theo từng thẻ)
  const options = useMemo(() => {
    if (!card || cards.length === 0) return [];
    const others = shuffle(cards.filter((c) => c.en !== card.en)).slice(0, 3).map((c) => c.en);
    return shuffle([card.en, ...others]);
  }, [card, cards]);

  function resetCard() {
    setRevealed(false);
    setTyped("");
    setHinted(false);
    setChosen(null);
    setResolved(null);
    setExtra(null);
  }

  function startDeck(d: Deck, m: Mode = mode) {
    const c = shuffle(d.cards).slice(0, 20);
    setDeck(d);
    setMode(m);
    setCards(c);
    setIdx(0);
    setKnown(0);
    setAgain(0);
    resetCard();
    setPhase("playing");
    play(c[0].en);
  }

  function advance(ok: boolean) {
    if (ok) setKnown((k) => k + 1);
    else setAgain((a) => a + 1);
    const next = idx + 1;
    if (next >= cards.length) {
      setPhase("done");
      return;
    }
    setIdx(next);
    resetCard();
    play(cards[next].en);
  }

  function checkType() {
    if (!card) return;
    setResolved(norm(typed) === norm(card.en));
  }

  function pick(opt: string) {
    if (resolved !== null || !card) return;
    setChosen(opt);
    setResolved(opt === card.en);
  }

  function switchMode(m: Mode) {
    setMode(m);
    resetCard();
  }

  function backToLibrary() {
    setPhase("library");
    setDeck(null);
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }

  // Lưu từ vào Sổ tay (notes). review=true → đẩy vào lịch Ôn tập FSRS với điểm tương ứng.
  async function saveWord(c: Card, opts: { review: boolean; grade?: Grade }) {
    if (!userId) {
      flash("Cần đăng nhập để lưu");
      return;
    }
    try {
      const note = await addNote(userId, {
        kind: isSingleWord(c.en) ? "word" : "structure",
        content: c.en,
        example: c.example ?? "",
        tags: deck ? [deck.title] : [],
        inReview: opts.review,
      });
      if (opts.review && opts.grade) {
        await gradeNote(userId, note.id, null, opts.grade, todayKey());
      }
      setSavedSet((s) => new Set(s).add(c.en));
      flash(opts.review ? "Đã thêm vào Ôn tập ✓" : "Đã lưu vào Sổ tay ✓");
    } catch (e) {
      console.error("saveWord", e);
      flash("Lỗi khi lưu");
    }
  }

  // Chấm theo FSRS → lưu vào Ôn tập rồi sang thẻ kế.
  function gradeAndNext(g: Grade) {
    if (card) saveWord(card, { review: true, grade: g });
    advance(g !== "again");
  }

  async function newExample() {
    if (!card || loadingExtra) return;
    setLoadingExtra(true);
    try {
      const res = await fetch("/api/example-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ en: card.en, vi: card.vi }),
      });
      const data = await res.json();
      if (data.sentence) {
        setExtra({ sentence: data.sentence, vi: data.vi ?? "" });
        play(data.sentence);
      } else {
        setExtra({ sentence: data.source === "unconfigured" ? "(Chưa cấu hình Gemini.)" : "(Không tạo được câu.)", vi: "" });
      }
    } catch {
      setExtra({ sentence: "(Lỗi mạng.)", vi: "" });
    } finally {
      setLoadingExtra(false);
    }
  }

  // ===== LIBRARY =====
  if (phase === "library") {
    const term = q.trim().toLowerCase();
    const match = (d: Deck) => !term || d.title.toLowerCase().includes(term);
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 animate-fadeIn relative">
        {/* Ambient background glows */}
        <div className="absolute top-12 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-12 right-1/4 w-72 h-72 rounded-full bg-pink-soft/5 blur-3xl pointer-events-none animate-pulse" />

        <div className="mb-10 text-center flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            Thư viện Flashcards
          </span>
          <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-5xl tracking-tight leading-none mt-1">
            Học từ vựng tiếng Anh
          </h1>
          <p className="max-w-md text-sm font-semibold text-muted leading-relaxed">
            Chọn danh mục, bộ thẻ thông minh và bắt đầu phản xạ qua Flashcard, Đoán gõ hoặc Trắc nghiệm đa chiều.
          </p>
        </div>

        {/* Tab danh mục lớn */}
        <div className="mb-8 grid grid-cols-3 gap-3 p-1.5 rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-sm shadow-inner">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setQ(""); }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 active:scale-95 ${
                cat === c.key 
                  ? "bg-primary text-primary-fg shadow-md scale-102 font-bold" 
                  : "text-muted hover:text-foreground hover:bg-primary-soft/20"
              }`}
            >
              <span className="text-xl shrink-0">{c.icon}</span>
              <div className="text-center sm:text-left min-w-0">
                <p className={`text-xs sm:text-sm font-bold leading-tight ${cat === c.key ? "text-primary-fg" : "text-foreground"}`}>
                  {c.label}
                </p>
                <p className={`text-[9px] font-semibold mt-0.5 leading-none ${cat === c.key ? "text-primary-fg/80" : "text-muted"}`}>
                  {c.count} bộ thẻ
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Tìm kiếm + game */}
        <div className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-muted text-sm pointer-events-none">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm bộ thẻ từ vựng..."
              className="w-full rounded-full border border-border/60 bg-surface/80 backdrop-blur-sm pl-10 pr-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary shadow-sm transition-all focus:bg-surface focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <Link 
            href="/collocations" 
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/30 px-5 py-2.5 text-xs font-black text-primary transition-all hover:bg-primary-soft/60 hover:scale-102 active:scale-98 shadow-sm"
          >
            🧩 Mini-game Ghép cụm từ <span className="text-[14px]">→</span>
          </Link>
        </div>

        {/* Theo bài học — gom A1/A2/B1 */}
        {cat === "lesson" &&
          COLLECTIONS.map((col) => {
            const decks = DECKS.filter((d) => bucket(d.cefr) === col.key && match(d));
            if (decks.length === 0) return null;
            return (
              <section key={col.key} className="mb-12">
                <h2 className="mb-4 font-display text-lg font-bold text-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                  <span>{col.key === "A1" ? "🌱" : col.key === "A2" ? "🌿" : "🌳"}</span> {col.name} 
                  <span className="text-xs font-semibold text-muted bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full ml-1">({decks.length})</span>
                </h2>
                <DeckGrid decks={decks} grad={col.grad} unit="thẻ" onPick={startDeck} />
              </section>
            );
          })}

        {/* Từ theo chủ đề */}
        {cat === "word" && (
          <DeckGrid decks={WORD_DECKS.filter(match)} grad="from-sky-400/20 to-indigo-500/20 text-sky-600 dark:text-sky-400" badge="Từ đơn" unit="từ" onPick={startDeck} />
        )}

        {/* Mẫu câu giao tiếp */}
        {cat === "sentence" && (
          <DeckGrid decks={SENTENCE_DECKS.filter(match)} grad="from-violet-400/20 to-pink-400/20 text-violet-600 dark:text-pink-soft" badge="Câu" unit="câu" onPick={startDeck} />
        )}
      </main>
    );
  }

  // ===== STUDY =====
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 animate-fadeIn relative">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary/95 backdrop-blur-md border border-white/10 px-6 py-3 text-xs font-black text-white shadow-xl animate-fadeIn tracking-wider uppercase">
          {toast}
        </div>
      )}
      
      {/* Back button */}
      <button onClick={backToLibrary} className="mb-5 inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-foreground cursor-pointer transition-colors">
        ← Thư viện từ vựng
      </button>
      
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <span>{deck?.emoji}</span> {deck?.title}
        </h1>
      </div>

      {/* Tab chế độ học */}
      <div className="mb-8 flex justify-center">
        <div className="flex gap-1.5 rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-sm p-1.5 shadow-sm">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-95 duration-300 ${
                mode === m.key 
                  ? "bg-primary text-primary-fg shadow-sm" 
                  : "text-muted hover:text-foreground hover:bg-primary-soft/20"
              }`}
            >
              <span className="mr-1">{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {phase === "playing" && card && (
        <div>
          {/* Progress bar */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border/60 shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${(idx / cards.length) * 100}%` }} />
            </div>
            <span className="shrink-0 text-xs font-extrabold text-muted bg-surface/80 border border-border/60 px-2.5 py-0.5 rounded-full">{idx + 1}/{cards.length}</span>
          </div>

          {/* ---- FLASHCARD ---- */}
          {mode === "flashcard" && (
            <>
              <div className="liquid-glass-card flex min-h-[350px] flex-col items-center justify-center gap-5 p-8 text-center bg-white/40 dark:bg-black/20 border border-border/60 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent blur-xl pointer-events-none" />
                <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">{card.cefr}</span>
                <p className="text-2xl font-bold text-foreground mt-2 leading-snug">{card.vi}</p>
                
                <button 
                  onClick={() => play(card.en)} 
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                >
                  🗣️
                </button>
                
                {!revealed ? (
                  <div className="flex flex-col items-center gap-3 mt-4">
                    <p className="text-xs font-medium italic text-muted">Tự phản xạ cụm tiếng Anh trong đầu…</p>
                    <button onClick={() => setRevealed(true)} className="rounded-full bg-primary px-8 py-3 text-xs font-bold text-primary-fg hover:scale-[1.03] active:scale-95 transition-all cursor-pointer shadow-md shadow-primary/20 hover:shadow-primary/35">Hiện đáp án</button>
                  </div>
                ) : (
                  <div className="w-full animate-fadeIn space-y-4 border-t border-border/50 pt-5 mt-3">
                    <p className="font-display text-2xl font-black text-primary tracking-tight leading-none">{card.en}</p>
                    {card.ipa && <p className="text-sm font-semibold text-accent leading-none">{card.ipa}</p>}
                    
                    {/* Đối chiếu accent UK/US + thu âm nghe lại */}
                    <div className="my-4"><PronounceBar word={card.en} /></div>
                    
                    {card.example && (
                      <p className="mt-3 rounded-2xl bg-surface/80 border border-border/60 p-4 text-sm italic text-foreground/90 leading-relaxed shadow-sm">
                        “{card.example}”
                      </p>
                    )}
                    
                    {extra && (
                      <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-4 text-left animate-fadeIn shadow-sm">
                        <p className="text-sm font-semibold italic text-foreground leading-relaxed">✨ “{extra.sentence}”</p>
                        {extra.vi && <p className="mt-1 text-xs text-muted leading-relaxed">{extra.vi}</p>}
                      </div>
                    )}
                    
                    <button onClick={newExample} disabled={loadingExtra} className="rounded-full border border-primary/30 px-5 py-2 text-xs font-bold text-primary hover:bg-primary-soft/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer">
                      {loadingExtra ? "Đang tạo ví dụ…" : "✨ Câu ví dụ khác (AI)"}
                    </button>
                  </div>
                )}
              </div>
              
              {revealed && (
                <div className="mt-6 animate-fadeIn space-y-4 w-full">
                  <span className="h-px w-full bg-border/60 block my-4" />
                  <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted/80">Bạn nhớ từ này tốt đến đâu?</p>
                  <div className="grid grid-cols-4 gap-2.5">
                    {GRADES.map(({ g, label, when, cls }) => (
                      <button 
                        key={g} 
                        onClick={() => gradeAndNext(g)} 
                        className={`rounded-2xl py-3 cursor-pointer transition-all duration-300 hover:scale-[1.04] active:scale-95 shadow-sm border border-transparent hover:border-black/5 dark:hover:border-white/5 flex flex-col items-center justify-center ${cls}`}
                      >
                        <span className="text-xs font-black tracking-wide leading-none">{label}</span>
                        <span className="text-[9px] font-bold opacity-80 mt-1.5 leading-none">{when}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button 
                      onClick={() => advance(true)} 
                      className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-black text-primary bg-primary-soft/50 hover:bg-primary-soft hover:scale-102 active:scale-95 transition-all cursor-pointer"
                    >
                      ✓ Thành thạo
                    </button>
                    <button 
                      onClick={() => { if (card) saveWord(card, { review: false }); advance(true); }} 
                      className="flex items-center gap-1.5 rounded-full border border-border/60 bg-surface px-5 py-2.5 text-xs font-black text-foreground hover:bg-primary-soft/20 hover:scale-102 active:scale-95 transition-all cursor-pointer"
                    >
                      {card && savedSet.has(card.en) ? "✓ Đã lưu" : "🔖 Lưu sổ tay"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---- ĐOÁN (gõ từ) ---- */}
          {mode === "type" && (
            <div className="liquid-glass-card flex min-h-[360px] flex-col items-center justify-center gap-5 p-8 text-center bg-white/40 dark:bg-black/20 border border-border/60 shadow-xl">
              <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">{card.cefr}</span>
              <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{card.vi}</p>
              {card.example ? (
                <p className="text-sm italic text-muted max-w-md mt-1 leading-relaxed">
                  “{card.example.replace(new RegExp(card.en.replace(/[.*+?^${}()|[\]\\…]/g, "\\$&"), "i"), "_____")}”
                </p>
              ) : (
                <p className="text-xs font-bold text-muted uppercase mt-1 tracking-wider">Gõ cụm từ tiếng Anh tương ứng</p>
              )}
              
              {hinted && (
                <p className="text-xs font-bold text-amber-600 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-500/20 mt-1 animate-fadeIn">
                  💡 Gợi ý chữ cái đầu: <span className="font-mono text-sm tracking-wider font-extrabold">{card.en.slice(0, Math.max(2, Math.ceil(card.en.length / 3)))}…</span>
                </p>
              )}

              {resolved === null ? (
                <div className="w-full max-w-sm flex flex-col gap-5 mt-4">
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && typed.trim() && checkType()}
                    placeholder="Nhập cụm tiếng Anh tại đây..."
                    className="w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-3.5 text-center text-lg font-bold text-foreground outline-none focus:border-primary shadow-inner focus:bg-background transition-all focus:ring-4 focus:ring-primary/10"
                  />
                  <div className="flex gap-2.5">
                    <button onClick={() => setHinted(true)} className="w-1/3 rounded-xl bg-amber-400/25 py-3 text-xs font-black text-amber-700 dark:text-amber-400 active:scale-95 cursor-pointer transition-all hover:bg-amber-400/35">💡 Gợi ý</button>
                    <button onClick={() => advance(false)} className="w-1/3 rounded-xl bg-pink-soft py-3 text-xs font-black text-pink active:scale-95 cursor-pointer transition-all hover:bg-pink-soft/80">✕ Bỏ qua</button>
                    <button onClick={checkType} disabled={!typed.trim()} className="w-1/3 liquid-glass-btn py-3 text-xs font-black disabled:opacity-50 cursor-pointer">✓ Kiểm tra</button>
                  </div>
                </div>
              ) : (
                <div className="w-full animate-fadeIn space-y-4 border-t border-border/50 pt-5">
                  <p className={`font-display text-2xl font-black ${resolved ? "text-primary animate-pulse" : "text-pink"}`}>
                    {resolved ? "✓ Chính xác!" : "✗ Chưa chính xác"}
                  </p>
                  <div className="bg-background/40 rounded-2xl p-4 border border-border/40 inline-flex flex-col items-center">
                    <p className="font-display text-xl font-bold text-foreground">{card.en}</p>
                    {card.ipa && <p className="text-xs font-mono font-bold text-accent mt-1">{card.ipa}</p>}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-3 w-full max-w-sm mx-auto">
                    <button onClick={() => { if (card) saveWord(card, { review: true, grade: resolved ? "good" : "again" }); }} className="w-1/2 rounded-xl border border-border/60 bg-surface py-3 text-xs font-black text-foreground hover:bg-primary-soft/20 active:scale-95 cursor-pointer transition-all">🔖 Lưu sổ tay</button>
                    <button onClick={() => advance(!!resolved)} className="w-1/2 liquid-glass-btn py-3 text-xs font-black cursor-pointer">Tiếp theo →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- TRẮC NGHIỆM ---- */}
          {mode === "choice" && (
            <div className="liquid-glass-card flex min-h-[360px] flex-col items-center justify-center gap-6 p-8 text-center bg-white/40 dark:bg-black/20 border border-border/60 shadow-xl">
              <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">{card.cefr}</span>
              <p className="text-xl sm:text-2xl font-black text-foreground mt-2">{card.vi}</p>
              
              <button 
                onClick={() => play(card.en)} 
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xl text-primary shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                🔊
              </button>
              
              <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2 mt-2">
                {options.map((opt, idx) => {
                  let cls = "border-border/60 bg-surface/50 text-foreground hover:border-primary/60 hover:bg-primary-soft/10";
                  if (resolved !== null) {
                    if (opt === card.en) cls = "border-primary bg-primary-soft text-primary shadow-sm font-extrabold";
                    else if (opt === chosen) cls = "border-pink bg-pink-soft text-pink shadow-sm font-extrabold";
                    else cls = "border-border/40 bg-surface/30 text-muted opacity-50";
                  }
                  const badges = ["A", "B", "C", "D"];
                  return (
                    <button 
                      key={opt} 
                      disabled={resolved !== null} 
                      onClick={() => pick(opt)} 
                      className={`rounded-2xl border-2 px-4 py-3.5 text-sm font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-3 ${cls}`}
                    >
                      <span className="rounded-lg bg-black/5 dark:bg-white/5 border border-border/50 text-[10px] font-black w-6 h-6 flex items-center justify-center shrink-0">{badges[idx]}</span>
                      <span className="truncate text-left">{opt}</span>
                    </button>
                  );
                })}
              </div>
              
              {resolved !== null && (
                <div className="flex items-center justify-center gap-3 w-full max-w-md mt-2 animate-fadeIn">
                  <button onClick={() => { if (card) saveWord(card, { review: true, grade: resolved ? "good" : "again" }); }} className="w-1/2 rounded-xl border border-border/60 bg-surface py-3 text-xs font-black text-foreground hover:bg-primary-soft/20 active:scale-95 cursor-pointer transition-all">🔖 Lưu sổ tay</button>
                  <button onClick={() => advance(!!resolved)} className="w-1/2 liquid-glass-btn py-3 text-xs font-black cursor-pointer">Tiếp theo →</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-10 text-center border border-border/60 shadow-2xl bg-white/40 dark:bg-black/20 backdrop-blur-sm max-w-md mx-auto">
          <span className="text-6xl animate-bounce">🎉</span>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-black text-foreground">Hoàn thành xuất sắc!</h2>
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Đã vượt qua bộ: “{deck?.title}”</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="rounded-2xl border border-primary/20 bg-primary-soft/20 p-5 flex flex-col items-center justify-center shadow-sm">
              <p className="font-display text-4xl font-black text-primary leading-none">{known}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mt-2">Đã thuộc</p>
            </div>
            <div className="rounded-2xl border border-pink/20 bg-pink-soft/20 p-5 flex flex-col items-center justify-center shadow-sm">
              <p className="font-display text-4xl font-black text-pink leading-none">{again}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink mt-2">Cần ôn lại</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 w-full mt-4">
            {deck && (
              <button onClick={() => startDeck(deck)} className="w-full liquid-glass-btn py-3 text-xs font-black cursor-pointer shadow-lg shadow-primary/20 hover:shadow-primary/35">🔄 Học lại bộ này</button>
            )}
            <button onClick={backToLibrary} className="w-full rounded-full border border-border bg-surface py-3 text-xs font-black text-foreground hover:bg-primary-soft/20 active:scale-95 transition-all cursor-pointer">← Chọn bộ học khác</button>
          </div>
        </div>
      )}
    </main>
  );
}
