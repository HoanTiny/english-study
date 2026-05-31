"use client";

import { useEffect, useState } from "react";
import { fetchPronounce, isSingleWord, type Pronounce } from "@/lib/pronounce";

function speakTTS(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// Nút phát âm + hiển thị LOẠI TỪ (n/v/adj) & IPA ngay cạnh từ.
// Tự tải dữ liệu (Free Dictionary, miễn phí + cache) cho từ đơn.
export default function PronounceMini({ text }: { text: string }) {
  const [data, setData] = useState<Pronounce | null>(null);

  useEffect(() => {
    let active = true;
    if (isSingleWord(text)) {
      fetchPronounce(text).then((d) => { if (active) setData(d); });
    }
    return () => { active = false; };
  }, [text]);

  async function play() {
    const url = data?.us?.audio || data?.uk?.audio || data?.audio;
    if (url) {
      try {
        await new Audio(url).play();
        return;
      } catch {
        /* fallback TTS */
      }
    }
    speakTTS(text);
  }

  // Ưu tiên IPA giọng UK (dùng ə, gọn hơn so với giọng Mỹ).
  const ipa = data?.uk?.ipa || data?.ipa || data?.us?.ipa;

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <button
        onClick={play}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-surface/60 text-xs text-primary transition-all hover:border-primary/50 hover:bg-primary-soft/40 active:scale-95"
        title="Phát âm"
        aria-label="Phát âm"
      >
        🔊
      </button>
      {data?.pos?.map((p) => (
        <span key={p} className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[9px] font-black lowercase text-indigo-500">
          {p}
        </span>
      ))}
      {ipa && <span className="text-xs font-semibold text-muted">/{ipa.replace(/^\/+|\/+$/g, "")}/</span>}
    </span>
  );
}
