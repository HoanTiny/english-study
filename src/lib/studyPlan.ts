export type StudyMinutes = 10 | 20 | 30;
export type StudyKind = "review" | "lesson" | "quiz" | "errors" | "shadowing";
export type StudyStep = {
  kind: StudyKind; title: string; href: string; minutes: number; target: number;
  completedIds: string[]; skipped: boolean; slug?: string;
};
export type StudySession = {
  version: 1; userId: string; day: string; minutes: StudyMinutes; startedAt: string; steps: StudyStep[];
};
export type StudyEvent = { kind: StudyKind; id: string; slug?: string };

export function buildStudyPlan(input: {
  minutes: StudyMinutes; dueReviews: number; dueErrors: number; dueShadow?: number;
  lesson: { slug: string; title: string; remaining: number } | null;
}): StudyStep[] {
  const { minutes, dueReviews, dueErrors, lesson } = input;
  const size = minutes / 10;
  const steps: StudyStep[] = [];
  const add = (kind: StudyKind, title: string, href: string, weight: number, target: number, slug?: string) => {
    steps.push({ kind, title, href, minutes: weight, target, slug, completedIds: [], skipped: false });
  };
  if (dueReviews > 0) add("review", "Ôn thẻ đến hạn", "/review", 2, Math.min(dueReviews, 5 * size));
  if (lesson) {
    const quiz = lesson.remaining <= 0;
    add(quiz ? "quiz" : "lesson", `${quiz ? "Kiểm tra" : "Học cụm"}: ${lesson.title}`,
      `/lesson/${encodeURIComponent(lesson.slug)}`, 4, quiz ? 1 : Math.min(lesson.remaining, 3 * size), lesson.slug);
  }
  if (dueErrors > 0) add("errors", "Tự sửa lỗi đã gặp", "/errors", 1, Math.min(dueErrors, size + 1));
  add("shadowing", input.dueShadow ? "Ôn câu phát âm còn yếu" : "Nghe và luyện nhại", "/shadowing", 3, size);
  const weight = steps.reduce((n, s) => n + s.minutes, 0);
  let allocated = 0;
  return steps.map((step, i) => {
    const share = i === steps.length - 1 ? minutes - allocated : Math.max(1, Math.floor(step.minutes * minutes / weight));
    allocated += share;
    return { ...step, minutes: share };
  });
}

export function stepDone(step: StudyStep): boolean { return step.completedIds.length >= step.target; }
export function nextStudyStep(session: StudySession): StudyStep | undefined {
  return session.steps.find(s => !s.skipped && !stepDone(s));
}
export function applyStudyEvent(session: StudySession, event: StudyEvent): StudySession {
  return { ...session, steps: session.steps.map(step => {
    if (step.skipped || stepDone(step) || step.kind !== event.kind || (step.slug && step.slug !== event.slug)
      || step.completedIds.includes(event.id)) return step;
    return { ...step, completedIds: [...step.completedIds, event.id] };
  }) };
}

/** Local storage is untrusted; validate routes and counts before displaying links. */
export function parseStudySession(raw: string | null, userId: string, day: string): StudySession | null {
  try {
    const value = JSON.parse(raw ?? "null") as StudySession;
    if (!value || value.version !== 1 || value.userId !== userId || value.day !== day
      || ![10,20,30].includes(value.minutes) || !Array.isArray(value.steps) || !value.steps.length
      || value.steps.length > 5 || !Number.isFinite(Date.parse(value.startedAt))) return null;
    for (const s of value.steps) {
      if (!s || !["review","lesson","quiz","errors","shadowing"].includes(s.kind)
        || typeof s.title !== "string" || !Number.isInteger(s.target) || s.target <= 0 || s.target > 100
        || !Number.isInteger(s.minutes) || s.minutes <= 0 || typeof s.skipped !== "boolean"
        || !Array.isArray(s.completedIds) || s.completedIds.length > 100 || s.completedIds.some(id => typeof id !== "string")) return null;
      const expected = s.kind === "lesson" || s.kind === "quiz"
        ? (typeof s.slug === "string" && s.slug ? `/lesson/${encodeURIComponent(s.slug)}` : null)
        : `/${s.kind}`;
      if (s.href !== expected) return null;
    }
    return value;
  } catch { return null; }
}
