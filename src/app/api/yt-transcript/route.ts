import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { geminiGenerate, geminiConfigured } from "@/lib/server/gemini";

// Lấy phụ đề (transcript) của 1 video YouTube CÓ caption, để làm bài chép chính tả.
// Ưu tiên định dạng srv3 (có MỐC THỜI GIAN TỪNG TỪ) → gom câu & dừng chính xác.
// Lưu ý: dùng nguồn không chính thức (timedtext) — chỉ phục vụ học cá nhân.

export const runtime = "nodejs";

const CLIENT_VERSION = "20.10.38";
const INNERTUBE_CONTEXT = { client: { clientName: "ANDROID", clientVersion: CLIENT_VERSION } };
const INNERTUBE_UA = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`;

type Word = { w: string; t: number }; // t: giây (tuyệt đối)

function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname === "youtu.be") return u.pathname.slice(1, 12) || null;
    const v = u.searchParams.get("v");
    if (v) return v.slice(0, 11);
    const m = u.pathname.match(/\/(embed|shorts)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch {
    /* không phải URL */
  }
  return null;
}

function decode(s: string) {
  return s
    .replace(/&amp;#39;|&#39;/g, "'")
    .replace(/&amp;quot;|&quot;/g, '"')
    .replace(/&amp;#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Lấy danh sách track + chọn track tiếng Anh (hoặc track đầu), trả baseUrl.
async function getCaptionBaseUrl(id: string): Promise<string | null> {
  const resp = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": INNERTUBE_UA },
    body: JSON.stringify({ context: INNERTUBE_CONTEXT, videoId: id }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const tracks: { baseUrl?: string; languageCode?: string }[] =
    data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) return null;
  const en = tracks.find((t) => (t.languageCode || "").startsWith("en"));
  return (en ?? tracks[0]).baseUrl ?? null;
}

// Parse srv3: <p t="ms" d="ms"><s ac>word</s><s t="off">word</s>...</p> → từng từ kèm mốc tuyệt đối.
function parseSrv3(xml: string): Word[] {
  const words: Word[] = [];
  const pRe = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  const sRe = /<s(?:\s+t="(\d+)")?[^>]*>([^<]*)<\/s>/g;
  let p: RegExpExecArray | null;
  while ((p = pRe.exec(xml)) !== null) {
    const pStart = parseInt(p[1], 10);
    const inner = p[3];
    let s: RegExpExecArray | null;
    let any = false;
    while ((s = sRe.exec(inner)) !== null) {
      const off = s[1] ? parseInt(s[1], 10) : 0;
      const raw = decode(s[2]).trim();
      if (!raw) continue;
      for (const tok of raw.split(/\s+/)) {
        if (tok) words.push({ w: tok, t: (pStart + off) / 1000 });
        any = true;
      }
    }
    // Phụ đề thủ công (không có <s t>): lấy cả <p> làm 1 mốc thời gian
    if (!any) {
      const plain = decode(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      for (const tok of plain.split(/\s+/)) if (tok) words.push({ w: tok, t: pStart / 1000 });
    }
  }
  return words;
}

// Dự phòng: dùng youtube-transcript (chỉ có mốc theo CUE) → chia đều theo từ.
async function fallbackWords(id: string): Promise<Word[]> {
  const raw = await YoutubeTranscript.fetchTranscript(id, { lang: "en" }).catch(() =>
    YoutubeTranscript.fetchTranscript(id),
  );
  const words: Word[] = [];
  for (const c of raw ?? []) {
    const txt = decode((c.text || "").replace(/\s+/g, " ")).trim();
    if (!txt) continue;
    const parts = txt.split(/\s+/).filter(Boolean);
    const start = (c.offset || 0) / 1000;
    const dur = (c.duration || 0) / 1000 || 0.6;
    parts.forEach((w, i) => words.push({ w, t: start + (dur * i) / Math.max(1, parts.length) }));
  }
  return words;
}

const ABBR = new Set(["mr", "mrs", "ms", "dr", "st", "vs", "etc", "jr", "sr", "no", "fig"]);
function endsSentence(word: string) {
  if (!/[.!?]["')\]]?$/.test(word)) return false;
  const bare = word.replace(/[.!?"')\]]+$/, "").toLowerCase();
  if (bare.length <= 1) return false;
  if (ABBR.has(bare)) return false;
  return true;
}
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

// Gán mốc dừng (= lúc câu kế tiếp bắt đầu) cho danh sách câu đã chia.
function withTiming(sents: { text: string; start: number }[], lastT: number) {
  return sents.map((s, i) => {
    const next = sents[i + 1];
    const end = next ? next.start : lastT + 1.5;
    return { text: s.text, start: s.start, dur: Math.max(0.6, end - s.start) };
  });
}

// Heuristic: gom từ thành câu theo dấu .?! / nhịp nghỉ / độ dài (khi không có Gemini).
function toSentencesHeuristic(words: Word[]) {
  const sents: { text: string; start: number }[] = [];
  let cur: string[] = [];
  let curStart = 0;
  for (let i = 0; i < words.length; i++) {
    const { w, t } = words[i];
    if (cur.length === 0) curStart = t;
    cur.push(w);
    const next = words[i + 1];
    const gap = next ? next.t - t : Infinity;
    const close = endsSentence(w) || cur.length >= 13 || (cur.length >= 5 && gap > 0.8) || !next;
    if (close) {
      sents.push({ text: cur.join(" "), start: curStart });
      cur = [];
    }
  }
  return withTiming(sents, words.length ? words[words.length - 1].t : 0);
}

// Dùng Gemini chấm câu cho phụ đề ASR (không dấu câu), rồi map về timestamp theo TỪNG TỪ.
async function toSentencesGemini(words: Word[]) {
  const text = words.map((w) => w.w).join(" ");
  const out = await geminiGenerate(
    [{ role: "user", parts: [{ text }] }],
    {
      jsonMode: true,
      temperature: 0,
      system:
        "Bạn chia một đoạn transcript thô (có thể không dấu câu, không viết hoa) thành các CÂU tự nhiên. " +
        "QUY TẮC BẮT BUỘC: giữ NGUYÊN tất cả các từ theo đúng thứ tự; KHÔNG thêm, bớt, gộp hay đổi bất kỳ từ nào; " +
        "chỉ được thêm dấu câu và viết hoa. Trả về JSON dạng {\"sentences\": string[]}, mỗi phần tử là MỘT câu.",
    },
  );
  let sentences: string[];
  try {
    const parsed = JSON.parse(out);
    sentences = Array.isArray(parsed) ? parsed : parsed.sentences;
    if (!Array.isArray(sentences) || sentences.length === 0) throw new Error("empty");
  } catch {
    return null;
  }

  // Map mỗi câu về vị trí từ thật: khớp từ đầu câu trong cửa sổ nhỏ để chống lệch.
  const normWords = words.map((w) => norm(w.w));
  const sents: { text: string; start: number }[] = [];
  let p = 0;
  for (const sentence of sentences) {
    const toks = sentence.split(/\s+/).map(norm).filter(Boolean);
    if (toks.length === 0) continue;
    let sp = p;
    for (let j = p; j <= Math.min(p + 4, normWords.length - 1); j++) {
      if (normWords[j] === toks[0]) { sp = j; break; }
    }
    sp = Math.min(sp, Math.max(0, words.length - 1));
    sents.push({ text: sentence.trim(), start: words[sp].t });
    p = sp + toks.length;
  }
  if (sents.length === 0) return null;
  return withTiming(sents, words.length ? words[words.length - 1].t : 0);
}

// Lấy tiêu đề & kênh qua oEmbed (không cần API key).
async function getMeta(id: string): Promise<{ title: string; channel: string }> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        "https://www.youtube.com/watch?v=" + id,
      )}&format=json`,
    );
    if (!r.ok) return { title: "", channel: "" };
    const d = await r.json();
    return { title: d.title ?? "", channel: d.author_name ?? "" };
  } catch {
    return { title: "", channel: "" };
  }
}

// Bộ nhớ tạm theo video để khỏi gọi Gemini lại trong phiên.
const cache = new Map<
  string,
  { count: number; source: string; title: string; channel: string; segments: ReturnType<typeof withTiming> }
>();

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("v") ?? "";
  const id = parseVideoId(q);
  if (!id) return NextResponse.json({ error: "Link/ID video không hợp lệ." }, { status: 400 });

  try {
    let words: Word[] = [];
    let source = "srv3";
    try {
      const baseUrl = await getCaptionBaseUrl(id);
      if (baseUrl) {
        const url = baseUrl.replace(/&fmt=\w+/, "") + "&fmt=srv3";
        const r = await fetch(url, { headers: { "User-Agent": INNERTUBE_UA } });
        if (r.ok) words = parseSrv3(await r.text());
      }
    } catch {
      /* rơi xuống fallback */
    }
    if (words.length === 0) {
      words = await fallbackWords(id);
      source = "cue";
    }
    if (words.length === 0) {
      return NextResponse.json({ error: "Video này không có phụ đề khả dụng." }, { status: 404 });
    }

    const cached = cache.get(id);
    if (cached) return NextResponse.json({ id, ...cached });

    // Chấm câu bằng Gemini (chính xác ranh giới câu); lỗi/quá dài → heuristic.
    let segments = null as ReturnType<typeof withTiming> | null;
    if (geminiConfigured() && words.length <= 800) {
      try {
        segments = await toSentencesGemini(words);
        if (segments) source = `${source}+gemini`;
      } catch {
        segments = null;
      }
    }
    if (!segments) segments = toSentencesHeuristic(words);

    const meta = await getMeta(id);
    const payload = { count: segments.length, source, ...meta, segments };
    cache.set(id, payload);
    return NextResponse.json({ id, ...payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không lấy được phụ đề.";
    return NextResponse.json(
      { error: `Không lấy được phụ đề (${msg}). Video có thể đã tắt phụ đề hoặc bị chặn.` },
      { status: 502 },
    );
  }
}
