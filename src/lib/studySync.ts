import { parseStudySession, type StudySession } from "./studyPlan";

export type CloudStudyState = { revision: number; session: StudySession | null };
export type StoredStudyState = CloudStudyState & {
  version: 2; userId: string; day: string; dirty: boolean; changeId: string;
  baseId: string | null; replacedIds: string[];
};
export type SyncStatus = "loading" | "syncing" | "synced" | "offline" | "error";
export type StudySnapshot = { userId: string | null; day: string; session: StudySession | null;
  syncStatus: SyncStatus; storageError: boolean; remoteChanged: boolean };
export type StudyTransport = {
  read: (signal: AbortSignal) => Promise<CloudStudyState>;
  write: (state: CloudStudyState, signal: AbortSignal) => Promise<CloudStudyState & { applied: boolean }>;
};
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export const studyStorageKey = (userId: string) => `speakup.study-session.${userId}`;
export const sessionId = (session: StudySession | null) => session ? session.id ?? session.startedAt : null;
const equivalent = (a: StudySession | null, b: StudySession | null) => JSON.stringify(a) === JSON.stringify(b);

export function parseStoredStudy(raw: string | null, userId: string, day: string): StoredStudyState {
  const empty: StoredStudyState = { version: 2, userId, day, revision: 0, session: null,
    dirty: false, baseId: null, replacedIds: [], changeId: "initial" };
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version === 2 && value.userId === userId && value.day === day
      && Number.isSafeInteger(value.revision) && value.revision >= 0 && typeof value.dirty === "boolean"
      && typeof value.changeId === "string" && (value.baseId === null || typeof value.baseId === "string")
      && Array.isArray(value.replacedIds) && value.replacedIds.length <= 20 && value.replacedIds.every((id: unknown) => typeof id === "string")) {
      const session = value.session === null ? null : parseStudySession(JSON.stringify(value.session), userId, day);
      if (value.session !== null && !session) return empty;
      return { ...empty, revision: value.revision, session, dirty: value.dirty,
        changeId: value.changeId, baseId: value.baseId, replacedIds: value.replacedIds };
    }
    const legacy = parseStudySession(raw, userId, day);
    return legacy ? { ...empty, session: legacy, dirty: true, changeId: "legacy" } : empty;
  } catch { return empty; }
}

/** Same-session progress is a union; completing a goal wins over a concurrent skip. */
export function mergeStudyProgress(local: StudySession, remote: StudySession): StudySession {
  if (sessionId(local) !== sessionId(remote)) return remote;
  return { ...remote, steps: remote.steps.map(step => {
    const own = local.steps.find(s => s.kind === step.kind && s.slug === step.slug);
    if (!own) return step;
    const completedIds = [...new Set([...step.completedIds, ...own.completedIds])].sort().slice(0, 100);
    return { ...step, completedIds, skipped: completedIds.length >= step.target ? false : step.skipped || own.skipped };
  }) };
}

/** A different remote session/reset wins over stale offline progress; it must never be resurrected. */
export function rebaseStudy(local: StoredStudyState, remote: CloudStudyState): { state: StoredStudyState; conflict: boolean } {
  const clean = { ...local, ...remote, dirty: false, baseId: sessionId(remote.session), replacedIds: [] };
  if (!local.dirty) return { state: clean, conflict: false };
  if (local.session && remote.session && sessionId(local.session) === sessionId(remote.session)) {
    const session = mergeStudyProgress(local.session, remote.session);
    return { state: { ...clean, session, dirty: !equivalent(session, remote.session) }, conflict: false };
  }
  const remoteId = sessionId(remote.session);
  if (remote.revision === local.revision || (remoteId !== null && (remoteId === local.baseId || local.replacedIds.includes(remoteId)))) {
    return { state: { ...local, revision: remote.revision, baseId: remoteId, dirty: !equivalent(local.session, remote.session) }, conflict: false };
  }
  return { state: clean, conflict: !equivalent(local.session, remote.session) };
}

/** One coordinator per account/day. The local outbox survives reloads and failed requests. */
export class StudySyncClient {
  private state: StoredStudyState;
  private snapshot: StudySnapshot;
  private listeners = new Set<() => void>();
  private running: Promise<void> | null = null;
  private controller: AbortController | null = null;
  private active = false;
  private generation = 0;
  constructor(readonly userId: string, readonly day: string, private storage: Storage,
    private transport: StudyTransport, private online: () => boolean = () => true) {
    let raw = null; let storageError = false;
    try { raw = storage.getItem(studyStorageKey(userId)); } catch { storageError = true; }
    this.state = parseStoredStudy(raw, userId, day);
    this.snapshot = { userId, day, session: this.state.session, syncStatus: "loading", storageError, remoteChanged: false };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(patch: Partial<StudySnapshot> = {}) {
    this.snapshot = { ...this.snapshot, session: this.state.session, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private persist() {
    try { this.storage.setItem(studyStorageKey(this.userId), JSON.stringify(this.state)); this.emit({ storageError: false }); }
    catch { this.emit({ storageError: true }); }
  }
  start() { this.active = true; void this.sync(); }
  stop() { this.active = false; this.generation++; this.controller?.abort(); this.running = null; }
  /** Pull other tabs' local edits without overwriting this tab's unsent progress. */
  refreshLocal() {
    if (this.snapshot.storageError && this.state.dirty) return;
    try {
      const other = parseStoredStudy(this.storage.getItem(studyStorageKey(this.userId)), this.userId, this.day);
      if (other.changeId === this.state.changeId && other.revision === this.state.revision) return;
      if (other.revision < this.state.revision) return;
      if (this.state.dirty && this.state.session && other.session && sessionId(this.state.session) === sessionId(other.session)) {
        this.state = { ...other, session: mergeStudyProgress(this.state.session, other.session), dirty: true, changeId: crypto.randomUUID() };
      } else this.state = other;
      this.emit();
    } catch { this.emit({ storageError: true }); }
  }
  update(update: (session: StudySession) => StudySession) {
    this.refreshLocal();
    if (!this.state.session) return;
    const session = update(this.state.session);
    if (!equivalent(session, this.state.session)) this.save(session);
  }
  save(session: StudySession | null) {
    this.refreshLocal();
    const parsed = session && parseStudySession(JSON.stringify(session), this.userId, this.day);
    if (session && !parsed) throw new Error("Invalid study session");
    const oldId = sessionId(this.state.session);
    const same = parsed && this.state.session && oldId === sessionId(parsed);
    this.state = { ...this.state, session: same ? mergeStudyProgress(parsed, this.state.session!) : parsed,
      dirty: true, changeId: crypto.randomUUID(),
      replacedIds: oldId && oldId !== sessionId(parsed) ? [...new Set([...this.state.replacedIds, oldId])].slice(-20) : this.state.replacedIds };
    this.persist(); this.emit({ remoteChanged: false }); void this.sync();
  }
  sync = (): Promise<void> => {
    if (!this.active || this.running) return this.running ?? Promise.resolve();
    if (!this.online()) { this.emit({ syncStatus: "offline" }); return Promise.resolve(); }
    const generation = this.generation;
    const controller = new AbortController(); this.controller = controller;
    const task = this.flush(controller.signal, generation).finally(() => { if (this.running === task) this.running = null; });
    this.running = task;
    return task;
  };
  private async flush(signal: AbortSignal, generation: number) {
    const current = () => this.active && !signal.aborted && generation === this.generation;
    this.emit({ syncStatus: this.state.dirty ? "syncing" : this.snapshot.syncStatus === "loading" ? "loading" : "syncing" });
    try {
      this.refreshLocal();
      if (!this.state.dirty) {
        const remote = await this.transport.read(signal);
        if (!current()) return;
        this.refreshLocal();
        // Another tab may have saved a newer revision while this read was in flight.
        if (remote.revision >= this.state.revision) {
          const rebased = rebaseStudy(this.state, remote);
          this.state = rebased.state; this.persist();
          if (rebased.conflict) this.emit({ remoteChanged: true });
        }
      }
      for (let attempt = 0; this.state.dirty && attempt < 5; attempt++) {
        const sent = this.state;
        const remote = await this.transport.write({ revision: sent.revision, session: sent.session }, signal);
        if (!current()) return;
        this.refreshLocal();
        if (this.state.revision > remote.revision) continue;
        if (remote.applied && this.state.changeId === sent.changeId) {
          this.state = { ...this.state, revision: remote.revision, session: remote.session, dirty: false, baseId: sessionId(remote.session), replacedIds: [] };
        } else if (remote.applied && this.state.dirty) {
          // Local edits made while our write was in flight come after that write,
          // including creating a new plan while our reset acknowledgement was pending.
          const session = this.state.session && remote.session && sessionId(this.state.session) === sessionId(remote.session)
            ? mergeStudyProgress(this.state.session, remote.session) : this.state.session;
          this.state = { ...this.state, revision: remote.revision, session, baseId: sessionId(remote.session), dirty: !equivalent(session, remote.session) };
        } else {
          const rebased = rebaseStudy(this.state, remote);
          this.state = rebased.state;
          if (rebased.conflict) this.emit({ remoteChanged: true });
        }
        this.persist();
      }
      if (current()) this.emit({ syncStatus: this.state.dirty ? "error" : "synced" });
    } catch { if (current()) this.emit({ syncStatus: this.online() ? "error" : "offline" }); }
  }
}
