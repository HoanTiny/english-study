"use client";
import { useEffect, useRef, useState } from "react";
import { shadowItems } from "@/lib/content";
import { useAuth } from "@/lib/auth";
import { listShadowLatest, listShadowHistory, saveShadowAttempt } from "@/lib/shadowingRepo";
import { recordShadow, shadowDue, type ShadowAttempt, type RecordingPhase } from "@/lib/shadowPractice";
import type { PronResult } from "@/lib/pronunciation";
import { isSingleWord } from "@/lib/pronounce";
import ShadowWordPractice from "@/components/ShadowWordPractice";

type Pending = { id: string; key: string; result: PronResult; speed: number };
export default function ShadowingPage() {
  const { userId, ready } = useAuth();
  const [latest, setLatest] = useState<ShadowAttempt[]>([]);
  const [history, setHistory] = useState<ShadowAttempt[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [speed, setSpeed] = useState(0.75);
  const [level, setLevel] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [audio, setAudio] = useState<{ id: string; url: string; word?: string } | null>(null);
  const [phase, setPhase] = useState<RecordingPhase>("preparing");
  const [seconds, setSeconds] = useState(0);
  const [recordingWord, setRecordingWord] = useState<string | null>(null);
  const [drill, setDrill] = useState<{ id: string; word: string; error: string } | null>(null);
  const [wordResult, setWordResult] = useState<PronResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [retry, setRetry] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const finishController = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const token = ++generation.current;
    setLatest([]); setPending(null); setSelected(null); setAudio(null); setBusy(null); setSaving(false);
    setDrill(null); setWordResult(null); setError(null);
    if (ready && userId) listShadowLatest().then(rows => { if (generation.current === token) setLatest(rows); })
      .catch(() => { if (generation.current === token) setError("Chưa tải được điểm. Hãy thử tải lại."); });
    return () => { generation.current++; controller.current?.abort(); window.speechSynthesis?.cancel(); };
  }, [ready, userId, retry]);
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio.url); }, [audio]);
  useEffect(() => {
    let active = true;
    setHistory([]); setHistoryError(false);
    if (selected && userId) listShadowHistory(selected).then(rows => { if (active) setHistory(rows); })
      .catch(() => { if (active) setHistoryError(true); });
    return () => { active = false; };
  }, [selected, userId, latest]);

  async function save(value: Pending, token = generation.current) {
    if (!userId) return;
    setSaving(true);
    try {
      await saveShadowAttempt(userId, value.id, value.result, value.speed, value.key);
      if (generation.current !== token) return;
      setLatest(rows => [{ id: value.key, client_key: value.id, pronunciation_score: value.result.pronunciation,
        created_at: new Date().toISOString(), speed_rate: value.speed, assessment: value.result }, ...rows.filter(r => r.client_key !== value.id)]);
      setPending(null); setError(null);
    } catch { if (generation.current === token) setError("Chưa lưu được kết quả. Bấm Lưu lại để thử lại, không cần thu lại."); }
    finally { if (generation.current === token) setSaving(false); }
  }
  async function record(id: string, text: string, wordOnly = false) {
    if (busy || saving || pending || !userId) return;
    if (controller.current && !controller.current.signal.aborted) return;
    const token = generation.current;
    const abort = new AbortController(); controller.current = abort;
    const finish = new AbortController(); finishController.current = finish;
    setBusy(id); setSelected(id); setError(null); setAudio(null);
    setPhase("preparing"); setSeconds(0); setRecordingWord(wordOnly ? text : null);
    if (wordOnly) setWordResult(null); else { setDrill(null); setWordResult(null); }
    window.speechSynthesis?.cancel();
    try {
      const { result, audio: blob } = await recordShadow(text, abort.signal, {
        finishSignal: finish.signal,
        onPhase: value => { if (generation.current === token && !abort.signal.aborted) setPhase(value); },
        onSeconds: value => { if (generation.current === token && !abort.signal.aborted) setSeconds(value); },
      });
      if (generation.current !== token || abort.signal.aborted) return;
      if (blob) setAudio({ id, url: URL.createObjectURL(blob), word: wordOnly ? text : undefined });
      if (!result) { setError("Chưa nhận được điểm phát âm. Hãy nghe lại bản thu, kiểm tra micro và mạng rồi thử lại."); return; }
      if (wordOnly) { setWordResult(result); return; }
      const value = { id, key: crypto.randomUUID(), result, speed };
      setPending(value);
      await save(value, token);
    } catch (error) { if (generation.current === token && !abort.signal.aborted) setError(error instanceof Error ? error.message : "Chưa thu được âm thanh. Hãy thử lại."); }
    finally {
      if (controller.current === abort) { controller.current = null; finishController.current = null; }
      if (generation.current === token) setBusy(null);
    }
  }
  const due = latest.filter(r => shadowDue(r));
  const items = shadowItems.filter(i => level === "all" || i.level === level)
    .slice().sort((a,b) => Number(due.some(r => r.client_key === b.id)) - Number(due.some(r => r.client_key === a.id)));
  return <main className="study-page">
    <h1 className="text-3xl font-bold">Shadowing nhại giọng</h1>
    <p className="mt-3 text-sm text-muted">Nghe mẫu, nói lại và xem từ cần luyện. Điểm từ Azure là gợi ý luyện tập.</p>
    <p className="mt-2 text-xs text-muted">Bản thu chỉ nghe lại trong phiên này, không tải lên kho lưu trữ. Lịch sử điểm lưu trong tài khoản.</p>
    <section aria-label="Cách luyện shadowing" className="my-5 rounded-2xl border border-border bg-surface/50 p-4">
      <h2 className="mb-2 text-sm font-bold">Cách luyện shadowing</h2>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground/85">
        <li>Bấm <b>Nghe mẫu</b>, bắt đầu với tốc độ 0.75x rồi tăng dần.</li>
        <li>Bấm <b>Thu âm và chấm</b>, chờ hiện <b>Đang thu</b> rồi nói lại. Nói xong bấm <b>Dừng và chấm</b> (tối đa 30 giây).</li>
        <li>Nghe lại bản thu, xem từ cần sửa và luyện tiếp với mục tiêu từ 80 điểm.</li>
      </ol>
    </section>
    {error && <div role="alert" className="my-4 text-rose-600">{error} {!pending && !busy && <button onClick={() => { setError(null); setRetry(n => n + 1); }} className="ml-2 underline">Tải lại</button>}</div>}
    {pending && <div className="my-4 rounded-xl border border-border p-3"><p>Kết quả chưa lưu: {pending.result.pronunciation}/100</p><button disabled={saving} onClick={() => save(pending)} className="mr-4 underline">{saving ? "Đang lưu…" : "Lưu lại"}</button><button disabled={saving} onClick={() => { setPending(null); setError(null); }} className="underline">Bỏ kết quả chưa lưu</button></div>}
    <div className="my-5 flex flex-wrap gap-2" aria-label="Tốc độ nghe mẫu">{[0.5,0.75,1].map(s => <button key={s} disabled={!!busy} aria-pressed={speed === s} onClick={() => setSpeed(s)} className={`rounded-full border px-4 py-2 ${speed === s ? "bg-primary text-primary-fg" : "border-border"}`}>{s}x</button>)}</div>
    <div className="mb-5 flex flex-wrap gap-2">{["all", ...new Set(shadowItems.map(i => i.level))].map(l => <button key={l} disabled={!!busy} aria-pressed={level === l} onClick={() => { setLevel(l); setDrill(null); setWordResult(null); }} className={`rounded-full border px-4 py-2 ${level === l ? "bg-primary-soft text-primary" : "border-border"}`}>{l === "all" ? "Tất cả" : l}</button>)}</div>
    <p className="mb-4 text-sm text-muted">{latest.filter(r => r.pronunciation_score >= 80).length}/{shadowItems.length} câu đạt từ 80 điểm · {due.length} câu cần ôn hôm nay (xếp trước).</p>
    <div className="study-grid">{items.map(item => {
      const saved = latest.find(r => r.client_key === item.id);
      const result = pending?.id === item.id ? pending.result : saved?.assessment;
      return <section key={item.id} id={item.id} className="scroll-mt-24 study-panel">
        <p className="text-xs font-bold text-primary">{item.level}{due.some(r => r.client_key === item.id) ? " · Ôn lại hôm nay" : ""}</p>
        <h2 className="mt-2 text-lg font-bold">{item.en}</h2><p className="text-sm text-muted">{item.vi}</p>
        {saved && <p className="mt-2 font-bold">Đã lưu: {saved.pronunciation_score}/100</p>}
        <div className="my-3 flex flex-wrap gap-3">
          <button disabled={!!busy} className="rounded-full border border-border px-4 py-2 disabled:opacity-50" onClick={() => { if (!window.speechSynthesis) { setError("Trình duyệt chưa hỗ trợ đọc mẫu."); return; } window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(item.en); u.lang = "en-US"; u.rate = speed; window.speechSynthesis.speak(u); }}>Nghe mẫu</button>
          {busy === item.id && !recordingWord && phase === "recording" ? <button onClick={() => finishController.current?.abort()} className="liquid-glass-btn px-4 py-2">Dừng và chấm</button>
            : <button disabled={!!busy || saving || !!pending || !userId} onClick={() => record(item.id, item.en)} className="liquid-glass-btn px-4 py-2 disabled:opacity-50">{busy === item.id && !recordingWord ? saving ? "Đang lưu…" : phase === "preparing" ? "Đang chuẩn bị…" : "Đang chấm…" : "Thu âm và chấm"}</button>}
          {busy === item.id && !recordingWord && !saving && <button className="underline" onClick={() => controller.current?.abort()}>Hủy</button>}
          <button disabled={!!busy} onClick={() => { setSelected(selected === item.id ? null : item.id); setDrill(null); setWordResult(null); }} className="text-sm underline">{selected === item.id ? "Ẩn chi tiết" : "Chi tiết và lịch sử"}</button>
        </div>
        {busy === item.id && !recordingWord && <div className="mb-3 rounded-xl bg-primary-soft/40 p-3 text-sm">
          <p role="status">{saving ? "Đang lưu kết quả…" : phase === "preparing" ? "Đang chuẩn bị dịch vụ và microphone. Chưa bắt đầu thu."
            : phase === "recording" ? "Đang thu — hãy nói ngay." : "Đã dừng micro. Đang chấm bản thu…"}</p>
          {phase === "recording" && <p className="mt-1 font-mono tabular-nums" aria-label="Thời gian thu">00:{String(seconds).padStart(2, "0")} / 00:30</p>}
        </div>}
        {audio?.id === item.id && !audio.word && <div><p className="mb-1 text-xs text-muted">Bản thu cả câu</p><audio aria-label="Nghe lại bản thu" controls src={audio.url} className="w-full" /></div>}
        {selected === item.id && <div className="mt-4 space-y-3 text-sm">
          {result && <><p>Chính xác: <b>{result.accuracy}</b> · Trôi chảy: <b>{result.fluency}</b> · Đầy đủ: <b>{result.completeness}</b></p><p>Máy nghe được: {result.recognized || "—"}</p>
          <div className="flex flex-wrap gap-2">{result.words?.map((word,i) => <button key={i} disabled={!!busy || saving || !!pending || !isSingleWord(word.word)} onClick={() => { setDrill({ id: item.id, word: word.word, error: word.error }); setWordResult(null); }} aria-pressed={drill?.id === item.id && drill.word === word.word && drill.error === word.error} className={`rounded-lg border px-2 py-1 disabled:opacity-50 ${word.accuracy < 80 || word.error !== "None" ? "border-amber-500 text-amber-700 dark:text-amber-300" : "border-border"}`}>{word.word}: {word.accuracy} {word.error === "Omission" ? "· thiếu từ" : word.error === "Insertion" ? "· thừa từ" : word.error === "Mispronunciation" ? "· cần sửa âm" : ""}</button>)}</div><p className="text-xs text-muted">Bấm vào một từ để nghe mẫu và luyện riêng. Từ màu vàng cần chú ý; câu dưới 80 điểm sẽ được ưu tiên từ ngày hôm sau.</p></>}
          {drill?.id === item.id && <ShadowWordPractice key={`${drill.id}:${drill.word}:${drill.error}`} word={drill.word} error={drill.error} result={wordResult} disabled={!!busy || saving || !!pending || !userId}
            recording={busy === item.id && recordingWord ? { phase, seconds } : null}
            audioUrl={audio?.id === item.id && audio.word === drill.word ? audio.url : undefined}
            onFinish={() => finishController.current?.abort()} onCancel={() => controller.current?.abort()}
            onRecord={() => record(item.id, drill.word, true)} onBack={() => { setDrill(null); setWordResult(null); }} />}
          {historyError ? <p role="alert">Chưa tải được lịch sử. Đóng rồi mở lại chi tiết để thử lại.</p> : <><p className="font-semibold">10 lần luyện gần nhất</p>{history.length === 0 && <p>Chưa có lịch sử chi tiết.</p>}{history.length > 1 && <p>So với lần trước: {history[0].pronunciation_score - history[1].pronunciation_score > 0 ? "+" : ""}{history[0].pronunciation_score - history[1].pronunciation_score} điểm</p>}<ol className="space-y-2">{history.map(r => <li key={r.id}>{new Date(r.created_at).toLocaleString("vi-VN")} · <b>{r.pronunciation_score}/100</b> · mẫu {r.speed_rate}x</li>)}</ol></>}
        </div>}
      </section>;
    })}</div>
  </main>;
}
