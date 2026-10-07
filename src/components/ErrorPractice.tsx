"use client";
import { useState } from "react";
import { practiceError, type ErrorRow } from "@/lib/errorLogRepo";

export default function ErrorPractice({ row, userId, onSaved, onClose }: {
  row: ErrorRow; userId: string; onSaved: (row: ErrorRow) => void; onClose: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function assess(remembered: boolean) {
    if (saving || !revealed) return;
    setSaving(true); setError(null);
    try { onSaved(await practiceError(userId, row.id, remembered)); }
    catch { setError("Chưa lưu được lượt luyện, hoặc lỗi này chưa đến hạn. Bạn có thể thử lại hay đóng để tải lại danh sách."); }
    finally { setSaving(false); }
  }
  return <section className="my-6 rounded-2xl border border-primary/30 bg-surface p-5" aria-label="Luyện sửa lỗi">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Thử tự sửa trước khi xem gợi ý</h2><button disabled={saving} onClick={onClose} className="text-sm underline">Đóng</button></div>
    <p className="mt-3 text-xs text-muted">Câu hoặc đoạn bạn từng viết</p>
    <p className="mt-1 text-base font-semibold">{row.original || "Hãy viết một câu đúng dựa trên lỗi đã gặp."}</p>
    <label htmlFor="error-rewrite" className="mt-4 block text-sm font-semibold">Viết lại bằng tiếng Anh</label>
    <textarea id="error-rewrite" value={answer} onChange={e => setAnswer(e.target.value)} disabled={revealed || saving} maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-foreground" />
    {!revealed ? <button disabled={answer.trim().length < 2} onClick={() => setRevealed(true)} className="liquid-glass-btn mt-3 px-5 py-2 text-sm disabled:opacity-50">Xem gợi ý và đối chiếu</button> : <>
      <div className="mt-4 rounded-xl bg-primary-soft p-4"><p className="text-xs font-bold text-primary">Gợi ý từ lần học trước</p><p className="mt-1 text-sm">{row.correction}</p>{row.note && <p className="mt-2 text-xs text-muted">{row.note}</p>}</div>
      <p className="mt-3 text-sm text-muted">Tự đánh giá sau khi đối chiếu. Gợi ý có thể có nhiều cách diễn đạt; đây không phải điểm chấm AI.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button disabled={saving} onClick={() => assess(false)} className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50">Cần ôn lại · sau 10 phút</button>
        <button disabled={saving} onClick={() => assess(true)} className="liquid-glass-btn px-4 py-2 text-sm disabled:opacity-50">Đã tự sửa đúng</button>
      </div>
      <p className="mt-3 text-xs text-muted">Tự sửa đúng qua 3 lần ôn cách nhau mới tự đánh dấu đã nắm. Lần đúng tiếp theo: {row.correct_streak + 1}/3.</p>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
    {saving && <p role="status" className="mt-2 text-sm">Đang lưu kết quả…</p>}
  </section>;
}
