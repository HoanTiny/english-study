import { lessonKnowledge } from "@/lib/lessonKnowledge";
import KnowledgePractice from "@/components/KnowledgePractice";

export default function LessonKnowledge({ slug }: { slug: string }) {
  const content = lessonKnowledge[slug];
  if (!content) return null;

  return (
    <section aria-labelledby="lesson-knowledge-title" className="mb-10 space-y-5 rounded-2xl border border-border bg-surface/60 p-5 sm:p-7">
      <div>
        <h2 id="lesson-knowledge-title" className="font-display text-xl font-bold">Hiểu sâu & vận dụng</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">Học từng phần, tự trả lời trước khi mở lời giải. Hoàn thành nhiệm vụ nói hoặc viết để dùng kiến thức vào tình huống của bạn.</p>
      </div>

      <details open className="border-t border-border pt-4">
        <summary className="cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-primary">Kiến thức trọng tâm · {content.concepts.length} điểm</summary>
        <div className="mt-4 space-y-5">
          {content.concepts.map(([title, explanation, en, vi]) => (
            <article key={title}>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{explanation}</p>
              <blockquote className="mt-3 border-l-2 border-primary pl-4 text-sm leading-relaxed">
                <p lang="en" className="font-medium">{en}</p>
                <p className="mt-1 text-muted">{vi}</p>
              </blockquote>
            </article>
          ))}
        </div>
      </details>

      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-primary">Cụm từ mở rộng · {content.vocabulary.length} cụm</summary>
        <dl className="mt-4 space-y-3">
          {content.vocabulary.map(([en, vi]) => (
            <div key={en} className="sm:grid sm:grid-cols-2 sm:gap-4">
              <dt lang="en" className="text-sm font-semibold">{en}</dt>
              <dd className="text-sm text-muted">{vi}</dd>
            </div>
          ))}
        </dl>
      </details>

      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-primary">Lỗi thường gặp & cách sửa</summary>
        <div className="mt-4 space-y-2 text-sm leading-relaxed">
          <p><span className="font-semibold">Cần sửa: </span><span lang="en">{content.mistake[0]}</span></p>
          <p><span className="font-semibold">Nên dùng: </span><span lang="en">{content.mistake[1]}</span></p>
          <p className="text-muted">{content.mistake[2]}</p>
        </div>
      </details>

      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-primary">Tự luyện · {content.practice.length} câu & nhiệm vụ vận dụng</summary>
        <KnowledgePractice slug={slug} questions={content.practice} />
        <h3 className="mt-6 font-semibold">Thử dùng ngay</h3>
        <p className="mt-2 text-sm leading-relaxed">{content.task}</p>
      </details>
    </section>
  );
}
