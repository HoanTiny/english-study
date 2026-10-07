// Optional browser regression test. Run against a build using .env.example-like
// placeholders: https://build-check.supabase.co / build-check-placeholder.
// All backend calls are intercepted; no real account or service is used.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
const { chromium } = load(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.SMOKE_BASE_URL || "http://localhost:3107";
const uid = "11111111-1111-4111-8111-111111111111";
const user = { id: uid, aud: "authenticated", role: "authenticated", email: "learner@example.test", is_anonymous: false, user_metadata: { display_name: "Học viên" } };
const expiry = Math.floor(Date.now()/1000)+3600;
const token = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: uid, exp: expiry, role: "authenticated" })).toString("base64url"), "fixture-signature"].join(".");
const auth = { access_token: token, refresh_token: "fixture-refresh", expires_at: expiry, expires_in: 3600, token_type: "bearer", user };

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(({ auth }) => localStorage.setItem("sb-build-check-auth-token", JSON.stringify(auth)), { auth });
    let failDashboard = true;
    let failPractice = true;
    let reviews = [];
    let practiced = 0;
    let study = { revision: 0, session: null };
    const errorRow = { id: "e1", source: "grammar", original: "She go to school.", correction: "She goes to school.", note: "Hiện tại đơn", resolved: false, created_at: "2026-01-01T00:00:00Z", practice_count: 0, correct_streak: 0, last_practiced_at: null, next_review_at: "2026-01-01T00:00:00Z" };
    await context.route("https://build-check.supabase.co/**", async route => {
      const req = route.request(); const url = new URL(req.url());
      if (process.env.SMOKE_DEBUG) console.log(req.method(), url.pathname);
      const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "content-type": "application/json" };
      const send = (body, status=200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (url.pathname.includes("/auth/")) return send(user);
      const table = url.pathname.split("/").pop();
      const body = req.postDataJSON();
      if (table === "study_sessions") return send(study.revision ? [study] : []);
      if (table === "sync_study_session") {
        if (body.p_expected_revision !== study.revision) return send({ ...study, applied: false });
        study = { revision: study.revision + 1, session: body.p_session }; return send({ ...study, applied: true });
      }
      if (table === "profiles") return send(req.method() === "GET" ? { id: uid, current_stage: 2, onboarded: true, streak_count: 0, last_active: null, display_name: "Học viên", role: null } : {});
      if (table === "notes") return send([{ id: "n1", kind: "word", content: "hello", meaning: "xin chào", example: "Hello, Anna.", tags: [], in_review: true }]);
      if (table === "review_items") {
        if (req.method() === "POST") { const row = { ...body, id: "r1" }; reviews = [row]; return send(row); }
        return send(reviews);
      }
      if (table === "shadowing_attempts") {
        if (failDashboard && !url.searchParams.get("select")?.includes("assessment")) return send({ message: "fixture unavailable" }, 400);
        return send([{ client_key: "s1", pronunciation_score: 70, created_at: "2026-01-01T00:00:00Z", assessment: { accuracy: 65, fluency: 75, completeness: 90, recognized: "hello", words: [{ word: "hello", accuracy: 65, error: "Mispronunciation" }] } }]);
      }
      if (table === "shadowing_history") {
        const rows = [{ id: "h1", client_key: "s1", pronunciation_score: 70, speed_rate: .75, created_at: "2026-01-02T00:00:00Z" }, { id: "h2", client_key: "s1", pronunciation_score: 60, speed_rate: .75, created_at: "2026-01-01T00:00:00Z" }];
        const bounds = url.searchParams.getAll("created_at");
        return send(rows.filter(row => bounds.every(bound => {
          const value = new Date(bound.slice(bound.indexOf(".") + 1)).getTime();
          return bound.startsWith("gte.") ? new Date(row.created_at).getTime() >= value : new Date(row.created_at).getTime() < value;
        })));
      }
      if (table === "cms_lessons") return send([{ id: "l1", slug: "a2-one", title: "Bài A2 phù hợp", cefr: "A2", stage: 2, order_index: 0 }]);
      if (table === "cms_lesson_phrases") return send([{ lesson_id: "l1" }, { lesson_id: "l1" }]);
      if (table === "error_log") return send([errorRow]);
      if (table === "practice_error") {
        if (failPractice) return send({ message: "fixture save failed" }, 400);
        practiced++;
        Object.assign(errorRow, { practice_count: 1, correct_streak: 1, next_review_at: new Date(Date.now()+86400000).toISOString() });
        return send(errorRow);
      }
      if (table === "record_study_day") return send(1);
      return send([]);
    });
    await context.route(`${base}/api/**`, route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ role: null, found: false, configured: false }) }));
    const page = await context.newPage(); const runtimeErrors = [];
    page.on("pageerror", error => runtimeErrors.push(error.message));
    await page.goto(`${base}/today`);
    await page.getByText("Chưa tải được tiến độ học.", { exact: true }).waitFor({timeout:10000}).catch(async e => { console.error("PAGE", await page.locator("body").innerText()); console.error("RUNTIME", runtimeErrors); throw e; });
    failDashboard = false;
    await page.getByRole("button", { name: "Thử lại", exact: true }).click();
    await page.getByRole("button", { name: "Bắt đầu buổi học →" }).waitFor();
    await page.getByRole("button", { name: "10 phút", exact: true }).click();
    assert.ok(await page.getByRole("region", { name: "Buổi học của bạn" }).getByText(/Bài A2 phù hợp/).count());
    const shadowTask = page.getByRole("link").filter({ hasText: "Shadowing" }).filter({ hasText: "câu đã luyện hôm nay" });
    assert.match(await shadowTask.innerText(), /0/);
    await page.getByRole("button", { name: "Bắt đầu buổi học →" }).click();
    await page.waitForURL("**/review");
    await page.getByRole("button", { name: "Hiển thị câu ví dụ gợi ý" }).click();
    await page.getByRole("button", { name: "Tốt", exact: true }).click();
    await page.getByRole("link", { name: /Sang bước tiếp theo/ }).waitFor();
    await page.reload();
    await page.getByText(/Học cụm: Bài A2 phù hợp: 0\/2/).waitFor();
    await page.getByRole("button", { name: "Bỏ qua bước này" }).click();
    await page.getByRole("link", { name: /Sang bước tiếp theo/ }).click();
    await page.waitForURL("**/errors");
    await page.getByRole("button", { name: "Luyện lỗi đến hạn →" }).click({timeout:10000}).catch(async e => { console.error("ERROR PAGE", await page.locator("body").innerText(), runtimeErrors); throw e; });
    const practice = page.getByRole("region", { name: "Luyện sửa lỗi" });
    assert.equal(await page.getByText("She goes to school.", { exact: true }).count(), 0);
    await practice.getByLabel("Viết lại bằng tiếng Anh").fill("She goes to school.");
    await practice.getByRole("button", { name: "Xem gợi ý và đối chiếu" }).click();
    await practice.getByRole("button", { name: "Đã tự sửa đúng", exact: true }).click();
    await practice.getByRole("alert").waitFor();
    assert.equal(practiced, 0);
    failPractice = false;
    await practice.getByRole("button", { name: "Đã tự sửa đúng", exact: true }).click();
    await page.getByText(/Đã lưu lượt luyện/).waitFor();
    assert.equal(practiced, 1);
    await page.getByRole("button", { name: "Bỏ qua bước này" }).click();
    await page.getByRole("link", { name: "Xem tổng kết →" }).click();
    await page.getByRole("heading", { name: "Tổng kết buổi học" }).waitFor();
    assert.match(await page.getByRole("region", { name: "Buổi học của bạn" }).innerText(), /2\/4 bước đạt mục tiêu/);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(runtimeErrors, []);
    if (process.env.SMOKE_SCREENSHOT) await page.screenshot({ path: process.env.SMOKE_SCREENSHOT, fullPage: true, animations: "disabled" });
    await page.goto(`${base}/shadowing`);
    await page.getByText(/1 câu cần ôn hôm nay/).waitFor();
    await page.getByRole("button", { name: "Chi tiết và lịch sử", exact: true }).first().click();
    await page.getByText("So với lần trước: +10 điểm", { exact: true }).waitFor();
    await page.getByText("hello: 65 · cần sửa âm", { exact: true }).waitFor();
    await page.getByRole("button", { name: "hello: 65 · cần sửa âm", exact: true }).click();
    const wordPractice = page.getByRole("region", { name: "Luyện từ hello", exact: true });
    await wordPractice.getByText(/Chưa có phiên âm/).waitFor();
    await wordPractice.getByRole("button", { name: "Thu âm từ này", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "dịch vụ chấm phát âm" }).waitFor();
    await wordPractice.getByRole("button", { name: "Quay lại luyện cả câu", exact: true }).click();
    assert.equal(await wordPractice.count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(runtimeErrors, []);
    console.log("PASS: A2 plan, daily shadow count, load retry, review credit, reload resume, error recall/retry, skipped-step summary, word drill/service failure, mobile overflow, no runtime errors.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
