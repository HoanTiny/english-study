// Kiểm tra cấp độ từ vựng: với mỗi bài trong src/lib/lessons.ts, dò xem câu mẫu
// có từ nào VƯỢT cấp độ CEFR của bài hay không, dựa trên CEFR-J Wordlist.
//
// Chạy: node scripts/lint-cefr.mjs
// Chỉ là công cụ QA khi soạn bài — không nằm trong bundle gửi client.
//
// Nguồn dữ liệu: CEFR-J Wordlist v1.5 (Yukio Tono, TUFS) — xem data/README.md.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const rank = (lvl) => ORDER.indexOf(lvl);

// Trần cấp độ cho phép theo chuỗi cefr trong lessons.ts.
function ceilingFor(cefr) {
  const c = cefr.toUpperCase();
  if (c.startsWith("A1")) return "A1";
  if (c.startsWith("A2")) return "A2";
  if (c === "B1") return "B1";
  if (c.startsWith("B1+") || c.startsWith("B2")) return "B2";
  return "B2";
}

// --- Nạp CEFR-J wordlist → Map(word → cấp độ THẤP nhất xuất hiện) ---
function loadWordLevels() {
  const csv = readFileSync(join(root, "data/cefrj-vocabulary-profile-1.5.csv"), "utf8");
  const lines = csv.split(/\r?\n/).slice(1); // bỏ header
  const map = new Map();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [headword, , cefrRaw] = line.split(",");
    const cefr = (cefrRaw || "").trim().toUpperCase();
    if (rank(cefr) < 0) continue;
    // headword có thể là biến thể ngăn bởi "/": a.m./A.M./am/AM
    for (const variant of headword.split("/")) {
      const w = variant.trim().toLowerCase();
      if (!w) continue;
      const cur = map.get(w);
      if (cur === undefined || rank(cefr) < rank(cur)) map.set(w, cefr);
    }
  }
  return map;
}

// --- Trích các bài + chuỗi tiếng Anh từ lessons.ts ---
function loadLessons() {
  const src = readFileSync(join(root, "src/lib/lessons.ts"), "utf8");
  const slugRe = /slug:\s*"([^"]+)"/g;
  const marks = [];
  let m;
  while ((m = slugRe.exec(src))) marks.push({ pos: m.index, slug: m[1] });
  const lessons = [];
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].pos : src.length;
    const chunk = src.slice(marks[i].pos, end);
    const cefr = (chunk.match(/cefr:\s*"([^"]+)"/) || [])[1] || "?";
    const texts = [];
    for (const mm of chunk.matchAll(/\b(?:en|example):\s*"((?:[^"\\]|\\.)*)"/g)) {
      texts.push(mm[1]);
    }
    lessons.push({ slug: marks[i].slug, cefr, texts });
  }
  return lessons;
}

// Tách từ, bỏ placeholder "…", số, dấu câu. Giữ dạng nguyên (không lemmatize).
function tokenize(text) {
  return text
    .replace(/…|\.\.\./g, " ")
    .toLowerCase()
    .match(/[a-z']+/g) || [];
}

// Tra cấp độ của 1 từ, có xét dạng gốc (giảm dương tính giả do V-ing/-ed/-ly/số nhiều).
// Trả về cấp THẤP nhất tìm được trong số: từ gốc + các dạng rút gọn hình thái.
function lookupLevel(levels, word) {
  const cands = new Set([word]);
  const add = (w) => w.length >= 2 && cands.add(w);
  if (word.endsWith("ing")) {
    add(word.slice(0, -3)); // running→runn? → thêm cả +e và gấp đôi phụ âm
    add(word.slice(0, -3) + "e"); // making→make
    add(word.slice(0, -4)); // running→runn→run (bỏ phụ âm gấp đôi)
  }
  if (word.endsWith("ed")) {
    add(word.slice(0, -2));
    add(word.slice(0, -1)); // liked→like
    add(word.slice(0, -3)); // stopped→stop
  }
  if (word.endsWith("ly")) add(word.slice(0, -2)); // quickly→quick
  if (word.endsWith("ier")) add(word.slice(0, -3) + "y"); // happier→happy
  if (word.endsWith("est")) add(word.slice(0, -3));
  if (word.endsWith("er")) add(word.slice(0, -2));
  if (word.endsWith("ies")) add(word.slice(0, -3) + "y"); // countries→country
  if (word.endsWith("es")) add(word.slice(0, -2));
  if (word.endsWith("s")) add(word.slice(0, -1));
  let best;
  for (const c of cands) {
    const lvl = levels.get(c);
    if (lvl && (best === undefined || rank(lvl) < rank(best))) best = lvl;
  }
  return best;
}

// Bỏ qua: từ chức năng siêu phổ biến + đại từ/tên riêng hay gặp (giảm nhiễu).
const IGNORE = new Set([
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours",
  "a", "an", "the", "to", "of", "in", "on", "at", "is", "am", "are", "be",
  "and", "or", "but", "so", "if", "not", "no", "yes", "do", "does", "did",
  "s", "t", "m", "re", "ll", "ve", "d", "ok", "okay",
  "nam", "linh", "mai", "minh", "hanoi", "vietnam", "tokyo", "danang", "hue",
]);

function main() {
  const levels = loadWordLevels();
  const lessons = loadLessons();
  let totalFlags = 0;

  console.log(`CEFR-J: ${levels.size} từ · ${lessons.length} bài\n`);

  for (const lesson of lessons) {
    const ceil = ceilingFor(lesson.cefr);
    const over = new Map(); // word → level
    for (const text of lesson.texts) {
      for (const w of tokenize(text)) {
        if (IGNORE.has(w)) continue;
        const lvl = lookupLevel(levels, w);
        if (lvl && rank(lvl) > rank(ceil)) over.set(w, lvl);
      }
    }
    if (over.size > 0) {
      totalFlags += over.size;
      const list = [...over.entries()]
        .sort((a, b) => rank(b[1]) - rank(a[1]))
        .map(([w, l]) => `${w}(${l})`)
        .join(", ");
      console.log(`⚠️  ${lesson.slug} [trần ${ceil}] — ${over.size} từ vượt cấp: ${list}`);
    }
  }

  console.log(
    totalFlags === 0
      ? "\n✅ Không có từ nào vượt cấp độ bài (theo CEFR-J)."
      : `\nTổng: ${totalFlags} từ vượt cấp (chỉ là gợi ý rà soát — từ ngoài danh sách được bỏ qua).`,
  );
}

main();
