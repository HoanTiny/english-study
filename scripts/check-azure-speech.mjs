// One short synthetic sample through real Azure TTS + pronunciation assessment.
// This uses a small amount of Azure Speech quota; it does not test a microphone.
import nextEnv from "@next/env";
import SDK from "microsoft-cognitiveservices-speech-sdk";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
if (!key || !region) throw new Error("Missing Azure configuration in .env.local");
const text = "Hello. I am learning English today.";
const config = SDK.SpeechConfig.fromSubscription(key, region);
config.speechSynthesisVoiceName = "en-US-JennyNeural";
config.speechSynthesisOutputFormat = SDK.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;
config.speechRecognitionLanguage = "en-US";
let stage = "synthesis";
let recognizer;
const synth = new SDK.SpeechSynthesizer(config, null);
const timeout = setTimeout(() => {
  console.error(JSON.stringify({ stage, ok: false, error: "timeout" }));
  try { recognizer?.close(); synth.close(); } finally { process.exit(1); }
}, 45000);
try {
  const speech = await new Promise((resolve, reject) => synth.speakTextAsync(text, resolve, () => reject(new Error("synthesis failed"))));
  if (speech.reason !== SDK.ResultReason.SynthesizingAudioCompleted || !speech.audioData?.byteLength) throw new Error("synthesis failed");
  synth.close();
  console.log(JSON.stringify({ stage, ok: true, bytes: speech.audioData.byteLength }));
  stage = "pronunciation";
  recognizer = new SDK.SpeechRecognizer(config, SDK.AudioConfig.fromWavFileInput(Buffer.from(speech.audioData)));
  new SDK.PronunciationAssessmentConfig(text, SDK.PronunciationAssessmentGradingSystem.HundredMark,
    SDK.PronunciationAssessmentGranularity.Phoneme, true).applyTo(recognizer);
  const result = await new Promise((resolve, reject) => recognizer.recognizeOnceAsync(resolve, () => reject(new Error("assessment failed"))));
  if (result.reason !== SDK.ResultReason.RecognizedSpeech) throw new Error("speech not recognized");
  const assessment = SDK.PronunciationAssessmentResult.fromResult(result);
  const scores = [assessment.pronunciationScore, assessment.accuracyScore, assessment.fluencyScore, assessment.completenessScore];
  const words = assessment.detailResult.Words ?? [];
  if (!scores.every(n => Number.isFinite(n) && n >= 0 && n <= 100) || !words.length) throw new Error("invalid assessment");
  console.log(JSON.stringify({ stage, ok: true, pronunciation: scores[0], accuracy: scores[1], fluency: scores[2], completeness: scores[3], words: words.length, synthetic: true }));
} catch {
  console.error(JSON.stringify({ stage, ok: false }));
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  recognizer?.close();
  synth.close();
}
