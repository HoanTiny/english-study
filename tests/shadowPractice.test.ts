import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { shadowDue, recordShadow } from "@/lib/shadowPractice";
const mocks = vi.hoisted(() => ({ assess: vi.fn(), upsert: vi.fn(), event: vi.fn(), streak: vi.fn() }));
vi.mock("@/lib/pronunciation", () => ({ assessPronunciation: mocks.assess }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => ({ upsert: mocks.upsert }) } }));
vi.mock("@/lib/studySession", () => ({ recordStudyEvent: mocks.event }));
vi.mock("@/lib/profileRepo", () => ({ touchStreak: mocks.streak }));
import { saveShadowAttempt } from "@/lib/shadowingRepo";
const result = { pronunciation: 70, accuracy: 65, fluency: 80, completeness: 90, recognized: "hello" };
beforeEach(() => { vi.clearAllMocks(); mocks.streak.mockResolvedValue(1); vi.stubGlobal("window", { dispatchEvent: vi.fn() }); });
afterEach(() => vi.unstubAllGlobals());
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
it("releases the microphone even when the provider throws", async () => {
  const stop = vi.fn();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  vi.stubGlobal("MediaRecorder", undefined);
  mocks.assess.mockRejectedValue(new Error("provider"));
  await expect(recordShadow("hello", new AbortController().signal)).rejects.toThrow("provider");
  expect(stop).toHaveBeenCalledOnce();
});
it("releases a microphone granted after cancellation without assessing", async () => {
  const stop = vi.fn(); const abort = new AbortController(); abort.abort();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  expect(await recordShadow("hello", abort.signal)).toEqual({ result: null, audio: null });
  expect(stop).toHaveBeenCalledOnce(); expect(mocks.assess).not.toHaveBeenCalled();
});
it("retains recorded audio and releases tracks after scoring", async () => {
  const stop = vi.fn();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  class Recorder {
    state = "inactive"; mimeType = "audio/webm";
    ondataavailable?: (event: { data: Blob }) => void;
    onstop?: () => void;
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["audio"]) }); this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  mocks.assess.mockResolvedValue(result);
  const recording = await recordShadow("hello", new AbortController().signal);
  expect(recording.result).toEqual(result);
  expect(recording.audio?.size).toBe(5);
  expect(stop).toHaveBeenCalledOnce();
});
