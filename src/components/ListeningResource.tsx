"use client";

import {
  channelForLevel,
  youtubeEmbedUrl,
  youtubeSearchUrl,
} from "@/lib/listening";

type Props = {
  cefr: string;
  /** Chủ đề bài (thường là lesson.title) để lọc kết quả tìm kiếm */
  topic: string;
  /** Nếu có ID video hợp lệ → nhúng iframe; nếu không → hiện thẻ link */
  youtubeId?: string;
};

export default function ListeningResource({ cefr, topic, youtubeId }: Props) {
  const ch = channelForLevel(cefr);

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold tracking-tight">🎧 Luyện nghe với người bản xứ</h2>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent">
          {ch.levelLabel}
        </span>
      </div>

      {youtubeId ? (
        <div className="liquid-glass-card overflow-hidden border border-border">
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={youtubeEmbedUrl(youtubeId)}
              title={`Luyện nghe: ${topic}`}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <a
          href={youtubeSearchUrl(ch.query, topic)}
          target="_blank"
          rel="noopener noreferrer"
          className="liquid-glass-card flex items-center gap-4 border border-border p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-2xl">
            ▶️
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground leading-snug">
              Xem video về “{topic}” trên YouTube
            </p>
            <p className="mt-0.5 text-sm font-medium text-muted">
              Kênh gợi ý: <span className="text-primary font-semibold">{ch.name}</span> — mở tab mới ↗
            </p>
          </div>
        </a>
      )}

      <p className="mt-2 text-[11px] font-medium text-muted">
        Mẹo: nghe 1 lần không phụ đề → nghe lại có phụ đề → nhại theo (shadowing).
      </p>
    </section>
  );
}
