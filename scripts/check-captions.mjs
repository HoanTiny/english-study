// Kiểm tra từng video trong listenVideos.ts có PHỤ ĐỀ (CC) hay không,
// rồi ghi cờ `cc: true/false` vào đúng dòng. Chạy: node scripts/check-captions.mjs
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../src/data/listenVideos.ts", import.meta.url);
const CV = "20.10.38";
const CTX = { client: { clientName: "ANDROID", clientVersion: CV } };
const UA = `com.google.android.youtube/${CV} (Linux; U; Android 14)`;

async function hasCaptions(id) {
  try {
    const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ context: CTX, videoId: id }),
    });
    if (!r.ok) return false;
    const d = await r.json();
    const tracks = d?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    return Array.isArray(tracks) && tracks.some((t) => (t.languageCode || "").startsWith("en"));
  } catch {
    return false;
  }
}

const src = await readFile(FILE, "utf8");
const lines = src.split("\n");
let okCount = 0;
let total = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(/\{ id: "([A-Za-z0-9_-]{11})",.*level: "(\w+)"(, cc: (?:true|false))? \}/);
  if (!m) continue;
  total++;
  const id = m[1];
  const cc = await hasCaptions(id);
  if (cc) okCount++;
  // chèn/cập nhật cc trước dấu " }"
  lines[i] = line.replace(/(level: "\w+")(?:, cc: (?:true|false))? \}/, `$1, cc: ${cc} }`);
  process.stdout.write(`${cc ? "✅" : "❌"} ${id}\n`);
}
await writeFile(FILE, lines.join("\n"), "utf8");
console.log(`\nĐã gắn cờ cc cho ${total} video — ${okCount} có phụ đề, ${total - okCount} không.`);
