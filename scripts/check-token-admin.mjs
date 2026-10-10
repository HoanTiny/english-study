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
await mkdir(".next/qa-token-admin", { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(({ auth, storageKey }) => localStorage.setItem(storageKey, JSON.stringify(auth)), { auth, storageKey });
    let limit = null; let fail = false;
    const writes = [];
    await context.route("**/*", async route => {
      const r = route.request(); const url = new URL(r.url());
      const send = (body,status=200) => route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});
      if(url.origin === base && url.pathname.startsWith("/api/")) {
        if(url.pathname === "/api/admin/ping") return send({role:"admin"});
        if(url.pathname === "/api/admin/users") return send({users:[{id:uid,email:user.email,displayName:"Học viên thử nghiệm",role:null,envAdmin:false,lastActive:null}]});
        if(url.pathname === "/api/admin/token-usage") {
          if(r.method()==="PATCH") { const body=r.postDataJSON(); writes.push(body); limit=body.monthlyLimit; return send({ok:true}); }
          if(fail) return send({error:"Chưa tải được thống kê token."},503);
          return send({limits:[{user_id:uid,monthly_limit:limit}],usage:[{user_id:uid,model:"gemini-2.5-flash",feature:"/api/roleplay",input_tokens:1200,output_tokens:800,thinking_tokens:100,total_tokens:2100,held_tokens:0,requests:3}]});
        }
        return send({});
      }
      if(url.origin===base) return route.continue();
      if(url.hostname===supabaseHost) { if(url.pathname.includes("/auth/"))return send(user); if(url.pathname.endsWith("/profiles"))return send({id:uid,onboarded:true,current_stage:1,role:"admin"}); return send([]); }
      return route.abort();
    });
    const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(base+"/admin/users");
    const input=page.getByLabel("Hạn mức token của "+user.email);
    await input.waitFor();
    await page.locator("dd").filter({hasText:"2.100"}).waitFor();
    await input.fill("10000"); await page.getByRole("button",{name:"Lưu hạn mức",exact:true}).click();
    await page.getByText("3 lượt Gemini đã ghi nhận · Hạn mức hàng tháng: 10.000",{exact:true}).waitFor();
    assert.equal(writes.at(-1).monthlyLimit,10000);
    await input.fill("0"); await page.getByRole("button",{name:"Lưu hạn mức",exact:true}).click();
    await page.getByText("3 lượt Gemini đã ghi nhận · Hạn mức hàng tháng: 0",{exact:true}).waitFor();
    assert.equal(writes.at(-1).monthlyLimit,0);
    await input.fill(""); await page.getByRole("button",{name:"Lưu hạn mức",exact:true}).click();
    await page.getByText("3 lượt Gemini đã ghi nhận · Hạn mức hàng tháng: Không giới hạn",{exact:true}).waitFor();
    assert.equal(writes.at(-1).monthlyLimit,null);
    await input.fill("-1");await page.getByRole("button",{name:"Lưu hạn mức",exact:true}).click();
    await page.getByText("Nhập số nguyên từ 0 đến 1.000.000.000.",{exact:true}).waitFor();assert.equal(writes.length,3);
    await page.getByText("Theo model và tính năng",{exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'.next/qa-token-admin/'+width+'.png',fullPage:true});
    fail=true;await page.getByRole("button",{name:"Làm mới token",exact:true}).click();await page.getByRole("alert").filter({hasText:"Chưa tải được thống kê token."}).waitFor();assert.equal(await input.count(),0);
    assert.deepEqual(errors,[]);console.log('PASS admin tokens '+width+'px: totals, cap, zero, unlimited, invalid input, database error, responsive layout');
    await context.close();
  }
} finally {await browser.close();}
