import { expect, it } from "vitest";
import { encodeWave } from "@/lib/recordedAudio";

it("encodes mono signed 16-bit PCM with a valid 16 kHz WAV header", async () => {
  const wav = encodeWave([new Float32Array([-2, -1, 0, 1, 2])], 16000);
  const buffer = await wav.arrayBuffer(); const view = new DataView(buffer);
  expect(wav.type).toBe("audio/wav");
  expect(new TextDecoder().decode(buffer.slice(0, 4))).toBe("RIFF");
  expect(new TextDecoder().decode(buffer.slice(8, 12))).toBe("WAVE");
  expect(view.getUint32(4, true)).toBe(buffer.byteLength - 8);
  expect(view.getUint16(20, true)).toBe(1); expect(view.getUint16(22, true)).toBe(1);
  expect(view.getUint32(24, true)).toBe(16000); expect(view.getUint32(28, true)).toBe(32000);
  expect(view.getUint16(34, true)).toBe(16); expect(view.getUint32(40, true)).toBe(10);
  expect(Array.from({ length: 5 }, (_, i) => view.getInt16(44 + i * 2, true))).toEqual([-32768, -32768, 0, 32767, 32767]);
});
it("mixes stereo into mono rather than interleaving or doubling the duration", async () => {
  const wav = encodeWave([new Float32Array([1, 1]), new Float32Array([-1, 0])], 16000);
  const view = new DataView(await wav.arrayBuffer());
  expect(view.byteLength).toBe(48); expect(view.getInt16(44, true)).toBe(0);
  expect(view.getInt16(46, true)).toBe(16384);
});
