"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPronounce } from "@/lib/pronounce";

// Phát âm 1 từ (audio bản xứ, fallback TTS).
async function playWord(word: string) {
  try {
    const p = await fetchPronounce(word);
    const url = p.us?.audio || p.uk?.audio || p.audio;
    if (url) {
      await new Audio(url).play();
      return;
    }
  } catch {
    /* fallback */
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
}

// Cache câu ví dụ theo từ (giữ qua các lần mở modal trong phiên).
type Ex = { en: string; vi: string };
const exampleCache = new Map<string, Ex>();
async function fetchExample(word: string): Promise<Ex | null> {
  if (exampleCache.has(word)) return exampleCache.get(word)!;
  try {
    // /api/word-example: đọc/ghi cache DB (dùng chung), sinh bằng AI nếu chưa có.
    const r = await fetch(`/api/word-example?w=${encodeURIComponent(word)}`);
    const d = await r.json();
    if (d.en) {
      const ex = { en: d.en as string, vi: (d.vi as string) || "" };
      exampleCache.set(word, ex);
      return ex;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const BACKS = [
  "from-indigo-500 to-blue-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-400 to-orange-500",
  "from-rose-500 to-pink-500",
];

// Bộ thẻ trượt: mỗi từ một thẻ (từ + IPA + nghe), vuốt/nút để chuyển; câu ví dụ đổi theo thẻ.
export default function WordCardDeck({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0);
  const [ipas, setIpas] = useState<Record<string, string>>({});
  const [example, setExample] = useState<Ex | null>(null);
  const [exLoading, setExLoading] = useState(false);

  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);

  // Thu âm nhại lại
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const cur = words[idx];
  const go = (d: number) => setIdx((i) => (i + d + words.length) % words.length);

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        setRecUrl(URL.createObjectURL(new Blob(chunks.current, { type: "audio/webm" })));
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      alert("Không truy cập được micro. Hãy cho phép quyền micro.");
    }
  }

  // Lấy IPA + câu ví dụ + tự phát âm khi đổi thẻ.
  useEffect(() => {
    if (!cur) return;
    setRecUrl(null); // reset bản thu khi đổi thẻ
    playWord(cur);
    if (!(cur in ipas)) {
      fetchPronounce(cur)
        .then((p) => {
          const ipa = (p.uk?.ipa || p.ipa || p.us?.ipa || "").replace(/^\/+|\/+$/g, "");
          setIpas((prev) => ({ ...prev, [cur]: ipa }));
        })
        .catch(() => {});
    }
    setExample(exampleCache.get(cur) ?? null);
    if (!exampleCache.has(cur)) {
      setExLoading(true);
      fetchExample(cur)
        .then((ex) => setExample(ex))
        .finally(() => setExLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Kéo–vuốt (chuột + cảm ứng) để chuyển thẻ.
  const onDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
  };
  const onMove = (e: React.PointerEvent) => {
    if (startX.current != null) setDrag(e.clientX - startX.current);
  };
  const onUp = () => {
    if (startX.current != null) {
      if (drag < -50) go(1);
      else if (drag > 50) go(-1);
    }
    startX.current = null;
    setDrag(0);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Vùng thẻ xếp chồng — kéo vuốt được */}
      <div
        className="relative h-40 w-full max-w-[260px] touch-none select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {words.map((w, i) => {
          const off = (i - idx + words.length) % words.length;
          if (off > 3) return null;
          const top = off === 0;
          return (
            <div
              key={`${w}-${i}`}
              onClick={() => top && Math.abs(drag) < 6 && playWord(w)}
              className={`absolute inset-0 flex flex-col items-center justify-center rounded-3xl border shadow-xl transition-all ${top ? "duration-0" : "duration-300"} ${
                top
                  ? "border-black/10 bg-white dark:border-white/10 dark:bg-zinc-800"
                  : `border-white/20 bg-gradient-to-br ${BACKS[off % BACKS.length]}`
              }`}
              style={{
                zIndex: 10 - off,
                transform: `translateX(${off * 12 + (top ? drag : 0)}px) translateY(${off * 7}px) rotate(${off * 3.5 + (top ? drag * 0.04 : 0)}deg) scale(${1 - off * 0.05})`,
                opacity: top ? 1 : 0.9,
                cursor: top ? "grab" : "default",
              }}
              aria-hidden={!top}
            >
              {top && (
                <>
                  <span className="font-display text-2xl font-black text-foreground">{w}</span>
                  <span className="mt-1 text-sm font-semibold text-muted">/{ipas[w] ?? "…"}/</span>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); playWord(w); }}
                    className="mt-3 flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-black text-primary-fg active:scale-95"
                  >
                    🔊 Nghe
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Điều khiển */}
      <div className="mt-4 flex items-center gap-4">
        <button onClick={() => go(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted transition-colors hover:text-foreground" aria-label="Từ trước">←</button>
        <div className="flex gap-1.5">
          {words.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />
          ))}
        </div>
        <button onClick={() => go(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted transition-colors hover:text-foreground" aria-label="Từ sau">→</button>
      </div>

      {/* Thu âm nhại lại */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={toggleRecord}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black text-white transition-all active:scale-95 ${recording ? "bg-pink animate-pulse" : "bg-foreground/80 hover:bg-foreground"}`}
        >
          {recording ? "⏹ Dừng thu" : "🎙️ Thu âm nhại lại"}
        </button>
        {recUrl && <audio controls src={recUrl} className="h-8 max-w-[150px]" />}
      </div>

      {/* Câu ví dụ cho TỪ hiện tại */}
      <div className="mt-4 flex w-full items-center gap-2.5 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/5">
        <button
          onClick={() => example && playWord(example.en)}
          disabled={!example}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-fg disabled:opacity-50"
          aria-label="Nghe câu"
        >
          ▶
        </button>
        <div className="min-w-0">
          {example ? (
            <>
              <p className="text-sm font-medium italic leading-snug text-foreground/90">“{example.en}”</p>
              {example.vi && <p className="mt-0.5 text-[11px] font-medium text-muted">{example.vi}</p>}
            </>
          ) : (
            <p className="text-xs font-medium text-muted">{exLoading ? "Đang tải câu ví dụ…" : "Chưa có câu ví dụ cho từ này."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
