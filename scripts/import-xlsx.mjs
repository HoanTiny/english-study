// Import từ vựng từ 21 file .xlsx (mỗi file = 1 chủ đề) → src/data/vocab.json
// Cột: [en, pos, (điền khuyết), ipa, , , vi]. Chạy: node scripts/import-xlsx.mjs
import XLSX from "xlsx";
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";

const DIR = "C:/Users/Admin/OneDrive/Documents/English/Tài nguyên-20260531T053335Z-3-001/Tài nguyên";
const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"));
const out = [];
const perTopic = {};

for (const file of files) {
  const topic = file.replace(/\.xlsx$/i, "").trim();
  const wb = XLSX.readFile(DIR + "/" + file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  let n = 0;
  for (const r of rows) {
    const cells = r.map((c) => String(c).trim());
    const en = cells[0];
    if (!en || !/[a-zA-Z]/.test(en)) continue;
    if (/^(từ|word|english|tiếng anh)$/i.test(en)) continue; // header
    const pos = cells[1] && /^[a-z/ ]+$/i.test(cells[1]) && cells[1].length < 20 ? cells[1] : "";
    const ipa = cells.find((c) => /^\/.*\/$/.test(c)) || "";
    // nghĩa Việt: ô cuối cùng khác rỗng, khác en/pos/ipa
    const vi = [...cells].reverse().find((c) => c && c !== en && c !== pos && c !== ipa && !/^\/.*\/$/.test(c)) || "";
    if (!vi) continue;
    out.push({ en, vi, ipa: ipa || undefined, pos, topic });
    n++;
  }
  perTopic[topic] = n;
}

mkdirSync(root + "/src/data", { recursive: true });
writeFileSync(root + "/src/data/vocab.json", JSON.stringify(out, null, 0));
console.log("Tổng từ:", out.length, "| số chủ đề:", files.length);
Object.entries(perTopic).forEach(([t, n]) => console.log("  " + t + ": " + n));
