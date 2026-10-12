// One-time, repeatable preparation. No paid APIs or Supabase writes.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cache = resolve(root, ".audio-cache");
const revision = "fba1236595f2d2bf21d414ba6e57d25256afada3";
const source = `https://raw.githubusercontent.com/hexgrad/misaki/${revision}`;
await mkdir(resolve(cache, "lexicon"), { recursive: true });
const previous = JSON.parse(await readFile(resolve(cache, "lexicon/revision.json"), "utf8").catch(error => {
  if (error.code === "ENOENT") return "{}";
  throw error;
}));
for (const name of ["us_gold.json", "gb_gold.json", "us_silver.json", "gb_silver.json", "LICENSE"]) {
  const target = resolve(cache, "lexicon", name);
  if (previous.sha === revision) {
    const existing = await readFile(target, "utf8").catch(() => "");
    if (existing) {
      try { if (name === "LICENSE" || Object.keys(JSON.parse(existing)).length > 1000) continue; } catch { /* Re-fetch a damaged cache file. */ }
    }
  }
  const url = `${source}/${name === "LICENSE" ? name : `misaki/data/${name}`}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Cannot download ${name}: HTTP ${response.status}`);
  const body = await response.text();
  if (name !== "LICENSE" && Object.keys(JSON.parse(body)).length < 1000) throw new Error(`Invalid lexicon: ${name}`);
  await writeFile(target, body);
  console.log(`Prepared ${name}`);
}
await writeFile(resolve(cache, "lexicon/revision.json"), JSON.stringify({ sha: revision, downloadedAt: new Date().toISOString() }, null, 2));
await mkdir(resolve(cache, "runtime"), { recursive: true });
await writeFile(resolve(cache, "runtime/package.json"), JSON.stringify({ private: true, type: "module", dependencies: { "kokoro-js": "1.2.1" } }, null, 2));
console.log("Lexicons ready. Install the local runtime once: npm --prefix .audio-cache/runtime install");
console.log("Then preview: node scripts/prepare-kokoro-audio.mjs");
