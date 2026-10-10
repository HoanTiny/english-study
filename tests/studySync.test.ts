import { expect, it, vi } from "vitest";
import { applyStudyEvent, buildStudyPlan, type StudySession } from "@/lib/studyPlan";
import { StudySyncClient, parseStoredStudy, studyStorageKey, type CloudStudyState, type StudyTransport } from "@/lib/studySync";

const user = "learner-a", day = "2026-10-07";
function session(): StudySession {
  return { version: 1, id: crypto.randomUUID(), userId: user, day, minutes: 10, startedAt: "2026-10-07T10:00:00Z",
    steps: buildStudyPlan({ minutes: 10, dueReviews: 3, dueErrors: 0, lesson: null }) };
}
function storage() {
  const map = new Map<string, string>();
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
}
function cloud() {
  let state: CloudStudyState = { revision: 0, session: null };
  const transport: StudyTransport = {
    read: vi.fn(async () => structuredClone(state)),
    write: vi.fn(async next => {
      if (next.revision !== state.revision) return { ...structuredClone(state), applied: false };
      state = structuredClone({ revision: state.revision + 1, session: next.session });
      return { ...structuredClone(state), applied: true };
    }),
  };
  return { transport, state: () => state };
}
async function start(client: StudySyncClient) { client.start(); await client.sync(); }
const review = (id: string) => (s: StudySession) => applyStudyEvent(s, { kind: "review", id });

it("resumes a session and completed work on a different device", async () => {
  const remote = cloud(); const a = new StudySyncClient(user, day, storage(), remote.transport);
  await start(a); const plan = session(); a.save(plan); await a.sync(); a.update(review("one")); await a.sync();
  const b = new StudySyncClient(user, day, storage(), remote.transport); await start(b);
  expect(b.getSnapshot().session?.id).toBe(plan.id);
  expect(b.getSnapshot().session?.steps[0].completedIds).toEqual(["one"]);
  expect(b.getSnapshot().syncStatus).toBe("synced");
});
it("merges concurrent progress instead of last-write-wins data loss", async () => {
  const remote = cloud(); const a = new StudySyncClient(user, day, storage(), remote.transport);
  await start(a); a.save(session()); await a.sync();
  const b = new StudySyncClient(user, day, storage(), remote.transport); await start(b);
  a.update(review("one")); b.update(review("two"));
  await Promise.all([a.sync(), b.sync()]); await a.sync();
  expect(remote.state().session?.steps[0].completedIds).toEqual(["one", "two"]);
  expect(a.getSnapshot().session?.steps[0].completedIds).toEqual(["one", "two"]);
});
it("persists an offline outbox across reload and synchronizes on reconnect", async () => {
  const remote = cloud(), local = storage(); let online = false;
  const a = new StudySyncClient(user, day, local, remote.transport, () => online);
  await start(a); a.save(session()); a.update(review("one")); a.stop();
  expect(remote.transport.write).not.toHaveBeenCalled();
  const reloaded = new StudySyncClient(user, day, local, remote.transport, () => online);
  await start(reloaded); expect(reloaded.getSnapshot().syncStatus).toBe("offline");
  online = true; await reloaded.sync();
  expect(remote.state().session?.steps[0].completedIds).toEqual(["one"]);
  expect(reloaded.getSnapshot().syncStatus).toBe("synced");
});
it("retains failed writes and recovers even if the acknowledgement was lost", async () => {
  const remote = cloud(); const write = remote.transport.write;
  remote.transport.write = vi.fn(async (state, signal) => { const result = await write(state, signal); if (result.applied) throw new Error("lost reply"); return result; });
  const a = new StudySyncClient(user, day, storage(), remote.transport); await start(a);
  a.save(session()); await a.sync(); expect(a.getSnapshot().syncStatus).toBe("error");
  await a.sync(); expect(a.getSnapshot().syncStatus).toBe("synced"); expect(remote.state().revision).toBe(1);
});
it("does not resurrect an explicitly reset session from an offline device", async () => {
  const remote = cloud(); const a = new StudySyncClient(user, day, storage(), remote.transport); await start(a);
  a.save(session()); await a.sync(); let online = true;
  const b = new StudySyncClient(user, day, storage(), remote.transport, () => online); await start(b);
  online = false; b.update(review("offline")); a.save(null); await a.sync();
  online = true; await b.sync();
  expect(remote.state().session).toBeNull(); expect(b.getSnapshot().session).toBeNull();
  expect(b.getSnapshot().remoteChanged).toBe(true);
});
it("chooses the existing cloud plan when two offline devices independently start", async () => {
  const remote = cloud(); let online = false;
  const a = new StudySyncClient(user, day, storage(), remote.transport, () => online);
  const b = new StudySyncClient(user, day, storage(), remote.transport, () => online);
  await start(a); await start(b); const first = session(); a.save(first); b.save(session());
  online = true; await a.sync(); await b.sync();
  expect(b.getSnapshot().session?.id).toBe(first.id); expect(b.getSnapshot().remoteChanged).toBe(true);
});
it("keeps edits performed while a write is in flight, including reset then restart", async () => {
  const remote = cloud(); const write = remote.transport.write; let release!: () => void;
  const a = new StudySyncClient(user, day, storage(), remote.transport); await start(a); a.save(session()); await a.sync();
  let held = true;
  remote.transport.write = async (state, signal) => {
    const result = await write(state, signal);
    if (held) { held = false; await new Promise<void>(resolve => { release = resolve; }); }
    return result;
  };
  a.save(null); await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  const replacement = session(); a.save(replacement); a.update(review("new")); release(); await a.sync();
  expect(remote.state().session?.id).toBe(replacement.id);
  expect(remote.state().session?.steps[0].completedIds).toEqual(["new"]);
});
it("discards an old account's in-flight response after the coordinator stops", async () => {
  const remote = cloud(); let resolve!: (state: CloudStudyState) => void;
  remote.transport.read = () => new Promise(done => { resolve = done; });
  const a = new StudySyncClient(user, day, storage(), remote.transport); a.start(); const pending = a.sync(); a.stop();
  resolve({ revision: 1, session: session() }); await pending;
  expect(a.getSnapshot().session).toBeNull();
});
it("migrates valid legacy storage but expires other accounts and days", () => {
  const plan = session(); delete plan.id;
  const migrated = parseStoredStudy(JSON.stringify(plan), user, day);
  expect(migrated.dirty).toBe(true); expect(migrated.session?.startedAt).toBe(plan.startedAt);
  expect(parseStoredStudy(JSON.stringify(migrated), "other", day).session).toBeNull();
  expect(parseStoredStudy(JSON.stringify(migrated), user, "2026-10-08").session).toBeNull();
});
it("keeps current in-memory progress if browser storage fills up", async () => {
  const remote = cloud(); const local = storage();
  const a = new StudySyncClient(user, day, local, remote.transport, () => false); await start(a);
  a.save(session()); local.setItem = () => { throw new Error("quota"); };
  a.update(review("one")); a.update(review("two"));
  expect(a.getSnapshot().session?.steps[0].completedIds).toEqual(["one", "two"]);
  expect(a.getSnapshot().storageError).toBe(true);
});
it("refreshes progress written in a different tab", async () => {
  const remote = cloud(), local = storage();
  const a = new StudySyncClient(user, day, local, remote.transport); await start(a); a.save(session()); await a.sync();
  const b = new StudySyncClient(user, day, local, remote.transport); await start(b);
  a.update(review("one")); await a.sync(); b.refreshLocal();
  expect(b.getSnapshot().session?.steps[0].completedIds).toEqual(["one"]);
  expect(JSON.parse(local.getItem(studyStorageKey(user))!).version).toBe(2);
});
it("ignores a late read when another tab already saved a newer revision", async () => {
  const remote = cloud(), local = storage();
  const a = new StudySyncClient(user, day, local, remote.transport); await start(a); a.save(session()); await a.sync();
  let release!: (state: CloudStudyState) => void;
  const stale = structuredClone(remote.state());
  const b = new StudySyncClient(user, day, local, { ...remote.transport, read: () => new Promise(resolve => { release = resolve; }) });
  b.start(); const pending = b.sync();
  a.update(review("newer")); await a.sync(); release(stale); await pending;
  expect(b.getSnapshot().session?.steps[0].completedIds).toEqual(["newer"]);
  expect(JSON.parse(local.getItem(studyStorageKey(user))!).revision).toBe(remote.state().revision);
});
