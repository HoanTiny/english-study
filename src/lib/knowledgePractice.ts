// Only explicitly curated short-answer questions are auto-checked. Translation,
// rewriting and other open responses are compared by the learner with a model.
export const acceptedPracticeAnswers: Record<string, Record<number, string[]>> = {
  greetings: { 0: ["is; am"] },
  family: { 0: ["are"] },
  "numbers-time": { 0: ["a quarter to seven", "quarter to seven"], 1: ["in; on; at"] },
  "daily-routine": { 0: ["has"], 1: ["We are never late."] },
  "free-time": { 0: ["reading"], 1: ["He can play football."] },
  food: { 0: ["much"], 1: ["to"] },
  "places-directions": { 0: ["Is"] },
  "health-body": { 0: ["hurt"], 1: ["feel"] },
  "clothes-appearance": { 0: ["has"], 1: ["is"] },
  "house-home": { 0: ["on"] },
  "present-continuous": { 0: ["is running"], 1: ["know"] },
  "past-simple": { 0: ["were; went"] },
  "describe-compare": { 0: ["hotter"] },
  "future-plans": { 0: ["to"], 1: ["answer"] },
  "present-perfect": { 0: ["eaten"], 1: ["for"] },
  "adverbs-manner": { 0: ["easily; quietly; well"], 1: ["happy"] },
  "first-conditional": { 0: ["studies; will pass"] },
  "shopping-money": { 0: ["by"] },
  "weather-seasons": { 0: ["sunny"], 1: ["snows"] },
  "feelings-emotions": { 0: ["surprising"], 1: ["about"] },
  "jobs-ambitions": { 0: ["as; in"] },
  "making-plans": { 0: ["watching"] },
  transport: { 0: ["off"] },
  "phone-calls": { 0: ["leave"] },
  restaurant: { 0: ["checking"] },
  travel: { 1: ["is"] },
  "hotel-accommodation": { 0: ["in"] },
  "technology-phone": { 0: ["Switch it on."], 1: ["yet"] },
  "work-office": { 0: ["by"] },
  "job-interview": { 0: ["at organising", "at organizing"] },
  "environment-nature": { 0: ["Less"], 1: ["to"] },
  // Present perfect simple is also grammatical in this context, even though
  // continuous is the target of the lesson.
  "present-perfect-continuous": { 0: ["has been waiting", "has waited"], 1: ["written"] },
  "second-conditional": { 0: ["lived; would meet"] },
  "modals-deduction": { 0: ["have"] },
  "passive-simple": { 1: ["was sent"] },
  "small-talk": { 1: ["isn't it", "is it not"] },
  "narrative-tenses": { 0: ["was cooking; rang"] },
  "third-conditional": { 0: ["had booked; would have paid"], 1: ["wouldn't be", "would not be"] },
};

export function normalizePracticeAnswer(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/[’‘]/g, "'")
    .replace(/[.,;:!?\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type PracticeResult = "empty" | "correct" | "retry" | "self-review";

export function checkPracticeAnswer(slug: string, index: number, answer: string): PracticeResult {
  const normalized = normalizePracticeAnswer(answer);
  if (!normalized) return "empty";
  const accepted = acceptedPracticeAnswers[slug]?.[index];
  if (!accepted) return "self-review";
  return accepted.some(value => normalizePracticeAnswer(value) === normalized) ? "correct" : "retry";
}
