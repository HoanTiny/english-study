"use client";
import { apiFetch } from "@/lib/apiFetch";

import { useEffect, useMemo, useState } from "react";
import { clearPronunciationPreloads, prefetchPronunciation } from "@/lib/pronunciationPreload";
import Link from "next/link";
import { lessonContent } from "@/lib/lessons";
import { canPronounce, fetchPronounce, isSingleWord } from "@/lib/pronounce";
import { vocabularyIpa } from "@/lib/vocabularyPronunciation";
import PronounceBar from "@/components/PronounceBar";
import WordImage from "@/components/WordImage";
import WordPronunciation from "@/components/WordPronunciation";
import { useAuth } from "@/lib/auth";
import { addNote } from "@/lib/notesRepo";
import { gradeNote } from "@/lib/reviewRepo";
import { todayKey } from "@/lib/store";
import type { Grade } from "@/lib/srs";
import vocabWords from "@/data/vocab.json";
import sentencesData from "@/data/sentences.json";
import AppIcon from "@/components/AppIcon";
import styles from "./vocab.module.css";
import { basicLessons, basicVocabularySource, isStandaloneWord, wordsFromPhrases } from "@/lib/basicVocabulary";

// Nhãn thời gian cho 4 nút đánh giá (xấp xỉ FSRS cho thẻ mới).
const GRADES: { g: Grade; label: string; when: string; cls: string }[] = [
  { g: "again", label: "Học lại", when: "trong ngày", cls: "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white" },
  { g: "hard", label: "Khó", when: "1–2 ngày", cls: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white" },
  { g: "good", label: "Tốt", when: "vài ngày", cls: "bg-primary-soft/80 border border-primary/20 text-primary hover:bg-primary hover:text-white" },
  { g: "easy", label: "Dễ", when: "~1 tuần", cls: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white" },
];

type Card = { en: string; vi: string; ipa?: string; example?: string; cefr: string; pos?: string; page?: number };

// Loại từ (vocab.json dùng tiếng Anh) → nhãn ngắn tiếng Việt.
const POS_VI: Record<string, string> = {
  noun: "danh từ", verb: "động từ", adjective: "tính từ", adverb: "trạng từ",
  pronoun: "đại từ", preposition: "giới từ", conjunction: "liên từ", interjection: "thán từ", determiner: "từ hạn định",
  number: "số từ", "modal auxiliary": "động từ khuyết thiếu", "infinitive-to": "dấu hiệu nguyên mẫu", "be-verb": "động từ", "do-verb": "động từ", "have-verb": "động từ",
};
type Deck = { slug: string; title: string; cefr: string; emoji: string; cards: Card[]; isWord?: boolean; parent?: Deck; number?: number };
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
    isWord: false,
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
const BASIC_DECKS: Deck[] = basicLessons.map(lesson => ({ slug: lesson.id, title: lesson.title, number: lesson.number, cefr: "Theo chủ đề", emoji: "📘", isWord: true, cards: lesson.words }));

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

function maskAnswer(example: string, answer: string): string {
  return example.replace(new RegExp(answer.replace(/[.*+?^{}$()|[\]\\]/g, "\\$&"), "gi"), "_____");
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
  if (vocabularyIpa(text)?.needsReview) return;
  if (canPronounce(text)) {
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
    <div className="study-grid">
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
                <span className="rounded-full bg-primary-soft border border-primary/10 px-2 py-0.5 text-xs font-bold tracking-normal text-primary">{badge ?? d.cefr}</span>
                <span className="text-xs font-bold text-muted">{d.cards.length} {unit}</span>
              </div>
              <h3 className="font-display text-sm font-bold leading-snug text-foreground mt-1.5">{d.number ? `Bài ${String(d.number).padStart(2, "0")} · ` : ""}{d.title}</h3>
              {d.number && <p className="mt-2 text-xs text-muted font-normal leading-relaxed">{d.cards.slice(0, 4).map(card => card.en).join(" · ")}…</p>}
              <span className="text-xs font-bold tracking-normal text-primary inline-flex items-center gap-1 mt-1.5 group-hover:translate-x-1 transition-all duration-300">
                Luyện tập <span className="text-xs">→</span>
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

const CATS = [
  { key: "basic" as const, label: "1000 từ tiếng anh thông dụng", icon: "📘", count: BASIC_DECKS.length },
  { key: "lesson" as const, label: "Theo bài học", icon: "📗", count: DECKS.length },
  { key: "word" as const, label: "Từ chủ đề", icon: "🔤", count: WORD_DECKS.length },
  { key: "sentence" as const, label: "Mẫu câu giao tiếp", icon: "💬", count: SENTENCE_DECKS.length },
];

export default function VocabPage() {
  const { userId } = useAuth();
  const [cat, setCat] = useState<"basic" | "lesson" | "word" | "sentence">("basic");
  const [q, setQ] = useState("");
  const [singleOnly, setSingleOnly] = useState(false);
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
  const nextWord = phase === "playing" && mode === "flashcard" ? cards[idx + 1]?.en : undefined;
  useEffect(() => {
    const request = new AbortController();
    if (nextWord) void prefetchPronunciation(nextWord, request.signal);
    return () => request.abort();
  }, [nextWord]);
  useEffect(() => {
    if (phase !== "playing") clearPronunciationPreloads();
    return () => clearPronunciationPreloads();
  }, [phase]);
  const relatedWords = useMemo(() => deck && !deck.isWord ? wordsFromPhrases(deck.cards.map(card => card.en)) : [], [deck]);

  // Lựa chọn trắc nghiệm (ổn định theo từng thẻ)
  const options = useMemo(() => {
    if (!card || cards.length === 0) return [];
    // The PDF repeats some headwords. Choices must remain distinct.
    const distinct = new Map(cards.filter(c => c.en.toLowerCase() !== card.en.toLowerCase()).map(c => [c.en.toLowerCase(), c.en]));
    const others = shuffle([...distinct.values()]).slice(0, 3);
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
      const res = await apiFetch("/api/example-sentence", {
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
    const match = (d: Deck) => !term || d.title.toLowerCase().includes(term) || (d.number && d.cards.some(card => `${card.en} ${card.vi}`.toLowerCase().includes(term)));
    const courseDecks = (singleOnly ? BASIC_DECKS.map(d => ({ ...d, cards: d.cards.filter(c => isStandaloneWord(c.en)) })).filter(d => d.cards.length > 0) : BASIC_DECKS).filter(match);
    return (
      <main className="study-page animate-fadeIn">
        <div className="page-heading">
          <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-xs font-bold tracking-normal text-primary">
            🗂️ Thư viện Flashcards
          </span>
          <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-5xl tracking-tight leading-none mt-1">
            Học từ vựng tiếng Anh
          </h1>
          <p className="max-w-md text-xs sm:text-sm font-semibold text-muted leading-relaxed">
            Học từng từ nền tảng, rồi ghép thành câu. Luyện nhớ nghĩa, phát âm, đoán gõ và trắc nghiệm.
          </p>
        </div>

        {/* Tab danh mục lớn */}
        <div className={`study-tabs mb-6 ${styles.libraryTabs}`}>
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setQ(""); }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5 cursor-pointer transition-all duration-300 active:scale-95 ${
                cat === c.key
                  ? "bg-primary text-primary-fg shadow-md scale-102 font-bold text-xs tracking-normal"
                  : "text-muted hover:text-foreground hover:bg-primary-soft/20 text-xs font-bold"
              }`}
            >
              <span className="text-xl shrink-0">{c.icon}</span>
              <div className="text-center sm:text-left min-w-0">
                <p className={`text-xs font-bold leading-tight ${cat === c.key ? "text-primary-fg" : "text-foreground"}`}>
                  {c.label}
                </p>
                <p className={`text-xs font-bold tracking-normal mt-0.5 leading-none ${cat === c.key ? "text-primary-fg/80" : "text-muted"}`}>
                  {c.count} {c.key === "basic" ? "bài học" : "bộ thẻ"}
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
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-5 py-3 text-xs font-bold tracking-normal text-primary transition-all hover:bg-primary-soft hover:scale-102 active:scale-98 shadow-sm"
          >
            🧩 Mini-game Ghép cụm từ <span className="text-[14px]">→</span>
          </Link>
        </div>

        {/* Theo bài học — gom A1/A2/B1 */}
        {cat === "basic" && <section>
          <div className={styles.courseIntro}><div><h2>Học theo chủ đề, nhớ qua phiên âm.</h2><p>{basicVocabularySource.topics} chủ đề · {BASIC_DECKS.length} bài · {basicVocabularySource.entries.toLocaleString("vi-VN")} thẻ từ và cụm từ. Mỗi bài tối đa 20 thẻ, đủ nghĩa Việt, IPA và nghe phát âm.</p></div><span className={styles.level}>IPA đầy đủ</span></div>
          <div className={styles.courseFilter}><label><input type="checkbox" checked={singleOnly} onChange={e => setSingleOnly(e.target.checked)} />Chỉ học từ đơn / từ ghép viết liền</label><span>{courseDecks.length} bài phù hợp</span></div>
          <DeckGrid decks={courseDecks} grad="from-primary-soft to-primary-soft border-primary/15 text-primary" badge="Có IPA" unit="thẻ" onPick={startDeck} />
          <p className={styles.sourceNote}>Nguồn: PDF “{basicVocabularySource.name}”. Giữ nguyên từ, nghĩa và IPA theo tài liệu; một số mục được lặp lại theo chủ đề.</p>
        </section>}
        {cat === "lesson" &&
          COLLECTIONS.map((col) => {
            const decks = DECKS.filter((d) => bucket(d.cefr) === col.key && match(d));
            if (decks.length === 0) return null;
            return (
              <section key={col.key} className="mb-12">
                <h2 className="mb-5 font-display text-sm font-bold tracking-normal text-foreground border-b border-border/30 pb-3 flex items-center gap-2">
                  <span>{col.key === "A1" ? "🌱" : col.key === "A2" ? "🌿" : "🌳"}</span> {col.name}
                  <span className="text-xs font-bold tracking-normal text-muted bg-black/5 dark:bg-white/5 border border-border px-2.5 py-0.5 rounded-full ml-1">({decks.length})</span>
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
    <main className={`study-page ${styles.page}`}>
      {toast && <div role="status" className={styles.toast}>{toast}</div>}

      <button onClick={backToLibrary} className={styles.back}>← Thư viện từ vựng</button>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1><span aria-hidden="true">{deck?.emoji}</span>{deck?.title}</h1>
          <p>{phase === "done" ? "Nhìn lại buổi luyện tập của bạn" : deck?.isWord ? `${deck.number ? `Bài ${deck.number}/${BASIC_DECKS.length} · ` : ""}Nhớ nghĩa, đọc IPA, nghe và luyện phát âm.` : "Ghi nhớ cách nói, luyện phát âm và dùng trong ngữ cảnh."}</p>
          {phase === "playing" && (relatedWords.length > 0 || deck?.parent) && <div className={styles.contentSwitch} role="group" aria-label="Nội dung học"><button aria-pressed={!deck?.parent} onClick={() => { if (deck?.parent) startDeck(deck.parent); }}>Cụm từ</button><button aria-pressed={!!deck?.parent} onClick={() => { if (deck && !deck.parent) startDeck({ slug: `${deck.slug}-words`, title: deck.title, cefr: "Từ vựng", emoji: "📘", isWord: true, cards: relatedWords, parent: deck }); }}>Từng từ ({deck?.parent ? deck.cards.length : relatedWords.length})</button></div>}
        </div>
        {phase === "playing" && <div className={styles.modes} role="group" aria-label="Chế độ học">
          {MODES.map(m => (
            <button key={m.key} onClick={() => switchMode(m.key)} aria-pressed={mode === m.key}>
              <span aria-hidden="true">{m.icon}</span>{m.label}
            </button>
          ))}
        </div>}
      </header>

      {phase === "playing" && card && (
        <>
          <div className={styles.progress}>
            <div className={styles.progressTrack} role="progressbar" aria-label="Số thẻ đã hoàn thành" aria-valuemin={0} aria-valuemax={cards.length} aria-valuenow={idx}>
              <span style={{ transform: `scaleX(${idx / cards.length})` }} />
            </div>
            <span className={styles.progressLabel}>Thẻ <strong>{idx + 1}</strong> / {cards.length}</span>
          </div>

          {mode === "flashcard" ? (
            <div className={styles.workspace}>
              <article className={styles.wordCard} aria-label="Thẻ từ vựng">
                <div className={styles.cardMeta}><span className={styles.level}>{card.cefr}</span><span>{revealed ? "Đối chiếu nghĩa & luyện đọc" : "Bạn nhớ nghĩa của thẻ này không?"}</span></div>
                <div className={styles.wordVisual}>
                  <div className={styles.wordCopy} aria-live="polite">
                    <h2 className={styles.word} lang="en">{card.en}</h2>
                    {card.pos && <div className={styles.wordDetails}><span>{POS_VI[card.pos] ?? card.pos}</span></div>}
                    <WordPronunciation word={card.en} ipa={card.ipa} />
                    {revealed && <div className={styles.revealedMeaning}><span>Nghĩa tiếng Việt</span><p className={styles.meaning}>{card.vi}</p>{card.page && <p className={styles.sourcePage}>Tài liệu PDF · trang {card.page}</p>}</div>}
                  </div>
                  <div className={styles.illustration}><WordImage word={card.en} meaning={card.vi} /></div>
                </div>
                <div className={styles.cardFooter}>
                  {revealed ? <>
                    <button onClick={() => saveWord(card, { review: false })} className={styles.secondary}><AppIcon name={savedSet.has(card.en) ? "check" : "book"} size={17} />{savedSet.has(card.en) ? "Đã lưu" : "Lưu sổ tay"}</button>
                    <button onClick={() => setRevealed(false)} className={styles.secondary}>Ẩn nghĩa</button>
                    <button onClick={() => advance(true)} className="liquid-glass-btn"><AppIcon name="check" size={17} />Đã thuộc</button>
                  </> : <>
                    <p>Đọc từ, nghe phát âm và thử nhớ nghĩa.</p>
                    <button onClick={() => setRevealed(true)} className="liquid-glass-btn">Hiện nghĩa <AppIcon name="arrow" size={17} /></button>
                  </>}
                </div>
              </article>

              <aside className={styles.support} aria-label="Phát âm và ngữ cảnh">
                <h2><AppIcon name="headphones" size={20} />{revealed ? "Nghe & luyện nói" : "Một chút gợi ý"}</h2>
                {revealed ? <>
                  <p className={styles.supportIntro}>Bấm US hoặc UK trên thẻ để nghe, sau đó thu âm và nghe lại cách bạn phát âm.</p>
                  <div className={styles.pronunciation}><PronounceBar key={card.en} word={card.en} /></div>
                  {card.example && <section className={styles.example}><h3>Dùng trong ngữ cảnh</h3><blockquote lang="en">“{card.example}”</blockquote></section>}
                  {extra && <div className={styles.extra} role="status"><p lang="en">{extra.sentence}</p>{extra.vi && <p>{extra.vi}</p>}</div>}
                  <button onClick={newExample} disabled={loadingExtra} className={`${styles.secondary} ${styles.exampleButton}`}><AppIcon name="bolt" size={17} />{loadingExtra ? "Đang tạo..." : "Ví dụ AI"}</button>
                </> : <>
                  <p className={styles.supportIntro}>Phiên âm nằm ngay dưới từ. Bấm US hoặc UK để nghe từng giọng và đọc theo.</p>
                  <ol className={styles.hintSteps}><li>Nhìn từ và thử nhớ nghĩa tiếng Việt.</li><li>Đọc IPA, nghe mẫu rồi nhắc lại.</li><li>Bấm Hiện nghĩa để kiểm tra trí nhớ.</li></ol>
                </>}
              </aside>

              {revealed && <section className={styles.rating} aria-label="Đánh giá trí nhớ">
                <div><h2>Bạn nhớ {deck?.isWord ? "từ" : "câu"} này thế nào?</h2><p>Chọn mức độ để lưu vào lịch ôn tập phù hợp.</p></div>
                <div className={styles.grades}>{GRADES.map(({ g, label, when, cls }) => <button key={g} onClick={() => gradeAndNext(g)} className={cls}><strong>{label}</strong><small>{when}</small></button>)}</div>
              </section>}
            </div>
          ) : (
            <div className={styles.workspace}>
              <article className={styles.wordCard} aria-label="Câu hỏi">
                <div className={styles.cardMeta}><span className={styles.level}>{card.cefr}</span><span>{mode === "type" ? "Nhớ và viết lại" : "Chọn cách nói đúng"}</span></div>
                <h2 className={styles.question}>{card.vi}</h2>
                {mode === "type" && card.example && <div className={styles.example}>
                  <h3>Gợi ý ngữ cảnh</h3>
                  <blockquote lang="en">“{maskAnswer(card.example, card.en)}”</blockquote>
                </div>}
                <p className={styles.supportIntro}>{mode === "type" ? "Viết từ hoặc cụm từ tiếng Anh tương ứng. Bạn có thể xem gợi ý nếu chưa nhớ ra." : "Đọc nghĩa và chọn câu tiếng Anh phù hợp trong các đáp án."}</p>
                {mode === "choice" && !vocabularyIpa(card.en)?.needsReview && <div className={styles.cardFooter}><button onClick={() => play(card.en)} className={styles.secondary} aria-label="Phát âm"><AppIcon name="headphones" size={17} />Nghe gợi ý</button></div>}
              </article>

              <section className={styles.answerPanel} aria-label="Trả lời">
                <h2><AppIcon name={mode === "type" ? "edit" : "grid"} size={20} />{mode === "type" ? "Câu trả lời của bạn" : "Chọn một đáp án"}</h2>
                {mode === "type" ? <>
                  {hinted && resolved === null && <p className={styles.hint}>Chữ cái đầu: <strong lang="en">{card.en.slice(0, Math.max(2, Math.ceil(card.en.length / 3)))}…</strong></p>}
                  {resolved === null && <>
                    <label className={styles.answerInput}>Viết bằng tiếng Anh
                      <input autoFocus value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing && typed.trim()) checkType(); }} placeholder="Nhập cụm từ tiếng Anh..." autoComplete="off" />
                    </label>
                    <div className={styles.answerActions}>
                      <button onClick={() => setHinted(true)} className={styles.secondary}>Gợi ý</button>
                      <button onClick={() => advance(false)} className={styles.secondary}>Bỏ qua</button>
                      <button onClick={checkType} disabled={!typed.trim()} className="liquid-glass-btn">Kiểm tra</button>
                    </div>
                  </>}
                </> : <div className={styles.answerOptions}>{options.map((opt, optionIndex) => {
                  const statusClass = resolved === null ? "" : opt === card.en ? styles.optionCorrect : opt === chosen ? styles.optionWrong : styles.optionMuted;
                  return <button key={opt} disabled={resolved !== null} onClick={() => pick(opt)} className={`${styles.option} ${statusClass}`}>
                    <span aria-hidden="true">{["A", "B", "C", "D"][optionIndex]}</span><span lang="en">{opt}</span>
                    {resolved !== null && opt === card.en && <AppIcon name="check" size={17} />}
                  </button>;
                })}</div>}
                {resolved !== null && <div className={styles.feedback} data-correct={resolved} role="status">
                  <strong>{resolved ? "✓ Chính xác!" : "Chưa chính xác — mình thử lại nhé."}</strong>
                  <p lang="en">{card.en}</p>
                  {card.ipa && <p className={styles.ipa} aria-label="Phiên âm IPA"><span>IPA</span><span lang="en-fonipa">{fmtIpa(card.ipa)}</span></p>}
                  {card.pos && <div className={styles.wordDetails}><span>{POS_VI[card.pos] ?? card.pos}</span></div>}
                  <div className={styles.answerActions}>
                    <button onClick={() => saveWord(card, { review: true, grade: resolved ? "good" : "again" })} className={styles.secondary}>Lưu ôn tập</button>
                    <button onClick={() => advance(!!resolved)} className="liquid-glass-btn">Tiếp theo <AppIcon name="arrow" size={17} /></button>
                  </div>
                </div>}
              </section>
            </div>
          )}
        </>
      )}

      {phase === "done" && (
        <section className={styles.result}>
          <span className={styles.level}><AppIcon name="check" size={18} />Đã hoàn thành</span>
          <h2>Thêm một bước tiến hôm nay.</h2>
          <p>Bạn đã luyện xong {cards.length} thẻ trong bộ “{deck?.title}”.</p>
          <div className={styles.resultStats}><div><strong>{known}</strong><span>Đã thuộc</span></div><div><strong>{again}</strong><span>Cần học lại</span></div></div>
          <div className={styles.answerActions}>
            {deck && <button onClick={() => startDeck(deck)} className="liquid-glass-btn"><AppIcon name="repeat" size={17} />Học lại bộ này</button>}
            <button onClick={backToLibrary} className={styles.secondary}>Chọn bộ học khác</button>
          </div>
        </section>
      )}
    </main>
  );
}
