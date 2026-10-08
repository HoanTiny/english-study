import { expect, it } from "vitest";
import { MAX_SUBTITLE_BYTES, parseSubtitles, parseYouTubeId, readTranscript, storeTranscript, deleteTranscript, validateSegments } from "@/lib/transcript";

it("preserves SRT cue boundaries, Unicode, multiline text and milliseconds", () => {
  const result = parseSubtitles('\uFEFF1\r\n00:01:02,250 --> 00:01:05,750\r\nHello &amp; <b>welcome</b>.\r\nWe’re here.\r\n\r\n2\r\n00:01:07,000 --> 00:01:08,500\r\nLet&#39;s go!');
  expect(result.format).toBe("srt"); expect(result.estimatedLastEnd).toBe(false);
  expect(result.segments).toEqual([{ text: "Hello & welcome. We’re here.", start: 62.25, dur: 3.5 }, { text: "Let's go!", start: 67, dur: 1.5 }]);
});
it("imports WebVTT cue IDs/settings and ignores metadata blocks", () => {
  const result = parseSubtitles('WEBVTT\nKind: captions\nLanguage: en\n\nNOTE Generated\nA note\n\nSTYLE\n::cue { color: red; }\n\nREGION\nid:region1\n\none\n01:02.250 --> 01:04.500 align:start position:0%\n<v Speaker><c.green>Hello</c> <00:01:03.000>world.');
  expect(result.format).toBe("vtt"); expect(result.segments).toEqual([{ text: "Hello world.", start: 62.25, dur: 2.25 }]);
});
it("accepts pasted YouTube timestamps on separate or shared lines and flags the estimated final end", () => {
  const result = parseSubtitles('0:03\nHello everyone.\nWelcome back.\n0:08 Let’s start.\n1:02:04\nLast sentence.');
  expect(result.estimatedLastEnd).toBe(true);
  expect(result.segments[0]).toEqual({ text: "Hello everyone. Welcome back.", start: 3, dur: 5 });
  expect(result.segments.at(-1)?.start).toBe(3724);
});
it.each([
  "No timestamps at all.", "0:00\n", "0:05\nHi\n0:02\nBackwards", "0:05\nHi\n0:05\nDuplicate time",
  "1\n00:00:03,000 --> 00:00:02,000\nBackwards", "1\n00:65:03,000 --> 00:65:06,000\nInvalid",
  "1\n00:00:03,000 --> 00:00:05,000\nFirst\n2\n00:00:05,000 --> 00:00:07,000\nMissing separator",
  "0:00\n" + "a".repeat(MAX_SUBTITLE_BYTES),
])("rejects malformed/untimed/oversized subtitles without making up an alignment", text => {
  expect(() => parseSubtitles(text)).toThrow();
});
it("validates supported YouTube hosts and IDs without accepting unrelated URLs", () => {
  for (const value of ["JnHNiJyBwvY", "https://youtu.be/JnHNiJyBwvY?t=3", "https://www.youtube.com/watch?v=JnHNiJyBwvY", "https://m.youtube.com/shorts/JnHNiJyBwvY", "https://www.youtube-nocookie.com/embed/JnHNiJyBwvY"]) expect(parseYouTubeId(value)).toBe("JnHNiJyBwvY");
  for (const value of ["https://evil.test/watch?v=JnHNiJyBwvY", "https://youtube.com.evil.test/watch?v=JnHNiJyBwvY", "https://user:secret@youtube.com/watch?v=JnHNiJyBwvY", "https://youtu.be/too-short", "https://youtube.com/watch?v=JnHNiJyBwvYextra"]) expect(parseYouTubeId(value)).toBeNull();
});
it("rejects non-finite, negative or empty API segments", () => {
  for (const data of [[], [{ text: "Hello", start: -1, dur: 1 }], [{ text: "Hello", start: 0, dur: Infinity }], [{ text: "", start: 0, dur: 1 }]]) expect(() => validateSegments(data)).toThrow();
});
it("restores imported captions only for the same user and video, and supports deleting them", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const data = { videoId: "JnHNiJyBwvY", label: "Phụ đề SRT", estimatedLastEnd: false, segments: [{ text: "Hello", start: 2, dur: 3 }] };
  expect(storeTranscript(storage, "a", data)).toBe(true);
  expect(readTranscript(storage, "a", data.videoId)).toEqual(data);
  expect(readTranscript(storage, "b", data.videoId)).toBeNull(); expect(readTranscript(storage, "a", "different")).toBeNull();
  deleteTranscript(storage, "a", data.videoId); expect(readTranscript(storage, "a", data.videoId)).toBeNull();
  expect(storeTranscript({ setItem: () => { throw new Error("quota"); } }, "a", data)).toBe(false);
  expect(readTranscript({ getItem: () => "broken" }, "a", data.videoId)).toBeNull();
});
