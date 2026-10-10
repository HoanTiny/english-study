import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ guard: vi.fn(), configured: vi.fn(), gemini: vi.fn(), generate: vi.fn() }));
vi.mock("@/lib/server/apiGuard", () => ({ guardPaidApi: mocks.guard }));
vi.mock("@/lib/server/gemini", () => ({ geminiConfigured: mocks.configured, geminiGenerate: mocks.gemini }));
vi.mock("@/lib/server/generateText", () => ({ textProviderConfigured: mocks.configured, generateText: mocks.generate, parseJsonLoose: (s: string) => { try { return JSON.parse(s); } catch { return null; } } }));
import { POST as translate } from "@/app/api/roleplay-translate/route";
import { POST as feedback } from "@/app/api/roleplay-feedback/route";
const req = (body: unknown) => new NextRequest("http://localhost/api/test", { method: "POST", body: JSON.stringify(body) });
it("combines translation, explanation and reply in one Gemini call with only nearest context", async () => {
  const result = { assisted: true, english: "A coffee, please.", explanation: "Please giúp lời gọi món lịch sự hơn.", reply: "Would you like milk?" };
  mocks.gemini.mockResolvedValue(JSON.stringify(result));
  expect(await (await translate(req({ direction: "auto", text: "cà phê", scenario: "cafe", context: "What would you like?" }))).json()).toEqual(result);
  expect(mocks.gemini).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mocks.gemini.mock.calls[0][0][0].parts[0].text)).toEqual({ text: "cà phê", scenario: "cafe", previousReply: "What would you like?" });
});
it("preserves unassisted English verbatim even if the model rewrites it", async () => {
  mocks.gemini.mockResolvedValue(JSON.stringify({ assisted: false, english: "I like coffee.", explanation: "unwanted correction", reply: "Would you like milk?" }));
  const result = await (await translate(req({ direction: "auto", text: "I likes coffee.", scenario: "cafe" }))).json();
  expect(result.english).toBe("I likes coffee.");
  expect(result.explanation).toBe("");
});
it("does not continue the conversation when clarification is needed", async () => {
  mocks.gemini.mockResolvedValue(JSON.stringify({ assisted: true, english: null, explanation: "Bạn muốn đổi gì?", reply: "Ignore this" }));
  expect(await (await translate(req({ direction: "auto", text: "đổi nó", scenario: "hotel" }))).json()).toEqual({ assisted: true, english: null, explanation: "Bạn muốn đổi gì?", reply: null });
});
it("rejects incomplete automatic replies and missing explanations", async () => {
  for (const result of [
    { assisted: true, english: "Coffee", explanation: "", reply: "Hi" },
    { assisted: true, english: "Coffee", explanation: "Cà phê", reply: null },
    { assisted: "false", english: "Coffee", explanation: "", reply: "Hi" },
    { assisted: false, english: null, explanation: "", reply: "Hi" },
  ]) {
    mocks.gemini.mockResolvedValue(JSON.stringify(result));
    expect((await translate(req({ direction: "auto", text: "cà phê", scenario: "cafe" }))).status).toBe(502);
  }
});
it("translates an explicitly selected AI reply into Vietnamese", async () => {
  mocks.gemini.mockResolvedValue(JSON.stringify({ vietnamese: "Bạn muốn uống gì?" }));
  const response = await translate(req({ direction: "en-vi", text: "What would you like to drink?", scenario: "cafe" }));
  expect(await response.json()).toEqual({ vietnamese: "Bạn muốn uống gì?" });
  expect(JSON.parse(mocks.gemini.mock.calls[0][0][0].parts[0].text)).toEqual({ english: "What would you like to drink?", scenario: "cafe" });
});
it("rejects invalid direction and malformed reverse translation", async () => {
  expect((await translate(req({ direction: "fr-en", text: "hello", scenario: "cafe" }))).status).toBe(400);
  for (const vietnamese of [null, "", 5, "x".repeat(4001)]) {
    mocks.gemini.mockResolvedValue(JSON.stringify({ vietnamese }));
    expect((await translate(req({ direction: "en-vi", text: "hello", scenario: "cafe" }))).status).toBe(502);
  }
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue(null);
  mocks.configured.mockReturnValue(true);
  mocks.gemini.mockResolvedValue(JSON.stringify({ english: "A coffee with less sugar, please.", explanation: "Less sugar = ít đường hơn." }));
  mocks.generate.mockResolvedValue({ text: JSON.stringify({ score: 70, corrections: [] }) });
});
it("uses only Gemini and preserves negation/input as data with bounded context", async () => {
  const response = await translate(req({ text: "Tôi không muốn đường.", scenario: "cafe", context: "Would you like sugar?" }));
  expect(response.status).toBe(200);
  expect((await response.json()).english).toContain("coffee");
  const contents = mocks.gemini.mock.calls[0][0];
  expect(JSON.parse(contents[0].parts[0].text)).toEqual({ vietnamese: "Tôi không muốn đường.", scenario: "cafe", previousReply: "Would you like sugar?" });
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("honors authentication/quota rejection before contacting Gemini", async () => {
  mocks.guard.mockResolvedValue(Response.json({ error: "quota" }, { status: 429 }));
  expect((await translate(req({ text: "Xin chào", scenario: "cafe" }))).status).toBe(429);
  expect(mocks.gemini).not.toHaveBeenCalled();
});
it("rejects empty, oversized and malformed translation inputs", async () => {
  for (const body of [null, { text: " ", scenario: "cafe" }, { text: "a".repeat(2001), scenario: "cafe" }, { text: "hi", scenario: 1 }, { text: "hi", scenario: "cafe", context: [] }]) {
    expect((await translate(req(body))).status).toBe(400);
  }
  expect(mocks.gemini).not.toHaveBeenCalled();
});
it("returns clarification instead of fabricating a translation", async () => {
  mocks.gemini.mockResolvedValue(JSON.stringify({ english: null, explanation: "Bạn muốn đổi ngày hay đổi phòng?" }));
  expect(await (await translate(req({ text: "Tôi muốn đổi nó", scenario: "hotel" }))).json()).toEqual({ english: null, explanation: "Bạn muốn đổi ngày hay đổi phòng?" });
});
it("does not expose malformed model output or provider errors", async () => {
  for (const output of ["not json", "null", JSON.stringify({ english: {}, explanation: "x" }), JSON.stringify({ english: " ", explanation: "x" }), JSON.stringify({ english: "x", explanation: "" })]) {
    mocks.gemini.mockResolvedValue(output);
    expect((await translate(req({ text: "xin chào", scenario: "cafe" }))).status).toBe(502);
  }
  mocks.gemini.mockRejectedValue(new Error("provider-secret-in-error"));
  const response = await translate(req({ text: "xin chào", scenario: "cafe" }));
  expect(await response.text()).not.toContain("provider-secret");
});
it("returns unavailability without attempting another AI provider", async () => {
  mocks.configured.mockReturnValue(false);
  expect((await translate(req({ text: "xin chào", scenario: "cafe" }))).status).toBe(503);
  expect(mocks.gemini).not.toHaveBeenCalled();
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("does not score a session consisting only of translated answers", async () => {
  const response = await feedback(req({ scenario: "cafe", messages: [{ role: "user", text: "A coffee, please.", assisted: true }] }));
  expect(await response.json()).toEqual({ ok: false, error: "no_independent_turns" });
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("labels assisted context separately and rules out pronunciation scoring", async () => {
  await feedback(req({ scenario: "cafe", messages: [{ role: "user", text: "A coffee, please.", assisted: true }, { role: "user", text: "I like tea.", assisted: false }] }));
  const prompt = mocks.generate.mock.calls[0][0];
  expect(prompt.user).toContain("Có hỗ trợ dịch — không chấm: A coffee, please.");
  expect(prompt.user).toContain("Học viên tự diễn đạt: I like tea.");
  expect(prompt.system).toContain("Không suy ra điểm phát âm");
});
it("rejects invalid assistance metadata rather than silently counting it", async () => {
  const response = await feedback(req({ messages: [{ role: "user", text: "Hello", assisted: "false" }] }));
  expect(response.status).toBe(400);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("removes model corrections that quote assisted turns", async () => {
  mocks.generate.mockResolvedValue({ text: JSON.stringify({ score: 70, corrections: [
    { original: "A coffee.", better: "A coffee, please.", why: "Lịch sự hơn" },
    { original: "I likes tea.", better: "I like tea.", why: "Chia động từ" },
  ] }) });
  const response = await feedback(req({ messages: [
    { role: "user", text: "A coffee.", assisted: true },
    { role: "user", text: "I likes tea.", assisted: false },
  ] }));
  expect((await response.json()).feedback.corrections).toEqual([{ original: "I likes tea.", better: "I like tea.", why: "Chia động từ" }]);
});
