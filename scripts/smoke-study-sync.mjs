// Multiple isolated browser contexts act as devices; all backend requests are fixtures.
// Use the local placeholder build documented in README; no real account or API quota.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
const { chromium } = load(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.SMOKE_BASE_URL || "http://localhost:3107";
const uid = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const cloud = new Map(), reviews = new Map(), blocked = new Set();
const errors = [];
const date = ago => new Date(Date.now() - ago * 86400000).toISOString();
const history = [{ id: "h1", client_key: "s1", pronunciation_score: 70, speed_rate: .75, created_at: date(0) },
  { id: "h2", client_key: "s1", pronunciation_score: 50, speed_rate: .75, created_at: date(8) }];
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
async function device(name, id = uid) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Asia/Bangkok" });
  const user = { id, aud: "authenticated", role: "authenticated", email: `${name}@example.test`, is_anonymous: false, user_metadata: {} };
  const expiry = Math.floor(Date.now()/1000)+3600;
  const token = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: id, exp: expiry, role: "authenticated" })).toString("base64url"), "fixture-signature"].join(".");
  const auth = { access_token: token, refresh_token: "fixture", expires_at: expiry, expires_in: 3600, token_type: "bearer", user };
  await context.addInitScript(({ auth }) => localStorage.setItem("sb-build-check-auth-token", JSON.stringify(auth)), { auth });
  let lookups = 0;
  await context.route("https://build-check.supabase.co/**", async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split("/").pop();
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "content-type": "application/json" };
    const send = (body, status=200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname.includes("/auth/")) return send(user);
    const body = req.postDataJSON();
    if (table === "study_sessions" || table === "sync_study_session") {
      if (blocked.has(name)) return send({ message: "sync unavailable" }, 503);
      const state = cloud.get(id) ?? { revision: 0, session: null };
      if (table === "study_sessions") {
        assert.equal(url.searchParams.get("user_id"), `eq.${id}`);
        return send(state.revision ? [state] : []);
      }
      assert.equal(body.p_user, id);
      if (body.p_expected_revision !== state.revision) return send({ ...state, applied: false });
      const updated = { revision: state.revision + 1, session: body.p_session }; cloud.set(id, updated);
      return send({ ...updated, applied: true });
    }
    if (table === "profiles") return send({ id, current_stage: 1, onboarded: true, streak_count: 0, role: null });
    if (table === "notes") return send(["hello", "thanks", "please"].map((word, i) => ({ id: `n${i}`, kind: "word", content: word, meaning: "nghĩa", example: "Hello, Anna.", tags: [], in_review: true })));
    if (table === "review_items") {
      if (req.method() === "POST") {
        const item = { ...body, id: `r-${body.source_id}` };
        reviews.set(id, [...(reviews.get(id) ?? []).filter(row => row.source_id !== body.source_id), item]); return send(item);
      }
      return send(reviews.get(id) ?? []);
    }
    if (table === "shadowing_attempts") return send([{ client_key: "s1", pronunciation_score: 70, created_at: date(0), assessment: { pronunciation: 70, accuracy: 65, fluency: 75, completeness: 90, recognized: "Nice to meet you.", words: [{ word: "nice", accuracy: 65, error: "Mispronunciation" }] } }]);
    if (table === "shadowing_history") {
      const bounds = url.searchParams.getAll("created_at");
      return send(history.filter(row => bounds.every(bound => bound.startsWith("gte.") ? row.created_at >= bound.slice(4) : row.created_at < bound.slice(3))));
    }
    if (table === "record_study_day") return send(1);
    return send([]);
  });
  await context.route(`${base}/api/**`, route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/pronounce" && url.searchParams.get("word") === "nice") {
      lookups++;
      return route.fulfill({ status: lookups === 1 ? 504 : 200, contentType: "application/json",
        body: JSON.stringify(lookups === 1 ? { found: false, error: "timeout" } : { found: true, ipa: "naɪs" }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ role: null, configured: false, found: false }) });
  });
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on("pageerror", error => errors.push(error.message));
  return { page, context };
}
async function until(condition) {
  for (let i = 0; i < 100; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 30)); }
  assert.ok(condition(), "Expected fixture state was not reached");
}
try {
  const a = await device("a"), b = await device("b"), c = await device("c", other);
  await a.page.goto(`${base}/today`);
  await a.page.getByRole("button", { name: "10 phút", exact: true }).click();
  await a.page.getByRole("button", { name: "Bắt đầu buổi học →", exact: true }).click();
  await a.page.waitForURL("**/review"); await until(() => cloud.get(uid)?.session);
  const firstId = cloud.get(uid).session.id;
  await b.page.goto(`${base}/today`);
  await b.page.getByRole("heading", { name: "Tiếp tục từng bước", exact: true }).waitFor();
  assert.match(await b.page.getByRole("region", { name: "Buổi học của bạn" }).innerText(), /10 phút dự kiến/);
  await a.page.getByRole("button", { name: "Hiển thị câu ví dụ gợi ý" }).click();
  await a.page.getByRole("button", { name: "Tốt", exact: true }).click();
  await until(() => cloud.get(uid)?.session?.steps[0].completedIds.length === 1);
  await b.page.reload(); await b.page.getByText("1/3", { exact: true }).waitFor();
  // Old offline device must adopt a newly chosen plan instead of resurrecting the old one.
  await a.context.setOffline(true);
  await a.page.getByRole("button", { name: "Bỏ qua bước này", exact: true }).click();
  await a.page.getByText(/Đang ngoại tuyến/).waitFor();
  await b.page.getByRole("button", { name: "Dừng buổi này và chọn lại", exact: true }).click();
  await b.page.getByRole("button", { name: "30 phút", exact: true }).click();
  await b.page.getByRole("button", { name: "Bắt đầu buổi học →", exact: true }).click();
  await until(() => cloud.get(uid)?.session && cloud.get(uid).session.id !== firstId);
  const newId = cloud.get(uid).session.id;
  await a.context.setOffline(false);
  await a.page.getByRole("link", { name: /Buổi 30 phút/ }).waitFor();
  assert.equal(cloud.get(uid).session.id, newId);
  // Keep an offline edit across reload with a temporary sync outage, then retry it.
  await b.page.waitForURL("**/review"); await b.context.setOffline(true);
  await b.page.getByRole("button", { name: "Bỏ qua bước này", exact: true }).click();
  blocked.add("b"); await b.context.setOffline(false); await b.page.reload();
  await b.page.getByRole("button", { name: "Thử đồng bộ lại", exact: true }).waitFor();
  assert.equal(cloud.get(uid).session.steps[0].skipped, false);
  blocked.delete("b"); await b.page.getByRole("button", { name: "Thử đồng bộ lại", exact: true }).click();
  await until(() => cloud.get(uid).session.steps[0].skipped);
  await b.page.getByText("Buổi học đã đồng bộ với tài khoản.", { exact: true }).waitFor();
  // A separate account gets its own blank session, not user A's plan.
  await c.page.goto(`${base}/today`);
  await c.page.getByRole("heading", { name: "Hôm nay bạn có bao nhiêu phút?", exact: true }).waitFor();
  assert.equal(cloud.has(other), false);
  // Retry IPA in the actual word-practice UI after a gateway timeout.
  await a.page.goto(`${base}/shadowing`);
  await a.page.getByRole("button", { name: "Chi tiết và lịch sử", exact: true }).first().click();
  await a.page.getByRole("button", { name: "nice: 65 · cần sửa âm", exact: true }).click();
  const drill = a.page.getByRole("region", { name: "Luyện từ nice", exact: true });
  await drill.getByRole("button", { name: "Thử lại phiên âm", exact: true }).click();
  await drill.getByText("naɪs", { exact: true }).waitFor();
  // Weekly summary compares the same sentence in the two windows.
  await a.page.goto(`${base}/statistics`);
  const weekly = a.page.getByRole("region", { name: "Tổng kết tuần", exact: true });
  await weekly.getByText(/điểm trung bình tăng 20 điểm/).waitFor();
  assert.ok(await weekly.getByRole("link", { name: "Luyện lại: Nice to meet you.", exact: true }).count());
  if (process.env.SMOKE_SYNC_SCREENSHOT) await weekly.screenshot({ path: process.env.SMOKE_SYNC_SCREENSHOT });
  const overflow = await a.page.evaluate(() => [...document.querySelectorAll("body *")].flatMap(el => {
    const rect = el.getBoundingClientRect();
    return rect.right > innerWidth + 1 && rect.width > 0 ? [{ tag: el.tagName, className: el.getAttribute("class"), right: rect.right }] : [];
  }));
  assert.equal(await a.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, JSON.stringify(overflow));
  assert.deepEqual(errors, []);
  console.log("PASS: two-device resume, saved review progress, offline outbox/reload/retry, reset conflicts, separate account, IPA retry, weekly same-sentence comparison, mobile and no runtime errors.");
} finally { await browser.close(); }
