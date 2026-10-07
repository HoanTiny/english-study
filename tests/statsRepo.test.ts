import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
import { loadActivityTimeline, loadDashboard, averagePronunciation } from "@/lib/statsRepo";
import { listShadowActivity } from "@/lib/shadowingRepo";

const rows: Record<string, object[]> = {};
const errors: Record<string, Error> = {};
const queries: { table: string; query: ReturnType<typeof builder> }[] = [];
function builder(table: string) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn((start: number, end: number) => Promise.resolve({ data: (rows[table] ?? []).slice(start, end + 1), error: errors[table] })),
    then: (resolve: (value: { data: object[]; error?: Error }) => unknown) =>
      Promise.resolve({ data: rows[table] ?? [], error: errors[table] }).then(resolve),
  };
  queries.push({ table, query }); return query;
}
beforeEach(() => {
  vi.clearAllMocks(); queries.length = 0;
  for (const key of Object.keys(rows)) delete rows[key];
  for (const key of Object.keys(errors)) delete errors[key];
  mocks.from.mockImplementation(builder);
});
function attempt(id: string, day: number, score: number, sentence = "s1") {
  return { id, client_key: sentence, pronunciation_score: score, created_at: new Date(2026, 9, day, 12).toISOString() };
}

it("retains both days when a sentence is practiced again, averaging every attempt", async () => {
  rows.shadowing_history = [attempt("1", 6, 20), attempt("2", 7, 90), attempt("3", 7, 100)];
  rows.shadowing_attempts = [attempt("3", 7, 100)];
  const timeline = await loadActivityTimeline("2026-10-07", 2);
  expect(timeline.map(day => [day.date, day.shadowCount, day.shadowAvg])).toEqual([
    ["2026-10-06", 1, 20], ["2026-10-07", 2, 95],
  ]);
  // 210 / 3 = 70, not the unweighted average of the two daily means (58).
  expect(averagePronunciation(timeline)).toBe(70);
  expect(mocks.from).not.toHaveBeenCalledWith("shadowing_attempts");
});
it("uses local midnight bounds and buckets late-night attempts on their local day", async () => {
  rows.shadowing_history = [{ ...attempt("1", 7, 80), created_at: new Date(2026, 9, 7, 0, 1).toISOString() }];
  const timeline = await loadActivityTimeline("2026-10-07", 2);
  const query = queries.find(row => row.table === "shadowing_history")!.query;
  expect(query.gte).toHaveBeenCalledWith("created_at", new Date(2026, 9, 6, 0, 0).toISOString());
  expect(query.lt).toHaveBeenCalledWith("created_at", new Date(2026, 9, 8, 0, 0).toISOString());
  expect(timeline[0].shadowCount).toBe(0); expect(timeline[1].shadowCount).toBe(1);
});
it("counts distinct practiced sentences today while keeping latest-score overview", async () => {
  rows.shadowing_history = [attempt("1", 7, 20), attempt("2", 7, 90), attempt("3", 7, 100, "s2")];
  rows.shadowing_attempts = [attempt("2", 7, 90), attempt("3", 7, 100, "s2")];
  const stats = await loadDashboard("2026-10-07");
  expect(stats.shadowToday).toBe(2); expect(stats.shadowDone).toBe(2); expect(stats.shadowAvg).toBe(95);
});
it("reads beyond Supabase's 1000-row page limit without dropping attempts", async () => {
  rows.shadowing_history = Array.from({ length: 1001 }, (_, i) => attempt(String(i), 7, 80));
  const result = await listShadowActivity("start", "end");
  expect(result).toHaveLength(1001);
  expect(queries[0].query.range).toHaveBeenCalledWith(0, 999);
  expect(queries[1].query.range).toHaveBeenCalledWith(1000, 1999);
  expect(queries[0].query.order).toHaveBeenCalledWith("id", { ascending: true });
});
it("propagates history failures rather than showing zero activity", async () => {
  errors.shadowing_history = new Error("offline");
  await expect(loadActivityTimeline("2026-10-07")).rejects.toThrow("offline");
  await expect(loadDashboard("2026-10-07")).rejects.toThrow("offline");
});
it("keeps empty days empty and an empty range's average unknown", async () => {
  const timeline = await loadActivityTimeline("2026-10-07", 7);
  expect(timeline).toHaveLength(7);
  expect(timeline.every(day => day.shadowAvg === null && day.shadowCount === 0)).toBe(true);
  expect(averagePronunciation(timeline)).toBeNull();
});
