import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn(), admin: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/server/authUser", () => ({ getUserId: mocks.user }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ supabaseAdmin: () => ({ rpc: mocks.rpc }), checkAdmin: mocks.admin }));
import { geminiGenerate } from "@/lib/server/gemini";
import { parseTokenUsage, reserveTokens, settleTokens, TokenBudgetError } from "@/lib/server/tokenUsage";
import { PATCH } from "@/app/api/admin/token-usage/route";
const id = "11111111-1111-4111-8111-111111111111";
const request = () => new Request("http://localhost/api/roleplay", { headers: { authorization: "Bearer fixture" } });
const contents = [{ role: "user", parts: [{ text: "Hello" }] }];
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("GEMINI_API_KEY", "fake-test-only");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.user.mockResolvedValue(id); mocks.admin.mockResolvedValue(true);
  mocks.rpc.mockImplementation(async (name: string) => ({ error: null, data: name === "reserve_ai_tokens" ? { allowed: true, maxOutputTokens: 500 } : null }));
  mocks.fetch.mockImplementation(async (url: string) => url.endsWith(":countTokens") ? Response.json({ totalTokens: 10 }) : Response.json({ candidates: [{ content: { parts: [{ text: "Hi" }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 30, totalTokenCount: 60 } }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("records actual input/output/thinking and caps generation using reserved budget", async () => {
  expect(await geminiGenerate(contents, { request: request(), system: "Tutor" })).toBe("Hi");
  const countBody = JSON.parse(mocks.fetch.mock.calls[0][1].body);
  expect(countBody.generateContentRequest.systemInstruction.parts[0].text).toBe("Tutor");
  expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_user: id, p_input: 74, p_feature: "/api/roleplay" });
  const body = JSON.parse(mocks.fetch.mock.calls[1][1].body);
  expect(body.generationConfig.maxOutputTokens).toBe(500);
  expect(mocks.rpc.mock.calls[1][1]).toMatchObject({ p_status: "completed", p_input: 10, p_output: 20, p_thinking: 30, p_total: 60 });
});
it("does not generate when quota is exhausted or database cannot reserve", async () => {
  for (const result of [{ data: { allowed: false }, error: null }, { data: null, error: { message: "db down" } }]) {
    mocks.rpc.mockResolvedValue(result); mocks.fetch.mockClear();
    await expect(geminiGenerate(contents, { request: request() })).rejects.toBeInstanceOf(TokenBudgetError);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  }
});
it("authenticates the request rather than trusting a user id supplied by a client", async () => {
  mocks.user.mockResolvedValue(null);
  await expect(reserveTokens(request(), 10, "test")).rejects.toMatchObject({ status: 401 });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("does not retry uncertain provider outcomes and retains their reservation", async () => {
  mocks.fetch.mockImplementation(async (url: string) => {
    if (url.endsWith(":countTokens")) return Response.json({ totalTokens: 10 });
    throw new Error("network lost");
  });
  await expect(geminiGenerate(contents, { request: request() })).rejects.toThrow("network lost");
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  expect(mocks.rpc.mock.calls[1][1].p_status).toBe("uncertain");
});
it("releases budget for a definite provider rejection", async () => {
  mocks.fetch.mockImplementation(async (url: string) => url.endsWith(":countTokens") ? Response.json({ totalTokens: 10 }) : Response.json({}, { status: 429 }));
  await expect(geminiGenerate(contents, { request: request() })).rejects.toThrow("429");
  expect(mocks.rpc.mock.calls[1][1].p_status).toBe("released");
});
it("does not pretend missing usage metadata is zero", async () => {
  mocks.fetch.mockImplementation(async (url: string) => url.endsWith(":countTokens") ? Response.json({ totalTokens: 10 }) : Response.json({ candidates: [] }));
  await expect(geminiGenerate(contents, { request: request() })).rejects.toBeInstanceOf(TokenBudgetError);
  expect(mocks.rpc.mock.calls[1][1].p_status).toBe("uncertain");
});
it("fails closed if settlement cannot be persisted", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "offline" } });
  await expect(settleTokens("request", "completed", { input: 1, output: 2, thinking: 0, total: 3 })).rejects.toBeInstanceOf(TokenBudgetError);
});
it("validates provider token metadata", () => {
  for (const data of [null, {}, { promptTokenCount: -1, totalTokenCount: 3 }, { promptTokenCount: 1.5, totalTokenCount: 3 }, { promptTokenCount: 2, candidatesTokenCount: 3, totalTokenCount: 4 }]) expect(parseTokenUsage(data)).toBeNull();
  expect(parseTokenUsage({ promptTokenCount: 2, totalTokenCount: 2 })).toEqual({ input: 2, output: 0, thinking: 0, total: 2 });
});
it("requires admin authorization to update a limit", async () => {
  mocks.admin.mockResolvedValue(false);
  const res = await PATCH(new Request("http://localhost/api/admin/token-usage", { method: "PATCH", body: JSON.stringify({ id, monthlyLimit: 10 }) }));
  expect(res.status).toBe(403); expect(mocks.rpc).not.toHaveBeenCalled();
});
it("supports unlimited and zero without accepting malformed limits", async () => {
  for (const monthlyLimit of [null, 0, 100000]) {
    expect((await PATCH(new Request("http://localhost/api/admin/token-usage", { method: "PATCH", body: JSON.stringify({ id, monthlyLimit }) }))).status).toBe(200);
  }
  for (const monthlyLimit of [-1, "100", 1.5, 1000000001, undefined]) {
    expect((await PATCH(new Request("http://localhost/api/admin/token-usage", { method: "PATCH", body: JSON.stringify({ id, monthlyLimit }) }))).status).toBe(400);
  }
});
