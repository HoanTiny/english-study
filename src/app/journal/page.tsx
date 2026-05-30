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
    if (!window.speechSynthesis) return;
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
    <main className="mx-auto max-w-2xl px-5 py-12 pt-16 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-iridescent">Nhật ký viết & nói</h1>
        <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
          Viết tối thiểu {MIN}–{TARGET} câu mỗi ngày, nhận phản hồi sửa lỗi tức thì từ trí tuệ nhân tạo (AI), sau đó bấm đọc to bài viết để rèn luyện phản xạ nói trôi chảy.
        </p>
      </div>

      <div className="liquid-glass-card p-6 md:p-8 relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 rounded-full filter blur-xl pointer-events-none" />

        <div className="mb-5 flex items-start justify-between gap-4 bg-white/20 dark:bg-white/5 border border-border p-4 rounded-2xl relative">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">Chủ đề viết của hôm nay</p>
            <p className="mt-1 font-bold text-foreground text-base leading-relaxed">{prompt.en}</p>
            <p className="text-sm font-semibold text-muted mt-0.5">{prompt.vi}</p>
          </div>
          <button
            onClick={() => speak(prompt.en)}
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/30 dark:bg-white/5 text-sm transition-all duration-300 hover:border-primary hover:bg-primary/5 active:scale-95 shadow-sm"
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
          className="w-full resize-none rounded-2xl border border-border bg-white/10 dark:bg-black/20 p-4 text-sm font-medium leading-relaxed outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-300 text-foreground placeholder:text-muted/60"
        />

        {/* Progress block */}
        <div className="mt-4 flex items-center gap-4">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/5 border border-border/40">
            <div
              className={`h-full transition-all duration-500 rounded-full bg-gradient-to-r ${sentences >= MIN ? "from-accent to-emerald-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]" : "from-primary to-indigo-500"}`}
              style={{ width: `${Math.min(100, (sentences / TARGET) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-muted shrink-0 bg-white/30 dark:bg-white/5 border border-border px-2.5 py-1 rounded-full">
            {sentences}/{TARGET} câu
          </span>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={save}
            disabled={sentences < MIN || scoring}
            className="flex-1 liquid-glass-btn py-3 text-sm font-bold flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {scoring
              ? "Đang chấm bài… ⏳"
              : sentences < MIN
                ? `Cần viết thêm ${MIN - sentences} câu`
                : "Lưu bài & nhận góp ý AI"}
          </button>
          <button
            onClick={() => speak(body)}
            disabled={!body.trim()}
            className="rounded-2xl border border-border bg-white/20 dark:bg-white/5 py-3 px-5 text-sm font-bold text-foreground transition-all duration-300 hover:border-accent/60 hover:bg-accent/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95"
          >
            🎙️ Đọc to lại bài viết
          </button>
        </div>
      </div>

      {feedback && (
        <div className="mt-5 liquid-glass-card p-6 border border-border animate-fadeIn relative">
          <div className="absolute -top-6 -left-6 w-12 h-12 bg-accent/10 rounded-full filter blur-lg pointer-events-none" />
          <p className="text-sm font-black uppercase tracking-wider text-primary">Góp ý ngữ pháp (AI)</p>
          {feedback.length === 0 ? (
            <p className="mt-3 text-sm font-bold text-accent flex items-center gap-1.5">
              <span>🎉</span> Bài viết hoàn hảo — không phát hiện bất kỳ lỗi ngữ pháp cơ bản nào!
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {feedback.map((f, i) => (
                <li key={i} className="text-sm font-semibold flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-border/20">
                  <span className="rounded-lg bg-warn/15 border border-warn/30 px-2 py-0.5 text-xs font-bold text-warn shrink-0">
                    Lỗi: {f.issue}
                  </span>{" "}
                  <span className="text-foreground/90 font-medium">
                    Gợi ý: <span className="text-accent underline decoration-wavy font-bold">{f.suggestion}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {savedToday && (
        <p className="mt-4 text-center text-xs font-bold text-accent animate-pulse">✓ Đã lưu thành công nhật ký của hôm nay</p>
      )}

      {entries.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xs font-black uppercase tracking-wider text-muted">Lịch sử bài viết đã lưu</h2>
          <div className="space-y-4">
            {entries.map((e) => (
              <div key={e.date} className="liquid-glass-card p-5 border border-border transition-all duration-300 hover:shadow-md">
                <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg">{e.date}</span>
                  <span className="text-xs font-semibold text-muted bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-lg">{e.sentences} câu viết</span>
                </div>
                <p className="text-xs font-bold text-muted mb-2">Chủ đề: {e.prompt}</p>
                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground bg-white/10 dark:bg-black/10 border border-border/20 p-3.5 rounded-xl">{e.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

