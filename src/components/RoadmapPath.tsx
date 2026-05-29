"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { stages, type LessonStatus } from "@/lib/curriculum";
import { getLesson } from "@/lib/lessons";
import { useAuth } from "@/lib/auth";
import { listNotes } from "@/lib/notesRepo";
import { countSavedByLesson, computeStatuses } from "@/lib/lessonProgress";

const statusStyles: Record<LessonStatus, string> = {
  done: "border-accent/40 bg-accent/10 dark:bg-accent/15 text-accent hover:border-accent/80 hover:shadow-[0_0_16px_rgba(6,182,212,0.3)]",
  in_progress: "border-primary/50 bg-primary/15 dark:bg-primary/20 text-primary shadow-[0_0_12px_rgba(99,102,241,0.2)] animate-[pulse_2s_infinite] hover:border-primary/80",
  available: "border-border bg-white/20 dark:bg-white/5 text-foreground hover:border-primary/40 hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-md",
  locked: "border-border/40 bg-black/5 dark:bg-white/5 text-muted opacity-50 cursor-not-allowed",
};

const statusIcon: Record<LessonStatus, string> = {
  done: "✨ ✓",
  in_progress: "⚡ ▶",
  available: "○",
  locked: "🔒",
};

export default function RoadmapPath() {
  const { userId, ready } = useAuth();
  const [dyn, setDyn] = useState<Record<string, LessonStatus>>({});

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    listNotes()
      .then((notes) => {
        if (active) setDyn(computeStatuses(countSavedByLesson(notes)));
      })
      .catch((e) => console.error("roadmap progress", e));
    return () => {
      active = false;
    };
  }, [ready, userId]);

  const statusOf = (slug: string, fallback: LessonStatus): LessonStatus =>
    dyn[slug] ?? fallback;

  return (
    <div className="space-y-12">
      {stages.map((stage) => {
        const total = stage.lessons.length;
        const done = stage.lessons.filter(
          (l) => statusOf(l.slug, l.status) === "done",
        ).length;
        const pct = Math.round((done / total) * 100);
        return (
          <section 
            key={stage.id} 
            className="liquid-glass-card p-6 md:p-8 relative overflow-hidden transition-all duration-500 hover:shadow-lg"
          >
            {/* Glowing background hint inside stage card */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 filter blur-2xl pointer-events-none" />

            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-purple-600 text-sm font-black text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
                {stage.id}
              </span>
              <h3 className="text-xl font-extrabold tracking-tight">{stage.title}</h3>
              <span className="rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {stage.cefr}
              </span>
              <span className="rounded-lg bg-black/5 dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-muted">
                {stage.months}
              </span>
              
              <span className="ml-auto text-xs font-bold text-muted bg-white/20 dark:bg-white/5 border border-border px-3 py-1 rounded-full">
                {done}/{total} bài học · <span className="text-primary font-black">{pct}%</span>
              </span>
            </div>
            
            <p className="mb-6 max-w-2xl text-sm font-medium text-muted/90 leading-relaxed">
              {stage.goal}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stage.lessons.map((lesson) => {
                // Hội thoại AI là công cụ luyện tập, luôn mở và trỏ sang /roleplay.
                const isRoleplay = lesson.slug === "ai-roleplay";
                const st = isRoleplay
                  ? "available"
                  : statusOf(lesson.slug, lesson.status);
                const card = (
                  <div
                    className={`flex h-full items-center gap-3.5 rounded-2xl border p-4 transition-all duration-300 ${statusStyles[st]} ${st !== 'locked' ? 'hover:-translate-y-1' : ''}`}
                  >
                    <span className="text-sm font-extrabold shrink-0">{statusIcon[st]}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {lesson.title}
                      </p>
                      <p className="truncate text-xs font-semibold text-muted">
                        {lesson.topic}
                      </p>
                    </div>
                  </div>
                );
                // Hội thoại AI → trang riêng /roleplay.
                if (isRoleplay) {
                  return (
                    <Link key={lesson.slug} href="/roleplay">
                      {card}
                    </Link>
                  );
                }
                // Có nội dung & chưa khoá → cho bấm vào học.
                const hasContent = st !== "locked" && getLesson(lesson.slug);
                return hasContent ? (
                  <Link key={lesson.slug} href={`/lesson/${lesson.slug}`}>
                    {card}
                  </Link>
                ) : (
                  <div key={lesson.slug}>{card}</div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

