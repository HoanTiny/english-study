// Run against a local build made with public Supabase placeholders.
// Uses an isolated browser and intercepts all external requests; no live AI/account data.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.SMOKE_BASE_URL || "http://localhost:3117";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local QA only");
const output = process.env.SMOKE_OUTPUT || ".next/qa-roleplay-layout";
await mkdir(output, { recursive: true });
const uid = "11111111-1111-4111-8111-111111111111";
const user = { id: uid, aud: "authenticated", role: "authenticated", email: "learner@example.test", is_anonymous: false, user_metadata: { display_name: "Học viên" } };
const expiry = Math.floor(Date.now() / 1000) + 3600;
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: uid, exp: expiry, role: "authenticated" })).toString("base64url"), "fixture"].join(".");
const auth = { access_token: token, refresh_token: "fixture", expires_at: expiry, expires_in: 3600, token_type: "bearer", user };
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "msedge" }) });
try {
  for (const [width, dark] of [[1647, false], [1440, false], [1280, false], [1024, false], [768, false], [390, false], [320, false], [1440, true], [390, true]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: dark ? "dark" : "light", reducedMotion: "reduce" });
    await context.addInitScript(({ auth, dark }) => {
      localStorage.setItem("sb-build-check-auth-token", JSON.stringify(auth));
      localStorage.setItem("theme", dark ? "dark" : "light");
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel() {}, speak() {} } });
    }, { auth, dark });
    let turn = 0;
    const replies = ["Hi there! Welcome to our coffee shop. What can I get for you today?", "Of course. Would you like your coffee hot or iced?", "Great choice. Would you like milk or sugar in your coffee?", "We also have oat milk. Would you like to try it?", "Your coffee will be ready in a moment. Would you like anything to eat?", "The total is five dollars. Would you like to pay by card?", "Thank you! Have a lovely day. Is there anything else I can help with?"];
    await context.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url());
      const send = body => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      if (url.origin === base && url.pathname.startsWith("/api/")) {
        if (url.pathname === "/api/roleplay") return send({ reply: replies[0] });
        if (url.pathname === "/api/roleplay-translate") {
          const body = req.postDataJSON();
          if (body.direction === "en-vi") return send({ vietnamese: "Chào bạn! Bạn muốn dùng món gì hôm nay?" });
          return send({ assisted: false, english: body.text, explanation: "", reply: replies[++turn % replies.length] });
        }
        if (url.pathname === "/api/roleplay-feedback") return send({ ok: true, feedback: { score: 82, fluency: "Bạn diễn đạt rõ yêu cầu và tiếp nối cuộc trò chuyện.", strengths: ["Biết dùng lời đề nghị lịch sự."], corrections: [], vocab: [{ phrase: "to go", vi: "mang đi" }], tip: "Thử hỏi thêm về món bạn chưa biết." } });
        return send({});
      }
      if (url.origin === base) return route.continue();
      if (url.hostname === "build-check.supabase.co") {
        if (url.pathname.includes("/auth/")) return send(user);
        if (url.pathname.endsWith("/profiles")) return send({ id: uid, onboarded: true, current_stage: 1, role: null });
        return send([]);
      }
      return route.abort();
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/roleplay`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
    if (width === 1440 && !dark) await page.screenshot({ path: `${output}/empty-desktop.png`, fullPage: true });
    await page.getByRole("button", { name: "☕ Quán cà phê", exact: true }).click();
    const log = page.getByRole("log");
    await log.getByText(replies[0], { exact: true }).waitFor();
    await page.getByRole("button", { name: "Dịch câu AI 1", exact: true }).click();
    await log.getByText("Chào bạn! Bạn muốn dùng món gì hôm nay?", { exact: true }).waitFor();
    const draft = page.getByLabel("Câu trả lời của bạn", { exact: true });
    for (const answer of ["I'd like a coffee, please.", "Hot, please.", "A little milk, without sugar.", "Yes, I'd love to try oat milk.", "Just the coffee, thank you.", "By card, please."]) {
      await draft.fill(answer);
      await page.getByRole("button", { name: "Gửi", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector("#english-draft").readOnly && document.querySelector("#english-draft").value === "");
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No horizontal overflow at ${width}px`);
    const chat = await page.getByRole("region", { name: "Khung hội thoại", exact: true }).boundingBox();
    const hints = await page.getByRole("complementary", { name: "Gợi ý luyện tập", exact: true }).boundingBox();
    const inputBox = await draft.boundingBox();
    assert.ok(inputBox.x >= chat.x && inputBox.x + inputBox.width <= chat.x + chat.width, "Composer remains within the chat");
    assert.ok(await log.evaluate(el => el.scrollHeight > el.clientHeight && el.scrollTop > 0), "Conversation scrolls independently");
    if (width >= 1280) {
      assert.ok(hints.x >= chat.x + chat.width, "Desktop guide is alongside conversation");
      if (width >= 1440) assert.ok(chat.width > 700, "Desktop conversation uses the previously empty space");
      const reviewButton = await page.getByRole("button", { name: "⭐ Nhận xét hội thoại", exact: true }).boundingBox();
      assert.ok(reviewButton.y + reviewButton.height <= chat.y + chat.height + 1, "Review action is visible alongside the chat");
    } else assert.ok(hints.y >= chat.y + chat.height - 1, "Tablet/mobile guide follows conversation");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
    if (width === 1440 && !dark) await page.getByRole("region", { name: "Khung hội thoại", exact: true }).locator("..").locator("..").screenshot({ path: `${output}/roleplay-desktop.png` });
    if (width === 1440 && !dark) await page.screenshot({ path: `${output}/desktop-viewport.png` });
    if (width === 390 && !dark) {
      await page.setViewportSize({ width: 390, height: 500 });
      await draft.fill("A longer draft stays editable when the mobile viewport becomes shorter.");
      await page.getByRole("button", { name: "Gửi", exact: true }).scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `${output}/mobile-short-viewport.png` });
    }
    await page.getByRole("button", { name: "⭐ Nhận xét hội thoại", exact: true }).click();
    await page.getByRole("heading", { name: "Nhận xét cách diễn đạt", exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px ${dark ? "dark" : "light"}: chat ${Math.round(chat.width)}px, internal scroll, composer, guide, feedback, no overflow/runtime errors`);
    await context.close();
  }
} finally { await browser.close(); }
