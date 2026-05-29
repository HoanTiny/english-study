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
    if (!window.speechSynthesis) return;
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
    <main className="mx-auto max-w-2xl px-5 py-12 pt-16 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-iridescent">Shadowing nhại giọng</h1>
          <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
            Nghe phát âm chuẩn của người bản xứ → nhại lại từng ngữ điệu biểu cảm → thu âm giọng nói để AI chấm điểm phản xạ tức thì.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-white/20 dark:bg-white/5 p-1 backdrop-blur-md shadow-sm w-fit self-start sm:self-center">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-300 ${
                speed === s 
                  ? "bg-primary text-white shadow-[0_2px_8px_rgba(99,102,241,0.25)]" 
                  : "text-muted hover:text-foreground"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {shadowItems.map((item) => {
          const score = scores[item.id];
          const isRec = recordingId === item.id;
          return (
            <div key={item.id} className="liquid-glass-card p-5 md:p-6 border border-border relative overflow-hidden transition-all duration-300 hover:shadow-md group">
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full filter blur-xl pointer-events-none" />

              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                  Phân cấp: {item.level}
                </span>
                {score != null && (
                  <span
                    className={`ml-auto text-xs font-extrabold border rounded-lg px-2.5 py-0.5 shadow-sm transition-all duration-500 ${
                      score >= 80 
                        ? "bg-gradient-to-tr from-accent/20 to-emerald-500/20 border-accent/30 text-accent shadow-[0_0_12px_rgba(6,182,212,0.2)]" 
                        : "bg-gradient-to-tr from-warn/20 to-rose-500/20 border-warn/30 text-warn shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                    }`}
                  >
                    Điểm: <span className="text-sm font-black">{score}</span>
                  </span>
                )}
              </div>
              
              <p className="mt-3 text-xl font-bold text-foreground leading-relaxed">{item.en}</p>
              <p className="text-sm font-semibold text-muted mt-0.5">{item.vi}</p>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 pt-3 border-t border-border/40">
                <button
                  onClick={() => speak(item.en)}
                  className="flex-1 rounded-xl border border-border bg-white/20 dark:bg-white/5 py-2.5 text-sm font-semibold transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>🔊</span> Nghe phát âm mẫu
                </button>
                {!isRec ? (
                  <button
                    onClick={() => record(item.id, item.en)}
                    className="flex-1 liquid-glass-btn py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    🎤 Luyện nhại giọng
                  </button>
                ) : assessing ? (
                  <button
                    disabled
                    className="flex-1 animate-pulse rounded-xl bg-primary py-2.5 text-sm font-bold text-white flex items-center justify-center gap-1.5 cursor-wait"
                  >
                    <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                    Đang nghe… nói câu trên
                  </button>
                ) : (
                  <button
                    onClick={() => stop(item.id)}
                    className="flex-1 animate-pulse rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_6px_16px_rgba(244,63,94,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                    Dừng ghi âm & Chấm điểm
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

