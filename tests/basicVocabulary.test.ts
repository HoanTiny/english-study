import { describe, expect, it } from "vitest";
import source from "../data/basic-vocabulary-pdf.json";
import { basicLessons, basicWords, basicVocabularySource, isStandaloneWord, wordsFromPhrases } from "@/lib/basicVocabulary";

describe("PDF vocabulary course", () => {
  it("preserves every source row in reachable lessons of at most 20 cards", () => {
    expect(basicLessons).toHaveLength(55);
    expect(basicLessons.every(lesson => lesson.words.length > 0 && lesson.words.length <= 20)).toBe(true);
    expect(new Set(basicLessons.map(lesson => lesson.id)).size).toBe(55);
    expect(basicWords).toHaveLength(1046);
    expect(basicWords.map(({ en, vi, sourceIpa, page }) => ({ en, vi, ipa: sourceIpa, page }))).toEqual(source.topics.flatMap(topic => topic.words));
    expect(new Set(basicLessons.map(lesson => lesson.topicNumber)).size).toBe(50);
    expect(basicVocabularySource.entries).toBe(1046);
    expect(basicVocabularySource.uniqueHeadwords).toBe(943);
  });
  it("includes valid extracted IPA and Vietnamese meanings on every card, including ligatures", () => {
    for (const word of basicWords) {
      expect(word.vi.trim()).toBeTruthy();
      if (word.ipa) expect(word.ipa).toMatch(/^\/[^/]+\/$/);
      expect(word.en + word.vi + word.ipa).not.toMatch(/[\u0000-\u001f\ufffd]/);
      expect(word.page).toBeGreaterThanOrEqual(7);
      expect(word.page).toBeLessThanOrEqual(58);
    }
    expect(basicWords.find(word => word.en === "catastrophe")?.sourceIpa).toBe("/kəˈtæstrəfi/");
    expect(basicWords.find(word => word.en === "Office")?.vi).toBe("Văn phòng");
    expect(basicWords.find(word => word.en === "desertification")).toBeDefined();
  });
  it("separates single-word practice without discarding the original multiword entries", () => {
    expect(isStandaloneWord("Parent")).toBe(true);
    expect(isStandaloneWord("Father-in-law")).toBe(true);
    expect(isStandaloneWord("sauté")).toBe(true);
    expect(isStandaloneWord("A child")).toBe(false);
    expect(isStandaloneWord("climate change")).toBe(false);
    expect(basicWords.some(word => word.en === "climate change")).toBe(true);
  });
  it("extracts unique known headwords with IPA for existing phrase lessons", () => {
    const words = wordsFromPhrases(["Drink plenty of water.", "The dog and cats drink water.", "The nonexistentxyz."]);
    expect(words.map(word => word.en)).toEqual(expect.arrayContaining(["water", "dog", "cat"]));
    expect(words.filter(word => word.en === "water")).toHaveLength(1);
    expect(words.every(word => word.ipa && isStandaloneWord(word.en))).toBe(true);
    expect(words.some(word => ["of", "the", "nonexistentxyz"].includes(word.en))).toBe(false);
  });
});
