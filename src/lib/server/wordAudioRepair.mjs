import { createHash, randomUUID } from "node:crypto";
import { audioFormat, MAX_AUDIO_BYTES, validAccent, validAudioWord } from "./wordAudioSource.mjs";
import { validAudioPath, WORD_AUDIO_BUCKET } from "./wordAudioStore.mjs";

const synthetic = row => row?.origin === "upload" && row.attribution?.kind === "synthetic" && validAudioPath(row.audio_path) && validAudioWord(row.word) && validAccent(row.accent) && !!row.updated_at;
function compareAndSwap(db, expected, update) {
  return db.from("word_audio").update(update).eq("word", expected.word).eq("accent", expected.accent)
    .eq("audio_path", expected.audio_path).eq("updated_at", expected.updated_at).eq("origin", "upload")
    .eq("attribution->>kind", "synthetic").select("word,accent").abortSignal(AbortSignal.timeout(10000));
}
/** Repair metadata without touching the file; never overwrite a concurrent/manual edit. */
export async function repairSyntheticIpa(db, expected, ipa, revision) {
  if (!synthetic(expected)) return { status: "preserved" };
  if (!/^\/[^/]+\/$/.test(ipa)) throw new Error("Invalid learner IPA");
  if (expected.ipa === ipa && expected.attribution?.ipaRevision === revision) return { status: "unchanged" };
  const { data, error } = await compareAndSwap(db, expected, { ipa, attribution: { ...expected.attribution, ipaRevision: revision }, updated_at: new Date().toISOString() });
  if (error) throw new Error("IPA update failed; recording preserved");
  return { status: data?.length ? "updated" : "conflict" };
}
/** Replace only the exact synthetic revision reviewed by the offline repair job. */
export async function replaceSyntheticRecording(db, expected, recording) {
  if (!synthetic(expected)) return { status: "preserved" };
  const format = audioFormat(recording.bytes);
  if (!format || recording.bytes.length > MAX_AUDIO_BYTES || !recording.bytes.length || !/^\/[^/]+\/$/.test(recording.ipa)) throw new Error("Invalid replacement recording");
  if (!recording.attribution?.sourceUrl || !recording.attribution?.licenseUrl) throw new Error("Missing source/license");
  const storage = db.storage.from(WORD_AUDIO_BUCKET);
  const hash = createHash("sha256").update(`${expected.word}|${expected.accent}`).digest("hex");
  const audioPath = `vocab-audio/${hash}/${randomUUID()}.${format.ext}`;
  const { error: uploadError } = await storage.upload(audioPath, recording.bytes, { contentType: format.mime, cacheControl: "31536000", upsert: false });
  if (uploadError) throw new Error("Replacement upload failed; old recording preserved");
  const { data, error } = await compareAndSwap(db, expected, { audio_path: audioPath, ipa: recording.ipa, bytes: recording.bytes.length,
    origin: "dictionary", attribution: { ...recording.attribution, reviewMethod: "licensed-accent-labelled-reference", ipaRevision: recording.ipaRevision }, updated_at: new Date().toISOString() });
  // A timeout may hide a successful DB update. Never delete a potentially referenced file.
  // Rerunning reads current pointers; an unreferenced object can be reconciled separately.
  if (error) throw new Error(`Replacement metadata update failed; retained object ${audioPath}`);
  if (!data?.length) { await storage.remove([audioPath]).catch(() => {}); return { status: "conflict" }; }
  // Retain the old object for rollback. The repair report stores its original pointer.
  return { status: "replaced", previousPath: expected.audio_path, audioPath };
}
