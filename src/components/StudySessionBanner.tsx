"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { nextStudyStep, stepDone } from "@/lib/studyPlan";
import { saveStudySession, useStudySession } from "@/lib/studySession";

export default function StudySessionBanner() {
  const { userId } = useAuth();
  const { session, storageError } = useStudySession(userId);
  const pathname = usePathname();
  const [error, setError] = useState(false);
  if (!session || pathname === "/today") return null;
  const next = nextStudyStep(session);
  const done = session.steps.filter(stepDone).length;
  function skip() {
    if (!session || !next) return;
    try { saveStudySession({ ...session, steps: session.steps.map(s => s.kind === next.kind ? { ...s, skipped: true } : s) }); }
    catch { setError(true); }
  }
  return <aside className="border-b border-primary/20 bg-primary-soft px-5 py-3 text-sm" aria-label="Tiến độ buổi học">
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/today" className="font-bold text-primary">Buổi {session.minutes} phút · {done}/{session.steps.length} bước</Link>
      {next ? <>
        <span>{next.title}: {next.completedIds.length}/{next.target}</span>
        {pathname !== next.href && <Link href={next.href} className="font-bold text-primary underline">Sang bước tiếp theo →</Link>}
        <button onClick={skip} className="ml-auto text-xs text-muted underline">Bỏ qua bước này</button>
      </> : <Link href="/today" className="font-bold text-primary underline">Xem tổng kết →</Link>}
    </div>
    {(error || storageError) && <p role="alert" className="mt-2 text-rose-600">Chưa lưu được tiến độ buổi học trên thiết bị này.</p>}
  </aside>;
}
