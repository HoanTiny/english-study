import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

beforeEach(() => { vi.resetModules(); vi.useFakeTimers();
  vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("Timeout", "TimeoutError")), ms);
    return controller.signal;
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

it("bounds browser lookup time and does not cache a timeout", async () => {
  const fetcher = vi.fn().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason));
  }));
  vi.stubGlobal("fetch", fetcher);
  const { fetchPronounce } = await import("@/lib/pronounce");
  const pending = fetchPronounce("nice"); await vi.advanceTimersByTimeAsync(8000);
  expect(await pending).toEqual({ found: false, error: "timeout" });
  fetcher.mockResolvedValue(Response.json({ found: true, ipa: "naɪs" }));
  expect((await fetchPronounce("nice")).ipa).toBe("naɪs"); expect(fetcher).toHaveBeenCalledTimes(2);
});
it("retries transient errors and supports a forced refresh of cached results", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({}, { status: 502 }))
    .mockResolvedValueOnce(Response.json({ found: true, ipa: "first" }))
    .mockResolvedValueOnce(Response.json({ found: true, ipa: "second" }));
  vi.stubGlobal("fetch", fetcher); const { fetchPronounce } = await import("@/lib/pronounce");
  expect((await fetchPronounce("nice")).error).toBe("unavailable");
  expect((await fetchPronounce("nice")).ipa).toBe("first");
  expect((await fetchPronounce(" NICE ")).ipa).toBe("first");
  expect((await fetchPronounce("nice", { force: true })).ipa).toBe("second");
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("aborts an obsolete request when the caller closes the word panel", async () => {
  vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))))));
  const { fetchPronounce } = await import("@/lib/pronounce"); const controller = new AbortController();
  const pending = fetchPronounce("nice", { signal: controller.signal }); controller.abort();
  expect((await pending).found).toBe(false);
});
it("cuts off an upstream dictionary request at 5 seconds without caching the failure", async () => {
  const fetcher = vi.fn().mockImplementation((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason))));
  vi.stubGlobal("fetch", fetcher); const { GET } = await import("@/app/api/pronounce/route");
  const request = () => new NextRequest("https://local.test/api/pronounce?word=nice");
  const pending = GET(request()); await vi.advanceTimersByTimeAsync(5000);
  const failed = await pending; expect(failed.status).toBe(504); expect(failed.headers.get("cache-control")).toBe("no-store");
  fetcher.mockResolvedValue(Response.json([{ word: "nice", phonetic: "/naɪs/" }]));
  const recovered = await GET(request()); expect(recovered.status).toBe(200);
  expect((await recovered.json()).ipa).toBe("naɪs"); expect(fetcher).toHaveBeenCalledTimes(2);
});
it("keeps invalid lookups away from the upstream service", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const { GET } = await import("@/app/api/pronounce/route");
  expect((await GET(new NextRequest("https://local.test/api/pronounce?word=two%20words"))).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
});
