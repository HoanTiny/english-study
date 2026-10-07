// Opt-in integration check. Creates two temporary accounts; cleans up only their IDs.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const expected = process.argv.find(arg => arg.startsWith("--project-ref="))?.slice("--project-ref=".length);
if (!process.argv.includes("--write") || !expected || !url || new URL(url).hostname !== `${expected}.supabase.co`) {
  throw new Error("Requires --write --project-ref=<configured-project> (creates and removes test data)");
}
const settings = { auth: { persistSession: false, autoRefreshToken: false }, global: {
  fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }),
} };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, settings);
const learners = [];
const day = new Date().toISOString().slice(0, 10);
let stage = "setup";
function data(response) {
  if (response.error) throw new Error(`${stage}: ${response.error.code ?? response.error.status ?? "failed"}`);
  return response.data;
}
const pass = () => console.log(`PASS ${stage}`);
async function learner() {
  const email = `speakup-sync-${randomUUID()}@example.com`, password = `${randomUUID()}-Aa1!`;
  const created = data(await admin.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { display_name: "Temporary sync check" } }));
  const id = created.user.id; learners.push(id);
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, settings);
  data(await client.auth.signInWithPassword({ email, password }));
  data(await client.from("profiles").upsert({ id, email, display_name: "Temporary sync check" }));
  return { client, id, email, password };
}
const read = async client => data(await client.from("study_sessions").select("user_id,study_day,revision,session").eq("study_day", day));
const sync = (client, user, revision, session) => client.rpc("sync_study_session", {
  p_user: user, p_day: day, p_expected_revision: revision, p_session: session,
});
try {
  const a = await learner(), b = await learner();
  const secondDevice = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, settings);
  data(await secondDevice.auth.signInWithPassword({ email: a.email, password: a.password }));
  const plan = { version: 1, id: randomUUID(), userId: a.id, day, minutes: 10, startedAt: new Date().toISOString(),
    steps: [{ kind: "review", title: "Temporary check", href: "/review", minutes: 10, target: 3, completedIds: [], skipped: false }] };
  stage = "create and resume using a second learner session";
  let result = data(await sync(a.client, a.id, 0, plan));
  assert.equal(result.applied, true); assert.equal(result.revision, 1);
  assert.deepEqual((await read(secondDevice))[0].session, plan); pass();

  stage = "concurrent writes reject stale revision, then merged progress persists";
  const first = { ...plan, steps: [{ ...plan.steps[0], completedIds: ["one"] }] };
  const second = { ...plan, steps: [{ ...plan.steps[0], completedIds: ["two"] }] };
  const concurrent = (await Promise.all([sync(a.client, a.id, 1, first), sync(secondDevice, a.id, 1, second)])).map(data);
  assert.equal(concurrent.filter(row => row.applied).length, 1);
  assert.equal(concurrent.filter(row => !row.applied).length, 1);
  assert.ok(concurrent.every(row => row.revision === 2));
  const merged = { ...plan, steps: [{ ...plan.steps[0], completedIds: ["one", "two"] }] };
  result = data(await sync(secondDevice, a.id, 2, merged));
  assert.equal(result.applied, true); assert.equal(result.revision, 3);
  assert.deepEqual((await read(a.client))[0].session.steps[0].completedIds, ["one", "two"]); pass();

  stage = "account isolation, queued cross-account resets and direct writes denied";
  assert.deepEqual(await read(b.client), []);
  assert.ok((await sync(b.client, a.id, 3, merged)).error);
  assert.ok((await sync(b.client, a.id, 3, null)).error);
  assert.ok((await sync(b.client, b.id, 0, merged)).error);
  assert.ok((await a.client.from("study_sessions").update({ session: null }).eq("user_id", a.id)).error);
  assert.ok((await a.client.from("study_sessions").delete().eq("user_id", a.id)).error);
  assert.ok((await a.client.from("study_sessions").insert({ user_id: a.id, study_day: "2020-01-01" })).error);
  const anonymous = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, settings);
  assert.ok((await sync(anonymous, a.id, 3, null)).error); pass();

  stage = "invalid payloads rejected without changing saved progress";
  for (const invalid of [{ ...plan, minutes: 20 }, { ...plan, steps: [{ ...plan.steps[0], href: "https://invalid.example" }] },
    { ...plan, steps: [{ ...plan.steps[0], completedIds: ["duplicate", "duplicate"] }] }]) {
    assert.ok((await sync(a.client, a.id, 3, invalid)).error);
  }
  assert.equal((await read(a.client))[0].revision, 3); pass();

  stage = "durable reset prevents stale offline plan from returning";
  result = data(await sync(a.client, a.id, 3, null));
  assert.equal(result.applied, true); assert.equal(result.revision, 4);
  const stale = data(await sync(secondDevice, a.id, 3, merged));
  assert.equal(stale.applied, false); assert.equal(stale.session, null); assert.equal(stale.revision, 4);
  assert.equal((await read(a.client))[0].session, null);
  const next = { ...plan, id: randomUUID() };
  result = data(await sync(secondDevice, a.id, 4, next));
  assert.equal(result.applied, true); assert.equal(result.revision, 5); pass();
} catch (error) {
  console.error(`FAIL ${stage}: ${error.code ?? error.message}`); process.exitCode = 1;
} finally {
  for (const id of learners.reverse()) {
    // Remove dependent rows/profile first, then only the Auth user created above.
    let failed = false;
    for (const table of ["study_sessions", "profiles"]) {
      const result = await admin.from(table).delete().eq(table === "profiles" ? "id" : "user_id", id);
      if (result.error) { console.error(`Cleanup ${table} failed for temporary user ${id}: ${result.error.code ?? "unknown"}`); failed = true; }
    }
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) { console.error(`Cleanup Auth failed for temporary user ${id}: ${result.error.code ?? result.error.status ?? "unknown"}`); failed = true; }
    if (failed) process.exitCode = 1;
    else console.log(`PASS cleanup temporary user ${id}`);
  }
}
