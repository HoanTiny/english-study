"use client";
import { useEffect, useRef, useState } from "react";
import { canPronounce, fetchPronounce, type Pronounce } from "@/lib/pronounce";
import { warmPronunciationAudio } from "@/lib/pronunciationPreload";
import { formatIpa, type PronunciationAccent } from "@/lib/accentPlayback";
import { createPronunciationPlayer, type PronunciationPlayback } from "@/lib/pronunciationPlayer";
import AppIcon from "./AppIcon";
import styles from "./WordPronunciation.module.css";
import { vocabularyIpa } from "@/lib/vocabularyPronunciation";

export default function WordPronunciation({ word, ipa }: { word: string; ipa?: string }) {
  return <Pronunciation key={word} word={word} ipa={ipa} />;
}
function Pronunciation({ word, ipa }: { word: string; ipa?: string }) {
  const reference = vocabularyIpa(word);
  const [data, setData] = useState<Pronounce | null>(null);
  const [loading, setLoading] = useState(canPronounce(word));
  const [playback, setPlayback] = useState<PronunciationPlayback | null>(null);
  const player = useRef<ReturnType<typeof createPronunciationPlayer> | null>(null);
  useEffect(() => {
    const request = new AbortController();
    player.current = createPronunciationPlayer(setPlayback);
    window.speechSynthesis?.getVoices(); // Start loading the device's voice list early.
    if (canPronounce(word) && !vocabularyIpa(word)?.needsReview) fetchPronounce(word, { signal: request.signal }).then(result => {
      if (!request.signal.aborted) { setData(result); setLoading(false); warmPronunciationAudio(result); }
    });
    return () => { request.abort(); player.current?.stop(); player.current = null; };
  }, [word]);

  function play(accent: PronunciationAccent, deviceOnly = false) {
    if (reference?.needsReview) return;
    player.current?.play({ word, accent, audio: deviceOnly ? undefined : data?.[accent]?.audio });
  }
  const label = playback?.accent.toUpperCase();
  const notice = !playback ? "" : playback.status === "loading"
    ? playback.source === "recording" ? `Đang tải bản thu ${label}…` : `Đang chuẩn bị giọng ${label} trên thiết bị…`
    : playback.status === "error"
      ? playback.error === "voice-unavailable"
        ? `Chưa có bản thu khả dụng và thiết bị chưa có giọng ${label}. Bạn có thể bật giọng ${playback.accent === "us" ? "Anh-Mỹ" : "Anh-Anh"} trong cài đặt giọng nói hoặc tra Cambridge.`
        : `Chưa phát được giọng ${label}. Bấm thử lại bên dưới; kiểm tra âm lượng và quyền âm thanh của trình duyệt.`
      : playback.source === "device"
        ? `${playback.status === "playing" ? "Đang đọc" : "Đã đọc"} bằng giọng ${label} trên thiết bị.`
        : playback.status === "playing" ? `Đang phát bản thu ${label}.` : "";
  const generalIpa = reference ? undefined : ipa || data?.ipa;
  const accentIpa = (accent: PronunciationAccent) => data?.[accent]?.reviewStatus === "editor-upload" ? data[accent]?.ipa || reference?.[accent] : reference?.[accent] || data?.[accent]?.ipa;
  if (reference?.needsReview) return <p className={styles.notice} role="status">Tên riêng này đang chờ xác minh IPA và bản đọc. Chưa dùng giọng US/UK tự đoán.</p>;
  return <div className={styles.pronunciation} aria-label="Phiên âm và phát âm">
    {generalIpa && <div className={styles.ipa} aria-label="Phiên âm IPA"><span>IPA{ipa ? " · tài liệu" : ""}</span><span lang="en-fonipa">{formatIpa(generalIpa)}</span></div>}
    <div className={styles.accents}>
      {(["us", "uk"] as const).map(accent => <button key={accent} type="button" disabled={loading} aria-label={`Nghe giọng ${accent.toUpperCase()}`} aria-pressed={playback?.accent === accent && playback.status === "playing"} aria-busy={loading || (playback?.accent === accent && playback.status === "loading")} onClick={() => play(accent)}>
        <span className={styles.accentName}>{accent.toUpperCase()}<small>{accent === "us" ? "Anh-Mỹ" : "Anh-Anh"}</small></span>
        <span className={styles.accentIpa}>{accentIpa(accent) ? <span lang="en-fonipa">{formatIpa(accentIpa(accent)!)}</span> : <small>{loading ? "Đang tra IPA…" : "Chưa có IPA riêng"}</small>}</span>
        <AppIcon name="headphones" size={18} />
      </button>)}
    </div>
    {loading && <p className={styles.notice} role="status">Đang chuẩn bị bản đọc US/UK…</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {playback?.status === "error" && <button type="button" className={styles.retry} onClick={() => play(playback.accent, true)}>Thử lại bằng giọng {label} trên thiết bị</button>}
    {reference && <p className={styles.notice}>IPA theo từng giọng · Dấu ˈ chỉ trọng âm chính. Một từ có thể có nhiều cách đọc được chấp nhận.</p>}
    {reference && <details className={styles.credits}><summary>Nguồn phiên âm</summary>
      <p>Phiên âm đã được hiệu đính từ Wiktionary và tài liệu đối chiếu. Với cụm từ, IPA thể hiện cách đọc từng từ.</p>
      <p><a href={`https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#English`} target="_blank" rel="noreferrer">Wiktionary contributors</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></p>
      {Array.from(new Set([...(data?.us?.ipaSources || []), ...(data?.uk?.ipaSources || [])])).map((source, index) => <p key={source}><a href={source} target="_blank" rel="noreferrer">Tài liệu đối chiếu {index + 1}</a></p>)}
    </details>}
    {(data?.us?.attribution || data?.uk?.attribution) && <details className={styles.credits}><summary>Nguồn âm thanh</summary>{(["us", "uk"] as const).map(accent => {
      const credit = data?.[accent]?.attribution;
      return credit ? <p key={accent}>{accent.toUpperCase()}: {data?.[accent]?.synthetic ? "Giọng tổng hợp · " : ""}{credit.creator} · <a href={credit.sourceUrl} target="_blank" rel="noreferrer">{data?.[accent]?.synthetic ? "Mô hình" : "Bản gốc"}</a> · <a href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a></p> : null;
    })}</details>}
  </div>;
}
