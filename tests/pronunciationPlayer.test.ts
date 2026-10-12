import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPronunciationPlayer, type PronunciationPlayback } from "@/lib/pronunciationPlayer";

class Recording extends EventTarget {
  pause = vi.fn();
  removeAttribute = vi.fn();
  load = vi.fn();
  play = vi.fn((): Promise<void> => new Promise(() => {}));
}

function setup(initialVoices = [{ name: "US", lang: "en-US" }, { name: "UK", lang: "en-GB" }]) {
  const recordings: Recording[] = [];
  const utterances: SpeechSynthesisUtterance[] = [];
  const states: PronunciationPlayback[] = [];
  let voices = initialVoices as SpeechSynthesisVoice[];
  const speech = Object.assign(new EventTarget(), {
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(),
    resume: vi.fn(),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => { utterances.push(utterance); }),
  });
  const player = createPronunciationPlayer(state => states.push(state), {
    speech: speech as unknown as SpeechSynthesis,
    createAudio: () => { const recording = new Recording(); recordings.push(recording); return recording as unknown as HTMLAudioElement; },
    createUtterance: text => ({ text }) as SpeechSynthesisUtterance,
  });
  return { player, recordings, utterances, speech, states, setVoices(next: typeof initialVoices) { voices = next as SpeechSynthesisVoice[]; speech.dispatchEvent(new Event("voiceschanged")); } };
}

function event(utterance: SpeechSynthesisUtterance, name: "start" | "end" | "error") {
  utterance[`on${name}`]?.call(utterance, {} as SpeechSynthesisEvent & SpeechSynthesisErrorEvent);
}

describe("pronunciation playback recovery", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it("recovers a never-resolving Sister recording after 3 seconds using the requested UK voice", async () => {
    const { player, recordings, utterances, states } = setup();
    player.play({ word: "Sister", accent: "uk", audio: "sister-uk.mp3" });
    expect(states.at(-1)).toMatchObject({ status: "loading", source: "recording" });
    await vi.advanceTimersByTimeAsync(2999);
    expect(utterances).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(recordings[0].pause).toHaveBeenCalledOnce();
    expect(recordings[0].removeAttribute).toHaveBeenCalledWith("src");
    expect(recordings[0].load).toHaveBeenCalledOnce();
    expect(utterances[0]).toMatchObject({ text: "Sister", lang: "en-GB", voice: { lang: "en-GB" } });
    event(utterances[0], "start");
    expect(states.at(-1)).toMatchObject({ status: "playing", source: "device" });
    event(utterances[0], "end");
    expect(states.at(-1)?.status).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a successfully playing recording and clears the selected state on ended", async () => {
    const { player, recordings, utterances, states } = setup();
    player.play({ word: "Sister", accent: "us", audio: "sister-us.mp3" });
    recordings[0].dispatchEvent(new Event("playing"));
    await vi.advanceTimersByTimeAsync(4000);
    expect(states.at(-1)).toMatchObject({ status: "playing", source: "recording" });
    expect(utterances).toHaveLength(0);
    recordings[0].dispatchEvent(new Event("ended"));
    expect(states.at(-1)?.status).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["error", "waiting", "stalled"])("handles a recording %s after playback has started", async failure => {
    const { player, recordings, utterances } = setup();
    player.play({ word: "Brother", accent: "us", audio: "brother-us.mp3" });
    recordings[0].dispatchEvent(new Event("playing"));
    recordings[0].dispatchEvent(new Event(failure));
    await vi.advanceTimersByTimeAsync(3000);
    expect(utterances).toHaveLength(1);
    expect(utterances[0].lang).toBe("en-US");
  });

  it("does not fall back when a stalled recording resumes before the deadline", async () => {
    const { player, recordings, utterances } = setup();
    player.play({ word: "Sister", accent: "uk", audio: "sister-uk.mp3" });
    recordings[0].dispatchEvent(new Event("playing"));
    recordings[0].dispatchEvent(new Event("waiting"));
    await vi.advanceTimersByTimeAsync(2000);
    recordings[0].dispatchEvent(new Event("playing"));
    await vi.advanceTimersByTimeAsync(2000);
    expect(utterances).toHaveLength(0);
    player.stop();
  });

  it("handles rejected play() without waiting for the deadline", async () => {
    const fixture = setup();
    const player = createPronunciationPlayer(state => fixture.states.push(state), {
      speech: fixture.speech as unknown as SpeechSynthesis,
      createAudio: () => Object.assign(new Recording(), { play: () => Promise.reject(new Error("unsupported audio")) }) as unknown as HTMLAudioElement,
      createUtterance: text => ({ text }) as SpeechSynthesisUtterance,
    });
    player.play({ word: "Sister", accent: "us", audio: "bad.mp3" });
    await Promise.resolve();
    expect(fixture.utterances).toHaveLength(1);
    expect(fixture.states.at(-1)).toMatchObject({ source: "device", status: "loading" });
    player.stop();
  });

  it("waits for voiceschanged instead of declaring delayed voices unavailable", async () => {
    const { player, setVoices, utterances } = setup([]);
    player.play({ word: "Sister", accent: "uk" });
    await vi.advanceTimersByTimeAsync(500);
    setVoices([{ name: "UK", lang: "en-GB" }]);
    expect(utterances[0].voice?.lang).toBe("en-GB");
    event(utterances[0], "start");
    await vi.advanceTimersByTimeAsync(2500);
    event(utterances[0], "end");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports missing UK voice without reading it with a US voice", async () => {
    const { player, utterances, states } = setup([{ name: "US", lang: "en-US" }]);
    player.play({ word: "Sister", accent: "uk" });
    await vi.advanceTimersByTimeAsync(2000);
    expect(utterances).toHaveLength(0);
    expect(states.at(-1)).toMatchObject({ status: "error", error: "voice-unavailable", accent: "uk" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports speech that never starts, and cancels it so it cannot speak later", async () => {
    const { player, speech, states } = setup();
    player.play({ word: "Sister", accent: "us" });
    const calls = speech.cancel.mock.calls.length;
    await vi.advanceTimersByTimeAsync(4000);
    expect(states.at(-1)).toMatchObject({ status: "error", error: "playback-failed" });
    expect(speech.cancel.mock.calls.length).toBe(calls + 1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears a speech error and allows a fresh user-initiated retry", () => {
    const { player, utterances, states } = setup();
    player.play({ word: "Sister", accent: "us" });
    event(utterances[0], "error");
    expect(states.at(-1)).toMatchObject({ status: "error", error: "playback-failed" });
    player.play({ word: "Sister", accent: "us" });
    event(utterances[1], "start");
    event(utterances[1], "end");
    expect(states.at(-1)?.status).toBe("idle");
  });

  it("cancels old recordings when switching accents and ignores their late events", async () => {
    const { player, recordings, utterances, states } = setup();
    player.play({ word: "Sister", accent: "us", audio: "sister-us.mp3" });
    await vi.advanceTimersByTimeAsync(1000);
    player.play({ word: "Sister", accent: "uk" });
    const count = states.length;
    recordings[0].dispatchEvent(new Event("error"));
    recordings[0].dispatchEvent(new Event("playing"));
    expect(states).toHaveLength(count);
    expect(recordings[0].pause).toHaveBeenCalledOnce();
    expect(utterances).toHaveLength(1);
    expect(utterances[0].lang).toBe("en-GB");
    player.stop();
    await vi.advanceTimersByTimeAsync(35000);
    expect(states).toHaveLength(count);
  });

  it("cleans up pending voices and speech handlers when the card is unmounted", async () => {
    const { player, setVoices, utterances, states } = setup([]);
    player.play({ word: "Sister", accent: "uk" });
    player.stop();
    const count = states.length;
    setVoices([{ name: "UK", lang: "en-GB" }]);
    await vi.advanceTimersByTimeAsync(35000);
    expect(states).toHaveLength(count);
    expect(utterances).toHaveLength(0);
    player.play({ word: "Sister", accent: "uk" });
    player.stop();
    expect(utterances[0].onend).toBeNull();
    expect(utterances[0].onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
