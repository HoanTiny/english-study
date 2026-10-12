import { describe, expect, it } from "vitest";
import { buildLexicon, resolvePhonemes, phonemesToIpa, prepareWaveform, pcmWav } from "../scripts/lib/kokoro-phonetics.mjs";

describe("bulk Kokoro phonetics", () => {
  const empty = new Map();
  it("uses the reviewed dictionary phonemes for the three reported words", () => {
    for (const accent of ["us", "uk"]) {
      expect(resolvePhonemes("husband", accent, empty).phonemes).toBe("hˈʌzbənd");
      expect(resolvePhonemes("triplet", accent, empty).phonemes).toBe("tɹˈɪplət");
    }
    expect(resolvePhonemes("aunt", "uk", empty).ipa).toBe("/ɑːnt/");
    expect(resolvePhonemes("aunt", "us", empty).ipa).toBe("/ænt/");
  });
  it("does not confuse missing words with the literal dictionary entry undefined", () => {
    const lex = buildLexicon({ undefined: "bad", known: "nOn" }, {});
    expect(resolvePhonemes("missing", "us", lex).phonemes).toBeUndefined();
    expect(resolvePhonemes("missing", "us", lex).error).toBeTruthy();
  });
  it("chooses the noun sense of record, but holds unreviewed ambiguous entries", () => {
    const lex = buildLexicon({ record: { DEFAULT: "noun", VERB: "verb" }, close: { DEFAULT: "adj", VERB: "verb" } }, {});
    expect(resolvePhonemes("record", "us", lex).phonemes).toBe("noun");
    expect(resolvePhonemes("close", "us", lex).error).toContain("từ loại");
  });
  it("prefers gold and handles possessive/plural suffix voicing", () => {
    const lex = buildLexicon({ cat: "kæt", hobby: "hɑbi", child: "ʧIld", children: "ʧɪldɹən" }, { cat: "wrong" });
    expect(resolvePhonemes("CAT", "us", lex).phonemes).toBe("kæt");
    expect(resolvePhonemes("cat's", "us", lex).phonemes).toBe("kæts");
    expect(resolvePhonemes("children's", "us", lex).phonemes).toBe("ʧɪldɹənz");
    expect(resolvePhonemes("hobbies", "us", lex).phonemes).toBe("hɑbiz");
  });
  it("holds Vietnamese names even when an unrelated English word has the same spelling", () => {
    expect(resolvePhonemes("Hue Festival", "uk", buildLexicon({ hue: "hju", festival: "fɛstɪvəl" }, {})).error).toBeTruthy();
  });
  it("allows reviewed dictionary loanwords while holding other names", () => {
    expect(resolvePhonemes("banh mi", "us", empty).ipa).toBe("/ˌbɑːn ˈmiː/");
    expect(resolvePhonemes("banh tet", "us", empty).error).toBeTruthy();
    expect(resolvePhonemes("mancala", "uk", empty).source).toContain("collinsdictionary");
    expect(resolvePhonemes("mancala", "us", empty).source).toContain("merriam-webster");
    const lex = buildLexicon({ holiday: "hˈɒlɪdA" }, {});
    expect(resolvePhonemes("Tet holiday", "uk", lex).phonemes).toBe("tˈɛt hˈɒlɪdA");
  });
  it("expands native model symbols to readable IPA", () => {
    expect(phonemesToIpa("ʧˈIzᵊn" )).toBe("/tʃˈaɪzən/");
  });
  it("supports the course loanwords without silently stripping their accents", () => {
    expect(resolvePhonemes("sauté", "us", empty).ipa).toBe("/soʊˈteɪ/");
    expect(resolvePhonemes("sautéing", "uk", empty).phonemes).toBe("sˈQtAɪŋ");
  });
  it("rejects silence/NaNs and writes playable PCM with bounded volume", () => {
    expect(() => prepareWaveform(new Float32Array(24000))).toThrow();
    expect(() => prepareWaveform(new Float32Array([NaN]))).toThrow();
    const source = Float32Array.from({ length: 24000 }, (_, i) => i < 6000 || i > 18000 ? 0 : Math.sin(i / 8) * .6);
    const result = prepareWaveform(source);
    expect(result.checks.peak).toBeLessThanOrEqual(.8);
    expect(result.checks.duration).toBeGreaterThan(.5);
    const wav = pcmWav(result.audio);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.readUInt32LE(40)).toBe(result.audio.length * 2);
  });
});
