// Integration check against a LOCAL placeholder build (see smoke-personalized.mjs).
// Uses Azure quota for two short synthetic samples; never opens a real microphone.
// All Supabase requests are mocked. No production learning data is changed.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import nextEnv from "@next/env";
import SDK from "microsoft-cognitiveservices-speech-sdk";
const load = createRequire(import.meta.url);
const { chromium } = load(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.SMOKE_BASE_URL || "http://localhost:3107";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local builds only");
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
if (!key || !region) throw new Error("Missing Azure configuration");

let browser;
try {
  const config = SDK.SpeechConfig.fromSubscription(key, region);
  config.speechSynthesisVoiceName = "en-US-JennyNeural";
  config.speechSynthesisOutputFormat = SDK.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;
  async function synthesize(text) {
    const synth = new SDK.SpeechSynthesizer(config, null);
    let timer;
    try {
      const result = await Promise.race([
        new Promise((resolve, reject) => synth.speakTextAsync(text, resolve, () => reject(new Error("Synthetic audio failed")))),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Synthetic audio timed out")), 20000); }),
      ]);
      assert.equal(result.reason, SDK.ResultReason.SynthesizingAudioCompleted);
      return Buffer.from(result.audioData).toString("base64");
    } finally { clearTimeout(timer); synth.close(); }
  }
  const samples = { sentence: await synthesize("Nice to meet you."), word: await synthesize("Nice.") };
  const response = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: "POST", headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" }, signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, "Azure token failed");
  const speechToken = await response.text();
  browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"],
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Asia/Bangkok" });
  const uid = "11111111-1111-4111-8111-111111111111";
  const user = { id: uid, aud: "authenticated", role: "authenticated", email: "learner@example.test", is_anonymous: false, user_metadata: {} };
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: uid, exp: expiry, role: "authenticated" })).toString("base64url"), "fixture-signature"].join(".");
  const auth = { access_token: token, refresh_token: "fixture-refresh", expires_at: expiry, expires_in: 3600, token_type: "bearer", user };
  await context.addInitScript(({ auth, samples }) => {
    localStorage.setItem("sb-build-check-auth-token", JSON.stringify(auth));
    window.__sampleKind = "sentence"; window.__liveTracks = 0;
    // Real browser audio encoding, from a synthetic source instead of a person's mic.
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext({ sampleRate: 48000 });
      const bytes = Uint8Array.from(atob(samples[window.__sampleKind]), char => char.charCodeAt(0));
      const buffer = await audio.decodeAudioData(bytes.buffer);
      const source = audio.createBufferSource(); source.buffer = buffer;
      const destination = audio.createMediaStreamDestination(); source.connect(destination);
      window.__sampleEnded = false;
      source.onended = () => { window.__sampleEnded = true; };
      await audio.resume(); source.start(audio.currentTime + 0.3);
      window.__liveTracks++;
      const track = destination.stream.getAudioTracks()[0]; const stop = track.stop.bind(track);
      track.stop = () => { if (track.readyState !== "ended") { stop(); window.__liveTracks--; void audio.close(); } };
      return destination.stream;
    };
  }, { auth, samples });
  const posts = []; let latest = []; let history = []; let failSave = true; let failHistory = false;
  await context.route("https://build-check.supabase.co/**", async route => {
    const req = route.request(), url = new URL(req.url());
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "content-type": "application/json" };
    const send = (body, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname.includes("/auth/")) return send(user);
    const table = url.pathname.split("/").pop();
    if (table === "profiles") return send({ id: uid, current_stage: 1, onboarded: true, streak_count: 0, role: null });
    if (table === "shadowing_attempts") {
      if (req.method() === "POST") {
        const body = req.postDataJSON(); posts.push(body);
        if (failSave) return send({ message: "fixture save failure" }, 400);
        latest = [{ ...body, id: body.attempt_key }]; history = [...latest, ...history]; return send({});
      }
      return send(latest);
    }
    if (table === "shadowing_history") {
      if (failHistory) return send({ message: "fixture history failure" }, 400);
      const bounds = url.searchParams.getAll("created_at");
      return send(history.filter(row => bounds.every(bound => {
        const value = new Date(bound.slice(bound.indexOf(".") + 1)).getTime();
        return bound.startsWith("gte.") ? new Date(row.created_at).getTime() >= value : new Date(row.created_at).getTime() < value;
      })));
    }
    if (table === "record_study_day") return send(1);
    return send([]);
  });
  await context.route(`${base}/api/**`, route => {
    const path = new URL(route.request().url()).pathname;
    const body = path === "/api/speech-token" ? { configured: true, token: speechToken, region }
      : path === "/api/pronounce" ? { found: true, us: { ipa: "/naɪs/" } } : { role: null };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  const page = await context.newPage(); let runtimeErrors = 0;
  page.on("pageerror", () => { runtimeErrors++; });
  page.setDefaultTimeout(15000);
  await page.goto(`${base}/shadowing`);
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Nice to meet you.", exact: true }) });
  const record = card.getByRole("button", { name: "Thu âm và chấm", exact: true });
  // Cancel must not grade or write learning data.
  await record.click(); await card.getByText("Đang thu — hãy nói ngay.", { exact: true }).waitFor();
  await card.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.waitForFunction(() => window.__liveTracks === 0);
  assert.equal(posts.length, 0);
  // Complete a synthetic sentence through MediaRecorder -> decode -> WAV -> real Azure.
  await record.click(); await card.getByRole("button", { name: "Dừng và chấm", exact: true }).waitFor();
  await page.waitForFunction(() => window.__sampleEnded);
  await card.getByRole("button", { name: "Dừng và chấm", exact: true }).click();
  await page.getByText(/Kết quả chưa lưu:/).waitFor({ timeout: 45000 });
  await page.getByRole("alert").filter({ hasText: "Chưa lưu được kết quả" }).waitFor();
  assert.equal(posts.length, 1); assert.ok(Number.isFinite(posts[0].pronunciation_score));
  assert.ok(posts[0].assessment.words.length > 0); assert.equal(posts[0].client_key, "s1");
  assert.equal(await page.evaluate(() => window.__liveTracks), 0);
  failSave = false;
  await page.getByRole("button", { name: "Lưu lại", exact: true }).click();
  await card.getByText(`Đã lưu: ${posts[0].pronunciation_score}/100`, { exact: true }).waitFor();
  assert.equal(posts.length, 2); assert.equal(posts[0].attempt_key, posts[1].attempt_key);
  assert.equal(history.length, 1);
  // Individual-word assessment must not overwrite the full-sentence score/history.
  await card.getByRole("button", { name: /^nice: /i }).first().click();
  const drill = page.getByRole("region", { name: /^Luyện từ nice$/i });
  await drill.getByText("/naɪs/", { exact: true }).waitFor();
  await page.evaluate(() => { window.__sampleKind = "word"; });
  await drill.getByRole("button", { name: "Thu âm từ này", exact: true }).click();
  await card.getByRole("button", { name: "Dừng và chấm", exact: true }).waitFor();
  await page.waitForFunction(() => window.__sampleEnded);
  await card.getByRole("button", { name: "Dừng và chấm", exact: true }).click();
  await drill.getByText(/Điểm từ:/).waitFor({ timeout: 45000 });
  assert.equal(posts.length, 2); assert.equal(history.length, 1);
  assert.equal(await page.evaluate(() => window.__liveTracks), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (process.env.SMOKE_SHADOW_SCREENSHOT) await card.screenshot({ path: process.env.SMOKE_SHADOW_SCREENSHOT });
  // The statistics page must use weighted history, local days, and a retryable error.
  const today = new Date(); today.setHours(0, 1, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  history = [
    { id: "h1", client_key: "s1", pronunciation_score: 20, created_at: yesterday.toISOString() },
    { id: "h2", client_key: "s1", pronunciation_score: 90, created_at: today.toISOString() },
    { id: "h3", client_key: "s1", pronunciation_score: 100, created_at: today.toISOString() },
  ];
  await page.goto(`${base}/statistics`);
  await page.getByText("Ngày học", { exact: true }).waitFor();
  assert.match(await page.getByText("Ngày học", { exact: true }).locator("..").innerText(), /^2\s/);
  await page.getByRole("button", { name: "Phát âm", exact: true }).click();
  assert.match(await page.getByText("Phát âm TB", { exact: true }).locator("..").innerText(), /^70đ\s/);
  await page.getByRole("button", { name: "Toàn thời gian", exact: true }).click();
  await page.getByText("Thẻ ghi nhớ vững", { exact: true }).waitFor();
  assert.equal(await page.getByText("Đã phát âm đạt", { exact: true }).count(), 0);
  failHistory = true; await page.reload();
  await page.getByRole("alert").filter({ hasText: "Chưa tải được thống kê" }).waitFor();
  failHistory = false; await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await page.getByText("Ngày học", { exact: true }).waitFor();
  assert.equal(runtimeErrors, 0);
  console.log(JSON.stringify({ ok: true, synthetic: true, sentenceScore: posts[0].pronunciation_score,
    checks: "cancel, manual stop, real browser WAV/Azure, microphone cleanup, save retry, word IPA/score isolation, mobile, weighted history/local days, statistics retry" }));
} catch (error) {
  console.error("Shadowing browser check failed:", error.message); process.exitCode = 1;
} finally { await browser?.close(); }
