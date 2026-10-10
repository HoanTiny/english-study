// Read-only schema checks plus one Azure token request. Never prints keys/tokens.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Missing Supabase configuration in .env.local");
const headers = { apikey: key, Authorization: `Bearer ${key}` };
let failures = 0;
const checks = {
  profiles: "id,role,current_stage", cms_lessons: "id", cms_lesson_phrases: "id,audio_url",
  review_items: "id,fsrs_card", lesson_quiz_results: "user_id", error_log: "id,next_review_at,correct_streak",
  shadowing_attempts: "id,score_source,assessment,attempt_key", shadowing_history: "id", api_usage: "bucket",
};
for (const [table, select] of Object.entries(checks)) {
  try {
    const response = await fetch(`${base}/rest/v1/${table}?select=${select}&limit=0`, { headers, signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    if (!response.ok) failures++;
    console.log(JSON.stringify({ check: table, status: response.status, code: body.code ?? null }));
  } catch (error) { failures++; console.log(JSON.stringify({ check: table, error: error.name, code: error.cause?.code })); }
}
try {
  const response = await fetch(`${base}/rest/v1/`, { headers: { ...headers, Accept: "application/openapi+json" }, signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  for (const fn of ["consume_api_quota", "replace_lesson_phrases", "record_study_day", "practice_error"]) {
    const available = response.ok && !!body.paths?.[`/rpc/${fn}`];
    if (!available) failures++;
    console.log(JSON.stringify({ function: fn, available }));
  }
} catch (error) { failures++; console.log(JSON.stringify({ check: "functions", error: error.name, code: error.cause?.code })); }
if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
  try {
    const response = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST", headers: { "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY }, signal: AbortSignal.timeout(15000),
    });
    const nonempty = (await response.text()).length > 0;
    if (!response.ok || !nonempty) failures++;
    console.log(JSON.stringify({ check: "azure-token", status: response.status, nonempty }));
  } catch (error) { failures++; console.log(JSON.stringify({ check: "azure-token", error: error.name, code: error.cause?.code })); }
} else { failures++; console.log(JSON.stringify({ check: "azure-token", error: "Not configured" })); }
process.exitCode = failures ? 1 : 0;
