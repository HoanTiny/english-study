"use client";

import { useEffect, useRef, useState } from "react";
import { shadowItems } from "@/lib/content";
import { useAuth } from "@/lib/auth";
import { listShadowScores, saveShadowAttempt } from "@/lib/shadowingRepo";
import { assessPronunciation } from "@/lib/pronunciation";

const speeds = [0.5, 0.75, 1];

export default function ShadowingPage() {
  const { userId, ready } = useAuth();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [speed, setSpeed] = useState(0.75);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [level, setLevel] = useState("all");
  const mediaRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    listShadowScores()
      .then((m) => {
        if (active) setScores(m);
      })
      .catch((e) => console.error("listShadowScores", e));
    return () => {
      active = false;
    };
  }, [ready, userId]);

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = speed;
    window.speechSynthesis.speak(u);
  }

  // Lưu điểm vào state + Supabase.
  function commitScore(id: string, score: number) {
    setScores((prev) => ({ ...prev, [id]: score }));
    if (userId) {
      saveShadowAttempt(userId, id, score, speed).catch((e) =>
        console.error("saveShadowAttempt", e),
      );
    }
  }

  // Bấm thu âm: thử chấm phát âm thật bằng Azure (tự dừng khi nói xong).
  // Nếu Azure chưa cấu hình / lỗi → quay về mock MediaRecorder (bấm dừng thủ công).
  async function record(id: string, referenceText: string) {
    if (assessing || recordingId) return;
    setAssessing(true);
    setRecordingId(id);
    let result = null;
    try {
      result = await assessPronunciation(referenceText);
    } catch {
      result = null;
    }
    if (result !== null) {
      // Đường Azure: đã có điểm thật.
      setRecordingId(null);
      setAssessing(false);
      commitScore(id, result.pronunciation);
      return;
    }
    // Fallback: ghi âm mock, chờ người dùng bấm dừng.
    setAssessing(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;
      rec.start();
      rec.onstop = () => stream.getTracks().forEach((t) => t.stop());
    } catch {
      finishMock(id);
    }
  }

  function stop(id: string) {
    mediaRef.current?.stop();
    finishMock(id);
  }

  function finishMock(id: string) {
    setRecordingId(null);
    commitScore(id, Math.round(70 + Math.random() * 28));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 animate-fadeIn relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border/40 pb-6 mb-10">
        <div>
          <span className="shimmer-edge inline-flex self-start items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
            🗣️ LUYỆN NÓI NHẠI GIỌNG
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-3">Shadowing nhại giọng</h1>
          <p className="mt-2 text-xs sm:text-sm font-semibold text-muted leading-relaxed">
            Nghe phát âm chuẩn của người bản xứ → nhại lại từng ngữ điệu biểu cảm → thu âm giọng nói để AI phân tích và chấm điểm tức thì.
          </p>
        </div>
        
        {/* Speed dials */}
        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-border/60 bg-surface/50 p-1.5 backdrop-blur-md shadow-sm w-fit self-start sm:self-center">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all duration-300 cursor-pointer ${
                speed === s 
                  ? "bg-primary text-primary-fg shadow-sm" 
                  : "text-muted hover:text-foreground"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Bộ lọc cấp độ + tiến độ */}
      {(() => {
        const levels = ["all", ...Array.from(new Set(shadowItems.map((i) => i.level)))];
        const done = shadowItems.filter((i) => scores[i.id] != null).length;
        return (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all ${
                  level === l ? "border-primary bg-primary-soft text-primary" : "border-border/60 text-muted hover:text-foreground"
                }`}
              >
                {l === "all" ? "Tất cả" : l}
              </button>
            ))}
            <span className="ml-auto rounded-full border border-border/60 bg-surface/50 px-3 py-1.5 text-[10px] font-bold text-muted">
              ✓ Đã đạt <b className="text-emerald-600 dark:text-emerald-400">{done}</b>/{shadowItems.length} câu
            </span>
          </div>
        );
      })()}

      <div className="space-y-3">
        {(level === "all" ? shadowItems : shadowItems.filter((i) => i.level === level)).map((item) => {
          const score = scores[item.id];
          const isRec = recordingId === item.id;
          return (
            <div key={item.id} className="rounded-2xl border border-border/60 bg-white/70 dark:bg-zinc-900/50 p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded-full bg-primary-soft border border-primary/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                  {item.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-foreground leading-snug">{item.en}</p>
                  <p className="text-xs font-semibold text-muted mt-0.5">{item.vi}</p>
                </div>
                {score != null && (
                  <span
                    className={`shrink-0 text-[10px] font-black border rounded-full px-2.5 py-0.5 ${
                      score >= 80
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {score}đ
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => speak(item.en)}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-surface/50 px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all hover:border-primary/50 hover:bg-primary-soft/30 active:scale-95 cursor-pointer"
                >
                  🔊 Nghe mẫu
                </button>
                {!isRec ? (
                  <button
                    onClick={() => record(item.id, item.en)}
                    className="flex flex-1 items-center justify-center gap-1.5 liquid-glass-btn py-2 text-[11px] font-black uppercase tracking-wider active:scale-95"
                  >
                    🎤 Luyện nhại
                  </button>
                ) : assessing ? (
                  <button disabled className="flex flex-1 animate-pulse items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-[11px] font-black uppercase tracking-wider text-primary-fg cursor-wait">
                    <span className="h-2 w-2 rounded-full bg-current animate-ping" /> Đang nghe…
                  </button>
                ) : (
                  <button
                    onClick={() => stop(item.id)}
                    className="flex flex-1 animate-pulse items-center justify-center gap-1.5 rounded-full bg-rose-600 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer"
                  >
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" /> Dừng & Chấm
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
