// Executes the real migration in an ephemeral PostgreSQL/PGlite database.
// No Supabase connection or credentials. Set PGLITE_MODULE to a local package path.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const load = createRequire(import.meta.url);
const { PGlite } = load(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = await PGlite.create();
const a = "11111111-1111-4111-8111-111111111111", b = "22222222-2222-4222-8222-222222222222";
const day = "2026-10-07";
const plan = { version: 1, id: "33333333-3333-4333-8333-333333333333", userId: a, day, minutes: 10,
  startedAt: `${day}T12:00:00Z`, steps: [{ kind: "review", title: "Review", href: "/review", minutes: 10, target: 2, completedIds: [], skipped: false }] };
async function login(id, role = "authenticated") {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
}
async function sync(user, revision, session) {
  return (await db.query("select public.sync_study_session($1,$2,$3,$4::jsonb) as result", [user, day, revision, session === null ? null : JSON.stringify(session)])).rows[0].result;
}
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    create table public.profiles(id uuid primary key);`);
  await db.query("insert into public.profiles(id) values ($1),($2)", [a,b]);
  const migration = await readFile(new URL("../db/migrate_study_session_sync.sql", import.meta.url), "utf8");
  await db.exec(migration); await db.exec(migration); // Reruns are safe.
  await login(a);
  let first = await sync(a, 0, plan); assert.equal(first.applied, true); assert.equal(first.revision, 1);
  assert.deepEqual(first.session, plan);
  const retry = await sync(a, 0, plan); assert.equal(retry.applied, false); assert.equal(retry.revision, 1);
  const progress = structuredClone(plan); progress.steps[0].completedIds = ["one"];
  const updated = await sync(a, 1, progress); assert.equal(updated.revision, 2);
  const stale = await sync(a, 1, plan); assert.equal(stale.applied, false); assert.deepEqual(stale.session, progress);
  assert.equal((await db.query("select * from public.study_sessions")).rows.length, 1);
  await assert.rejects(db.query("update public.study_sessions set session = null"), /permission denied/);
  await assert.rejects(db.query("delete from public.study_sessions"), /permission denied/);
  await login(b);
  assert.equal((await db.query("select * from public.study_sessions")).rows.length, 0);
  await assert.rejects(sync(a, 2, progress), /Not authorized/);
  await assert.rejects(sync(a, 2, null), /Not authorized/); // Fence a delayed reset after account switch.
  await assert.rejects(sync(b, 0, plan), /Invalid study session/);
  await login("", "anon"); await assert.rejects(sync(a, 2, progress), /permission denied/);
  await login(a);
  for (const invalid of [
    { ...plan, day: "2026-10-08" }, { ...plan, minutes: 20 },
    { ...plan, steps: [{ ...plan.steps[0], href: "https://outside.test" }] },
    { ...plan, steps: [{ ...plan.steps[0], completedIds: ["one", "one"] }] },
    { ...plan, steps: [{ ...plan.steps[0], target: -1 }] },
    { ...plan, steps: [{ ...plan.steps[0], completedIds: [42] }] },
    { ...plan, steps: [] }, { ...plan, startedAt: "not a date" }, { ...plan, userId: b },
  ]) await assert.rejects(sync(a, 2, invalid), /Invalid study session/);
  const reset = await sync(a, 2, null); assert.equal(reset.applied, true); assert.equal(reset.session, null);
  const offline = await sync(a, 2, progress); assert.equal(offline.applied, false); assert.equal(offline.session, null);
  const next = { ...plan, id: "44444444-4444-4444-8444-444444444444" };
  assert.equal((await sync(a, reset.revision, next)).applied, true);
  console.log("PASS: migration/rerun, real PostgreSQL CAS, retry deduplication, reset marker, payload validation, RLS account isolation, stale-account request fence, direct write/anonymous rejection.");
} finally { await db.close(); }
