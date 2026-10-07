import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { shadowDue, recordShadow } from "@/lib/shadowPractice";
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), assess: vi.fn(), wave: vi.fn(), upsert: vi.fn(), event: vi.fn(), streak: vi.fn() }));
vi.mock("@/lib/pronunciation", () => ({ preparePronunciation: mocks.prepare, assessRecordedPronunciation: mocks.assess }));
vi.mock("@/lib/recordedAudio", () => ({ recordingToWave: mocks.wave }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => ({ upsert: mocks.upsert }) } }));
vi.mock("@/lib/studySession", () => ({ recordStudyEvent: mocks.event }));
vi.mock("@/lib/profileRepo", () => ({ touchStreak: mocks.streak }));
import { saveShadowAttempt } from "@/lib/shadowingRepo";
const result = { pronunciation: 70, accuracy: 65, fluency: 80, completeness: 90, recognized: "hello" };
beforeEach(() => {
  vi.resetAllMocks(); mocks.streak.mockResolvedValue(1);
  mocks.prepare.mockResolvedValue({ ready: true }); mocks.assess.mockResolvedValue(result);
  mocks.wave.mockResolvedValue(new Blob(["wav"]));
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  vi.stubGlobal("OfflineAudioContext", class {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("prioritizes only weak sentences from previous local days", () => {
  const now = new Date(2026, 9, 4, 0, 5);
  expect(shadowDue({ pronunciation_score: 79, created_at: new Date(2026,9,3,23,59).toISOString() }, now)).toBe(true);
  expect(shadowDue({ pronunciation_score: 79, created_at: now.toISOString() }, now)).toBe(false);
  expect(shadowDue({ pronunciation_score: 80, created_at: new Date(2026,9,3).toISOString() }, now)).toBe(false);
  expect(shadowDue({ pronunciation_score: 20, created_at: "invalid" }, now)).toBe(false);
});
it("does not credit unsaved results", async () => {
  mocks.upsert.mockResolvedValue({ error: new Error("offline") });
  await expect(saveShadowAttempt("u", "s1", result, .75, "stable-key")).rejects.toThrow("offline");
  expect(mocks.event).not.toHaveBeenCalled();
});
it("saves full assessment and stable retry key before credit", async () => {
  mocks.upsert.mockResolvedValue({ error: null });
  await saveShadowAttempt("u", "s1", result, .75, "stable-key");
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ assessment: result, attempt_key: "stable-key", pronunciation_score: 70 }), { onConflict: "user_id,client_key" });
  expect(mocks.event).toHaveBeenCalledOnce();
});
function setupCapture() {
  const track = { readyState: "live", stop: vi.fn(() => { track.readyState = "ended"; }) };
  const stream = { getTracks: () => [track] };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  class Recorder {
    state = "inactive"; mimeType = "audio/webm";
    ondataavailable?: (event: { data: Blob }) => void;
    onstop?: () => void; onstart?: () => void;
    start() { this.state = "recording"; this.onstart?.(); }
    stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["audio"]) }); this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  const abort = new AbortController(); const finish = new AbortController();
  let started!: () => void;
  const recordingStarted = new Promise<void>(resolve => { started = resolve; });
  const options = { finishSignal: finish.signal, onSeconds: vi.fn(),
    onPhase: vi.fn((phase: string) => { if (phase === "recording") started(); }) };
  return { track, stream, getUserMedia, abort, finish, options, recordingStarted };
}

it("prepares before opening the mic, and grades only after Stop with a WAV file", async () => {
  const h = setupCapture();
  let ready!: (value: object) => void;
  mocks.prepare.mockReturnValue(new Promise(resolve => { ready = resolve; }));
  const recordingPromise = recordShadow("hello", h.abort.signal, h.options);
  await vi.waitFor(() => expect(mocks.prepare).toHaveBeenCalledOnce());
  expect(h.getUserMedia).not.toHaveBeenCalled();
  ready({ ready: true }); await h.recordingStarted;
  expect(mocks.assess).not.toHaveBeenCalled();
  expect(h.options.onPhase.mock.calls.map(([phase]) => phase)).toEqual(["preparing", "recording"]);
  h.finish.abort();
  const recording = await recordingPromise;
  expect(recording.result).toEqual(result);
  expect(recording.audio?.size).toBe(5);
  expect(h.track.stop).toHaveBeenCalledOnce();
  expect(h.options.onPhase).toHaveBeenLastCalledWith("grading");
  expect(await mocks.assess.mock.calls[0][1].text()).toBe("wav");
});
it("cancel discards audio and never invokes assessment", async () => {
  const h = setupCapture();
  const promise = recordShadow("hello", h.abort.signal, h.options);
  await h.recordingStarted; h.abort.abort();
  expect(await promise).toEqual({ result: null, audio: null });
  expect(h.track.stop).toHaveBeenCalledOnce();
  expect(mocks.assess).not.toHaveBeenCalled(); expect(mocks.wave).not.toHaveBeenCalled();
});
it("returns promptly on cancel while permission is pending and releases a late grant", async () => {
  const h = setupCapture();
  let grant!: (value: object) => void;
  h.getUserMedia.mockReturnValue(new Promise(resolve => { grant = resolve; }));
  const promise = recordShadow("hello", h.abort.signal, h.options);
  await vi.waitFor(() => expect(h.getUserMedia).toHaveBeenCalledOnce());
  h.abort.abort(); expect(await promise).toEqual({ result: null, audio: null });
  grant(h.stream); await Promise.resolve();
  expect(h.track.stop).toHaveBeenCalledOnce(); expect(mocks.assess).not.toHaveBeenCalled();
});
it("does not open the mic after cancellation during service preparation", async () => {
  const h = setupCapture();
  let ready!: (value: object) => void;
  mocks.prepare.mockReturnValue(new Promise(resolve => { ready = resolve; }));
  const promise = recordShadow("hello", h.abort.signal, h.options);
  await vi.waitFor(() => expect(mocks.prepare).toHaveBeenCalledOnce());
  h.abort.abort(); ready({ ready: true });
  expect(await promise).toEqual({ result: null, audio: null });
  expect(h.getUserMedia).not.toHaveBeenCalled();
});
it("stops automatically at 30 seconds and clears all timers", async () => {
  vi.useFakeTimers(); const h = setupCapture();
  const promise = recordShadow("hello", h.abort.signal, h.options);
  await h.recordingStarted;
  await vi.advanceTimersByTimeAsync(30000);
  expect((await promise).result).toEqual(result);
  expect(h.track.stop).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
});
it("keeps the mic closed when the service is unavailable", async () => {
  const h = setupCapture(); mocks.prepare.mockResolvedValue(null);
  await expect(recordShadow("hello", h.abort.signal, h.options)).rejects.toThrow("dịch vụ");
  expect(h.getUserMedia).not.toHaveBeenCalled();
});
it("reports denied permission without grading", async () => {
  const h = setupCapture(); h.getUserMedia.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
  await expect(recordShadow("hello", h.abort.signal, h.options)).rejects.toThrow("cấp quyền");
  expect(mocks.assess).not.toHaveBeenCalled();
});
it("releases the microphone before assessment even if the provider fails", async () => {
  const h = setupCapture();
  mocks.assess.mockImplementation(() => { expect(h.track.readyState).toBe("ended"); return null; });
  const promise = recordShadow("hello", h.abort.signal, h.options);
  await h.recordingStarted; h.finish.abort();
  const outcome = await promise;
  expect(outcome.result).toBeNull(); expect(outcome.audio?.size).toBe(5);
  expect(h.track.stop).toHaveBeenCalledOnce();
});
it("does not grade invalid or too-short audio", async () => {
  const h = setupCapture(); mocks.wave.mockRejectedValue(new Error("Bản thu quá ngắn."));
  const promise = recordShadow("hello", h.abort.signal, h.options);
  const assertion = expect(promise).rejects.toThrow("Bản thu quá ngắn");
  await h.recordingStarted; h.finish.abort(); await assertion;
  expect(h.track.stop).toHaveBeenCalledOnce(); expect(mocks.assess).not.toHaveBeenCalled();
});
