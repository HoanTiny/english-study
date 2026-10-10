// Read-only smoke check of public pages; never signs in or writes to production.
// PLAYWRIGHT_MODULE can point at a bundled Playwright installation.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = "https://english-study-alpha-six.vercel.app";
const out = ".next/qa-public-lessons";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.route("**/*", route => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    for (const path of ["/", "/admin/lessons", "/lesson/greetings", "/lesson/present-perfect", "/lesson/restaurant", "/lesson/relative-clauses", "/grammar"]) {
      const errors = [];
      const cms = [];
      const onError = error => errors.push(error.message);
      const onResponse = async response => {
        if (response.url().includes("/rest/v1/cms_")) {
          const entry = { table: new URL(response.url()).pathname, status: response.status() };
          try {
            const data = await response.json();
            entry.count = Array.isArray(data) ? data.length : data ? 1 : 0;
            if (Array.isArray(data) && data[0]?.slug) entry.slugs = data.map(row => row.slug);
          } catch { /* Only public response summaries are retained. */ }
          cms.push(entry);
        }
      };
      page.on("pageerror", onError);
      page.on("response", onResponse);
      const response = await page.goto(base + path, { waitUntil: "networkidle", timeout: 45000 });
      const body = await page.locator("body").innerText();
      results.push({ path, viewport, status: response.status(), url: page.url(),
        title: await page.title(), headings: await page.locator("h1,h2").allTextContents(),
        horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        knowledgeVisible: body.includes("Hiểu sâu & vận dụng"),
        lessonError: /Không tải được bài học|không tồn tại/i.test(body),
        bodyPreview: body.slice(0, 650), cms, errors,
        note: "POST requests intentionally blocked; guest authentication and authenticated flows are not tested. Any auth Failed to fetch is induced by this read-only check." });
      await page.screenshot({ path: `${out}/${viewport.width}-${path.replaceAll("/", "_") || "home"}.png`, fullPage: false });
      page.off("pageerror", onError);
      page.off("response", onResponse);
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${out}/report.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
