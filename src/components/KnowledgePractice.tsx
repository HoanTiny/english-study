"use client";

import { useId, useState } from "react";
import type { LessonKnowledge } from "@/lib/lessonKnowledge";
import { acceptedPracticeAnswers, checkPracticeAnswer, type PracticeResult } from "@/lib/knowledgePractice";

type Attempt = { answer: string; result?: Exclude<PracticeResult, "empty"> | "revealed"; reviewed?: boolean };
const buttonClass = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

// The keyed session resets answers and feedback when navigating to another lesson.
export default function KnowledgePractice({ slug, questions }: { slug: string; questions: LessonKnowledge["practice"] }) {
  return <PracticeSession key={slug} slug={slug} questions={questions} />;
}

function PracticeSession({ slug, questions }: { slug: string; questions: LessonKnowledge["practice"] }) {
  const id = useId();
  const [attempts, setAttempts] = useState<Record<number, Attempt>>({});
  const correct = Object.values(attempts).filter(attempt => attempt.result === "correct").length;
  const reviewed = Object.values(attempts).filter(attempt => attempt.reviewed).length;

  function patch(index: number, values: Partial<Attempt>) {
    setAttempts(current => ({ ...current, [index]: { ...(current[index] ?? { answer: "" }), ...values } }));
  }

  return (
    <div className="mt-4">
      <p className="text-sm leading-relaxed text-muted">Điền đáp án ngắn cho câu điền từ; nếu có nhiều chỗ trống, ngăn cách bằng dấu chấm phẩy. Câu mở có đáp án tham khảo để bạn tự đối chiếu.</p>
      <p className="mt-2 text-sm text-muted">Kết quả chỉ giữ khi đang mở bài này, không tính điểm hoàn thành bài.</p>
      <p className="mt-3 text-sm font-semibold" aria-live="polite">{correct} câu đúng tự động · {reviewed} câu đã tự đối chiếu · {questions.length} câu tổng cộng</p>
      <ol className="mt-4 list-decimal space-y-6 pl-5">
        {questions.map(([prompt, model, explanation], index) => {
          const attempt = attempts[index] ?? { answer: "" };
          const fieldId = `${id}-${index}`;
          const automatic = !!acceptedPracticeAnswers[slug]?.[index];
          const checked = !!attempt.result;
          return (
            <li key={prompt} className="pl-1 text-sm leading-relaxed">
              <form onSubmit={event => {
                event.preventDefault();
                if (checked) return;
                const result = checkPracticeAnswer(slug, index, attempt.answer);
                if (result !== "empty") patch(index, { result });
              }}>
                <label htmlFor={fieldId} className="block font-medium">{prompt}</label>
                <p id={`${fieldId}-hint`} className="mt-1 text-xs text-muted">{automatic ? "Đáp án ngắn · kiểm tra tự động" : "Câu mở · tự đối chiếu với đáp án tham khảo"}</p>
                <textarea
                  id={fieldId}
                  aria-describedby={`${fieldId}-hint${checked ? ` ${fieldId}-feedback` : ""}`}
                  value={attempt.answer}
                  onChange={event => patch(index, { answer: event.target.value })}
                  readOnly={checked}
                  rows={automatic ? 2 : 3}
                  maxLength={2000}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Viết câu trả lời của bạn…"
                  className="mt-2 block w-full resize-y rounded-xl border border-border bg-background p-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-primary read-only:bg-surface"
                />
                {!checked && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="submit" disabled={!attempt.answer.trim()} className={`${buttonClass} bg-primary text-primary-fg`}>{automatic ? "Kiểm tra đáp án" : "Đối chiếu câu trả lời"}</button>
                    <button type="button" className={buttonClass} onClick={() => patch(index, { result: "revealed" })}>Xem lời giải</button>
                  </div>
                )}
                {checked && (
                  <div id={`${fieldId}-feedback`} role="status" className="mt-3 rounded-xl border border-border bg-surface p-4">
                    <p className="font-semibold">{attempt.result === "correct" ? "Đúng rồi!" : attempt.result === "retry" ? "Chưa khớp đáp án ngắn. Xem cách làm rồi thử lại nhé." : attempt.result === "revealed" ? "Bạn đang xem lời giải; câu này chưa được tính là trả lời đúng." : "Hãy tự đối chiếu: cách diễn đạt khác vẫn có thể đúng."}</p>
                    <p className="mt-2"><span className="font-semibold">Đáp án tham khảo: </span>{model}</p>
                    <p className="mt-2 text-muted">{explanation}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!automatic && !attempt.reviewed && attempt.result === "self-review" && (
                        <button type="button" className={buttonClass} onClick={() => patch(index, { reviewed: true })}>Tôi đã đối chiếu</button>
                      )}
                      <button type="button" className={buttonClass} onClick={() => patch(index, { result: undefined, reviewed: false })}>Thử lại câu này</button>
                    </div>
                  </div>
                )}
              </form>
            </li>
          );
        })}
      </ol>
      <button type="button" className={`${buttonClass} mt-6`} disabled={!Object.keys(attempts).length} onClick={() => setAttempts({})}>Làm lại toàn bộ</button>
    </div>
  );
}
