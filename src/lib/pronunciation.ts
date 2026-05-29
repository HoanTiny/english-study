"use client";

// Chấm phát âm thật bằng Azure Speech SDK (chạy ở client, dùng token ngắn hạn).
// Trả về điểm 0–100, hoặc null nếu chưa cấu hình / lỗi → caller tự fallback mock.

export type PronResult = {
  pronunciation: number; // điểm tổng phát âm
  accuracy: number; // độ chính xác âm
  fluency: number; // độ trôi chảy
  completeness: number; // độ đầy đủ so với câu mẫu
  recognized: string; // câu SDK nghe được
};

let cachedToken: { token: string; region: string; at: number } | null = null;

async function getToken(): Promise<{ token: string; region: string } | null> {
  // Token Azure sống ~10 phút; cache 8 phút cho chắc.
  if (cachedToken && Date.now() - cachedToken.at < 8 * 60 * 1000) {
    return { token: cachedToken.token, region: cachedToken.region };
  }
  try {
    const res = await fetch("/api/speech-token");
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

/**
 * Thu âm 1 lần qua micro và chấm phát âm so với `referenceText`.
 * Tự động dừng khi người nói ngừng (recognizeOnceAsync).
 */
export async function assessPronunciation(
  referenceText: string,
): Promise<PronResult | null> {
  const tok = await getToken();
  if (!tok) return null;

  // Dynamic import giữ SDK ngoài bundle chính.
  const SDK = await import("microsoft-cognitiveservices-speech-sdk");

  return new Promise<PronResult | null>((resolve) => {
    let settled = false;
    const done = (r: PronResult | null) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    try {
      const speechConfig = SDK.SpeechConfig.fromAuthorizationToken(
        tok.token,
        tok.region,
      );
      speechConfig.speechRecognitionLanguage = "en-US";
      const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);

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
              });
            } else {
              done(null);
            }
          } finally {
            recognizer.close();
          }
        },
        () => {
          recognizer.close();
          done(null);
        },
      );
    } catch {
      done(null);
    }
  });
}
