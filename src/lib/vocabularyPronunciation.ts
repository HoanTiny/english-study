import reference from "@/data/vocabulary-ipa.json";

export type VocabularyIpa = { us?: string; uk?: string; needsReview?: boolean };
const entries: Record<string, VocabularyIpa> = reference.entries;
export const pronunciationRevision = reference.version;
export function vocabularyIpa(word: string): VocabularyIpa | undefined {
  return entries[word.trim().toLowerCase().replace(/’/g, "'").replace(/\s+/g, " ")];
}
