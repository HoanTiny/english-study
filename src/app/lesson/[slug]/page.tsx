"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchLesson, type LessonContentDB } from "@/lib/lessonsRepo";
import { useAuth } from "@/lib/auth";
import { addNote, listNotes } from "@/lib/notesRepo";
import { fetchPronounce, isSingleWord } from "@/lib/pronounce";
import ListeningResource from "@/components/ListeningResource";
import LessonQuiz from "@/components/LessonQuiz";
import { isLessonDone } from "@/lib/lessonDone";
import grammarData from "@/data/grammar.json";

type GrammarStruct = { structure: string; vi: string; example: string; exampleVi: string; level: string; lessons?: string[] };
const GRAMMAR = grammarData as GrammarStruct[];

// Phát audio đã upload (bucket private) qua signed-URL endpoint.
function audioSrc(path: string) {
  return `/api/lesson-audio?path=${encodeURIComponent(path)}`;
}

export default function LessonPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { userId, ready } = useAuth();

  // IPA đã gộp về trang luyện tương tác /ipa → chuyển hướng, không hiển thị bản trùng.
  useEffect(() => {
    if (slug === "ipa-sounds") router.replace("/ipa");
  }, [slug, router]);

  // Nội dung bài: đọc từ DB (CMS) trước, fallback file tĩnh.
  const [lesson, setLesson] = useState<LessonContentDB | undefined>(undefined);
  const [lessonLoading, setLessonLoading] = useState(true);

  // Cụm đã lưu vào ôn tập (theo nội dung trùng khớp).
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [doneBadge, setDoneBadge] = useState(false);

  useEffect(() => {
    setDoneBadge(isLessonDone(slug));
  }, [slug]);

  useEffect(() => {
    let active = true;
    setLessonLoading(true);
    fetchLesson(slug)
      .then((l) => {
        if (active) {
          setLesson(l);
          setLessonLoading(false);
        }
      })
      .catch(() => active && setLessonLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

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
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    window.speechSynthesis.speak(u);
  }

  // Ưu tiên: audio đã upload trong CMS → audio bản xứ (Free Dictionary, từ đơn) → TTS.
  async function speak(text: string, rate = 0.9, uploadedPath?: string | null) {
    if (uploadedPath) {
      try {
        await new Audio(audioSrc(uploadedPath)).play();
        return;
      } catch {
        // bỏ qua → fallback dưới
      }
    }
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

  if (slug === "ipa-sounds") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-32 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="mt-4 text-xs font-black uppercase tracking-wider text-muted">Đang mở trang luyện IPA…</p>
      </main>
    );
  }

  if (lessonLoading) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-32 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center animate-fadeIn relative">
        <p className="text-muted font-bold text-sm">Bài học này đang được ban biên tập thiết lập… 🛠️</p>
        <Link
          href="/"
          className="mt-6 inline-block liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider active:scale-95"
        >
          ← Quay lại lộ trình
        </Link>
      </main>
    );
  }

  const savedCount = lesson.phrases.filter((p) => saved.has(p.en)).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 pt-24 animate-fadeIn relative">
      {/* Background radial highlight */}
      <div className="absolute top-10 right-1/4 w-72 h-72 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />

      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-white/40 dark:bg-black/20 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-muted hover:text-foreground hover:border-primary/50 transition-all duration-300 active:scale-95 shadow-sm cursor-pointer"
      >
        ← Lộ trình học
      </Link>

      <div className="mt-6 mb-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {lesson.title}
          </h1>
          <span className="rounded-full bg-primary-soft border border-primary/20 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-primary shadow-sm">
            {lesson.cefr}
          </span>
          {doneBadge && (
            <span className="rounded-full bg-teal-500/10 border border-teal-500/25 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 shadow-sm">
              ✓ Đã hoàn thành
            </span>
          )}
        </div>
        <p className="mt-3 text-xs sm:text-sm font-semibold text-muted leading-relaxed">
          {lesson.intro}
        </p>
        {lesson.tip && (
          <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/5 p-4 sm:p-5 text-xs font-semibold text-foreground/90 leading-relaxed shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-full filter blur-md pointer-events-none" />
            💡 <span className="font-black text-accent uppercase tracking-wider text-[9px] mr-1">Mẹo học tập:</span> {lesson.tip}
          </div>
        )}
        {slug === "ipa-sounds" && (
          <Link href="/ipa" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4 transition-all hover:border-primary/60 hover:bg-primary-soft/60">
            <span className="text-sm font-bold text-foreground">🔤 Học IPA tương tác: bảng âm · nghe–nhại · phân biệt cặp âm</span>
            <span className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-fg">Mở →</span>
          </Link>
        )}
        <div className="mt-6 flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/5 border border-border/40 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
              style={{ width: `${(savedCount / lesson.phrases.length) * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-black text-muted shrink-0 bg-white/60 dark:bg-slate-900/60 border border-border/80 px-3 py-1.5 rounded-full shadow-sm">
            {savedCount}/{lesson.phrases.length} đã lưu ôn tập
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {lesson.phrases.map((p) => {
          const isSaved = saved.has(p.en);
          return (
            <div
              key={p.en}
              className="liquid-glass-card p-6 sm:p-7 border border-border/85 shadow-lg relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-xl"
            >
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br from-primary/5 to-transparent blur-xl pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg sm:text-xl font-bold text-foreground leading-snug tracking-tight">
                    {p.en}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {p.ipa && (
                      <span className="text-[10px] font-mono font-black text-accent bg-accent/5 border border-accent/10 px-2 py-0.5 rounded">
                        /{p.ipa.replace(/^\/+|\/+$/g, "").trim()}/
                      </span>
                    )}
                    <span className="text-xs font-semibold text-muted">{p.vi}</span>
                  </div>
                </div>
                <button
                  onClick={() => speak(p.en, 0.9, p.audioUrl)}
                  className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border border-border/80 bg-white/60 dark:bg-slate-900/60 text-sm transition-all duration-300 hover:border-primary hover:bg-primary-soft/30 active:scale-95 shadow-sm cursor-pointer"
                  title="Nghe cụm từ"
                >
                  🔊
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-white/35 dark:bg-black/35 border border-border/80 p-4 text-xs sm:text-sm font-semibold italic text-foreground/80 leading-relaxed shadow-sm">
                “{p.example}”
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-border/40">
                <button
                  onClick={() => speak(p.example, 0.85)}
                  className="rounded-full border border-border/80 bg-white/50 dark:bg-black/30 py-2.5 px-4.5 text-[9px] font-black uppercase tracking-wider text-muted hover:text-foreground hover:border-primary/40 active:scale-95 transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  🎙️ Nhại theo câu
                </button>
                <button
                  onClick={() => pushToReview(p.en, p.example)}
                  disabled={isSaved || busy === p.en}
                  className={`rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md ${
                    isSaved
                      ? "bg-teal-500/10 border border-teal-500/25 text-teal-600 dark:text-teal-400 cursor-default shadow-sm"
                      : "liquid-glass-btn disabled:opacity-55 disabled:cursor-not-allowed"
                  }`}
                >
                  {isSaved ? "✓ Đã lưu ôn tập" : busy === p.en ? "Đang lưu…" : "+ Lưu ôn tập"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cấu trúc câu liên quan tới bài này (map trong src/data/grammar.json) */}
      {(() => {
        const related = GRAMMAR.filter((s) => s.lessons?.includes(slug));
        if (related.length === 0) return null;
        return (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-muted">🧩 Cấu trúc câu liên quan</h2>
              <span className="text-[10px] font-bold text-muted/70">{related.length} cấu trúc</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="space-y-2.5">
              {related.map((s) => (
                <Link
                  key={s.structure}
                  href={`/grammar?q=${encodeURIComponent(s.structure)}`}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 px-4 py-3.5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-extrabold text-foreground leading-snug">{s.structure}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-muted">{s.vi} · “{s.example}”</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-soft border border-primary/20 px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-primary">{s.level}</span>
                  <span className="shrink-0 text-xs font-black text-primary">Xem →</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      <LessonQuiz phrases={lesson.phrases} slug={slug} />

      <ListeningResource
        cefr={lesson.cefr}
        topic={lesson.title}
        youtubeId={lesson.youtubeId}
      />

      <div className="mt-12 text-center">
        <Link
          href="/review"
          className="inline-block liquid-glass-btn px-8 py-4 text-xs font-black uppercase tracking-widest active:scale-95 shadow-lg"
        >
          Tới phòng ôn tập SRS →
        </Link>
      </div>
    </main>
  );
}
