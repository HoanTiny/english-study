// Decode downloaded source recordings locally. This verifies file health, not human listening approval.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const dir = ".audio-cache/ipa-review";
const source = JSON.parse(await readFile(`${dir}/human-recordings.json`, "utf8"));
const selected = JSON.parse(await readFile(`${dir}/reviewed-selections.json`, "utf8"));
const report = JSON.parse(await readFile(`${dir}/validated-recordings.json`, "utf8").catch(() => '{"results":{}}'));
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const page = await browser.newPage();
  for (const row of selected.filter(x => x.audio.length)) {
    const key = `${row.word}|${row.accent}`, file = source.results[key];
    if (file?.status !== "downloaded" || !row.audio.some(a => a.file === file.file)) continue;
    const path = resolve(dir, file.path);
    if (!path.startsWith(resolve(dir, "human") + "/") && !path.startsWith(resolve(dir, "human") + "\\")) throw new Error("Invalid cached path");
    const bytes = await readFile(path), sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== file.sha256) throw new Error(`Changed audio: ${key}`);
    if (report.results[key]?.sha256 === sha256) continue;
    const result = await page.evaluate(async encoded => {
      try {
        const raw = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const context = new OfflineAudioContext(1, 1, 24000);
        const decoded = await context.decodeAudioData(raw.buffer);
        const samples = decoded.getChannelData(0);
        let peak = 0, sum = 0, clipped = 0;
        for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; if (Math.abs(sample) >= .999) clipped++; }
        return { duration: decoded.duration, peak, rms: Math.sqrt(sum / samples.length), clipped: clipped / samples.length, channels: decoded.numberOfChannels };
      } catch { return { error: "decode-failed" }; }
    }, bytes.toString("base64"));
    const valid = !result.error && result.duration >= .15 && result.duration <= 15 && result.peak > .005 && result.rms > .0005 && result.clipped < .05;
    report.results[key] = { sha256, file: file.file, valid, ...result };
  }
  report.updatedAt = new Date().toISOString();
  report.note = "Codec, duration, non-silence and clipping checks only; not human listening approval.";
  await writeFile(`${dir}/validated-recordings.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ checked: Object.keys(report.results).length, valid: Object.values(report.results).filter(x => x.valid).length, failed: Object.entries(report.results).filter(([, x]) => !x.valid).map(([key, x]) => ({ key, ...x })) }));
} finally { await browser.close(); }
