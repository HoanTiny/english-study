import { guardPaidApi } from "@/lib/server/apiGuard";
import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript, YoutubeTranscriptTooManyRequestError, YoutubeTranscriptNotAvailableLanguageError } from "youtube-transcript";
import { parseYouTubeId, validateSegments } from "@/lib/transcript";

// Lấy phụ đề (transcript) của 1 video YouTube CÓ caption, để làm bài chép chính tả.
// Ưu tiên định dạng srv3 (có MỐC THỜI GIAN TỪNG TỪ) → gom câu & dừng chính xác.
// Lưu ý: dùng nguồn không chính thức (timedtext) — chỉ phục vụ học cá nhân.

export const runtime = "nodejs";

const CLIENT_VERSION = "20.10.38";
const INNERTUBE_CONTEXT = { client: { clientName: "ANDROID", clientVersion: CLIENT_VERSION } };
const INNERTUBE_UA = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`;

type Word = { w: string; t: number }; // t: giây (tuyệt đối)

function decode(s: string) {
  return s
    .replace(/&amp;#39;|&#39;/g, "'")
    .replace(/&amp;quot;|&quot;/g, '"')
    .replace(/&amp;#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Select English captions only; a different language is not an English dictation answer.
async function getCaptionBaseUrl(id: string, fetcher: typeof fetch): Promise<string | null> {
  const resp = await fetcher("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
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
  return en?.baseUrl ?? null;
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
async function fallbackWords(id: string, fetcher: typeof fetch): Promise<Word[]> {
  // youtube-transcript 1.3.1 returns milliseconds for srv3 but seconds for classic XML.
  // Inspect the actual caption format; never guess the unit from the size of an offset.
  let factor = 0.001;
  const captionFetch: typeof fetch = async (input, init) => {
    const response = await fetcher(input, init);
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.pathname.endsWith("/timedtext") && response.ok) {
      const body = await response.clone().text();
      if (/<text\s[^>]*start=/.test(body)) factor = 1;
    }
    return response;
  };
  const raw = await YoutubeTranscript.fetchTranscript(id, { lang: "en", fetch: captionFetch });
  const words: Word[] = [];
  for (const c of raw ?? []) {
    const txt = decode((c.text || "").replace(/\s+/g, " ")).trim();
    if (!txt) continue;
    const parts = txt.split(/\s+/).filter(Boolean);
    const start = (c.offset || 0) * factor;
    const dur = (c.duration || 0) * factor || 0.6;
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

// Gán mốc dừng (= lúc câu kế tiếp bắt đầu) cho danh sách câu đã chia.
function withTiming(sents: { text: string; start: number }[], lastT: number) {
  return sents.map((s, i) => {
    const next = sents[i + 1];
    const end = next ? next.start : lastT + 1.5;
    return { text: s.text, start: s.start, dur: Math.max(0.6, end - s.start) };
  });
}

// Gom từ thành câu theo dấu .?! / nhịp nghỉ / độ dài, giữ nguyên nội dung phụ đề.
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

// Lấy tiêu đề & kênh qua oEmbed (không cần API key).
async function getMeta(id: string, signal: AbortSignal): Promise<{ title: string; channel: string }> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        "https://www.youtube.com/watch?v=" + id,
      )}&format=json`, { signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) },
    );
    if (!r.ok) return { title: "", channel: "" };
    const d = await r.json();
    return { title: d.title ?? "", channel: d.author_name ?? "" };
  } catch {
    return { title: "", channel: "" };
  }
}

// Bound memory and avoid contacting YouTube again for a recently successful request.
const cache = new Map<
  string,
  { at: number; payload: { count: number; source: string; title: string; channel: string; estimatedLastEnd: boolean; segments: ReturnType<typeof withTiming> } }
>();

export async function GET(req: NextRequest) {
  const denied = await guardPaidApi(req);
  if (denied) return denied;
  const q = req.nextUrl.searchParams.get("v") ?? "";
  const id = parseYouTubeId(q);
  if (!id) return NextResponse.json({ error: "Link/ID video không hợp lệ." }, { status: 400 });
  const cached = cache.get(id);
  if (cached && Date.now() - cached.at < 3600000) return NextResponse.json({ id, ...cached.payload });
  const deadline = AbortSignal.timeout(15000);
  const signal = AbortSignal.any([req.signal, deadline]);
  let blocked = false;
  const fetcher: typeof fetch = async (input, init) => {
    const response = await fetch(input, { ...init, signal, cache: "no-store" });
    if (response.status === 403 || response.status === 429) blocked = true;
    return response;
  };
  try {
    let words: Word[] = [];
    let source = "srv3";
    try {
      const baseUrl = await getCaptionBaseUrl(id, fetcher);
      if (baseUrl) {
        const url = baseUrl.replace(/&fmt=\w+/, "") + "&fmt=srv3";
        const r = await fetcher(url, { headers: { "User-Agent": INNERTUBE_UA } });
        if (r.ok) words = parseSrv3(await r.text());
      }
    } catch {
      /* rơi xuống fallback */
    }
    if (words.length === 0) {
      words = await fallbackWords(id, fetcher);
      source = "cue";
    }
    if (words.length === 0) {
      throw new Error("No readable caption data");
    }
    const segments = validateSegments(toSentencesHeuristic(words));
    const meta = await getMeta(id, signal);
    const payload = { count: segments.length, source, ...meta, estimatedLastEnd: true, segments };
    if (cache.size >= 50) cache.delete(cache.keys().next().value!);
    cache.set(id, { at: Date.now(), payload });
    return NextResponse.json({ id, ...payload });
  } catch (e) {
    const code = deadline.aborted ? "timeout" : blocked || e instanceof YoutubeTranscriptTooManyRequestError ? "blocked"
      : e instanceof YoutubeTranscriptNotAvailableLanguageError ? "language_unavailable" : "unavailable";
    const messages = {
      timeout: "YouTube phản hồi quá lâu. Hãy dán bản chép có thời gian hoặc chọn file SRT/VTT.",
      blocked: "YouTube đang từ chối yêu cầu tải tự động. Bạn vẫn có thể nhập phụ đề để luyện.",
      language_unavailable: "Chưa tải được phụ đề tiếng Anh. Hãy chọn bản chép tiếng Anh trên YouTube hoặc nhập file SRT/VTT.",
      unavailable: "Chưa lấy được phụ đề tự động; điều này không xác nhận video đã tắt CC. Hãy mở YouTube để sao chép bản chép hoặc nhập file SRT/VTT.",
    };
    return NextResponse.json(
      { error: messages[code], code },
      { status: code === "timeout" ? 504 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
