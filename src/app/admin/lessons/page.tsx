"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  cefr: string;
  stage: number;
  order_index: number;
  visible: boolean;
  audio_url: string | null;
  phraseCount: number;
};
type Phrase = {
  id?: string;
  en: string;
  vi: string;
  ipa: string;
  example: string;
  audio_url: string | null;
};
type LessonFull = {
  id: string;
  slug: string;
  title: string;
  cefr: string;
  intro: string | null;
  tip: string | null;
  stage: number;
  order_index: number;
  youtube_id: string | null;
  visible: boolean;
  audio_url: string | null;
};

export default function AdminLessonsPage() {
  const { key } = useAdminAuth();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // editor state
  const [editing, setEditing] = useState<LessonFull | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [uploading, setUploading] = useState<string | null>(null); // "lesson" | phrase id

  const api = useCallback(
    async (method: string, body?: unknown, qs = "") => {
      const res = await fetch(`/api/admin/lessons${qs}`, {
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
    setLessons(data.lessons ?? []);
  }, [api]);

  // Đã đăng nhập ở layout → nạp danh sách ngay khi có key.
  useEffect(() => {
    if (key) load().catch((e) => setErr(e instanceof Error ? e.message : "Lỗi tải."));
  }, [key, load]);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(""), 2500);
  }

  async function openEdit(slug: string) {
    setErr("");
    try {
      const data = await api("GET", undefined, `?slug=${encodeURIComponent(slug)}`);
      setEditing(data.lesson);
      setPhrases(
        (data.phrases ?? []).map((p: Phrase) => ({
          id: p.id,
          en: p.en ?? "",
          vi: p.vi ?? "",
          ipa: p.ipa ?? "",
          example: p.example ?? "",
          audio_url: p.audio_url ?? null,
        })),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được bài.");
    }
  }

  function newLesson() {
    setEditing({
      id: "", slug: "", title: "", cefr: "A1", intro: "", tip: "",
      stage: 1, order_index: 99, youtube_id: "", visible: true, audio_url: null,
    });
    setPhrases([]);
  }

  async function saveLesson() {
    if (!editing) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api("POST", { action: "saveLesson", lesson: editing });
      const lessonId = r.id as string;
      await api("POST", { action: "savePhrases", lessonId, phrases });
      flash("Đã lưu bài ✓");
      await load();
      // reload editor để có id
      await openEdit(editing.slug);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(l: LessonRow) {
    try {
      await api("POST", { action: "toggleVisible", id: l.id, visible: !l.visible });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi.");
    }
  }

  async function uploadAudio(target: "lesson" | "phrase", id: string, file: File) {
    setErr("");
    if (!id) {
      setErr("Hãy bấm “Lưu bài + cụm” trước, rồi mới tải audio.");
      return;
    }
    setUploading(target === "lesson" ? "lesson" : id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target", target);
      fd.append("id", id);
      const res = await fetch("/api/admin/lesson-audio", {
        method: "POST",
        headers: { "x-admin-key": key },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload lỗi");
      flash("Đã tải audio ✓");
      if (editing) await openEdit(editing.slug);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload thất bại.");
    } finally {
      setUploading(null);
    }
  }

  function setPhrase(i: number, field: keyof Phrase, val: string) {
    setPhrases((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-bold text-zinc-400">{lessons.length} bài · quản lý nội dung & audio</p>
        {!editing && (
          <button onClick={newLesson} className="rounded-xl bg-primary text-primary-fg px-4 py-2 text-xs font-black active:scale-95">+ Bài mới</button>
        )}
      </div>
      {msg && <p className="mb-3 rounded-lg bg-teal-500/15 px-3 py-2 text-xs font-black text-teal-300">{msg}</p>}
      {err && <p className="mb-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-black text-rose-300">{err}</p>}

      {/* Danh sách */}
      {!editing && (
        <div className="space-y-2">
          {lessons.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/60 dark:bg-zinc-900/50 px-4 py-3">
              <span className="text-[10px] font-black text-muted w-8">GĐ{l.stage}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{l.title} <span className="text-[10px] text-muted">({l.slug})</span></p>
                <p className="text-[10px] text-muted">{l.cefr} · {l.phraseCount} cụm {l.audio_url ? "· 🔊 audio" : ""}</p>
              </div>
              <button onClick={() => toggleVisible(l)} className={`text-[10px] font-black px-2 py-1 rounded-lg ${l.visible ? "bg-teal-500/10 text-teal-600" : "bg-black/10 text-muted"}`}>
                {l.visible ? "Hiện" : "Ẩn"}
              </button>
              <button onClick={() => openEdit(l.slug)} className="text-xs font-black text-primary">Sửa →</button>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="space-y-5">
          <button onClick={() => setEditing(null)} className="text-xs font-black text-muted">← Danh sách</button>

          <div className="grid sm:grid-cols-2 gap-3">
            <L label="Slug (duy nhất)"><input className="inp" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></L>
            <L label="Tiêu đề"><input className="inp" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></L>
            <L label="CEFR"><input className="inp" value={editing.cefr} onChange={(e) => setEditing({ ...editing, cefr: e.target.value })} /></L>
            <L label="Giai đoạn (1-4)"><input type="number" className="inp" value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: +e.target.value })} /></L>
            <L label="Thứ tự"><input type="number" className="inp" value={editing.order_index} onChange={(e) => setEditing({ ...editing, order_index: +e.target.value })} /></L>
            <L label="YouTube ID (tuỳ chọn)"><input className="inp" value={editing.youtube_id ?? ""} onChange={(e) => setEditing({ ...editing, youtube_id: e.target.value })} /></L>
          </div>
          <L label="Giới thiệu"><textarea className="inp" rows={2} value={editing.intro ?? ""} onChange={(e) => setEditing({ ...editing, intro: e.target.value })} /></L>
          <L label="Mẹo học"><textarea className="inp" rows={2} value={editing.tip ?? ""} onChange={(e) => setEditing({ ...editing, tip: e.target.value })} /></L>

          {/* Audio cả bài */}
          <div className="rounded-2xl border border-border/60 p-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-black flex-1">Audio cả bài {editing.audio_url ? "✓" : "(chưa có)"}</span>
            {editing.audio_url && (
              <audio controls src={`/api/lesson-audio?path=${encodeURIComponent(editing.audio_url)}`} className="h-8" />
            )}
            {!editing.id ? (
              <span className="text-[10px] font-bold text-amber-600">⚠ Lưu bài trước rồi mới tải audio</span>
            ) : (
              <label className={`text-[10px] font-black cursor-pointer ${uploading === "lesson" ? "text-muted" : "text-primary"}`}>
                {uploading === "lesson" ? "Đang tải…" : "⬆ Tải audio"}
                <input type="file" accept="audio/*" hidden disabled={uploading !== null} onChange={(e) => e.target.files?.[0] && uploadAudio("lesson", editing.id, e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Phrases */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-muted">Cụm ({phrases.length})</p>
              <button onClick={() => setPhrases([...phrases, { en: "", vi: "", ipa: "", example: "", audio_url: null }])} className="text-xs font-black text-primary">+ Thêm cụm</button>
            </div>
            <div className="space-y-3">
              {phrases.map((p, i) => (
                <div key={i} className="rounded-2xl border border-border/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input className="inp flex-1" placeholder="English" value={p.en} onChange={(e) => setPhrase(i, "en", e.target.value)} />
                    <button onClick={() => setPhrases(phrases.filter((_, idx) => idx !== i))} className="text-xs text-rose-500 font-black px-2">✕</button>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input className="inp" placeholder="Nghĩa (vi)" value={p.vi} onChange={(e) => setPhrase(i, "vi", e.target.value)} />
                    <input className="inp" placeholder="IPA" value={p.ipa} onChange={(e) => setPhrase(i, "ipa", e.target.value)} />
                    <input className="inp" placeholder="Câu ví dụ" value={p.example} onChange={(e) => setPhrase(i, "example", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    {p.audio_url && <audio controls src={`/api/lesson-audio?path=${encodeURIComponent(p.audio_url)}`} className="h-7" />}
                    {p.id ? (
                      <label className={`text-[10px] font-black cursor-pointer ${uploading === p.id ? "text-muted" : "text-primary"}`}>
                        {uploading === p.id ? "Đang tải…" : "⬆ Audio cụm"}
                        <input type="file" accept="audio/*" hidden disabled={uploading !== null} onChange={(e) => e.target.files?.[0] && uploadAudio("phrase", p.id!, e.target.files[0])} />
                      </label>
                    ) : (
                      <span className="text-[9px] text-muted">Lưu bài trước để tải audio cụm</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={saveLesson} disabled={busy} className="w-full liquid-glass-btn py-3 text-sm font-black disabled:opacity-40">
            {busy ? "Đang lưu…" : "Lưu bài + cụm"}
          </button>
        </div>
      )}

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #f4f4f5;
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        :global(.inp::placeholder) {
          color: #71717a;
        }
        :global(.inp:focus) {
          outline: none;
          border-color: var(--primary, #2b788b);
        }
      `}</style>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
