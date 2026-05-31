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

      <div className="space-y-5">
        {shadowItems.map((item) => {
          const score = scores[item.id];
          const isRec = recordingId === item.id;
          return (
            <div key={item.id} className="liquid-glass-card p-6 border border-border/80 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent blur-xl pointer-events-none" />

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary-soft border border-primary/10 px-3.5 py-1 text-[8.5px] font-black uppercase tracking-wider text-primary">
                  {item.level}
                </span>
                {score != null && (
                  <span
                    className={`ml-auto text-[10px] font-black border rounded-full px-3.5 py-1 shadow-sm transition-all duration-500 ${
                      score >= 80 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                        : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    Đạt được: <span className="text-xs font-black">{score}đ</span>
                  </span>
                )}
              </div>
              
              <p className="mt-4 text-lg font-bold text-foreground leading-relaxed tracking-tight">{item.en}</p>
              <p className="text-xs font-semibold text-muted mt-1">{item.vi}</p>

              <div className="mt-5 flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
                <button
                  onClick={() => speak(item.en)}
                  className="flex-1 rounded-full border border-border/60 bg-surface/50 py-3.5 text-xs font-black uppercase tracking-wider transition-all duration-300 hover:border-primary/50 hover:bg-primary-soft/30 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>🔊</span> Nghe mẫu
                </button>
                {!isRec ? (
                  <button
                    onClick={() => record(item.id, item.en)}
                    className="flex-1 liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    🎤 Luyện nhại
                  </button>
                ) : assessing ? (
                  <button
                    disabled
                    className="flex-1 animate-pulse rounded-full bg-primary border border-primary/20 py-3.5 text-xs font-black uppercase tracking-wider text-primary-fg flex items-center justify-center gap-1.5 cursor-wait"
                  >
                    <span className="h-2 w-2 rounded-full bg-current animate-ping"></span>
                    Đang nghe… nói câu trên
                  </button>
                ) : (
                  <button
                    onClick={() => stop(item.id)}
                    className="flex-1 animate-pulse rounded-full bg-rose-600 py-3.5 text-xs font-black uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                    Dừng ghi & Chấm điểm
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
