"use client";
import { useEffect, useRef, useState } from "react";

// Recording remains local to the device; accent playback lives on the flashcard.
export default function PronounceBar({ word }: { word: string }) {
  const [recording, setRecording] = useState(false);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const media = useRef<MediaRecorder | null>(null);
  const recordingUrl = useRef<string | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const active = useRef(true);
  const starting = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (media.current?.state === "recording") media.current.stop();
      media.current?.stream.getTracks().forEach(track => track.stop());
      player.current?.pause();
      if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
    };
  }, []);
  async function startRec() {
    if (starting.current) return;
    starting.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) { stream.getTracks().forEach(track => track.stop()); return; }
      let recorder: MediaRecorder;
      try { recorder = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(track => track.stop()); throw e; }
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => chunks.push(event.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (!active.current) return;
        if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
        recordingUrl.current = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        setRecUrl(recordingUrl.current); setRecording(false);
      };
      recorder.start(); media.current = recorder; setRecording(true); setError("");
    } catch { if (active.current) setError("Chưa mở được micro. Kiểm tra quyền truy cập và thử lại."); }
    finally { starting.current = false; }
  }
  function listen() {
    if (!recUrl) return;
    player.current?.pause(); player.current = new Audio(recUrl);
    player.current.play().catch(() => setError("Chưa phát được bản thu. Vui lòng thử lại."));
  }
  return <div className="flex flex-col items-center gap-3">
    <div className="flex flex-wrap items-center gap-2"><button onClick={() => recording ? media.current?.stop() : startRec()} className="rounded-xl bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">{recording ? "⏹ Dừng thu âm" : "🎙 Thu âm"}</button>{recUrl && <button onClick={listen} className="rounded-xl border border-border px-4 py-2 text-sm">Nghe lại</button>}</div>
    {error && <p role="status" className="text-xs text-muted">{error}</p>}
    <a href={`https://dictionary.cambridge.org/vi/dictionary/english-vietnamese/${encodeURIComponent(word.trim().toLowerCase())}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">Tra trên Cambridge ↗</a>
  </div>;
}
