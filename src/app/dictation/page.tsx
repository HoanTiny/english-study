"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import sentencesData from "@/data/sentences.json";
import YtPlayer, { type YtPlayerHandle } from "@/components/YtPlayer";
import { useAuth } from "@/lib/auth";
import { listSavedVideos, saveVideo, deleteSavedVideo, type SavedVideo } from "@/lib/dictationVideosRepo";
import { LISTEN_TOPICS } from "@/data/listenVideos";

// Gợi ý sẵn: các video từ trang Luyện nghe CÓ phụ đề (chép chính tả được).
const SUGGESTED = LISTEN_TOPICS.flatMap((t) => t.videos)
  .filter((v) => v.cc)
  .map((v) => ({ id: v.id, title: v.title, channel: v.channel, level: v.level }));

type Row = { en: string; vi?: string; topic?: string; start?: number; dur?: number };
const DATA = sentencesData as Row[];
const TOPICS = [...new Set(DATA.map((s) => s.topic).filter(Boolean))] as string[];
type Diff = "easy" | "normal" | "hard";
type Source = "bank" | "yt";

function norm(s: string) {
  return s.toLowerCase().replace(/[.,!?;:"'’()]/g, "");
}
function maskWord(w: string, diff: Diff) {
  const len = w.replace(/[.,!?;:"'’()]/g, "").length;
  if (diff === "easy") return w[0] + "·".repeat(Math.max(0, len - 1));
  if (diff === "hard") return "•••";
  return "·".repeat(Math.max(1, len));
}
function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  window.speechSynthesis.speak(u);
}
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function DictationPage() {
  return (
    <Suspense fallback={null}>
      <DictationInner />
    </Suspense>
  );
}

function DictationInner() {
  const sp = useSearchParams();
  const vParam = sp.get("v");
  const { userId } = useAuth();
  const [source, setSource] = useState<Source>(vParam ? "yt" : "bank");
  const [saved, setSaved] = useState<SavedVideo[]>([]);
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const [diff, setDiff] = useState<Diff>("normal");

  // bank
  const [topic, setTopic] = useState("all");
  // yt
  const [link, setLink] = useState("");
  const [vid, setVid] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const ytRef = useRef<YtPlayerHandle>(null);

  // chung
  const [segs, setSegs] = useState<Row[]>([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [done, setDone] = useState<boolean[]>([]);

  const count = useMemo(
    () => (topic === "all" ? DATA.length : DATA.filter((s) => s.topic === topic).length),
    [topic],
  );

  function begin(rows: Row[], v = "") {
    setSegs(rows);
    setVid(v);
    setIdx(0);
    setTyped("");
    setRevealed(new Set());
    setDone(new Array(rows.length).fill(false));
    setPhase("playing");
  }

  function startBank() {
    const pool = topic === "all" ? DATA : DATA.filter((s) => s.topic === topic);
    const rows = shuffle(pool).slice(0, 8);
    begin(rows);
    setTimeout(() => speak(rows[0].en), 300);
  }

  const refreshSaved = useCallback(() => {
    listSavedVideos()
      .then(setSaved)
      .catch(() => {});
  }, []);

  const fetchYt = useCallback(
    async (value: string) => {
      setErr("");
      setLoading(true);
      try {
        const res = await fetch(`/api/yt-transcript?v=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không lấy được phụ đề.");
        const rows: Row[] = (data.segments as { text: string; start: number; dur: number }[]).map((s) => ({
          en: s.text,
          start: s.start,
          dur: s.dur,
        }));
        if (rows.length === 0) throw new Error("Phụ đề rỗng.");
        // Lưu lại video để lần sau dùng không cần dán link.
        if (userId && data.id) {
          saveVideo(userId, { videoId: data.id, title: data.title ?? "", channel: data.channel ?? "" })
            .then(refreshSaved)
            .catch(() => {});
        }
        begin(rows, data.id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Có lỗi xảy ra.");
      } finally {
        setLoading(false);
      }
    },
    // begin/setX là ổn định; chỉ phụ thuộc userId & refreshSaved
    [userId, refreshSaved],
  );

  async function removeSaved(id: string) {
    setSaved((list) => list.filter((v) => v.id !== id));
    deleteSavedVideo(id).catch(refreshSaved);
  }

  // Nạp danh sách video đã lưu khi đã đăng nhập.
  useEffect(() => {
    if (userId) refreshSaved();
  }, [userId, refreshSaved]);

  // Mở từ trang Luyện nghe với ?v=<id> → tự nạp transcript & bắt đầu
  useEffect(() => {
    if (vParam) {
      setSource("yt");
      setLink(vParam);
      fetchYt(vParam);
    }
  }, [vParam, fetchYt]);

  const cur = segs[idx];
  const words = useMemo(() => (cur ? cur.en.split(/\s+/) : []), [cur]);
  const typedWords = norm(typed).split(/\s+/).filter(Boolean);
  const isDone = done[idx];

  function listen(slow = false) {
    if (!cur) return;
    if (source === "yt") ytRef.current?.playSegment(cur.start ?? 0, cur.dur ?? 3);
    else speak(cur.en, slow ? 0.7 : 0.9);
  }
  function wordState(i: number): "correct" | "revealed" | "wrong" | "hidden" {
    if (revealed.has(i)) return "revealed";
    if (isDone) return typedWords.includes(norm(words[i])) ? "correct" : "wrong";
    return "hidden";
  }
  function check() {
    if (!cur) return;
    setDone((d) => d.map((v, i) => (i === idx ? true : v)));
  }
  function revealAll() {
    setRevealed(new Set(words.map((_, i) => i)));
  }
  function goto(n: number) {
    if (n < 0 || n >= segs.length) return;
    setIdx(n);
    setTyped("");
    setRevealed(new Set());
    setTimeout(() => {
      if (source === "yt") ytRef.current?.playSegment(segs[n].start ?? 0, segs[n].dur ?? 3);
      else speak(segs[n].en);
    }, 200);
  }

  const progress = segs.length ? Math.round((done.filter(Boolean).length / segs.length) * 100) : 0;

  // ===================== SETUP =====================
  if (phase === "setup") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 animate-fadeIn relative">
        <Link href="/listening" className="mb-5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted hover:text-foreground cursor-pointer transition-colors">
          ← Luyện nghe
        </Link>
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-6 md:p-8 text-center border border-border/80 shadow-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md">
          <span className="text-6xl animate-bounce">📝</span>
          <div className="space-y-1">
            <span className="shimmer-edge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
              ⚡ CHÉP CHÍNH TẢ PHẢN XẠ
            </span>
            <h1 className="font-display text-3xl font-extrabold text-foreground mt-3">Nghe chép chính tả</h1>
            <p className="mx-auto max-w-md text-xs sm:text-sm font-semibold text-muted leading-relaxed">
              Luyện thính giác phản xạ từng từ chuẩn xác. Nghe từng phân đoạn → điền lại bản chép.
            </p>
          </div>

          {/* Chọn nguồn */}
          <div className="flex w-full max-w-sm gap-3">
            <button onClick={() => setSource("bank")} className={`flex-1 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer shadow-sm ${source === "bank" ? "bg-primary border-primary text-primary-fg shadow-md scale-102" : "border-border/60 bg-surface/50 text-muted hover:text-foreground hover:scale-[1.02]"}`}>
              📚 Kho câu
            </button>
            <button onClick={() => setSource("yt")} className={`flex-1 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer shadow-sm ${source === "yt" ? "bg-primary border-primary text-primary-fg shadow-md scale-102" : "border-border/60 bg-surface/50 text-muted hover:text-foreground hover:scale-[1.02]"}`}>
              ▶️ YouTube Video
            </button>
          </div>

          {/* Độ khó (chung) */}
          <div className="w-full max-w-sm text-left">
            <label className="text-[9px] font-black uppercase tracking-wider text-muted">Độ khó che chữ</label>
            <div className="mt-2 flex gap-3">
              {(["easy", "normal", "hard"] as Diff[]).map((d) => (
                <button key={d} onClick={() => setDiff(d)} className={`flex-1 rounded-full border py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer shadow-sm ${diff === d ? "bg-primary border-primary text-primary-fg shadow-md scale-102" : "border-border/60 bg-surface/50 text-muted hover:text-foreground"}`}>
                  {d === "easy" ? "Dễ" : d === "normal" ? "Vừa" : "Khó"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-muted leading-normal">
              * Dễ: lộ ký tự đầu · Vừa: che theo độ dài ký tự · Khó: giấu kín toàn bộ ký tự.
            </p>
          </div>

          {source === "bank" ? (
            <div className="w-full max-w-sm space-y-4 text-left">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-muted">Chủ đề từ vựng</label>
                <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4.5 py-3 text-xs font-bold text-foreground outline-none focus:border-primary">
                  <option value="all">Tất cả ({DATA.length} câu)</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <p className="mt-2 text-[10px] font-semibold text-muted">{count} câu khả dụng · mỗi phiên 8 câu ôn</p>
              </div>
              <button onClick={startBank} className="mt-2 w-full liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider shadow-md">Bắt đầu ngay</button>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4 text-left">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-muted">Link liên kết YouTube</label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-2 w-full rounded-2xl border-2 border-border/60 bg-background/50 px-4.5 py-3 text-xs font-bold text-foreground outline-none focus:border-primary shadow-inner"
                />
                <p className="mt-2 text-[10px] font-semibold text-muted leading-normal">Lưu ý: Chỉ khả dụng với video có chứa phụ đề chuẩn của tác giả (CC).</p>
              </div>
              {err && <p className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs font-semibold text-rose-600 mt-2">{err}</p>}
              <button onClick={() => fetchYt(link)} disabled={loading || !link.trim()} className="mt-2 w-full liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50">
                {loading ? "Đang lấy transcript…" : "Tải Transcript & bắt đầu"}
              </button>

              {/* Video đã lưu — bấm để dùng lại, không cần dán link */}
              {saved.length > 0 && (
                <div className="pt-1">
                  <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-muted">Video đã lưu</p>
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {saved.map((v) => (
                      <div key={v.id} className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-surface/50 p-2 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://i.ytimg.com/vi/${v.videoId}/default.jpg`} alt="" className="h-10 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
                        <button
                          onClick={() => { setLink(v.videoId); fetchYt(v.videoId); }}
                          disabled={loading}
                          className="min-w-0 flex-1 cursor-pointer text-left disabled:opacity-50"
                          title="Mở lại video này"
                        >
                          <p className="truncate text-xs font-bold text-foreground">{v.title}</p>
                          {v.channel && <p className="truncate text-[10px] font-semibold text-muted">{v.channel}</p>}
                        </button>
                        <button
                          onClick={() => removeSaved(v.id)}
                          className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-muted hover:bg-rose-500/10 hover:text-rose-600"
                          aria-label="Xoá video đã lưu"
                          title="Xoá khỏi danh sách"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gợi ý từ Luyện nghe (đều có phụ đề) */}
              <div className="pt-1">
                <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-muted">
                  📝 Gợi ý từ Luyện nghe <span className="text-emerald-600">· có phụ đề</span>
                </p>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {SUGGESTED.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setLink(v.id); fetchYt(v.id); }}
                      disabled={loading}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-border/60 bg-surface/50 p-2 text-left shadow-sm transition-all hover:border-primary/50 disabled:opacity-50"
                      title="Dùng video này để chép chính tả"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://i.ytimg.com/vi/${v.id}/default.jpg`} alt="" className="h-10 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-foreground">{v.title}</span>
                        <span className="block truncate text-[10px] font-semibold text-muted">{v.channel} · {v.level}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ===================== PLAYING =====================
  return (
    <main className="mx-auto max-w-6xl px-6 py-6 pt-20 animate-fadeIn relative">
      <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
        <button onClick={() => { setPhase("setup"); ytRef.current?.pause(); }} className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-white/40 dark:bg-black/20 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-muted hover:text-foreground hover:border-primary/50 transition-all duration-300 active:scale-95 shadow-sm cursor-pointer">← Thoát game</button>
        <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-white/40 dark:bg-black/35 p-1.5 text-[9px] font-black uppercase tracking-wider shadow-sm">
          {(["easy", "normal", "hard"] as Diff[]).map((d) => (
            <button key={d} onClick={() => setDiff(d)} className={`rounded-lg px-3 py-1 cursor-pointer transition-all ${diff === d ? "bg-primary text-primary-fg shadow-sm" : "text-muted"}`}>{d === "easy" ? "Dễ" : d === "normal" ? "Vừa" : "Khó"}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.14fr_0.86fr] items-start">
        {/* Cinematic Studio Work Deck */}
        <div className="liquid-glass-card p-5 sm:p-6 border border-border/85 shadow-2xl relative overflow-hidden flex flex-col gap-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl pointer-events-none" />

          {/* YouTube Player Frame */}
          {source === "yt" && vid ? (
            <div className="w-full rounded-2xl overflow-hidden border border-border bg-black/10 shadow-lg max-w-xl mx-auto">
              <YtPlayer ref={ytRef} videoId={vid} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 bg-black/5 dark:bg-white/5 border border-border/40 rounded-2xl shadow-inner">
              <span className="text-5xl animate-bounce">🎧🎙️</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted mt-2">Học nghe chép chính tả kho câu</p>
            </div>
          )}

          {/* Playback Controls Row */}
          <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted">
              Phân đoạn {idx + 1}/{segs.length}
            </span>
            <div className="flex gap-2.5">
              <button 
                onClick={() => listen(false)} 
                className="liquid-glass-btn px-6 py-2.5 text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
              >
                ▶ Nghe đoạn
              </button>
              {source === "bank" && (
                <button 
                  onClick={() => listen(true)} 
                  className="rounded-full border border-border/80 bg-white/50 dark:bg-slate-900/60 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-foreground hover:border-primary/55 hover:bg-primary-soft/20 cursor-pointer active:scale-95 transition-all duration-300 shadow-sm"
                >
                  🐢 Nghe chậm
                </button>
              )}
            </div>
          </div>

          {/* Typing Laboratory */}
          <div>
            <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-muted">Gõ bản chép của bạn ở phía dưới</p>
            <textarea 
              value={typed} 
              onChange={(e) => setTyped(e.target.value)} 
              rows={2} 
              placeholder="Nhập câu tiếng Anh bạn vừa nghe được…" 
              className="w-full resize-none rounded-xl border border-border/80 bg-white/35 dark:bg-black/35 p-3.5 text-xs sm:text-sm font-semibold text-foreground outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/80 focus:bg-white/80 dark:focus:bg-slate-950/80 transition-all placeholder:text-muted/50 shadow-inner leading-relaxed" 
            />

            {/* Spelling dynamic word badges */}
            <div className="mt-3.5 flex flex-wrap gap-2">
              {words.map((w, i) => {
                const st = wordState(i);
                let cls = "border-border bg-white/40 dark:bg-black/20 text-muted shadow-sm";
                if (st === "correct") cls = "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold shadow-sm";
                else if (st === "wrong") cls = "border-pink bg-pink-soft text-pink font-bold shadow-sm";
                else if (st === "revealed") cls = "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold shadow-sm";
                return (
                  <span key={i} className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 transition-all ${cls}`}>
                    {!isDone && st === "hidden" && (
                      <button onClick={() => setRevealed((s) => new Set(s).add(i))} className="text-[10px] opacity-65 hover:opacity-100 cursor-pointer mr-1" title="Hiện từ này">👁</button>
                    )}
                    <span className="text-xs font-semibold tracking-wide leading-none">{st === "hidden" ? maskWord(w, diff) : w}</span>
                  </span>
                );
              })}
            </div>
            
            <p className="mt-2 text-[8px] font-black uppercase tracking-wider text-muted">* Mẹo: Mỗi từ mở bằng nhãn 👁 sẽ không được tính điểm chính xác.</p>

            {/* Vietnamese translation box */}
            {isDone && cur?.vi && (
              <div className="mt-3.5 text-xs sm:text-sm font-bold text-primary bg-primary-soft/80 border border-primary/25 p-3.5 rounded-2xl leading-relaxed shadow-sm">
                💡 Nghĩa Việt: {cur.vi}
              </div>
            )}

            {/* Action Row */}
            <div className="mt-4.5 flex gap-3">
              <button 
                onClick={revealAll} 
                className="flex-1 rounded-full border border-amber-500/30 bg-amber-500/10 py-3.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Hiện tất cả các từ
              </button>
              {!isDone ? (
                <button 
                  onClick={check} 
                  disabled={!typed.trim()} 
                  className="flex-1 liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  Kiểm tra kết quả
                </button>
              ) : (
                <button 
                  onClick={() => goto(idx + 1)} 
                  disabled={idx + 1 >= segs.length} 
                  className="flex-1 liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  Đoạn tiếp theo →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* High-Fidelity DAW Playlist Tracks */}
        <div className="liquid-glass-card flex flex-col p-5 sm:p-6 border border-border/85 shadow-2xl relative overflow-hidden max-h-[560px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-xl pointer-events-none" />
          
          <div className="mb-3.5 flex items-center justify-between border-b border-border/40 pb-3">
            <span className="font-display text-sm font-black uppercase tracking-wider text-foreground">Bản chép chính tả</span>
            <span className="rounded-full bg-primary-soft border border-primary/20 px-3 py-1 text-[9px] font-black text-primary shadow-sm">{progress}% hoàn tất</span>
          </div>
          <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-border border border-border/40 shadow-inner">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {segs.map((s, i) => {
              const ws = s.en.split(/\s+/);
              const active = i === idx;
              return (
                <button
                  key={i}
                  onClick={() => goto(i)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer shadow-sm active:scale-98 ${active ? "border-primary bg-primary-soft" : done[i] ? "border-border/60 bg-white/40 dark:bg-slate-900/30" : "border-border bg-white/20 dark:bg-black/10"}`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted">Đoạn #{i + 1}</span>
                    {done[i] && <span className="text-[9px] text-primary font-black bg-primary-soft border border-primary/10 px-2 py-0.5 rounded-full shadow-sm">✓ Hoàn thành</span>}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold leading-relaxed text-foreground/90">
                    {done[i] ? s.en : ws.map((w) => maskWord(w, diff)).join(" ")}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
