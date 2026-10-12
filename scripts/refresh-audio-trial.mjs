// Read the actual shared audio store into the local audition page. No DB writes.
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import { wordAudioClient, readWordAudio, WORD_AUDIO_BUCKET } from "../src/lib/server/wordAudioStore.mjs";
import { audioFormat } from "../src/lib/server/wordAudioSource.mjs";
const out = "public/audio-trial";
const manifest = JSON.parse(await readFile(`${out}/manifest.json`, "utf8"));
const reference = JSON.parse(await readFile("src/data/vocabulary-ipa.json", "utf8"));
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const db = wordAudioClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
await mkdir(`${out}/current`, { recursive: true });
let human = 0, synthetic = 0;
for (const word of manifest.words) {
  word.ipa = reference.entries[word.word];
  word.current = {};
  const rows = await readWordAudio(db, word.word);
  for (const row of rows) {
    const { data, error } = await db.storage.from(WORD_AUDIO_BUCKET).download(row.audio_path);
    if (error || !data) throw new Error(`Cannot read trial recording: ${word.word}/${row.accent}`);
    const bytes = Buffer.from(await data.arrayBuffer()), sha = createHash("sha256").update(bytes).digest("hex"), format = audioFormat(bytes);
    if (!format) throw new Error("Invalid stored file");
    const path = `current/${sha}.${format.ext}`;
    await writeFile(`${out}/${path}`, bytes);
    const isSynthetic = row.attribution?.kind === "synthetic";
    word.current[row.accent] = { path, synthetic: isSynthetic, attribution: row.attribution };
    if (isSynthetic) synthetic++; else { human++; word.reference[row.accent] = { path, attribution: row.attribution }; }
  }
}
manifest.reviewedAt = new Date().toISOString();
manifest.ipaRevision = reference.version;
manifest.currentSummary = { human, synthetic };
await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
await copyFile("scripts/audio-trial.html", `${out}/index.html`);
console.log(JSON.stringify({ words: manifest.words.length, human, synthetic, ipaRevision: reference.version }));
