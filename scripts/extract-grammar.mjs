// Phân tích câu giao tiếp (từ _sentences.json) → rút CẤU TRÚC CÂU phổ biến bằng Gemini.
// Ghi src/data/grammar.json. Chạy: node scripts/extract-grammar.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
function env(k) {
  const m = readFileSync(root + "/.env.local", "utf8").match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}
const KEY = env("GEMINI_API_KEY");
if (!KEY) { console.error("Thiếu GEMINI_API_KEY"); process.exit(1); }
const API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + encodeURIComponent(KEY);

const sentences = JSON.parse(readFileSync(root + "/_sentences.json", "utf8"));

const SYSTEM = `Bạn là giáo viên tiếng Anh giao tiếp cho người Việt. Phân tích danh sách câu và rút ra các CẤU TRÚC CÂU (sentence patterns) phổ biến, tái sử dụng được, dựa trên ngữ pháp chuẩn.
Mỗi cấu trúc trả về object: {
 "structure": "khung tiếng Anh, dùng [...] cho phần thay thế được, vd: I'd like to [verb]",
 "vi": "giải thích NGẮN cách dùng bằng tiếng Việt",
 "example": "MỘT câu tiếng Anh mẫu (ưu tiên lấy từ danh sách)",
 "exampleVi": "nghĩa tiếng Việt của câu mẫu",
 "level": "A1 | A2 | B1"
}
Quy tắc: GỘP các câu cùng khung thành 1 cấu trúc; chỉ lấy cấu trúc thực sự hữu ích/tái dùng; tối đa 7 cấu trúc mỗi lô; KHÔNG trùng lặp. Trả về DUY NHẤT mảng JSON.`;

async function extract(batch) {
  const list = batch.map((s) => `- ${s.en} (${s.vi})`).join("\n");
  const body = {
    contents: [{ role: "user", parts: [{ text: "Câu:\n" + list }] }],
    systemInstruction: { parts: [{ text: SYSTEM }] },
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
  };
  for (let a = 1; a <= 4; a++) {
    const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const j = await res.json();
      const txt = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "[]";
      return JSON.parse(txt);
    }
    if (res.status === 503 || res.status === 429) { await new Promise((r) => setTimeout(r, 1000 * a)); continue; }
    throw new Error("Gemini " + res.status);
  }
  return [];
}

const BATCH = 55;
const map = new Map(); // key = structure normalized
for (let i = 0; i < sentences.length; i += BATCH) {
  try {
    const arr = await extract(sentences.slice(i, i + BATCH));
    for (const s of arr) {
      if (!s.structure || !s.vi) continue;
      const key = s.structure.toLowerCase().replace(/[^a-z[\]]/g, "");
      if (!map.has(key)) map.set(key, { structure: s.structure, vi: s.vi, example: s.example || "", exampleVi: s.exampleVi || "", level: /^(A1|A2|B1)$/.test(s.level) ? s.level : "A2" });
    }
    console.log(`Lô ${Math.min(i + BATCH, sentences.length)}/${sentences.length} · tổng cấu trúc=${map.size}`);
  } catch (e) { console.error("Lỗi lô", i, e.message); }
}

const out = [...map.values()];
mkdirSync(root + "/src/data", { recursive: true });
writeFileSync(root + "/src/data/grammar.json", JSON.stringify(out, null, 0));
console.log("Xong:", out.length, "cấu trúc → src/data/grammar.json");
