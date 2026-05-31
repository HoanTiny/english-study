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
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-20 backdrop-blur-sm" onClick={onClose}>
      <div className="liquid-glass-card w-full max-w-xl overflow-hidden bg-surface" onClick={(e) => e.stopPropagation()}>
        {/* Header + ô tìm */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="font-display text-lg text-foreground">🔎 Từ điển</span>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Đóng">✕</button>
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Nhập từ tiếng Anh hoặc tiếng Việt…"
              className="w-full rounded-full border-2 border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
            />
            <button onClick={() => search()} disabled={loading || !q.trim()} className="liquid-glass-btn shrink-0 px-5 py-2.5 text-sm font-bold disabled:opacity-50">
              {loading ? "…" : "Tra"}
            </button>
          </div>

          <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {note && <p className="py-4 text-center text-sm font-semibold text-muted">{note}</p>}
            {results?.map((s, i) => {
              const isSaved = saved.has(s.en + s.vi);
              return (
                <div key={i} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg text-foreground">{s.en}</span>
                        {s.pos && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">{s.pos}</span>}
                      </div>
                      {/* audio UK/US */}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {s.uk?.audio || s.us?.audio ? (
                          <>
                            {s.uk && <button onClick={() => play(s.uk!.audio, s.en)} className="text-xs font-bold text-primary hover:underline">🔊 UK {s.uk.ipa && <span className="font-medium text-muted">{s.uk.ipa}</span>}</button>}
                            {s.us && <button onClick={() => play(s.us!.audio, s.en)} className="text-xs font-bold text-primary hover:underline">🔊 US {s.us.ipa && <span className="font-medium text-muted">{s.us.ipa}</span>}</button>}
                          </>
                        ) : (
                          <button onClick={() => play(undefined, s.en)} className="text-xs font-bold text-primary hover:underline">🔊 Nghe {s.ipa && <span className="font-medium text-muted">{s.ipa}</span>}</button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => save(s)}
                      disabled={isSaved}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${isSaved ? "bg-primary-soft text-primary" : "liquid-glass-btn"}`}
                    >
                      {isSaved ? "✓ Đã lưu" : "+ Lưu"}
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-bold text-foreground">{s.vi}</p>
                  {s.definition && <p className="mt-0.5 text-xs text-muted">{s.definition}</p>}
                  {s.example && (
                    <div className="mt-2 border-l-2 border-primary/30 pl-2.5">
                      <p className="text-xs font-semibold italic text-foreground/90">{s.example}</p>
                      {s.exampleVi && <p className="text-[11px] text-muted">{s.exampleVi}</p>}
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
