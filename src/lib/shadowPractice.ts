import { localDate } from "./calendar";
import type { PronResult } from "./pronunciation";
import { recordingToWave } from "./recordedAudio";

export type ShadowAttempt = {
  id: string; client_key: string; pronunciation_score: number;
  created_at: string; speed_rate: number; assessment: PronResult | null;
};

export function shadowDue(attempt: Pick<ShadowAttempt, "pronunciation_score" | "created_at">, now = new Date()) {
  const date = new Date(attempt.created_at);
  return Number.isFinite(date.getTime()) && attempt.pronunciation_score < 80 && localDate(date) < localDate(now);
}

export type RecordingPhase = "preparing" | "recording" | "grading";
export type RecordingOptions = {
  finishSignal: AbortSignal; // Finish and grade; cancellation uses the separate signal below.
  onPhase: (phase: RecordingPhase) => void;
  onSeconds: (seconds: number) => void;
};

function openMicrophone(signal: AbortSignal): Promise<MediaStream | null> {
  return new Promise((resolve, reject) => {
    const abort = () => resolve(null);
    signal.addEventListener("abort", abort, { once: true });
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) { stream.getTracks().forEach(track => track.stop()); resolve(null); }
      else resolve(stream);
    }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}

function capture(stream: MediaStream, signal: AbortSignal, options: RecordingOptions): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    let timer: ReturnType<typeof setInterval> | undefined;
    let limit: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const cleanup = () => {
      clearInterval(timer); clearTimeout(limit);
      signal.removeEventListener("abort", cancel);
      options.finishSignal.removeEventListener("abort", finish);
      recorder.ondataavailable = recorder.onstop = recorder.onerror = recorder.onstart = null;
      if (recorder.state !== "inactive") recorder.stop();
    };
    const done = (blob: Blob | null, error?: Error) => {
      if (settled) return;
      settled = true; cleanup();
      if (error) reject(error); else resolve(blob);
    };
    const cancel = () => done(null);
    const finish = () => { if (recorder.state !== "inactive") recorder.stop(); };
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => done(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null);
    recorder.onerror = () => done(null, new Error("Microphone bị ngắt. Hãy kiểm tra thiết bị và thu lại."));
    recorder.onstart = () => {
      const started = Date.now();
      options.onSeconds(0);
      options.onPhase("recording");
      if (settled) return;
      timer = setInterval(() => options.onSeconds(Math.min(30, Math.floor((Date.now() - started) / 1000))), 250);
      limit = setTimeout(finish, 30000);
      if (options.finishSignal.aborted) finish();
    };
    signal.addEventListener("abort", cancel, { once: true });
    options.finishSignal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) { cancel(); return; }
    try { recorder.start(); }
    catch { done(null, new Error("Không bắt đầu được bản thu. Hãy kiểm tra microphone rồi thử lại.")); }
  });
}

/** Replay stays in memory. Only the finished recording is sent for assessment. */
export async function recordShadow(text: string, signal: AbortSignal, options: RecordingOptions) {
  const canceled = { result: null, audio: null };
  if (signal.aborted) return canceled;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined" || typeof OfflineAudioContext === "undefined") {
    throw new Error("Trình duyệt chưa hỗ trợ thu âm. Hãy mở trang bằng Chrome, Edge hoặc Safari phiên bản mới.");
  }
  options.onPhase("preparing");
  const { preparePronunciation, assessRecordedPronunciation } = await import("./pronunciation");
  const prepared = await preparePronunciation(signal);
  if (signal.aborted) return canceled;
  if (!prepared) throw new Error("Chưa kết nối được dịch vụ chấm phát âm. Hãy kiểm tra mạng rồi thử lại.");
  let stream: MediaStream | null;
  try { stream = await openMicrophone(signal); }
  catch (error) {
    if (signal.aborted) return canceled;
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      throw new Error("Microphone chưa được cấp quyền. Hãy cho phép micro trong trình duyệt rồi thử lại.");
    }
    throw new Error("Không mở được microphone. Hãy kiểm tra thiết bị rồi thử lại.");
  }
  if (!stream) return canceled;
  let audio: Blob | null;
  try { audio = await capture(stream, signal, options); }
  finally { stream.getTracks().forEach(track => { if (track.readyState !== "ended") track.stop(); }); }
  if (signal.aborted) return canceled;
  if (!audio) throw new Error("Bản thu trống. Hãy kiểm tra microphone rồi thử lại.");
  options.onPhase("grading");
  let wav: Blob;
  try { wav = await recordingToWave(audio); }
  catch (error) {
    if (signal.aborted) return canceled;
    if (error instanceof Error && error.message.startsWith("Bản thu quá ngắn")) throw error;
    throw new Error("Không đọc được bản thu. Hãy thử lại hoặc dùng trình duyệt khác.");
  }
  if (signal.aborted) return canceled;
  const result = await assessRecordedPronunciation(text, wav, prepared, signal);
  return signal.aborted ? canceled : { result, audio };
}
