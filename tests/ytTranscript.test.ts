import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { YoutubeTranscriptTooManyRequestError, YoutubeTranscriptNotAvailableLanguageError } from "youtube-transcript";
const mocks = vi.hoisted(() => ({ guard: vi.fn(), fallback: vi.fn() }));
vi.mock("@/lib/server/apiGuard", () => ({ guardPaidApi: mocks.guard }));
vi.mock("youtube-transcript", async importOriginal => ({
  ...await importOriginal<typeof import("youtube-transcript")>(), YoutubeTranscript: { fetchTranscript: mocks.fallback },
}));
const request = (value = "JnHNiJyBwvY") => new NextRequest(`https://app.test/api/yt-transcript?v=${encodeURIComponent(value)}`);
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); mocks.guard.mockResolvedValue(null); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

it("checks authorization and rejects foreign hosts before requesting YouTube", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const { GET } = await import("@/app/api/yt-transcript/route");
  mocks.guard.mockResolvedValueOnce(Response.json({}, { status: 401 }));
  expect((await GET(request())).status).toBe(401);
  expect((await GET(request("https://evil.test/?v=JnHNiJyBwvY"))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
it("serves a successful cached transcript before contacting YouTube again", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: "en", baseUrl: "https://www.youtube.com/api/timedtext?v=JnHNiJyBwvY" }] } } }))
    .mockResolvedValueOnce(new Response('<p t="12000" d="2000">Hello everyone.</p><p t="14000" d="2000">Welcome back.</p>'))
    .mockResolvedValueOnce(Response.json({ title: "Sample", author_name: "Example" }));
  vi.stubGlobal("fetch", fetcher); const { GET } = await import("@/app/api/yt-transcript/route");
  const first = await GET(request()); expect(first.status).toBe(200);
  expect((await first.json()).segments[0]).toEqual({ text: "Hello everyone.", start: 12, dur: 2 });
  expect((await GET(request())).status).toBe(200); expect(fetcher).toHaveBeenCalledTimes(3);
});
it("does not present an unreadable transcript as proof that the author disabled captions or cache the failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({})));
  mocks.fallback.mockRejectedValue(new Error("Transcript is disabled"));
  const { GET } = await import("@/app/api/yt-transcript/route");
  const response = await GET(request()); const body = await response.json();
  expect(body.code).toBe("unavailable"); expect(body.error).toContain("không xác nhận"); expect(body.error).not.toContain("Transcript is disabled");
  expect(response.headers.get("cache-control")).toBe("no-store"); await GET(request()); expect(mocks.fallback).toHaveBeenCalledTimes(2);
});
it("distinguishes an HTTP block from missing caption data", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("blocked", { status: 403 })));
  mocks.fallback.mockRejectedValue(new Error("unavailable"));
  const { GET } = await import("@/app/api/yt-transcript/route");
  expect((await (await GET(request())).json()).code).toBe("blocked");
});
it.each([
  [new YoutubeTranscriptTooManyRequestError(), "blocked"],
  [new YoutubeTranscriptNotAvailableLanguageError("en", ["vi"], "JnHNiJyBwvY"), "language_unavailable"],
])("classifies library errors by type: %s", async (error, code) => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({})));
  mocks.fallback.mockRejectedValue(error);
  const { GET } = await import("@/app/api/yt-transcript/route");
  expect((await (await GET(request())).json()).code).toBe(code);
});
it.each([
  ['<transcript><text start="12" dur="3">Hello.</text></transcript>', 12, 3],
  ['<p t="12000" d="3000">Hello.</p>', 12000, 3000],
])("normalizes the fallback library's XML-dependent units: %s", async (xml, offset, duration) => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async input => String(input).includes("timedtext")
    ? new Response(xml) : Response.json({})));
  mocks.fallback.mockImplementation(async (_id, options) => { await options.fetch("https://www.youtube.com/api/timedtext?v=JnHNiJyBwvY"); return [{ text: "Hello.", offset, duration }]; });
  const { GET } = await import("@/app/api/yt-transcript/route");
  expect((await (await GET(request())).json()).segments[0].start).toBe(12);
});
it("bounds upstream requests with one shared timeout", async () => {
  vi.useFakeTimers(); vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; });
  vi.stubGlobal("fetch", vi.fn((_input, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))))));
  mocks.fallback.mockRejectedValue(new Error("aborted"));
  const { GET } = await import("@/app/api/yt-transcript/route"); const result = GET(request());
  await vi.advanceTimersByTimeAsync(15000); expect((await result).status).toBe(504);
});
