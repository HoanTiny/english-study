// Build the course from the user-supplied PDF extraction. No network / AI calls.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = JSON.parse(readFileSync("data/basic-vocabulary-pdf.json", "utf8"));
assert.equal(source.topics.length, 50);
const lessons = [];
for (const topic of source.topics) {
  const parts = Math.ceil(topic.words.length / 20);
  for (let offset = 0; offset < topic.words.length; offset += 20) {
    const part = offset / 20 + 1;
    const words = topic.words.slice(offset, offset + 20).map(word => {
      assert.ok(word.en.trim() && word.vi.trim(), "Empty source word or meaning");
      assert.match(word.ipa, /^\/[^/]+\/$/, `Missing IPA: ${word.en}`);
      assert.ok(!/[\u0000-\u001f\ufffd]/.test(word.en + word.vi + word.ipa), `Invalid glyph: ${word.en}`);
      // Preserve source spelling, meaning, IPA and repeated entries in their topics.
      // The PDF does not assign CEFR or parts of speech, so neither is inferred.
      return { ...word, cefr: "Theo chủ đề" };
    });
    lessons.push({
      id: `pdf-${String(topic.number).padStart(2, "0")}-${part}`,
      number: lessons.length + 1,
      topicNumber: topic.number,
      topic: topic.title,
      title: topic.title + (parts > 1 ? ` · Phần ${part}/${parts}` : ""),
      words,
    });
  }
}
const words = lessons.flatMap(lesson => lesson.words);
assert.equal(words.length, 1046);
writeFileSync("src/data/basic-vocabulary.json", JSON.stringify({
  source: source.source,
  sourceFile: source.sourceFile,
  sourceSha256: source.sourceSha256,
  topicCount: source.topics.length,
  entryCount: words.length,
  uniqueHeadwords: new Set(words.map(word => word.en.toLowerCase())).size,
  lessons,
}, null, 2) + "\n");
console.log(`Built ${lessons.length} lessons / ${words.length} entries with IPA from ${source.topics.length} PDF topics; no AI calls.`);
