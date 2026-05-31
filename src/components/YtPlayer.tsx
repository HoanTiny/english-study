"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Trình phát YouTube dùng IFrame Player API — cho phép tua tới 1 mốc & dừng sau N giây
// để phát đúng từng đoạn phụ đề (đồng bộ với bài chép chính tả).

export type YtPlayerHandle = {
  playSegment: (start: number, dur: number) => void;
  pause: () => void;
};

type YT = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtInstance;
};
type YtInstance = {
  seekTo: (s: number, allow: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  destroy: () => void;
};
declare global {
  interface Window {
    YT?: YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

const YtPlayer = forwardRef<YtPlayerHandle, { videoId: string }>(function YtPlayer(
  { videoId },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtInstance | null>(null);
  const watcher = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (watcher.current) clearInterval(watcher.current);
    if (safety.current) clearTimeout(safety.current);
    watcher.current = null;
    safety.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    loadApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, origin: window.location.origin },
      });
    });
    return () => {
      cancelled = true;
      clearTimers();
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    playSegment(start: number, dur: number) {
      const p = playerRef.current;
      if (!p) return;
      clearTimers();
      const from = Math.max(0, start);
      const end = from + Math.max(0.4, dur) + 0.05; // đầu đoạn + thời lượng (đã chặn theo đoạn sau)
      p.seekTo(from, true);
      p.playVideo();
      // Dừng theo VỊ TRÍ PHÁT THỰC TẾ (chính xác kể cả khi đang đệm/tua)
      watcher.current = setInterval(() => {
        try {
          if (p.getCurrentTime() >= end) {
            p.pauseVideo();
            clearTimers();
          }
        } catch {
          /* ignore */
        }
      }, 80);
      // Chốt an toàn: nếu đệm quá lâu, vẫn dừng sau (thời lượng + 10s)
      safety.current = setTimeout(() => {
        try {
          p.pauseVideo();
        } catch {
          /* ignore */
        }
        clearTimers();
      }, (Math.max(0.6, dur) + 10) * 1000);
    },
    pause() {
      clearTimers();
      try {
        playerRef.current?.pauseVideo();
      } catch {
        /* ignore */
      }
    },
  }));

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "16 / 9" }}>
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
});

export default YtPlayer;
