// Local browser QA only. Every backend request is mocked; no user progress,
// credentials, AI calls or production content is used or changed.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.SMOKE_BASE_URL || "http://localhost:3108";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local QA only");
const knowledge = JSON.parse(await readFile("src/data/lesson-knowledge.json", "utf8"));
const out = ".next/qa-knowledge-practice";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const report = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    let mode = "published";
    const writes = [];
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === base) {
        if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
        return route.continue();
      }
      if (url.hostname !== "example.supabase.co") return route.abort();
      const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "content-type": "application/json" };
      const send = (body, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (url.pathname.startsWith("/auth/")) return send({ message: "No login in this local fixture" }, 401);
      if (!["GET", "HEAD"].includes(request.method())) writes.push(url.pathname);
      if (url.pathname.endsWith("/cms_lessons")) {
        if (mode === "error") return send({ message: "Fixture unavailable" }, 503);
        if (mode === "hidden") return send([]);
        const slug = url.searchParams.get("slug")?.replace(/^eq\./, "") || "greetings";
        return send([{ id: slug, slug, title: `Bài kiểm tra: ${slug}`, cefr: "A1", intro: "Dữ liệu CMS giả lập chỉ dùng để kiểm tra giao diện.", tip: null, audio_url: null, youtube_id: null }]);
      }
      if (url.pathname.endsWith("/cms_lesson_phrases")) return send([
        { en: "Hello.", vi: "Xin chào.", example: "Hello, Mai.", order_index: 0 },
        { en: "Goodbye.", vi: "Tạm biệt.", example: "Goodbye, Nam.", order_index: 1 },
      ]);
      return send([]);
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/lesson/greetings`);
    const section = page.getByRole("region", { name: "Hiểu sâu & vận dụng" });
    await section.waitFor();
    await section.locator("summary").filter({ hasText: "Tự luyện" }).click();
    const answer = section.getByRole("textbox").nth(0);
    const check = section.getByRole("button", { name: "Kiểm tra đáp án", exact: true });
    assert.equal(await check.isDisabled(), true);
    assert.equal(await section.getByText("Đáp án tham khảo:", { exact: true }).count(), 0);
    await answer.fill("am; is");
    await check.click();
    await section.getByText("Chưa khớp đáp án ngắn.", { exact: false }).waitFor();
    assert.equal(await answer.getAttribute("readonly"), "");
    await section.getByRole("button", { name: "Thử lại câu này" }).click();
    await answer.fill("IS, AM.");
    await check.click();
    await section.getByText("Đúng rồi!", { exact: true }).waitFor();
    await section.getByRole("textbox").nth(1).fill("What is your job?");
    await section.getByRole("button", { name: "Đối chiếu câu trả lời" }).click();
    await section.getByRole("button", { name: "Tôi đã đối chiếu" }).click();
    await section.getByText("1 câu đúng tự động · 1 câu đã tự đối chiếu · 2 câu tổng cộng", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await section.screenshot({ path: `${out}/${viewport.width}-practice.png` });
    await section.getByRole("button", { name: "Làm lại toàn bộ" }).click();
    assert.equal(await answer.inputValue(), "");
    await section.getByRole("button", { name: "Xem lời giải", exact: true }).first().click();
    await section.getByText("Bạn đang xem lời giải; câu này chưa được tính là trả lời đúng.", { exact: true }).waitFor();
    await section.getByText("0 câu đúng tự động · 0 câu đã tự đối chiếu · 2 câu tổng cộng", { exact: true }).waitFor();

    // Existing end-of-lesson quiz can still start alongside the supplement.
    await page.getByRole("button", { name: "Bắt đầu kiểm tra →" }).click();
    await page.getByText("Câu 1/2", { exact: true }).waitFor();

    for (const slug of ["present-perfect", "restaurant", "relative-clauses"]) {
      await page.goto(`${base}/lesson/${slug}`);
      await section.waitFor();
      await section.locator("summary").filter({ hasText: "Tự luyện" }).click();
      assert.equal(await section.getByRole("textbox").nth(0).inputValue(), "");
      assert.equal(await section.getByRole("textbox").count(), knowledge[slug].practice.length);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.goto(`${base}/lesson/custom-cms-lesson`);
    await page.getByRole("heading", { name: "Bài kiểm tra: custom-cms-lesson" }).waitFor();
    assert.equal(await section.count(), 0);
    mode = "hidden";
    await page.goto(`${base}/lesson/greetings`);
    await page.getByText("Bài học này đang được ban biên tập thiết lập", { exact: false }).waitFor();
    assert.equal(await section.count(), 0);
    mode = "error";
    await page.goto(`${base}/lesson/greetings`);
    await page.getByRole("alert").filter({ hasText: "Không tải được bài học" }).waitFor();
    assert.equal(await section.count(), 0);
    mode = "published";
    await page.goto(`${base}/grammar`);
    await page.getByRole("button", { name: /12 thì & thể/ }).click();
    assert.equal(await page.getByRole("heading", { name: "Future Perfect Continuous", exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(writes, [], "Supplement practice must not write or mark lessons complete");
    assert.deepEqual(errors, [], "No unhandled browser errors");
    report.push({ viewport, passed: true, scenarios: ["empty", "wrong", "correct", "self-review", "retry", "reveal-without-credit", "reset", "new-lesson", "quiz-start", "custom-slug", "hidden-CMS", "CMS-error", "12-tenses", "no-overflow", "no-progress-writes"] });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
