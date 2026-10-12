// Dry run by default. --apply repairs only synthetic rows; keeps old objects for rollback.
import { readFile, writeFile, mkdir, open, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import nextEnv from "@next/env";
import { wordAudioClient } from "../src/lib/server/wordAudioStore.mjs";
import { repairSyntheticIpa, replaceSyntheticRecording } from "../src/lib/server/wordAudioRepair.mjs";
const dir = ".audio-cache/ipa-review", apply = process.argv.includes("--apply");
const reference = JSON.parse(await readFile("src/data/vocabulary-pronunciation.json", "utf8"));
const sources = JSON.parse(await readFile(`${dir}/human-recordings.json`, "utf8"));
const validations = JSON.parse(await readFile(`${dir}/validated-recordings.json`, "utf8"));
const selections = JSON.parse(await readFile(`${dir}/reviewed-selections.json`, "utf8"));
const chosen = new Map(selections.map(row => [`${row.word}|${row.accent}`, row]));
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const db = wordAudioClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
await mkdir(dir, { recursive: true });
const lockPath = `${dir}/repair.lock`;
const lock = apply ? await open(lockPath, "wx") : null;
try {
  if (lock) await lock.writeFile(JSON.stringify({ pid: process.pid }));
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db.from("word_audio").select("*").order("word").order("accent").range(start, start + 999);
    if (error) throw new Error("Could not read audio inventory");
    rows.push(...data); if (data.length < 1000) break;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (apply) await writeFile(`${dir}/db-before-${stamp}.json`, JSON.stringify(rows, null, 2), { flag: "wx" });
  const plan = [];
  for (const row of rows) {
    if (row.origin !== "upload" || row.attribution?.kind !== "synthetic") continue;
    const item = reference.entries[row.word], ipa = item?.[row.accent]?.ipa;
    if (!ipa || item.needsReview) continue;
    const key = `${row.word}|${row.accent}`, source = sources.results[key], check = validations.results[key];
    const ready = source?.status === "downloaded" && check?.valid && check.sha256 === source.sha256
      && chosen.get(key)?.audio.some(a => a.file === source.file) && check.file === source.file;
    if (ready || row.ipa !== ipa || row.attribution.ipaRevision !== reference.version) plan.push({ row, ipa, source: ready ? source : null });
  }
  const summary = { mode: apply ? "apply" : "preview", existing: rows.length, replaceSynthetic: plan.filter(x => x.source).length, repairMetadataOnly: plan.filter(x => !x.source).length, preservedHuman: rows.filter(r => !(r.origin === "upload" && r.attribution?.kind === "synthetic")).length };
  console.log(JSON.stringify(summary));
  if (apply) {
    const report = { startedAt: new Date().toISOString(), version: reference.version, summary, results: [] };
    let index = 0;
    async function worker() {
      while (index < plan.length) {
        const item = plan[index++], { row, ipa, source } = item;
        try {
          let outcome;
          if (source) {
            const path = resolve(dir, source.path);
            if (!path.startsWith(resolve(dir, "human") + sep)) throw new Error("Invalid source path");
            const bytes = await readFile(path);
            if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) throw new Error("Source hash mismatch");
            outcome = await replaceSyntheticRecording(db, row, { bytes, ipa, ipaRevision: reference.version, attribution: { ...source.attribution, referenceRevision: source.referenceRevision, sha256: source.sha256 } });
          } else outcome = await repairSyntheticIpa(db, row, ipa, reference.version);
          report.results.push({ word: row.word, accent: row.accent, ...outcome });
        } catch (error) { report.results.push({ word: row.word, accent: row.accent, status: "error", message: error.message }); }
        if (report.results.length % 50 === 0) console.log(JSON.stringify({ completed: report.results.length, total: plan.length }));
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    report.completedAt = new Date().toISOString();
    await writeFile(`${dir}/db-repair-${stamp}.json`, JSON.stringify(report, null, 2), { flag: "wx" });
    const counts = {};
    for (const item of report.results) counts[item.status] = (counts[item.status] || 0) + 1;
    console.log(JSON.stringify(counts));
    if (counts.error || counts.conflict) process.exitCode = 1;
  }
} finally { if (lock) { await lock.close(); await unlink(lockPath); } }
