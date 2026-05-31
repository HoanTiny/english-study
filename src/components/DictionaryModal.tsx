"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addNote } from "@/lib/notesRepo";
import { isSingleWord } from "@/lib/pronounce";

type Accent = { ipa?: string; audio?: string };
type Sense = {
  en: string; pos: string; vi: string; definition: string; example: string; exampleVi: string;
  ipa?: string; us?: Accent; uk?: Accent;
};

function play(url?: string, fallback?: string) {
  if (url) { new Audio(url).play().catch(() => {}); return; }
  if (typeof window !== "undefined" && window.speechSynthesis && fallback) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(fallback);
    u.lang = "en-US"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
}

export default function DictionaryModal({
  open,
  onClose,
  initialQuery,
}: {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}) {
  const { userId } = useAuth();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Sense[] | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Mở kèm từ bôi đen → tự điền + tra ngay.
  useEffect(() => {
    if (open && initialQuery) {
      setQ(initialQuery);
      search(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  async function search(termArg?: string) {
    const term = (termArg ?? q).trim();
    if (!term) return;
    setLoading(true);
    setResults(null);
    setNote("");
    try {
      const res = await fetch(`/api/dict?q=${encodeURIComponent(term)}`);
      const d = await res.json();
      if (d.source === "unconfigured") setNote("Cần cấu hình GEMINI_API_KEY để tra từ điển.");
      else if (d.source === "overloaded") setNote("Hệ thống dịch đang quá tải (hết lượt miễn phí). Thử lại sau ít phút — hoặc tra từ tiếng Anh để xem định nghĩa.");
      else if (!d.results?.length) setNote("Không tìm thấy. Thử từ khác.");
      setResults(d.results ?? []);
    } catch {
      setNote("Lỗi mạng, thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  async function save(s: Sense) {
    if (!userId) { setNote("Cần đăng nhập để lưu."); return; }
    try {
      await addNote(userId, {
        kind: isSingleWord(s.en) ? "word" : "structure",
        content: s.en,
        meaning: s.vi ?? "",
        example: s.example ?? "",
        tags: ["Từ điển"],
        inReview: true,
      });
      setSaved((p) => new Set(p).add(s.en + s.vi));
    } catch {
      setNote("Lỗi khi lưu.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div className="liquid-glass-card w-full max-w-xl overflow-hidden bg-surface shadow-2xl border border-border/80" onClick={(e) => e.stopPropagation()}>
        {/* Header + ô tìm */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4.5">
          <span className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <span>🔎</span> Tra cứu từ điển
          </span>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer" aria-label="Đóng">✕</button>
        </div>
        <div className="p-6">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Nhập từ tiếng Anh hoặc tiếng Việt…"
              className="w-full rounded-full border-2 border-border/60 bg-background/50 px-5 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
            <button onClick={() => search()} disabled={loading || !q.trim()} className="liquid-glass-btn shrink-0 px-6 py-3 text-xs font-black disabled:opacity-50">
              {loading ? "Đang tra…" : "Tìm kiếm"}
            </button>
          </div>

          <div className="mt-6 max-h-[50vh] space-y-4 overflow-y-auto pr-1">
            {note && <p className="py-6 text-center text-sm font-semibold text-muted bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-border/60">{note}</p>}
            {results?.map((s, i) => {
              const isSaved = saved.has(s.en + s.vi);
              return (
                <div key={i} className="rounded-2xl border border-border/60 bg-background/40 p-5 shadow-sm hover:border-primary/40 transition-all duration-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-display text-lg font-bold text-foreground">{s.en}</span>
                        {s.pos && <span className="rounded-full bg-primary-soft/80 border border-primary/10 px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-primary">{s.pos}</span>}
                      </div>
                      {/* audio UK/US */}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {s.uk?.audio || s.us?.audio ? (
                          <>
                            {s.uk && <button onClick={() => play(s.uk!.audio, s.en)} className="text-xs font-black text-primary hover:underline flex items-center gap-1 cursor-pointer">🔊 UK {s.uk.ipa && <span className="font-bold text-muted">/{s.uk.ipa}/</span>}</button>}
                            {s.us && <button onClick={() => play(s.us!.audio, s.en)} className="text-xs font-black text-primary hover:underline flex items-center gap-1 cursor-pointer">🔊 US {s.us.ipa && <span className="font-bold text-muted">/{s.us.ipa}/</span>}</button>}
                          </>
                        ) : (
                          <button onClick={() => play(undefined, s.en)} className="text-xs font-black text-primary hover:underline flex items-center gap-1 cursor-pointer">🔊 Nghe {s.ipa && <span className="font-bold text-muted">/{s.ipa}/</span>}</button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => save(s)}
                      disabled={isSaved}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition-all cursor-pointer ${isSaved ? "bg-primary-soft text-primary border border-primary/20" : "liquid-glass-btn"}`}
                    >
                      {isSaved ? "✓ Đã lưu" : "+ Thêm"}
                    </button>
                  </div>
                  {s.vi && <p className="mt-3.5 text-sm font-bold text-foreground">{s.vi}</p>}
                  {s.definition && <p className="mt-1 text-xs font-semibold text-muted leading-relaxed">{s.definition}</p>}
                  {s.example && (
                    <div className="mt-3.5 border-l-2 border-primary/40 pl-3.5 py-0.5">
                      <p className="text-xs font-semibold italic text-foreground/90 leading-relaxed">“{s.example}”</p>
                      {s.exampleVi && <p className="text-[10px] font-bold text-muted mt-1 leading-relaxed">{s.exampleVi}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
