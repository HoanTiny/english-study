import { describe, it, expect, vi } from "vitest";
import { applyStudyEvent, buildStudyPlan, nextStudyStep, parseStudySession, stepDone, type StudySession } from "@/lib/studyPlan";
import { errorDue } from "@/lib/errorPractice";
vi.mock("@/lib/lessonsRepo", () => ({ fetchLessonList: vi.fn() }));
import { computeStatusesView, suggestedLesson, type ViewStage } from "@/lib/lessonsView";

const stages: ViewStage[] = [1,2,3,4].map(id => ({
  id, title: `Stage ${id}`, cefr: ["A1","A2","B1","B2"][id-1], goal: "", months: "",
  lessons: [1,2].map(n => ({ slug: `s${id}-${n}`, title: `Lesson ${n}`, topic: "", cefr: "", phraseCount: 4 })),
}));

describe("placement", () => {
  it("opens the selected starting level and keeps earlier lessons available without marking them done", () => {
    const statuses = computeStatusesView(stages, {}, [], 3);
    expect(statuses["s1-2"]).toBe("available");
    expect(statuses["s2-2"]).toBe("available");
    expect(statuses["s3-1"]).toBe("available");
    expect(statuses["s3-2"]).toBe("locked");
    expect(statuses["s4-1"]).toBe("locked");
    expect(Object.values(statuses)).not.toContain("done");
  });
  it("suggests the learner's level rather than unfinished foundational lessons", () => {
    expect(suggestedLesson(stages, { "s1-1": 2 }, [], 3)?.slug).toBe("s3-1");
  });
  it("prioritizes an unfinished lesson and advances after a quiz pass", () => {
    expect(suggestedLesson(stages, { "s2-1": 2 }, [], 2)?.slug).toBe("s2-1");
    expect(suggestedLesson(stages, {}, ["s2-1"], 2)?.slug).toBe("s2-2");
  });
  it("returns no new lesson when all applicable lessons passed", () => {
    expect(suggestedLesson(stages, {}, ["s4-1","s4-2"], 4)).toBeNull();
  });
});

function session(): StudySession {
  return { version: 1, userId: "a", day: "2026-10-04", minutes: 10, startedAt: "2026-10-04T00:00:00Z",
    steps: buildStudyPlan({ minutes: 10, dueReviews: 2, dueErrors: 1, lesson: { slug: "greetings", title: "Hello", remaining: 1 } }) };
}
describe("study session", () => {
  it.each([10,20,30] as const)("allocates exactly %i estimated minutes with bounded targets", minutes => {
    const steps = buildStudyPlan({ minutes, dueReviews: 1, dueErrors: 1, lesson: { slug: "a", title: "A", remaining: 1 } });
    expect(steps.reduce((n,s) => n+s.minutes, 0)).toBe(minutes);
    expect(steps.every(s => s.target > 0 && s.minutes > 0)).toBe(true);
    expect(steps.find(s => s.kind === "review")?.target).toBe(1);
    expect(steps.find(s => s.kind === "lesson")?.target).toBe(1);
  });
  it("omits empty queues and uses a quiz after all phrases are saved", () => {
    const steps = buildStudyPlan({ minutes: 20, dueReviews: 0, dueErrors: 0, lesson: { slug: "a", title: "A", remaining: 0 } });
    expect(steps.map(s => s.kind)).toEqual(["quiz","shadowing"]);
    expect(steps.reduce((n,s) => n+s.minutes,0)).toBe(20);
  });
  it("still offers a valid session without available lessons or due cards", () => {
    const steps = buildStudyPlan({ minutes: 10, dueReviews: 0, dueErrors: 0, lesson: null });
    expect(steps).toHaveLength(1);
    expect(steps[0].kind).toBe("shadowing");
  });
  it("only credits matching activities and deduplicates repeated items", () => {
    const original = session();
    let updated = applyStudyEvent(original, { kind: "lesson", id: "hello", slug: "different" });
    expect(updated).toEqual(original);
    updated = applyStudyEvent(original, { kind: "review", id: "one" });
    updated = applyStudyEvent(updated, { kind: "review", id: "one" });
    expect(updated.steps[0].completedIds).toEqual(["one"]);
    expect(original.steps[0].completedIds).toEqual([]);
    updated = applyStudyEvent(updated, { kind: "review", id: "two" });
    expect(nextStudyStep(updated)?.kind).toBe("lesson");
  });
  it("does not mark skipped steps complete or grant credit to them", () => {
    const s = session(); s.steps[0].skipped = true;
    const updated = applyStudyEvent(s, { kind: "review", id: "one" });
    expect(stepDone(updated.steps[0])).toBe(false);
    expect(nextStudyStep(updated)?.kind).toBe("lesson");
  });
  it("expires sessions at day/account boundaries", () => {
    const raw = JSON.stringify(session());
    expect(parseStudySession(raw, "a", "2026-10-04")).not.toBeNull();
    expect(parseStudySession(raw, "b", "2026-10-04")).toBeNull();
    expect(parseStudySession(raw, "a", "2026-10-05")).toBeNull();
  });
  it("rejects corrupt storage and arbitrary navigation targets", () => {
    expect(parseStudySession("{bad", "a", "2026-10-04")).toBeNull();
    const s = session(); s.steps[0].href = "https://outside.test";
    expect(parseStudySession(JSON.stringify(s), "a", "2026-10-04")).toBeNull();
  });
});

describe("error practice scheduling", () => {
  const now = new Date("2026-10-04T12:00:00Z");
  it("only presents unresolved due errors", () => {
    expect(errorDue({ resolved: false, next_review_at: now.toISOString() }, now)).toBe(true);
    expect(errorDue({ resolved: true }, now)).toBe(false);
    expect(errorDue({ resolved: false, next_review_at: "2026-10-05T12:00:00Z" }, now)).toBe(false);
  });
});
