import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

// Lấy phụ đề (transcript) của 1 video YouTube CÓ caption, để làm bài chép chính tả.
// Lưu ý: dùng nguồn không chính thức (timedtext) — chỉ phục vụ học cá nhân.
// Video không bật phụ đề / YouTube đổi cơ chế → có thể không lấy được.

export const runtime = "nodejs";

function parseVideoId(input: string): string | null {
  const s = input.trim();
  // ID thuần (11 ký tự)
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname === "youtu.be") return u.pathname.slice(1, 12) || null;
    const v = u.searchParams.get("v");
    if (v) return v.slice(0, 11);
    // dạng /embed/<id> hoặc /shorts/<id>
    const m = u.pathname.match(/\/(embed|shorts)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch {
    // không phải URL
  }
  return null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("v") ?? "";
  const id = parseVideoId(q);
  if (!id) {
    return NextResponse.json({ error: "Link/ID video không hợp lệ." }, { status: 400 });
  }

  try {
    const raw = await YoutubeTranscript.fetchTranscript(id, { lang: "en" }).catch(() =>
      YoutubeTranscript.fetchTranscript(id),
    );
    if (!raw || raw.length === 0) {
      return NextResponse.json({ error: "Video này không có phụ đề khả dụng." }, { status: 404 });
    }
    // Chuẩn hoá: gộp khoảng trắng, bỏ ký tự lạ; offset/duration -> giây
    const cleaned = raw
      .map((c) => ({
        text: (c.text || "")
          .replace(/&amp;#39;|&#39;/g, "'")
          .replace(/&amp;quot;|&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim(),
        start: Math.round((c.offset || 0)) / 1000,
        dur: Math.round((c.duration || 0)) / 1000,
      }))
      .filter((c) => c.text.length > 0 && /[a-zA-Z]/.test(c.text))
      .sort((a, b) => a.start - b.start);

    // Cue phụ đề YouTube chia theo DÒNG HIỂN THỊ (hay cắt giữa câu / chồng lấn).
    // → Dựng timing theo từng TỪ rồi GOM LẠI THÀNH CÂU để chép cho đúng câu.
    const words: { w: string; t: number }[] = [];
    for (const c of cleaned) {
      const parts = c.text.split(/\s+/).filter(Boolean);
      const d = c.dur > 0 ? c.dur : 0.6;
      parts.forEach((w, i) => words.push({ w, t: c.start + (d * i) / Math.max(1, parts.length) }));
    }

    const ABBR = new Set(["mr", "mrs", "ms", "dr", "st", "vs", "etc", "jr", "sr", "no", "fig"]);
    const endsSentence = (word: string) => {
      if (!/[.!?]["')\]]?$/.test(word)) return false;
      const bare = word.replace(/[.!?"')\]]+$/, "").toLowerCase();
      if (bare.length <= 1) return false; // viết tắt 1 chữ cái: "A."
      if (ABBR.has(bare)) return false; // Mr. Mrs. ...
      return true;
    };

    type Sent = { text: string; start: number };
    const sentences: Sent[] = [];
    let cur: string[] = [];
    let curStart = 0;
    for (let i = 0; i < words.length; i++) {
      const { w, t } = words[i];
      if (cur.length === 0) curStart = t;
      cur.push(w);
      const next = words[i + 1];
      const gap = next ? next.t - t : Infinity;
      const close =
        endsSentence(w) || // hết câu theo dấu .?!
        cur.length >= 13 || // chặn câu quá dài
        (cur.length >= 5 && gap > 0.8) || // nghỉ dài giữa chừng (phụ đề không dấu câu)
        !next;
      if (close) {
        sentences.push({ text: cur.join(" "), start: curStart });
        cur = [];
      }
    }

    // Mốc dừng mỗi câu = lúc câu kế tiếp bắt đầu (dừng đúng chỗ, không lố sang câu sau).
    const segments = sentences.map((s, i) => {
      const next = sentences[i + 1];
      const end = next ? next.start : s.start + 4;
      return { text: s.text, start: s.start, dur: Math.max(0.6, end - s.start) };
    });

    return NextResponse.json({ id, count: segments.length, segments });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Không lấy được phụ đề.";
    return NextResponse.json(
      { error: `Không lấy được phụ đề (${msg}). Video có thể đã tắt phụ đề hoặc bị chặn.` },
      { status: 502 },
    );
  }
}
