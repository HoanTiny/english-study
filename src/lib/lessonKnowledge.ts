import knowledge from "@/data/lesson-knowledge.json";

export type LessonKnowledge = {
  concepts: [title: string, explanation: string, en: string, vi: string][];
  vocabulary: [en: string, vi: string][];
  mistake: [incorrect: string, correct: string, explanation: string];
  practice: [prompt: string, answer: string, explanation: string][];
  task: string;
};

// Supplements are shown only after the published CMS lesson has loaded.
// They never substitute for a hidden, missing, or unavailable CMS lesson.
// JSON imports infer string[][] rather than tuples. Content-integrity tests verify
// tuple lengths, required text, curriculum coverage and references before release.
export const lessonKnowledge = knowledge as unknown as Record<string, LessonKnowledge>;
