export type PronunciationAccent = "us" | "uk";
export const accentLanguage = (accent: PronunciationAccent) => accent === "uk" ? "en-GB" : "en-US";
export function matchingVoice(voices: SpeechSynthesisVoice[], accent: PronunciationAccent) {
  const language = accentLanguage(accent).toLowerCase();
  return voices.find(voice => voice.lang.replace("_", "-").toLowerCase() === language);
}
export function formatIpa(value: string) { return `/${value.replace(/^\/+|\/+$/g, "").trim()}/`; }
