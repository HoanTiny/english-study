import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

export const REVIEW_MODEL = "proclivitystudios/vitouphy-wav2vec2-xls-r-300m-timit-phoneme-ONNX";
export const REVIEW_NOTE = "Automatic phoneme screening, not human listening approval. TIMIT merges vowel distinctions and does not check stress, accent or naturalness.";
export function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < b.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (a[i] === b[j] ? 0 : 1)));
    row = next;
  }
  return row[b.length];
}
export function readPcmWav(bytes) {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.readUInt16LE(20) !== 1 || bytes.readUInt16LE(22) !== 1 || bytes.readUInt16LE(34) !== 16) throw new Error("Expected mono PCM16 WAV");
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const size = bytes.readUInt32LE(offset + 4);
    if (bytes.toString("ascii", offset, offset + 4) === "data") {
      if (offset + 8 + size > bytes.length) throw new Error("Truncated WAV");
      return { rate: bytes.readUInt32LE(24), audio: Float32Array.from({ length: size / 2 }, (_, i) => bytes.readInt16LE(offset + 8 + i * 2) / 32768) };
    }
    offset += 8 + size + size % 2;
  }
  throw new Error("Missing WAV data");
}
// Windowed-sinc resampling, rather than dropping samples (which aliases consonants).
function resample(input, sourceRate) {
  const ratio = sourceRate / 16000, radius = 16, cutoff = Math.min(1, 1 / ratio) * .95;
  const output = new Float32Array(Math.floor(input.length / ratio));
  const kernels = new Map();
  for (let i = 0; i < output.length; i++) {
    const at = i * ratio, center = Math.floor(at), phase = Number((at - center).toFixed(6));
    if (!kernels.has(phase)) kernels.set(phase, Array.from({ length: radius * 2 }, (_, j) => {
      const x = j - radius + 1 - phase, a = Math.PI * x * cutoff;
      return (a === 0 ? 1 : Math.sin(a) / a) * cutoff * (.5 + .5 * Math.cos(Math.PI * x / radius));
    }));
    const kernel = kernels.get(phase); let sum = 0, norm = 0;
    for (let j = 0; j < kernel.length; j++) {
      const index = center + j - radius + 1;
      if (index >= 0 && index < input.length) { sum += input[index] * kernel[j]; norm += kernel[j]; }
    }
    output[i] = sum / norm;
  }
  return output;
}
export async function createPhonemeReviewer(root) {
  const cache = resolve(root, ".audio-cache/phonetic-review");
  const model = await readFile(resolve(cache, "model_quantized.onnx"));
  if (createHash("sha256").update(model).digest("hex") !== "6e4db638b07c60c9fb9523b32e33f9b251f21449bbce98cc5cfef8148cfea32a") throw new Error("Review model checksum mismatch");
  const runtime = createRequire(resolve(root, ".next-ui-qa/kokoro-runtime/package.json"));
  const ort = createRequire(createRequire(runtime.resolve("kokoro-js")).resolve("@huggingface/transformers"))("onnxruntime-node");
  const session = await ort.InferenceSession.create(model, { executionProviders: ["cpu"], intraOpNumThreads: 4, interOpNumThreads: 1 });
  const vocab = JSON.parse(await readFile(resolve(cache, "vocab.json"), "utf8"));
  const inverse = Object.fromEntries(Object.entries(vocab).map(([token, id]) => [id, token]));
  const symbols = Object.keys(vocab).filter(x => x !== " " && !x.startsWith("[")).sort((a, b) => b.length - a.length);
  function targets(input) {
    const expansion = { A: "eɪ", I: "aɪ", O: "oʊ", Q: "oʊ", W: "aʊ", Y: "ɔɪ", T: "ɾ", "ᵊ": "ə", "ɡ": "g", r: "ɹ", "ɚ": "ɝ", "ɜ": "ɝ" };
    let ipa = [...input].map(c => expansion[c] || c).join("").replace(/[ˈˌː .]/g, "").replace(/[ɒɔ]/g, "ɑ").replace(/ʌ/g, "ə").replace(/əɹ/g, "ɝ").replace(/a/g, "æ").replace(/æɪ/g, "aɪ").replace(/æʊ/g, "aʊ");
    const tokens = [];
    while (ipa.length) { const token = symbols.find(x => ipa.startsWith(x)) || ipa[0]; tokens.push(token); ipa = ipa.slice(token.length); }
    return tokens;
  }
  return {
    close: () => session.release(),
    async review(samples, rate, phonemes) {
      const source = rate === 16000 ? samples : resample(samples, rate);
      const audio = new Float32Array(source.length + 3200); audio.set(source, 1600);
      let mean = 0, variance = 0;
      for (const x of audio) mean += x / audio.length;
      for (const x of audio) variance += (x - mean) ** 2 / audio.length;
      for (let i = 0; i < audio.length; i++) audio[i] = (audio[i] - mean) / Math.sqrt(variance + 1e-7);
      const result = await session.run({ input_values: new ort.Tensor("float32", audio, [1, audio.length]) });
      const logits = result[session.outputNames[0]], size = logits.dims.at(-1), phones = [];
      let last = -1;
      for (let frame = 0; frame < logits.data.length / size; frame++) {
        let id = 0;
        for (let j = 1; j < size; j++) if (logits.data[frame * size + j] > logits.data[frame * size + id]) id = j;
        if (id !== last && id !== 41 && inverse[id]?.trim() && !["|", "[UNK]"].includes(inverse[id])) phones.push(inverse[id]);
        last = id;
      }
      const expected = targets(phonemes);
      return { expected: expected.join(" "), detected: phones.join(" "), edits: distance(expected, phones), targetLength: expected.length };
    },
  };
}

/** Extract only when three separate utterances have unambiguous silence boundaries. */
export function middleRepetition(audio, rate) {
  const frame = Math.round(rate * .01), levels = [];
  for (let i = 0; i < audio.length; i += frame) {
    let sum = 0; for (let j = i; j < Math.min(i + frame, audio.length); j++) sum += audio[j] ** 2;
    levels.push(Math.sqrt(sum / frame));
  }
  const threshold = Math.max(.002, Math.max(...levels) * .025), gaps = [];
  let start = -1;
  for (let i = 0; i <= levels.length; i++) {
    if (i < levels.length && levels[i] < threshold) { if (start < 0) start = i; }
    else if (start >= 0) { if (start > 0 && i < levels.length && i - start >= 18) gaps.push({ start: start * frame, end: i * frame }); start = -1; }
  }
  if (gaps.length !== 2) throw new Error(`Cannot safely isolate repeated word (${gaps.length} boundaries)`);
  const left = Math.round((gaps[0].start + gaps[0].end) / 2), right = Math.round((gaps[1].start + gaps[1].end) / 2);
  if ((right - left) / rate < .3) throw new Error("Isolated word is too short");
  return { audio: audio.slice(left, right), segment: { start: left / rate, end: right / rate } };
}
