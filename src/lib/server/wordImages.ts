import { createHash } from "node:crypto";
import { supabaseAdmin } from "./supabaseAdmin";
import { wordImageKey, type WordImageResult } from "@/lib/wordImageTypes";

export const WORD_IMAGE_BUCKET = "lesson-audio"; // Existing private CMS bucket.
export const manualImageKey = (word: string, meaning: string) => createHash("sha256").update(`manual-v1|${wordImageKey(word, meaning)}`).digest("hex");
export const validImagePath = (path: unknown): path is string => typeof path === "string" && /^vocab-images\/[a-f0-9]{64}\/[a-f0-9-]+\.(png|jpg|webp)$/.test(path);

/** Only editor-uploaded images. Old Openverse records are deliberately ignored. */
export async function findWordImages(word: string, meaning: string): Promise<WordImageResult> {
  const empty: WordImageResult = { found: false, results: [] };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;
  const db = supabaseAdmin();
  const { data, error } = await db.from("word_images").select("payload").eq("cache_key", manualImageKey(word, meaning)).abortSignal(AbortSignal.timeout(3000)).maybeSingle();
  if (error) throw new Error("Không tải được ảnh đã lưu.");
  const payload = data?.payload;
  if (payload?.origin !== "upload" || !validImagePath(payload.path)) return empty;
  const { data: signed, error: signError } = await db.storage.from(WORD_IMAGE_BUCKET).createSignedUrl(payload.path, 3600);
  if (signError || !signed?.signedUrl) throw new Error("Không mở được ảnh đã lưu.");
  return { found: true, results: [{ image: signed.signedUrl, title: word }] };
}
