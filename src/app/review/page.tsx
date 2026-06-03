"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { isDue, memoryStrength, type Grade } from "@/lib/srs";
import { useAuth } from "@/lib/auth";
import { listNotes, type Note } from "@/lib/notesRepo";
import { assessPronunciation } from "@/lib/pronunciation";
import PronounceMini from "@/components/PronounceMini";
import {
  listNoteReviewStates,
  gradeNote,
  type NoteReviewState,
} from "@/lib/reviewRepo";

type SrsMap = Record<string, NoteReviewState>;

const grades: { g: Grade; label: string; cls: string }[] = [
  { g: "again", label: "Học lại", cls: "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white hover:border-transparent" },
  { g: "hard", label: "Khó", cls: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white hover:border-transparent" },
  { g: "good", label: "Tốt", cls: "bg-primary-soft/80 border border-primary/20 text-primary hover:bg-primary hover:text-white hover:border-transparent" },
  { g: "easy", label: "Dễ", cls: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-transparent" },
];

export default function ReviewPage() {
  const today = todayKey();
  const { userId, ready } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [srs, setSrs] = useState<SrsMap>({});
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [speakScore, setSpeakScore] = useState<number | null>(null);
  const [sttUnavailable, setSttUnavailable] = useState(false);

  // Tải song song: danh sách note đang ôn + trạng thái SRS từ Supabase.
  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    Promise.all([listNotes(), listNoteReviewStates()])
      .then(([ns, states]) => {
        if (!active) return;
        setNotes(ns);
        setSrs(states);
        setLoaded(true);
      })
      .catch((e) => console.error("load review", e));
    return () => {
      active = false;
    };
  }, [ready, userId]);

  const queue = useMemo(() => {
    if (!loaded) return [];
    return notes
      .filter((n) => n.inReview)
      .filter((n) => {
        const s = srs[n.id];
        return !s || isDue(s, today);
      });
  }, [notes, loaded, today, srs]);

  const current = queue[0];

  async function grade(g: Grade) {
    if (!current || !userId) return;
    const prev = srs[current.id] ?? null;
    setRevealed(false);
    setSpeakScore(null); // reset điểm nói cho thẻ kế
    setDoneCount((c) => c + 1);
    try {
      const next = await gradeNote(userId, current.id, prev, g, today);
      setSrs((m) => ({ ...m, [current.id]: next }));
    } catch (e) {
      console.error("gradeNote", e);
    }
  }

  // Nói thành tiếng & chấm phát âm (Azure). Chỉ áp dụng cho từ/cụm tiếng Anh.
  async function sayIt() {
    if (!current || speaking) return;
    setSpeaking(true);
    setSpeakScore(null);
    try {
      const r = await assessPronunciation(current.content);
      if (r === null) setSttUnavailable(true);
      else setSpeakScore(r.pronunciation);
    } catch {
      setSttUnavailable(true);
    } finally {
      setSpeaking(false);
    }
  }

  const totalInReview = notes.filter((n) => n.inReview).length;

  if (!loaded) {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <p className="text-xs font-black uppercase tracking-wider text-muted animate-pulse">Đang đồng bộ dữ liệu ôn tập… ⏳</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-16 animate-fadeIn relative">
      <div className="mb-8 flex items-baseline justify-between border-b border-border/40 pb-4.5">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary-soft/80 border border-primary/10 px-3.5 py-1.5 rounded-full inline-flex self-start mb-2">
            🔁 ÔN TẬP SRS THÔNG MINH
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1.5">Học tập thông minh</h1>
          <p className="text-xs font-semibold text-muted mt-1">Ôn tập ngắt quãng tối ưu hóa phản xạ tự nhiên</p>
        </div>
        <span className="text-[10px] font-black text-muted bg-surface border border-border px-3.5 py-2 rounded-full shadow-sm shrink-0">
          🔥 <span className="text-primary font-black">{queue.length}</span> thẻ đến hạn
        </span>
      </div>

      {totalInReview === 0 ? (
        <div className="liquid-glass-card py-16 text-center border border-dashed border-border/60 bg-white/10 dark:bg-black/10 relative overflow-hidden">
          <p className="text-muted font-semibold text-sm">Hồ ôn tập hiện tại của bạn đang trống. Hãy thêm từ vựng từ Sổ tay.</p>
          <Link
            href="/notes"
            className="mt-6 inline-block liquid-glass-btn px-8 py-3.5 text-xs font-black uppercase tracking-wider active:scale-95"
          >
            Đến Sổ tay & Đẩy thẻ ôn tập →
          </Link>
        </div>
      ) : queue.length === 0 ? (
        <div className="liquid-glass-card py-16 px-6 text-center shadow-xl border border-border bg-white/10 dark:bg-black/10 relative overflow-hidden">
          <p className="text-5xl mb-4 animate-bounce">🎉</p>
          <p className="text-xl font-extrabold tracking-tight text-foreground">Tuyệt vời! Bạn đã hoàn thành!</p>
          <p className="mt-2.5 text-xs font-semibold text-muted leading-relaxed max-w-sm mx-auto">
            Hôm nay bạn đã ôn tập xuất sắc toàn bộ <span className="text-accent font-black">{doneCount}</span> thẻ đến hạn. Hãy quay lại vào ngày mai để tiếp tục phản xạ nhé!
          </p>
        </div>
      ) : (
        <div className="liquid-glass-card p-6 md:p-8 text-center shadow-2xl border border-border/80 relative overflow-hidden transition-all duration-500 bg-white/30 dark:bg-black/20 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-xl pointer-events-none" />

          {/* Liquid progress tube */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/5 border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                style={{ width: `${(doneCount / (doneCount + queue.length)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-muted shrink-0 bg-surface border border-border px-2.5 py-1 rounded-full shadow-sm">
              {doneCount}/{doneCount + queue.length}
            </span>
          </div>

          <span className={`inline-block rounded-full border px-3.5 py-1 text-[8.5px] font-black uppercase tracking-wider ${
            current.kind === "structure" 
              ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" 
              : "bg-primary-soft/80 border-primary/20 text-primary"
          }`}>
            {current.kind === "structure" ? "Cấu trúc câu" : "Từ vựng / Cụm từ"}
          </span>
          
          <p className="mt-6 text-2xl font-extrabold text-foreground leading-relaxed px-2 tracking-tight">{current.content}</p>
          <div className="mt-2 flex justify-center">
            <PronounceMini text={current.content} />
          </div>
          <p className="mt-2.5 text-xs font-semibold text-muted max-w-xs mx-auto leading-relaxed">
            Nói to cụm từ này, đặt một câu ví dụ thực tế liên quan để tạo phản xạ nói.
          </p>

          {/* Sức mạnh trí nhớ (FSRS stability) */}
          {(() => {
            const s = srs[current.id];
            const strength = s ? memoryStrength(s) : 0;
            return (
              <div className="mx-auto mt-6 max-w-xs border-t border-border/40 pt-5">
                <div className="mb-2 flex items-center justify-between text-[8.5px] font-black uppercase tracking-wider text-muted">
                  <span>🧠 Sức mạnh ghi nhớ FSRS</span>
                  <span>{s ? `${strength}% · ~${s.interval}d` : "Thẻ mới tinh"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border shadow-inner border border-border/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink to-primary transition-all duration-500"
                    style={{ width: `${s ? Math.max(8, strength) : 0}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-8 w-full liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider active:scale-95"
            >
              Hiển thị câu ví dụ gợi ý
            </button>
          ) : (
            <div className="animate-fadeIn">
              <p className="mt-6 rounded-2xl bg-white/40 dark:bg-black/25 border border-border p-4 text-xs italic font-semibold leading-relaxed text-foreground/90 shadow-sm">
                {current.example ? `“${current.example}”` : "(Chưa có câu ví dụ minh họa)"}
              </p>

              {/* Nói thành tiếng & chấm phát âm */}
              {!sttUnavailable && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <button
                    onClick={sayIt}
                    disabled={speaking}
                    className={`rounded-full px-5 py-2.5 text-xs font-black transition-all active:scale-95 ${speaking ? "bg-rose-500 text-white animate-pulse" : "bg-primary-soft border border-primary/25 text-primary hover:bg-primary/15"}`}
                  >
                    {speaking ? "🎙️ Đang nghe… nói cụm trên" : "🎤 Nói thử & chấm phát âm"}
                  </button>
                  {speakScore != null && (
                    <div className="flex items-center gap-2 text-xs font-black">
                      <span className={speakScore >= 80 ? "text-emerald-500" : speakScore >= 60 ? "text-amber-500" : "text-rose-500"}>
                        Phát âm: {speakScore}/100
                      </span>
                      <span className="text-muted font-semibold">
                        {speakScore >= 80 ? "· Tốt! 👍" : speakScore >= 60 ? "· Khá, nói lại cho chuẩn hơn" : "· Cần luyện thêm"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-border/40 mt-6 pt-5">
                <p className="mb-4 text-[9px] font-black uppercase tracking-wider text-muted">Bạn nhớ thẻ này ở mức độ nào?</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {grades.map(({ g, label, cls }) => (
                    <button
                      key={g}
                      onClick={() => grade(g)}
                      className={`rounded-xl py-3 text-xs font-black transition-all duration-300 scale-100 active:scale-95 cursor-pointer shadow-sm ${cls}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
