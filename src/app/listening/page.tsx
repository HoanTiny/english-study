"use client";

import { useState } from "react";
import Link from "next/link";
import { LISTEN_TOPICS, type Vid } from "@/data/listenVideos";
import { youtubeEmbedUrl } from "@/lib/listening";

const LEVEL_CLS: Record<string, string> = {
  A1: "bg-emerald-400/20 text-emerald-600",
  A2: "bg-amber-400/20 text-amber-600",
  B1: "bg-primary-soft text-primary",
  B2: "bg-pink-soft text-pink",
};

const LEVELS = ["all", "A1", "A2", "B1", "B2"];

export default function ListeningPage() {
  const [topic, setTopic] = useState(LISTEN_TOPICS[0].key);
  const [level, setLevel] = useState("all");
  const [video, setVideo] = useState<Vid | null>(null);

  const current = LISTEN_TOPICS.find((t) => t.key === topic) ?? LISTEN_TOPICS[0];
  const videos = level === "all" ? current.videos : current.videos.filter((v) => v.level === level);

  // ===== Xem & luyện 1 video =====
  if (video) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 pt-16 animate-fadeIn">
        <button onClick={() => setVideo(null)} className="mb-4 text-xs font-bold text-muted hover:text-foreground">
          ← Danh sách video
        </button>
        <div className="liquid-glass-card overflow-hidden">
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={youtubeEmbedUrl(video.id)}
              title={video.title}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLS[video.level] ?? "bg-primary-soft text-primary"}`}>{video.level}</span>
              <span className="text-xs font-semibold text-muted">{video.channel}</span>
            </div>
            <h1 className="mt-1 font-display text-xl text-foreground">{video.title}</h1>
          </div>
        </div>

        {/* Hướng dẫn luyện nghe */}
        <div className="mt-5 liquid-glass-card p-5">
          <h2 className="mb-2 font-display text-lg text-foreground">🎧 Cách luyện</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm font-medium text-foreground/90">
            <li>Nghe 1 lần <b>không phụ đề</b> — nắm ý chính.</li>
            <li>Nghe lại <b>có phụ đề</b> (bật CC trên video) — đối chiếu.</li>
            <li><b>Shadowing</b>: tạm dừng từng câu, nói nhại theo ngữ điệu.</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/dictation?v=${video.id}`} className="inline-block liquid-glass-btn px-5 py-2.5 text-sm font-bold">
              📝 Chép chính tả video này →
            </Link>
            <Link href="/shadowing" className="inline-block rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-bold text-foreground hover:border-primary/50">
              Luyện Shadowing có chấm điểm →
            </Link>
          </div>
          <p className="mt-2 text-[11px] text-muted">* Chép chính tả chỉ chạy với video có phụ đề (CC).</p>
        </div>
      </main>
    );
  }

  // ===== Thư viện video theo chủ đề =====
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 pt-16 animate-fadeIn">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">🎧 Luyện nghe</h1>
        <p className="mt-2 text-sm font-semibold text-muted">
          Nghe video theo chủ đề từ kênh bản xứ uy tín, kết hợp Shadowing. Miễn phí.
        </p>
        <Link href="/dictation" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-5 py-2 text-sm font-bold text-primary transition-transform hover:scale-105 active:scale-95">
          📝 Bài tập nghe – chép chính tả (có điểm) →
        </Link>
      </div>

      {/* Chip chủ đề */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {LISTEN_TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTopic(t.key)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-all ${
              topic === t.key ? "border-primary bg-primary text-white" : "border-border bg-surface text-foreground hover:border-primary/40"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Bộ lọc cấp độ */}
      <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Cấp độ:</span>
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
              level === l ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {l === "all" ? "Tất cả" : l}
          </button>
        ))}
      </div>

      <h2 className="mb-3 font-display text-lg text-foreground">
        {current.emoji} {current.label} <span className="text-xs font-semibold text-muted">({videos.length} video)</span>
      </h2>
      {videos.length === 0 ? (
        <p className="py-8 text-center text-sm font-semibold text-muted">Chủ đề này chưa có video ở cấp {level}. Thử cấp khác.</p>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => setVideo(v)}
            className="liquid-glass-card group flex flex-col overflow-hidden p-0 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
          >
            <div className="relative aspect-video overflow-hidden bg-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-xl text-white transition-transform group-hover:scale-110">▶</span>
              </span>
              <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLS[v.level] ?? "bg-primary-soft text-primary"}`}>{v.level}</span>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <h3 className="text-sm font-bold leading-snug text-foreground">{v.title}</h3>
              <span className="text-[11px] font-semibold text-muted">{v.channel}</span>
            </div>
          </button>
        ))}
      </div>
      )}
    </main>
  );
}
