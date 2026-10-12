import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({ read: vi.fn(), insert: vi.fn(), upsert: vi.fn(), removeRow: vi.fn(), upload: vi.fn(), removeFile: vi.fn(), sign: vi.fn(), cms: vi.fn(), list: vi.fn() }));
function database() {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ abortSignal: db.read }), order: () => ({ order: () => ({ range: (start: number) => ({ abortSignal: () => db.list(start) }) }) }) }),
      insert: (row: unknown) => ({ abortSignal: () => db.insert(row) }), upsert: (row: unknown) => ({ abortSignal: () => db.upsert(row) }),
      delete: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ abortSignal: db.removeRow }) }) }) }),
    }),
    storage: { from: () => ({ upload: db.upload, remove: db.removeFile, createSignedUrl: db.sign }) },
  };
}
vi.mock("@supabase/supabase-js", () => ({ createClient: () => database() }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigured: () => true, checkCms: db.cms }));
const path = `vocab-audio/${"a".repeat(64)}/1234-abcd.mp3`;
const mp3 = Buffer.from([73, 68, 51, 4, 0, 0, 0, 0, 0, 0, 1, 2, 3]);
const row = { word: "sister", accent: "us", audio_path: path, ipa: "/sɪstər/", origin: "upload", bytes: 13 };
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.example.test");
  db.read.mockResolvedValue({ data: [], error: null }); db.insert.mockResolvedValue({ error: null }); db.upsert.mockResolvedValue({ error: null });
  db.removeRow.mockResolvedValue({ error: null }); db.upload.mockResolvedValue({ error: null }); db.removeFile.mockResolvedValue({ error: null });
  db.sign.mockResolvedValue({ data: { signedUrl: "https://storage.example.test/signed.mp3" }, error: null }); db.cms.mockResolvedValue(true);
  db.list.mockResolvedValue({ data: [], error: null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("persistent vocabulary audio", () => {
  it("serves stored recordings before any dictionary request, including multiword entries", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    db.read.mockResolvedValue({ data: [row, { ...row, accent: "uk", ipa: "/sɪstə/" }], error: null });
    const { GET } = await import("@/app/api/pronounce/route");
    const response = await GET(new NextRequest("https://local.test/api/pronounce?word=best%20man"));
    expect(response.headers.get("x-cache")).toBe("storage");
    expect((await response.json()).uk).toMatchObject({ cached: true, audio: "https://storage.example.test/signed.mp3", ipa: "/sɪstə/" });
    expect(fetcher).not.toHaveBeenCalled(); expect(db.upload).not.toHaveBeenCalled();
  });
  it("never signs an unrelated private storage path", async () => {
    db.read.mockResolvedValue({ data: [{ ...row, audio_path: "private-recordings/user.wav" }] });
    const { storedPronunciation } = await import("@/lib/server/storedPronunciation");
    expect(await storedPronunciation("sister")).toBeNull(); expect(db.sign).not.toHaveBeenCalled();
  });
  it("paginates the collection so coverage includes more than 1000 audio rows", async () => {
    db.list.mockImplementation((start: number) => Promise.resolve({ data: start === 0 ? Array(1000).fill(row) : [row], error: null }));
    const { listWordAudio } = await import("@/lib/server/wordAudioStore.mjs");
    expect(await listWordAudio(database() as never)).toHaveLength(1001);
    expect(db.list.mock.calls.map(call => call[0])).toEqual([0, 1000]);
  });
  it("retains the old file when saving its replacement fails", async () => {
    db.read.mockResolvedValue({ data: [row] }); db.upsert.mockResolvedValue({ error: { code: "offline" } });
    const { saveWordAudio } = await import("@/lib/server/wordAudioStore.mjs");
    await expect(saveWordAudio(database() as never, { word: " Sister ", accent: "us", bytes: mp3 })).rejects.toThrow("bản thu cũ");
    expect(db.removeFile).toHaveBeenCalledWith([db.upload.mock.calls[0][0]]);
    expect(db.removeFile).not.toHaveBeenCalledWith([path]);
  });
  it("does not overwrite a manual recording during an import, including a concurrent insert", async () => {
    const { saveWordAudio } = await import("@/lib/server/wordAudioStore.mjs");
    db.read.mockResolvedValueOnce({ data: [row] });
    expect(await saveWordAudio(database() as never, { word: "sister", accent: "us", bytes: mp3, origin: "dictionary" })).toMatchObject({ status: "existing" });
    expect(db.upload).not.toHaveBeenCalled();
    db.insert.mockResolvedValue({ error: { code: "23505" } });
    expect(await saveWordAudio(database() as never, { word: "sister", accent: "us", bytes: mp3, origin: "dictionary" })).toMatchObject({ status: "existing" });
    expect(db.upsert).not.toHaveBeenCalled(); expect(db.removeFile).toHaveBeenCalledOnce();
  });
  it("skips every external request when both accents are already stored", async () => {
    db.read.mockResolvedValue({ data: [row, { ...row, accent: "uk" }] }); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const { importWordAudio } = await import("@/lib/server/wordAudioStore.mjs");
    expect((await importWordAudio(database() as never, "sister")).results.every(item => item.status === "existing")).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("publishes synthesized audio insert-only without replacing an existing human recording", async () => {
    const { saveWordAudio } = await import("@/lib/server/wordAudioStore.mjs");
    const recording = { word: "sister", accent: "us", bytes: mp3, origin: "upload", onlyMissing: true, attribution: { kind: "synthetic" } };
    db.read.mockResolvedValueOnce({ data: [row] });
    expect(await saveWordAudio(database() as never, recording)).toMatchObject({ status: "existing" });
    expect(db.upload).not.toHaveBeenCalled();
    db.insert.mockResolvedValue({ error: { code: "23505" } });
    expect(await saveWordAudio(database() as never, recording)).toMatchObject({ status: "existing" });
    expect(db.upsert).not.toHaveBeenCalled();
  });
  it("identifies stored synthesized speech in the learner response", async () => {
    db.read.mockResolvedValue({ data: [{ ...row, attribution: { kind: "synthetic", creator: "Kokoro" } }] });
    const { storedPronunciation } = await import("@/lib/server/storedPronunciation");
    expect((await storedPronunciation("sister"))?.us).toMatchObject({ synthetic: true, attribution: { creator: "Kokoro" } });
  });
});

function request(bytes: Buffer = mp3, accent = "us") {
  const form = new FormData(); form.set("word", "sister"); form.set("accent", accent); form.set("ipa", "/sɪstər/");
  form.set("file", new Blob([new Uint8Array(bytes)]), "audio.mp3");
  return new NextRequest("https://local.test/api/admin/word-audio", { method: "POST", body: form });
}
describe("audio administration", () => {
  it("protects upload, import, listing and deletion with CMS permission", async () => {
    db.cms.mockResolvedValue(false); const { GET, POST, DELETE } = await import("@/app/api/admin/word-audio/route");
    expect((await GET(new NextRequest("https://local.test/api/admin/word-audio"))).status).toBe(403);
    expect((await POST(request())).status).toBe(403);
    expect((await DELETE(new NextRequest("https://local.test/api/admin/word-audio?word=sister&accent=us"))).status).toBe(403);
    expect(db.upload).not.toHaveBeenCalled(); expect(db.read).not.toHaveBeenCalled();
  });
  it("rejects bad audio, unrecognized accents and oversized files", async () => {
    const { POST } = await import("@/app/api/admin/word-audio/route");
    expect((await POST(request(Buffer.from("<html>not an audio file</html>")))).status).toBe(400);
    expect((await POST(request(mp3, "au"))).status).toBe(400);
    expect((await POST(request(Buffer.alloc(2 * 1024 * 1024 + 1)))).status).toBe(413);
    expect(db.upload).not.toHaveBeenCalled();
  });
  it("saves a real versioned file with the correct word, accent and optional IPA", async () => {
    const { POST } = await import("@/app/api/admin/word-audio/route");
    expect((await POST(request())).status).toBe(200);
    expect(db.upsert.mock.calls[0][0]).toMatchObject({ word: "sister", accent: "us", ipa: "/sɪstər/", origin: "upload", bytes: mp3.length });
    expect(db.upload.mock.calls[0][0]).toMatch(/^vocab-audio\/[a-f0-9]{64}\/[a-f0-9-]+\.mp3$/);
    expect(db.upload.mock.calls[0][2]).toMatchObject({ contentType: "audio/mpeg", upsert: false });
  });
});

describe("free audio source validation", () => {
  it("blocks arbitrary URLs, redirects, fake audio and oversized responses", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const { downloadRecording } = await import("@/lib/server/wordAudioSource.mjs");
    await expect(downloadRecording("http://127.0.0.1/private")).rejects.toThrow("không hợp lệ");
    await expect(downloadRecording("https://upload.wikimedia.org.evil.test/audio.mp3")).rejects.toThrow("không hợp lệ");
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce(new Response("bad audio"));
    await expect(downloadRecording("https://upload.wikimedia.org/wikipedia/commons/a.mp3")).rejects.toThrow("không phải audio");
    expect(fetcher.mock.calls[0][1].redirect).toBe("error");
    fetcher.mockResolvedValueOnce(new Response(mp3, { headers: { "Content-Length": String(2097153) } }));
    await expect(downloadRecording("https://upload.wikimedia.org/wikipedia/commons/a.mp3")).rejects.toThrow("2 MB");
  });
  it("preserves attribution, upgrades legacy CC URLs and prefers MP3 derivatives", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(mp3)); vi.stubGlobal("fetch", fetcher);
    const { resolveRecording } = await import("@/lib/server/wordAudioSource.mjs");
    const candidate = { ipa: "/test/", sourceUrl: "https://commons.wikimedia.org/wiki/File:En-us-sister.ogg", info: {
      url: "https://upload.wikimedia.org/wikipedia/commons/test.ogg", derivatives: [{ type: "audio/mpeg", src: "https://upload.wikimedia.org/wikipedia/commons/test.mp3" }],
      extmetadata: { Artist: { value: '<a href="/user">Speaker</a>' }, LicenseUrl: { value: "http://creativecommons.org/licenses/by-sa/3.0/" }, LicenseShortName: { value: "CC BY-SA 3.0" } },
    } };
    const result = await resolveRecording(candidate);
    expect(result.attribution).toMatchObject({ creator: "Speaker", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", sourceUrl: candidate.sourceUrl });
    expect(String(fetcher.mock.calls[0][0])).toContain("test.mp3");
    candidate.info.extmetadata.LicenseUrl.value = "https://example.test/all-rights-reserved";
    await expect(resolveRecording(candidate)).rejects.toThrow("giấy phép");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("stops on rate limits instead of trying alternate requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })); vi.stubGlobal("fetch", fetcher);
    const { commonsCandidates } = await import("@/lib/server/wordAudioSource.mjs");
    await expect(commonsCandidates("book")).rejects.toThrow("RATE_LIMIT:");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("treats API-level throttling as a pause, not as missing audio", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ error: { code: "maxlag" } })); vi.stubGlobal("fetch", fetcher);
    const { commonsCandidates } = await import("@/lib/server/wordAudioSource.mjs");
    await expect(commonsCandidates("book")).rejects.toThrow("RATE_LIMIT:");
    expect(String(fetcher.mock.calls[0][0])).toContain("maxlag=5");
  });
});
