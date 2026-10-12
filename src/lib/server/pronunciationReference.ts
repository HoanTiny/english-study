import reference from "@/data/vocabulary-pronunciation.json";
import type { Pronounce } from "@/lib/pronounce";

type Reference = { us?: { ipa: string; sources: string[] }; uk?: { ipa: string; sources: string[] }; needsReview?: boolean };
const entries: Record<string, Reference> = reference.entries;
export function applyPronunciationReference(word: string, result?: Pronounce | null): Pronounce | null {
  const item = entries[word.trim().toLowerCase().replace(/’/g, "'").replace(/\s+/g, " ")];
  if (!item) return result || null;
  // No generic dictionary or device guess for a Vietnamese name such as Hue.
  if (item.needsReview) return { found: false, word, needsReview: true, pronunciationRevision: reference.version };
  const output: Pronounce = { ...result, found: true, word, pronunciationRevision: reference.version };
  for (const accent of ["us", "uk"] as const) {
    if (result?.[accent]?.reviewStatus === "editor-upload" && result[accent]?.ipa) continue;
    if (item[accent]) output[accent] = { ...result?.[accent], ipa: item[accent].ipa, ipaSources: item[accent].sources };
  }
  output.ipa = output.us?.ipa || output.uk?.ipa;
  output.audio = output.us?.audio || output.uk?.audio;
  return output;
}
