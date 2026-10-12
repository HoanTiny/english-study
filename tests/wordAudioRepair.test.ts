import { describe, expect, it, vi } from "vitest";
import { repairSyntheticIpa, replaceSyntheticRecording } from "../src/lib/server/wordAudioRepair.mjs";

const expected = { word: "teacher", accent: "uk", origin: "upload", attribution: { kind: "synthetic" }, audio_path: `vocab-audio/${"a".repeat(64)}/1234.wav`, updated_at: "2026-10-01T00:00:00Z" };
const recording = { bytes: Buffer.from([73,68,51,4,0,0,0,0,0,0,1,2]), ipa: "/ˈtiːtʃə/", ipaRevision: "review-1", attribution: { sourceUrl: "https://commons.wikimedia.org/wiki/File:En-uk-teacher.ogg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } };
function fixture(data: object[] = [{ word: "teacher" }], error: object | null = null) {
  const query = { eq: vi.fn(), select: vi.fn(), abortSignal: vi.fn(async () => ({ data, error })) };
  query.eq.mockReturnValue(query); query.select.mockReturnValue(query);
  const update = vi.fn(() => query), upload = vi.fn(async (path: string) => ({ error: path ? null : "missing" })), remove = vi.fn(async () => ({}));
  return { db: { from: () => ({ update }), storage: { from: () => ({ upload, remove }) } }, query, update, upload, remove };
}
describe("reviewed audio replacement", () => {
  it("preserves human/manual recordings without uploading anything", async () => {
    const f = fixture();
    expect(await replaceSyntheticRecording(f.db, { ...expected, origin: "dictionary" }, recording)).toEqual({ status: "preserved" });
    expect(await repairSyntheticIpa(f.db, { ...expected, attribution: {} }, recording.ipa, "review-1")).toEqual({ status: "preserved" });
    expect(f.upload).not.toHaveBeenCalled(); expect(f.update).not.toHaveBeenCalled();
  });
  it("compares path, timestamp and synthetic origin atomically", async () => {
    const f = fixture();
    expect((await replaceSyntheticRecording(f.db, expected, recording)).status).toBe("replaced");
    expect(f.query.eq).toHaveBeenCalledWith("audio_path", expected.audio_path);
    expect(f.query.eq).toHaveBeenCalledWith("updated_at", expected.updated_at);
    expect(f.query.eq).toHaveBeenCalledWith("attribution->>kind", "synthetic");
    expect(f.remove).not.toHaveBeenCalled(); // Original retained for rollback.
  });
  it("discards only the new object if an editor changes the row concurrently", async () => {
    const f = fixture([]);
    expect((await replaceSyntheticRecording(f.db, expected, recording)).status).toBe("conflict");
    expect(f.remove).toHaveBeenCalledWith([f.upload.mock.calls[0][0]]);
    expect(f.remove).not.toHaveBeenCalledWith([expected.audio_path]);
  });
  it("retains both files when the database response is ambiguous", async () => {
    const f = fixture([], { code: "offline" });
    await expect(replaceSyntheticRecording(f.db, expected, recording)).rejects.toThrow("metadata");
    expect(f.remove).not.toHaveBeenCalled();
  });
  it("repairs IPA without replacing or deleting its audio", async () => {
    const f = fixture();
    expect(await repairSyntheticIpa(f.db, expected, recording.ipa, "review-1")).toEqual({ status: "updated" });
    expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ ipa: recording.ipa }));
    expect(f.upload).not.toHaveBeenCalled(); expect(f.remove).not.toHaveBeenCalled();
  });
});
