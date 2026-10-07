import { localDate } from "./calendar";
import type { PronResult } from "./pronunciation";

export type ShadowAttempt = {
  id: string; client_key: string; pronunciation_score: number;
  created_at: string; speed_rate: number; assessment: PronResult | null;
};

export function shadowDue(attempt: Pick<ShadowAttempt, "pronunciation_score" | "created_at">, now = new Date()) {
  const date = new Date(attempt.created_at);
  return Number.isFinite(date.getTime()) && attempt.pronunciation_score < 80 && localDate(date) < localDate(now);
}

/** Replay stays in memory; closing the page discards the recording. */
export async function recordShadow(text: string, signal: AbortSignal) {
  const { assessPronunciation } = await import("./pronunciation");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let recorder: MediaRecorder | undefined;
  let finished: Promise<Blob | null> | undefined;
  const chunks: BlobPart[] = [];
  const stopTracks = () => stream.getTracks().forEach(track => track.stop());
  signal.addEventListener("abort", stopTracks, { once: true });
  try {
    if (signal.aborted) return { result: null, audio: null };
    if (typeof MediaRecorder !== "undefined") {
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      finished = new Promise(resolve => {
        recorder!.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: recorder?.mimeType }) : null);
        recorder!.onerror = () => resolve(null);
      });
      recorder.start();
    }
    const result = await assessPronunciation(text, { stream, signal });
    if (recorder && recorder.state !== "inactive") recorder.stop();
    const audio = finished ? await finished : null;
    return { result, audio };
  } finally {
    if (recorder?.state === "recording") recorder.stop();
    signal.removeEventListener("abort", stopTracks);
    stopTracks();
  }
}
