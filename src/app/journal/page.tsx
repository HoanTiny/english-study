"use client";

import { useEffect, useMemo, useState } from "react";
import { promptOfTheDay } from "@/lib/content";
import { countSentences, todayKey } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  listEntries,
  saveEntry,
  type Entry,
  type Feedback,
} from "@/lib/journalRepo";

const MIN = 5;
const TARGET = 10;

function mockFeedback(text: string): Feedback[] {
  const fb: Feedback[] = [];
  if (/\bi\s/.test(text))
    fb.push({ fragment: "i", issue: "Viết hoa 'I'", suggestion: "Dùng 'I' thay vì 'i'." });
  if (/\byesterday\b/i.test(text) && !/\bwas\b|\bwent\b|ed\b/i.test(text))
    fb.push({ fragment: "yesterday", issue: "Thì quá khứ", suggestion: "Với 'yesterday' nên dùng quá khứ đơn." });
  if (/\bi\s+like\s+very\s+much\b/i.test(text) || /\bvery much\b/i.test(text))
    fb.push({ fragment: "very much", issue: "Tự nhiên hơn", suggestion: "Thử 'a lot' cho tự nhiên hơn." });
  return fb.slice(0, 3);
}

// Gọi AI thật (Gemini) qua route handler; nếu chưa có key hoặc lỗi → mock.
async function getFeedback(body: string, prompt: string): Promise<Feedback[]> {
  try {
    const res = await fetch("/api/journal-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, prompt }),
    });
    if (res.ok) {
      const data = (await res.json()) as { feedback: Feedback[] | null };
      if (data.feedback !== null) return data.feedback;
    }
  } catch {
    // bỏ qua, dùng mock
  }
  return mockFeedback(body);
}

export default function JournalPage() {
  const prompt = useMemo(() => promptOfTheDay(), []);
  const { userId, ready } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);
  const [scoring, setScoring] = useState(false);

  const sentences = countSentences(body);
  const today = todayKey();
  const savedToday = entries.find((e) => e.date === today);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    listEntries()
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch((e) => console.error("listEntries", e));
    return () => {
      active = false;
    };
  }, [ready, userId]);

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  async function save() {
    if (!userId || scoring) return;
    setScoring(true);
    const fb = await getFeedback(body, prompt.en);
    setFeedback(fb);
    setScoring(false);
    const entry: Entry = { date: today, prompt: prompt.en, body, sentences, feedback: fb };
    // cập nhật lạc quan
    setEntries((prev) => [entry, ...prev.filter((e) => e.date !== today)]);
    try {
      await saveEntry(userId, entry);
    } catch (e) {
      console.error("saveEntry", e);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 pt-24 animate-fadeIn relative">
      {/* Background radial highlight */}
      <div className="absolute top-10 left-1/4 w-72 h-72 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="mb-10 text-center sm:text-left">
        <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          ✍️ LUYỆN KỸ NĂNG VIẾT & PHẢN XẠ
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-4">
          Nhật ký phản xạ
        </h1>
        <p className="mt-2.5 text-xs sm:text-sm font-semibold text-muted leading-relaxed max-w-2xl">
          Viết tối thiểu {MIN}–{TARGET} câu mỗi ngày theo chủ đề đề xuất, nhận phân tích sửa lỗi thông minh từ trí tuệ nhân tạo (AI) và luyện đọc to để tạo phản xạ giao tiếp tự tin.
        </p>
      </div>

      <div className="liquid-glass-card p-6 sm:p-8 border border-border/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl pointer-events-none" />

        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/40 dark:bg-black/20 border border-border/80 p-5 rounded-2xl relative shadow-sm">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-primary">Chủ đề viết hôm nay</p>
            <p className="mt-1.5 font-display font-bold text-foreground text-sm sm:text-base leading-relaxed">{prompt.en}</p>
            <p className="text-xs font-semibold text-muted mt-1">{prompt.vi}</p>
          </div>
          <button
            onClick={() => speak(prompt.en)}
            className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border border-border/80 bg-white/60 dark:bg-slate-900/60 text-sm transition-all duration-300 hover:border-primary hover:bg-primary-soft/30 active:scale-95 shadow-sm cursor-pointer"
            title="Nghe phát âm chuẩn"
          >
            🔊
          </button>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          placeholder="Start writing your thoughts in English here..."
          className="w-full resize-none rounded-2xl border border-border/80 bg-white/35 dark:bg-black/35 p-5 text-sm font-semibold leading-relaxed outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/80 focus:bg-white/80 dark:focus:bg-slate-950/80 transition-all text-foreground placeholder:text-muted/50 shadow-inner"
        />

        {/* Progress block */}
        <div className="mt-6 flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/5 border border-border/40 shadow-inner">
            <div
              className={`h-full transition-all duration-500 rounded-full bg-gradient-to-r ${sentences >= MIN ? "from-teal-500 to-emerald-400 shadow-md shadow-emerald-500/20" : "from-primary to-accent"}`}
              style={{ width: `${Math.min(100, (sentences / TARGET) * 100)}%` }}
            />
          </div>
          <span className="text-[9px] font-black text-muted shrink-0 bg-white/60 dark:bg-slate-900/60 border border-border/80 px-3 py-1.5 rounded-full shadow-sm">
            {sentences}/{TARGET} câu
          </span>
        </div>

        <div className="mt-7 flex flex-col sm:flex-row gap-3.5">
          <button
            onClick={save}
            disabled={sentences < MIN || scoring}
            className="flex-1 liquid-glass-btn py-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:!bg-black/5 dark:disabled:!bg-white/5 disabled:!text-muted/40 disabled:!border-border/30 disabled:shadow-none disabled:hover:scale-100 shadow-md transition-all duration-300"
          >
            {scoring ? (
              <>
                <span className="inline-block animate-spin">⏳</span> Đang chấm bài…
              </>
            ) : sentences < MIN ? (
              `Cần viết thêm ${MIN - sentences} câu`
            ) : (
              "Lưu bài & chấm điểm AI"
            )}
          </button>
          <button
            onClick={() => speak(body)}
            disabled={!body.trim()}
            className="rounded-full border border-border/80 bg-white/50 dark:bg-black/30 py-4 px-7 text-xs font-black uppercase tracking-wider text-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary-soft/20 disabled:!bg-black/5 dark:disabled:!bg-white/5 disabled:!text-muted/40 disabled:!border-border/30 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
          >
            🎙️ Đọc to bài viết
          </button>
        </div>
      </div>

      {feedback && (
        <div className="mt-8 liquid-glass-card p-6 sm:p-7 border border-border/85 shadow-xl animate-fadeIn relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-accent/5 rounded-full filter blur-xl pointer-events-none" />
          <p className="text-[9px] font-black uppercase tracking-widest text-primary border-b border-border/40 pb-2.5 mb-4">
            Phân tích lỗi & Nhận xét ngữ pháp (AI)
          </p>
          {feedback.length === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
              <span className="text-xl">🎉</span>
              <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Bài viết xuất sắc — không phát hiện lỗi ngữ pháp hay từ vựng cơ bản nào!
              </p>
            </div>
          ) : (
            <ul className="space-y-3.5">
              {feedback.map((f, i) => (
                <li
                  key={i}
                  className="text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-border/80 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-[8.5px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 shrink-0 self-start sm:self-auto">
                      Lỗi: {f.issue}
                    </span>
                    <span className="text-foreground/90 font-bold ml-1">
                      “{f.fragment}”
                    </span>
                  </div>
                  <span className="text-foreground/80 font-semibold sm:text-right">
                    Gợi ý sửa: <span className="text-primary underline decoration-wavy font-black">“{f.suggestion}”</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {savedToday && (
        <p className="mt-6 text-center text-xs font-black uppercase tracking-widest text-primary animate-pulse">
          ✓ Đã lưu thành công nhật ký của hôm nay
        </p>
      )}

      {entries.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted border-l-2 border-primary/50 pl-3">
            Lịch sử nhật ký phản xạ
          </h2>
          <div className="space-y-6">
            {entries.map((e) => (
              <div
                key={e.date}
                className="liquid-glass-card p-6 border border-border/80 shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-xl relative overflow-hidden"
              >
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <span className="text-[10px] font-black text-primary bg-primary-soft border border-primary/20 px-3.5 py-1 rounded-full shadow-sm">
                    {e.date}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted bg-black/5 dark:bg-white/5 border border-border/80 px-3 py-1 rounded-full">
                    {e.sentences} câu viết
                  </span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted mb-2">
                  Chủ đề: <span className="text-foreground/80 font-bold">{e.prompt}</span>
                </p>
                <p className="whitespace-pre-wrap text-xs sm:text-sm font-semibold leading-relaxed text-foreground bg-white/30 dark:bg-slate-900/35 border border-border/80 p-4 rounded-2xl shadow-inner">
                  {e.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

