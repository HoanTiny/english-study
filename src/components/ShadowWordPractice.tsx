"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPronounce, type Pronounce } from "@/lib/pronounce";
import type { PronResult } from "@/lib/pronunciation";
import type { RecordingPhase } from "@/lib/shadowPractice";

export default function ShadowWordPractice({ word, error, result, disabled, recording, audioUrl, onRecord, onBack, onFinish, onCancel }: {
  word: string; error: string; result: PronResult | null; disabled: boolean;
  recording: { phase: RecordingPhase; seconds: number } | null; audioUrl?: string;
  onRecord: () => void; onBack: () => void; onFinish: () => void; onCancel: () => void;
}) {
  const [pronounce, setPronounce] = useState<Pronounce | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [lookupRetry, setLookupRetry] = useState(0);
  const player = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setPronounce(null);
    fetchPronounce(word, { signal: controller.signal, force: lookupRetry > 0 }).then(data => { if (active) setPronounce(data); });
    return () => { active = false; controller.abort(); };
  }, [word, lookupRetry]);
  useEffect(() => () => { player.current?.pause(); window.speechSynthesis?.cancel(); }, []);
  useEffect(() => { if (disabled) player.current?.pause(); }, [disabled]);
  const ipa = pronounce?.us?.ipa || pronounce?.ipa || pronounce?.uk?.ipa;
  const audio = pronounce?.us?.audio || pronounce?.audio || pronounce?.uk?.audio;
  function listen() {
    setAudioError(false);
    player.current?.pause(); window.speechSynthesis?.cancel();
    if (audio) {
      const next = new Audio(audio); player.current = next;
      next.play().catch(() => setAudioError(true));
    } else if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US"; utterance.rate = 0.75;
      utterance.onerror = () => setAudioError(true);
      window.speechSynthesis.speak(utterance);
    } else setAudioError(true);
  }
  return <section aria-label={`Luyện từ ${word}`} className="rounded-xl border border-primary/30 bg-primary-soft/30 p-4 space-y-3">
    <div><h3 className="font-bold">Luyện từ: {word}</h3>
      <p className="mt-1 text-muted">{!pronounce ? "Đang tìm phiên âm…" : pronounce.error ? "Chưa tải được phiên âm. Bạn vẫn có thể nghe giọng đọc mẫu." : ipa || "Chưa có phiên âm cho từ này. Bạn vẫn có thể nghe giọng đọc mẫu."}</p>
      {pronounce?.error && <button disabled={disabled} onClick={() => setLookupRetry(n => n + 1)} className="mt-2 underline disabled:opacity-50">Thử lại phiên âm</button>}</div>
    <p>{error === "Insertion" ? "Máy nhận diện từ này là từ thừa. Khi đọc lại cả câu, hãy bỏ lần lặp hoặc từ ngoài câu mẫu."
      : error === "Omission" ? "Máy chưa nghe được từ này. Luyện riêng rồi đọc đủ từ trong cả câu."
      : "Nghe mẫu, nói riêng từ này rồi ghép lại vào câu."}</p>
    <div className="flex flex-wrap gap-3">
      <button disabled={disabled} onClick={listen} className="rounded-full border border-border px-3 py-2 disabled:opacity-50">Nghe từ mẫu</button>
      {recording?.phase === "recording" ? <button onClick={onFinish} className="liquid-glass-btn px-3 py-2">Dừng và chấm</button>
        : <button disabled={disabled} onClick={onRecord} className="liquid-glass-btn px-3 py-2 disabled:opacity-50">{recording ? recording.phase === "preparing" ? "Đang chuẩn bị…" : "Đang chấm…" : "Thu âm từ này"}</button>}
      {recording ? <button onClick={onCancel} className="underline">Hủy</button>
        : <button disabled={disabled} onClick={onBack} className="underline disabled:opacity-50">Quay lại luyện cả câu</button>}
    </div>
    {recording && <div>
      <p role="status">{recording.phase === "preparing" ? "Đang chuẩn bị dịch vụ và microphone. Chưa bắt đầu thu."
        : recording.phase === "recording" ? `Đang thu từ “${word}” — hãy nói ngay.` : "Đã dừng micro. Đang chấm bản thu…"}</p>
      {recording.phase === "recording" && <p className="mt-1 font-mono tabular-nums" aria-label="Thời gian thu">00:{String(recording.seconds).padStart(2, "0")} / 00:30</p>}
    </div>}
    {audioUrl && <div><p className="mb-1 text-xs text-muted">Bản thu từ “{word}”</p><audio aria-label="Nghe lại bản thu từ" controls src={audioUrl} className="w-full" /></div>}
    {audioError && <p role="alert">Chưa phát được mẫu. Hãy thử nghe lại.</p>}
    {result && <p role="status">Điểm từ: <b>{result.pronunciation}/100</b> · Máy nghe được: {result.recognized || "—"}</p>}
    <p className="text-xs text-muted">Luyện từ chỉ hiển thị trong phiên này, không thay đổi điểm hay lịch sử cả câu.</p>
  </section>;
}
