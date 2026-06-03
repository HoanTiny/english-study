"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { lessonContent } from "@/lib/lessons";
import { fetchPronounce, isSingleWord } from "@/lib/pronounce";
import PronounceBar from "@/components/PronounceBar";
import WordImage, { fetchWordImage } from "@/components/WordImage";
import { useAuth } from "@/lib/auth";
import { addNote } from "@/lib/notesRepo";
import { gradeNote } from "@/lib/reviewRepo";
import { todayKey } from "@/lib/store";
import type { Grade } from "@/lib/srs";
import vocabWords from "@/data/vocab.json";
import sentencesData from "@/data/sentences.json";

// Nhãn thời gian cho 4 nút đánh giá (xấp xỉ FSRS cho thẻ mới).
const GRADES: { g: Grade; label: string; when: string; cls: string }[] = [
  { g: "again", label: "Học lại", when: "trong ngày", cls: "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white" },
  { g: "hard", label: "Khó", when: "1–2 ngày", cls: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white" },
  { g: "good", label: "Tốt", when: "vài ngày", cls: "bg-primary-soft/80 border border-primary/20 text-primary hover:bg-primary hover:text-white" },
  { g: "easy", label: "Dễ", when: "~1 tuần", cls: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white" },
];

type Card = { en: string; vi: string; ipa?: string; example?: string; cefr: string; pos?: string };

// Loại từ (vocab.json dùng tiếng Anh) → nhãn ngắn tiếng Việt.
const POS_VI: Record<string, string> = {
  noun: "danh từ", verb: "động từ", adjective: "tính từ", adverb: "trạng từ",
  pronoun: "đại từ", preposition: "giới từ", conjunction: "liên từ", interjection: "thán từ", determiner: "từ hạn định",
};
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
    byTopic.get(w.topic)!.push({ en: w.en, vi: w.vi, ipa: w.ipa, cefr: "A1–A2", pos: w.pos });
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
  { key: "A1", name: "Khởi đầu A1", grad: "from-emerald-400/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  { key: "A2", name: "Mở rộng A2", grad: "from-amber-400/10 to-orange-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" },
  { key: "B1", name: "Giao tiếp B1+", grad: "from-pink-400/10 to-fuchsia-500/10 border-pink/20 text-pink dark:text-pink-soft" },
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

// Chuẩn hoá IPA: bỏ dấu "/" thừa rồi bọc đúng 1 cặp (tránh "//dɒg//").
function fmtIpa(ipa: string): string {
  const core = ipa.replace(/^\/+|\/+$/g, "").trim();
  return core ? `/${core}/` : "";
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
    return <p className="py-8 text-center text-xs font-bold text-muted bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-border/60">Không tìm thấy bộ thẻ nào phù hợp.</p>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((d) => (
        <button
          key={d.slug}
          onClick={() => onPick(d)}
          className="liquid-glass-interactive group flex flex-col overflow-hidden p-0 text-left border border-border/80 shadow-md rounded-2xl relative cursor-pointer"
        >
          {/* Subtle Background Glow inside the card */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-pink-soft/5 blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-4 p-5">
            {/* Elegant glassmorphic squircle for emoji */}
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-2xl shadow-inner border relative group-hover:scale-105 transition-transform duration-300`}>
              <div className="absolute inset-0 bg-white/10 dark:bg-black/10 rounded-2xl" />
              <span className="relative z-1">{d.emoji}</span>
            </div>
            
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary-soft border border-primary/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-primary">{badge ?? d.cefr}</span>
                <span className="text-[9px] font-bold text-muted">{d.cards.length} {unit}</span>
              </div>
              <h3 className="font-display text-sm font-bold leading-tight text-foreground truncate mt-1.5">{d.title}</h3>
              <span className="text-[9px] font-black uppercase tracking-wider text-primary inline-flex items-center gap-1 mt-1.5 group-hover:translate-x-1 transition-all duration-300">
                Luyện tập <span className="text-[11px]">→</span>
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

  // Prefetch ảnh thẻ kế tiếp (làm ấm cache → chuyển thẻ có ảnh ngay).
  useEffect(() => {
    const nxt = cards[idx + 1];
    if (nxt?.en) fetchWordImage(nxt.en, nxt.vi);
  }, [idx, cards]);

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
        meaning: c.vi ?? "",
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
        <div className="mb-10 text-center flex flex-col items-center gap-3">
          <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
            🗂️ Thư viện Flashcards
          </span>
          <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-5xl tracking-tight leading-none mt-1">
            Học từ vựng tiếng Anh
          </h1>
          <p className="max-w-md text-xs sm:text-sm font-semibold text-muted leading-relaxed">
            Chọn danh mục, bộ thẻ thông minh và bắt đầu phản xạ qua Flashcard, Đoán gõ hoặc Trắc nghiệm đa chiều.
          </p>
        </div>

        {/* Tab danh mục lớn */}
        <div className="mb-8 grid grid-cols-3 gap-3 p-1.5 rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-md shadow-sm">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setQ(""); }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5 cursor-pointer transition-all duration-300 active:scale-95 ${
                cat === c.key 
                  ? "bg-primary text-primary-fg shadow-md scale-102 font-black text-xs uppercase tracking-wider" 
                  : "text-muted hover:text-foreground hover:bg-primary-soft/20 text-xs font-bold"
              }`}
            >
              <span className="text-xl shrink-0">{c.icon}</span>
              <div className="text-center sm:text-left min-w-0">
                <p className={`text-xs font-black leading-tight ${cat === c.key ? "text-primary-fg" : "text-foreground"}`}>
                  {c.label}
                </p>
                <p className={`text-[8.5px] font-black uppercase tracking-widest mt-0.5 leading-none ${cat === c.key ? "text-primary-fg/80" : "text-muted"}`}>
                  {c.count} bộ thẻ
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Tìm kiếm + game */}
        <div className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-4 flex items-center text-muted text-xs pointer-events-none">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm bộ thẻ từ vựng..."
              className="w-full rounded-full border border-border/60 bg-surface/80 backdrop-blur-sm pl-10 pr-4 py-3 text-xs font-semibold text-foreground outline-none focus:border-primary shadow-sm transition-all focus:bg-surface focus:ring-4 focus:ring-primary/10 placeholder:text-muted/65"
            />
          </div>
          <Link 
            href="/collocations" 
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-primary transition-all hover:bg-primary-soft hover:scale-102 active:scale-98 shadow-sm"
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
                <h2 className="mb-5 font-display text-sm font-black uppercase tracking-widest text-foreground border-b border-border/30 pb-3 flex items-center gap-2">
                  <span>{col.key === "A1" ? "🌱" : col.key === "A2" ? "🌿" : "🌳"}</span> {col.name} 
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted bg-black/5 dark:bg-white/5 border border-border px-2.5 py-0.5 rounded-full ml-1">({decks.length})</span>
                </h2>
                <DeckGrid decks={decks} grad={col.grad} unit="thẻ" onPick={startDeck} />
              </section>
            );
          })}

        {/* Từ theo chủ đề */}
        {cat === "word" && (
          <DeckGrid decks={WORD_DECKS.filter(match)} grad="from-sky-400/10 to-indigo-500/10 border-indigo-500/20 text-sky-600 dark:text-sky-400" badge="Từ đơn" unit="từ" onPick={startDeck} />
        )}

        {/* Mẫu câu giao tiếp */}
        {cat === "sentence" && (
          <DeckGrid decks={SENTENCE_DECKS.filter(match)} grad="from-violet-400/10 to-pink-400/10 border-pink/20 text-violet-600 dark:text-pink-soft" badge="Câu" unit="câu" onPick={startDeck} />
        )}
      </main>
    );
  }

  // ===== STUDY =====
  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pt-20 animate-fadeIn relative">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary/95 backdrop-blur-md border border-white/10 px-6 py-3 text-[10px] font-black text-white shadow-xl animate-fadeIn tracking-wider uppercase">
          {toast}
        </div>
      )}
      
      {/* Back button */}
      <button onClick={backToLibrary} className="mb-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted hover:text-foreground cursor-pointer transition-colors">
        ← Thư viện từ vựng
      </button>
      
      <div className="mb-3 text-center">
        <h1 className="font-display text-2xl font-black text-foreground flex items-center justify-center gap-2">
          <span>{deck?.emoji}</span> {deck?.title}
        </h1>
      </div>
 
      {/* Tab chế độ học */}
      <div className="mb-4 flex justify-center">
        <div className="flex gap-1.5 rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-sm p-1.5 shadow-sm">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              className={`rounded-xl px-5 py-2.5 text-xs font-black transition-all cursor-pointer active:scale-95 duration-300 uppercase tracking-wider ${
                mode === m.key 
                  ? "bg-primary text-primary-fg shadow-sm" 
                  : "text-muted hover:text-foreground hover:bg-primary-soft/20"
              }`}
            >
              <span className="mr-1.5">{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>
 
      {phase === "playing" && card && (
        <div>
          {/* Progress bar */}
          <div className="mb-4 flex items-center gap-4">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border/60 shadow-inner border border-border/40">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${(idx / cards.length) * 100}%` }} />
            </div>
            <span className="shrink-0 text-[9px] font-black text-muted bg-surface border border-border px-2.5 py-1 rounded-full">{idx + 1}/{cards.length}</span>
          </div>
 
          {/* ---- FLASHCARD ---- */}
          {mode === "flashcard" && (
            <>
              <div className="liquid-glass-card flex flex-col items-center justify-center gap-4 p-6 sm:p-7 text-center bg-white/40 dark:bg-black/20 border border-border shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent blur-xl pointer-events-none" />
                
                {!revealed ? (
                  <>
                    <span className="rounded-full bg-primary-soft border border-primary/20 px-3 py-1 text-[8.5px] font-black uppercase tracking-wider text-primary">{card.cefr}</span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 leading-relaxed px-4">{card.vi}</p>

                    {/* Ảnh minh hoạ ngay mặt trước (gợi nhớ trực quan) */}
                    <WordImage word={card.en} meaning={card.vi} />

                    <button
                      onClick={() => play(card.en)}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer my-2"
                      aria-label="Phát âm tiếng Anh"
                    >
                      🔊
                    </button>
                    
                    <div className="flex flex-col items-center gap-3 mt-2">
                      <p className="text-[10px] font-semibold italic text-muted">Tự dịch và phát âm to cụm từ này…</p>
                      <button onClick={() => setRevealed(true)} className="liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider hover:scale-[1.03] active:scale-95 transition-all cursor-pointer">Hiện đáp án</button>
                    </div>
                  </>
                ) : (
                  <div className="w-full animate-fadeIn flex flex-col items-center gap-3.5">
                    {/* Level Badge */}
                    <span className="rounded-full bg-primary-soft border border-primary/20 px-3 py-1 text-[8.5px] font-black uppercase tracking-wider text-primary">{card.cefr}</span>
                    
                    {/* Primary English Word */}
                    <p className="font-display text-2xl sm:text-3xl font-black text-primary tracking-tight leading-none mt-0.5">{card.en}</p>
                    
                    {/* IPA & Translation Details */}
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-muted">
                      {card.pos && <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-black text-indigo-500">{POS_VI[card.pos] ?? card.pos}</span>}
                      {card.ipa && <span className="font-mono text-accent">{fmtIpa(card.ipa)}</span>}
                      <span>·</span>
                      <span className="text-foreground/90 font-bold">{card.vi}</span>
                    </div>

                    {/* Ảnh minh hoạ (Openverse, CC) */}
                    <WordImage word={card.en} meaning={card.vi} />

                    {/* Compact Pronunciation Widget */}
                    <div className="w-full max-w-xs my-0.5">
                      <PronounceBar word={card.en} />
                    </div>
                    
                    {/* Compact Example Sentence */}
                    {card.example && (
                      <div className="w-full rounded-xl bg-white/35 dark:bg-black/35 border border-border/80 p-3 text-xs italic font-semibold text-foreground/80 leading-relaxed shadow-sm text-center">
                        “{card.example}”
                      </div>
                    )}
                    
                    {/* Extra AI generated sentence */}
                    {extra && (
                      <div className="w-full rounded-xl border border-primary/20 bg-primary-soft/40 p-3 text-left animate-fadeIn shadow-sm">
                        <p className="text-xs font-semibold italic text-foreground leading-relaxed">✨ “{extra.sentence}”</p>
                        {extra.vi && <p className="mt-1 text-[9px] font-bold text-muted leading-relaxed">{extra.vi}</p>}
                      </div>
                    )}
                    
                    {/* Action Row */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mt-0.5">
                      <button 
                        onClick={newExample} 
                        disabled={loadingExtra} 
                        className="rounded-full border border-primary/30 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary hover:bg-primary-soft active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {loadingExtra ? "Đang tạo..." : "✨ Ví dụ AI"}
                      </button>
                      <button 
                        onClick={() => advance(true)} 
                        className="rounded-full border border-primary/30 bg-primary-soft/60 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary hover:bg-primary-soft active:scale-95 transition-all cursor-pointer"
                      >
                        ✓ Đã thuộc
                      </button>
                      <button 
                        onClick={() => { if (card) saveWord(card, { review: false }); }} 
                        className="rounded-full border border-border bg-white/40 dark:bg-black/20 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-foreground hover:bg-primary-soft/20 active:scale-95 transition-all cursor-pointer shadow-sm"
                      >
                        {savedSet.has(card.en) ? "✓ Đã lưu" : "🔖 Lưu sổ tay"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {revealed && (
                <div className="mt-4 animate-fadeIn space-y-2.5 w-full border-t border-border/40 pt-4 px-2">
                  <p className="text-center text-[9px] font-black uppercase tracking-wider text-muted">Bạn nhớ cụm từ này tốt đến mức nào?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADES.map(({ g, label, when, cls }) => (
                      <button 
                        key={g} 
                        onClick={() => gradeAndNext(g)} 
                        className={`rounded-xl py-2 cursor-pointer transition-all duration-300 active:scale-95 shadow-sm border border-transparent flex flex-col items-center justify-center ${cls}`}
                      >
                        <span className="text-xs font-black tracking-wide leading-none">{label}</span>
                        <span className="text-[8px] font-bold opacity-80 mt-1 leading-none">{when}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---- ĐOÁN (gõ từ) ---- */}
          {mode === "type" && (
            <div className="liquid-glass-card flex min-h-[360px] flex-col items-center justify-center gap-6 p-8 text-center bg-white/40 dark:bg-black/20 border border-border shadow-2xl">
              <span className="rounded-full bg-primary-soft border border-primary/20 px-3 py-1 text-[8.5px] font-black uppercase tracking-wider text-primary">{card.cefr}</span>
              <p className="text-xl sm:text-2xl font-black text-foreground mt-2 leading-relaxed">{card.vi}</p>
              {card.example ? (
                <p className="text-xs font-semibold italic text-muted max-w-md mt-1 leading-relaxed">
                  “{card.example.replace(new RegExp(card.en.replace(/[.*+?^${}()|[\]\\…]/g, "\\$&"), "i"), "_____")}”
                </p>
              ) : (
                <p className="text-[10px] font-black text-muted uppercase mt-1 tracking-wider">Gõ cụm từ tiếng Anh tương ứng</p>
              )}
              
              {hinted && (
                <p className="text-xs font-bold text-amber-700 bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/20 mt-1 animate-fadeIn">
                  💡 Chữ cái đầu: <span className="font-mono text-sm tracking-wider font-extrabold">{card.en.slice(0, Math.max(2, Math.ceil(card.en.length / 3)))}…</span>
                </p>
              )}

              {resolved === null ? (
                <div className="w-full max-w-sm flex flex-col gap-4 mt-4">
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && typed.trim() && checkType()}
                    placeholder="Nhập cụm từ tiếng Anh..."
                    className="w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4 py-3.5 text-center text-lg font-bold text-foreground outline-none focus:border-primary shadow-inner focus:bg-background transition-all focus:ring-4 focus:ring-primary/10"
                  />
                  <div className="flex gap-2.5">
                    <button onClick={() => setHinted(true)} className="w-1/3 rounded-xl bg-amber-500/10 border border-amber-500/20 py-3 text-xs font-black text-amber-700 dark:text-amber-400 active:scale-95 cursor-pointer transition-all hover:bg-amber-500/20">💡 Gợi ý</button>
                    <button onClick={() => advance(false)} className="w-1/3 rounded-xl bg-rose-500/10 border border-rose-500/20 py-3 text-xs font-black text-rose-600 active:scale-95 cursor-pointer transition-all hover:bg-rose-500/20">✕ Bỏ qua</button>
                    <button onClick={checkType} disabled={!typed.trim()} className="w-1/3 liquid-glass-btn py-3 text-xs font-black disabled:opacity-50 cursor-pointer">✓ Kiểm tra</button>
                  </div>
                </div>
              ) : (
                <div className="w-full animate-fadeIn space-y-4 border-t border-border/40 pt-6">
                  <p className={`font-display text-2xl font-black ${resolved ? "text-primary animate-pulse" : "text-rose-600"}`}>
                    {resolved ? "✓ Chính xác!" : "✗ Chưa chính xác"}
                  </p>
                  <div className="bg-background/40 rounded-2xl p-5 border border-border inline-flex flex-col items-center">
                    <p className="font-display text-xl font-bold text-foreground">{card.en}</p>
                    <div className="mt-1.5 flex items-center justify-center gap-2">
                      {card.pos && <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-black text-indigo-500">{POS_VI[card.pos] ?? card.pos}</span>}
                      {card.ipa && <span className="text-xs font-mono font-bold text-accent">{fmtIpa(card.ipa)}</span>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-3 w-full max-w-sm mx-auto">
                    <button onClick={() => { if (card) saveWord(card, { review: true, grade: resolved ? "good" : "again" }); }} className="w-1/2 rounded-xl border border-border bg-surface py-3 text-xs font-black text-foreground hover:bg-primary-soft/20 active:scale-95 cursor-pointer transition-all">🔖 Lưu ôn tập</button>
                    <button onClick={() => advance(!!resolved)} className="w-1/2 liquid-glass-btn py-3 text-xs font-black cursor-pointer">Tiếp theo →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- TRẮC NGHIỆM ---- */}
          {mode === "choice" && (
            <div className="liquid-glass-card flex min-h-[360px] flex-col items-center justify-center gap-6 p-8 text-center bg-white/40 dark:bg-black/20 border border-border shadow-2xl">
              <span className="rounded-full bg-primary-soft border border-primary/20 px-3 py-1 text-[8.5px] font-black uppercase tracking-wider text-primary">{card.cefr}</span>
              <p className="text-xl sm:text-2xl font-black text-foreground mt-2 leading-relaxed px-4">{card.vi}</p>
              
              <button 
                onClick={() => play(card.en)} 
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft border border-primary/20 text-lg text-primary shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                aria-label="Phát âm"
              >
                🔊
              </button>
              
              <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2 mt-2">
                {options.map((opt, idx) => {
                  let cls = "border-border bg-surface/50 text-foreground hover:border-primary/60 hover:bg-primary-soft/10 shadow-sm";
                  if (resolved !== null) {
                    if (opt === card.en) cls = "border-primary bg-primary-soft text-primary shadow-sm font-extrabold";
                    else if (opt === chosen) cls = "border-pink bg-pink-soft text-pink shadow-sm font-extrabold";
                    else cls = "border-border bg-surface/20 text-muted opacity-50";
                  }
                  const badges = ["A", "B", "C", "D"];
                  return (
                    <button 
                      key={opt} 
                      disabled={resolved !== null} 
                      onClick={() => pick(opt)} 
                      className={`rounded-2xl border-2 px-4 py-3.5 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-3 ${cls}`}
                    >
                      <span className="rounded-lg bg-black/5 dark:bg-white/5 border border-border text-[9px] font-black w-6 h-6 flex items-center justify-center shrink-0">{badges[idx]}</span>
                      <span className="truncate text-left">{opt}</span>
                    </button>
                  );
                })}
              </div>
              
              {resolved !== null && (
                <div className="flex items-center justify-center gap-3 w-full max-w-md mt-2 animate-fadeIn">
                  <button onClick={() => { if (card) saveWord(card, { review: true, grade: resolved ? "good" : "again" }); }} className="w-1/2 rounded-xl border border-border bg-surface py-3 text-xs font-black text-foreground hover:bg-primary-soft/20 active:scale-95 cursor-pointer transition-all shadow-sm">🔖 Lưu ôn tập</button>
                  <button onClick={() => advance(!!resolved)} className="w-1/2 liquid-glass-btn py-3 text-xs font-black cursor-pointer">Tiếp theo →</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-10 text-center border border-border shadow-2xl bg-white/40 dark:bg-black/20 backdrop-blur-sm max-w-md mx-auto">
          <span className="text-6xl animate-bounce">🎉</span>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-black text-foreground">Hoàn thành xuất sắc!</h2>
            <p className="text-[10px] font-black text-muted uppercase tracking-wider">Bộ thẻ: “{deck?.title}”</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="rounded-2xl border border-primary/20 bg-primary-soft/30 p-5 flex flex-col items-center justify-center shadow-sm">
              <p className="font-display text-4xl font-black text-primary leading-none">{known}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-primary mt-2">Đã thuộc</p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 flex flex-col items-center justify-center shadow-sm">
              <p className="font-display text-4xl font-black text-rose-600 leading-none">{again}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-600 mt-2">Cần học lại</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 w-full mt-4">
            {deck && (
              <button onClick={() => startDeck(deck)} className="w-full liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-primary/20 hover:shadow-primary/35">🔄 Học lại bộ này</button>
            )}
            <button onClick={backToLibrary} className="w-full rounded-full border border-border bg-surface py-3.5 text-xs font-black uppercase tracking-wider text-foreground hover:bg-primary-soft/20 active:scale-95 transition-all cursor-pointer">← Chọn bộ học khác</button>
          </div>
        </div>
      )}
    </main>
  );
}
