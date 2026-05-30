"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getLesson } from "@/lib/lessons";
import { useAuth } from "@/lib/auth";
import { addNote, listNotes } from "@/lib/notesRepo";
import { fetchPronounce, isSingleWord } from "@/lib/pronounce";
import ListeningResource from "@/components/ListeningResource";

export default function LessonPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const lesson = useMemo(() => getLesson(slug), [slug]);
  const { userId, ready } = useAuth();

  // Cụm đã lưu vào ôn tập (theo nội dung trùng khớp).
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    listNotes()
      .then((notes) => {
        if (!active) return;
        const s = new Set(notes.map((n) => n.content));
        setSaved(s);
      })
      .catch((e) => console.error("listNotes", e));
    return () => {
      active = false;
    };
  }, [ready, userId]);

  function speakTTS(text: string, rate = 0.9) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    window.speechSynthesis.speak(u);
  }

  // Từ đơn: ưu tiên audio người bản xứ (Free Dictionary API); nếu không có thì TTS.
  // Cụm nhiều từ: dùng thẳng TTS.
  async function speak(text: string, rate = 0.9) {
    if (isSingleWord(text)) {
      try {
        const p = await fetchPronounce(text);
        if (p.audio) {
          await new Audio(p.audio).play();
          return;
        }
      } catch {
        // bỏ qua → fallback TTS
      }
    }
    speakTTS(text, rate);
  }

  async function pushToReview(en: string, example: string) {
    if (!userId || saved.has(en)) return;
    setBusy(en);
    try {
      await addNote(userId, {
        kind: "structure",
        content: en,
        example,
        tags: [slug],
        inReview: true,
      });
      setSaved((prev) => new Set(prev).add(en));
    } catch (e) {
      console.error("pushToReview", e);
    } finally {
      setBusy(null);
    }
  }

  if (!lesson) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-12 pt-16 text-center animate-fadeIn">
        <p className="text-muted font-bold">Bài học này đang được biên soạn. 🛠️</p>
        <Link
          href="/"
          className="mt-5 inline-block liquid-glass-btn px-6 py-2.5 text-sm font-bold active:scale-95"
        >
          ← Về lộ trình
        </Link>
      </main>
    );
  }

  const savedCount = lesson.phrases.filter((p) => saved.has(p.en)).length;

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 pt-16 animate-fadeIn">
      <Link
        href="/"
        className="text-xs font-bold text-muted hover:text-foreground transition-colors"
      >
        ← Lộ trình
      </Link>

      <div className="mt-3 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-iridescent">
            {lesson.title}
          </h1>
          <span className="rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {lesson.cefr}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
          {lesson.intro}
        </p>
        {lesson.tip && (
          <p className="mt-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm font-medium text-foreground/90">
            💡 {lesson.tip}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/5 border border-border/40">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
              style={{ width: `${(savedCount / lesson.phrases.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-muted shrink-0 bg-white/20 dark:bg-white/5 border border-border px-2.5 py-1 rounded-full">
            {savedCount}/{lesson.phrases.length} đã lưu ôn
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {lesson.phrases.map((p) => {
          const isSaved = saved.has(p.en);
          return (
            <div
              key={p.en}
              className="liquid-glass-card p-5 border border-border relative overflow-hidden transition-all duration-300 hover:shadow-md"
            >
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full filter blur-xl pointer-events-none" />
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground leading-relaxed">
                    {p.en}
                  </p>
                  {p.ipa && (
                    <p className="text-xs font-semibold text-accent mt-0.5">{p.ipa}</p>
                  )}
                  <p className="text-sm font-semibold text-muted mt-0.5">{p.vi}</p>
                </div>
                <button
                  onClick={() => speak(p.en)}
                  className="ml-auto shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white/30 dark:bg-white/5 text-sm transition-all duration-300 hover:border-primary hover:bg-primary/5 active:scale-95 shadow-sm"
                  title="Nghe phát âm"
                >
                  🔊
                </button>
              </div>

              <p className="mt-3 rounded-xl bg-white/10 dark:bg-black/20 border border-border/30 p-3 text-sm italic font-medium leading-relaxed text-foreground/90">
                “{p.example}”
              </p>

              <div className="mt-4 flex gap-3 pt-3 border-t border-border/40">
                <button
                  onClick={() => speak(p.example, 0.85)}
                  className="rounded-xl border border-border bg-white/20 dark:bg-white/5 py-2 px-4 text-sm font-semibold transition-all duration-300 hover:border-accent/60 hover:bg-accent/5 active:scale-95 flex items-center gap-1.5"
                >
                  🎙️ Nói theo câu mẫu
                </button>
                <button
                  onClick={() => pushToReview(p.en, p.example)}
                  disabled={isSaved || busy === p.en}
                  className={`ml-auto rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300 active:scale-95 flex items-center gap-1.5 ${
                    isSaved
                      ? "bg-accent/15 border border-accent/30 text-accent cursor-default"
                      : "liquid-glass-btn disabled:opacity-50"
                  }`}
                >
                  {isSaved ? "✓ Đã trong ôn tập" : busy === p.en ? "Đang lưu…" : "+ Đẩy vào ôn tập"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ListeningResource
        cefr={lesson.cefr}
        topic={lesson.title}
        youtubeId={lesson.youtubeId}
      />

      <div className="mt-8 text-center">
        <Link
          href="/review"
          className="inline-block liquid-glass-btn px-6 py-2.5 text-sm font-bold active:scale-95"
        >
          Tới phòng ôn tập SRS →
        </Link>
      </div>
    </main>
  );
}
