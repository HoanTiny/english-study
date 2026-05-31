"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { setOnboarding } from "@/lib/profileRepo";
import { PLACEMENT, scoreToStage, LEVEL_CHOICES } from "@/data/placement";

export default function OnboardingPage() {
  const router = useRouter();
  const { userId, ready, profileReady, isAnonymous, onboarded, markOnboarded } = useAuth();
  const [step, setStep] = useState<"choose" | "test" | "result">("choose");
  const [answers, setAnswers] = useState<(number | null)[]>(PLACEMENT.map(() => null));
  const [result, setResult] = useState<{ stage: number; level: string; correct: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Chờ profile tải xong rồi mới quyết định (tránh đọc trạng thái cũ ngay sau đăng ký).
  useEffect(() => {
    if (!ready || !profileReady) return;
    if (isAnonymous) router.replace("/login");
    else if (onboarded) router.replace("/today");
  }, [ready, profileReady, isAnonymous, onboarded, router]);

  async function save(stage: number) {
    if (!userId) return;
    setSaving(true);
    try {
      await setOnboarding(userId, stage);
      markOnboarded();
      router.push("/today");
    } catch {
      setSaving(false);
    }
  }

  function submitTest() {
    const correct = PLACEMENT.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
    const { stage, level } = scoreToStage(correct);
    setResult({ stage, level, correct });
    setStep("result");
  }

  if (!ready) {
    return <main className="px-6 py-24 text-center text-sm font-semibold text-muted animate-fadeIn">Đang tải…</main>;
  }

  // ===== Chọn nhanh =====
  if (step === "choose") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 pt-24 animate-fadeIn">
        <div className="text-center">
          <span className="text-5xl">🎯</span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground">Trình độ của bạn?</h1>
          <p className="mt-2 text-sm font-semibold text-muted">Chọn mức gần đúng để chúng tôi gợi ý lộ trình phù hợp. Đổi lại bất cứ lúc nào.</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {LEVEL_CHOICES.map((c) => (
            <button
              key={c.stage}
              onClick={() => save(c.stage)}
              disabled={saving}
              className="liquid-glass-card flex items-start gap-3 p-5 text-left border border-border/80 shadow-md transition-all hover:-translate-y-1 hover:border-primary/50 disabled:opacity-50 cursor-pointer"
            >
              <span className="text-3xl">{c.emoji}</span>
              <div>
                <p className="font-display text-base font-black text-foreground">{c.label} <span className="text-[10px] font-bold text-primary">{c.level}</span></p>
                <p className="mt-0.5 text-xs font-semibold text-muted leading-snug">{c.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => setStep("test")} className="rounded-full border border-primary/30 bg-primary-soft/70 px-6 py-3 text-xs font-black uppercase tracking-wider text-primary hover:bg-primary-soft">
            ✍️ Không chắc? Làm bài test xếp loại (8 câu)
          </button>
        </div>
      </main>
    );
  }

  // ===== Làm bài test =====
  if (step === "test") {
    const allAnswered = answers.every((a) => a !== null);
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 pt-24 animate-fadeIn">
        <button onClick={() => setStep("choose")} className="mb-4 text-[10px] font-black uppercase tracking-wider text-muted hover:text-foreground">← Quay lại chọn nhanh</button>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Bài test xếp loại</h1>
        <p className="mt-1 text-xs font-semibold text-muted">Chọn đáp án đúng. 8 câu, không tính giờ.</p>

        <div className="mt-6 space-y-5">
          {PLACEMENT.map((q, i) => (
            <div key={i} className="liquid-glass-card p-5 border border-border/70 shadow-sm">
              <p className="mb-3 text-sm font-bold text-foreground"><span className="text-muted">{i + 1}.</span> {q.q}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => a.map((v, idx) => (idx === i ? oi : v)))}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${answers[i] === oi ? "border-primary bg-primary-soft text-primary" : "border-border/60 bg-surface/50 text-foreground hover:border-primary/40"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={submitTest} disabled={!allAnswered} className="mt-6 w-full liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider disabled:opacity-50">
          {allAnswered ? "Xem kết quả →" : `Còn ${answers.filter((a) => a === null).length} câu chưa trả lời`}
        </button>
      </main>
    );
  }

  // ===== Kết quả =====
  return (
    <main className="mx-auto max-w-md px-6 py-16 pt-24 animate-fadeIn">
      <div className="liquid-glass-card flex flex-col items-center gap-4 p-8 text-center border border-border/80 shadow-2xl">
        <span className="text-5xl">🎉</span>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Trình độ gợi ý: {result?.level}</h1>
        <p className="text-sm font-semibold text-muted">Bạn trả lời đúng <b className="text-primary">{result?.correct}/{PLACEMENT.length}</b> câu. Chúng tôi sẽ bắt đầu lộ trình ở mức phù hợp.</p>
        <button onClick={() => result && save(result.stage)} disabled={saving} className="w-full liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider disabled:opacity-50">
          {saving ? "Đang lưu…" : "Bắt đầu học →"}
        </button>
        <button onClick={() => setStep("choose")} className="text-[11px] font-bold text-muted hover:text-foreground">Tự chọn lại trình độ</button>
      </div>
    </main>
  );
}
