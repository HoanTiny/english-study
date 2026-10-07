// Creates two temporary learners and one hidden lesson, tests with learner JWTs,
// then removes only records created by this run. Explicit write opt-in required.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const expected = process.argv.find(arg => arg.startsWith("--project-ref="))?.split("=")[1];
const appUrl = process.argv.find(arg => arg.startsWith("--app-url="))?.slice("--app-url=".length);
if (appUrl && !["localhost", "127.0.0.1"].includes(new URL(appUrl).hostname)) {
  throw new Error("--app-url must be localhost (learner JWT stays on the local development server)");
}
if (!process.argv.includes("--write") || !expected || new URL(url).hostname !== `${expected}.supabase.co`) {
  throw new Error("Requires --write --project-ref=<configured-project> (creates and removes test data)");
}
const settings = { auth: { persistSession: false, autoRefreshToken: false }, global: {
  fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }),
} };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, settings);
const learners = [];
let lessonId;
let stage = "setup";
function requireData(response, label) {
  if (response.error) throw new Error(`${label}: ${response.error.code ?? response.error.status ?? "failed"}`);
  return response.data;
}
function pass(label) { console.log(`PASS ${label}`); }
async function learner() {
  const email = `speakup-check-${randomUUID()}@example.com`;
  const password = `${randomUUID()}-Aa1!`;
  const created = requireData(await admin.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { display_name: "Temporary integration check" } }), "create test user");
  const id = created.user.id;
  learners.push(id);
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, settings);
  requireData(await client.auth.signInWithPassword({ email, password }), "test sign-in");
  requireData(await client.from("profiles").upsert({ id, email, display_name: "Temporary integration check" }), "ensure profile");
  return { client, id };
}
try {
  const a = await learner(); const b = await learner();
  pass("two real learner sessions");
  if (appUrl) {
    stage = "application Speech API authentication, quota and token";
    const denied = await fetch(`${appUrl}/api/speech-token`, { signal: AbortSignal.timeout(30000) });
    assert.equal(denied.status, 401);
    const session = requireData(await a.client.auth.getSession(), stage).session;
    const speech = await fetch(`${appUrl}/api/speech-token`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(30000) });
    assert.equal(speech.status, 200);
    const body = await speech.json();
    assert.equal(body.configured, true); assert.ok(body.token?.length > 0);
    assert.equal(speech.headers.get("cache-control"), "no-store");
    pass(stage);
  }
  stage = "profile isolation and role protection";
  assert.equal(requireData(await b.client.from("profiles").select("id").eq("id", a.id), stage).length, 0);
  assert.ok((await a.client.from("profiles").update({ role: "admin" }).eq("id", a.id)).error);
  requireData(await a.client.from("profiles").update({ current_stage: 2, onboarded: true }).eq("id", a.id), stage);
  const placement = requireData(await a.client.from("profiles").select("current_stage,onboarded,role").eq("id", a.id).single(), stage);
  assert.equal(placement.current_stage, 2); assert.equal(placement.onboarded, true); assert.equal(placement.role, null);
  pass(stage);
  stage = "shadowing history, retry deduplication and isolation";
  const firstKey = randomUUID(); const secondKey = randomUUID();
  const assessment = { pronunciation: 72, accuracy: 70, fluency: 80, completeness: 100, recognized: "Hello", words: [{ word: "Hello", accuracy: 70, error: "Mispronunciation" }] };
  const attempt = { user_id: a.id, client_key: "s1", pronunciation_score: 72, speed_rate: .75,
    score_source: "azure", attempt_key: firstKey, assessment };
  for (let i = 0; i < 2; i++) requireData(await a.client.from("shadowing_attempts").upsert(attempt, { onConflict: "user_id,client_key" }), stage);
  let history = requireData(await a.client.from("shadowing_history").select("id,assessment").eq("client_key", "s1"), stage);
  assert.equal(history.length, 1); assert.deepEqual(history[0].assessment, assessment);
  requireData(await a.client.from("shadowing_attempts").upsert({ ...attempt, attempt_key: secondKey, pronunciation_score: 85, assessment: { ...assessment, pronunciation: 85 } }, { onConflict: "user_id,client_key" }), stage);
  history = requireData(await a.client.from("shadowing_history").select("id").eq("client_key", "s1"), stage);
  assert.equal(history.length, 2);
  const latest = requireData(await a.client.from("shadowing_attempts").select("pronunciation_score,attempt_key").eq("client_key", "s1").single(), stage);
  assert.equal(latest.pronunciation_score, 85); assert.equal(latest.attempt_key, secondKey);
  assert.equal(requireData(await b.client.from("shadowing_history").select("id").eq("user_id", a.id), stage).length, 0);
  assert.equal(requireData(await b.client.from("shadowing_attempts").select("id").eq("user_id", a.id), stage).length, 0);
  assert.equal(requireData(await b.client.from("shadowing_attempts").update({ pronunciation_score: 0 }).eq("user_id", a.id).select("id"), stage).length, 0);
  assert.ok((await b.client.from("shadowing_attempts").upsert(attempt, { onConflict: "user_id,client_key" })).error);
  assert.ok((await a.client.from("shadowing_history").insert({ id: randomUUID(), user_id: a.id, client_key: "s1", pronunciation_score: 100, speed_rate: 1 })).error);
  pass(stage);
  stage = "error review schedule, replay rejection and isolation";
  const errorRow = requireData(await a.client.from("error_log").insert({ user_id: a.id, source: "grammar", original: "She go.", correction: "She goes." }).select("id").single(), stage);
  assert.equal(requireData(await b.client.from("error_log").select("id").eq("id", errorRow.id), stage).length, 0);
  assert.ok((await b.client.rpc("practice_error", { p_id: errorRow.id, p_remembered: true })).error);
  const practiced = requireData(await a.client.rpc("practice_error", { p_id: errorRow.id, p_remembered: true }).single(), stage);
  assert.equal(practiced.correct_streak, 1); assert.equal(practiced.practice_count, 1);
  assert.ok(Date.parse(practiced.next_review_at) > Date.now() + 23 * 3600000);
  assert.ok((await a.client.rpc("practice_error", { p_id: errorRow.id, p_remembered: true })).error);
  requireData(await admin.from("error_log").update({ next_review_at: new Date(Date.now() - 60000).toISOString() }).eq("id", errorRow.id).eq("user_id", a.id), stage);
  const again = requireData(await a.client.rpc("practice_error", { p_id: errorRow.id, p_remembered: false }).single(), stage);
  assert.equal(again.correct_streak, 0); assert.equal(again.practice_count, 2);
  assert.ok(Date.parse(again.next_review_at) > Date.now() + 9 * 60000);
  pass(stage);
  stage = "quiz persistence and isolation";
  requireData(await a.client.from("lesson_quiz_results").upsert({ user_id: a.id, slug: "integration-check", score: 4, total: 5 }), stage);
  assert.equal(requireData(await a.client.from("lesson_quiz_results").select("score").eq("slug", "integration-check").single(), stage).score, 4);
  assert.equal(requireData(await b.client.from("lesson_quiz_results").select("slug").eq("user_id", a.id), stage).length, 0);
  assert.ok((await b.client.from("lesson_quiz_results").upsert({ user_id: a.id, slug: "integration-check", score: 5, total: 5 })).error);
  pass(stage);
  stage = "FSRS JSON persistence and isolation";
  const fsrs = { due: new Date().toISOString(), stability: 1.25, difficulty: 4.1, elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps: 2, lapses: 1, state: 2 };
  const review = requireData(await a.client.from("review_items").insert({ user_id: a.id, source_type: "note", source_id: randomUUID(), fsrs_card: fsrs }).select("id,fsrs_card").single(), stage);
  assert.deepEqual(requireData(await a.client.from("review_items").select("fsrs_card").eq("id", review.id).single(), stage).fsrs_card, fsrs);
  assert.equal(requireData(await b.client.from("review_items").select("id").eq("id", review.id), stage).length, 0);
  pass(stage);
  stage = "streak day deduplication and isolation";
  const day = new Date().toISOString().slice(0, 10);
  assert.equal(requireData(await a.client.rpc("record_study_day", { p_user: a.id, p_day: day }), stage), 1);
  assert.equal(requireData(await a.client.rpc("record_study_day", { p_user: a.id, p_day: day }), stage), 1);
  assert.ok((await b.client.rpc("record_study_day", { p_user: a.id, p_day: day })).error);
  pass(stage);
  stage = "server-only functions and quota table";
  assert.ok((await a.client.rpc("consume_api_quota", { p_user: a.id })).error);
  assert.ok((await a.client.from("api_usage").select("bucket").limit(1)).error);
  assert.ok((await a.client.rpc("replace_lesson_phrases", { p_lesson: randomUUID(), p_phrases: [] })).error);
  pass(stage);
  stage = "CMS atomic rollback and hidden lesson isolation";
  const lesson = requireData(await admin.from("cms_lessons").insert({ slug: `integration-check-${randomUUID()}`, title: "Temporary integration check", visible: false }).select("id").single(), stage);
  lessonId = lesson.id;
  requireData(await admin.rpc("replace_lesson_phrases", { p_lesson: lessonId, p_phrases: [{ en: "Hello", vi: "Xin chào", audio_url: "integration-placeholder" }] }), stage);
  assert.ok((await admin.rpc("replace_lesson_phrases", { p_lesson: lessonId, p_phrases: [{ vi: "Missing English" }] })).error);
  let phrases = requireData(await admin.from("cms_lesson_phrases").select("en,audio_url").eq("lesson_id", lessonId), stage);
  assert.equal(phrases.length, 1); assert.equal(phrases[0].en, "Hello");
  requireData(await admin.rpc("replace_lesson_phrases", { p_lesson: lessonId, p_phrases: [{ en: "Hello", vi: "Chào bạn" }] }), stage);
  phrases = requireData(await admin.from("cms_lesson_phrases").select("audio_url").eq("lesson_id", lessonId), stage);
  assert.equal(phrases[0].audio_url, "integration-placeholder");
  assert.equal(requireData(await a.client.from("cms_lessons").select("id").eq("id", lessonId), stage).length, 0);
  assert.equal(requireData(await a.client.from("cms_lesson_phrases").select("id").eq("lesson_id", lessonId), stage).length, 0);
  pass(stage);
} catch (error) {
  console.error(`FAIL ${stage}: ${error.code ?? error.message}`);
  process.exitCode = 1;
} finally {
  let cleanupFailed = false;
  if (lessonId) {
    const { error } = await admin.from("cms_lessons").delete().eq("id", lessonId);
    if (error) { cleanupFailed = true; console.error(`CLEANUP required for test lesson ${lessonId}`); }
  }
  for (const id of learners) {
    const usage = await admin.from("api_usage").delete().in("bucket", [`${id}-day`, `${id}-minute`]);
    const profile = await admin.from("profiles").delete().eq("id", id);
    const user = await admin.auth.admin.deleteUser(id);
    if (usage.error || profile.error || user.error) { cleanupFailed = true; console.error(`CLEANUP required for test user ${id}`); }
  }
  if (cleanupFailed) process.exitCode = 1;
  else pass(`cleanup (${learners.length} temporary learners${lessonId ? " and hidden lesson" : ""})`);
}
