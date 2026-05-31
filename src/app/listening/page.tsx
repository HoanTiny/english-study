"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LISTEN_TOPICS, TOPIC_META, type Vid } from "@/data/listenVideos";
import { youtubeEmbedUrl } from "@/lib/listening";
import { useAuth } from "@/lib/auth";
import { listSavedVideos, type SavedVideo } from "@/lib/dictationVideosRepo";
import { listPublicVideos } from "@/lib/listenVideosRepo";

type TopicVid = Vid & { topic: string };

const LEVEL_CLS: Record<string, string> = {
  A1: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  A2: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400",
  B1: "bg-primary-soft border border-primary/20 text-primary",
  B2: "bg-pink-soft border border-pink/20 text-pink",
};

const LEVELS = ["all", "A1", "A2", "B1", "B2"];

// Video đã lưu (DB) → Vid để xem/luyện như các video khác (đã lưu = có phụ đề).
function savedToVid(s: SavedVideo): Vid {
  return { id: s.videoId, title: s.title, channel: s.channel, level: "", cc: true };
}

export default function ListeningPage() {
  const { userId } = useAuth();
  const [topic, setTopic] = useState(TOPIC_META[0].key);
  const [level, setLevel] = useState("all");
  const [video, setVideo] = useState<Vid | null>(null);
  const [saved, setSaved] = useState<SavedVideo[]>([]);
  // null = chưa tải / DB trống → dùng seed tĩnh. Mảng = dữ liệu từ DB (CMS).
  const [dbVids, setDbVids] = useState<TopicVid[] | null>(null);

  useEffect(() => {
    if (userId) listSavedVideos().then(setSaved).catch(() => {});
  }, [userId]);

  useEffect(() => {
    listPublicVideos()
      .then((rows) => {
        if (rows.length)
          setDbVids(rows.map((r) => ({ id: r.videoId, title: r.title, channel: r.channel, level: r.level, cc: r.cc, topic: r.topic })));
      })
      .catch(() => {});
  }, []);

  // Lấy video của 1 chủ đề: ưu tiên DB, fallback seed tĩnh.
  function videosOf(key: string): Vid[] {
    if (dbVids) return dbVids.filter((v) => v.topic === key);
    return LISTEN_TOPICS.find((t) => t.key === key)?.videos ?? [];
  }

  const current = TOPIC_META.find((t) => t.key === topic) ?? TOPIC_META[0];
  const topicVideos = videosOf(current.key);
  const videos = level === "all" ? topicVideos : topicVideos.filter((v) => v.level === level);

  if (video) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 pt-24 animate-fadeIn relative">
        {/* Background radial highlight */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />

        <button 
          onClick={() => setVideo(null)} 
          className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-white/40 dark:bg-black/20 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-muted hover:text-foreground hover:border-primary/50 cursor-pointer transition-all duration-300 active:scale-95 shadow-sm"
        >
          ← Danh sách video
        </button>
        
        <div className="liquid-glass-card overflow-hidden border border-border/85 shadow-2xl relative mt-6">
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
          <div className="p-6 sm:p-7 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-xl pointer-events-none" />
            <div className="flex flex-wrap items-center gap-3">
              {video.level && <span className={`rounded-full px-3.5 py-1 text-[8.5px] font-black uppercase tracking-wider ${LEVEL_CLS[video.level] ?? "bg-primary-soft border border-primary/20 text-primary shadow-sm"}`}>{video.level}</span>}
              {video.cc && <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-[8.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shadow-sm">📝 Có phụ đề</span>}
              <span className="text-xs font-semibold text-muted ml-1">{video.channel}</span>
            </div>
            <h1 className="mt-4 font-display text-xl sm:text-2xl font-black text-foreground leading-snug tracking-tight">{video.title}</h1>
          </div>
        </div>

        {/* Hướng dẫn luyện nghe */}
        <div className="mt-8 liquid-glass-card p-6 sm:p-8 border border-border/85 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-20 h-20 bg-accent/5 rounded-full filter blur-lg pointer-events-none" />
          <h2 className="mb-4.5 font-display text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2 border-b border-border/40 pb-2.5">
            <span>🎧</span> Hướng dẫn thực hành phản xạ nghe
          </h2>
          <ol className="list-inside list-decimal space-y-3.5 text-xs sm:text-sm font-semibold text-foreground/80 leading-relaxed pl-1">
            <li>Lắng nghe lượt đầu tiên <b className="text-primary font-bold">không bật phụ đề</b> để nắm bắt ngữ cảnh cốt lõi.</li>
            <li>Theo dõi lần thứ hai <b className="text-primary font-bold">có phụ đề</b> (kích hoạt nút CC trên trình phát) để đối chiếu từ mới.</li>
            <li><b className="text-accent font-bold">Phương pháp Shadowing</b>: Tạm dừng sau mỗi câu đối thoại, bắt chước và nhại giọng to.</li>
          </ol>
          
          <div className="mt-7 flex flex-wrap gap-3.5 border-t border-border/40 pt-6">
            {video.cc === false ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/40 dark:bg-black/20 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-muted cursor-not-allowed shadow-inner" title="Video này không có phụ đề nên không chép chính tả được">
                📝 Video này không có phụ đề
              </span>
            ) : (
              <Link href={`/dictation?v=${video.id}`} className="inline-flex items-center gap-2 liquid-glass-btn px-6 py-3.5 text-xs font-black uppercase tracking-wider shadow-md">
                📝 Chép chính tả video này
                {video.cc && <span className="rounded-full bg-emerald-600/90 px-2 py-0.5 text-[8px] text-white">CC</span>}
              </Link>
            )}
            <Link href="/shadowing" className="inline-block rounded-full border border-border/80 bg-white/50 dark:bg-black/30 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-foreground hover:border-primary/50 hover:bg-primary-soft/10 active:scale-95 transition-all shadow-sm">
              Luyện Shadowing có chấm điểm →
            </Link>
          </div>
          <p className="mt-4 text-[9px] font-bold text-muted">* Tính năng chép chính tả yêu cầu video đã được cấu hình phụ đề chuẩn (CC).</p>
        </div>
      </main>
    );
  }

  // ===== Thư viện video theo chủ đề =====
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 pt-24 animate-fadeIn relative">
      {/* Ambient background highlights */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="mb-10 text-center flex flex-col items-center gap-3">
        <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          🎧 HỌC TIẾNG ANH QUA VIDEO
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground tracking-tight leading-none mt-2">
          Luyện nghe thực chiến
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-semibold text-muted max-w-md leading-relaxed">
          Chủ đề chọn lọc từ các kênh bản xứ uy tín thế giới, kết hợp luyện phản xạ chép chính tả và Shadowing.
        </p>
        <Link href="/dictation" className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-5.5 py-3 text-[10px] font-black uppercase tracking-wider text-primary transition-all hover:bg-primary-soft hover:scale-102 active:scale-98 shadow-sm">
          📝 Luyện chép chính tả có chấm điểm <span className="text-[14px] ml-1">→</span>
        </Link>
      </div>

      {/* Video đã lưu của bạn */}
      {saved.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-6 flex items-center gap-2 border-b border-border/40 pb-3 font-display text-sm font-black uppercase tracking-widest text-foreground border-l-2 border-primary/50 pl-3">
            <span>📌</span> Video đã lưu của bạn
            <span className="ml-2 rounded-full border border-border/80 bg-black/5 dark:bg-white/5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted">({saved.length})</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((s) => (
              <button
                key={s.id}
                onClick={() => setVideo(savedToVid(s))}
                className="liquid-glass-card group flex flex-col overflow-hidden border border-border/85 p-0 text-left shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 cursor-pointer"
              >
                <div className="relative aspect-video overflow-hidden bg-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg`} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/35">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/20 dark:bg-black/30 backdrop-blur-md text-white shadow-lg transition-transform group-hover:scale-110 active:scale-95">▶</span>
                  </span>
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-500/80 border border-emerald-500/25 px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">📝 Có phụ đề</span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4.5 bg-white/5 relative">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-md pointer-events-none" />
                  <h3 className="line-clamp-2 text-xs sm:text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{s.title}</h3>
                  {s.channel && <span className="mt-1 text-[10px] font-bold text-muted">{s.channel}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chip chủ đề */}
      <div className="mb-6 flex flex-wrap justify-center gap-3">
        {TOPIC_META.map((t) => {
          const active = topic === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTopic(t.key)}
              className={`rounded-full border px-4.5 py-2.5 text-xs font-black transition-all duration-300 active:scale-95 cursor-pointer shadow-sm ${
                active 
                  ? "border-primary bg-primary text-primary-fg shadow-md shadow-primary/20 scale-102" 
                  : "border-border/80 bg-white/40 dark:bg-black/20 text-foreground hover:border-primary/50 hover:bg-primary-soft/10"
              }`}
            >
              <span className="mr-1.5">{t.emoji}</span> {t.label}
            </button>
          );
        })}
      </div>

      {/* Bộ lọc cấp độ */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
        <span className="text-[9px] font-black uppercase tracking-wider text-muted mr-1.5">Cấp độ CEFR:</span>
        <div className="inline-flex rounded-full bg-white/40 dark:bg-black/35 border border-border/80 p-1 shadow-sm backdrop-blur-md">
          {LEVELS.map((l) => {
            const active = level === l;
            return (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-full px-4.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  active 
                    ? "bg-primary text-primary-fg shadow-sm" 
                    : "text-muted hover:text-foreground"
                }`}
              >
                {l === "all" ? "Tất cả" : l}
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="mb-6 font-display text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-border/40 pb-3 border-l-2 border-primary/50 pl-3">
        <span>{current.emoji}</span> {current.label} 
        <span className="text-[9px] font-black uppercase tracking-wider text-muted bg-black/5 dark:bg-white/5 border border-border/80 px-2.5 py-0.5 rounded-full ml-1.5">({videos.length} video)</span>
      </h2>
      
      {videos.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-white/10 dark:bg-black/10 relative overflow-hidden flex flex-col items-center justify-center gap-2.5">
          <span className="text-4xl">📭</span>
          <p className="text-xs font-bold text-muted">Không tìm thấy video nào ở chủ đề và cấp độ này.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => setVideo(v)}
              className="liquid-glass-card group flex flex-col overflow-hidden p-0 text-left transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 shadow-lg border border-border/85 cursor-pointer"
            >
              <div className="relative aspect-video overflow-hidden bg-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/35 transition-colors">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 dark:bg-black/30 backdrop-blur-md text-white shadow-lg transition-transform group-hover:scale-110 active:scale-95">▶</span>
                </span>
                {v.level && <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider shadow-sm ${LEVEL_CLS[v.level] ?? "bg-primary-soft border border-primary/20 text-primary"}`}>{v.level}</span>}
                {v.cc && (
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-500/80 border border-emerald-500/25 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
                    📝 Có phụ đề
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4.5 bg-white/5 relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-md pointer-events-none" />
                <h3 className="text-xs sm:text-sm font-extrabold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">{v.title}</h3>
                <span className="text-[10px] font-bold text-muted mt-1.5">{v.channel}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
