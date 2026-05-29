"use client";

import { useRef, useState } from "react";
import { loopCards } from "@/lib/coreLoopData";

type Phase = "input" | "recall" | "speak" | "result";

export default function CoreLoopDemo() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("input");
  const [recording, setRecording] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [recognized, setRecognized] = useState(0);
  const [mastered, setMastered] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);

  const card = loopCards[index];
  const total = loopCards.length;

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function goRecall() {
    setRecognized((n) => n + 1);
    setPhase("recall");
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
      rec.onstop = () => stream.getTracks().forEach((t) => t.stop());
    } catch {
      finishRecording();
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    finishRecording();
  }

  function finishRecording() {
    setRecording(false);
    const mock = Math.round(72 + Math.random() * 26);
    setScore(mock);
    if (mock >= 80) setMastered((n) => n + 1);
    setPhase("result");
  }

  function next() {
    setScore(null);
    if (index + 1 < total) {
      setIndex((i) => i + 1);
      setPhase("input");
    } else {
      setIndex(0);
      setPhase("input");
    }
  }

  return (
    <div className="mx-auto max-w-md liquid-glass-card p-7 md:p-8 shadow-xl relative overflow-hidden transition-all duration-500">
      {/* Decorative inner light reflection */}
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-white/10 dark:bg-white/5 rounded-full filter blur-xl pointer-events-none" />

      {/* Active vs Passive tracker */}
      <div className="mb-6 flex gap-3 text-center">
        <div className="flex-1 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 py-2.5 transition-all duration-300">
          <p className="text-2xl font-black text-indigo-500 dark:text-indigo-400">{recognized}</p>
          <p className="text-[10px] font-bold tracking-wider uppercase opacity-80">Đã hiểu</p>
        </div>
        <div className="flex-1 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/20 py-2.5 transition-all duration-300">
          <p className="text-2xl font-black text-accent">{mastered}</p>
          <p className="text-[10px] font-bold tracking-wider uppercase opacity-80">Nói được</p>
        </div>
        <div className="flex-1 rounded-xl bg-white/10 dark:bg-white/5 border border-border/80 py-2.5 transition-all duration-300">
          <p className="text-2xl font-black">
            {index + 1}
            <span className="text-xs text-muted">/{total}</span>
          </p>
          <p className="text-[10px] font-bold tracking-wider uppercase opacity-80">Thẻ</p>
        </div>
      </div>

      {/* Steps */}
      {phase === "input" && (
        <div className="space-y-5 text-center py-2 animate-fadeIn">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              ⚡ Giai đoạn 1 · Tiếp nhận
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black tracking-tight text-gradient-iridescent">{card.en}</p>
            <p className="text-sm font-semibold text-muted font-mono">{card.ipa}</p>
          </div>
          <p className="text-base font-bold text-foreground bg-white/20 dark:bg-white/5 border border-border/40 py-2 px-4 rounded-xl inline-block">
            {card.vi}
          </p>
          <p className="text-sm italic text-muted/90 bg-black/5 dark:bg-white/5 py-2.5 px-4 rounded-xl border border-border/20">
            “{card.example}”
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => speak(card.example)}
              className="flex-1 rounded-xl border border-border bg-white/25 dark:bg-white/5 py-2.5 text-sm font-semibold transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>🔊</span> Nghe mẫu
            </button>
            <button
              onClick={goRecall}
              className="flex-1 liquid-glass-btn py-2.5 text-sm font-bold active:scale-95 flex items-center justify-center gap-1"
            >
              Tiếp tục <span>→</span>
            </button>
          </div>
        </div>
      )}

      {phase === "recall" && (
        <div className="space-y-5 text-center py-2 animate-fadeIn">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn/10 px-3 py-1 text-xs font-bold text-warn">
              🧠 Giai đoạn 2 · Tự nhớ lại
            </span>
          </div>
          <p className="text-xl font-bold bg-white/20 dark:bg-white/5 border border-border/40 py-3 px-5 rounded-2xl inline-block leading-relaxed">
            {card.vi}
          </p>
          <p className="text-sm font-medium text-muted leading-relaxed max-w-xs mx-auto">
            Hãy tự nhớ và phát âm thành tiếng câu dịch tiếng Anh trong đầu trước khi mở đáp án.
          </p>
          <div className="py-2.5">
            <p className="text-2xl font-black text-primary filter blur-[4px] hover:blur-0 transition-all duration-500 cursor-pointer select-none" title="Rê chuột để mở">
              {card.en}
            </p>
            <p className="text-[10px] text-muted font-semibold mt-1">Rê chuột hoặc chạm để xem trước</p>
          </div>
          <button
            onClick={() => setPhase("speak")}
            className="w-full liquid-glass-btn py-3 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95"
          >
            Đã nhớ rõ <span>→</span> Luyện nói
          </button>
        </div>
      )}

      {phase === "speak" && (
        <div className="space-y-5 text-center py-2 animate-fadeIn">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
              🎙️ Giai đoạn 3 · Nói bắt buộc
            </span>
          </div>
          <p className="text-3xl font-black tracking-tight text-primary dark:text-primary-fg">{card.en}</p>
          <p className="text-sm font-medium text-muted leading-relaxed max-w-xs mx-auto">
            Bấm nút ghi âm phía dưới và nói to câu trên. Đây là điều kiện tiên quyết để hoàn thành thẻ.
          </p>

          <div className="py-3">
            {!recording ? (
              <button
                onClick={startRecording}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_8px_24px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                Bắt đầu ghi âm giọng nói
              </button>
            ) : (
              <div className="space-y-4">
                {/* Real-time Liquid Sound wave simulation */}
                <div className="flex justify-center items-center h-8 gap-0.5">
                  <div className="wave-bar" style={{ animationDelay: "0.1s" }} />
                  <div className="wave-bar" style={{ animationDelay: "0.4s" }} />
                  <div className="wave-bar" style={{ animationDelay: "0.2s" }} />
                  <div className="wave-bar" style={{ animationDelay: "0.6s" }} />
                  <div className="wave-bar" style={{ animationDelay: "0.3s" }} />
                  <div className="wave-bar" style={{ animationDelay: "0.5s" }} />
                  <div className="wave-bar" style={{ animationDelay: "0.7s" }} />
                </div>
                <button
                  onClick={stopRecording}
                  className="w-full py-3.5 px-6 rounded-2xl bg-rose-500 hover:bg-rose-600 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_8px_24px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 animate-pulse"
                >
                  ■ Dừng ghi âm & Chấm điểm
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "result" && score !== null && (
        <div className="space-y-5 text-center py-2 animate-fadeIn">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              🏆 Giai đoạn 4 · Kết quả kiểm định
            </span>
          </div>

          <div className="py-2 relative flex justify-center">
            {/* Glossy assessment circular bubble */}
            <div
              className={`flex h-28 w-28 items-center justify-center rounded-full text-4xl font-black border backdrop-blur-md shadow-lg transition-all duration-500 scale-105 ${
                score >= 80
                  ? "bg-gradient-to-tr from-accent/20 to-emerald-500/20 border-accent/40 text-accent shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                  : "bg-gradient-to-tr from-warn/20 to-rose-500/20 border-warn/40 text-warn shadow-[0_0_30px_rgba(245,158,11,0.25)]"
              }`}
            >
              {score}
            </div>
            {/* Visual shine overlay */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-14 bg-white/20 dark:bg-white/10 rounded-t-full filter blur-[1px] pointer-events-none" />
          </div>

          <div className="space-y-1.5">
            <p className="text-base font-extrabold">
              {score >= 80 ? "Phát âm tuyệt vời! 🎉" : "Khá tốt nhưng cần sửa 🎙️"}
            </p>
            <p className="text-sm font-medium text-muted leading-relaxed max-w-xs mx-auto">
              {score >= 80
                ? "Từ ngữ đã được chuyển hoàn tất từ vùng nhớ thụ động sang vùng 'Nói được'."
                : "Gần đạt chuẩn rồi! Câu này sẽ được sắp xếp lịch ôn lại sớm nhất."}
            </p>
          </div>

          <button
            onClick={next}
            className="w-full liquid-glass-btn py-3 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95"
          >
            Học thẻ tiếp theo <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

