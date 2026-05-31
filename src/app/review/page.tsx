"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { todayKey } from "@/lib/store";
import { isDue, memoryStrength, type Grade } from "@/lib/srs";
import { useAuth } from "@/lib/auth";
import { listNotes, type Note } from "@/lib/notesRepo";
import {
  listNoteReviewStates,
  gradeNote,
  type NoteReviewState,
} from "@/lib/reviewRepo";

type SrsMap = Record<string, NoteReviewState>;

const grades: { g: Grade; label: string; cls: string }[] = [
  { g: "again", label: "Lại", cls: "bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-[0_0_12px_rgba(244,63,94,0.4)]" },
  { g: "hard", label: "Khó", cls: "bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]" },
  { g: "good", label: "Tốt", cls: "bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_12px_rgba(99,102,241,0.4)]" },
  { g: "easy", label: "Dễ", cls: "bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500 hover:text-white hover:shadow-[0_0_12px_rgba(6,182,212,0.4)]" },
];

export default function ReviewPage() {
  const today = todayKey();
  const { userId, ready } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [srs, setSrs] = useState<SrsMap>({});
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

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
  }, [notes, loaded, today, doneCount, srs]);

  const current = queue[0];

  async function grade(g: Grade) {
    if (!current || !userId) return;
    const prev = srs[current.id] ?? null;
    setRevealed(false);
    setDoneCount((c) => c + 1);
    try {
      const next = await gradeNote(userId, current.id, prev, g, today);
      setSrs((m) => ({ ...m, [current.id]: next }));
    } catch (e) {
      console.error("gradeNote", e);
    }
  }

  const totalInReview = notes.filter((n) => n.inReview).length;

  if (!loaded) {
    return (
      <main className="mx-auto max-w-xl px-5 py-12 pt-16 text-center text-muted font-semibold">
        Đang đồng bộ dữ liệu… ⏳
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-12 pt-16 animate-fadeIn">
      <div className="mb-8 flex items-baseline justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-iridescent">Ôn tập thông minh</h1>
          <p className="text-sm font-semibold text-muted mt-1">Giao tiếp phản xạ theo chu kỳ ngắt quãng (SRS)</p>
        </div>
        <span className="text-xs font-bold text-muted bg-white/30 dark:bg-white/5 border border-border px-3 py-1.5 rounded-full">
          🔥 <span className="text-primary font-black">{queue.length}</span> thẻ đến hạn · {totalInReview} tổng
        </span>
      </div>

      {totalInReview === 0 ? (
        <div className="liquid-glass-card py-16 text-center border border-dashed border-border/60 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 rounded-full filter blur-xl pointer-events-none" />
          <p className="text-muted font-bold text-base">Hồ ôn tập hiện đang trống. Hãy lưu từ vựng trong sổ tay trước.</p>
          <Link
            href="/notes"
            className="mt-5 inline-block liquid-glass-btn px-6 py-2.5 text-sm font-bold active:scale-95"
          >
            Đến Sổ tay & Đẩy thẻ ôn tập →
          </Link>
        </div>
      ) : queue.length === 0 ? (
        <div className="liquid-glass-card py-16 px-6 text-center shadow-xl border border-border relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-accent/10 rounded-full filter blur-xl pointer-events-none" />
          <p className="text-5xl mb-4 animate-bounce">🎉</p>
          <p className="text-xl font-extrabold tracking-tight text-foreground">Bạn đã hoàn thành xuất sắc!</p>
          <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
            Hôm nay đã ôn xong <span className="text-accent font-black">{doneCount}</span> thẻ. Hãy quay lại vào ngày mai để tiếp tục phản xạ nhé.
          </p>
        </div>
      ) : (
        <div className="liquid-glass-card p-6 md:p-8 text-center shadow-xl border border-border relative overflow-hidden transition-all duration-500 hover:shadow-2xl">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full filter blur-xl pointer-events-none" />

          {/* Liquid progress tube */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/5 border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                style={{ width: `${(doneCount / (doneCount + queue.length)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-muted shrink-0 bg-white/20 dark:bg-white/5 border border-border px-2.5 py-1 rounded-full">
              {doneCount}/{doneCount + queue.length}
            </span>
          </div>

          <span className={`inline-block rounded-lg border px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${
            current.kind === "structure" 
              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" 
              : "bg-cyan-500/10 border-cyan-500/20 text-accent"
          }`}>
            {current.kind === "structure" ? "Cấu trúc câu" : "Từ / Cụm mới"}
          </span>
          
          <p className="mt-6 text-2xl font-black text-foreground leading-relaxed px-2">{current.content}</p>
          <p className="mt-2 text-sm font-semibold text-muted max-w-xs mx-auto leading-relaxed">
            Đặt nhanh một câu thực tế sử dụng cấu trúc/từ vựng này và phát âm to ra tiếng.
          </p>

          {/* Sức mạnh trí nhớ (FSRS stability) */}
          {(() => {
            const s = srs[current.id];
            const strength = s ? memoryStrength(s) : 0;
            return (
              <div className="mx-auto mt-5 max-w-xs">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
                  <span>🧠 Sức mạnh trí nhớ</span>
                  <span>{s ? `${strength}% · ~${s.interval}d` : "Thẻ mới"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink to-primary transition-all duration-500"
                    style={{ width: `${s ? Math.max(6, strength) : 0}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-8 w-full liquid-glass-btn py-3 text-sm font-bold active:scale-95"
            >
              Hiển thị câu ví dụ gợi ý
            </button>
          ) : (
            <div className="animate-fadeIn">
              <p className="mt-6 rounded-2xl bg-white/10 dark:bg-black/25 border border-border p-4 text-sm italic font-medium leading-relaxed text-foreground/90">
                {current.example ? `“${current.example}”` : "(Thẻ này chưa được chèn câu ví dụ)"}
              </p>
              
              <div className="border-t border-border/40 mt-6 pt-5">
                <p className="mb-4 text-xs font-black uppercase tracking-wider text-muted">Bạn nhớ thẻ này tốt đến mức nào?</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {grades.map(({ g, label, cls }) => (
                    <button
                      key={g}
                      onClick={() => grade(g)}
                      className={`rounded-xl py-2.5 text-xs font-bold transition-all duration-300 scale-100 active:scale-95 ${cls}`}
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

