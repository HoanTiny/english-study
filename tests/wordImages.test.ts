import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), delete: vi.fn(), sign: vi.fn(), upload: vi.fn(), remove: vi.fn(), check: vi.fn(), keys: [] as string[] }));
vi.mock("@/lib/server/supabaseAdmin", () => ({
  adminConfigured: () => true, checkCms: db.check,
  supabaseAdmin: () => ({ from: () => ({
    select: () => ({ eq: (_field: string, key: string) => { db.keys.push(key); return { abortSignal: () => ({ maybeSingle: db.read }), maybeSingle: db.read }; } }),
    upsert: db.write, delete: () => ({ eq: db.delete }),
  }), storage: { from: () => ({ createSignedUrl: db.sign, upload: db.upload, remove: db.remove }) } }),
}));
const storedPath = `vocab-images/${"a".repeat(64)}/1234-abcd.png`;
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); db.keys.length = 0;
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  db.read.mockResolvedValue({ data: null, error: null }); db.write.mockResolvedValue({ error: null }); db.delete.mockResolvedValue({ error: null });
  db.check.mockResolvedValue(true); db.upload.mockResolvedValue({ error: null }); db.remove.mockResolvedValue({ error: null });
  db.sign.mockResolvedValue({ data: { signedUrl: "https://storage.example.test/signed.png" }, error: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("curated vocabulary images", () => {
  it("does not search any image/AI provider when an image has not been uploaded", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const { findWordImages } = await import("@/lib/server/wordImages");
    expect(await findWordImages("nephew", "cháu trai")).toEqual({ found: false, results: [] });
    expect(fetcher).not.toHaveBeenCalled(); expect(db.write).not.toHaveBeenCalled();
  });
  it("ignores legacy search results and only signs a path in the vocabulary folder", async () => {
    const { findWordImages } = await import("@/lib/server/wordImages");
    db.read.mockResolvedValueOnce({ data: { payload: { results: [{ image: "https://openverse.test/wrong.jpg" }] } } });
    expect((await findWordImages("nephew", "cháu trai")).found).toBe(false);
    db.read.mockResolvedValueOnce({ data: { payload: { origin: "upload", path: "private-other-file.png" } } });
    expect((await findWordImages("nephew", "cháu trai")).found).toBe(false);
    expect(db.sign).not.toHaveBeenCalled();
    db.read.mockResolvedValueOnce({ data: { payload: { origin: "upload", path: storedPath } } });
    expect((await findWordImages("nephew", "cháu trai")).results[0].image).toBe("https://storage.example.test/signed.png");
    expect(db.sign).toHaveBeenCalledWith(storedPath, 3600);
  });
  it("separates meanings and normalizes keys, with no long HTTP cache for edits", async () => {
    const { manualImageKey } = await import("@/lib/server/wordImages");
    expect(manualImageKey(" APPLE ", " quả táo ")).toBe(manualImageKey("apple", "quả táo"));
    expect(manualImageKey("orange", "màu cam")).not.toBe(manualImageKey("orange", "quả cam"));
    const { GET } = await import("@/app/api/word-image/route");
    expect((await GET(new NextRequest("https://local.test/api/word-image?q=apple"))).headers.get("cache-control")).toBe("no-store");
    expect((await GET(new NextRequest("https://local.test/api/word-image?q=" + "a".repeat(161)))).status).toBe(400);
    db.read.mockResolvedValue({ error: { message: "offline" } });
    expect((await GET(new NextRequest("https://local.test/api/word-image?q=apple"))).status).toBe(503);
  });
});

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
function uploadRequest(bytes: Uint8Array = png, type = "image/png") {
  const form = new FormData(); form.set("word", "nephew"); form.set("meaning", "cháu trai");
  form.set("file", new Blob([bytes as BlobPart], { type }), "photo.png");
  return new NextRequest("https://local.test/api/admin/word-image", { method: "POST", body: form });
}
describe("image administration", () => {
  it("rejects upload and delete without CMS permission", async () => {
    db.check.mockResolvedValue(false);
    const { POST, DELETE } = await import("@/app/api/admin/word-image/route");
    expect((await POST(uploadRequest())).status).toBe(403);
    expect((await DELETE(new NextRequest("https://local.test/api/admin/word-image?word=nephew", { method: "DELETE" }))).status).toBe(403);
    expect(db.upload).not.toHaveBeenCalled(); expect(db.delete).not.toHaveBeenCalled();
  });
  it("rejects SVG, fake MIME types and oversized images before upload", async () => {
    const { POST } = await import("@/app/api/admin/word-image/route");
    expect((await POST(uploadRequest(new TextEncoder().encode("<svg></svg>"), "image/png"))).status).toBe(400);
    expect((await POST(uploadRequest(png, "image/svg+xml"))).status).toBe(400);
    expect((await POST(uploadRequest(new Uint8Array(2 * 1024 * 1024 + 1)))).status).toBe(413);
    expect(db.upload).not.toHaveBeenCalled();
  });
  it("stores the real file and associates it with the precise word and meaning", async () => {
    db.read.mockResolvedValue({ data: { payload: { origin: "upload", path: storedPath } }, error: null });
    const { POST } = await import("@/app/api/admin/word-image/route");
    expect((await POST(uploadRequest())).status).toBe(200);
    const saved = db.write.mock.calls[0][0];
    expect(saved).toMatchObject({ word: "nephew", meaning: "cháu trai", payload: { origin: "upload", results: [] } });
    expect(saved.payload.path).toMatch(/^vocab-images\/[a-f0-9]{64}\/[a-f0-9-]+\.png$/);
    expect(db.upload.mock.calls[0][2]).toMatchObject({ contentType: "image/png", upsert: false });
    expect(db.remove).toHaveBeenCalledWith([storedPath]);
  });
  it("removes the newly uploaded orphan if DB save fails, leaving the old image", async () => {
    db.read.mockResolvedValue({ data: { payload: { origin: "upload", path: storedPath } } });
    db.write.mockResolvedValue({ error: { message: "offline" } });
    const { POST } = await import("@/app/api/admin/word-image/route");
    expect((await POST(uploadRequest())).status).toBe(503);
    expect(db.remove).toHaveBeenCalledWith([db.upload.mock.calls[0][0]]);
    expect(db.remove).not.toHaveBeenCalledWith([storedPath]);
  });
  it("removes only the selected image and its matching DB entry", async () => {
    db.read.mockResolvedValue({ data: { payload: { origin: "upload", path: storedPath } } });
    const { DELETE } = await import("@/app/api/admin/word-image/route");
    expect((await DELETE(new NextRequest("https://local.test/api/admin/word-image?word=nephew&meaning=ch%C3%A1u%20trai", { method: "DELETE" }))).status).toBe(200);
    expect(db.delete).toHaveBeenCalledTimes(1); expect(db.remove).toHaveBeenCalledWith([storedPath]);
  });
});

describe("browser upload cache", () => {
  it("ends a hung lookup and lets the learner retry", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(Response.json({ found: true, results: [{ image: "https://storage.test/book.jpg" }] }));
    vi.doMock("@/lib/apiFetch", () => ({ apiFetch: fetcher }));
    const client = await import("@/lib/wordImages");
    const request = client.fetchWordImage("book"); await vi.advanceTimersByTimeAsync(7000);
    expect(await request).toBeNull(); expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    expect((await client.fetchWordImage("book"))?.found).toBe(true);
  });
  it("ignores old Openverse browser storage and refreshes signed URLs within five minutes", async () => {
    vi.useFakeTimers();
    const oldImage = { data: { found: true, results: [{ image: "https://openverse.test/old.jpg" }] }, expires: Date.now() + 86400000 };
    const storage = new Map<string, string>([["speakup.word-images.v2", JSON.stringify([["apple|táo", oldImage]])]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    vi.stubGlobal("window", { Image: class { src = ""; } });
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ found: true, results: [{ image: "https://storage.test/apple.jpg" }] })));
    vi.doMock("@/lib/apiFetch", () => ({ apiFetch: fetcher }));
    let client = await import("@/lib/wordImages");
    const results = await Promise.all([client.fetchWordImage("apple", "táo"), client.fetchWordImage("apple", "táo")]);
    expect(results[0]?.results[0].image).toBe("https://storage.test/apple.jpg"); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain("source=upload-v1");
    vi.resetModules(); client = await import("@/lib/wordImages");
    await client.fetchWordImage("apple", "táo"); expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300001);
    await client.fetchWordImage("apple", "táo"); expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
