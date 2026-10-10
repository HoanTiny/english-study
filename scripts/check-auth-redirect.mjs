// Diagnose Supabase's default/allowed destinations without signing in or sending email.
// An intentionally invalid token cannot confirm a real account. Never follow the redirect.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const site = new URL(process.argv.find(arg => arg.startsWith("--site-url="))?.slice("--site-url=".length)
  || "https://english-study-alpha-six.vercel.app");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or anonymous key");
if (!["https:", "http:"].includes(site.protocol) || site.username || site.password) throw new Error("Invalid site URL");
const expectedCallback = new URL("/onboarding", site.origin);
try {
  for (const destination of [null, expectedCallback.href]) {
    const request = new URL("/auth/v1/verify", url);
    request.searchParams.set("token", "invalid-redirect-diagnostic");
    request.searchParams.set("type", "signup");
    if (destination) request.searchParams.set("redirect_to", destination);
    const response = await fetch(request, { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { apikey: key } });
    const location = response.headers.get("location");
    const actual = location ? new URL(location) : null;
    const expected = destination ? expectedCallback : new URL(site.origin);
    const ok = response.status >= 300 && response.status < 400 && actual?.origin === expected.origin && actual.pathname === expected.pathname;
    console.log(`${ok ? "PASS" : "FAIL"} ${destination ? "Allowed callback" : "Default Site URL"}: ${actual ? actual.origin + actual.pathname : `HTTP ${response.status}, no redirect`}`);
    if (!ok) process.exitCode = 1;
  }
} catch {
  console.error("FAIL: unable to check Supabase redirect configuration"); process.exitCode = 1;
}
