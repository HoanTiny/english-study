// Builds a versioned learner-facing reference; never formats Kokoro tokens as IPA.
import { readFile, writeFile } from "node:fs/promises";
import { normalizeWord, parseReference, standardCandidate, cleanReferenceIpa, comparablePhones } from "./lib/pronunciation-reference.mjs";
import { buildLexicon, resolvePhonemes, dictionaryCorrections } from "./lib/kokoro-phonetics.mjs";
import { distance } from "./lib/audio-review.mjs";

const cache = ".audio-cache/ipa-review";
const wiki = JSON.parse(await readFile(`${cache}/wiki-pages.json`, "utf8"));
const course = JSON.parse(await readFile("src/data/basic-vocabulary.json", "utf8"));
const parsed = Object.fromEntries(Object.entries(wiki.pages).map(([key, page]) => [key, parseReference(page)]));
const editorial = {};
for (const line of (await readFile("data/pronunciation-overrides.tsv", "utf8")).split(/\r?\n/).filter(x => x && !x.startsWith("#"))) {
  const [word, us, uk] = line.split("\t");
  if (editorial[word]) throw new Error(`Duplicate IPA override: ${word}`);
  if ((!us && !uk) || /[A-Z/]/.test((us || "") + (uk || ""))) throw new Error(`Invalid IPA override: ${word}`);
  editorial[word] = { us, uk };
}
const lexicons = {};
for (const [accent, prefix] of [["us", "us"], ["uk", "gb"]]) lexicons[accent] = buildLexicon(
  JSON.parse(await readFile(`.audio-cache/lexicon/${prefix}_gold.json`, "utf8")),
  JSON.parse(await readFile(`.audio-cache/lexicon/${prefix}_silver.json`, "utf8")),
);
// Sense choices were checked against the Vietnamese course glosses.
const sense = { mother: 0, son: 0, buffet: 0, beer: 0, pho: 0, beat: 0, piano: 0, concert: 1, cashier: 0, hanger: 0, art: 0, record: 0, house: 0, bear: 0, wreath: 0, singer: 0, vaccine: 0, abstract: 0, email: 0 };
const memo = new Map();
function lookup(word, accent, depth = 0) {
  const key = `${word}|${accent}`;
  if (memo.has(key)) return memo.get(key);
  if (depth > 6) return null;
  const model = resolvePhonemes(word, accent, lexicons[accent]);
  if (model.error) return null; // Unverified names must not inherit unrelated English readings.
  const page = parsed[wiki.redirects[word] || word];
  const source = page?.revision ? `https://en.wiktionary.org/w/index.php?title=${encodeURIComponent(page.title)}&oldid=${page.revision}#English` : "https://github.com/hexgrad/misaki";
  let result;
  if (editorial[word]?.[accent]) result = { ipa: `/${editorial[word][accent]}/`, method: "editorial", sources: [source] };
  else if (dictionaryCorrections[word]) result = { ipa: model.ipa, method: "dictionary-correction", sources: [model.source] };
  else {
    const candidates = (page?.ipa || []).filter(x => standardCandidate(x, accent) && (sense[word] === undefined || sense[word] === x.section))
      .map(x => ({ ...x, delta: distance([...comparablePhones(x.value)], [...comparablePhones(model.phonemes)]) }))
      .sort((a, b) => a.delta - b.delta || Number(!a[accent]) - Number(!b[accent]));
    const selected = candidates[0];
    if (selected) result = { ipa: cleanReferenceIpa(selected.value, accent), method: "wiktionary", sources: [source], referenceLabels: selected.labels, comparisonEdits: selected.delta };
  }
  if (!result && /[ -]/.test(word)) {
    const parts = word.split(/[ -]+/).map(part => lookup(part, accent, depth + 1));
    if (parts.every(Boolean)) result = { ipa: `/${parts.map(p => p.ipa.slice(1, -1)).join(" ")}/`, method: "components", sources: [...new Set(parts.flatMap(p => p.sources))] };
  }
  if (result) memo.set(key, result);
  return result || null;
}
const entries = {};
for (const word of [...new Set(course.lessons.flatMap(l => l.words).map(w => normalizeWord(w.en)))]) {
  const us = lookup(word, "us"), uk = lookup(word, "uk");
  entries[word] = { ...(us ? { us } : {}), ...(uk ? { uk } : {}), ...(!us || !uk ? { needsReview: true } : {}) };
}
const missing = Object.entries(entries).flatMap(([word, item]) => ["us", "uk"].filter(a => !item[a]).map(accent => ({ word, accent })));
const report = { version: "2026-10-12.1", sourceNotice: "Wiktionary contributors (CC BY-SA 4.0), dictionary corrections and editorial citation forms. Component transcriptions are word-by-word, not a connected-speech transcription. IPA review is not acoustic approval.", entries };
await writeFile(`${cache}/reference-draft.json`, JSON.stringify(report, null, 2) + "\n");
await writeFile(`${cache}/reference-missing.json`, JSON.stringify(missing, null, 2));
console.log(JSON.stringify({ words: Object.keys(entries).length, complete: Object.values(entries).filter(x => x.us && x.uk).length, missing }));
if (process.argv.includes("--write")) {
  await writeFile("src/data/vocabulary-pronunciation.json", JSON.stringify(report, null, 2) + "\n");
  // Keep citation histories out of the mobile lesson bundle.
  await writeFile("src/data/vocabulary-ipa.json", JSON.stringify({ version: report.version, entries: Object.fromEntries(Object.entries(entries).map(([word, value]) => [word, {
    ...(value.us ? { us: value.us.ipa } : {}), ...(value.uk ? { uk: value.uk.ipa } : {}), ...(value.needsReview ? { needsReview: true } : {}),
  }])) }, null, 2) + "\n");
}
