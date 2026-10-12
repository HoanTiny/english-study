import data from "@/data/basic-vocabulary.json";
import legacyWords from "@/data/vocab.json";
import { vocabularyIpa } from "./vocabularyPronunciation";

export type BasicWord = { en: string; vi: string; pos?: string; cefr: string; ipa: string; sourceIpa?: string; page?: number };
export const basicLessons = data.lessons.map(lesson => ({ ...lesson, words: lesson.words.map(word => {
  const reference = vocabularyIpa(word.en);
  return { ...word, sourceIpa: word.ipa, ipa: reference ? reference.us || reference.uk || "" : word.ipa };
}) }));
export const basicWords: BasicWord[] = basicLessons.flatMap(lesson => lesson.words);
export const basicVocabularySource = { name: data.source, file: data.sourceFile, topics: data.topicCount, entries: data.entryCount, uniqueHeadwords: data.uniqueHeadwords };
export const isStandaloneWord = (en: string) => /^\p{L}+(?:[-'’]\p{L}+)*$/u.test(en);
// Legacy single-word glosses remain available for the existing phrase lessons.
// They are not mixed into the PDF course. Every related-word card must have IPA.
const index = new Map<string, BasicWord>();
for (const word of [...legacyWords.map(w => ({ ...w, cefr: "Từ vựng" })), ...basicWords]) {
  if (isStandaloneWord(word.en) && word.ipa) index.set(word.en.toLowerCase(), { ...word, en: word.en.toLowerCase(), ipa: word.ipa });
}
const functionWords = new Set("a an the i you we they he she it my your our their his her its is are am was were be do have can could may will would should must to of in on at by for from with and or but if so as that this these those some any all very much many more most please".split(" "));

/** Only known headwords; never present a guessed translation as lesson content. */
export function wordsFromPhrases(phrases: string[]): BasicWord[] {
  const found = new Map<string, BasicWord>();
  for (const text of phrases) for (const token of text.toLowerCase().match(/\p{L}+(?:[-'’]\p{L}+)*/gu) ?? []) {
    if (functionWords.has(token)) continue;
    const variants = [token];
    if (token.endsWith("ies")) variants.push(token.slice(0, -3) + "y");
    if (token.endsWith("es")) variants.push(token.slice(0, -2));
    if (token.endsWith("s")) variants.push(token.slice(0, -1));
    const word = variants.map(candidate => index.get(candidate)).find(Boolean);
    if (word) found.set(word.en.toLowerCase(), word);
  }
  return [...found.values()];
}
