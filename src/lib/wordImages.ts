"use client";
import { apiFetch } from "@/lib/apiFetch";
import { wordImageKey, type WordImageResult } from "./wordImageTypes";

type Cached = { data: WordImageResult; expires: number };
const memo = new Map<string, Cached>();
const pending = new Map<string, Promise<WordImageResult | null>>();
const STORAGE = "speakup.word-images.uploads.v1";
let hydrated = false;

export function cachedWordImage(word: string, meaning = ""): WordImageResult | null {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    try {
      const entries = JSON.parse(localStorage.getItem(STORAGE) ?? "[]") as [string, Cached][];
      if (Array.isArray(entries)) for (const [key, item] of entries.slice(-120)) {
        if (typeof key === "string" && item.expires > Date.now() && Array.isArray(item.data?.results)) memo.set(key, item);
      }
    } catch { /* Storage can be unavailable or full. */ }
  }
  const entry = memo.get(wordImageKey(word, meaning));
  return entry && entry.expires > Date.now() ? entry.data : null;
}

export async function fetchWordImage(word: string, meaning = "", force = false): Promise<WordImageResult | null> {
  if (!word.trim()) return null;
  const key = wordImageKey(word, meaning);
  const cached = cachedWordImage(word, meaning);
  if (!force && cached) return cached;
  if (pending.has(key)) return pending.get(key)!;
  const request = load(word, meaning, key);
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}

async function load(word: string, meaning: string, key: string): Promise<WordImageResult | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, 7000); });
    const data = await Promise.race([
      apiFetch(`/api/word-image?q=${encodeURIComponent(word)}&vi=${encodeURIComponent(meaning)}&source=upload-v1`, { signal: controller.signal }).then(response => response.json()),
      timeout,
    ]) as WordImageResult;
    if (!Array.isArray(data.results)) return null;
    if (memo.size >= 120) memo.delete(memo.keys().next().value!);
    // Signed URLs last one hour; refresh metadata in five minutes, misses in 15s.
    memo.set(key, { data, expires: Date.now() + (data.found ? 300000 : 15000) });
    try { if (typeof window !== "undefined") localStorage.setItem(STORAGE, JSON.stringify([...memo])); } catch { /* RAM remains usable. */ }
    const src = data.results[0]?.image;
    if (src && typeof window !== "undefined") { const image = new window.Image(); image.src = src; }
    return data;
  } catch { return null; } finally { clearTimeout(timer); }
}
