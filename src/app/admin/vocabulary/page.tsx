"use client";
import { useEffect, useRef, useState } from "react";
import { basicWords } from "@/lib/basicVocabulary";
import legacyWords from "@/data/vocab.json";
import { lessonContent } from "@/lib/lessons";
import { useAdminAuth } from "@/lib/adminAuth";
import { fetchWordImage } from "@/lib/wordImages";
import { wordImageKey } from "@/lib/wordImageTypes";
import VocabularyAudioManager from "@/components/admin/VocabularyAudioManager";

type Entry = { en: string; vi: string };
const entries = [...new Map([...basicWords, ...legacyWords, ...Object.values(lessonContent).flatMap(lesson => lesson.phrases)].map(word => [wordImageKey(word.en, word.vi), word])).values()];

function ImageEditor({ entry }: { entry: Entry }) {
  const { key } = useAdminAuth();
  const [current, setCurrent] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState("");
  const previewRef = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    fetchWordImage(entry.en, entry.vi, true).then(data => {
      if (active) { setCurrent(data?.results[0]?.image ?? null); setChecking(false); if (!data) setNotice("Không kiểm tra được ảnh hiện tại. Bạn có thể thử chọn lại từ."); }
    });
    return () => { active = false; if (previewRef.current) URL.revokeObjectURL(previewRef.current); };
  }, [entry]);
  function selectFile(value: File | undefined) {
    if (!value) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(value.type) || value.size > 2 * 1024 * 1024) { setNotice("Chọn ảnh PNG, JPG hoặc WebP, tối đa 2 MB."); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(value);
    setPreview(previewRef.current); setFile(value); setNotice("");
  }
  async function save(remove = false) {
    if (busy || (!remove && !file)) return;
    setBusy(true); setNotice("");
    try {
      const body = new FormData();
      if (file) body.set("file", file);
      body.set("word", entry.en); body.set("meaning", entry.vi);
      const response = await fetch(`/api/admin/word-image${remove ? `?word=${encodeURIComponent(entry.en)}&meaning=${encodeURIComponent(entry.vi)}` : ""}`, { method: remove ? "DELETE" : "POST", headers: { "x-admin-key": key }, ...(remove ? {} : { body }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không lưu được ảnh.");
      const data = await fetchWordImage(entry.en, entry.vi, true);
      setCurrent(data?.results[0]?.image ?? null); setFile(null); setPreview(null);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setNotice(remove ? "Đã gỡ ảnh khỏi thẻ học." : "Đã lưu ảnh cho từ và nghĩa này.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không lưu được ảnh."); }
    finally { setBusy(false); }
  }
  return <section className="study-panel mt-5 p-5 sm:p-6" aria-label="Ảnh của từ đang chọn">
    <h2 className="text-xl font-semibold break-words" lang="en">{entry.en}</h2><p className="mt-1 text-muted">{entry.vi}</p>
    <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] items-start">
      <div className="aspect-square rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden">
        {preview || current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview || current!} alt={`Minh họa cho ${entry.en}`} className="h-full w-full object-contain" />
        ) : <p className="p-5 text-center text-sm text-muted">{checking ? "Đang kiểm tra ảnh…" : "Chưa có ảnh. Flashcard sẽ chỉ hiện nội dung học."}</p>}
      </div>
      <div className="min-w-0"><label className="grid gap-2 text-sm font-medium">Chọn ảnh minh họa<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { selectFile(e.target.files?.[0]); e.target.value = ""; }} className="w-full min-w-0 rounded-xl border border-border p-3 text-sm" /></label>
        <p className="mt-2 text-xs text-muted">PNG, JPG hoặc WebP · tối đa 2 MB. Ảnh được dùng chung cho đúng từ và nghĩa này.</p>
        {preview && <p className="mt-3 text-sm text-primary">Ảnh xem trước · chưa lưu</p>}
        <div className="mt-4 flex flex-wrap gap-3"><button className="liquid-glass-btn" disabled={!file || busy} onClick={() => save()}>{busy ? "Đang lưu…" : "Lưu ảnh"}</button>{current && <button disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm text-warn" onClick={() => save(true)}>Gỡ ảnh</button>}</div>
        {notice && <p className="mt-4 text-sm" role="status">{notice}</p>}
      </div>
    </div>
  </section>;
}

export default function VocabularyImagesPage() {
  const [tab, setTab] = useState<"images" | "audio">("images");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(entries[0]);
  const matches = entries.filter(entry => `${entry.en} ${entry.vi}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 100);
  return <div className="max-w-5xl">
    <div className="study-tabs mb-5" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }} aria-label="Quản lý tài nguyên từ vựng"><button type="button" aria-pressed={tab === "images"} className={`rounded-lg ${tab === "images" ? "bg-primary text-white" : "text-muted"}`} onClick={() => setTab("images")}>Ảnh minh họa</button><button type="button" aria-pressed={tab === "audio"} className={`rounded-lg ${tab === "audio" ? "bg-primary text-white" : "text-muted"}`} onClick={() => setTab("audio")}>Audio US/UK</button></div>
    {tab === "audio" ? <VocabularyAudioManager entries={entries} /> : <>
    <p className="text-sm text-muted mb-5">Chọn ảnh đúng nghĩa cho từng thẻ. Ứng dụng chỉ hiển thị ảnh bạn tải lên; không tìm hoặc tạo ảnh tự động.</p>
    <div className="study-panel p-5 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">Tìm từ hoặc nghĩa<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ví dụ: nephew hoặc cháu trai" className="min-w-0 w-full rounded-xl border border-border bg-surface p-3" /></label>
      <label className="grid gap-2 text-sm font-medium">Chọn từ và nghĩa<select aria-label="Chọn từ và nghĩa" value={wordImageKey(selected.en, selected.vi)} onChange={e => { const entry = entries.find(w => wordImageKey(w.en, w.vi) === e.target.value); if (entry) setSelected(entry); }} className="min-w-0 w-full rounded-xl border border-border bg-surface p-3">
        {!matches.includes(selected) && <option value={wordImageKey(selected.en, selected.vi)}>{selected.en} — {selected.vi}</option>}
        {matches.map(entry => <option key={wordImageKey(entry.en, entry.vi)} value={wordImageKey(entry.en, entry.vi)}>{entry.en} — {entry.vi}</option>)}
      </select></label>
    </div>
    {!matches.length && <p className="mt-3 text-sm text-muted">Không tìm thấy từ phù hợp.</p>}
    <ImageEditor key={wordImageKey(selected.en, selected.vi)} entry={selected} />
    </>}
  </div>;
}
