"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPronounce, isSingleWord, type Pronounce } from "@/lib/pronounce";

// Thanh phát âm: nút nghe giọng Anh-Anh (UK) & Anh-Mỹ (US) để đối chiếu accent,
// + thu âm giọng mình và nghe lại (luyện shadowing theo accent yêu thích).
export default function PronounceBar({ word }: { word: string }) {
  const [p, setP] = useState<Pronounce | null>(null);
  const [recording, setRecording] = useState(false);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [recErr, setRecErr] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let active = true;
    setP(null);
    setRecUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
    if (isSingleWord(word)) {
      fetchPronounce(word).then((d) => active && setP(d));
    }
    return () => {
      active = false;
    };
  }, [word]);

  function speakFallback() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
  function playUrl(url?: string) {
    if (url) new Audio(url).play().catch(() => {});
    else speakFallback();
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setRecUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecErr(false);
    } catch {
      setRecErr(true);
    }
  }
  function stopRec() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  const us = p?.us;
  const uk = p?.uk;
  const hasAccents = !!(us?.audio || uk?.audio);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Đối chiếu accent UK / US */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {hasAccents ? (
          <>
            {uk?.audio && (
              <button onClick={() => playUrl(uk.audio)} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary/50">
                🔊 UK {uk.ipa && <span className="text-[10px] font-medium text-muted">{uk.ipa}</span>}
              </button>
            )}
            {us?.audio && (
              <button onClick={() => playUrl(us.audio)} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary/50">
                🔊 US {us.ipa && <span className="text-[10px] font-medium text-muted">{us.ipa}</span>}
              </button>
            )}
          </>
        ) : (
          <button onClick={() => playUrl(p?.audio)} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary/50">
            🔊 Nghe
          </button>
        )}
      </div>

      {/* Thu âm & nghe lại */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!recording ? (
          <button onClick={startRec} className="flex items-center gap-1.5 rounded-full bg-pink-soft px-4 py-1.5 text-xs font-bold text-pink hover:opacity-90">
            🎙️ Thu âm
          </button>
        ) : (
          <button onClick={stopRec} className="flex items-center gap-1.5 rounded-full bg-pink px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 animate-pulse">
            ⏹ Dừng
          </button>
        )}
        {recUrl && (
          <button onClick={() => playUrl(recUrl)} className="flex items-center gap-1.5 rounded-full bg-primary-soft px-4 py-1.5 text-xs font-bold text-primary hover:opacity-90">
            ▶️ Nghe lại
          </button>
        )}
      </div>
      {recErr && <p className="text-[10px] font-medium text-pink">Cần cấp quyền micro để thu âm.</p>}

      {/* Tra trên Cambridge (Anh–Việt) — mở tab mới, hợp lệ (chỉ link) */}
      <a
        href={`https://dictionary.cambridge.org/vi/dictionary/english-vietnamese/${encodeURIComponent(word.trim().toLowerCase())}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] font-bold text-primary hover:underline"
      >
        📖 Tra trên Cambridge ↗
      </a>
    </div>
  );
}
