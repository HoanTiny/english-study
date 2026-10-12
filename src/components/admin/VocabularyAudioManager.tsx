"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";
import { basicWords } from "@/lib/basicVocabulary";
import type { Pronounce } from "@/lib/pronounce";

type Row = { word: string; accent: "us" | "uk"; origin: string; bytes: number; attribution?: { kind?: string } };
type Result = { accent: "us" | "uk"; status: "saved" | "existing" | "missing" | "error"; message?: string };
const normalize = (word: string) => word.trim().replace(/\s+/g, " ").toLowerCase();
const courseWords = [...new Set(basicWords.map(word => normalize(word.en)))];
const field = "w-full min-w-0 rounded-xl border border-border bg-surface p-3 text-sm";

function AudioEditor({ word, locked, onChanged }: { word: string; locked: boolean; onChanged: () => Promise<void> }) {
  const { key } = useAdminAuth();
  const [data, setData] = useState<Pronounce | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [files, setFiles] = useState<Partial<Record<"us" | "uk", File>>>({});
  const [ipa, setIpa] = useState({ us: "", uk: "" });
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    const response = await fetch(`/api/admin/word-audio?word=${encodeURIComponent(word)}`, { headers: { "x-admin-key": key }, signal: AbortSignal.timeout(10000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Không kiểm tra được audio.");
    if (mounted.current) { setData(result); setIpa({ us: result.us?.ipa || "", uk: result.uk?.ipa || "" }); }
  }, [word, key]);
  useEffect(() => {
    mounted.current = true;
    void refresh().catch(error => { if (mounted.current) setNotice(error.message); });
    return () => { mounted.current = false; };
  }, [refresh]);
  async function save(accent: "us" | "uk", remove = false) {
    if (busy || locked || (!remove && !files[accent])) return;
    setBusy(true); setNotice("");
    try {
      const form = new FormData(); form.set("word", word); form.set("accent", accent); form.set("ipa", ipa[accent]);
      if (files[accent]) form.set("file", files[accent]!);
      const response = await fetch(`/api/admin/word-audio${remove ? `?word=${encodeURIComponent(word)}&accent=${accent}` : ""}`, { method: remove ? "DELETE" : "POST", headers: { "x-admin-key": key }, ...(remove ? {} : { body: form }), signal: AbortSignal.timeout(45000) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Không lưu được audio.");
      await Promise.all([refresh(), onChanged()]);
      if (mounted.current) { setFiles(current => ({ ...current, [accent]: undefined })); setNotice(remove ? `Đã gỡ audio ${accent.toUpperCase()}.` : `Đã lưu audio ${accent.toUpperCase()}.`); }
    } catch (error) { if (mounted.current) setNotice(error instanceof Error ? error.message : "Không lưu được audio."); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <section className="study-panel mt-5 p-5 sm:p-6" aria-label="Audio của từ đang chọn">
    <h2 className="text-xl font-semibold break-words" lang="en">{word}</h2>
    <p className="mt-2 text-sm text-muted">Tải bản đọc đúng từ và đúng giọng. File mới thay thế bản cũ; không cần tạo lại khi học viên bấm nghe.</p>
    <div className="mt-5 grid gap-5 sm:grid-cols-2">{(["us", "uk"] as const).map(accent => <div key={accent} className="min-w-0 rounded-xl border border-border p-4">
      <h3 className="font-semibold text-primary">{accent.toUpperCase()} · {accent === "us" ? "Anh-Mỹ" : "Anh-Anh"}</h3>
      {data?.[accent]?.synthetic && <p className="mt-2 text-xs text-muted">Giọng tổng hợp Kokoro · phát từ file đã lưu.</p>}
      {data?.[accent]?.audio ? <audio className="mt-3 w-full min-w-0" controls preload="none" src={data[accent]!.audio} aria-label={`Nghe audio ${accent.toUpperCase()} đã lưu`} /> : <p className="mt-3 text-sm text-muted">{data ? "Chưa có bản thu đã lưu." : "Đang kiểm tra…"}</p>}
      <label className="mt-4 grid gap-2 text-sm">File audio {accent.toUpperCase()}<input type="file" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" disabled={busy || locked} className={field} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (file && (!file.size || file.size > 2 * 1024 * 1024)) { setNotice("Chọn audio MP3, OGG hoặc WAV, tối đa 2 MB."); return; }
        setFiles(current => ({ ...current, [accent]: file }));
      }} /></label>
      {files[accent] && <p className="mt-2 break-all text-xs text-muted">Đã chọn: {files[accent]!.name}</p>}
      <label className="mt-3 grid gap-2 text-sm">IPA {accent.toUpperCase()} (không bắt buộc)<input value={ipa[accent]} maxLength={200} disabled={busy || locked} onChange={event => setIpa(current => ({ ...current, [accent]: event.target.value }))} className={field} /></label>
      <div className="mt-4 flex flex-wrap gap-3"><button className="liquid-glass-btn" disabled={busy || locked || !files[accent]} onClick={() => save(accent)}>Lưu audio {accent.toUpperCase()}</button>{data?.[accent]?.audio && <button className="rounded-xl border border-border px-3 py-2 text-sm text-warn" disabled={busy || locked} onClick={() => save(accent, true)}>Gỡ {accent.toUpperCase()}</button>}</div>
    </div>)}</div>
    <p className="mt-3 text-xs text-muted">MP3, OGG hoặc WAV · tối đa 2 MB/file. Chỉ điền IPA khi đã kiểm tra đúng giọng.</p>
    {notice && <p className="mt-3 text-sm" role="status">{notice}</p>}
  </section>;
}

export default function VocabularyAudioManager({ entries }: { entries: { en: string; vi: string }[] }) {
  const { key } = useAdminAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [word, setWord] = useState("sister");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [progress, setProgress] = useState({ running: false, done: 0, total: 0, saved: 0, missing: 0, errors: 0 });
  const [log, setLog] = useState<string[]>([]);
  const stopping = useRef(false), running = useRef(false), mounted = useRef(true);
  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/word-audio", { headers: { "x-admin-key": key }, signal: AbortSignal.timeout(15000) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || "Không đọc được kho audio.");
    if (mounted.current) { setRows(result.rows); setReady(true); }
  }, [key]);
  useEffect(() => {
    mounted.current = true;
    void reload().catch(error => { if (mounted.current) setNotice(error.message); });
    return () => { mounted.current = false; stopping.current = true; };
  }, [reload]);
  const unique = [...new Map(entries.map(entry => [normalize(entry.en), entry])).values()];
  const matches = unique.filter(entry => `${entry.en} ${entry.vi}`.toLowerCase().includes(query.toLowerCase())).slice(0, 100);
  const recorded = rows.filter(row => courseWords.includes(row.word));
  const complete = courseWords.filter(word => ["us", "uk"].every(accent => recorded.some(row => row.word === word && row.accent === accent))).length;

  async function prepare(selectedOnly = false) {
    if (running.current || !ready) return;
    running.current = true; stopping.current = false; setNotice(""); setLog([]);
    const queue = selectedOnly ? [word] : courseWords.filter(word => !["us", "uk"].every(accent => rows.some(row => row.word === word && row.accent === accent)));
    const current = { running: true, done: 0, total: queue.length, saved: 0, missing: 0, errors: 0 };
    setProgress({ ...current }); let failures = 0;
    try {
      for (const target of queue) {
        if (stopping.current) break;
        const response = await fetch("/api/admin/word-audio", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify({ action: "import", word: target }), signal: AbortSignal.timeout(65000) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không nhập được audio.");
        const results = result.results as Result[];
        current.done++; current.saved += results.filter(item => item.status === "saved").length;
        current.missing += results.filter(item => item.status === "missing").length;
        current.errors += results.filter(item => item.status === "error").length;
        failures = results.every(item => item.status === "error") ? failures + 1 : 0;
        if (mounted.current) {
          setProgress({ ...current });
          setLog(previous => [`${target}: ${results.map(item => `${item.accent.toUpperCase()} ${item.status === "saved" ? "đã lưu" : item.status === "existing" ? "đã có" : item.message || "chưa có"}`).join(" · ")}`, ...previous].slice(0, 8));
        }
        if (failures >= 3) throw new Error("Nguồn audio đang lỗi liên tiếp. Đã dừng; bạn có thể tiếp tục sau.");
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (mounted.current) setNotice(stopping.current ? "Đã dừng sau từ hiện tại. Các file đã lưu vẫn được giữ; lần sau sẽ bỏ qua bản đã có." : "Đã kiểm tra xong. Những giọng còn thiếu có thể tải file lên thủ công.");
    } catch (error) { if (mounted.current) setNotice(error instanceof Error ? error.message : "Không nhập được audio."); }
    finally {
      running.current = false;
      if (mounted.current) { setProgress({ ...current, running: false }); setRevision(value => value + 1); await reload().catch(error => setNotice(error.message)); }
    }
  }

  return <div>
    <section className="study-panel p-5 sm:p-6" aria-label="Kho audio dùng chung">
      <h2 className="text-lg font-semibold">Audio lưu sẵn cho bộ 1.000 từ</h2>
      <p className="mt-2 text-sm text-muted">{courseWords.length} mục khác nhau sau khi gộp trùng · {recorded.length}/{courseWords.length * 2} bản thu · {complete} mục đủ US và UK.</p>
      <p className="mt-2 text-xs text-muted">{recorded.filter(row => row.attribution?.kind === "synthetic").length} file Kokoro đã lưu. Audio tạo theo đợt trên máy sẽ xuất hiện sau khi bấm Làm mới.</p>
      <p className="mt-3 text-sm text-muted">Nhập bản thu miễn phí có nguồn và giấy phép rõ ràng. Không gọi AI; từ hoặc cụm từ chưa có bản thu sẽ được báo thiếu. Giữ tab này mở trong lúc nhập.</p>
      <div className="mt-4 flex flex-wrap gap-3"><button className="liquid-glass-btn" disabled={!ready || progress.running} onClick={() => prepare()}>Tìm bản thu miễn phí còn thiếu</button>{progress.running && <button className="rounded-xl border border-border px-4 py-2 text-sm" onClick={() => { stopping.current = true; setNotice("Sẽ dừng sau khi xử lý xong từ hiện tại…"); }}>Dừng sau từ hiện tại</button>}<button className="rounded-xl border border-border px-4 py-2 text-sm" disabled={progress.running} onClick={() => reload().then(() => setNotice("Đã cập nhật số lượng audio.")).catch(error => setNotice(error.message))}>Làm mới</button></div>
      {progress.total > 0 && <div className="mt-4"><progress className="w-full accent-primary" max={progress.total} value={progress.done} aria-label="Tiến độ chuẩn bị audio" /><p className="mt-2 text-sm" role="status">Đã kiểm tra {progress.done}/{progress.total} từ · {progress.saved} bản mới · {progress.missing} bản chưa có nguồn · {progress.errors} lỗi.</p></div>}
      {notice && <p className="mt-3 text-sm" role="status">{notice}</p>}
      {log.length > 0 && <details className="mt-3 text-xs text-muted"><summary>Kết quả gần nhất</summary><ul className="mt-2 space-y-2 break-words">{log.map((line, index) => <li key={index}>{line}</li>)}</ul></details>}
    </section>
    <div className="study-panel mt-5 p-5 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">Tìm từ để lưu audio<input value={query} onChange={event => setQuery(event.target.value)} className={field} placeholder="Ví dụ: sister" /></label>
      <label className="grid gap-2 text-sm font-medium">Chọn từ phát âm<select value={word} onChange={event => setWord(event.target.value)} className={field}>
        {!matches.some(entry => normalize(entry.en) === word) && <option value={word}>{word}</option>}{matches.map(entry => <option key={normalize(entry.en)} value={normalize(entry.en)}>{entry.en} — {entry.vi}</option>)}
      </select></label>
      <button className="justify-self-start rounded-xl border border-border px-4 py-3 text-sm text-primary" disabled={!ready || progress.running} onClick={() => prepare(true)}>Nhập bản thu miễn phí cho từ này</button>
    </div>
    <AudioEditor key={`${word}:${revision}`} word={word} locked={progress.running} onChanged={reload} />
  </div>;
}
