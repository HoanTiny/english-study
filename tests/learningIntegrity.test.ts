import { describe, it, expect, vi, beforeEach } from "vitest";
import { initialState, review, isDue } from "@/lib/srs";
import { localDate } from "@/lib/calendar";

const mocks = vi.hoisted(() => ({ list: vi.fn(), from: vi.fn(), rpc: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/lessonsRepo", () => ({ fetchLessonList: mocks.list }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ supabaseAdmin: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/server/authUser", () => ({ getUserId: mocks.user }));
import { loadStages, computeStatusesView, TOOL_SLUGS, type ViewStage } from "@/lib/lessonsView";
import { listDoneSlugs, markLessonDone } from "@/lib/lessonDone";
import { bodyWithinLimit, guardPaidApi } from "@/lib/server/apiGuard";

beforeEach(() => vi.clearAllMocks());

describe("FSRS persistence", () => {
  it("preserves learning steps and exact due timestamp through JSON storage", () => {
    const now = new Date("2026-10-04T10:00:00Z");
    const first = review(initialState("2026-10-04"), "again", "2026-10-04", now);
    const restored = JSON.parse(JSON.stringify(first));
    expect(restored.card.last_review).toBe(now.toISOString());
    expect(restored.card.state).toBe(1); // Learning, not forcibly Review
    expect(isDue(restored, "2026-10-04", now)).toBe(false);
    const due = new Date(restored.card.due);
    expect(isDue(restored, "2026-10-04", due)).toBe(true);
    const next = review(restored, "good", "2026-10-04", due);
    expect(next.card?.reps).toBe(2);
    expect(next.card?.last_review).toBe(due.toISOString());
  });
  it("migrates a legacy card on its next review", () => {
    const next = review({ ease: 5, interval: 12, repetitions: 4, due: "2026-10-04" }, "again", "2026-10-04");
    expect(next.card?.lapses).toBe(1);
    expect(next.card?.state).toBe(3); // Relearning
  });
});

describe("CMS and progress", () => {
  it("does not resurrect omitted static lessons", async () => {
    mocks.list.mockResolvedValue([]);
    const stages = await loadStages();
    expect(stages.flatMap(s => s.lessons).every(l => TOOL_SLUGS.has(l.slug))).toBe(true);
  });
  it("propagates CMS failures instead of displaying fallback content", async () => {
    mocks.list.mockRejectedValue(new Error("offline"));
    await expect(loadStages()).rejects.toThrow("offline");
  });
  it("saving all phrases is not a quiz pass; passed quizzes complete lessons", () => {
    const stages: ViewStage[] = [{ id: 1, title: "A1", cefr: "A1", goal: "", months: "", lessons: [
      { slug: "first", title: "First", topic: "", cefr: "A1", phraseCount: 2 },
      { slug: "second", title: "Second", topic: "", cefr: "A1", phraseCount: 2 },
    ] }];
    expect(computeStatusesView(stages, { first: 2 }).first).toBe("in_progress");
    expect(computeStatusesView(stages, {}, ["first"])).toEqual({ first: "done", second: "available" });
  });
  it("scopes quiz reads to the current user and filters failed attempts", async () => {
    const eq = vi.fn().mockResolvedValue({ data: [{ slug: "pass", score: 8, total: 10 }, { slug: "fail", score: 7, total: 10 }], error: null });
    mocks.from.mockReturnValue({ select: () => ({ eq }) });
    expect(await listDoneSlugs("user-b")).toEqual(["pass"]);
    expect(eq).toHaveBeenCalledWith("user_id", "user-b");
  });
  it("does not mark failed quizzes complete", async () => {
    await markLessonDone("a", "lesson", 1, 10);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("propagates quiz save failure", async () => {
    mocks.from.mockReturnValue({ upsert: () => Promise.resolve({ error: new Error("offline") }) });
    await expect(markLessonDone("a", "lesson", 10, 10)).rejects.toThrow("offline");
  });
});

describe("API guard", () => {
  it("rejects unauthenticated calls before consuming quota", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await guardPaidApi(new Request("https://test/api")))?.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("enforces body bytes without Content-Length, leaving valid JSON readable", async () => {
    const req = new Request("https://test", { method: "POST", body: JSON.stringify({ text: "hello" }) });
    expect(await bodyWithinLimit(req)).toBe(true);
    expect(await req.json()).toEqual({ text: "hello" });
    expect(await bodyWithinLimit(new Request("https://test", { method: "POST", body: "x".repeat(16001) }))).toBe(false);
  });
  it("rejects oversized authenticated input before quota", async () => {
    mocks.user.mockResolvedValue("user-a");
    expect((await guardPaidApi(new Request("https://test", { method: "POST", body: "x".repeat(16001) })))?.status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("fails closed when quota storage is unavailable", async () => {
    mocks.user.mockResolvedValue("user-a");
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("missing migration") });
    expect((await guardPaidApi(new Request("https://test")))?.status).toBe(503);
  });
  it("returns 429 at quota and allows calls below quota", async () => {
    mocks.user.mockResolvedValue("user-a");
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null });
    expect((await guardPaidApi(new Request("https://test")))?.status).toBe(429);
    expect(await guardPaidApi(new Request("https://test"))).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith("consume_api_quota", { p_user: "user-a" });
  });
});

describe("calendar", () => {
  it("uses local calendar components at the midnight boundary", () => {
    const midnight = new Date(2026, 9, 4, 0, 1);
    expect(localDate(midnight)).toBe("2026-10-04");
    expect(localDate(new Date(midnight.getTime() - 120000))).toBe("2026-10-03");
  });
});
