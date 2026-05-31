"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import sentencesData from "@/data/sentences.json";
import YtPlayer, { type YtPlayerHandle } from "@/components/YtPlayer";

// NGHE CHÉP CHÍNH TẢ kiểu Parroto. 2 nguồn:
//  • Kho câu (TTS): audio tổng hợp + câu của app — hợp lệ 100%, ổn định.
//  • Video YouTube: dán link video CÓ phụ đề → lấy transcript, đồng bộ player.
// Cả 2 dùng chung: ô che TỪNG TỪ (👁 để lộ), độ khó Easy/Normal/Hard, thanh Bản chép + %.

type Row = { en: string; vi?: string; topic?: string; start?: number; dur?: number };
const DATA = sentencesData as Row[];
const TOPICS = [...new Set(DATA.map((s) => s.topic).filter(Boolean))] as string[];
type Diff = "easy" | "normal" | "hard";
type Source = "bank" | "yt";

function norm(w: string) {
  return w.toLowerCase().replace(/[.,!?;:"'’()]/g, "");
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
  const [source, setSource] = useState<Source>(vParam ? "yt" : "bank");
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

  async function fetchYt(value: string) {
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
      begin(rows, data.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  // Mở từ trang Luyện nghe với ?v=<id> → tự nạp transcript & bắt đầu
  useEffect(() => {
    if (vParam) {
      setSource("yt");
      setLink(vParam);
      fetchYt(vParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vParam]);

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
      <main className="mx-auto max-w-2xl px-6 py-12 pt-16 animate-fadeIn">
        <Link href="/listening" className="mb-4 inline-block text-xs font-bold text-muted hover:text-foreground">← Luyện nghe</Link>
        <div className="liquid-glass-card flex flex-col items-center gap-6 p-8 text-center">
          <span className="text-6xl">📝</span>
          <div className="space-y-2">
            <h1 className="font-display text-3xl text-foreground">Chép chính tả</h1>
            <p className="mx-auto max-w-md text-sm font-medium text-muted">
              Nghe từng đoạn → gõ lại. Ô che <b>từng từ</b> (bấm 👁 để lộ), 3 mức độ khó, thanh bản chép & tiến độ.
            </p>
          </div>

          {/* Chọn nguồn */}
          <div className="flex w-full max-w-sm gap-2">
            <button onClick={() => setSource("bank")} className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${source === "bank" ? "border-primary bg-primary text-white" : "border-border text-muted hover:text-foreground"}`}>
              📚 Kho câu (TTS)
            </button>
            <button onClick={() => setSource("yt")} className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${source === "yt" ? "border-primary bg-primary text-white" : "border-border text-muted hover:text-foreground"}`}>
              ▶️ Video YouTube
            </button>
          </div>

          {/* Độ khó (chung) */}
          <div className="w-full max-w-sm text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Độ khó</label>
            <div className="mt-1 flex gap-2">
              {(["easy", "normal", "hard"] as Diff[]).map((d) => (
                <button key={d} onClick={() => setDiff(d)} className={`flex-1 rounded-xl border-2 py-2 text-sm font-bold capitalize transition-all ${diff === d ? "border-primary bg-primary text-white" : "border-border text-muted hover:text-foreground"}`}>
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted">Easy: hiện chữ cái đầu · Normal: che theo độ dài · Hard: giấu cả độ dài.</p>
          </div>

          {source === "bank" ? (
            <div className="w-full max-w-sm space-y-3 text-left">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Chủ đề</label>
                <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary">
                  <option value="all">Tất cả ({DATA.length} câu)</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <p className="mt-1 text-xs font-semibold text-muted">{count} câu khả dụng · mỗi phiên 8 câu</p>
              </div>
              <button onClick={startBank} className="liquid-glass-btn w-full py-3.5 text-sm font-bold">Bắt đầu nghe →</button>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-3 text-left">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Link video YouTube</label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1 w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                />
                <p className="mt-1 text-[11px] text-muted">Chỉ chạy với video <b>có phụ đề</b> (CC). Phục vụ học cá nhân.</p>
              </div>
              {err && <p className="rounded-xl bg-pink-soft px-3 py-2 text-xs font-semibold text-pink">{err}</p>}
              <button onClick={() => fetchYt(link)} disabled={loading || !link.trim()} className="liquid-glass-btn w-full py-3.5 text-sm font-bold disabled:opacity-50">
                {loading ? "Đang lấy phụ đề…" : "Lấy phụ đề & bắt đầu →"}
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ===================== PLAYING =====================
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pt-16 animate-fadeIn">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => { setPhase("setup"); ytRef.current?.pause(); }} className="text-xs font-bold text-muted hover:text-foreground">← Thoát</button>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-0.5 text-xs font-bold">
          {(["easy", "normal", "hard"] as Diff[]).map((d) => (
            <button key={d} onClick={() => setDiff(d)} className={`rounded-lg px-3 py-1 capitalize ${diff === d ? "bg-primary text-white" : "text-muted"}`}>{d}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Trái + giữa */}
        <div className="space-y-4">
          <div className="liquid-glass-card flex flex-col items-center gap-4 p-6 text-center">
            {source === "yt" && vid ? (
              <YtPlayer ref={ytRef} videoId={vid} />
            ) : (
              <span className="text-5xl">🐤🎧</span>
            )}
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Đoạn {idx + 1}/{segs.length}</p>
            <div className="flex gap-3">
              <button onClick={() => listen(false)} className="liquid-glass-btn px-6 py-2.5 text-sm font-bold">▶ Nghe đoạn</button>
              {source === "bank" && (
                <button onClick={() => listen(true)} className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-bold text-foreground hover:border-primary/50">🐢 Chậm</button>
              )}
            </div>
          </div>

          <div className="liquid-glass-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Gõ những gì bạn nghe được</p>
            <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={2} placeholder="Gõ câu trả lời của bạn ở đây…" className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-primary" />

            <div className="mt-4 flex flex-wrap gap-2">
              {words.map((w, i) => {
                const st = wordState(i);
                const cls =
                  st === "correct" ? "border-primary bg-primary-soft text-primary"
                  : st === "wrong" ? "border-pink bg-pink-soft text-pink"
                  : st === "revealed" ? "border-amber-400 bg-amber-400/15 text-amber-600"
                  : "border-border bg-surface text-muted";
                return (
                  <span key={i} className={`flex flex-col items-center rounded-lg border px-2 py-1 ${cls}`}>
                    {!isDone && st === "hidden" && (
                      <button onClick={() => setRevealed((s) => new Set(s).add(i))} className="text-[10px] opacity-60 hover:opacity-100" title="Hiện từ này">👁</button>
                    )}
                    <span className="text-sm font-bold tracking-wide">{st === "hidden" ? maskWord(w, diff) : w}</span>
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted">Từ bấm 👁 (tiết lộ) sẽ không được tính điểm.</p>

            {isDone && cur?.vi && <p className="mt-2 text-sm font-medium text-muted">Nghĩa: {cur.vi}</p>}

            <div className="mt-4 flex flex-col gap-2">
              <button onClick={revealAll} className="rounded-xl border border-amber-400/50 bg-amber-400/10 py-2.5 text-sm font-bold text-amber-600 hover:bg-amber-400/20">Hiện tất cả từ</button>
              {!isDone ? (
                <button onClick={check} disabled={!typed.trim()} className="liquid-glass-btn py-3 text-sm font-bold disabled:opacity-50">Kiểm tra</button>
              ) : (
                <button onClick={() => goto(idx + 1)} disabled={idx + 1 >= segs.length} className="liquid-glass-btn py-3 text-sm font-bold disabled:opacity-50">Tiếp theo →</button>
              )}
            </div>
          </div>
        </div>

        {/* Phải: BẢN CHÉP */}
        <div className="liquid-glass-card flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-lg text-foreground">Bản chép</span>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">{progress}%</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {segs.map((s, i) => {
              const ws = s.en.split(/\s+/);
              return (
                <button
                  key={i}
                  onClick={() => goto(i)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition-all ${i === idx ? "border-primary bg-primary-soft/40" : done[i] ? "border-border bg-surface" : "border-border bg-background"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted">#{i + 1}</span>
                    {done[i] && <span className="text-xs text-primary">✓</span>}
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-foreground/90">
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
