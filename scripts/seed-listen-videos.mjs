// Đổ video luyện nghe từ src/data/listenVideos.ts vào bảng listen_videos (Supabase).
// Cần SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL trong .env.local.
// Chạy: node scripts/seed-listen-videos.mjs
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

async function loadEnv() {
  try {
    const txt = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* không có .env.local → dùng env hệ thống */
  }
}

await loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const src = await readFile(new URL("../src/data/listenVideos.ts", import.meta.url), "utf8");
const rows = [];
let topic = null;
let order = 0;
for (const line of src.split("\n")) {
  const tk = line.match(/key:\s*"([^"]+)"/);
  if (tk) {
    topic = tk[1];
    order = 0;
    continue;
  }
  const vm = line.match(/\{ id: "([^"]+)", title: "([^"]*)", channel: "([^"]*)", level: "([^"]+)"(?:, cc: (true|false))? \}/);
  if (vm && topic) {
    rows.push({
      video_id: vm[1],
      title: vm[2],
      channel: vm[3],
      topic,
      level: vm[4],
      cc: vm[5] === "true",
      hidden: false,
      sort_order: order++,
    });
  }
}

console.log(`Tìm thấy ${rows.length} video. Đang đổ vào DB…`);
const db = createClient(url, key, { auth: { persistSession: false } });
const { error } = await db.from("listen_videos").upsert(rows, { onConflict: "video_id" });
if (error) {
  console.error("Lỗi:", error.message);
  process.exit(1);
}
console.log(`✅ Đã seed ${rows.length} video vào listen_videos.`);
