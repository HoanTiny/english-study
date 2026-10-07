import type { ActivityDay } from "./statsRepo";

function summarize(days: ActivityDay[]) {
  const reviews = days.reduce((sum, day) => sum + day.reviews, 0);
  const journalDays = days.filter(day => day.journaled).length;
  const shadowCount = days.reduce((sum, day) => sum + day.shadowCount, 0);
  const shadowTotal = days.reduce((sum, day) => sum + day.shadowTotal, 0);
  const sentences = new Map<string, ActivityDay["shadowSentences"][string]>();
  for (const day of days) for (const [id, value] of Object.entries(day.shadowSentences)) {
    const previous = sentences.get(id);
    const latest = !previous || Date.parse(value.latestAt) >= Date.parse(previous.latestAt) ? value : previous;
    sentences.set(id, { count: (previous?.count ?? 0) + value.count, total: (previous?.total ?? 0) + value.total,
      latestScore: latest.latestScore, latestAt: latest.latestAt });
  }
  return { reviews, journalDays, shadowCount, shadowAvg: shadowCount ? Math.round(shadowTotal / shadowCount) : null,
    activeDays: days.filter(day => day.reviews > 0 || day.journaled || day.shadowCount > 0).length, sentences };
}

/** Rolling, non-overlapping 7-day windows. Pronunciation change compares the same sentences only. */
export function weeklyReport(timeline: ActivityDay[]) {
  const days = timeline.slice(-14);
  const currentDays = days.slice(-7), previousDays = days.slice(0, Math.max(0, days.length - 7));
  const current = summarize(currentDays), previous = summarize(previousDays);
  const changes: number[] = [];
  for (const [id, value] of current.sentences) {
    const before = previous.sentences.get(id);
    if (before) changes.push(value.total / value.count - before.total / before.count);
  }
  const weakSentences = [...current.sentences.entries()].filter(([, value]) => value.latestScore < 80)
    .sort((a, b) => a[1].latestScore - b[1].latestScore).slice(0, 3)
    .map(([id, value]) => ({ id, score: value.latestScore }));
  return { current, previous, currentDays, previousDays, weakSentences, comparedSentences: changes.length,
    pronunciationChange: changes.length ? Math.round(changes.reduce((sum, change) => sum + change, 0) / changes.length) : null };
}
