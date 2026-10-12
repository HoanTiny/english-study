export type WordPicture = { image: string; title?: string };
export type WordImageResult = { found: boolean; results: WordPicture[] };

export function wordImageKey(word: string, meaning = ""): string {
  return `${word.trim().toLowerCase().replace(/\s+/g, " ")}|${meaning.trim().toLowerCase().replace(/\s+/g, " ")}`;
}
