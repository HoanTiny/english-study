"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import PronounceMini from "@/components/PronounceMini";
import WordDetail from "@/components/WordDetail";
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
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [tags, setTags] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Tải danh sách khi đã có phiên đăng nhập.
  useEffect(() => {
    if (!ready) return;
    if (!userId) { setLoaded(true); return; }
    let active = true;
    listNotes()
      .then((rows) => { if (active) setNotes(rows); })
      .catch((e) => console.error("listNotes", e))
      .finally(() => { if (active) setLoaded(true); });
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
        meaning: meaning.trim(),
        example: example.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setNotes((prev) => [note, ...prev]);
      setContent("");
      setMeaning("");
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
    <main className="study-page animate-fadeIn">
      <div className="page-heading">
        <span className="shimmer-edge inline-flex self-start items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary">
          📓 SỔ TAY HỌC TẬP CÁ NHÂN
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-3">Sổ tay từ & câu</h1>
        <p className="mt-2 text-xs sm:text-sm font-semibold text-muted leading-relaxed">
          Lưu từ mới, cấu trúc câu và ví dụ của bạn. Bật “Đang ôn” để đưa ghi chú vào lịch ôn tập hằng ngày.
        </p>
      </div>

      {/* Form thêm */}
      <div className="study-workspace study-workspace--notes">
      <section className="study-panel" aria-labelledby="new-note-heading">
        <h2 id="new-note-heading" className="mb-4 text-lg font-bold">Thêm ghi chú</h2>

        <div className="mb-5 flex gap-2">
          {(["structure", "word"] as NoteKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-xl px-3 py-3 text-xs font-semibold transition-colors border flex-1 cursor-pointer ${
                kind === k 
                  ? "bg-primary border-primary text-primary-fg"
                  : "border-border/60 bg-surface/50 text-muted hover:text-foreground hover:scale-[1.02]"
              }`}
            >
              {k === "structure" ? "📚 Cấu trúc câu" : "🎯 Từ / Cụm mới"}
            </button>
          ))}
        </div>
        
        <div className="space-y-4">
          <div>
          <label className="study-field" htmlFor="note-content">{kind === "structure" ? "Cấu trúc câu" : "Từ / cụm từ"}</label>
          <input
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={kind === "structure" ? "Ví dụ: It's worth + V-ing" : "Ví dụ: look forward to"}
            className="w-full rounded-2xl border border-border/60 bg-background/50 px-4.5 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background transition-all text-foreground shadow-inner placeholder:text-muted/65"
          />
          </div>
          <div>
          <label className="study-field" htmlFor="note-meaning">Nghĩa tiếng Việt</label>
          <input
            id="note-meaning"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder={kind === "structure" ? "Nghĩa / cách dùng (ví dụ: đáng để làm gì đó)" : "Nghĩa tiếng Việt (ví dụ: mong đợi điều gì)"}
            className="w-full rounded-2xl border border-border/60 bg-background/50 px-4.5 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background transition-all text-foreground shadow-inner placeholder:text-muted/65"
          />
          </div>
          <div>
          <label className="study-field" htmlFor="note-example">Ví dụ <span className="text-muted font-normal">(tùy chọn)</span></label>
          <input
            id="note-example"
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Ví dụ đặt câu thực tế (không bắt buộc)"
            className="w-full rounded-2xl border border-border/60 bg-background/50 px-4.5 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background transition-all text-foreground shadow-inner placeholder:text-muted/65"
          />
          </div>
          <div>
          <label className="study-field" htmlFor="note-tags">Thẻ phân loại <span className="text-muted font-normal">(tùy chọn)</span></label>
          <input
            id="note-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Ví dụ: giao_tiep, cong_viec"
            className="w-full rounded-2xl border border-border/60 bg-background/50 px-4.5 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background transition-all text-foreground shadow-inner placeholder:text-muted/65"
          />
          <p className="mt-1.5 text-xs text-muted">Ngăn cách các thẻ bằng dấu phẩy.</p>
          </div>
        </div>

        <button
          onClick={add}
          disabled={!content.trim()}
          className="mt-5 w-full liquid-glass-btn py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          ➕ Thêm thẻ mới vào sổ tay
        </button>
      </section>

      {/* Bộ lọc */}
      <section aria-label="Ghi chú đã lưu" className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {(["all", "structure", "word"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full px-4 py-2 transition-all duration-300 border shadow-sm cursor-pointer ${
              filter === f 
                ? "bg-primary-soft border-primary/20 text-primary font-black" 
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {f === "all" ? "Tất cả" : f === "structure" ? "Cấu trúc" : "Từ vựng"}
          </button>
        ))}
        <span className="ml-auto text-[9px] font-black text-muted bg-surface border border-border px-3.5 py-2 rounded-full shadow-sm">
          💡 <span className="text-accent font-black">{notes.filter((n) => n.inReview).length}</span> thẻ đang ôn tập
        </span>
      </div>

      {/* Danh sách */}
      <div className="mt-5 space-y-5">
        {authError && (
          <div className="liquid-glass-card border border-rose-500/30 bg-rose-500/5 py-5 px-6 text-center">
            <p className="text-xs font-bold text-rose-500">
              Chưa kết nối tài khoản đồng bộ: {authError}
            </p>
            <p className="mt-1.5 text-[10px] font-medium text-muted">
              Vui lòng kiểm tra cấu hình Supabase Anonymous Sign-ins.
            </p>
          </div>
        )}
        {!authError && !loaded && (
          <div className="liquid-glass-card border border-dashed border-border/60 py-16 text-center bg-white/15 dark:bg-black/10">
            <p className="text-xs font-black uppercase tracking-wider text-muted animate-pulse">Đang tải dữ liệu sổ tay… ⏳</p>
          </div>
        )}
        {!authError && loaded && shown.length === 0 && (
          <div className="liquid-glass-card border border-dashed border-border/60 py-16 text-center bg-white/10 dark:bg-black/10">
            <p className="px-4 text-sm font-medium text-muted">Chưa có ghi chú trong mục này. Thêm từ hoặc cấu trúc bạn muốn ghi nhớ vào sổ tay.</p>
          </div>
        )}
        {shown.map((n) => (
          <div key={n.id} className="study-panel">
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-3.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${
                n.kind === "structure" 
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" 
                  : "bg-primary-soft border border-primary/20 text-primary"
              }`}>
                {n.kind === "structure" ? "Cấu trúc" : "Từ vựng"}
              </span>
              <button
                onClick={() => remove(n.id)}
                className="ml-auto text-[10px] font-black uppercase tracking-wider text-muted/60 hover:text-rose-600 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Xóa bỏ
              </button>
            </div>
            
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <p className="min-w-0 text-lg font-bold text-foreground leading-relaxed tracking-tight">{n.content}</p>
              <PronounceMini text={n.content} />
            </div>
            {n.meaning && (
              <p className="mt-1 text-sm font-semibold text-primary">{n.meaning}</p>
            )}
            {n.kind === "word" && <WordDetail word={n.content} />}
            {n.example && (
              <p className="text-xs italic font-semibold text-muted mt-2.5 bg-black/5 dark:bg-white/5 py-3.5 px-4.5 rounded-2xl border border-border/40 leading-relaxed shadow-sm">
                “{n.example}”
              </p>
            )}
            
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
              {n.tags.map((t) => (
                <span key={t} className="rounded-full bg-black/5 dark:bg-white/5 border border-border/40 px-3 py-1 text-[10px] font-bold text-muted">
                  #{t}
                </span>
              ))}
              <button
                onClick={() => toggleReview(n.id)}
                className={`ml-auto rounded-full px-4 py-2 text-xs font-black transition-all duration-300 flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm ${
                  n.inReview
                    ? "bg-primary border border-primary/25 text-primary-fg shadow-md shadow-primary/20"
                    : "border border-border/60 bg-surface/50 text-muted hover:border-primary/45 hover:text-foreground hover:scale-[1.02]"
                }`}
              >
                {n.inReview ? "✓ Đang ôn" : "+ Đẩy ôn tập"}
              </button>
            </div>
          </div>
        ))}
      </div>
      </section>
      </div>
    </main>
  );
}
