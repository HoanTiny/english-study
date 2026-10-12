import { afterEach, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
function setup() {
  const instances: { src: string; preload: string; load: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; removeAttribute: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal("Audio", class { preload = ""; load = vi.fn(); pause = vi.fn(); removeAttribute = vi.fn(); constructor(public src: string) { instances.push(this); } });
  return instances;
}
it("preloads only stored files and reuses the buffered media element for playback", async () => {
  const instances = setup(); const { warmPronunciationAudio, pronunciationAudio } = await import("@/lib/pronunciationPreload");
  warmPronunciationAudio({ found: true, us: { audio: "stored.mp3", cached: true }, uk: { audio: "remote.mp3" } });
  expect(instances).toHaveLength(1); expect(instances[0].preload).toBe("auto"); expect(instances[0].load).toHaveBeenCalledOnce();
  expect(pronunciationAudio("stored.mp3")).toBe(instances[0]);
  expect(instances).toHaveLength(1);
});
it("bounds preloaded files and cancels downloads when leaving the vocabulary page", async () => {
  const instances = setup(); const { warmPronunciationAudio, clearPronunciationPreloads } = await import("@/lib/pronunciationPreload");
  for (let i = 0; i < 5; i++) warmPronunciationAudio({ found: true, us: { audio: `${i}.mp3`, cached: true } });
  expect(instances[0].pause).toHaveBeenCalledOnce();
  clearPronunciationPreloads();
  expect(instances.every(player => player.pause.mock.calls.length === 1)).toBe(true);
});
it("respects mobile data-saving preferences", async () => {
  const instances = setup(); vi.stubGlobal("navigator", { connection: { saveData: true } });
  const { warmPronunciationAudio } = await import("@/lib/pronunciationPreload");
  warmPronunciationAudio({ found: true, us: { audio: "stored.mp3", cached: true } });
  expect(instances).toHaveLength(0);
});
