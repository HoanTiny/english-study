"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TOPIC_META, LEVELS } from "@/data/listenVideos";
import { useAdminAuth } from "@/lib/adminAuth";

type AdminVid = {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  topic: string;
  level: string;
  cc: boolean;
  hidden: boolean;
  sort_order: number;
};

export default function AdminListeningPage() {
  const { key } = useAdminAuth();
  const [videos, setVideos] = useState<AdminVid[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // form thêm
  const [link, setLink] = useState("");
  const [addTopic, setAddTopic] = useState(TOPIC_META[0].key);
  const [addLevel, setAddLevel] = useState(LEVELS[0]);

  const api = useCallback(
    async (method: string, body?: unknown, qs = "") => {
      const res = await fetch(`/api/admin/listen-videos${qs}`, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
      return data;
    },
    [key],
  );

  const load = useCallback(async () => {
    const data = await api("GET");
    setVideos(data.videos ?? []);
  }, [api]);

  // Đã đăng nhập ở layout → nạp danh sách ngay khi có key.
  useEffect(() => {
    if (key) load().catch((e) => setErr(e instanceof Error ? e.message : "Lỗi tải."));
  }, [key, load]);

  async function run<T>(fn: () => Promise<T>, ok = "") {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await fn();
      if (ok) setMsg(ok);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  }

  const addVideo = () =>
    run(async () => {
      await api("POST", { action: "create", link, topic: addTopic, level: addLevel });
      setLink("");
      await load();
    }, "Đã thêm video.");

  const patch = (id: string, fields: Partial<AdminVid>) =>
    run(async () => {
      const data = await api("PATCH", { id, ...fields });
      setVideos((vs) => vs.map((v) => (v.id === id ? data.video : v)));
    });

  const remove = (id: string) =>
    run(async () => {
      await api("DELETE", undefined, `?id=${id}`);
      setVideos((vs) => vs.filter((v) => v.id !== id));
    }, "Đã xoá.");

  const recheck = () =>
    run(async () => {
      const data = await api("POST", { action: "recheck" });
      await load();
      setMsg(`Đã kiểm tra phụ đề ${data.updated} video.`);
    });

  const move = (topicKey: string, index: number, dir: -1 | 1) =>
    run(async () => {
      const group = videos.filter((v) => v.topic === topicKey);
      const j = index + dir;
      if (j < 0 || j >= group.length) return;
      [group[index], group[j]] = [group[j], group[index]];
      await api("POST", { action: "reorder", ids: group.map((v) => v.id) });
      await load();
    });

  // ===== Cổng mật mã =====
  // ===== CMS =====
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-bold text-zinc-400">{videos.length} video · kho luyện nghe</p>
        <div className="flex items-center gap-2">
          <Link href="/listening" className="rounded-full border border-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:text-white">Xem trang ↗</Link>
          <button onClick={recheck} disabled={busy} className="rounded-full bg-primary/20 border border-primary/30 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-primary disabled:opacity-50">
            🔄 Kiểm tra phụ đề
          </button>
        </div>
      </div>

      {msg && <p className="mb-4 rounded-xl bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-300">{msg}</p>}
      {err && <p className="mb-4 rounded-xl bg-rose-500/15 px-4 py-2 text-xs font-bold text-rose-300">{err}</p>}

      {/* Thêm video */}
      <div className="liquid-glass-card mb-8 flex flex-col gap-3 p-5 border border-border/80 shadow-lg sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-[9px] font-black uppercase tracking-wider text-muted">Link / ID YouTube</label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="mt-1 w-full rounded-xl border-2 border-border/60 bg-background/50 px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-wider text-muted">Chủ đề</label>
          <select value={addTopic} onChange={(e) => setAddTopic(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-border/60 bg-background/50 px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary">
            {TOPIC_META.map((t) => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-wider text-muted">Cấp độ</label>
          <select value={addLevel} onChange={(e) => setAddLevel(e.target.value)} className="mt-1 rounded-xl border-2 border-border/60 bg-background/50 px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary">
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button onClick={addVideo} disabled={busy || !link.trim()} className="liquid-glass-btn px-5 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50">+ Thêm</button>
      </div>

      {/* Danh sách theo chủ đề */}
      {TOPIC_META.map((t) => {
        const group = videos.filter((v) => v.topic === t.key);
        return (
          <section key={t.key} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 border-b border-border/30 pb-2 font-display text-sm font-black uppercase tracking-widest text-foreground">
              <span>{t.emoji}</span> {t.label}
              <span className="ml-1 rounded-full border border-border bg-black/5 px-2 py-0.5 text-[9px] text-muted dark:bg-white/5">{group.length}</span>
            </h2>
            {group.length === 0 ? (
              <p className="text-[11px] font-semibold text-muted">Chưa có video.</p>
            ) : (
              <div className="space-y-2">
                {group.map((v, i) => (
                  <div key={v.id} className={`flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-2.5 shadow-sm ${v.hidden ? "opacity-50" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${v.video_id}/default.jpg`} alt="" className="h-10 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <input
                        defaultValue={v.title}
                        onBlur={(e) => e.target.value !== v.title && patch(v.id, { title: e.target.value })}
                        className="w-full truncate bg-transparent text-xs font-bold text-foreground outline-none focus:underline"
                      />
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-[10px] font-semibold text-muted">{v.channel}</span>
                        {v.cc ? <span className="rounded bg-emerald-600/90 px-1.5 text-[8px] font-black text-white">CC</span> : <span className="rounded bg-border px-1.5 text-[8px] font-black text-muted">no CC</span>}
                      </div>
                    </div>
                    <select value={v.topic} onChange={(e) => patch(v.id, { topic: e.target.value })} className="shrink-0 rounded-lg border border-border/60 bg-background/50 px-1.5 py-1 text-[10px] font-bold text-foreground outline-none">
                      {TOPIC_META.map((tt) => <option key={tt.key} value={tt.key}>{tt.label}</option>)}
                    </select>
                    <select value={v.level} onChange={(e) => patch(v.id, { level: e.target.value })} className="shrink-0 rounded-lg border border-border/60 bg-background/50 px-1.5 py-1 text-[10px] font-bold text-foreground outline-none">
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button onClick={() => patch(v.id, { hidden: !v.hidden })} title={v.hidden ? "Hiện" : "Ẩn"} className="shrink-0 rounded-lg px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10">
                      {v.hidden ? "🙈" : "👁"}
                    </button>
                    <div className="flex shrink-0 flex-col">
                      <button onClick={() => move(t.key, i, -1)} disabled={i === 0} className="px-1 text-[10px] text-muted hover:text-foreground disabled:opacity-30">▲</button>
                      <button onClick={() => move(t.key, i, 1)} disabled={i === group.length - 1} className="px-1 text-[10px] text-muted hover:text-foreground disabled:opacity-30">▼</button>
                    </div>
                    <button onClick={() => { if (confirm(`Xoá "${v.title}"?`)) remove(v.id); }} className="shrink-0 rounded-lg px-2 py-1 text-muted hover:bg-rose-500/10 hover:text-rose-600" title="Xoá">✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
