"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  listNotes,
  addNote,
  setNoteReview,
  deleteNote,
  type Note,
  type NoteKind,
} from "@/lib/notesRepo";

type Filter = "all" | NoteKind;

export default function NotesPage() {
  const { userId, ready, error: authError } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<NoteKind>("structure");
  const [content, setContent] = useState("");
  const [example, setExample] = useState("");
  const [tags, setTags] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Tải danh sách khi đã có phiên đăng nhập.
  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    listNotes()
      .then((rows) => {
        if (active) {
          setNotes(rows);
          setLoaded(true);
        }
      })
      .catch((e) => console.error("listNotes", e));
    return () => {
      active = false;
    };
  }, [ready, userId]);

  async function add() {
    if (!content.trim() || !userId) return;
    try {
      const note = await addNote(userId, {
        kind,
        content: content.trim(),
        example: example.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setNotes((prev) => [note, ...prev]);
      setContent("");
      setExample("");
      setTags("");
    } catch (e) {
      console.error("addNote", e);
    }
  }

  async function toggleReview(id: string) {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const next = !target.inReview;
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, inReview: next } : n)),
    );
    try {
      await setNoteReview(id, next);
    } catch (e) {
      console.error("setNoteReview", e);
      // hoàn tác nếu lỗi
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, inReview: !next } : n)),
      );
    }
  }

  async function remove(id: string) {
    const prev = notes;
    setNotes((p) => p.filter((n) => n.id !== id));
    try {
      await deleteNote(id);
    } catch (e) {
      console.error("deleteNote", e);
      setNotes(prev);
    }
  }

  const shown = notes.filter((n) => filter === "all" || n.kind === filter);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 pt-16 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-iridescent">Sổ tay từ & câu</h1>
        <p className="mt-2 text-sm font-semibold text-muted leading-relaxed">
          Nơi lưu giữ các cụm từ vựng thời thượng và cấu trúc ngữ pháp đắc lực. Chỉ với một chạm, bạn có thể đẩy chúng vào hệ thống ôn tập thông minh SRS để không bao giờ quên bài.
        </p>
      </div>

      {/* Form thêm */}
      <div className="liquid-glass-card p-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 rounded-full filter blur-xl pointer-events-none" />

        <div className="mb-4 flex gap-3">
          {(["structure", "word"] as NoteKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300 border flex-1 ${
                kind === k 
                  ? "bg-gradient-to-r from-primary to-indigo-600 text-white border-primary shadow-[0_4px_12px_rgba(99,102,241,0.25)]" 
                  : "border-border bg-white/10 dark:bg-white/5 text-muted hover:text-foreground"
              }`}
            >
              {k === "structure" ? "📚 Cấu trúc câu" : "🎯 Từ / Cụm mới"}
            </button>
          ))}
        </div>
        
        <div className="space-y-3">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={kind === "structure" ? "Ví dụ: It's worth + V-ing" : "Ví dụ: look forward to"}
            className="w-full rounded-xl border border-border bg-white/10 dark:bg-black/25 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-300 text-foreground"
          />
          <input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Ví dụ đặt câu thực tế (không bắt buộc)"
            className="w-full rounded-xl border border-border bg-white/10 dark:bg-black/25 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-300 text-foreground"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Gắn thẻ phân loại (ví dụ: giao_tiep, cong_viec, cach nhau bằng dấu phẩy)"
            className="w-full rounded-xl border border-border bg-white/10 dark:bg-black/25 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-300 text-foreground"
          />
        </div>

        <button
          onClick={add}
          disabled={!content.trim()}
          className="mt-4 w-full liquid-glass-btn py-3 text-sm font-bold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          ➕ Thêm thẻ mới vào sổ tay
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="mt-8 flex flex-wrap items-center gap-2 text-sm font-semibold">
        {(["all", "structure", "word"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-1.5 transition-all duration-300 border ${
              filter === f 
                ? "bg-primary/10 border-primary/20 text-primary font-bold shadow-sm" 
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {f === "all" ? "Tất cả" : f === "structure" ? "Cấu trúc" : "Từ vựng"}
          </button>
        ))}
        <span className="ml-auto text-xs font-bold text-muted bg-white/30 dark:bg-white/5 border border-border px-3 py-1.5 rounded-full">
          💡 <span className="text-accent font-black">{notes.filter((n) => n.inReview).length}</span> thẻ đang ôn tập
        </span>
      </div>

      {/* Danh sách */}
      <div className="mt-4 space-y-4">
        {authError && (
          <div className="liquid-glass-card border border-rose-500/30 bg-rose-500/5 py-4 px-5 text-center">
            <p className="text-sm font-bold text-rose-500">
              Chưa kết nối được tài khoản: {authError}
            </p>
            <p className="mt-1 text-xs font-medium text-muted">
              Hãy bật &ldquo;Anonymous sign-ins&rdquo; trong Supabase rồi tải lại trang.
            </p>
          </div>
        )}
        {!authError && !loaded && (
          <div className="liquid-glass-card border border-dashed border-border/60 py-12 text-center">
            <p className="text-sm font-bold text-muted">Đang tải sổ tay… ⏳</p>
          </div>
        )}
        {!authError && loaded && shown.length === 0 && (
          <div className="liquid-glass-card border border-dashed border-border/60 py-12 text-center">
            <p className="text-sm font-bold text-muted">Sổ tay hiện đang trống. Hãy nhập thêm ở trên nhé! 📝</p>
          </div>
        )}
        {shown.map((n) => (
          <div key={n.id} className="liquid-glass-card p-5 border border-border transition-all duration-300 hover:shadow-md relative group">
            <div className="flex items-center gap-2">
              <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                n.kind === "structure" 
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" 
                  : "bg-cyan-500/10 border-cyan-500/20 text-accent"
              }`}>
                {n.kind === "structure" ? "Cấu trúc" : "Từ vựng"}
              </span>
              <button
                onClick={() => remove(n.id)}
                className="ml-auto text-xs font-bold text-muted/60 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Xóa bỏ
              </button>
            </div>
            
            <p className="mt-3 text-lg font-bold text-foreground leading-relaxed">{n.content}</p>
            {n.example && (
              <p className="text-sm italic text-muted mt-1 bg-black/5 dark:bg-white/5 py-2 px-3 rounded-lg border border-border/20">
                “{n.example}”
              </p>
            )}
            
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
              {n.tags.map((t) => (
                <span key={t} className="rounded-lg bg-black/5 dark:bg-white/5 border border-border/40 px-2 py-0.5 text-[11px] font-semibold text-muted">
                  #{t}
                </span>
              ))}
              <button
                onClick={() => toggleReview(n.id)}
                className={`ml-auto rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-300 flex items-center gap-1 active:scale-95 ${
                  n.inReview
                    ? "bg-accent/15 border border-accent/30 text-accent shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "border border-border bg-white/20 dark:bg-white/5 text-muted hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {n.inReview ? "✓ Đang ôn tập" : "+ Đẩy vào ôn tập"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

