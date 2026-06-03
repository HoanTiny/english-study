// Seed câu ví dụ cho toàn bộ từ trong bảng IPA vào DB (qua route /api/word-example).
// Yêu cầu: dev server đang chạy ở localhost:3000 + đã chạy db/migrate_word_examples.sql.
// Chạy: node scripts/seed-word-examples.mjs
import { readFile } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const src = await readFile(new URL("../src/data/ipa.ts", import.meta.url), "utf8");
const words = new Set();
for (const m of src.matchAll(/words:\s*\[([^\]]+)\]/g)) {
  for (const w of m[1].split(",")) {
    const clean = w.trim().replace(/^["']|["']$/g, "").toLowerCase();
    if (/^[a-z][a-z'’-]*$/.test(clean)) words.add(clean);
  }
}
const list = [...words];
console.log(`Tìm thấy ${list.length} từ. Bắt đầu seed…`);

let gen = 0, db = 0, fail = 0;
for (let i = 0; i < list.length; i++) {
  const w = list[i];
  try {
    const r = await fetch(`${BASE}/api/word-example?w=${encodeURIComponent(w)}`);
    const d = await r.json();
    if (d.en) {
      if (d.source === "db") db++;
      else gen++;
      process.stdout.write(`${String(i + 1).padStart(3)}/${list.length} ${d.source === "db" ? "•" : "✓"} ${w}: ${d.en.slice(0, 50)}\n`);
    } else {
      fail++;
      process.stdout.write(`${String(i + 1).padStart(3)}/${list.length} ✗ ${w}: (không có câu)\n`);
    }
  } catch (e) {
    fail++;
    process.stdout.write(`${String(i + 1).padStart(3)}/${list.length} ✗ ${w}: ${e.message}\n`);
  }
  await new Promise((res) => setTimeout(res, 700)); // né rate-limit Gemini
}
console.log(`\nXong. Sinh mới: ${gen} · đã có sẵn: ${db} · lỗi: ${fail}`);
