"use client";
import { useEffect, useState } from "react";
import { localDate } from "./calendar";
import { applyStudyEvent, parseStudySession, type StudyEvent, type StudySession } from "./studyPlan";

const CHANGED = "study-session-changed";
function key(userId: string) { return `speakup.study-session.${userId}`; }
export function readStudySession(userId: string): StudySession | null {
  try { return parseStudySession(localStorage.getItem(key(userId)), userId, localDate()); }
  catch { return null; }
}
export function saveStudySession(session: StudySession) {
  localStorage.setItem(key(session.userId), JSON.stringify(session));
  window.dispatchEvent(new Event(CHANGED));
}
export function clearStudySession(userId: string) {
  localStorage.removeItem(key(userId));
  window.dispatchEvent(new Event(CHANGED));
}
/** Called only after the underlying activity was saved successfully. */
export function recordStudyEvent(userId: string, event: StudyEvent) {
  if (typeof window === "undefined") return;
  const session = readStudySession(userId);
  if (session) {
    try { saveStudySession(applyStudyEvent(session, event)); }
    catch { window.dispatchEvent(new Event("study-session-storage-error")); }
  }
}
export function useStudySession(userId: string | null) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const refresh = () => setSession(userId ? readStudySession(userId) : null);
    const failed = () => setStorageError(true);
    refresh();
    window.addEventListener(CHANGED, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("study-session-storage-error", failed);
    const timer = setInterval(refresh, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener(CHANGED, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("study-session-storage-error", failed);
    };
  }, [userId]);
  return { session: session?.userId === userId && session.day === localDate() ? session : null, storageError };
}
