import { readWordAudio, WORD_AUDIO_BUCKET, wordAudioClient } from "./wordAudioStore.mjs";
import type { Accent, Pronounce } from "@/lib/pronounce";

export function audioDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Chưa cấu hình kho audio Supabase.");
  return wordAudioClient(url, key);
}

export async function storedPronunciation(word: string): Promise<Pronounce | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const db = audioDatabase();
  const rows = await readWordAudio(db, word, 1500);
  if (!rows.length) return null;
  const result: Pronounce = { found: true, word };
  await Promise.all(rows.map(async row => {
    const { data, error } = await db.storage.from(WORD_AUDIO_BUCKET).createSignedUrl(row.audio_path, 3600);
    if (error || !data?.signedUrl) return;
    const accent = row.accent as "us" | "uk";
    const synthetic = row.attribution?.kind === "synthetic";
    const value: Accent = { audio: data.signedUrl, cached: true, ...(row.ipa ? { ipa: row.ipa } : {}), ...(synthetic ? { synthetic: true } : {}), ...(row.origin === "upload" && !synthetic ? { reviewStatus: "editor-upload" } : {}), ...(row.origin === "dictionary" || synthetic ? { attribution: row.attribution } : {}) };
    result[accent] = value;
  }));
  result.audio = result.us?.audio || result.uk?.audio;
  result.ipa = result.us?.ipa || result.uk?.ipa;
  return result.audio ? result : null;
}
