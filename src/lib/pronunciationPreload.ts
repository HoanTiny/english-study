import { fetchPronounce, type Pronounce } from "./pronounce";

const preloaded = new Map<string, { player: HTMLAudioElement; at: number }>();
const MAX_ITEMS = 4; // At most the current and next word, in two accents.
const TTL = 5 * 60 * 1000;
function release(player: HTMLAudioElement) { player.pause(); player.removeAttribute("src"); player.load(); }
function saveData() { return typeof navigator !== "undefined" && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData; }

export function warmPronunciationAudio(data: Pronounce) {
  if (typeof Audio === "undefined" || saveData()) return;
  for (const accent of [data.us, data.uk]) {
    if (!accent?.cached || !accent.audio) continue;
    const old = preloaded.get(accent.audio);
    if (old && Date.now() - old.at < TTL) continue;
    if (old) { release(old.player); preloaded.delete(accent.audio); }
    while (preloaded.size >= MAX_ITEMS) {
      const [url, item] = preloaded.entries().next().value!;
      release(item.player); preloaded.delete(url);
    }
    const player = new Audio(accent.audio);
    player.preload = "auto"; player.load();
    preloaded.set(accent.audio, { player, at: Date.now() });
  }
}

/** Consume the same media element so playback can use its already buffered audio. */
export function pronunciationAudio(url: string) {
  const item = preloaded.get(url);
  if (item) {
    preloaded.delete(url);
    if (Date.now() - item.at < TTL) return item.player;
    release(item.player);
  }
  return new Audio(url);
}

export async function prefetchPronunciation(word: string, signal: AbortSignal) {
  if (saveData() || signal.aborted) return;
  const result = await fetchPronounce(word, { signal });
  if (!signal.aborted) warmPronunciationAudio(result);
}

export function clearPronunciationPreloads() {
  for (const { player } of preloaded.values()) release(player);
  preloaded.clear();
}
