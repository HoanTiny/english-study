// Select source-labelled recordings; do not infer their accent from model output.
import { readFile, writeFile } from "node:fs/promises";
import { normalizeWord, parseReference, standardCandidate, comparablePhones } from "./lib/pronunciation-reference.mjs";
import { distance } from "./lib/audio-review.mjs";
const dir = ".audio-cache/ipa-review";
const wiki = JSON.parse(await readFile(`${dir}/wiki-pages.json`, "utf8"));
const reference = JSON.parse(await readFile("src/data/vocabulary-pronunciation.json", "utf8"));
const sense = { mother: 0, son: 0, buffet: 0, beer: 0, pho: 0, beat: 0, piano: 0, concert: 1, cashier: 0, hanger: 0, art: 0, record: 0, house: 0, bear: 0, wreath: 0, singer: 0, vaccine: 0, abstract: 0, email: 0 };
// The page places this noun recording below its verb IPA. The filename identifies the noun.
const fileSense = { project: "LL-Q1860 (eng)-Vealhurl-project (noun).wav" };
function stressIndex(ipa) {
  if (!ipa.includes("ˈ")) return null;
  return (ipa.split("ˈ")[0].match(/[aeiouæɑɐɒɔəɛɜɝɚɪʊʌy]+/g) || []).length;
}
function matchesIpa(source, target) {
  const a = stressIndex(source), b = stressIndex(target);
  if (a !== null && b !== null && a !== b) return false;
  return distance([...comparablePhones(source)], [...comparablePhones(target)]) <= 2;
}
const rows = [];
for (const [word, item] of Object.entries(reference.entries)) {
  if (item.needsReview) continue;
  const page = wiki.pages[wiki.redirects[word] || word];
  if (!page || normalizeWord(page.title) !== word) continue; // No unrelated redirects/case senses.
  const parsed = parseReference(page);
  for (const accent of ["us", "uk"]) {
    const ipa = item[accent]?.ipa;
    const audio = parsed.audio.filter(a => a[accent] && a.us !== a.uk && standardCandidate(a, accent)
      && (sense[word] === undefined || sense[word] === a.section)
      && (fileSense[word] ? a.file === fileSense[word] : a.ipa.some(value => matchesIpa(value, ipa))))
      .sort((a, b) => Number(!new RegExp(`^en-${accent}-`, "i").test(a.file)) - Number(!new RegExp(`^en-${accent}-`, "i").test(b.file)));
    rows.push({ word, accent, selected: { ipa }, title: parsed.title, revision: parsed.revision, audio });
  }
}
await writeFile(`${dir}/reviewed-selections.json`, JSON.stringify(rows, null, 2) + "\n");
console.log(JSON.stringify({ reviewedWords: Object.keys(reference.entries).length, recordingsWithMatchingSource: rows.filter(x => x.audio.length).length }));
