// Wiktionary text is reference data, never executable instructions.
export const normalizeWord = text => text.toLowerCase().replace(/’/g, "'").trim().replace(/\s+/g, " ");
export function englishSection(text) {
  return text.split(/^==English==\s*$/m)[1]?.split(/^==[^=]+==\s*$/m)[0] || "";
}
function templates(line, name) {
  // These templates contain optional nested accent links, so split only top-level pipes.
  const found = [];
  for (let start = 0; (start = line.indexOf(`{{${name}|`, start)) >= 0;) {
    let braces = 0, links = 0, piece = "", args = [];
    for (let i = start + 2; i < line.length; i++) {
      const pair = line.slice(i, i + 2);
      if (pair === "{{") { braces++; piece += pair; i++; }
      else if (pair === "}}" && braces) { braces--; piece += pair; i++; }
      else if (pair === "}}") { args.push(piece); found.push(args); start = i + 2; break; }
      else if (pair === "[[") { links++; piece += pair; i++; }
      else if (pair === "]]") { links--; piece += pair; i++; }
      else if (line[i] === "|" && braces === 0 && links === 0) { args.push(piece); piece = ""; }
      else piece += line[i];
      if (i === line.length - 1) start = line.length;
    }
  }
  return found;
}
export function accentLabels(text) {
  const us = /\b(?:US|USA|GA|GenAm|General American|American|North America|California)\b/i.test(text);
  const uk = /\b(?:UK|RP|Received Pronunciation|British|England|SSB)\b/i.test(text);
  // Do not classify generic rhotic/non-rhotic or other countries as US/UK.
  return { us, uk };
}
export function standardCandidate(candidate, accent) {
  if (/Scotland|Ireland|Northern England|Lancashire|Cockney|MLE|Estuary|th-fronting|dated|obsolete|dialect|Southern US|NYC|New York|Baltimore|Philadelphia|Pittsburgh/i.test(candidate.labels)) return false;
  if (candidate[accent]) return true;
  // Merger labels without a country are shared pronunciation variants.
  return !candidate.labels || /^(?:non-)?(?:wine-whine|weak vowel|cot-caught|father-bother|Mary-marry-merry|Mmmm|nMmmm)(?:,(?:non-)?(?:wine-whine|weak vowel|cot-caught|father-bother|Mary-marry-merry|Mmmm|nMmmm))*$/i.test(candidate.labels);
}
export function cleanReferenceIpa(value, accent) {
  let text = value.replace(/^\/|\/$/g, "").replace(/[͜͡.]/g, "").replace(/ɹ/g, "r").replace(/ʧ/g, "tʃ").replace(/ʤ/g, "dʒ").replace(/ɫ/g, "l").replace(/ɚ/g, "ər").replace(/ɝ/g, "ɜr");
  // Optional linking r is absent in citation-form UK and present in rhotic US.
  text = text.replace(/\(r\)/g, accent === "uk" ? "" : "r");
  // Other optional segments denote real variants: preserve them, never expand blindly.
  return `/${text}/`;
}
export function parseReference(page) {
  const english = englishSection(page?.revisions?.[0]?.slots?.main?.content || "");
  const sections = [...english.matchAll(/={3,}Pronunciation(?: \d+)?={3,}([\s\S]*?)(?=\n={3,}[^=]|$)/g)];
  const ipa = [], audio = [];
  for (let section = 0; section < sections.length; section++) {
    const parents = [];
    let nearest = [];
    for (const line of sections[section][1].split("\n")) {
      const depth = line.match(/^\*+/)?.[0].length || 0;
      if (depth) parents.length = depth;
      const ownLabels = [...templates(line, "a").flatMap(t => t.slice(2)), ...templates(line, "enPR").flatMap(t => t.filter(x => /^a\d*=/.test(x)).map(x => x.split("=").slice(1).join("=")))].join(",");
      const parentLabels = parents.filter(Boolean).join(",");
      if (depth && ownLabels) parents[depth] = ownLabels;
      const current = [];
      for (const t of templates(line, "IPA")) {
        if (t[1] !== "en") continue;
        const labels = [parentLabels, ownLabels, ...t.filter(x => /^a\d*=/.test(x)).map(x => x.split("=").slice(1).join("="))].filter(Boolean).join(",");
        for (const value of t.slice(2).filter(x => /^\/[^/]+\/$/.test(x))) {
          if (value.includes("-") || value.includes("~")) continue; // Abbreviated variants cannot stand alone.
          const candidate = { value, labels, ...accentLabels(labels), section };
          ipa.push(candidate); current.push(candidate);
        }
      }
      if (current.length) nearest = current;
      for (const t of templates(line, "audio")) {
        if (t[1] !== "en" || !t[2]) continue;
        // A recording's own country label takes priority over surrounding IPA variants.
        const ownAudioLabels = t.filter(x => /^a\d*=/.test(x)).map(x => x.split("=").slice(1).join("="));
        const labels = ownAudioLabels.length ? ownAudioLabels.join(",") : [parentLabels, ownLabels].filter(Boolean).join(",");
        let labelled = accentLabels(labels);
        const fileAccent = t[2].match(/^en-(us|uk|ca|au|nz)-/i)?.[1].toLowerCase();
        if (fileAccent) labelled = { us: fileAccent === "us", uk: fileAccent === "uk" };
        const explicitIpa = t.filter(x => /^IPA=\/.+\/$/.test(x)).map(x => x.slice(4));
        audio.push({ file: t[2], labels, ...labelled, section, ipa: explicitIpa.length ? explicitIpa : nearest.map(x => x.value) });
      }
    }
  }
  return { title: page.title, revision: page.revisions?.[0]?.revid, ipa, audio, sections: sections.length };
}

/** A deliberately broad comparison for selecting variants; not a displayed IPA. */
export function comparablePhones(ipa) {
  const expansion = { A: "eɪ", I: "aɪ", O: "oʊ", Q: "əʊ", W: "aʊ", Y: "ɔɪ", T: "t", "ᵊ": "ə", "ʧ": "tʃ", "ʤ": "dʒ", "ɹ": "r", "ɚ": "ər", "ɝ": "ər", "ɜ": "ə", "ɡ": "g", "ɫ": "l", "ɾ": "t", "ɛ": "e", "ɐ": "ə", "ʌ": "ə" };
  return [...ipa].map(c => expansion[c] || c).join("").replace(/[ˈˌːˑ/ .()̩͜͡]/g, "");
}
