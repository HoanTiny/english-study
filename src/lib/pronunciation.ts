"use client";
import { apiFetch } from "@/lib/apiFetch";

// Chấm phát âm thật bằng Azure Speech SDK (chạy ở client, dùng token ngắn hạn).
// Trả về điểm 0–100, hoặc null nếu chưa cấu hình / lỗi → hiển thị lỗi, không tạo điểm giả.

export type PronResult = {
  words?: { word: string; accuracy: number; error: string }[];
  pronunciation: number; // điểm tổng phát âm
  accuracy: number; // độ chính xác âm
  fluency: number; // độ trôi chảy
  completeness: number; // độ đầy đủ so với câu mẫu
  recognized: string; // câu SDK nghe được
};

let cachedToken: { token: string; region: string; at: number } | null = null;

async function getToken(signal?: AbortSignal): Promise<{ token: string; region: string } | null> {
  // Token Azure sống ~10 phút; cache 8 phút cho chắc.
  if (cachedToken && Date.now() - cachedToken.at < 8 * 60 * 1000) {
    return { token: cachedToken.token, region: cachedToken.region };
  }
  try {
    const res = await apiFetch("/api/speech-token", { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    const data = (await res.json()) as {
      configured: boolean;
      token?: string;
      region?: string;
    };
    if (!data.configured || !data.token || !data.region) return null;
    cachedToken = { token: data.token, region: data.region, at: Date.now() };
    return { token: data.token, region: data.region };
  } catch {
    return null;
  }
}

export async function speechConfigured(): Promise<boolean> {
  return (await getToken()) !== null;
}

/** Prepare the service before starting a recording, so setup time is never scored. */
export async function preparePronunciation(signal: AbortSignal) {
  const tok = await getToken(signal);
  if (!tok || signal.aborted) return null;
  const SDK = await import("microsoft-cognitiveservices-speech-sdk");
  return signal.aborted ? null : { tok, SDK };
}

type Prepared = NonNullable<Awaited<ReturnType<typeof preparePronunciation>>>;

/** The caller supplies mono PCM WAV, never a compressed MediaRecorder blob. */
export function assessRecordedPronunciation(
  referenceText: string, wav: Blob, prepared: Prepared, signal: AbortSignal,
): Promise<PronResult | null> {
  return recognize(referenceText, prepared, signal, () =>
    prepared.SDK.AudioConfig.fromWavFileInput(new File([wav], "practice.wav", { type: "audio/wav" })),
  );
}

/**
 * Thu âm 1 lần qua micro và chấm phát âm so với `referenceText`.
 * Tự động dừng khi người nói ngừng (recognizeOnceAsync).
 */
export async function assessPronunciation(
  referenceText: string,
  options?: { stream?: MediaStream; signal?: AbortSignal },
): Promise<PronResult | null> {
  const tok = await getToken(options?.signal);
  if (!tok || options?.signal?.aborted) return null;

  // Dynamic import giữ SDK ngoài bundle chính.
  const SDK = await import("microsoft-cognitiveservices-speech-sdk");

  return recognize(referenceText, { tok, SDK }, options?.signal, () =>
    options?.stream ? SDK.AudioConfig.fromStreamInput(options.stream) : SDK.AudioConfig.fromDefaultMicrophoneInput(),
  );
}

function recognize(
  referenceText: string, { tok, SDK }: Prepared, signal: AbortSignal | undefined,
  createAudio: () => import("microsoft-cognitiveservices-speech-sdk").AudioConfig,
): Promise<PronResult | null> {
  return new Promise<PronResult | null>((resolve) => {
    let settled = false;
    let recognizer: InstanceType<typeof SDK.SpeechRecognizer> | undefined;
    let audioConfig: ReturnType<typeof createAudio> | undefined;
    const abort = () => done(null);
    const done = (r: PronResult | null) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        try { recognizer?.close(); } catch { /* Already closed. */ }
        try { audioConfig?.close(); } catch { /* Already closed. */ }
        resolve(r);
      }
    };
    const timer = setTimeout(() => done(null), 30000);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { done(null); return; }
    try {
      const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(
        tok.token,
        tok.region,
      );
      speechConfig.speechRecognitionLanguage = "en-US";
      audioConfig = createAudio();
      recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);

      const paConfig = new SDK.PronunciationAssessmentConfig(
        referenceText,
        SDK.PronunciationAssessmentGradingSystem.HundredMark,
        SDK.PronunciationAssessmentGranularity.Phoneme,
        true,
      );
      paConfig.applyTo(recognizer);

      recognizer.recognizeOnceAsync(
        (result) => {
          try {
            if (result.reason === SDK.ResultReason.RecognizedSpeech) {
              const pa = SDK.PronunciationAssessmentResult.fromResult(result);
              done({
                pronunciation: Math.round(pa.pronunciationScore),
                accuracy: Math.round(pa.accuracyScore),
                fluency: Math.round(pa.fluencyScore),
                completeness: Math.round(pa.completenessScore),
                recognized: result.text ?? "",
                words: (pa.detailResult.Words ?? []).map(w => ({ word: w.Word,
                  accuracy: Math.round(w.PronunciationAssessment?.AccuracyScore ?? 0),
                  error: w.PronunciationAssessment?.ErrorType ?? "None" })),
              });
            } else {
              done(null);
            }
          } catch { done(null); }
        },
        () => {
          done(null);
        },
      );
    } catch {
      done(null);
    }
  });
}
