"use client";
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { localDate } from "./calendar";
import { applyStudyEvent, type StudyEvent, type StudySession } from "./studyPlan";
import { StudySyncClient, studyStorageKey, type StudySnapshot } from "./studySync";
import { studyTransport } from "./studySessionRepo";

const clients = new Map<string, StudySyncClient>();
const EMPTY: StudySnapshot = { userId: null, day: "", session: null, syncStatus: "loading", storageError: false, remoteChanged: false };
const StudyContext = createContext(EMPTY);
const noSubscribe = () => () => {};
const emptySnapshot = () => EMPTY;

function clientFor(userId: string, day = localDate()) {
  const key = `${userId}:${day}`;
  let client = clients.get(key);
  if (!client) {
    // Accessors defer storage access so blocked browser storage is handled by the coordinator.
    client = new StudySyncClient(userId, day, {
      getItem: name => localStorage.getItem(name), setItem: (name, value) => localStorage.setItem(name, value),
    }, studyTransport(userId, day), () => navigator.onLine);
    clients.set(key, client);
  }
  return client;
}

export function StudySessionProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [day, setDay] = useState(localDate);
  const client = useMemo(() => userId ? clientFor(userId, day) : null, [userId, day]);
  const snapshot = useSyncExternalStore(client?.subscribe ?? noSubscribe, client?.getSnapshot ?? emptySnapshot, emptySnapshot);
  useEffect(() => {
    if (!client) return;
    client.start();
    const refresh = () => {
      if (localDate() !== day) { client.stop(); setDay(localDate()); return; }
      client.refreshLocal(); void client.sync();
    };
    const changed = (event: StorageEvent) => { if (event.key === studyStorageKey(client.userId)) refresh(); };
    window.addEventListener("storage", changed);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      client.stop(); clearInterval(timer);
      window.removeEventListener("storage", changed); window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh); window.removeEventListener("focus", refresh);
    };
  }, [client, day]);
  return <StudyContext.Provider value={snapshot}>{children}</StudyContext.Provider>;
}

export function readStudySession(userId: string): StudySession | null { return clientFor(userId).getSnapshot().session; }
export function saveStudySession(session: StudySession) { clientFor(session.userId).save(session); }
export function clearStudySession(userId: string) { clientFor(userId).save(null); }
export function updateStudySession(userId: string, update: (session: StudySession) => StudySession) { clientFor(userId).update(update); }
export function retryStudySync(userId: string) { return clientFor(userId).sync(); }
/** Only called after the underlying activity was saved successfully. */
export function recordStudyEvent(userId: string, event: StudyEvent) {
  if (typeof window !== "undefined") clientFor(userId).update(session => applyStudyEvent(session, event));
}
export function useStudySession(userId: string | null) {
  const snapshot = useContext(StudyContext);
  return snapshot.userId === userId && snapshot.day === localDate() ? snapshot : EMPTY;
}
