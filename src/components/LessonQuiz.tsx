"use client";

import { useMemo, useState } from "react";
import type { LessonPhrase } from "@/lib/lessons";
import { markLessonDone } from "@/lib/lessonDone";

type Question = {
  prompt: string; // nghĩa tiếng Việt
  answer: string; // cụm tiếng Anh đúng
  options: string[]; // 4 lựa chọn (đã trộn)
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(phrases: LessonPhrase[]): Question[] {
  const pool = phrases.filter((p) => p.vi && p.en);
  return shuffle(pool).map((p) => {
    const distractors = shuffle(pool.filter((x) => x.en !== p.en))
      .slice(0, 3)
      .map((x) => x.en);
    return {
      prompt: p.vi,
      answer: p.en,
      options: shuffle([p.en, ...distractors]),
    };
  });
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export default function LessonQuiz({
  phrases,
  slug,
}: {
  phrases: LessonPhrase[];
  slug: string;
}) {
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const canQuiz = useMemo(
    () => phrases.filter((p) => p.vi && p.en).length >= 2,
    [phrases],
  );

  function start() {
    setQuestions(buildQuestions(phrases));
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setStarted(true);
  }

  function pick(opt: string) {
    if (picked) return;
    setPicked(opt);
    const correct = opt === questions[idx].answer;
    if (correct) setScore((s) => s + 1);
    speak(questions[idx].answer);
  }

  function next() {
    if (idx + 1 >= questions.length) {
      setDone(true);
      markLessonDone(slug);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }

  if (!canQuiz) return null;

  // Màn mở đầu
  if (!started) {
    return (
      <div className="mt-10 rounded-3xl border border-primary/20 bg-primary-soft/30 p-6 sm:p-7 text-center shadow-sm">
        <p className="font-display text-lg font-black text-foreground">📝 Kiểm tra cuối bài</p>
        <p className="mt-1.5 text-xs font-semibold text-muted">
          {phrases.filter((p) => p.vi && p.en).length} câu trắc nghiệm nhanh — chọn cụm tiếng Anh đúng với nghĩa.
        </p>
        <button
          onClick={start}
          className="mt-5 inline-block liquid-glass-btn px-7 py-3 text-xs font-black uppercase tracking-wider active:scale-95"
        >
          Bắt đầu kiểm tra →
        </button>
      </div>
    );
  }

  // Màn kết quả
  if (done) {
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const great = pct >= 80;
    return (
      <div className="mt-10 rounded-3xl border border-border/60 bg-white/70 dark:bg-zinc-900/60 p-7 text-center shadow-sm animate-fadeIn">
        <p className="text-4xl">{great ? "🎉" : "💪"}</p>
        <p className="mt-2 font-display text-2xl font-black text-foreground">
          {score}/{total} <span className="text-base text-muted">({pct}%)</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-muted">
          {great ? "Tuyệt vời! Bạn nắm bài tốt." : "Tốt rồi — ôn lại vài cụm và thử lại nhé."}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
          ✓ Đã hoàn thành bài học
        </p>
        <div className="mt-5">
          <button
            onClick={start}
            className="rounded-full border border-border/80 bg-white/50 dark:bg-black/30 px-6 py-2.5 text-[10px] font-black uppercase tracking-wider text-muted hover:text-foreground hover:border-primary/40 active:scale-95 transition-all cursor-pointer"
          >
            ↻ Làm lại
          </button>
        </div>
      </div>
    );
  }

  // Màn câu hỏi
  const q = questions[idx];
  return (
    <div className="mt-10 rounded-3xl border border-border/60 bg-white/70 dark:bg-zinc-900/60 p-6 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
          Câu {idx + 1}/{questions.length}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
          Điểm: {score}
        </span>
      </div>
      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Nghĩa</p>
      <p className="font-display text-xl font-black text-foreground mb-5">{q.prompt}</p>

      <div className="grid gap-2.5">
        {q.options.map((opt) => {
          const isAnswer = opt === q.answer;
          const isPicked = opt === picked;
          let cls =
            "border-border/70 bg-white/50 dark:bg-black/20 text-foreground hover:border-primary/50";
          if (picked) {
            if (isAnswer) cls = "border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300";
            else if (isPicked) cls = "border-pink-500/50 bg-pink-500/10 text-pink-700 dark:text-pink-300";
            else cls = "border-border/40 bg-transparent text-muted/60";
          }
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={!!picked}
              className={`w-full text-left rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.99] ${cls} ${!picked ? "cursor-pointer" : "cursor-default"}`}
            >
              {opt}
              {picked && isAnswer && <span className="float-right">✓</span>}
              {picked && isPicked && !isAnswer && <span className="float-right">✗</span>}
            </button>
          );
        })}
      </div>

      {picked && (
        <button
          onClick={next}
          className="mt-5 w-full liquid-glass-btn py-3 text-xs font-black uppercase tracking-wider active:scale-95"
        >
          {idx + 1 >= questions.length ? "Xem kết quả →" : "Câu tiếp theo →"}
        </button>
      )}
    </div>
  );
}
