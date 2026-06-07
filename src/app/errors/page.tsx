"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listErrors, setResolved, deleteError, type ErrorRow } from "@/lib/errorLogRepo";

const SOURCES = [
  { key: "all", label: "Tất cả" },
  { key: "journal", label: "📔 Nhật ký" },
  { key: "roleplay", label: "🎙️ Hội thoại" },
  { key: "grammar", label: "📚 Ngữ pháp" },
] as const;

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export default function ErrorsPage() {
  const { userId, ready } = useAuth();
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [hideResolved, setHideResolved] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!userId) { setLoaded(true); return; }
    let active = true;
    listErrors()
      .then((r) => { if (active) setRows(r); })
      .catch((e) => console.error("listErrors", e))
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [ready, userId]);

  const filtered = useMemo(
    () => rows.filter((r) => (filter === "all" || r.source === filter) && (!hideResolved || !r.resolved)),
    [rows, filter, hideResolved],
  );
  const unresolved = rows.filter((r) => !r.resolved).length;

  async function toggle(r: ErrorRow) {
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, resolved: !x.resolved } : x)));
    await setResolved(r.id, !r.resolved);
  }
  async function remove(r: ErrorRow) {
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    await deleteError(r.id);
  }

  const srcLabel = (s: string) => SOURCES.find((x) => x.key === s)?.label ?? s;

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 animate-fadeIn">
      <h1 className="font-display text-3xl font-black text-gradient-iridescent">Sổ lỗi cá nhân</h1>
      <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
        Tổng hợp lỗi từ nhật ký, hội thoại AI và luyện ngữ pháp — ôn lại để không lặp lại. Còn <b className="text-foreground">{unresolved}</b> lỗi chưa nắm.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {SOURCES.map((s) => (
          <button key={s.key} onClick={() => setFilter(s.key)} className={`rounded-full border px-3 py-1.5 text-xs font-black transition-all ${filter === s.key ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-foreground hover:border-primary/40"}`}>{s.label}</button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-muted cursor-pointer">
          <input type="checkbox" checked={hideResolved} onChange={(e) => setHideResolved(e.target.checked)} />
          Ẩn lỗi đã nắm
        </label>
      </div>

      {!loaded ? (
        <div className="mt-10 text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border/60 py-14 text-center">
          <p className="text-sm font-bold text-muted">
            {rows.length === 0 ? "Chưa có lỗi nào — viết nhật ký hoặc luyện hội thoại AI, lỗi sẽ tự gom về đây." : "Không có lỗi nào ở mục này 🎉"}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className={`rounded-2xl border p-4 shadow-sm transition-colors ${r.resolved ? "border-border/40 bg-surface/30 opacity-60" : "border-border/70 bg-surface/60"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="rounded-full bg-black/5 dark:bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted">{srcLabel(r.source)}</span>
                {r.resolved && <span className="text-[9px] font-black text-emerald-500">✓ đã nắm</span>}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => speak(r.correction)} title="Nghe câu đúng" className="text-sm hover:scale-110 transition-transform">🔊</button>
                  <button onClick={() => toggle(r)} className={`text-[10px] font-black px-2 py-1 rounded-lg ${r.resolved ? "bg-white/5 text-muted" : "bg-emerald-500/15 text-emerald-500"}`}>{r.resolved ? "Bỏ đánh dấu" : "✓ Đã nắm"}</button>
                  <button onClick={() => remove(r)} className="text-xs font-black text-rose-400">✕</button>
                </div>
              </div>
              {r.original && <p className="text-sm font-bold text-rose-500/90 line-through">{r.original}</p>}
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">→ {r.correction}</p>
              {r.note && <p className="mt-0.5 text-xs font-semibold text-muted">{r.note}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
