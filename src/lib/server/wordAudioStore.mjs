import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { audioFormat, MAX_AUDIO_BYTES, normalizeAudioWord, validAccent, validAudioWord, commonsCandidates, dictionaryCandidates, resolveRecording } from "./wordAudioSource.mjs";

export const WORD_AUDIO_BUCKET = "lesson-audio";
export const validAudioPath = path => typeof path === "string" && /^vocab-audio\/[a-f0-9]{64}\/[a-f0-9-]+\.(mp3|ogg|wav)$/.test(path);
const deadline = () => AbortSignal.timeout(5000);

export function wordAudioClient(url, key) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
    fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) }),
  } });
}

/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function readWordAudio(db, word, timeout = 5000) {
  const { data, error } = await db.from("word_audio").select("*").eq("word", normalizeAudioWord(word)).abortSignal(AbortSignal.timeout(timeout));
  if (error) throw new Error("Không đọc được kho audio. Kiểm tra migration word_audio.");
  return (data ?? []).filter(row => validAccent(row.accent) && validAudioPath(row.audio_path));
}

/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function listWordAudio(db) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db.from("word_audio").select("word,accent,origin,attribution,bytes,updated_at").order("word").order("accent").range(start, start + 999).abortSignal(deadline());
    if (error) throw new Error("Chưa đọc được kho audio. Hãy chạy db/migrate_word_audio.sql.");
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

/**
 * Upload a versioned file before updating its pointer. Imports are insert-only so
 * they cannot overwrite an editor's recording, including across concurrent workers.
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ word: string, accent: string, bytes: Buffer, ipa?: string | null, origin?: string, attribution?: object, onlyMissing?: boolean }} recording
 */
export async function saveWordAudio(db, { word, accent, bytes, ipa = null, origin = "upload", attribution = {}, onlyMissing = false }) {
  word = normalizeAudioWord(word);
  const format = audioFormat(bytes);
  if (!validAudioWord(word) || !validAccent(accent) || !format || bytes.length > MAX_AUDIO_BYTES) throw new Error("Từ, giọng hoặc file audio không hợp lệ.");
  const previous = (await readWordAudio(db, word)).find(row => row.accent === accent);
  const insertOnly = origin === "dictionary" || onlyMissing;
  if (insertOnly && previous) return { status: "existing", accent };
  const hash = createHash("sha256").update(`${word}|${accent}`).digest("hex");
  const path = `vocab-audio/${hash}/${randomUUID()}.${format.ext}`;
  const storage = db.storage.from(WORD_AUDIO_BUCKET);
  const { error: uploadError } = await storage.upload(path, bytes, { contentType: format.mime, cacheControl: "31536000", upsert: false });
  if (uploadError) throw new Error("Không lưu được file vào kho audio.");
  const row = { word, accent, audio_path: path, ipa, origin, attribution, bytes: bytes.length, updated_at: new Date().toISOString() };
  const { error } = await (insertOnly ? db.from("word_audio").insert(row) : db.from("word_audio").upsert(row)).abortSignal(deadline());
  if (error) {
    await storage.remove([path]).catch(() => {});
    if (insertOnly && error.code === "23505") return { status: "existing", accent };
    throw new Error("Không lưu được thông tin audio; bản thu cũ được giữ nguyên.");
  }
  // Versioned files make browser caching safe. An old file is no longer referenced by this row.
  if (previous) await storage.remove([previous.audio_path]).catch(() => {});
  return { status: "saved", accent };
}

/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function removeWordAudio(db, word, accent) {
  const previous = (await readWordAudio(db, word)).find(row => row.accent === accent);
  if (!previous) return;
  const { error } = await db.from("word_audio").delete().eq("word", normalizeAudioWord(word)).eq("accent", accent).eq("audio_path", previous.audio_path).abortSignal(deadline());
  if (error) throw new Error("Không gỡ được audio.");
  await db.storage.from(WORD_AUDIO_BUCKET).remove([previous.audio_path]).catch(() => {});
}

/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function importWordAudio(db, word) {
  word = normalizeAudioWord(word);
  if (!validAudioWord(word)) throw new Error("Từ không hợp lệ.");
  const rows = await readWordAudio(db, word);
  const missing = ["us", "uk"].filter(accent => !rows.some(row => row.accent === accent));
  if (!missing.length) return { word, results: [{ accent: "us", status: "existing" }, { accent: "uk", status: "existing" }] };
  const candidates = await commonsCandidates(word);
  let dictionaryFailure = "";
  // Enrich stored recordings with accent-specific IPA when the dictionary has it.
  // This runs only during preparation, never in the learner's playback path.
  if (missing.some(accent => !candidates.some(item => item.accent === accent && item.ipa))) {
    const extra = await dictionaryCandidates(word).catch(error => { if (error.message?.startsWith("RATE_LIMIT:")) throw error; dictionaryFailure = "Nguồn từ điển chưa phản hồi; có thể thử lại sau."; return []; });
    for (const candidate of extra) {
      const existing = candidates.find(item => item.accent === candidate.accent);
      if (existing) existing.ipa = candidate.ipa;
      else candidates.push(candidate);
    }
  }
  const results = [];
  for (const accent of ["us", "uk"]) {
    if (!missing.includes(accent)) { results.push({ accent, status: "existing" }); continue; }
    const candidate = candidates.find(item => item.accent === accent);
    if (!candidate) { results.push({ accent, status: dictionaryFailure ? "error" : "missing", message: dictionaryFailure || "Nguồn miễn phí chưa có bản thu giọng này." }); continue; }
    try {
      const recording = await resolveRecording(candidate);
      results.push(await saveWordAudio(db, { word, accent, ...recording, origin: "dictionary" }));
    } catch (error) {
      if (error.message?.startsWith("RATE_LIMIT:")) throw error;
      results.push({ accent, status: "error", message: error instanceof Error ? error.message : "Không nhập được audio." });
    }
  }
  return { word, results };
}
