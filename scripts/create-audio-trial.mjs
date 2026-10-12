// Local-only trial: never modifies word_audio or the production audio bucket.
// Setup: pnpm --dir .next-ui-qa/kokoro-runtime add kokoro-js@1.2.1
// Run from the project root: node scripts/create-audio-trial.mjs
import { readFile, writeFile, mkdir, copyFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import { wordAudioClient, readWordAudio, WORD_AUDIO_BUCKET } from "../src/lib/server/wordAudioStore.mjs";
import { audioFormat } from "../src/lib/server/wordAudioSource.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/audio-trial");
const runtime = resolve(root, ".next-ui-qa/kokoro-runtime");
const localRequire = createRequire(resolve(runtime, "package.json"));
const { KokoroTTS, TextSplitterStream } = await import(pathToFileURL(localRequire.resolve("kokoro-js")));
const modelId = "onnx-community/Kokoro-82M-v1.0-ONNX";
const selections = [
  ["sister", "So sánh âm /r/ cuối từ giữa US và UK."],
  ["parent", "Nghe nguyên âm đầu và trọng âm âm tiết đầu."],
  ["father", "Nghe âm /ð/ và âm /r/ cuối từ."],
  ["mother", "Nghe nguyên âm /ʌ/ và phụ âm /ð/."],
  ["children", "Kiểm tra cụm /tʃ/ và /dr/, tránh mất âm cuối."],
  ["son", "Nghe nguyên âm /ʌ/; IPA từ nguồn bên ngoài có thể sai."],
  ["daughter", "So sánh nguyên âm và cách đọc /t/ giữa hai giọng."],
  ["triplet", "Kiểm tra phụ âm /t/ cuối từ có nghe rõ không."],
  ["brother", "Nghe cụm /br/ và phụ âm /ð/."],
  ["wife", "Kiểm tra nguyên âm đôi /aɪ/ và âm /f/ cuối."],
  ["grandmother", "Nghe từ dài, nhịp đọc và ranh giới phụ âm."],
  ["grandfather", "Nghe trọng âm chính và phụ của từ ghép."],
  ["nephew", "Có biến thể /f/ và /v/; PDF chứa cả hai phiên âm."],
  ["uncle", "Nghe cụm /ŋk/ và âm tiết cuối."],
  ["aunt", "Có biến thể /ænt/ và /ɑːnt/; cần kiểm tra nguồn IPA."],
  ["husband", "Nghe phụ âm /z/ và /nd/ cuối từ."],
  ["water", "So sánh cách đọc nguyên âm và /t/ US–UK."],
  ["tomato", "Kiểm tra khác biệt US /eɪ/ và UK /ɑː/."],
  ["teacher", "Nghe âm /tʃ/ và /r/ cuối từ."],
  ["record", "Trong bài: danh từ ‘kỷ lục’, trọng âm đầu. Động từ có trọng âm khác."],
];
const course = JSON.parse(await readFile(resolve(root, "src/data/basic-vocabulary.json"), "utf8"));
const courseWords = course.lessons.flatMap(lesson => lesson.words);
const words = selections.map(([word, focus]) => {
  const entries = courseWords.filter(entry => entry.en.toLowerCase() === word);
  if (!entries.length) throw new Error(`Not in course: ${word}`);
  return { word, vi: entries[0].vi, sourceIpa: [...new Set(entries.map(e => e.ipa))], focus, generated: {}, reference: {} };
});
const reviewFindings = [
  { word: "husband", accents: ["us", "uk"], status: "needs-review",
    note: "Đầu vào tự động có /s/, trong khi từ điển ghi /z/. Cần nghe kỹ và sửa đầu vào phiên âm trước khi dùng cho bài học.",
    sourceUrl: "https://www.oxfordlearnersdictionaries.com/us/definition/english/husband_1" },
  { word: "aunt", accents: ["uk"], status: "needs-review",
    note: "Đầu vào UK là /ant/, khác mẫu /ɑːnt/ của Cambridge. Cần chọn biến thể đích thống nhất cho bài học; không nên xem mọi khác biệt vùng miền là lỗi.",
    sourceUrl: "https://dictionary.cambridge.org/us/pronunciation/english/aunt" },
  { word: "triplet", accents: ["us", "uk"], status: "needs-review",
    note: "Đầu vào có /ɪ/ ở âm tiết cuối, trong khi PDF ghi /ə/. Cần đối chiếu bản thu và nghe lại nguyên âm không nhấn.",
    sourceUrl: null },
];
for (const word of words) word.reviewFindings = reviewFindings.filter(f => f.word === word.word);
await mkdir(resolve(out, "generated"), { recursive: true });
await mkdir(resolve(out, "reference"), { recursive: true });

// WAV PCM16 is small enough for this audition and avoids a lossy encoder dependency.
function wav(samples, rate = 24000) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write("data", 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return bytes;
}
function inspect(samples, rate) {
  let peak = 0, sum = 0, invalid = 0, clipped = 0, first = -1, last = -1;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    if (!Number.isFinite(value)) { invalid++; continue; }
    const absolute = Math.abs(value);
    peak = Math.max(peak, absolute); sum += value * value;
    if (absolute >= 0.999) clipped++;
    if (absolute > 0.005) { if (first < 0) first = i; last = i; }
  }
  const duration = samples.length / rate, rms = Math.sqrt(sum / samples.length);
  const warnings = [];
  if (invalid) warnings.push("non-finite-samples");
  if (peak < 0.02 || rms < 0.003) warnings.push("very-quiet-or-silent");
  if (clipped / samples.length > 0.001) warnings.push("clipping");
  if (duration < 0.3 || duration > 6) warnings.push("unusual-duration");
  if (first < 0 || (last - first) / rate < 0.15) warnings.push("too-little-active-audio");
  return {
    duration: Number(duration.toFixed(3)), peak: Number(peak.toFixed(4)),
    rmsDb: Number((20 * Math.log10(rms || 1e-12)).toFixed(1)), invalid, clipped,
    leadingSilence: Number((Math.max(first, 0) / rate).toFixed(3)),
    trailingSilence: Number(((samples.length - Math.max(last, 0) - 1) / rate).toFixed(3)), warnings,
  };
}

const started = Date.now();
// Keep Node alive while native ONNX initializes; the library can unref pending work.
const keepAlive = setInterval(() => {}, 10000);
let tts;
try {
  console.log("Loading local Kokoro fp32 CPU model...");
  tts = await KokoroTTS.from_pretrained(modelId, { dtype: "fp32", device: "cpu" });
  for (const item of words) {
    for (const [accent, voice] of [["us", "af_heart"], ["uk", "bf_emma"]]) {
      const began = Date.now();
      const input = `${item.word}.`;
      const splitter = new TextSplitterStream(); splitter.push(input); splitter.close();
      const chunks = [];
      for await (const chunk of tts.stream(splitter, { voice, speed: 1 })) chunks.push(chunk);
      if (chunks.length !== 1) throw new Error(`Expected one utterance for ${item.word}/${accent}`);
      const { audio, phonemes } = chunks[0];
      const checks = inspect(audio.audio, audio.sampling_rate);
      if (checks.invalid || checks.warnings.includes("very-quiet-or-silent")) throw new Error(`Invalid audio: ${item.word}/${accent}`);
      const bytes = wav(audio.audio, audio.sampling_rate);
      const path = `generated/${item.word}-${accent}.wav`;
      await writeFile(resolve(out, path), bytes);
      item.generated[accent] = { path, voice, input, phonemes, bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        generationMs: Date.now() - began, ...checks };
      console.log(JSON.stringify({ word: item.word, accent, phonemes, ...checks }));
    }
  }
} finally {
  if (tts) await tts.model.dispose();
  clearInterval(keepAlive);
}
const generationMs = Date.now() - started;

// Read-only download of already-cached human recordings. No new dictionary crawl.
nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const referenceErrors = [];
if (url && key) {
  const db = wordAudioClient(url, key);
  for (const item of words) {
    try {
      for (const row of await readWordAudio(db, item.word, 10000)) {
        const { data, error } = await db.storage.from(WORD_AUDIO_BUCKET).download(row.audio_path);
        if (error || !data) throw new Error("Reference download failed");
        const bytes = Buffer.from(await data.arrayBuffer());
        const format = audioFormat(bytes);
        if (!format) throw new Error("Invalid reference audio");
        const path = `reference/${item.word}-${row.accent}.${format.ext}`;
        await writeFile(resolve(out, path), bytes);
        // Signed URLs, storage paths and credentials are never written to the public manifest.
        item.reference[row.accent] = { path, ipa: row.ipa, bytes: bytes.length,
          attribution: row.attribution, origin: row.origin,
          sha256: createHash("sha256").update(bytes).digest("hex") };
      }
    } catch { referenceErrors.push(item.word); }
  }
}
const allGenerated = words.flatMap(w => Object.values(w.generated));
const allReference = words.flatMap(w => Object.values(w.reference));
const manifest = {
  version: 1, createdAt: new Date().toISOString(), model: modelId,
  library: "kokoro-js@1.2.1", precision: "fp32", device: "cpu", speed: 1,
  modelUrl: "https://huggingface.co/hexgrad/Kokoro-82M",
  modelLicense: "Apache-2.0", voices: { us: "af_heart", uk: "bf_emma" },
  sourceIpaNote: "IPA nguyên bản trong tài liệu, không mặc định là IPA US/UK. Phiên âm nguồn có thể cần hiệu đính.",
  assessment: "Kiểm tra kỹ thuật và đối chiếu đầu vào phiên âm; chưa được người nghe duyệt chất lượng hay độ tự nhiên.",
  words, referenceErrors, reviewFindings,
  summary: { words: words.length, generated: allGenerated.length, references: allReference.length,
    generationMs, generatedBytes: allGenerated.reduce((s, x) => s + x.bytes, 0),
    referenceBytes: allReference.reduce((s, x) => s + x.bytes, 0),
    minSeconds: Math.min(...allGenerated.map(x => x.duration)), maxSeconds: Math.max(...allGenerated.map(x => x.duration)),
    flagged: words.flatMap(w => Object.entries(w.generated).filter(([, x]) => x.warnings.length).map(([accent, x]) => ({ word: w.word, accent, warnings: x.warnings }))) },
};
await writeFile(resolve(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await copyFile(resolve(root, "scripts/audio-trial.html"), resolve(out, "index.html"));
await copyFile(resolve(runtime, "node_modules/kokoro-js/LICENSE"), resolve(out, "KOKORO-LICENSE.txt"));
for (const entry of [...allGenerated, ...allReference]) await stat(resolve(out, entry.path));
console.log(JSON.stringify({ ...manifest.summary, referenceErrors, open: "http://localhost:3000/audio-trial/index.html" }, null, 2));
