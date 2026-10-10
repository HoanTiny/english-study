"use client";
import { useState } from "react";

export type UsageRow = { user_id: string; model: string; feature: string; input_tokens: number; output_tokens: number; thinking_tokens: number; total_tokens: number; held_tokens: number; requests: number };
const fmt = (value: number) => value.toLocaleString("vi-VN");

export function TokenUsagePanel({ userId, email, rows, limit, adminKey, onSaved }: {
  userId: string; email: string; rows: UsageRow[]; limit: number | null; adminKey: string; onSaved: () => void;
}) {
  const [draft, setDraft] = useState(limit === null ? "" : String(limit));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const sums = rows.reduce((a,r) => ({ input: a.input+Number(r.input_tokens), output: a.output+Number(r.output_tokens), thinking: a.thinking+Number(r.thinking_tokens), total: a.total+Number(r.total_tokens), held: a.held+Number(r.held_tokens), requests: a.requests+Number(r.requests) }), { input: 0, output: 0, thinking: 0, total: 0, held: 0, requests: 0 });
  async function save() {
    const value = draft.trim() === "" ? null : Number(draft);
    if (value !== null && (!/^\d+$/.test(draft) || !Number.isSafeInteger(value) || value > 1000000000)) { setMessage("Nhập số nguyên từ 0 đến 1.000.000.000."); return; }
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/admin/token-usage", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": adminKey }, body: JSON.stringify({ id: userId, monthlyLimit: value }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu được hạn mức.");
      setMessage("Đã lưu hạn mức."); onSaved();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Không lưu được hạn mức."); }
    finally { setSaving(false); }
  }
  return <div className="w-full border-t border-white/10 pt-3 text-xs text-zinc-300">
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[["Input",sums.input],["Output",sums.output],["Suy luận",sums.thinking],["Tổng token",sums.total]].map(([label,value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="mt-1 font-bold text-white">{fmt(Number(value))}</dd></div>)}
    </dl>
    <p className="mt-2">{fmt(sums.requests)} lượt Gemini đã ghi nhận · Hạn mức hàng tháng: {limit === null ? "Không giới hạn" : fmt(limit)}</p>
    {sums.held > 0 && <p className="mt-2 text-amber-300">{fmt(sums.held)} token tạm giữ cho yêu cầu đang chạy hoặc chưa xác định kết quả. Chưa cộng vào số dùng thực tế.</p>}
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">Hạn mức token/tháng
        <input aria-label={`Hạn mức token của ${email}`} inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} disabled={saving} placeholder="Không giới hạn" className="w-44 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-white" />
      </label>
      <button disabled={saving} onClick={save} className="rounded-lg border border-primary/40 px-3 py-2 text-primary disabled:opacity-50">{saving ? "Đang lưu…" : "Lưu hạn mức"}</button>
    </div>
    <p className="mt-1 text-muted">Để trống = không giới hạn · 0 = chặn Gemini. Thay đổi áp dụng ngay, không xóa số đã dùng.</p>
    {message && <p role="status" className="mt-2">{message}</p>}
    {rows.length > 0 && <details className="mt-3"><summary className="cursor-pointer">Theo model và tính năng</summary><div className="mt-2 overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Model / tính năng","Input","Output","Suy luận","Tổng"].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={`${r.model}:${r.feature}`}><td className="p-2">{r.model}<br />{r.feature.replace("/api/", "")}</td>{[r.input_tokens,r.output_tokens,r.thinking_tokens,r.total_tokens].map((n,i) => <td key={i} className="p-2">{fmt(Number(n))}</td>)}</tr>)}</tbody></table></div></details>}
  </div>;
}
