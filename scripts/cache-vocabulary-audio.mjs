// Free-source import only. No Gemini/Azure calls. Resume by running the same command.
import nextEnv from "@next/env";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { importWordAudio, listWordAudio, wordAudioClient } from "../src/lib/server/wordAudioStore.mjs";
import { normalizeAudioWord } from "../src/lib/server/wordAudioSource.mjs";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const args = process.argv.slice(2);
const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const reportPath = resolve(option("report") || "data/vocabulary-audio-report.json");
const course = JSON.parse(await readFile(new URL("../src/data/basic-vocabulary.json", import.meta.url), "utf8"));
const words = [...new Set(course.lessons.flatMap(lesson => lesson.words.map(word => normalizeAudioWord(word.en))))];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase configuration");
const db = wordAudioClient(url, key);
const existing = await listWordAudio(db);
const previous = JSON.parse(await readFile(reportPath, "utf8").catch(() => "{}"));
const report = { sourceVersion: 1, results: {}, ...previous };
const targets = option("word") ? [normalizeAudioWord(option("word"))] : words;
const queue = targets.filter(word => {
  if (["us", "uk"].every(accent => existing.some(row => row.word === word && row.accent === accent))) return false;
  return option("word") || args.includes("--retry-missing") || !report.results[word] || report.results[word].some(result => result.status === "error");
}).slice(0, Number(option("limit") || targets.length));
console.log(JSON.stringify({ uniqueWords: words.length, storedRecordings: existing.filter(row => words.includes(row.word)).length, queuedWords: queue.length, mode: args.includes("--import") ? "import" : "preview" }));
if (!args.includes("--import")) process.exit(0);
await mkdir(dirname(reportPath), { recursive: true });
let stopping = false, processed = 0;
process.on("SIGINT", () => { stopping = true; });
let index = 0, writing = Promise.resolve();
async function worker() {
 while (!stopping && index < queue.length) {
  const word = queue[index++];
  try { report.results[word] = (await importWordAudio(db, word)).results; }
  catch (error) {
    report.results[word] = [{ status: "error", message: error.message }];
    if (error.message?.startsWith("RATE_LIMIT:")) { stopping = true; console.log(error.message); }
  }
  report.updatedAt = new Date().toISOString();
  writing = writing.then(async () => {
    await writeFile(`${reportPath}.tmp`, JSON.stringify(report, null, 2) + "\n");
    await rename(`${reportPath}.tmp`, reportPath);
  });
  await writing;
  processed++;
  if (processed % 20 === 0 || queue.length < 5) console.log(JSON.stringify({ processed, total: queue.length, word, results: report.results[word].map(r => `${r.accent || "both"}:${r.status}`) }));
  await new Promise(resolve => setTimeout(resolve, 1500));
 }
}
await worker();
const finalRows = (await listWordAudio(db)).filter(row => words.includes(row.word));
report.coverage = { uniqueWords: words.length, recordedWords: new Set(finalRows.map(row => row.word)).size, recordings: finalRows.length, bothAccents: words.filter(word => ["us", "uk"].every(accent => finalRows.some(row => row.word === word && row.accent === accent))).length, bytes: finalRows.reduce((sum, row) => sum + row.bytes, 0) };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ stopped: stopping, processed, ...report.coverage, report: reportPath }));
