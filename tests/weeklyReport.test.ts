import { expect, it } from "vitest";
import { weeklyReport } from "@/lib/weeklyReport";
import type { ActivityDay } from "@/lib/statsRepo";
function timeline(): ActivityDay[] {
  return Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2,"0")}`, label: `${i + 1}/10`,
    reviews: 0, journaled: false, shadowCount: 0, shadowTotal: 0, shadowAvg: null, shadowSentences: {} }));
}
function score(day: ActivityDay, id: string, values: number[]) {
  const total = values.reduce((a, b) => a + b, 0);
  day.shadowSentences[id] = { count: values.length, total, latestScore: values.at(-1)!, latestAt: `${day.date}T12:00:00Z` };
  day.shadowCount += values.length; day.shadowTotal += total; day.shadowAvg = Math.round(day.shadowTotal / day.shadowCount);
}
it("uses two non-overlapping windows and includes days with pronunciation only", () => {
  const days = timeline(); days[0].reviews = 4; days[7].reviews = 6; days[8].journaled = true; score(days[13], "s1", [80]);
  const report = weeklyReport(days);
  expect(report.previous.reviews).toBe(4); expect(report.current.reviews).toBe(6);
  expect(report.current.activeDays).toBe(3); expect(report.current.journalDays).toBe(1);
  expect(report.currentDays[0].date).toBe("2026-10-08");
});
it("weights the overall average by attempts but compares pronunciation on shared sentences only", () => {
  const days = timeline(); score(days[0], "s1", [40]); score(days[7], "s1", [60,80]); score(days[8], "s2", [100]);
  const report = weeklyReport(days);
  expect(report.current.shadowAvg).toBe(80); expect(report.comparedSentences).toBe(1);
  expect(report.pronunciationChange).toBe(30); // s1: (60+80)/2 - 40. New s2 does not inflate progress.
});
it("prioritizes the latest weak result, not an already corrected low score", () => {
  const days = timeline(); score(days[7], "s1", [20]); score(days[8], "s1", [90]); score(days[8], "s2", [45]);
  expect(weeklyReport(days).weakSentences).toEqual([{ id: "s2", score: 45 }]);
});
it("does not invent an improvement baseline and preserves genuine zero scores", () => {
  const days = timeline(); score(days[13], "s1", [0]);
  const report = weeklyReport(days);
  expect(report.pronunciationChange).toBeNull(); expect(report.current.shadowAvg).toBe(0);
  expect(weeklyReport(timeline()).current.shadowAvg).toBeNull();
});
