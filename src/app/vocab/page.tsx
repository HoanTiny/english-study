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
  { g: "hard", label: "Khó", when: "1–2 ngày", cls: "bg-amber-400/20 text-amber-600" },
  { g: "good", label: "Tốt", when: "vài ngày", cls: "bg-primary-soft text-primary" },
  { g: "easy", label: "Dễ", when: "~1 tuần", cls: "bg-emerald-400/20 text-emerald-600" },
];

// Tính năng "Từ vựng" — Thư viện bộ thẻ (tham khảo Parroto) + HỌC THEO TỪNG TỪ ĐA CHẾ ĐỘ:
// Flashcard (lật) · Đoán (gõ từ) · Trắc nghiệm (chọn). Học sâu: Active Recall + audio bản xứ + câu ví dụ AI.
// Tất cả miễn phí, không khóa PRO.

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
  { key: "A1", name: "Khởi đầu A1", grad: "from-emerald-400/30 to-teal-500/30" },
  { key: "A2", name: "Mở rộng A2", grad: "from-amber-400/30 to-orange-500/30" },
  { key: "B1", name: "Giao tiếp B1+", grad: "from-pink-400/30 to-fuchsia-500/30" },
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
          className="liquid-glass-card group flex flex-col overflow-hidden p-0 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
        >
          <div className={`flex h-24 items-center justify-center bg-gradient-to-br ${grad} text-4xl`}>{d.emoji}</div>
          <div className="flex flex-1 flex-col gap-1 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">{badge ?? d.cefr}</span>
              <span className="text-[11px] font-semibold text-muted">{d.cards.length} {unit}</span>
            </div>
            <h3 className="font-display text-sm leading-snug text-foreground">{d.title}</h3>
            <span className="mt-1 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">Bắt đầu học →</span>
          </div>
        </button>
      ))}
    </div>
  );
}

const CATS = [
  { key: "lesson" as const, label: "Theo bài học", icon: "📗", count: DECKS.length },
  { key: "word" as const, label: "Từ theo chủ đề", icon: "🔤", count: WORD_DECKS.length },
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
  // trạng thái mỗi thẻ
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
      <main className="mx-auto max-w-5xl px-6 py-12 pt-16 animate-fadeIn">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">📚 Từ vựng</h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            Chọn danh mục → bộ thẻ → học đa chế độ (Flashcard · Đoán · Trắc nghiệm). Miễn phí.
          </p>
        </div>

        {/* Tab danh mục lớn */}
        <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setQ(""); }}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 transition-all ${cat === c.key ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"}`}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className={`text-center text-xs font-bold sm:text-sm ${cat === c.key ? "text-primary" : "text-foreground"}`}>{c.label}</span>
              <span className="text-[10px] font-semibold text-muted">{c.count} bộ</span>
            </button>
          ))}
        </div>

        {/* Tìm kiếm + game */}
        <div className="mb-7 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Tìm bộ thẻ theo tên…"
            className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary sm:max-w-xs"
          />
          <Link href="/collocations" className="shrink-0 text-sm font-bold text-primary hover:underline">🧩 Game Ghép cụm →</Link>
        </div>

        {/* Theo bài học — gom A1/A2/B1 */}
        {cat === "lesson" &&
          COLLECTIONS.map((col) => {
            const decks = DECKS.filter((d) => bucket(d.cefr) === col.key && match(d));
            if (decks.length === 0) return null;
            return (
              <section key={col.key} className="mb-8">
                <h2 className="mb-3 font-display text-lg text-foreground">
                  {col.name} <span className="text-xs font-semibold text-muted">({decks.length})</span>
                </h2>
                <DeckGrid decks={decks} grad={col.grad} unit="thẻ" onPick={startDeck} />
              </section>
            );
          })}

        {/* Từ theo chủ đề */}
        {cat === "word" && (
          <DeckGrid decks={WORD_DECKS.filter(match)} grad="from-sky-400/30 to-indigo-500/30" badge="Từ đơn" unit="từ" onPick={startDeck} />
        )}

        {/* Mẫu câu giao tiếp */}
        {cat === "sentence" && (
          <DeckGrid decks={SENTENCE_DECKS.filter(match)} grad="from-violet-400/30 to-pink-400/30" badge="Câu" unit="câu" onPick={startDeck} />
        )}
      </main>
    );
  }

  // ===== STUDY =====
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 pt-16 animate-fadeIn">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg animate-fadeIn">
          {toast}
        </div>
      )}
      <button onClick={backToLibrary} className="mb-4 text-xs font-bold text-muted hover:text-foreground">
        ← Thư viện từ vựng
      </button>
      <div className="mb-5 text-center">
        <h1 className="font-display text-2xl text-foreground">{deck?.emoji} {deck?.title}</h1>
      </div>

      {/* Tab chế độ học */}
      <div className="mb-6 flex justify-center">
        <div className="flex gap-1 rounded-2xl border border-border bg-surface p-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => switchMode(m.key)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                mode === m.key ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {phase === "playing" && card && (
        <div>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(idx / cards.length) * 100}%` }} />
            </div>
            <span className="shrink-0 text-xs font-bold text-muted">{idx + 1}/{cards.length}</span>
          </div>

          {/* ---- FLASHCARD ---- */}
          {mode === "flashcard" && (
            <>
              <div className="liquid-glass-card flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
                <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[10px] font-bold text-primary">{card.cefr}</span>
                <p className="text-2xl font-bold text-foreground">{card.vi}</p>
                <button onClick={() => play(card.en)} className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-md transition-transform hover:scale-105 active:scale-95">🔊</button>
                {!revealed ? (
                  <>
                    <p className="text-sm font-medium italic text-muted">Tự nhớ lại cụm tiếng Anh…</p>
                    <button onClick={() => setRevealed(true)} className="rounded-full bg-primary-soft px-6 py-2.5 text-sm font-bold text-primary hover:scale-105 active:scale-95">Hiện đáp án</button>
                  </>
                ) : (
                  <div className="w-full animate-fadeIn space-y-2 border-t border-border pt-4">
                    <p className="font-display text-2xl text-primary">{card.en}</p>
                    {card.ipa && <p className="text-sm font-semibold text-accent">{card.ipa}</p>}
                    {/* Đối chiếu accent UK/US + thu âm nghe lại */}
                    <div className="my-3"><PronounceBar word={card.en} /></div>
                    {card.example && <p className="mt-2 rounded-xl bg-surface p-3 text-sm italic text-foreground/90">“{card.example}”</p>}
                    {extra && (
                      <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-3 text-left animate-fadeIn">
                        <p className="text-sm font-semibold italic text-foreground">✨ “{extra.sentence}”</p>
                        {extra.vi && <p className="mt-0.5 text-xs text-muted">{extra.vi}</p>}
                      </div>
                    )}
                    <button onClick={newExample} disabled={loadingExtra} className="rounded-full border border-primary/30 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary-soft active:scale-95 disabled:opacity-50">
                      {loadingExtra ? "Đang tạo…" : "✨ Câu ví dụ khác (AI)"}
                    </button>
                  </div>
                )}
              </div>
              {revealed && (
                <div className="mt-4 animate-fadeIn space-y-3">
                  <p className="text-center text-[11px] font-semibold text-muted">Bạn nhớ từ này tốt đến đâu? (chọn để đưa vào lịch ôn lại)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADES.map(({ g, label, when, cls }) => (
                      <button key={g} onClick={() => gradeAndNext(g)} className={`rounded-2xl py-2.5 transition-transform hover:scale-[1.04] active:scale-95 ${cls}`}>
                        <span className="block text-sm font-black">{label}</span>
                        <span className="block text-[10px] font-semibold opacity-80">{when}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button onClick={() => advance(true)} className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-primary hover:bg-primary-soft">
                      ✓ Thành thạo
                    </button>
                    <button onClick={() => { if (card) saveWord(card, { review: false }); advance(true); }} className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-surface">
                      {card && savedSet.has(card.en) ? "✓ Đã lưu" : "🔖 Lưu vào sổ tay"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---- ĐOÁN (gõ từ) ---- */}
          {mode === "type" && (
            <div className="liquid-glass-card flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[10px] font-bold text-primary">{card.cefr}</span>
              <p className="text-xl font-bold text-foreground">{card.vi}</p>
              {card.example ? (
                <p className="text-sm italic text-muted">
                  “{card.example.replace(new RegExp(card.en.replace(/[.*+?^${}()|[\]\\…]/g, "\\$&"), "i"), "_____")}”
                </p>
              ) : (
                <p className="text-sm italic text-muted">Gõ từ tiếng Anh đúng nghĩa trên.</p>
              )}
              {hinted && <p className="text-sm font-bold text-accent">Gợi ý: {card.en.slice(0, Math.max(2, Math.ceil(card.en.length / 3)))}…</p>}

              {resolved === null ? (
                <>
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && typed.trim() && checkType()}
                    placeholder="Nhập cụm tiếng Anh…"
                    className="w-full max-w-sm rounded-xl border-2 border-border bg-background px-4 py-3 text-center text-lg font-semibold text-foreground outline-none focus:border-primary"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setHinted(true)} className="rounded-full bg-amber-400/20 px-5 py-2.5 text-sm font-bold text-amber-600">💡 Gợi ý</button>
                    <button onClick={() => advance(false)} className="rounded-full bg-pink-soft px-5 py-2.5 text-sm font-bold text-pink">Không biết</button>
                    <button onClick={checkType} disabled={!typed.trim()} className="liquid-glass-btn px-6 py-2.5 text-sm font-bold disabled:opacity-50">Kiểm tra</button>
                  </div>
                </>
              ) : (
                <div className="w-full animate-fadeIn space-y-2 border-t border-border pt-4">
                  <p className={`font-display text-2xl ${resolved ? "text-primary" : "text-pink"}`}>{resolved ? "✓ Chính xác!" : "✗ Chưa đúng"}</p>
                  <p className="font-display text-xl text-foreground">{card.en}</p>
                  {card.ipa && <p className="text-sm font-semibold text-accent">{card.ipa}</p>}
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <button onClick={() => { if (card) saveWord(card, { review: true, grade: resolved ? "good" : "again" }); }} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-surface">🔖 Lưu vào sổ tay</button>
                    <button onClick={() => advance(!!resolved)} className="liquid-glass-btn px-8 py-2.5 text-sm font-bold">Tiếp →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- TRẮC NGHIỆM ---- */}
          {mode === "choice" && (
            <div className="liquid-glass-card flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
              <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[10px] font-bold text-primary">{card.cefr}</span>
              <p className="text-xl font-bold text-foreground">{card.vi}</p>
              <button onClick={() => play(card.en)} className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-white shadow-md">🔊</button>
              <div className="grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
                {options.map((opt) => {
                  let cls = "border-border bg-surface text-foreground hover:border-primary/60";
                  if (resolved !== null) {
                    if (opt === card.en) cls = "border-primary bg-primary-soft text-primary";
                    else if (opt === chosen) cls = "border-pink bg-pink-soft text-pink";
                    else cls = "border-border bg-surface text-muted opacity-60";
                  }
                  return (
                    <button key={opt} disabled={resolved !== null} onClick={() => pick(opt)} className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-all active:scale-95 ${cls}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {resolved !== null && (
                <div className="flex items-center justify-center gap-3 animate-fadeIn">
                  <button onClick={() => { if (card) saveWord(card, { review: true, grade: resolved ? "good" : "again" }); }} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-surface">🔖 Lưu vào sổ tay</button>
                  <button onClick={() => advance(!!resolved)} className="liquid-glass-btn px-8 py-2.5 text-sm font-bold">Tiếp →</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="liquid-glass-card flex flex-col items-center gap-5 p-10 text-center">
          <span className="text-6xl">🎉</span>
          <h2 className="font-display text-2xl text-foreground">Xong bộ “{deck?.title}”!</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border-2 border-primary px-8 py-4">
              <p className="font-display text-3xl text-primary">{known}</p>
              <p className="text-xs font-bold uppercase text-muted">đúng / nhớ</p>
            </div>
            <div className="rounded-2xl border-2 border-pink px-8 py-4">
              <p className="font-display text-3xl text-pink">{again}</p>
              <p className="text-xs font-bold uppercase text-muted">cần ôn lại</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {deck && (
              <button onClick={() => startDeck(deck)} className="liquid-glass-btn px-6 py-3 text-sm font-bold">🔄 Học lại bộ này</button>
            )}
            <button onClick={backToLibrary} className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-bold text-foreground hover:border-primary/40">← Chọn bộ khác</button>
          </div>
        </div>
      )}
    </main>
  );
}
