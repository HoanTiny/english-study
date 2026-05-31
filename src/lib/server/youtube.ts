// Helper YouTube dùng phía server (InnerTube + oEmbed). KHÔNG import ở client.

const CLIENT_VERSION = "20.10.38";
const INNERTUBE_CONTEXT = { client: { clientName: "ANDROID", clientVersion: CLIENT_VERSION } };
const INNERTUBE_UA = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`;

export function parseVideoId(input: string): string | null {
  const s = (input || "").trim();
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

// Có phụ đề tiếng Anh hay không (qua InnerTube — endpoint ổn định).
export async function hasCaptions(id: string): Promise<boolean> {
  try {
    const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": INNERTUBE_UA },
      body: JSON.stringify({ context: INNERTUBE_CONTEXT, videoId: id }),
    });
    if (!r.ok) return false;
    const d = await r.json();
    const tracks = d?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    return Array.isArray(tracks) && tracks.some((t: { languageCode?: string }) => (t.languageCode || "").startsWith("en"));
  } catch {
    return false;
  }
}

// Tiêu đề & kênh qua oEmbed (không cần API key).
export async function getMeta(id: string): Promise<{ title: string; channel: string }> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}&format=json`,
    );
    if (!r.ok) return { title: "", channel: "" };
    const d = await r.json();
    return { title: d.title ?? "", channel: d.author_name ?? "" };
  } catch {
    return { title: "", channel: "" };
  }
}
