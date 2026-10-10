import { describe, expect, it } from "vitest";
import { acceptedPracticeAnswers, checkPracticeAnswer, normalizePracticeAnswer } from "@/lib/knowledgePractice";
import { lessonKnowledge } from "@/lib/lessonKnowledge";

describe("supplement practice grading", () => {
  it("accepts case, spacing, punctuation and common multi-blank separators", () => {
    for (const answer of ["is; am", "IS, AM.", " is\nam ", "is am"]) {
      expect(checkPracticeAnswer("greetings", 0, answer)).toBe("correct");
    }
    expect(checkPracticeAnswer("small-talk", 1, "Isn’t it?")).toBe("correct");
    expect(checkPracticeAnswer("job-interview", 0, "at organizing")).toBe("correct");
    expect(checkPracticeAnswer("third-conditional", 1, "would not be")).toBe("correct");
  });

  it("does not silently drop negatives or accept wrong word order", () => {
    expect(checkPracticeAnswer("greetings", 0, "am; is")).toBe("retry");
    expect(checkPracticeAnswer("third-conditional", 1, "would be")).toBe("retry");
    expect(checkPracticeAnswer("daily-routine", 1, "We never are late")).toBe("retry");
  });

  it("does not auto-grade open questions or accept empty submissions", () => {
    expect(checkPracticeAnswer("greetings", 1, "What's your job?")).toBe("self-review");
    expect(checkPracticeAnswer("opinions", 0, "It is useful although expensive.")).toBe("self-review");
    expect(checkPracticeAnswer("greetings", 0, " ; . ")).toBe("empty");
    expect(checkPracticeAnswer("greetings", 1, "")).toBe("empty");
  });

  it("curates only existing exercises and includes their model short answer", () => {
    for (const [slug, questions] of Object.entries(acceptedPracticeAnswers)) {
      for (const [index, variants] of Object.entries(questions)) {
        const exercise = lessonKnowledge[slug]?.practice[Number(index)];
        expect(exercise, `${slug}:${index}`).toBeDefined();
        expect(variants.length).toBeGreaterThan(0);
        expect(checkPracticeAnswer(slug, Number(index), exercise[1]), `${slug}:${index}`).toBe("correct");
        expect(new Set(variants.map(normalizePracticeAnswer)).size).toBe(variants.length);
      }
    }
  });
});
