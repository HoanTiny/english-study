// Preview: node scripts/prepare-kokoro-audio.mjs
// Incremental preparation: node scripts/prepare-kokoro-audio.mjs --generate --publish --limit=100
// Resume: run the same command. --limit counts words that still need work.
import { readFile, writeFile, mkdir, rename, open, unlink, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import { wordAudioClient, listWordAudio, saveWordAudio } from "../src/lib/server/wordAudioStore.mjs";
import { validAudioWord, normalizeAudioWord } from "../src/lib/server/wordAudioSource.mjs";
import { buildLexicon, resolvePhonemes, prepareWaveform, pcmWav, PHONETICS_VERSION } from "./lib/kokoro-phonetics.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cache = resolve(root, ".audio-cache"), reportPath = resolve(cache, "kokoro-progress.json");
const args = process.argv.slice(2), option = name => args.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const publish = args.includes("--publish"), generate = args.includes("--generate") || publish;
const limit = Number(option("limit") || 100), batchSize = Number(option("batch-size") || 50);
if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(batchSize) || batchSize < 1) throw new Error("Invalid limit/batch size");
const model = "onnx-community/Kokoro-82M-v1.0-ONNX", voices = { us: "af_heart", uk: "bf_emma" };
const course = JSON.parse(await readFile(resolve(root, "src/data/basic-vocabulary.json"), "utf8"));
const learnerReference = JSON.parse(await readFile(resolve(root, "src/data/vocabulary-ipa.json"), "utf8"));
const words = [...new Map(course.lessons.flatMap(l => l.words).map(w => [normalizeAudioWord(w.en), w])).keys()];
await mkdir(resolve(cache, "audio"), { recursive: true });
const dictionaries = {};
for (const [accent, prefix] of [["us", "us"], ["uk", "gb"]]) dictionaries[accent] = buildLexicon(
  JSON.parse(await readFile(resolve(cache, `lexicon/${prefix}_gold.json`), "utf8")),
  JSON.parse(await readFile(resolve(cache, `lexicon/${prefix}_silver.json`), "utf8")),
);
const lexiconRevision = JSON.parse(await readFile(resolve(cache, "lexicon/revision.json"), "utf8")).sha;
const plan = words.map(word => ({ word, accents: Object.fromEntries(["us", "uk"].map(accent => [accent, validAudioWord(word) ? resolvePhonemes(word, accent, dictionaries[accent]) : { error: "Cần chuẩn hóa ký tự của mục từ." }])) }));
const held = plan.flatMap(w => Object.entries(w.accents).filter(([, p]) => p.error).map(([accent, p]) => ({ word: w.word, accent, reason: p.error })));
await writeFile(resolve(cache, "kokoro-plan.json"), JSON.stringify({ version: PHONETICS_VERSION, lexiconRevision, words: plan }, null, 2));
console.log(JSON.stringify({ words: words.length, readyRecordings: words.length * 2 - held.length, heldRecordings: held.length, mode: publish ? "generate-and-publish" : generate ? "generate" : "preview" }));
if (!generate) { console.log(JSON.stringify({ held }, null, 2)); process.exit(0); }

const checkpoint = JSON.parse(await readFile(reportPath, "utf8").catch(error => { if (error.code === "ENOENT") return '{"results":{}}'; throw error; }));
// One job at a time; a crashed process can be resumed after removing its stale lock.
const lockPath = resolve(cache, "kokoro.lock");
const lock = await open(lockPath, "wx").catch(() => { throw new Error("Audio job already active; inspect .audio-cache/kokoro.lock before retrying."); });
await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
let tts, hold, stopping = false, db;
const pendingUploads = new Set();
let writes = Promise.resolve(), uploadFailures = 0;
const onStop = () => { stopping = true; };
process.on("SIGINT", onStop); process.on("SIGTERM", onStop);
const fingerprint = (word, accent, p) => createHash("sha256").update(JSON.stringify({ word, accent, phonemes: p.phonemes, voice: voices[accent], model, version: PHONETICS_VERSION, waveform: 1 })).digest("hex");
async function publicProgress(summary, running) {
  if (!publish) return;
  const path = resolve(root, "public/audio-trial/batch-progress.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify({ updatedAt: new Date().toISOString(), running, ...summary, held }, null, 2));
  await rename(`${path}.tmp`, path);
}
async function persist() {
  writes = writes.then(async () => {
    checkpoint.updatedAt = new Date().toISOString(); checkpoint.held = held;
    await writeFile(`${reportPath}.tmp`, JSON.stringify(checkpoint, null, 2)); await rename(`${reportPath}.tmp`, reportPath);
  });
  await writes;
}
try {
  nextEnv.loadEnvConfig(root, false, { info() {}, error() {} });
  let stored = [];
  if (publish) {
    db = wordAudioClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    stored = await listWordAudio(db);
  }
  const existing = new Set(stored.map(r => `${r.word}|${r.accent}`));
  const selected = option("word") ? plan.filter(w => w.word === normalizeAudioWord(option("word"))) : plan;
  const queue = selected.filter(w => Object.entries(w.accents).some(([accent, p]) => {
    if (p.error) return false;
    const key = `${w.word}|${accent}`, previous = checkpoint.results[key];
    return publish ? !existing.has(key) : previous?.fingerprint !== fingerprint(w.word, accent, p) || !previous?.path;
  })).slice(0, limit);
  console.log(JSON.stringify({ queuedWords: queue.length, alreadyStored: existing.size }));
  const liveSummary = done => ({ totalWords: words.length, doneThisRun: done, queuedWords: queue.length,
    storedRecordings: existing.size, targetRecordings: words.length * 2 - held.length,
    completeWords: words.filter(w => ["us", "uk"].every(a => existing.has(`${w}|${a}`))).length,
    heldRecordings: held.length, errors: Object.values(checkpoint.results).filter(x => x.status === "error").length });
  await publicProgress(liveSummary(0), queue.length > 0);
  if (queue.length) {
    let runtime;
    for (const path of [".audio-cache/runtime/package.json", ".next-ui-qa/kokoro-runtime/package.json"]) {
      try { runtime = createRequire(resolve(root, path)).resolve("kokoro-js"); break; } catch { /* Try the existing trial runtime. */ }
    }
    if (!runtime) throw new Error("Run node scripts/setup-kokoro-audio.mjs, then npm --prefix .audio-cache/runtime install");
    const { KokoroTTS } = await import(pathToFileURL(runtime));
    hold = setInterval(() => {}, 10000);
    tts = await KokoroTTS.from_pretrained(model, { dtype: "fp32", device: "cpu" });
  }
  let done = 0, failures = 0;
  for (const item of queue) {
    if (stopping) break;
    for (const [accent, p] of Object.entries(item.accents)) {
      if (p.error || (publish && existing.has(`${item.word}|${accent}`))) continue;
      const key = `${item.word}|${accent}`, hash = fingerprint(item.word, accent, p);
      try {
        let previous = checkpoint.results[key], bytes;
        if (previous?.fingerprint === hash && previous.path) {
          bytes = await readFile(resolve(cache, previous.path)).catch(() => null);
          if (bytes && createHash("sha256").update(bytes).digest("hex") !== previous.sha256) bytes = null;
        }
        if (!bytes) {
          const input = p.phonemes.replace(/ɾ/g, "T") + ".";
          const { input_ids } = tts.tokenizer(input, { truncation: false });
          // The tokenizer drops unsupported characters: require an exact round trip.
          // This tokenizer's generic decode adds spaces and retains $ padding.
          const decoded = Array.from(input_ids.data, id => tts.tokenizer.model.vocab[Number(id)]).slice(1, -1).join("");
          if (decoded !== input || input_ids.dims.at(-1) > 512) throw new Error("Phoneme tokens do not round-trip");
          const result = await tts.generate_from_ids(input_ids, { voice: voices[accent], speed: 1 });
          const { audio, checks } = prepareWaveform(result.audio, result.sampling_rate);
          bytes = pcmWav(audio, result.sampling_rate);
          const path = `audio/${hash}.wav`;
          await writeFile(resolve(cache, path), bytes);
          const learnerIpa = learnerReference.entries[item.word]?.[accent];
          if (!learnerIpa) throw new Error("Missing reviewed learner IPA; do not publish model notation");
          previous = { word: item.word, accent, path, fingerprint: hash, sha256: createHash("sha256").update(bytes).digest("hex"), phonemes: p.phonemes, ipa: learnerIpa, ipaRevision: learnerReference.version, method: p.method, source: p.source || "https://github.com/hexgrad/misaki", checks, bytes: bytes.length, status: "generated" };
          checkpoint.results[key] = previous;
          await persist();
        }
        if (publish) {
          const upload = (async () => {
            try {
              const result = await saveWordAudio(db, { word: item.word, accent, bytes, ipa: previous.ipa, origin: "upload", onlyMissing: true,
                attribution: { kind: "synthetic", engine: "kokoro", creator: `Kokoro · ${voices[accent]}`, voice: voices[accent], sourceUrl: "https://huggingface.co/hexgrad/Kokoro-82M", license: "Apache-2.0 (mô hình)", licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0", phonemeSource: previous.source, phonemeMethod: previous.method, lexiconRevision, version: PHONETICS_VERSION, fingerprint: hash } });
              previous.status = result.status === "saved" ? "published" : "existing";
              delete previous.error; existing.add(key); uploadFailures = 0;
            } catch (error) {
              previous.status = "error"; previous.error = error.message;
              console.log(JSON.stringify({ word: item.word, accent, error: error.message }));
              if (++uploadFailures >= 3) stopping = true;
            }
            await persist();
          })();
          pendingUploads.add(upload);
          upload.then(() => pendingUploads.delete(upload), () => pendingUploads.delete(upload));
          // CPU synthesis remains serial; overlap at most three storage writes.
          if (pendingUploads.size >= 3) await Promise.race(pendingUploads);
        }
        failures = 0;
      } catch (error) {
        checkpoint.results[key] = { ...checkpoint.results[key], word: item.word, accent, error: error.message, status: "error" };
        await persist(); console.log(JSON.stringify({ word: item.word, accent, error: error.message }));
        if (++failures >= 3) { stopping = true; break; }
      }
    }
    done++;
    if (done % 10 === 0 || done === queue.length) {
      console.log(JSON.stringify({ done, total: queue.length, word: item.word, stored: existing.size }));
      await publicProgress(liveSummary(done), !stopping);
    }
    if (done % batchSize === 0 && !stopping) await new Promise(resolve => setTimeout(resolve, 1500));
  }
  await Promise.all(pendingUploads);
  const finalRows = publish ? (await listWordAudio(db)).filter(r => words.includes(r.word)) : [];
  checkpoint.summary = { totalWords: words.length, doneThisRun: done, stopped: stopping, locallyGenerated: Object.values(checkpoint.results).filter(x => x.path).length, storedRecordings: finalRows.length, completeWords: words.filter(w => ["us", "uk"].every(a => finalRows.some(r => r.word === w && r.accent === a))).length, syntheticRecordings: finalRows.filter(r => r.attribution?.kind === "synthetic").length, heldRecordings: held.length, errors: Object.values(checkpoint.results).filter(x => x.status === "error").length };
  await persist();
  // Publish only a local progress summary; no private keys, paths or signed URLs.
  await publicProgress({ ...checkpoint.summary, targetRecordings: words.length * 2 - held.length }, false);
  console.log(JSON.stringify(checkpoint.summary));
  if (args.includes("--refresh-trial")) {
    const trialPath = resolve(root, "public/audio-trial/manifest.json");
    const trial = JSON.parse(await readFile(trialPath, "utf8"));
    for (const item of trial.words) for (const accent of ["us", "uk"]) {
      const saved = checkpoint.results[`${item.word}|${accent}`];
      if (!saved?.path) continue;
      const path = `generated/${item.word}-${accent}.wav`;
      await copyFile(resolve(cache, saved.path), resolve(root, "public/audio-trial", path));
      item.generated[accent] = { ...item.generated[accent], path: `${path}?v=${saved.fingerprint.slice(0, 12)}`, phonemes: saved.phonemes, ipa: saved.ipa, sha256: saved.sha256, bytes: saved.bytes, ...saved.checks, warnings: [] };
      for (const finding of item.reviewFindings || []) { finding.status = "corrected"; finding.note = "Đã tạo lại bằng phiên âm từ điển theo từng giọng; xem phiên âm đầu vào ngay bên dưới."; finding.sourceUrl = saved.source; }
    }
    trial.reviewFindings = trial.words.flatMap(w => w.reviewFindings || []); trial.version = 2; trial.createdAt = new Date().toISOString();
    const generated = trial.words.flatMap(w => Object.values(w.generated));
    trial.summary.generatedBytes = generated.reduce((sum, x) => sum + x.bytes, 0);
    trial.summary.minSeconds = Math.min(...generated.map(x => x.duration)); trial.summary.maxSeconds = Math.max(...generated.map(x => x.duration));
    await writeFile(trialPath, JSON.stringify(trial, null, 2));
    await copyFile(resolve(root, "scripts/audio-trial.html"), resolve(root, "public/audio-trial/index.html"));
  }
  if (stopping || checkpoint.summary.errors) process.exitCode = 1;
} finally {
  await Promise.allSettled(pendingUploads);
  if (tts) await tts.model.dispose(); clearInterval(hold);
  process.off("SIGINT", onStop); process.off("SIGTERM", onStop);
  await lock.close(); await unlink(lockPath);
}
