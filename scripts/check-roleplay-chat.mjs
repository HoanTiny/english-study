// Local-only interaction QA: fake account, mocked APIs, microphone and speech.
// No real user data or AI requests leave this test browser.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co").hostname;
const storageKey = `sb-${supabaseHost.split(".")[0]}-auth-token`;
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.SMOKE_BASE_URL || "http://localhost:3108";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local QA only");
const uid = "11111111-1111-4111-8111-111111111111";
const user = { id: uid, aud: "authenticated", role: "authenticated", email: "learner@example.test", is_anonymous: false, user_metadata: {} };
const expiry = Math.floor(Date.now() / 1000) + 3600;
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: uid, exp: expiry, role: "authenticated" })).toString("base64url"), "fixture"].join(".");
const auth = { access_token: token, refresh_token: "fixture", expires_at: expiry, expires_in: 3600, token_type: "bearer", user };
await mkdir(".next/qa-roleplay-chat", { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(({ auth, storageKey }) => {
      localStorage.setItem(storageKey, JSON.stringify(auth));
      window.qa = { spoken: [], cancelled: 0, rec: null };
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel() { window.qa.cancelled++; }, speak(utterance) { window.qa.spoken.push(utterance.text); } } });
      class FakeRecognition {
        start() { window.qa.rec = this; }
        stop() { this.onend?.(); }
        abort() { this.onend?.(); }
      }
      window.SpeechRecognition = FakeRecognition;
    }, { auth, storageKey });
    const calls = [];
    let failReply = false;
    let failTranslation = false;
    let clarify = false;
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      const send = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (url.origin === base && url.pathname.startsWith("/api/")) {
        const body = request.postDataJSON();
        calls.push({ path: url.pathname, body });
        if (url.pathname === "/api/roleplay") {
          if (failReply) { failReply = false; return send({ error: "Lỗi mạng thử nghiệm" }, 503); }
          return send({ reply: "What would you like to drink?", source: "fixture" });
        }
        if (url.pathname === "/api/roleplay-translate") {
          if (body.direction === "en-vi") return send({ vietnamese: "Bạn muốn uống gì?" });
          if (failTranslation) { failTranslation = false; return send({ error: "Dịch thử nghiệm bị gián đoạn" }, 502); }
          const assisted = body.text.startsWith("Tôi");
          return send(clarify ? { assisted: true, english: null, explanation: "Bạn muốn đổi ngày hay đổi phòng?", reply: null } : { assisted, english: assisted ? "I'd like a coffee with less sugar, to go, please." : body.text, explanation: assisted ? "To go nghĩa là mang đi. Dùng I'd like để gọi món lịch sự." : "", reply: "What would you like to drink?" });
        }
        if (url.pathname === "/api/roleplay-feedback") return send({ ok: true, feedback: { score: 80, strengths: ["Diễn đạt rõ"], corrections: [], vocab: [], fluency: "Câu ngắn, rõ nghĩa.", tip: "Thử đặt câu hỏi tiếp nối." } });
        return send({});
      }
      if (url.origin === base) return route.continue();
      if (url.hostname === supabaseHost) {
        if (url.pathname.includes("/auth/")) return send(user);
        if (url.pathname.endsWith("/profiles")) return send({ id: uid, onboarded: true, current_stage: 1, role: null });
        return send([]);
      }
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/roleplay`);
    await page.getByRole("button", { name: "☕ Quán cà phê", exact: true }).click();
    await page.getByRole("log").getByText("What would you like to drink?", { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.qa.spoken), [], "Chat defaults to silent");
    assert.equal(calls.filter(c => c.path.includes("translate")).length, 0);
    await page.getByRole("button", { name: "Dịch câu AI 1", exact: true }).click();
    await page.getByText("Bạn muốn uống gì?", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Ẩn bản dịch 1", exact: true }).click();
    assert.equal(await page.getByText("Bạn muốn uống gì?", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Dịch câu AI 1", exact: true }).click();
    await page.getByText("Bạn muốn uống gì?", { exact: true }).waitFor();
    assert.equal(calls.filter(c => c.body?.direction === "en-vi").length, 1, "Reopening uses cached translation");
    const compactHeight = await page.getByRole("button", { name: "Gửi", exact: true }).evaluate(el => el.getBoundingClientRect().height);
    assert.ok(compactHeight >= 40 && compactHeight <= 48, "Compact, accessible send button height");
    const draft = page.getByLabel("Câu trả lời của bạn", { exact: true });
    await draft.fill("I like tea.");
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await page.getByText("1 câu tự diễn đạt · 0 câu có hỗ trợ dịch", { exact: true }).waitFor();
    const beforeTyping = calls.length;
    await draft.fill("Tôi muốn cà phê ít đường mang đi.");
    assert.equal(calls.length, beforeTyping, "Typing does not call API");
    failTranslation = true;
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await page.getByRole("alert").getByText("Dịch thử nghiệm bị gián đoạn").waitFor();
    assert.equal(await draft.inputValue(), "Tôi muốn cà phê ít đường mang đi.");
    const callsBeforeSend = calls.length;
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await page.getByRole("log").getByText("To go nghĩa là mang đi. Dùng I'd like để gọi món lịch sự.", { exact: true }).waitFor();
    assert.equal(calls.length, callsBeforeSend + 1, "One request translates, explains and replies");
    assert.equal(await page.getByRole("log").getByText("I'd like a coffee with less sugar, to go, please.", { exact: true }).count(), 1);
    await page.getByText("1 câu tự diễn đạt · 1 câu có hỗ trợ dịch", { exact: true }).waitFor();
    await page.getByRole("button", { name: "⭐ Nhận xét hội thoại", exact: true }).click();
    await page.getByText("Nhận xét cách diễn đạt", { exact: true }).waitFor();
    const sent = calls.find(c => c.path === "/api/roleplay-feedback").body.messages;
    assert.equal(sent.filter(m => m.role === "user" && m.assisted).length, 1);
    assert.equal(sent.filter(m => m.role === "user" && !m.assisted).length, 1);
    assert.deepEqual(await page.evaluate(() => window.qa.spoken), []);

    // Mode switches retain conversation and stop mic callbacks from changing drafts.
    await page.getByRole("button", { name: "🎤 Luyện nói", exact: true }).click();
    await draft.fill("Hello.");
    await page.getByRole("button", { name: "Bắt đầu nói", exact: true }).click();
    await page.evaluate(() => window.qa.rec.onresult({ results: [[{ transcript: "I like coffee." }]] }));
    assert.equal(await draft.inputValue(), "Hello. I like coffee.");
    await page.getByRole("button", { name: "⌨️ Chat chữ", exact: true }).click();
    await page.evaluate(() => window.qa.rec.onresult({ results: [[{ transcript: "late result" }]] }));
    assert.equal(await draft.inputValue(), "Hello. I like coffee.");
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await page.getByText("2 câu tự diễn đạt · 1 câu có hỗ trợ dịch", { exact: true }).waitFor();
    clarify = true;
    await draft.fill("Tôi muốn đổi nó.");
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await page.getByText("Cần làm rõ ý", { exact: true }).waitFor();
    assert.equal(await draft.inputValue(), "Tôi muốn đổi nó.");
    assert.equal(await page.getByRole("log").getByText("Tôi muốn đổi nó.", { exact: true }).count(), 0);
    clarify = false;
    await page.getByRole("button", { name: "🎤 Luyện nói", exact: true }).click();
    await draft.fill("Can I have water?");
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await page.waitForFunction(() => window.qa.spoken.length === 1);
    await page.getByLabel("Tự đọc câu trả lời của AI").uncheck();
    await draft.fill("Thank you.");
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await page.getByText("4 câu tự diễn đạt · 1 câu có hỗ trợ dịch", { exact: true }).waitFor();
    // Wait for reply completion before asserting that autoplay stayed disabled.
    await page.waitForFunction(() => !document.querySelector('#english-draft').readOnly);
    assert.equal(await page.evaluate(() => window.qa.spoken.length), 1);
    await page.evaluate(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
    await page.getByRole("button", { name: "Bắt đầu nói", exact: true }).click();
    await page.getByRole("alert").getByText("Trình duyệt chưa hỗ trợ nhận diện giọng nói.", { exact: false }).waitFor();
    await draft.fill("I can still type.");
    assert.equal(await draft.inputValue(), "I can still type.");
    await page.getByRole("button", { name: "⌨️ Chat chữ", exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `.next/qa-roleplay-chat/${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: silent chat, unified composer, one-call translation and explanation, assistance metadata, retries, mic cancellation, clarification, no overflow/errors`);
    await context.close();
  }
} finally { await browser.close(); }
