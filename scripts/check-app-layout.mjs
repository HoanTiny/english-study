// Isolated responsive UI audit. Run only against a local placeholder-configured build.
// All account, AI, and external requests are intercepted; no production data is used.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const pdfCourse = createRequire(import.meta.url)("../src/data/basic-vocabulary.json");
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
const motion = process.env.SMOKE_MOTION === "1";
const vocabStudy = process.env.SMOKE_VOCAB === "1";
const basicCourse = process.env.SMOKE_BASIC_COURSE === "1";
const accents = process.env.SMOKE_ACCENTS === "1";
const pronunciationRecovery = process.env.SMOKE_PRONUNCIATION_RECOVERY === "1";
const storedAudio = process.env.SMOKE_STORED_AUDIO === "1";
const audioFixtures = storedAudio ? { us: await readFile(".next-ui-qa/qa-assets/sister-us.mp3"), uk: await readFile(".next-ui-qa/qa-assets/sister-uk.mp3") } : null;
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
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: motion ? "no-preference" : "reduce", colorScheme: dark ? "dark" : "light" });
    await context.addInitScript(({ auth, dark, accents }) => {
      if (window !== window.top) return; // Do not seed local storage in embedded YouTube frames.
      localStorage.setItem("sb-build-check-auth-token", JSON.stringify(auth));
      localStorage.setItem("theme", dark ? "dark" : "light");
      window.qaSpeech = []; window.qaAudio = []; window.qaAudioPlayers = [];
      window.qaPlayback = { audio: "success", speech: "success", voices: "both" };
      let speechTimer;
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
        cancel() { clearTimeout(speechTimer); }, resume() {},
        speak(utterance) {
          window.qaSpeech.push({lang:utterance.lang,voice:utterance.voice?.lang});
          if (window.qaPlayback.speech === "hang") return;
          utterance.onstart?.(); speechTimer = setTimeout(() => utterance.onend?.(), 100);
        },
        getVoices: () => accents ? [{name:"US",lang:"en-US"}, ...(window.qaPlayback.voices === "both" ? [{name:"UK",lang:"en-GB"}] : [])] : [],
        addEventListener() {}, removeEventListener() {},
      } });
      if (accents) {
        window.Audio = class extends EventTarget {
          constructor(src) { super(); this.src = src; window.qaAudioPlayers.push(this); }
          play() {
            window.qaAudio.push(this.src);
            if (window.qaPlayback.audio === "hang") return new Promise(() => {});
            if (window.qaPlayback.audio === "reject") return Promise.reject(new Error("Audio unavailable"));
            return Promise.resolve();
          }
          pause() { this.stopped = true; }
          removeAttribute(name) { if (name === "src") this.src = ""; }
          load() {}
        };
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      }
    }, { auth, dark, accents });
    let uploadedFixture = false;
    const imageMutations = [];
    let audioRows = [{word:"sister",accent:"uk",origin:"dictionary",bytes:20000}];
    const audioMutations = [], audioRequests = [];
    const savedPronunciation = (word, accents = ["us", "uk"]) => ({found:true,word,...Object.fromEntries(accents.map(accent => [accent,{ipa:accent === "us" ? "/ˈsɪstər/" : "/ˈsɪstə/",audio:`${base}/qa-${accent}.mp3?word=${encodeURIComponent(word)}`,cached:true,attribution:{creator:"QA speaker",sourceUrl:"https://commons.wikimedia.org/wiki/File:En-us-sister.ogg",license:"CC BY-SA 3.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/"}}]))});
    await context.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url());
      const send = body => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      if (storedAudio && url.origin === base && /^\/qa-(us|uk)\.mp3$/.test(url.pathname)) {
        audioRequests.push(url.href);
        return route.fulfill({status:200,contentType:"audio/mpeg",body:audioFixtures[url.pathname.includes("us") ? "us" : "uk"]});
      }
      if (url.origin === base && url.pathname.startsWith("/api/")) {
        if (storedAudio && url.pathname === "/api/admin/word-audio") {
          if (req.method() === "GET") return send(url.searchParams.has("word") ? savedPronunciation("sister",audioRows.map(row=>row.accent)) : {rows:audioRows});
          audioMutations.push(req.method());
          if (req.method() === "DELETE") { audioRows = audioRows.filter(row=>row.accent !== url.searchParams.get("accent")); return send({ok:true}); }
          if (req.headers()["content-type"]?.includes("application/json")) {
            audioRows = ["us","uk"].map(accent=>({word:"sister",accent,origin:"dictionary",bytes:20000}));
            return send({word:"sister",results:[{accent:"us",status:"saved"},{accent:"uk",status:"existing"}]});
          }
          assert.ok(req.postDataBuffer().includes(Buffer.from('name="file"')), "Upload contains actual audio file");
          audioRows.push({word:"sister",accent:"us",origin:"upload",bytes:audioFixtures.us.length});
          return send({ok:true});
        }
        if (storedAudio && url.pathname === "/api/pronounce") return send(savedPronunciation(url.searchParams.get("word")));
        if (url.pathname === "/api/admin/word-image") {
          imageMutations.push(req.method());
          if (req.method() === "POST") {
            assert.ok(req.postDataBuffer().includes(Buffer.from('name="file"')), "Upload includes the selected file");
            uploadedFixture = true;
          } else if (req.method() === "DELETE") uploadedFixture = false;
          return send({ok:true});
        }
        if (url.pathname === "/api/word-image" && uploadedFixture) return send({found:true,results:[{image:`${base}/blue-learning.png`}]});
        if (accents && url.pathname === "/api/pronounce") {
          const word = pdfCourse.lessons.flatMap(lesson => lesson.words).find(word => word.en.toLowerCase() === url.searchParams.get("word"));
          return send({ found:true, ipa:word?.ipa || "/test/", us:{ipa:word?.ipa || "/test/",audio:`${base}/qa-us.mp3`}, ...(pronunciationRecovery ? {uk:{ipa:word?.ipa || "/test/",audio:`${base}/qa-uk.mp3`}} : {}) }); // UK missing by default: verify correct device fallback.
        }
        if (vocabStudy && url.pathname === "/api/example-sentence") return send({ sentence: "It is nice to meet you at the coffee shop.", vi: "Rất vui được gặp bạn ở quán cà phê." });
        if (vocabStudy && process.env.SMOKE_VOCAB_IMAGE === "1" && url.pathname === "/api/word-image") return send({ found: true, results: [{ image: `${base}/blue-learning.png`, creator: "QA image fixture", license: "Test only" }] });
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
      await page.waitForLoadState("networkidle"); // Allow mocked account/data effects to paint.
      await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
      if (motion && path === "/today") {
        const art = page.locator("[data-float]");
        await page.waitForFunction(() => document.querySelector("[data-float]")?.style.animationPlayState === "running");
        assert.equal(await art.evaluate(el => getComputedStyle(el).animationName), "book-float");
        await page.locator(".weekly-panel").scrollIntoViewIfNeeded();
        await page.locator('.weekly-panel[data-revealed="true"]').waitFor();
        await page.waitForFunction(() => document.querySelector("[data-float]")?.style.animationPlayState === "paused");
        assert.equal(await page.locator(".weekly-track span").first().evaluate(el => getComputedStyle(el).animationName), "chart-grow");
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(await art.evaluate(el => getComputedStyle(el).animationName), "none");
        assert.equal(await page.locator(".weekly-track span").first().evaluate(el => getComputedStyle(el).animationName), "none");
        assert.equal(await page.locator(".weekly-panel").evaluate(el => getComputedStyle(el).opacity), "1");
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.waitForFunction(() => document.querySelector("[data-float]")?.style.animationPlayState === "running");
      }
      if (motion && ["/practice", "/preview"].includes(path)) {
        const lastCard = page.locator("[data-reveal]").last();
        await lastCard.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => [...document.querySelectorAll("[data-reveal]")].at(-1)?.getAttribute("data-revealed") === "true");
        assert.equal(await lastCard.evaluate(el => getComputedStyle(el).animationName), "reveal-content");
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
      await capture(page, path, width, errors);
      if (storedAudio && path === "/admin/vocabulary") {
        await page.getByRole("button",{name:"Audio US/UK",exact:true}).click();
        await page.getByRole("button",{name:"Chuẩn bị audio cho cả bộ",exact:true}).waitFor();
        await page.getByLabel("File audio US",{exact:true}).setInputFiles({name:"sister.mp3",mimeType:"audio/mpeg",buffer:audioFixtures.us});
        await page.getByRole("button",{name:"Lưu audio US",exact:true}).click();
        await page.getByRole("status").filter({hasText:"Đã lưu audio US."}).waitFor();
        const player = page.getByLabel("Nghe audio US đã lưu",{exact:true});
        await player.evaluate(el=>el.play());
        await page.waitForFunction(()=>document.querySelector('audio[aria-label="Nghe audio US đã lưu"]')?.currentTime > 0);
        await player.evaluate(el=>el.pause());
        await capture(page,path,width,errors,"audio-uploaded");
        await page.getByRole("button",{name:"Gỡ US",exact:true}).click();
        await page.getByRole("status").filter({hasText:"Đã gỡ audio US."}).waitFor();
        await page.getByRole("button",{name:"Nhập bản thu miễn phí cho từ này",exact:true}).click();
        await page.getByRole("status").filter({hasText:"Đã kiểm tra xong."}).waitFor();
        await page.getByLabel("Nghe audio US đã lưu",{exact:true}).waitFor();
        assert.deepEqual(audioMutations,["POST","DELETE","POST"],"Audio upload, removal and free-source import");
        await capture(page,path,width,errors,"audio-imported");
      }
      if (storedAudio && path === "/vocab") {
        await page.locator(".study-grid > button").first().click();
        for (let index=0; index<20; index++) {
          if (await page.getByRole("article",{name:"Thẻ từ vựng"}).locator('h2[lang="en"]').innerText() === "Sister") break;
          await page.getByRole("button",{name:"Hiện nghĩa",exact:true}).click();
          await page.getByRole("button",{name:/Tốt vài ngày/}).click();
        }
        await page.getByRole("heading",{name:"Sister",exact:true}).waitFor();
        await page.getByText("Nguồn âm thanh",{exact:true}).waitFor();
        for (const accent of ["US","UK"]) {
          await page.getByRole("button",{name:`Nghe giọng ${accent}`,exact:true}).click();
          await page.getByRole("status").filter({hasText:`Đang phát bản thu ${accent}.`}).waitFor();
          await page.waitForFunction(accent=>document.querySelector(`button[aria-label="Nghe giọng ${accent}"]`)?.getAttribute("aria-pressed")==="false",accent);
        }
        assert.equal((await page.evaluate(()=>window.qaSpeech)).length,0,"Stored audio plays through real browser decoder, with no device speech fallback");
        assert.ok(audioRequests.some(url=>url.includes("qa-us.mp3")) && audioRequests.some(url=>url.includes("qa-uk.mp3")));
        await page.getByText("Nguồn âm thanh",{exact:true}).click();
        await capture(page,path,width,errors,"stored-sister-playback");
      }
      if (pronunciationRecovery && path === "/vocab") {
        await page.locator(".study-grid > button").first().click();
        for (let index = 0; index < 20; index++) {
          if (await page.getByRole("article", {name:"Thẻ từ vựng"}).locator('h2[lang="en"]').innerText() === "Sister") break;
          await page.getByRole("button", {name:"Hiện nghĩa",exact:true}).click();
          await page.getByRole("button", {name:/Tốt vài ngày/}).click();
        }
        await page.getByRole("heading", {name:"Sister",exact:true}).waitFor();
        const uk = page.getByRole("button", {name:"Nghe giọng UK",exact:true});
        const us = page.getByRole("button", {name:"Nghe giọng US",exact:true});
        await uk.locator('[lang="en-fonipa"]').waitFor();
        await page.evaluate(() => { window.qaPlayback.audio = "hang"; });
        await uk.click();
        assert.equal(await uk.getAttribute("aria-busy"), "true", "Pending recording is loading, not playing");
        assert.equal(await uk.getAttribute("aria-pressed"), "false");
        await page.getByRole("status").filter({hasText:"Đã đọc bằng giọng UK trên thiết bị."}).waitFor();
        assert.deepEqual((await page.evaluate(() => window.qaSpeech)).at(-1), {lang:"en-GB",voice:"en-GB"}, "Sister UK falls back to the UK device voice after recording timeout");
        assert.ok(await page.evaluate(() => window.qaAudioPlayers.at(-1).stopped), "Timed-out recording is stopped");
        assert.equal(await uk.getAttribute("aria-pressed"), "false", "Button resets after speech ends");
        await capture(page,path,width,errors,"sister-recovered");

        await page.evaluate(() => { window.qaPlayback.audio = "reject"; window.qaPlayback.speech = "hang"; });
        await us.click();
        const retry = page.getByRole("button", {name:"Thử lại bằng giọng US trên thiết bị",exact:true});
        await retry.waitFor();
        assert.equal(await us.getAttribute("aria-busy"), "false", "Silent speech cannot keep the button busy");
        await capture(page,path,width,errors,"speech-retry");
        const audioCount = await page.evaluate(() => window.qaAudio.length);
        await page.evaluate(() => { window.qaPlayback.speech = "success"; });
        await retry.click();
        await page.getByRole("status").filter({hasText:"Đã đọc bằng giọng US trên thiết bị."}).waitFor();
        assert.equal(await page.evaluate(() => window.qaAudio.length), audioCount, "Explicit retry skips the broken download");

        await page.evaluate(() => { window.qaPlayback.voices = "us-only"; });
        const speechCount = await page.evaluate(() => window.qaSpeech.length);
        await uk.click();
        await page.getByRole("status").filter({hasText:"thiết bị chưa có giọng UK"}).waitFor();
        assert.equal(await page.evaluate(() => window.qaSpeech.length), speechCount, "Missing UK voice never substitutes a US voice");
        await capture(page,path,width,errors,"missing-uk-voice");

        await page.evaluate(() => { window.qaPlayback.voices = "both"; window.qaPlayback.audio = "hang"; });
        await us.click();
        await page.evaluate(() => { window.qaPlayback.audio = "reject"; });
        await uk.click();
        await page.getByRole("status").filter({hasText:"Đã đọc bằng giọng UK trên thiết bị."}).waitFor();
        await page.evaluate(() => window.qaAudioPlayers.at(-2).dispatchEvent(new Event("playing")));
        assert.equal(await us.getAttribute("aria-pressed"), "false", "Late US event cannot override the UK session");
        await page.evaluate(() => { window.qaPlayback.audio = "hang"; });
        await us.click();
        const beforeLeaving = await page.evaluate(() => window.qaSpeech.length);
        await page.getByRole("button", {name:/Thư viện từ vựng/}).click();
        await page.waitForTimeout(3200);
        assert.equal(await page.evaluate(() => window.qaSpeech.length), beforeLeaving, "Leaving the card cancels pending fallback");
      }
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
          if (basicCourse) {
            assert.equal(await page.locator(".study-grid > button").count(), pdfCourse.lessons.length, "Every PDF lesson is reachable");
            const singleFilter = page.getByRole("checkbox", { name: /Chỉ học từ đơn/ });
            await singleFilter.check();
            assert.ok(await page.locator(".study-grid > button").count() > 0, "Single-word filter retains lessons");
            await singleFilter.uncheck();
            await page.getByPlaceholder("Tìm kiếm bộ thẻ từ vựng...").fill("water");
            assert.ok(await page.locator(".study-grid > button").count() > 0, "Search finds words inside lessons");
            await page.getByPlaceholder("Tìm kiếm bộ thẻ từ vựng...").fill("");
          }
          await page.locator(".study-grid > button").first().click();
          if (accents) {
            await page.getByRole("article", {name:"Thẻ từ vựng"}).locator('h2[lang="en"]').waitFor();
            await page.getByLabel("Phiên âm IPA", {exact:true}).waitFor();
            await page.getByRole("button", {name:"Nghe giọng UK",exact:true}).getByText("Chưa có IPA riêng", {exact:true}).waitFor();
            await page.getByRole("button", {name:"Nghe giọng US",exact:true}).click();
            await page.getByRole("button", {name:"Nghe giọng UK",exact:true}).click();
            const frontWord = await page.getByRole("article", {name:"Thẻ từ vựng"}).locator('h2[lang="en"]').innerText();
            if (!frontWord.includes(" ")) assert.ok((await page.evaluate(() => window.qaAudio)).some(url=>url.endsWith("qa-us.mp3")), "US button uses US recording");
            else assert.ok((await page.evaluate(() => window.qaSpeech)).some(item=>item.lang==="en-US"), "Multiword entries use the requested US device voice");
            assert.deepEqual((await page.evaluate(() => window.qaSpeech)).at(-1), {lang:"en-GB",voice:"en-GB"}, "UK fallback selects UK device voice");
            assert.equal(await page.locator("article figure img").count(),0,"No automatic or cached Openverse image");
          }
          if (vocabStudy) await capture(page, path, width, errors, "question");
          await page.getByRole("button", { name: "Hiện nghĩa", exact: true }).click();
          await capture(page, path, width, errors, "flashcard");
          if (vocabStudy) {
            const card = page.getByRole("article", { name: "Thẻ từ vựng" });
            const support = page.getByRole("complementary", { name: "Phát âm và ngữ cảnh" });
            const cardBox = await card.boundingBox(), supportBox = await support.boundingBox();
            if (width >= 1024) {
              assert.ok(supportBox.x >= cardBox.x + cardBox.width, "Desktop uses two columns");
              assert.ok(Math.abs(cardBox.y - supportBox.y) < 2, "Columns align at the top");
              assert.ok(cardBox.width + supportBox.width >= (width - 240) * .8, "Study panels use desktop content width");
              const rating = await page.getByRole("region", { name: "Đánh giá trí nhớ" }).boundingBox();
              if (width >= 1280) assert.ok(rating.y + rating.height <= 900, "Memory grading fits desktop viewport");
            } else assert.ok(supportBox.y >= cardBox.y + cardBox.height, "Mobile stacks in reading order");
            if (process.env.SMOKE_VOCAB_IMAGE === "1") {
              await card.locator("figure img").waitFor();
              await page.waitForFunction(() => document.querySelector('article figure img')?.naturalWidth > 0);
            }
            const english = await card.locator('h2[lang="en"]').innerText();
            if (basicCourse) {
              const sourceWord = pdfCourse.lessons[0].words.find(word => word.en === english);
              assert.ok(sourceWord, "Flashcard belongs to PDF lesson");
              assert.equal(await page.getByLabel("Phiên âm IPA", {exact:true}).locator('[lang="en-fonipa"]').innerText(), sourceWord.ipa, "IPA matches source PDF");
            }
            await page.getByRole("button", { name: "Lưu sổ tay", exact: true }).click();
            await page.getByRole("button", { name: "Đã lưu", exact: true }).waitFor();
            await page.getByRole("button", { name: "Ví dụ AI", exact: true }).click();
            await page.getByText("It is nice to meet you at the coffee shop.", { exact: true }).waitFor();
            await capture(page, path, width, errors, "example-saved");
            await page.getByRole("button", { name: "Đoán (gõ)", exact: true }).click();
            await page.getByLabel("Viết bằng tiếng Anh", { exact: true }).fill(english);
            await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
            await page.getByText("✓ Chính xác!", { exact: true }).waitFor();
            if (basicCourse) assert.ok(await page.locator('[lang="en-fonipa"]').isVisible(), "Typed-answer feedback includes IPA");
            await capture(page, path, width, errors, "typed-correct");
            await page.getByRole("button", { name: "Trắc nghiệm", exact: true }).click();
            await page.getByRole("button", { name: english, exact: true }).click();
            await page.getByText("✓ Chính xác!", { exact: true }).waitFor();
            if (basicCourse) assert.ok(await page.locator('[lang="en-fonipa"]').isVisible(), "Multiple-choice feedback includes IPA");
            await capture(page, path, width, errors, "choice-correct");
            await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
            assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "1");
            await page.getByRole("button", { name: "Đoán (gõ)", exact: true }).click();
            await page.getByRole("button", { name: "Gợi ý", exact: true }).click();
            await page.getByText(/Chữ cái đầu:/).waitFor();
            await page.getByLabel("Viết bằng tiếng Anh", { exact: true }).fill("deliberately wrong answer");
            await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
            await page.getByText("Chưa chính xác — mình thử lại nhé.", { exact: true }).waitFor();
            await capture(page, path, width, errors, "typed-wrong");
            await page.getByRole("button", { name: "Flashcard", exact: true }).click();
            await page.getByRole("button", { name: "Hiện nghĩa", exact: true }).click();
            await page.getByRole("button", { name: /Tốt vài ngày/ }).click();
            assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "2");
            await page.getByRole("button", { name: "Đoán (gõ)", exact: true }).click();
            while (await page.getByRole("button", { name: "Bỏ qua", exact: true }).count()) await page.getByRole("button", { name: "Bỏ qua", exact: true }).click();
            await page.getByText("Thêm một bước tiến hôm nay.", { exact: true }).waitFor();
            await capture(page, path, width, errors, "complete");
            await page.getByRole("button", { name: "Học lại bộ này", exact: true }).click();
            assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "0");
            await page.getByRole("button", { name: /Thư viện từ vựng/ }).click();
            await page.locator(".study-grid > button").first().waitFor();
            if (basicCourse) {
              await page.getByRole("button", { name: /Theo bài học/ }).click();
              await page.locator(".study-grid > button").filter({ hasText: "Sức khoẻ & cơ thể" }).first().click();
              await page.getByRole("button", { name: /Từng từ \(/ }).click();
              await page.getByRole("button", { name: "Flashcard", exact: true }).click();
              await page.getByRole("button", { name: "Hiện nghĩa", exact: true }).click();
              const singleWord = await page.getByRole("article", { name: "Thẻ từ vựng" }).locator('h2[lang="en"]').innerText();
              assert.match(singleWord, /^[a-z]+$/i, "Related-word mode displays a single known headword");
              assert.ok(await page.getByLabel("Phiên âm IPA", {exact:true}).isVisible(), "Related words also include IPA");
              await capture(page, path, width, errors, "related-words");
              await page.getByRole("button", { name: "Cụm từ", exact: true }).click();
              assert.equal(await page.getByRole("button", { name: "Cụm từ", exact: true }).getAttribute("aria-pressed"), "true");
            }
          }
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
        if (path === "/admin/vocabulary") {
          await page.getByLabel("Tìm từ hoặc nghĩa", {exact:true}).fill("nephew");
          const select = page.getByLabel("Chọn từ và nghĩa", {exact:true});
          const option = select.locator("option").filter({hasText:/nephew/i}).first();
          await select.selectOption(await option.getAttribute("value"));
          await page.getByText("Chưa có ảnh. Flashcard sẽ chỉ hiện nội dung học.", {exact:true}).waitFor();
          await page.getByLabel("Chọn ảnh minh họa", {exact:true}).setInputFiles({name:"qa-image.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6bYQAAAAASUVORK5CYII=","base64")});
          await page.getByText("Ảnh xem trước · chưa lưu", {exact:true}).waitFor();
          await page.getByRole("button", {name:"Lưu ảnh",exact:true}).click();
          await page.getByText("Đã lưu ảnh cho từ và nghĩa này.", {exact:true}).waitFor();
          await page.getByRole("button", {name:"Gỡ ảnh",exact:true}).waitFor();
          await capture(page,path,width,errors,"uploaded");
          await page.getByRole("button", {name:"Gỡ ảnh",exact:true}).click();
          await page.getByText("Đã gỡ ảnh khỏi thẻ học.", {exact:true}).waitFor();
          assert.deepEqual(imageMutations,["POST","DELETE"],"Admin saves and removes the selected illustration");
          await capture(page,path,width,errors,"removed");
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
        await drawer.getByRole("link", { name: /Nhật ký cùng AI/ }).click();
        await page.waitForURL("**/journal");
        await drawer.waitFor({ state: "hidden" });
      }
      if (path === "/practice" && width >= 1024) {
        await page.getByRole("button", {name:"Thu gọn sidebar",exact:true}).click();
        await page.waitForFunction(() => Math.round(document.querySelector(".sidebar").getBoundingClientRect().width) === 80);
        assert.equal(Math.round((await page.locator("#app-content").boundingBox()).x),80,"Collapsed sidebar releases content space");
        await page.getByRole("button", {name:"Mở rộng sidebar",exact:true}).click();
        await page.waitForFunction(() => Math.round(document.querySelector(".sidebar").getBoundingClientRect().width) === 240);
      }
      if (path === "/practice" && width < 1024) {
        const tabs=page.getByRole("navigation",{name:"Điều hướng nhanh"});
        assert.equal(await tabs.getByRole("link").count(),4,"Four primary mobile destinations");
        assert.equal(await tabs.getByRole("link",{name:"Luyện tập",exact:true}).getAttribute("aria-current"),"page","Current mobile destination is indicated");
        assert.equal(await page.getByRole("link",{name:/Nhật ký cùng AI/}).count(),1,"Practice hub exposes all skills");
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
