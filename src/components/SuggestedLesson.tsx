"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { listNotes } from "@/lib/notesRepo";
import { countSavedByLesson } from "@/lib/lessonProgress";
import { loadStages, suggestedLesson } from "@/lib/lessonsView";
import { listDoneSlugs } from "@/lib/lessonDone";

type Pick = { slug: string; title: string; cefr: string; reason: string };

// Gợi ý bài học nên học hôm nay: ưu tiên bài đang học dở, rồi bài mới mở khoá.
export default function SuggestedLesson() {
  const { userId, ready, currentStage, profileReady } = useAuth();
  const [pick, setPick] = useState<Pick | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready || !profileReady || !userId) return;
    let active = true;
    setPick(null);
    setLoaded(false);
    Promise.all([loadStages(), listNotes(), listDoneSlugs(userId)])
      .then(([vs, notes, passed]) => {
        if (!active) return;
        const chosen = suggestedLesson(vs, countSavedByLesson(notes), passed, currentStage);
        const reason = chosen && (countSavedByLesson(notes)[chosen.slug] ?? 0) > 0 ? "Tiếp tục bài đang học" : "Phù hợp trình độ hiện tại";
        if (chosen) {
          setPick({ slug: chosen.slug, title: chosen.title, cefr: chosen.cefr, reason });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      active = false;
    };
  }, [ready, userId, currentStage, profileReady]);

  if (!loaded || !pick) return null;

  return (
    <Link
      href={`/lesson/${pick.slug}`}
      className="block rounded-3xl border border-primary/20 bg-gradient-to-tr from-primary-soft/40 to-transparent p-5 sm:p-6 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md active:scale-[0.99] group"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-xl">
          📘
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-primary">Gợi ý học hôm nay · {pick.reason}</p>
          <p className="font-display text-base font-black text-foreground truncate">{pick.title}</p>
          <p className="text-[11px] sm:text-xs font-bold text-muted">{pick.cefr}</p>
        </div>
        <span className="shrink-0 text-xs font-black text-primary flex items-center gap-1.5 whitespace-nowrap">
          Học ngay
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 font-sans">→</span>
        </span>
      </div>
    </Link>
  );
}
