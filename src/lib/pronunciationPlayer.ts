import { accentLanguage, matchingVoice, type PronunciationAccent } from "./accentPlayback";
import { pronunciationAudio } from "./pronunciationPreload";

export type PronunciationPlayback = {
  accent: PronunciationAccent;
  source: "recording" | "device";
  status: "loading" | "playing" | "idle" | "error";
  error?: "voice-unavailable" | "playback-failed";
};

type Environment = {
  createAudio: (url: string) => HTMLAudioElement;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
  speech?: SpeechSynthesis;
};

// A pending play() promise and an interrupted recording both need a deadline.
const RECORDING_WAIT_MS = 3000;
const VOICE_WAIT_MS = 2000;
const SPEECH_START_MS = 4000;
const MAX_PLAYBACK_MS = 30000;

export function createPronunciationPlayer(
  onChange: (state: PronunciationPlayback) => void,
  environment: Environment = {
    createAudio: pronunciationAudio,
    createUtterance: text => new SpeechSynthesisUtterance(text),
    speech: window.speechSynthesis,
  },
) {
  let cancelCurrent = () => {};

  function play({ word, accent, audio }: { word: string; accent: PronunciationAccent; audio?: string }) {
    cancelCurrent();
    let stage: "recording" | "voices" | "speech" | "done" = audio ? "recording" : "voices";
    let source: PronunciationPlayback["source"] = audio ? "recording" : "device";
    const cleanups = new Set<() => void>();
    const cleanup = () => { for (const dispose of cleanups) dispose(); cleanups.clear(); };
    const report = (status: PronunciationPlayback["status"], error?: PronunciationPlayback["error"]) => onChange({ accent, source, status, ...(error ? { error } : {}) });
    function finish(error?: PronunciationPlayback["error"]) {
      if (stage === "done") return;
      stage = "done";
      cleanup();
      report(error ? "error" : "idle", error);
    }
    function delay(callback: () => void, ms: number) {
      const timer = setTimeout(() => { cleanups.delete(dispose); callback(); }, ms);
      const dispose = () => { clearTimeout(timer); cleanups.delete(dispose); };
      cleanups.add(dispose);
      return dispose;
    }
    cancelCurrent = () => { stage = "done"; cleanup(); };

    function speak(voice: SpeechSynthesisVoice) {
      if (stage !== "voices") return;
      stage = "speech";
      cleanup();
      const synth = environment.speech!;
      try {
        const utterance = environment.createUtterance(word);
        utterance.lang = accentLanguage(accent);
        utterance.voice = voice;
        utterance.rate = 0.85;
        cleanups.add(() => {
          utterance.onstart = utterance.onend = utterance.onerror = null;
          synth.cancel();
        });
        const cancelStartTimeout = delay(() => finish("playback-failed"), SPEECH_START_MS);
        delay(() => finish("playback-failed"), MAX_PLAYBACK_MS);
        utterance.onstart = () => {
          if (stage !== "speech") return;
          cancelStartTimeout();
          report("playing");
        };
        utterance.onend = () => { if (stage === "speech") finish(); };
        utterance.onerror = () => { if (stage === "speech") finish("playback-failed"); };
        synth.cancel();
        synth.resume();
        synth.speak(utterance);
      } catch { finish("playback-failed"); }
    }

    function startDevicePlayback() {
      if (stage === "done") return;
      stage = "voices";
      cleanup();
      source = "device";
      report("loading");
      const synth = environment.speech;
      if (!synth) { finish("voice-unavailable"); return; }
      function findVoice() {
        if (stage !== "voices") return;
        try {
          const voice = matchingVoice(synth!.getVoices(), accent);
          if (voice) speak(voice);
        } catch { finish("playback-failed"); }
      }
      synth.addEventListener("voiceschanged", findVoice);
      cleanups.add(() => synth.removeEventListener("voiceschanged", findVoice));
      // Browser voices often become available only after the first getVoices().
      delay(() => finish("voice-unavailable"), VOICE_WAIT_MS);
      findVoice();
    }

    if (!audio) { startDevicePlayback(); return; }
    report("loading");
    try {
      const player = environment.createAudio(audio);
      let cancelWait: (() => void) | undefined;
      const waitForRecording = () => {
        if (stage !== "recording" || cancelWait) return;
        cancelWait = delay(() => { if (stage === "recording") startDevicePlayback(); }, RECORDING_WAIT_MS);
      };
      const playing = () => {
        if (stage !== "recording") return;
        cancelWait?.(); cancelWait = undefined;
        report("playing");
      };
      const failed = () => { if (stage === "recording") startDevicePlayback(); };
      const ended = () => { if (stage === "recording") finish(); };
      player.addEventListener("playing", playing);
      player.addEventListener("ended", ended);
      player.addEventListener("error", failed);
      player.addEventListener("waiting", waitForRecording);
      player.addEventListener("stalled", waitForRecording);
      cleanups.add(() => {
        player.removeEventListener("playing", playing);
        player.removeEventListener("ended", ended);
        player.removeEventListener("error", failed);
        player.removeEventListener("waiting", waitForRecording);
        player.removeEventListener("stalled", waitForRecording);
        player.pause();
        player.removeAttribute("src");
        player.load(); // Abort the download so a late response cannot play over the fallback.
      });
      waitForRecording();
      delay(failed, MAX_PLAYBACK_MS);
      void player.play().then(playing, failed);
    } catch { startDevicePlayback(); }
  }

  return { play, stop: () => cancelCurrent() };
}
