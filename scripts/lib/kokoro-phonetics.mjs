// Misaki's Apache-2.0 lexicons use Kokoro's native phoneme alphabet.
// Bulk preparation never silently falls back to spelling-to-sound guesses.
export const PHONETICS_VERSION = "misaki-learner-ipa-v2";
export const dictionaryCorrections = {
  husband: { us: "hˈʌzbənd", uk: "hˈʌzbənd", ipa: { us: "/ˈhʌzbənd/", uk: "/ˈhʌzbənd/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/husband_1" },
  triplet: { us: "tɹˈɪplət", uk: "tɹˈɪplət", ipa: { us: "/ˈtrɪplət/", uk: "/ˈtrɪplət/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/triplet" },
  aunt: { us: "ˈænt", uk: "ˈɑːnt", ipa: { us: "/ænt/", uk: "/ɑːnt/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/aunt" },
  "banh mi": { us: "bˌɑːn mˈiː", uk: "bˌɑːn mˈiː", ipa: { us: "/ˌbɑːn ˈmiː/", uk: "/ˌbɑːn ˈmiː/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/banh-mi" },
  tet: { us: "tˈɛt", uk: "tˈɛt", ipa: { us: "/tet/", uk: "/tet/" }, source: "https://www.collinsdictionary.com/dictionary/english/tet" },
  mancala: { us: "mɑːnkˈɑːlə", uk: "mænkˈɑːlə", ipa: { us: "/mɑːnˈkɑːlə/", uk: "/mænˈkɑːlə/" }, source: { us: "https://www.merriam-webster.com/dictionary/mancala", uk: "https://www.collinsdictionary.com/dictionary/english/mancala" } },
  broccoli: { us: "bɹˈɑːkəli", uk: "bɹˈɒkəli", ipa: { us: "/ˈbrɑːkəli/", uk: "/ˈbrɒkəli/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/broccoli" },
  entree: { us: "ˈɑːntɹA", uk: "ˈɒntɹA", ipa: { us: "/ˈɑːntreɪ/", uk: "/ˈɒntreɪ/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/entree" },
  pinata: { us: "pɪnjˈɑːtə", uk: "pɪnjˈɑːtə", ipa: { us: "/pɪnˈjɑːtə/", uk: "/pɪnˈjɑːtə/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/pinata" },
  "santa claus": { us: "sˈæntə klɔːz", uk: "sˈæntə klɔːz", ipa: { us: "/ˈsæntə klɔːz/", uk: "/ˈsæntə klɔːz/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/santa-claus" },
  overwhelmed: { us: "ˌOvəɹwˈɛlmd", uk: "ˌQvəwˈɛlmd", ipa: { us: "/ˌoʊvərˈwelmd/", uk: "/ˌəʊvəˈwelmd/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/overwhelm" },
  overalls: { us: "ˈOvəɹɔːlz", uk: "ˈQvəɹɔːlz", ipa: { us: "/ˈoʊvərɔːlz/", uk: "/ˈəʊvərɔːlz/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/overall_3" },
  "sauté": { us: "sOtˈA", uk: "sˈQtA", ipa: { us: "/soʊˈteɪ/", uk: "/ˈsəʊteɪ/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/saute_1" },
  "sautéing": { us: "sOtˈAɪŋ", uk: "sˈQtAɪŋ", ipa: { us: "/soʊˈteɪɪŋ/", uk: "/ˈsəʊteɪɪŋ/" }, source: "https://www.oxfordlearnersdictionaries.com/definition/english/saute_2" },
};
// These forms match the Vietnamese senses in this course.
const senses = Object.fromEntries("buffet concert discount record house ornaments abstract project conflict transport exchange man of to the a and".split(" ").map(w => [w, "DEFAULT"]));
const aliases = { soulmate: "soul mate", mooncake: "moon cake", heartthrob: "heart throb", goddaughter: "god daughter", firecrackers: "fire crackers", "non-fiction": "nonfiction" };
const properNameReview = /\b(banh|nguyen|tieu|cau|ngu|giong|hue|da lat|do son|hung kings|kate festival|congkak|mancala)\b/i;
export function buildLexicon(gold, silver) {
  const map = new Map();
  for (const [dictionary, confidence] of [[silver, "silver"], [gold, "gold"]]) {
    for (const [key, value] of Object.entries(dictionary)) {
      const lower = key.toLowerCase();
      if (!map.has(lower) || key === lower || map.get(lower).confidence !== "gold") map.set(lower, { value, confidence });
    }
  }
  return map;
}
const suffix = p => /[sʃʧzʒʤ]$/.test(p) ? "ɪz" : /[ptkfθ]$/.test(p) ? "s" : "z";
export function resolvePhonemes(word, accent, lexicon, depth = 0) {
  word = word.toLowerCase().replace(/’/g, "'").trim();
  if (depth > 5 || !word) return { error: "Cần duyệt cách đọc tên riêng hoặc từ ngoài bộ phiên âm." };
  const corrected = dictionaryCorrections[word];
  if (corrected) return { phonemes: corrected[accent], ipa: corrected.ipa[accent], source: typeof corrected.source === "string" ? corrected.source : corrected.source[accent], method: "dictionary-correction" };
  if (properNameReview.test(word)) return { error: "Cần duyệt cách đọc tên riêng hoặc từ ngoài bộ phiên âm." };
  const found = lexicon.get(word);
  if (found) {
    let value = found.value;
    if (typeof value !== "string") {
      if (!senses[word]) return { error: `Cần xác định từ loại/nghĩa: ${word}` };
      value = value[senses[word]];
    }
    if (typeof value === "string" && value) return { phonemes: value, method: `misaki-${found.confidence}` };
  }
  const resolve = part => resolvePhonemes(part, accent, lexicon, depth + 1);
  if (aliases[word]) return resolve(aliases[word]);
  if (word.endsWith("'s")) {
    const base = resolve(word.slice(0, -2));
    if (base.phonemes) return { phonemes: base.phonemes + suffix(base.phonemes), method: "lexicon-possessive" };
  }
  if (word.endsWith("s'")) return resolve(word.slice(0, -1));
  const stems = word.endsWith("ies") ? [word.slice(0, -3) + "y"] : word.endsWith("es") ? [word.slice(0, -2), word.slice(0, -1)] : word.endsWith("s") && !word.endsWith("ss") ? [word.slice(0, -1)] : [];
  for (const stem of stems) {
    const base = lexicon.get(stem);
    if (typeof base?.value === "string") return { phonemes: base.value + suffix(base.value), method: "lexicon-plural" };
  }
  if (/[ -]/.test(word)) {
    const parts = word.split(/[ -]+/).map(resolve);
    if (parts.every(p => p.phonemes)) return { phonemes: parts.map(p => p.phonemes).join(" "), method: "lexicon-components" };
    return { error: parts.find(p => p.error)?.error || "Thiếu phiên âm một thành phần." };
  }
  return { error: `Chưa có phiên âm xác định cho: ${word}` };
}
// Debugging only: these symbols retain MODEL stress placement and are NOT learner IPA.
export function phonemesToIpa(phonemes) {
  const replacements = { A: "eɪ", I: "aɪ", O: "oʊ", Q: "əʊ", W: "aʊ", Y: "ɔɪ", T: "ɾ", "ᵊ": "ə", "ʤ": "dʒ", "ʧ": "tʃ", "ɹ": "r" };
  return "/" + [...phonemes].map(c => replacements[c] || c).join("").replace(/[.!?]+$/, "") + "/";
}
export function pcmWav(samples, rate = 24000) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write("data", 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return bytes;
}
export function prepareWaveform(samples, rate = 24000) {
  if (!samples.length || samples.some(x => !Number.isFinite(x))) throw new Error("Invalid waveform");
  let peak = 0, first = -1, last = -1;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
    if (Math.abs(samples[i]) > 0.003) { if (first < 0) first = i; last = i; }
  }
  if (first < 0 || peak < 0.02 || (last - first) / rate < 0.15) throw new Error("Silent or incomplete waveform");
  // Preserve consonant tails with 120ms padding; apply bounded peak normalization.
  const start = Math.max(0, first - Math.round(rate * 0.12));
  const end = Math.min(samples.length, last + 1 + Math.round(rate * 0.12));
  const gain = Math.min(2, 0.8 / peak);
  const audio = Float32Array.from(samples.slice(start, end), x => x * gain);
  let sum = 0;
  for (const x of audio) sum += x * x;
  const rms = Math.sqrt(sum / audio.length), duration = audio.length / rate;
  if (rms < 0.005 || duration > 15 || duration < 0.3) throw new Error("Waveform needs review");
  return { audio, checks: { duration: Number(duration.toFixed(3)), peak: Number((peak * gain).toFixed(4)), rmsDb: Number((20 * Math.log10(rms)).toFixed(1)), gain: Number(gain.toFixed(3)) } };
}
