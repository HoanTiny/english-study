/** Encode signed 16-bit mono PCM. Averaging channels also handles stereo microphones. */
export function encodeWave(channels: Float32Array[], sampleRate: number): Blob {
  const length = channels[0]?.length ?? 0;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  tag(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true);
  tag(8, "WAVE"); tag(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, "data"); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const average = channels.reduce((sum, channel) => sum + channel[i], 0) / channels.length;
    const sample = Math.max(-1, Math.min(1, average));
    view.setInt16(44 + i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** decodeAudioData resamples to the context's 16 kHz rate before WAV encoding. */
export async function recordingToWave(blob: Blob): Promise<Blob> {
  const context = new OfflineAudioContext(1, 1, 16000);
  const decoded = await context.decodeAudioData(await blob.arrayBuffer());
  if (decoded.duration < 0.3) throw new Error("Bản thu quá ngắn. Hãy nói rõ từ hoặc câu rồi bấm Dừng và chấm.");
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
  return encodeWave(channels, decoded.sampleRate);
}
