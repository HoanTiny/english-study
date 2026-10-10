// Isolated responsive UI audit. Run only against a local placeholder-configured build.
// All account, AI, and external requests are intercepted; no production data is used.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3117";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local QA only");
const output = process.env.SMOKE_OUTPUT || ".next/qa-app-layout";
await mkdir(output, { recursive: true });
const uid = "11111111-1111-4111-8111-111111111111";
const user = { id: uid, aud: "authenticated", role: "authenticated", email: "learner@example.test", is_anonymous: false, user_metadata: { display_name: "Học viên" } };
const expires = Math.floor(new Date("2037-01-01T00:00:00Z").getTime() / 1000);
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: uid, exp: expires, role: "authenticated" })).toString("base64url"), "fixture"].join(".");
const auth = { access_token: token, refresh_token: "fixture", expires_at: expires, expires_in: 3600, token_type: "bearer", user };
const routes = (process.env.SMOKE_ROUTES || "/,/dashboard,/today,/statistics,/notes,/journal,/errors,/shadowing,/ipa,/grammar,/vocab,/listening,/listening-exercises,/dictation,/review,/sprint,/audio-call,/collocations,/account,/lesson/greetings,/login,/onboarding,/privacy,/terms,/admin/lessons,/admin/listening,/admin/listening-exercises,/admin/users").split(",");
const baseline = process.env.SMOKE_BASELINE === "1";
const widths = (process.env.SMOKE_WIDTHS || "1440,768,390,320").split(",").map(Number);
const dark = process.env.SMOKE_DARK === "1";
const interactions = process.env.SMOKE_INTERACTIONS === "1";
const results = [];
function measure() {
  const heading = document.querySelector("h1");
  const main = heading?.closest("main") ?? heading?.parentElement;
  const overflow = [...document.querySelectorAll("main input,main button,main a,main textarea,main p,main h1,main h2,main table")].filter(el => {
    const box = el.getBoundingClientRect();
    return box.width && (box.right > innerWidth + 1 || box.left < -1) && getComputedStyle(el).position !== "fixed";
  }).slice(0, 8).map(el => ({ text: (el.textContent || el.getAttribute("placeholder") || "").slice(0, 70), class: el.className }));
  return { heading: heading?.textContent, contentWidth: Math.round(main?.getBoundingClientRect().width || 0), top: Math.round(heading?.getBoundingClientRect().top || 0), overflow, documentOverflow: document.documentElement.scrollWidth > innerWidth };
}
async function capture(page, path, width, errors, state = "") {
  results.push({ path, state, width, dark, ...await page.evaluate(measure), errors: [...errors] });
  await page.screenshot({ path: `${output}/${path.replaceAll("/", "_") || "home"}${state ? `-${state}` : ""}-${width}-${dark ? "dark" : "light"}.png`, animations: "disabled" });
}
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "msedge" }) });
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", colorScheme: dark ? "dark" : "light" });
    await context.addInitScript(({ auth, dark }) => {
      if (window !== window.top) return; // Do not seed local storage in embedded YouTube frames.
      localStorage.setItem("sb-build-check-auth-token", JSON.stringify(auth));
      localStorage.setItem("theme", dark ? "dark" : "light");
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel() {}, speak() {}, getVoices: () => [], addEventListener() {}, removeEventListener() {} } });
    }, { auth, dark });
    await context.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url());
      const send = body => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      if (url.origin === base && url.pathname.startsWith("/api/")) {
        if (url.pathname === "/api/admin/ping") return send({ role: "admin" });
        if (url.pathname.startsWith("/api/admin/")) return send({ lessons: [], videos: [], exercises: [], users: [] });
        return send({ found: false, configured: false, words: [], feedback: [] });
      }
      if (url.origin === base) return route.continue();
      if (url.hostname === "build-check.supabase.co") {
        if (url.pathname.includes("/auth/")) return send(user);
        const table = url.pathname.split("/").pop();
        if (req.method() === "POST" && table === "notes") return send({ id: "new-note", in_review: false, ...req.postDataJSON() });
        if (req.method() === "POST" && table === "journal_entries") return send(req.postDataJSON());
        if (table === "record_study_day") return send(1);
        if (table === "profiles") return send({ id: uid, current_stage: 1, onboarded: true, streak_count: 3, last_active: null, display_name: "Học viên", role: null });
        if (table === "cms_lessons") return send([{ id: "greetings", slug: "greetings", title: "Chào hỏi và giới thiệu", cefr: "A1", stage: 1, order_index: 0, intro: "Luyện chào hỏi và giới thiệu bản thân.", tip: null, audio_url: null, youtube_id: null }]);
        if (table === "cms_lesson_phrases") return send([{ lesson_id: "greetings", en: "Hello.", vi: "Xin chào.", example: "Hello, Mai.", order_index: 0 }, { lesson_id: "greetings", en: "Goodbye.", vi: "Tạm biệt.", example: "Goodbye, Nam.", order_index: 1 }]);
        if (table === "notes") return send([
          { id: "n1", kind: "structure", content: "I'm looking forward to meeting you.", meaning: "Tôi mong được gặp bạn.", example: "I'm looking forward to meeting you at the conference next week.", tags: ["giao_tiep", "cong_viec"], in_review: false },
          { id: "n2", kind: "structure", content: "It's worth trying something new.", meaning: "Đáng để thử điều mới.", example: "It's worth trying something new, even if it feels difficult at first.", tags: ["everyday_english"], in_review: false }
        ]);
        if (table === "journal_entries") return send([{ entry_date: "2026-10-08", prompt_text: "Describe a memorable day.", body: "I spent the afternoon with my friends. We visited a new coffee shop. I ordered a hot latte. We talked about our plans. It was a lovely day.", sentence_count: 5, ai_feedback: [] }]);
        if (table === "listening_exercises") return send([1, 2, 3].map(i => ({ id: `ex${i}`, title: `Everyday conversations ${i}`, unit: i, section: "Listening", level: "A1", audio_path: null, instructions: "Listen and choose the correct answer.", type: "mc", items: [{ prompt: "What would she like?", options: ["Tea", "Coffee"], answer: 1 }], transcript: "Emma: I would like a coffee, please." })));
        if (table === "error_log") return send(["grammar", "journal"].map((source, i) => ({ id: `e${i}`, source, original: "She go to school every morning.", correction: "She goes to school every morning.", note: "Thêm -s với chủ ngữ ngôi thứ ba số ít ở thì hiện tại đơn.", resolved: false, created_at: "2026-01-01T00:00:00Z", practice_count: 1, correct_streak: 1, next_review_at: "2026-01-01T00:00:00Z" })));
        return send([]);
      }
      return route.abort();
    });
    for (const path of routes) {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      if (path === "/journal") await page.clock.setFixedTime(new Date("2027-02-04T10:00:00Z")); // Different day from the prerendered build.
      await page.goto(base + path);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250); // Allow mocked account/data effects to paint.
      await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
      await capture(page, path, width, errors);
      if (interactions) {
        if (path === "/notes") {
          await page.getByRole("button", { name: "Từ vựng", exact: true }).click();
          await page.getByText(/Chưa có ghi chú trong mục này/).waitFor();
          await capture(page, path, width, errors, "empty-filter");
          await page.getByRole("button", { name: "Tất cả", exact: true }).click();
          await page.getByLabel("Cấu trúc câu", { exact: true }).fill("Would you mind opening the window?");
          await page.getByLabel("Nghĩa tiếng Việt", { exact: true }).fill("Bạn mở cửa sổ giúp tôi được không?");
          await page.getByRole("button", { name: /Thêm thẻ mới vào sổ tay/ }).click();
          await page.getByText("Would you mind opening the window?", { exact: true }).waitFor();
          await capture(page, path, width, errors, "saved-note");
        }
        if (path === "/journal") {
          await page.getByLabel("Bài viết của bạn", { exact: true }).fill("I went to a cafe. I ordered a latte. My friend joined me. We talked about work. I felt happy.");
          await page.getByRole("button", { name: "Lưu bài & chấm điểm AI", exact: true }).click();
          await page.getByRole("status").filter({ hasText: "Đã lưu nhật ký và phản hồi AI." }).waitFor();
          await capture(page, path, width, errors, "saved-journal");
        }
        if (path === "/shadowing") {
          await page.getByRole("button", { name: "Chi tiết và lịch sử", exact: true }).first().click();
          await page.getByText("Chưa có lịch sử chi tiết.", { exact: true }).waitFor();
          await capture(page, path, width, errors, "details");
        }
        if (path === "/grammar") {
          if (width < 768) {
            const filters = page.getByRole("button", { name: /Lọc theo mục đích/ });
            await filters.click();
            await page.getByRole("button", { name: "Tất cả mục đích", exact: true }).waitFor();
            await filters.click();
            assert.equal(await page.locator("#grammar-categories").isVisible(), false);
          }
          await page.locator(".study-grid button[aria-expanded]").first().click();
          await capture(page, path, width, errors, "expanded");
          await page.getByRole("button", { name: /12 thì & thể/ }).click();
          await page.getByRole("heading", { name: "Future Perfect Continuous", exact: true }).waitFor();
          await capture(page, path, width, errors, "tenses");
          await page.locator(".study-tabs button").nth(2).click();
          await capture(page, path, width, errors, "practice");
        }
        if (path === "/ipa") {
          await page.locator(".study-page button[title]").first().click();
          await page.getByRole("button", { name: "Đóng", exact: true }).waitFor();
          await capture(page, path, width, errors, "sound-details");
          await page.keyboard.press("Escape");
          await page.getByRole("button", { name: /Nghe & nhại/ }).click();
          await capture(page, path, width, errors, "shadow");
        }
        if (path === "/vocab") {
          await page.locator(".study-grid > button").first().click();
          await page.getByRole("button", { name: "Hiện đáp án", exact: true }).click();
          await capture(page, path, width, errors, "flashcard");
        }
        if (path === "/listening-exercises") {
          await page.locator(".study-grid > button").first().click();
          await page.getByLabel("Coffee", { exact: true }).check();
          await page.getByRole("button", { name: "Nộp & chấm điểm", exact: true }).click();
          await page.getByRole("button", { name: /Xem transcript/ }).click();
          await capture(page, path, width, errors, "exercise");
        }
        if (path === "/dictation") {
          await page.getByRole("button", { name: "Bắt đầu ngay", exact: true }).click();
          await capture(page, path, width, errors, "exercise");
        }
        if (path === "/admin/lessons") {
          await page.getByRole("button", { name: "+ Bài mới", exact: true }).click();
          await capture(page, path, width, errors, "editor");
        }
        if (path === "/lesson/greetings") {
          const knowledge = page.getByRole("region", { name: "Hiểu sâu & vận dụng" });
          await knowledge.locator("summary").filter({ hasText: "Tự luyện" }).click();
          await capture(page, path, width, errors, "practice");
        }
      }
      if (!baseline && width < 768 && path === "/notes") {
        assert.equal(await page.locator("header:visible").count(), 1, "Only one mobile toolbar");
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        const drawer = page.getByRole("navigation", { name: "Điều hướng trên điện thoại" });
        await drawer.waitFor();
        const header = await page.locator("#mobile-app-header").boundingBox();
        const box = await drawer.boundingBox();
        assert.ok(box.y >= header.y + header.height - 1, "Drawer starts below mobile toolbar");
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden", "Background does not scroll behind drawer");
        assert.equal(await page.locator("#app-content").evaluate(el => el.inert), true, "Content behind drawer cannot receive focus");
        await drawer.getByRole("link").last().focus();
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement.closest("#mobile-app-header") !== null), true, "Tab stays inside mobile navigation");
        await page.screenshot({ path: `${output}/menu-${width}.png` });
        await page.keyboard.press("Escape");
        await drawer.waitFor({ state: "hidden" });
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await drawer.getByRole("link", { name: /Nhật ký phản xạ/ }).click();
        await page.waitForURL("**/journal");
        await drawer.waitFor({ state: "hidden" });
      }
      await page.close();
    }
    await context.close();
    console.log(`Checked ${routes.length} screens at ${width}px (${dark ? "dark" : "light"})`);
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
}
const failures = results.filter(r => r.errors.length || r.documentOverflow || r.overflow.length);
console.log(JSON.stringify({ pages: results.length, failures, report: `${output}/report.json` }, null, 2));
if (!baseline) assert.equal(failures.length, 0, "No runtime errors or clipped content across audited screens");
