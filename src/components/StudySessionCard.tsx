"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { localDate } from "@/lib/calendar";
import { loadStages, suggestedLesson } from "@/lib/lessonsView";
import { listNotes } from "@/lib/notesRepo";
import { countSavedByLesson } from "@/lib/lessonProgress";
import { listDoneSlugs } from "@/lib/lessonDone";
import { listErrors } from "@/lib/errorLogRepo";
import { errorDue } from "@/lib/errorPractice";
import { listShadowLatest } from "@/lib/shadowingRepo";
import { shadowDue } from "@/lib/shadowPractice";
import { buildStudyPlan, nextStudyStep, stepDone, type StudyMinutes } from "@/lib/studyPlan";
import { saveStudySession, clearStudySession, useStudySession } from "@/lib/studySession";
import StudySyncStatus from "./StudySyncStatus";

type Options = { lesson: { slug: string; title: string; remaining: number } | null; dueErrors: number; dueShadow: number };
export default function StudySessionCard({ dueReviews }: { dueReviews: number }) {
  const { userId, currentStage, profileReady } = useAuth();
  const router = useRouter();
  const day = localDate();
  const { session, syncStatus } = useStudySession(userId);
  const [minutes, setMinutes] = useState<StudyMinutes>(20);
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId || !profileReady) return;
    let active = true;
    setOptions(null);
    setError(null);
    Promise.all([loadStages(), listNotes(), listDoneSlugs(userId), listErrors(), listShadowLatest()]).then(([stages, notes, passed, errors, shadow]) => {
      if (!active) return;
      const saved = countSavedByLesson(notes);
      const lesson = suggestedLesson(stages, saved, passed, currentStage);
      setOptions({ lesson: lesson ? { slug: lesson.slug, title: lesson.title, remaining: Math.max(0, lesson.phraseCount - (saved[lesson.slug] ?? 0)) } : null,
        dueErrors: errors.filter(r => errorDue(r)).length, dueShadow: shadow.filter(r => shadowDue(r)).length });
    }).catch(() => { if (active) setError("Chưa tạo được kế hoạch học. Vui lòng thử lại."); });
    return () => { active = false; };
  }, [userId, currentStage, profileReady, retry, day]);

  const plan = options ? buildStudyPlan({ minutes, dueReviews, ...options }) : [];
  const next = session ? nextStudyStep(session) : undefined;
  function start() {
    if (!userId || !options || !plan.length) return;
    try {
      saveStudySession({ version: 1, id: crypto.randomUUID(), userId, day: localDate(), minutes, startedAt: new Date().toISOString(), steps: plan });
      router.push(plan[0].href);
    } catch { setError("Trình duyệt chưa cho phép lưu buổi học. Hãy bật lưu trữ và thử lại."); }
  }
  function reset() {
    if (!userId) return;
    try { clearStudySession(userId); setRetry(n => n + 1); }
    catch { setError("Chưa cập nhật được buổi học. Vui lòng thử lại."); }
  }
  return (
    <section className="glass-card p-5 sm:p-7" aria-label="Buổi học của bạn">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Buổi học của bạn</p>
      <h2 className="mt-2 font-display text-xl font-bold">{session ? (next ? "Tiếp tục từng bước" : "Tổng kết buổi học") : "Hôm nay bạn có bao nhiêu phút?"}</h2>
      <p className="mt-2 text-sm text-muted">Theo trình độ {(["A1", "A2", "B1", "B2"])[currentStage - 1] ?? "A1"} và nội dung cần ôn. Thời gian là ước tính, không cần chạy đua.</p>
      {error && <div role="alert" className="mt-3 text-sm text-rose-600">{error} <button className="underline" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>}
      <StudySyncStatus />
      {session ? <>
        <p className="mt-4 text-sm font-semibold">{session.steps.filter(stepDone).length}/{session.steps.length} bước đạt mục tiêu · {session.minutes} phút dự kiến</p>
        <ol className="my-4 space-y-2">
          {session.steps.map(step => <li key={step.kind} className="flex justify-between gap-3 rounded-xl border border-border p-3 text-sm">
            <span>{step.title}</span><span className="shrink-0">{step.skipped ? "Đã bỏ qua" : `${step.completedIds.length}/${step.target} ${stepDone(step) ? "✓" : ""}`}</span>
          </li>)}
        </ol>
        {next ? <Link href={next.href} className="liquid-glass-btn inline-block px-5 py-3 text-sm">Tiếp tục: {next.title} →</Link>
          : <p className="text-sm text-muted">{session.steps.some(s => s.skipped) ? "Buổi học đã kết thúc. Những bước bỏ qua không tính là hoàn thành." : "Bạn đã hoàn thành các mục tiêu trong buổi học này."}</p>}
        <button className="mt-4 block text-sm text-muted underline" onClick={reset}>{next ? "Dừng buổi này và chọn lại" : "Tạo buổi học mới"}</button>
      </> : <>
        <div className="my-4 flex gap-2" role="group" aria-label="Thời lượng buổi học">
          {([10,20,30] as const).map(m => <button key={m} aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={`rounded-full border px-5 py-2 text-sm font-bold ${minutes === m ? "border-primary bg-primary text-primary-fg" : "border-border text-foreground"}`}>{m} phút</button>)}
        </div>
        {!options && !error && <p role="status" className="text-sm text-muted">Đang chọn bài phù hợp…</p>}
        <ol className="mb-5 space-y-2">
          {plan.map((step, i) => <li key={step.kind} className="flex justify-between gap-3 text-sm"><span>{i + 1}. {step.title} <span className="text-muted">({step.target} {step.kind === "quiz" ? "bài đạt" : step.kind === "review" ? "thẻ" : step.kind === "errors" ? "lỗi" : "cụm/câu"})</span></span><span className="shrink-0 text-muted">~{step.minutes} phút</span></li>)}
        </ol>
        <button disabled={!options || !!error || syncStatus === "loading"} onClick={start} className="liquid-glass-btn px-6 py-3 text-sm disabled:opacity-50">Bắt đầu buổi học →</button>
        <p className="mt-3 text-xs text-muted">Buổi học trong ngày đồng bộ theo tài khoản khi có mạng. Thiết bị giữ bản dự phòng để bạn tiếp tục khi mất kết nối.</p>
      </>}
    </section>
  );
}
