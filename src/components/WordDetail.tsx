"use client";

import { useState } from "react";

type Sense = { pos?: string; vi?: string; definition?: string; example?: string; exampleVi?: string };
type Family = { word: string; pos?: string; vi?: string };

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// Nút mở rộng: tra /api/dict để hiện LOẠI TỪ + các NGHĨA khác + HỌ TỪ (lazy).
export default function WordDetail({ word }: { word: string }) {
  const [open, setOpen] = useState(false);
  const [senses, setSenses] = useState<Sense[] | null>(null);
  const [family, setFamily] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (senses || loading) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/dict?q=${encodeURIComponent(word)}`);
      const d = await r.json();
      if (d.source === "unconfigured") setErr("Chưa cấu hình từ điển AI.");
      else if (d.source === "overloaded") setErr("Từ điển đang quá tải, thử lại sau.");
      else if (!d.results?.length) setErr("Không tìm thấy nghĩa khác.");
      else {
        setSenses(d.results as Sense[]);
        setFamily((d.family as Family[]) ?? []);
      }
    } catch {
      setErr("Không tải được.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2.5">
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted transition-all hover:border-primary/50 hover:text-primary"
      >
        📖 Loại từ & nghĩa khác {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-2 space-y-2 animate-fadeIn">
          {loading && <p className="text-[11px] font-semibold text-muted animate-pulse">Đang tra…</p>}
          {err && <p className="text-[11px] font-semibold text-muted">{err}</p>}

          {/* Họ từ liên quan */}
          {family.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-primary-soft/20 p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">🧩 Họ từ liên quan</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {family.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => speak(f.word)}
                    className="flex flex-col items-start rounded-lg border border-border/50 bg-surface/70 px-2.5 py-1.5 text-left transition-all hover:border-primary/50 hover:bg-primary-soft/30 active:scale-95"
                    title="Bấm để nghe"
                  >
                    <span className="flex items-center gap-1">
                      <span className="text-[12px] font-bold text-foreground">{f.word}</span>
                      {f.pos && <span className="rounded bg-indigo-500/10 px-1 text-[9px] font-black text-indigo-500">{f.pos}</span>}
                    </span>
                    {f.vi && <span className="mt-0.5 text-[10px] font-medium text-muted leading-tight">{f.vi}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {senses?.map((s, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-black/[0.03] dark:bg-white/5 p-3">
              <div className="flex items-center gap-2">
                {s.pos && (
                  <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                    {s.pos}
                  </span>
                )}
                {s.vi && <span className="text-sm font-bold text-foreground">{s.vi}</span>}
              </div>
              {s.definition && <p className="mt-1 text-[11px] font-medium text-muted leading-relaxed">{s.definition}</p>}
              {s.example && (
                <p className="mt-1.5 text-[11px] italic text-muted/90">
                  “{s.example}”{s.exampleVi ? ` — ${s.exampleVi}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
