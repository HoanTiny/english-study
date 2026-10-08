export type TranscriptSegment = { text: string; start: number; dur: number };
export type ImportedTranscript = { format: "srt" | "vtt" | "youtube"; segments: TranscriptSegment[]; estimatedLastEnd: boolean };
export const MAX_SUBTITLE_BYTES = 1024 * 1024;
export const MAX_SEGMENTS = 2000;

export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    if (host === "youtu.be" && path.length === 1) id = path[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (["embed", "shorts", "live"].includes(path[0]) && path.length === 2) id = path[1];
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function cleanCaption(value: string): string {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/<[^>]*>/g, "").replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, key: string) => {
    if (!key.startsWith("#")) return entities[key.toLowerCase()] ?? match;
    const code = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "";
  }).replace(/\s+/g, " ").trim();
}

function timestamp(value: string): number {
  const parts = value.replace(",", ".").split(":").map(Number);
  const seconds = parts.at(-1)!;
  if (parts.length < 2 || parts.length > 3 || parts.some(n => !Number.isFinite(n) || n < 0)
    || seconds >= 60 || (parts.length === 3 && parts[1] >= 60)) throw new Error("Mốc thời gian không hợp lệ.");
  const result = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + seconds : parts[0] * 60 + seconds;
  if (result > 86400) throw new Error("Chỉ hỗ trợ phụ đề trong 24 giờ đầu của video.");
  return result;
}

/** Validate data from files, the API, or browser storage before passing it to the player. */
export function validateSegments(input: unknown): TranscriptSegment[] {
  if (!Array.isArray(input) || !input.length || input.length > MAX_SEGMENTS) throw new Error(`Phụ đề phải có từ 1 đến ${MAX_SEGMENTS} đoạn.`);
  let lastStart = -1;
  return input.map((row: TranscriptSegment, index) => {
    if (!row || typeof row.text !== "string" || !row.text.trim() || row.text.length > 4000
      || !Number.isFinite(row.start) || !Number.isFinite(row.dur) || row.start < 0 || row.dur <= 0
      || row.start + row.dur > 86400 || row.start < lastStart) throw new Error(`Đoạn ${index + 1} có nội dung hoặc thời gian không hợp lệ.`);
    lastStart = row.start;
    return { text: row.text.trim(), start: row.start, dur: row.dur };
  });
}

/** Keeps cue timings intact; untimed prose is rejected instead of inventing alignment. */
export function parseSubtitles(raw: string): ImportedTranscript {
  if (new TextEncoder().encode(raw).length > MAX_SUBTITLE_BYTES) throw new Error("Phụ đề quá lớn. Chọn nội dung tối đa 1 MB.");
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) throw new Error("Hãy chọn file hoặc dán phụ đề có mốc thời gian.");
  if (text.includes("-->")) {
    const format = /^WEBVTT(?:\s|$)/.test(text) ? "vtt" : "srt";
    const segments: TranscriptSegment[] = [];
    for (const block of text.split(/\n[ \t]*\n/)) {
      const lines = block.split("\n").map(line => line.trim());
      if (format === "vtt" && /^(WEBVTT(?:\s|$)|NOTE(?:\s|$)|STYLE$|REGION$)/.test(lines[0])) continue;
      const at = lines.findIndex(line => line.includes("-->"));
      const timing = at >= 0 && at <= 1 ? lines[at].match(/^(\d{1,3}:\d{2}(?::\d{2})?[.,]\d{3})\s+-->\s+(\d{1,3}:\d{2}(?::\d{2})?[.,]\d{3})(?:\s+.*)?$/) : null;
      if (!timing) throw new Error(`Định dạng phụ đề không hợp lệ gần đoạn ${segments.length + 1}.`);
      if (lines.slice(at + 1).some(line => line.includes("-->"))) throw new Error("Các đoạn SRT/VTT cần cách nhau bằng một dòng trống.");
      const start = timestamp(timing[1]), end = timestamp(timing[2]);
      const content = cleanCaption(lines.slice(at + 1).join(" "));
      segments.push({ text: content, start, dur: end - start });
    }
    return { format, segments: validateSegments(segments), estimatedLastEnd: false };
  }
  const cues: { start: number; text: string }[] = [];
  for (const line of text.split("\n").map(line => line.trim()).filter(Boolean)) {
    const timed = line.match(/^(\d{1,3}:\d{2}(?::\d{2})?)(?:\s+(.*))?$/);
    if (timed) cues.push({ start: timestamp(timed[1]), text: timed[2] ?? "" });
    else if (cues.length) cues[cues.length - 1].text += ` ${line}`;
    else throw new Error("Thiếu mốc thời gian. Dán bản chép YouTube còn các dòng 0:00, 0:05… hoặc chọn file SRT/VTT.");
  }
  const segments = cues.map((cue, index) => ({ text: cleanCaption(cue.text), start: cue.start,
    dur: index + 1 < cues.length ? cues[index + 1].start - cue.start : Math.min(15, Math.max(2, cleanCaption(cue.text).split(/\s+/).length / 2.5)) }));
  return { format: "youtube", segments: validateSegments(segments), estimatedLastEnd: true };
}

type CachedTranscript = { videoId: string; segments: TranscriptSegment[]; label: string; estimatedLastEnd: boolean };
const cacheKey = (userId: string, videoId: string) => `speakup.dictation-transcript.${userId}.${videoId}`;
export function readTranscript(storage: Pick<Storage, "getItem">, userId: string, videoId: string): CachedTranscript | null {
  try {
    const raw = storage.getItem(cacheKey(userId, videoId));
    if (!raw || raw.length > MAX_SUBTITLE_BYTES * 2) return null;
    const row = JSON.parse(raw);
    if (row.version !== 1 || row.userId !== userId || row.videoId !== videoId || typeof row.label !== "string" || row.label.length > 100) return null;
    return { videoId, label: row.label, estimatedLastEnd: row.estimatedLastEnd === true, segments: validateSegments(row.segments) };
  } catch { return null; }
}
export function storeTranscript(storage: Pick<Storage, "setItem">, userId: string, data: CachedTranscript): boolean {
  try {
    const segments = validateSegments(data.segments);
    const raw = JSON.stringify({ ...data, segments, version: 1, userId });
    if (raw.length > MAX_SUBTITLE_BYTES * 2) return false;
    storage.setItem(cacheKey(userId, data.videoId), raw);
    return true;
  } catch { return false; }
}
export function deleteTranscript(storage: Pick<Storage, "removeItem">, userId: string, videoId: string) {
  storage.removeItem(cacheKey(userId, videoId));
}
