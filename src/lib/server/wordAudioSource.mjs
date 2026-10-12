// Shared by the admin importer and the resumable command-line importer.
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const USER_AGENT = "SpeakUp/1.0 (https://english-study-alpha-six.vercel.app; vocabulary audio importer)";
export const normalizeAudioWord = word => word.trim().replace(/\s+/g, " ").toLowerCase();
export const validAudioWord = word => typeof word === "string" && word.length > 0 && word.length <= 160 && /^[a-zé][a-zé '’.,!?;:-]*$/i.test(word);
export const validAccent = accent => accent === "us" || accent === "uk";

export function audioFormat(bytes) {
  if (bytes.length < 12) return null;
  if (bytes.toString("ascii", 0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 6) !== 0 && (bytes[2] >> 4) > 0 && (bytes[2] >> 4) < 15)) return { ext: "mp3", mime: "audio/mpeg" };
  if (bytes.toString("ascii", 0, 4) === "OggS") return { ext: "ogg", mime: "audio/ogg" };
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE") return { ext: "wav", mime: "audio/wav" };
  return null;
}

function trustedUrl(value, host) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === host && !url.username && !url.password && !url.port ? url : null; } catch { return null; }
}
const plainText = value => String(value ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").slice(0, 600);
function reusableLicense(value) {
  const url = trustedUrl(typeof value === "string" ? value.replace(/^http:\/\/creativecommons\.org\//, "https://creativecommons.org/") : value, "creativecommons.org");
  return url && /^\/(?:licenses\/(?:by|by-sa)\/\d\.\d(?:\/|$)|publicdomain\/(?:zero|mark)\/1\.0(?:\/|$))/.test(url.pathname) ? url.href : null;
}

async function getJson(url, timeout = 5000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout), redirect: "error", headers: { Accept: "application/json", "User-Agent": USER_AGENT } });
  if (response.status === 429) throw new Error("RATE_LIMIT: Nguồn audio yêu cầu nghỉ. Hãy tiếp tục sau vài phút; bản đã lưu vẫn được giữ.");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Nguồn audio tạm lỗi (${response.status}).`);
  const body = await response.json();
  if (body?.error) {
    if (["ratelimited", "maxlag", "readonly"].includes(body.error.code)) throw new Error("RATE_LIMIT: Nguồn audio đang bận. Hãy tiếp tục sau vài phút.");
    throw new Error("Nguồn audio chưa trả được dữ liệu. Vui lòng thử lại sau.");
  }
  return body;
}

/** Download only an allowlisted Wikimedia file, bounded in time and size. */
export async function downloadRecording(value) {
  const url = trustedUrl(value, "upload.wikimedia.org");
  if (!url || !url.pathname.startsWith("/wikipedia/commons/")) throw new Error("Nguồn file audio không hợp lệ.");
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: "error", headers: { "User-Agent": USER_AGENT } });
  if (response.status === 429) throw new Error("RATE_LIMIT: Nguồn audio yêu cầu nghỉ. Hãy tiếp tục sau vài phút.");
  if (!response.ok || !response.body) throw new Error("Không tải được bản thu gốc.");
  if (Number(response.headers.get("content-length")) > MAX_AUDIO_BYTES) { await response.body.cancel(); throw new Error("Audio vượt quá 2 MB."); }
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value: chunk } = await reader.read(); if (done) break;
      size += chunk.byteLength;
      if (size > MAX_AUDIO_BYTES) throw new Error("Audio vượt quá 2 MB.");
      chunks.push(chunk);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  if (!audioFormat(bytes)) throw new Error("File nguồn không phải audio hợp lệ.");
  return bytes;
}

/** Accent comes from the dictionary's labelled recording, never inferred from IPA. */
export async function dictionaryCandidates(word) {
  if (!/^[a-z][a-z'’-]*$/i.test(word) || word.length > 40) return [];
  const entries = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, 3000);
  if (!Array.isArray(entries)) return [];
  const phonetics = entries.flatMap(entry => entry.phonetics ?? []);
  return ["us", "uk"].flatMap(accent => {
    const phonetic = phonetics.find(p => {
      const url = trustedUrl(p.audio, "api.dictionaryapi.dev");
      return url?.pathname.startsWith("/media/pronunciations/en/") && url.pathname.endsWith(`-${accent}.mp3`);
    });
    return phonetic ? [{ accent, ipa: phonetic.text || null, sourceUrl: phonetic.sourceUrl }] : [];
  });
}

// Only exact, explicitly accent-labelled filenames; no approximate search or IPA guessing.
export async function commonsCandidates(word) {
  const titles = ["us", "uk"].map(accent => `File:En-${accent}-${word}.ogg`);
  const query = new URL("https://commons.wikimedia.org/w/api.php");
  query.search = new URLSearchParams({ action: "query", format: "json", maxlag: "5", titles: titles.join("|"), prop: "videoinfo", viprop: "url|derivatives|extmetadata" }).toString();
  const data = await getJson(query.href);
  return Object.values(data?.query?.pages ?? {}).flatMap(page => {
    const index = titles.findIndex(title => title.toLowerCase() === page.title?.replaceAll("_", " ").toLowerCase());
    const info = page.videoinfo?.[0];
    return index >= 0 && info ? [{ accent: index === 0 ? "us" : "uk", ipa: null, sourceUrl: info.descriptionurl, info }] : [];
  });
}

/** Resolve Commons metadata and its MP3 derivative to retain attribution and mobile compatibility. */
export async function resolveRecording(candidate) {
  const source = trustedUrl(candidate.sourceUrl, "commons.wikimedia.org");
  if (!source) throw new Error("Bản thu chưa có nguồn và giấy phép phù hợp để lưu lại.");
  const query = new URL("https://commons.wikimedia.org/w/api.php");
  query.search = new URLSearchParams({ action: "query", format: "json", maxlag: "5", prop: "videoinfo", viprop: "url|derivatives|extmetadata" }).toString();
  const pageId = source.searchParams.get("curid");
  if (pageId && /^\d+$/.test(pageId)) query.searchParams.set("pageids", pageId);
  else if (source.pathname.startsWith("/wiki/File:")) query.searchParams.set("titles", decodeURIComponent(source.pathname.slice(6)));
  else throw new Error("Không xác định được nguồn bản thu.");
  const data = candidate.info ? null : await getJson(query.href);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = candidate.info || page?.videoinfo?.[0];
  const metadata = info?.extmetadata;
  const licenseUrl = reusableLicense(metadata?.LicenseUrl?.value);
  const creator = plainText(metadata?.Artist?.value);
  if (!licenseUrl || !creator) throw new Error("Bản thu thiếu tác giả hoặc giấy phép cho phép lưu lại.");
  const mp3 = info.derivatives?.find(file => file.type === "audio/mpeg")?.src;
  const url = mp3 || info.url;
  const bytes = await downloadRecording(url).catch(error => {
    if (error.message?.startsWith("RATE_LIMIT:")) throw error;
    if (!mp3 || !info.url || info.url === mp3) throw error;
    return downloadRecording(info.url);
  });
  return { bytes, ipa: candidate.ipa, attribution: { creator, license: plainText(metadata.LicenseShortName?.value), licenseUrl, sourceUrl: source.href } };
}
