import { NextRequest, NextResponse } from "next/server";
import { geminiConfigured, geminiGenerate } from "@/lib/server/gemini";
import { openaiCompatConfigured, openaiCompatVision } from "@/lib/server/openaiCompat";

export const runtime = "nodejs";

// Tra ảnh minh hoạ cho từ vựng từ Openverse (ảnh CC, miễn phí).
// Dùng Gemini biến (từ EN + nghĩa VI) → truy vấn ảnh RÕ NGHĨA để khử đa nghĩa
// (vd "chicken" + "con gà" → "hen chicken farm bird"). Cache RAM 7 ngày.

type Pic = { image: string; creator: string; license: string; licenseUrl: string; source: string; title: string };
type Result = { found: boolean; query: string; results: Pic[] };
const cache = new Map<string, Result>();
const queryCache = new Map<string, string>();
const stamp = new Map<string, number>();
const TTL = 7 * 24 * 60 * 60 * 1000;

const API = "https://api.openverse.org/v1/images/";

const QSYS = `Bạn tạo TRUY VẤN tìm ảnh tiếng Anh cho từ điển bằng hình.
Cho 1 từ tiếng Anh + nghĩa tiếng Việt, trả về DUY NHẤT một chuỗi 2–5 từ tiếng Anh thường, mô tả đúng nghĩa để tìm được ẢNH MINH HOẠ rõ ràng.
Khử đa nghĩa dựa vào nghĩa tiếng Việt (vd: chicken + "con gà" → "hen chicken bird"; chicken + "thịt gà" → "raw chicken meat").
Ưu tiên danh từ/vật thể cụ thể. KHÔNG dấu ngoặc, KHÔNG giải thích, chỉ trả chuỗi truy vấn.`;

async function buildQuery(en: string, vi: string): Promise<string> {
  const fallback = en;
  if (!vi) return fallback;
  const ck = `${en}|${vi}`;
  if (queryCache.has(ck)) return queryCache.get(ck)!;

  const userText = `Từ: ${en}\nNghĩa (vi): ${vi}`;
  let out = "";
  // Gemini trước; hết quota/lỗi → tự rớt sang Groq (openai-compat).
  if (geminiConfigured()) {
    try {
      out = await geminiGenerate([{ role: "user", parts: [{ text: userText }] }], { system: QSYS, temperature: 0 });
    } catch { /* thử provider kế */ }
  }
  if (!out && openaiCompatConfigured()) {
    try {
      out = await openaiCompatVision({ system: QSYS, text: userText, temperature: 0 });
    } catch { /* fallback từ gốc */ }
  }
  const q = (out || "").replace(/["'`\n]/g, " ").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 60) || fallback;
  queryCache.set(ck, q);
  return q;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const en = (sp.get("q") || "").trim().toLowerCase();
  const vi = (sp.get("vi") || "").trim();
  if (!en) return NextResponse.json({ error: "missing q" }, { status: 400 });

  const key = `${en}|${vi}`;
  const at = stamp.get(key);
  if (cache.has(key) && at && Date.now() - at < TTL) return NextResponse.json(cache.get(key));

  const empty: Result = { found: false, query: en, results: [] };
  try {
    const query = await buildQuery(en, vi);
    const url = `${API}?q=${encodeURIComponent(query)}&page_size=10&license_type=commercial&mature=false&category=photograph`;
    const res = await fetch(url, { headers: { "User-Agent": "SpeakUp-Learning/1.0 (educational)" } });
    if (!res.ok) { cache.set(key, empty); stamp.set(key, Date.now()); return NextResponse.json(empty); }
    const json = (await res.json()) as {
      results?: { thumbnail?: string; url?: string; creator?: string; license?: string; license_url?: string; foreign_landing_url?: string; title?: string }[];
    };
    const results: Pic[] = (json.results ?? [])
      .map((r) => ({
        image: r.thumbnail || r.url || "",
        creator: r.creator ?? "",
        license: (r.license ?? "").toUpperCase(),
        licenseUrl: r.license_url ?? "",
        source: r.foreign_landing_url ?? "",
        title: r.title ?? "",
      }))
      .filter((p) => p.image)
      .slice(0, 8);
    const data: Result = { found: results.length > 0, query, results };
    cache.set(key, data); stamp.set(key, Date.now());
    return NextResponse.json(data);
  } catch {
    cache.set(key, empty); stamp.set(key, Date.now());
    return NextResponse.json(empty);
  }
}
