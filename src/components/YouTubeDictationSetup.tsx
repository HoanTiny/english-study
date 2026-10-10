"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { listSavedVideos, saveVideo, deleteSavedVideo, type SavedVideo } from "@/lib/dictationVideosRepo";
import { LISTEN_TOPICS } from "@/data/listenVideos";
import { MAX_SUBTITLE_BYTES, parseSubtitles, parseYouTubeId, validateSegments, readTranscript, storeTranscript, deleteTranscript, type TranscriptSegment } from "@/lib/transcript";

const suggested = LISTEN_TOPICS.flatMap(topic => topic.videos).filter(video => video.cc);
type Preview = { videoId: string; segments: TranscriptSegment[]; label: string; estimatedLastEnd: boolean; title?: string; channel?: string };
export type DictationImport = Preview & { notice: string };
const field = "w-full min-w-0 rounded-xl border border-border/70 bg-background/60 px-3 py-3 text-sm outline-none focus:border-primary";

export default function YouTubeDictationSetup({ initialVideo, userId, onStart }: {
  initialVideo: string | null; userId: string | null; onStart: (data: DictationImport) => void;
}) {
  const [link, setLink] = useState(initialVideo ?? "");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saved, setSaved] = useState<SavedVideo[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const videoId = parseYouTubeId(link);
  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try { return { data: parseSubtitles(text), error: "" }; }
    catch (e) { return { data: null, error: e instanceof Error ? e.message : "Phụ đề không hợp lệ." }; }
  }, [text]);
  const candidate: Preview | null = text.trim() ? (videoId && parsed?.data ? {
    videoId, ...parsed.data, label: parsed.data.format === "youtube" ? "Bản chép YouTube" : `Phụ đề ${parsed.data.format.toUpperCase()}`,
  } : null) : preview?.videoId === videoId ? preview : null;

  useEffect(() => {
    let active = true;
    if (userId) void listSavedVideos().then(rows => { if (active) setSaved(rows); })
      .catch(() => { if (active) setNotice("Chưa tải được danh sách video đã lưu. Bạn vẫn có thể nhập phụ đề."); });
    const version = generation;
    return () => { active = false; version.current++; request.current?.abort(); };
  }, [userId]);

  useEffect(() => {
    if (!userId || !videoId) return;
    // Read browser-only storage after hydration; the server cannot supply this preview.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setPreview(readTranscript(localStorage, userId, videoId)); }
    catch { setNotice("Trình duyệt không cho đọc phụ đề đã lưu. Bạn có thể nhập lại bên dưới."); }
  }, [userId, videoId]);

  function cancel() { generation.current++; request.current?.abort(); request.current = null; setBusy(false); }
  function chooseVideo(value: string) {
    cancel(); setLink(value); setText(""); setPreview(null); setError(""); setNotice("");
    const next = parseYouTubeId(value);
    if (userId && next) {
      try { setPreview(readTranscript(localStorage, userId, next)); }
      catch { setNotice("Chưa đọc được bản phụ đề trên thiết bị. Bạn có thể nhập lại."); }
    }
  }
  async function readFile(file?: File) {
    if (!file) return;
    cancel(); const current = generation.current; setError(""); setText(""); setPreview(null);
    if (file.size > MAX_SUBTITLE_BYTES) { setError("File quá lớn. Chọn phụ đề tối đa 1 MB."); return; }
    if (!/\.(srt|vtt|txt)$/i.test(file.name)) { setError("Chọn file .srt, .vtt hoặc .txt có mốc thời gian."); return; }
    try {
      const value = await file.text();
      if (current !== generation.current) return;
      setText(value); setPreview(null);
    } catch { if (current === generation.current) setError("Không đọc được file. Hãy thử dán nội dung phụ đề."); }
  }
  async function automatic() {
    if (!videoId) { setError("Hãy nhập link YouTube hoặc ID video hợp lệ."); return; }
    cancel(); const current = generation.current;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`/api/yt-transcript?v=${videoId}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]) });
      const data = await response.json();
      if (current !== generation.current) return;
      if (data.id !== videoId) throw new Error("Phụ đề trả về không khớp video đã chọn.");
      setPreview({ videoId, segments: validateSegments(data.segments), label: "Phụ đề tải tự động", estimatedLastEnd: data.estimatedLastEnd === true,
        title: typeof data.title === "string" ? data.title : "", channel: typeof data.channel === "string" ? data.channel : "" });
      setText("");
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error && e.name !== "TimeoutError" && e.name !== "AbortError"
        ? e.message : "Tải tự động mất quá lâu. Bạn có thể dán bản chép hoặc chọn file phụ đề bên dưới.");
    } finally { if (current === generation.current) { setBusy(false); request.current = null; } }
  }
  async function start() {
    if (!candidate || starting) return;
    cancel(); setStarting(true); const current = generation.current;
    const notes: string[] = [];
    if (candidate.estimatedLastEnd) notes.push("Điểm dừng đoạn cuối được ước tính; bạn có thể cần nghe lại đoạn này.");
    if (userId) {
      try {
        if (!storeTranscript(localStorage, userId, candidate)) notes.push("Không lưu được phụ đề trên thiết bị. Giữ lại file để nhập khi mở lần sau.");
      } catch { notes.push("Không lưu được phụ đề trên thiết bị. Giữ lại file để nhập khi mở lần sau."); }
      const known = saved.find(video => video.videoId === candidate.videoId);
      const recommended = suggested.find(video => video.id === candidate.videoId);
      try {
        await saveVideo(userId, { videoId: candidate.videoId, title: candidate.title || known?.title || recommended?.title || candidate.videoId,
          channel: candidate.channel || known?.channel || recommended?.channel || "" });
      } catch { notes.push("Chưa lưu được link video vào tài khoản; buổi luyện vẫn bắt đầu được."); }
    } else notes.push("Phụ đề chỉ giữ trong buổi này vì phiên tài khoản chưa sẵn sàng.");
    if (current === generation.current) { setStarting(false); onStart({ ...candidate, notice: notes.join(" ") }); }
  }
  async function remove(video: SavedVideo) {
    try {
      await deleteSavedVideo(video.id);
      setSaved(rows => rows.filter(row => row.id !== video.id));
      if (userId) { try { deleteTranscript(localStorage, userId, video.videoId); } catch { setNotice("Link đã xóa, nhưng trình duyệt chưa xóa được bản phụ đề trên thiết bị."); } }
      if (preview?.videoId === video.videoId) setPreview(null);
    } catch { setError("Chưa xóa được video đã lưu. Hãy thử lại."); }
  }

  return <section aria-label="Phụ đề cho video YouTube" className="w-full min-w-0 space-y-5 text-left">
    <div>
      <label htmlFor="dictation-video" className="text-sm font-bold">1. Chọn video YouTube</label>
      <input id="dictation-video" value={link} disabled={starting} onChange={event => chooseVideo(event.target.value)} placeholder="Link YouTube hoặc ID video" className={`${field} mt-2`} />
      {link.trim() && !videoId && <p className="mt-2 text-xs text-rose-600">Link hoặc ID video chưa hợp lệ.</p>}
      {videoId && <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-primary underline">Mở video trên YouTube ↗</a>}
    </div>
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <h2 className="text-sm font-bold">2. Nhập phụ đề tiếng Anh</h2>
      <p className="text-xs leading-relaxed text-muted">Trên YouTube, mở phần mô tả → “Hiện bản chép lời / Show transcript”, giữ các mốc thời gian rồi sao chép vào đây. Hoặc chọn file SRT/VTT của video.</p>
      <label htmlFor="dictation-subtitle-file" className="block text-xs font-semibold">Chọn file phụ đề · tối đa 1 MB</label>
      <input id="dictation-subtitle-file" type="file" accept=".srt,.vtt,.txt,text/vtt,text/plain,application/x-subrip" disabled={starting}
        onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ""; }} className="block w-full min-w-0 text-xs file:mr-2 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-2" />
      <label htmlFor="dictation-subtitle-text" className="block text-xs font-semibold">Hoặc dán phụ đề có mốc thời gian</label>
      <textarea id="dictation-subtitle-text" rows={6} value={text} disabled={starting} onChange={event => { cancel(); setText(event.target.value); setError(""); }}
        placeholder={'0:00\nHello, everyone.\n0:04\nLet’s start learning.'} className={`${field} resize-y font-mono text-xs`} />
      {parsed?.error && <p role="alert" className="text-xs text-rose-600">{parsed.error}</p>}
      <p className="text-xs text-muted">Đọc phụ đề ngay trên thiết bị. Không gửi file lên máy chủ. Văn bản không có thời gian chưa thể dùng để tua video chính xác.</p>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600">{error}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={() => void automatic()} disabled={busy || starting || !videoId} className="rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50">{busy ? "Đang thử tải tự động…" : "Thử tải phụ đề tự động"}</button>
      {busy && <button onClick={cancel} className="text-xs underline">Hủy tải</button>}
      <p className="text-xs text-muted">Tải tự động có thể bị YouTube từ chối dù video vẫn có CC.</p>
    </div>
    {candidate && <div aria-label="Xem trước phụ đề" className="space-y-2 rounded-2xl border border-primary/20 bg-primary-soft/40 p-4">
      <p className="text-sm font-bold">{candidate.label} · {candidate.segments.length} đoạn sẵn sàng</p>
      <p className="text-xs text-muted">Kiểm tra phụ đề khớp với video đã chọn trước khi bắt đầu.</p>
      <ol className="max-h-36 space-y-2 overflow-y-auto text-xs">{candidate.segments.slice(0, 3).map((segment, index) => <li key={index}><span className="font-mono text-muted">{Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, "0")}</span> · {segment.text}</li>)}</ol>
      {candidate.estimatedLastEnd && <p className="text-xs text-muted">Điểm dừng đoạn cuối được ước tính; hãy kiểm tra khi nghe.</p>}
    </div>}
    <button onClick={() => void start()} disabled={!candidate || busy || starting} className="liquid-glass-btn w-full py-3 text-sm disabled:opacity-50">{starting ? "Đang chuẩn bị…" : "Bắt đầu luyện với phụ đề này"}</button>
    <p className="text-xs text-muted">Phụ đề được giữ theo tài khoản trên trình duyệt này. Link video lưu vào tài khoản; thiết bị khác cần nhập phụ đề lại.</p>
    {notice && <p role="status" className="text-xs text-muted">{notice}</p>}
    {saved.length > 0 && <div className="space-y-2"><h3 className="text-sm font-bold">Video đã lưu</h3><div className="max-h-52 space-y-2 overflow-y-auto">{saved.map(video => <div key={video.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 p-3">
      <button disabled={starting} onClick={() => chooseVideo(video.videoId)} className="min-w-0 flex-1 text-left text-xs"><span className="block truncate font-semibold">{video.title}</span><span className="text-muted">{video.channel}</span></button>
      <button disabled={starting} aria-label={`Xóa video ${video.title}`} onClick={() => void remove(video)} className="shrink-0 px-2 py-1 text-muted">✕</button>
    </div>)}</div></div>}
    <details className="text-xs"><summary className="cursor-pointer font-semibold">Chọn video gợi ý từ Luyện nghe</summary><div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{suggested.map(video => <button key={video.id} disabled={starting} onClick={() => chooseVideo(video.id)} className="block w-full rounded-xl border border-border/60 p-3 text-left"><span className="block font-semibold">{video.title}</span><span className="text-muted">{video.channel} · {video.level}</span></button>)}</div></details>
  </section>;
}
