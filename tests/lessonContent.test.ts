import { describe, expect, it } from "vitest";
import grammar from "@/data/grammar.json";
import { TENSES } from "@/data/tenses";
import { lessonKnowledge } from "@/lib/lessonKnowledge";
import { lessonContent } from "@/lib/lessons";
import { stages } from "@/lib/curriculum";

describe("curriculum content integrity", () => {
  it("provides usable supplements for every lesson except the dedicated IPA tool", () => {
    const slugs = stages.flatMap(stage => stage.lessons.map(lesson => lesson.slug));
    expect(Object.keys(lessonKnowledge).sort()).toEqual(slugs.filter(slug => slug !== "ipa-sounds").sort());
    for (const [slug, content] of Object.entries(lessonKnowledge)) {
      expect(lessonContent[slug], slug).toBeDefined();
      expect(content.concepts.length, slug).toBeGreaterThanOrEqual(2);
      expect(content.vocabulary.length, slug).toBeGreaterThanOrEqual(3);
      expect(content.practice.length, slug).toBeGreaterThanOrEqual(2);
      for (const row of content.concepts) expect(row.length, slug).toBe(4);
      for (const row of content.vocabulary) expect(row.length, slug).toBe(2);
      for (const row of content.practice) expect(row.length, slug).toBe(3);
      expect(content.mistake.length, slug).toBe(3);
      expect(content.mistake[0], slug).not.toBe(content.mistake[1]);
      const texts = [...content.concepts.flat(), ...content.vocabulary.flat(), ...content.practice.flat(), ...content.mistake, content.task];
      for (const text of texts) expect(text.trim().length, slug).toBeGreaterThan(0);
      expect(new Set(content.practice.map(([prompt]) => prompt)).size, slug).toBe(content.practice.length);
    }
  });

  it("keeps grammar searchable without duplicate keys or broken lesson references", () => {
    expect(new Set(grammar.map(row => row.structure)).size).toBe(grammar.length);
    const topics = new Set(["social", "question", "request", "suggest", "plan", "feeling", "opinion", "advice", "story", "describe"]);
    for (const row of grammar) {
      expect(["A1", "A2", "B1", "B2"], row.structure).toContain(row.level);
      expect(topics.has(row.topic), row.structure).toBe(true);
      for (const text of [row.structure, row.vi, row.example, row.exampleVi]) expect(text.trim()).not.toBe("");
      for (const slug of row.lessons) expect(lessonContent[slug], `${row.structure}: ${slug}`).toBeDefined();
    }
  });

  it("provides all tense/aspect reference entries with three forms and translated examples", () => {
    expect(new Set(TENSES.map(tense => tense.id)).size).toBe(TENSES.length);
    for (const id of ["present-simple", "present-continuous", "present-perfect", "present-perfect-continuous", "past-simple", "past-continuous", "past-perfect", "past-perfect-continuous", "future-simple", "future-continuous", "future-perfect", "future-perfect-continuous"]) {
      const tense = TENSES.find(entry => entry.id === id);
      expect(tense, id).toBeDefined();
      expect(tense!.form.map(form => form.label), id).toEqual(["Khẳng định", "Phủ định", "Nghi vấn"]);
      expect(tense!.examples.length, id).toBeGreaterThanOrEqual(3);
      for (const example of tense!.examples) {
        expect(example.en.trim(), id).not.toBe("");
        expect(example.vi.trim(), id).not.toBe("");
      }
    }
  });
});
