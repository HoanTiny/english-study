// Resume source downloads after select-reviewed-recordings.mjs; no database writes.
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolveRecording } from "../src/lib/server/wordAudioSource.mjs";
const dir = ".audio-cache/ipa-review";
await mkdir(`${dir}/human`, { recursive: true });
const selected = JSON.parse(await readFile(`${dir}/reviewed-selections.json`, "utf8"));
const state = JSON.parse(await readFile(`${dir}/human-recordings.json`, "utf8").catch(() => '{"results":{}}'));
const oldSelections = JSON.parse(await readFile(`${dir}/selections.json`, "utf8").catch(() => "[]"));
const pending = [];
for (const row of selected.filter(r => r.audio.length)) {
  const current = state.results[`${row.word}|${row.accent}`];
  if (current?.status === "downloaded" && row.audio.some(a => a.file === current.file)) continue;
  // Do not repeatedly request a source that has already failed. Try a different labelled file.
  const failedFile = current?.status === "unavailable" ? current.file || oldSelections.find(r => r.word === row.word && r.accent === row.accent)?.audio[0]?.file : null;
  const candidate = row.audio.find(a => a.file !== failedFile);
  if (candidate) pending.push({ ...row, candidate });
}
let done = 0;
for (const row of pending) {
  const key = `${row.word}|${row.accent}`, url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "query", format: "json", maxlag: "5", titles: `File:${row.candidate.file}`, prop: "videoinfo", viprop: "url|derivatives|extmetadata" });
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "SpeakUp/1.0 (https://english-study-alpha-six.vercel.app; pronunciation audit)" } });
    if (response.status === 429) throw new Error("RATE_LIMIT: source requested a pause");
    if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);
    const body = await response.json();
    if (["maxlag", "ratelimited"].includes(body.error?.code)) throw new Error("RATE_LIMIT: source busy");
    const info = Object.values(body.query?.pages || {})[0]?.videoinfo?.[0];
    if (!info) throw new Error("No audio metadata");
    const recording = await resolveRecording({ sourceUrl: info.descriptionurl, info, ipa: row.selected.ipa });
    const sha256 = createHash("sha256").update(recording.bytes).digest("hex"), path = `human/${sha256}`;
    await writeFile(`${dir}/${path}`, recording.bytes);
    state.results[key] = { word: row.word, accent: row.accent, path, sha256, bytes: recording.bytes.length, ipa: recording.ipa, attribution: recording.attribution, file: row.candidate.file, referenceRevision: row.revision, status: "downloaded" };
  } catch (error) {
    if (error.message.startsWith("RATE_LIMIT")) throw error;
    state.results[key] = { word: row.word, accent: row.accent, file: row.candidate.file, status: "unavailable", error: error.message };
  }
  await writeFile(`${dir}/human-recordings.json.tmp`, JSON.stringify(state, null, 2));
  await rename(`${dir}/human-recordings.json.tmp`, `${dir}/human-recordings.json`);
  done++;
  if (done % 10 === 0 || done === pending.length) console.log(JSON.stringify({ done, total: pending.length }));
  await new Promise(r => setTimeout(r, 1600));
}
