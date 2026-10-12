import { describe, expect, it } from "vitest";
import { vocabularyIpa } from "@/lib/vocabularyPronunciation";
import { applyPronunciationReference } from "@/lib/server/pronunciationReference";
import { basicWords } from "@/lib/basicVocabulary";
import compact from "@/data/vocabulary-ipa.json";
import full from "@/data/vocabulary-pronunciation.json";
import { parseReference, standardCandidate } from "../scripts/lib/pronunciation-reference.mjs";

describe("learner IPA reference", () => {
  it("fixes reported stress, distinct accents and the sculptor/sculpture error", () => {
    expect(vocabularyIpa("Teacher")).toMatchObject({ us: "/ˈtiːtʃər/", uk: "/ˈtiːtʃə/" });
    expect(vocabularyIpa("tomato")).toMatchObject({ us: "/təˈmeɪtoʊ/", uk: "/təˈmɑːtəʊ/" });
    expect(vocabularyIpa("sculptor")?.uk).toBe("/ˈskʌlptə/");
    expect(vocabularyIpa("authenticity")?.uk).toBe("/ˌɔːθenˈtɪsəti/");
    expect(vocabularyIpa("record")?.uk).toBe("/ˈrekɔːd/");
    expect(vocabularyIpa("buffet")?.us).toBe("/bəˈfeɪ/");
    expect(vocabularyIpa("discount")?.us).toBe("/ˈdɪskaʊnt/");
    expect(vocabularyIpa("public transport")?.uk).toBe("/ˌpʌblɪk ˈtrænspɔːt/");
    expect(vocabularyIpa("blind man's bluff")?.us).toContain("mænz");
    expect(vocabularyIpa("sale")?.uk).toBe("/seɪl/");
  });
  it("keeps every course headword covered or explicitly held, with matching server/mobile data", () => {
    expect(Object.keys(compact.entries)).toHaveLength(943);
    for (const word of basicWords) {
      const item = vocabularyIpa(word.en)!;
      expect(item).toBeDefined();
      if (item.needsReview) { expect(word.ipa).toBe(""); continue; }
      for (const accent of ["us", "uk"] as const) {
        expect(item[accent]).toMatch(/^\/[^/]+\/$/);
        expect(item[accent]).not.toMatch(/[A-Z'’\u0000-\u001f\ufffd]/);
        const reference = full.entries[word.en.toLowerCase() as keyof typeof full.entries];
        expect("us" in reference && reference[accent]?.ipa).toBe(item[accent]);
      }
    }
  });
  it("overrides model notation without changing audio URLs or pretending a missing recording exists", () => {
    const out = applyPronunciationReference("teacher", { found: true, us: { ipa: "/tˈitʃər/", audio: "https://storage.test/us.wav", synthetic: true } });
    expect(out?.us).toMatchObject({ ipa: "/ˈtiːtʃər/", audio: "https://storage.test/us.wav", synthetic: true });
    expect(out?.uk?.ipa).toBe("/ˈtiːtʃə/");
    expect(out?.uk?.audio).toBeUndefined();
  });
  it("respects later IPA edits attached to a manually uploaded recording", () => {
    const out = applyPronunciationReference("teacher", { found: true, us: { ipa: "/ˈtiːtʃɚ/", reviewStatus: "editor-upload", audio: "manual.wav" } });
    expect(out?.us).toMatchObject({ ipa: "/ˈtiːtʃɚ/", audio: "manual.wav" });
    expect(out?.uk?.ipa).toBe("/ˈtiːtʃə/");
  });
  it("does not expose guessed names or fall back to their source-PDF IPA", () => {
    expect(applyPronunciationReference("Hue Festival", { found: true, audio: "wrong.wav", ipa: "/hjuː/" })).toMatchObject({ found: false, needsReview: true });
    expect(applyPronunciationReference("Hue Festival")?.audio).toBeUndefined();
    expect(vocabularyIpa("Hue Festival")).toEqual({ needsReview: true });
    expect(applyPronunciationReference("uncatalogued")).toBeNull();
  });
});

describe("reference parser", () => {
  it("keeps country context and homograph sections, ignoring other languages", () => {
    const result = parseReference({ title: "sample", revisions: [{ revid: 1, slots: { main: { content: "==English==\n===Pronunciation===\n* {{a|en|GA}}\n** {{IPA|en|/wɑtɚ/|a=cot-caught}}\n*** {{audio|en|En-us-water.ogg|a=US}}\n===Noun===\ntext\n==French==\n===Pronunciation===\n* {{IPA|fr|/other/}}" } } }] });
    expect(result.ipa).toHaveLength(1);
    expect(result.ipa[0]).toMatchObject({ us: true, uk: false, section: 0 });
    expect(result.audio[0]).toMatchObject({ us: true, section: 0 });
  });
  it("does not relabel foreign/regional accents as standard US/UK", () => {
    expect(standardCandidate({ us: false, uk: false, labels: "AU" }, "uk")).toBe(false);
    expect(standardCandidate({ us: false, uk: true, labels: "UK,Scotland" }, "uk")).toBe(false);
    expect(standardCandidate({ us: false, uk: false, labels: "wine-whine" }, "us")).toBe(true);
  });
  it("does not inherit UK from a mixed IPA group for a US or Canadian recording", () => {
    const result = parseReference({ title: "project", revisions: [{ revid: 1, slots: { main: { content: "==English==\n===Pronunciation===\n* {{enPR|x|a=RP,GA,Canada}} {{IPA|en|/pɹəˈdʒɛkt/}}\n** {{audio|en|En-us-project.ogg|a=California}}\n** {{audio|en|en-ca-project-verb.ogg|a=Canada}}\n* {{audio|en|en-us-pineapple.ogg|a=US|IPA=/ˈpaɪnˌæpəl/}}\n===Noun===\n" } } }] });
    expect(result.audio[0]).toMatchObject({ us: true, uk: false });
    expect(result.audio[1]).toMatchObject({ us: false, uk: false });
    expect(result.audio[2].ipa).toEqual(["/ˈpaɪnˌæpəl/"]);
  });
});
