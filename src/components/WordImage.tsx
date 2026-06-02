"use client";

import { useEffect, useState } from "react";

type Pic = { image: string; creator?: string; license?: string; licenseUrl?: string; source?: string; title?: string };
type ImgData = { found: boolean; results: Pic[] };

const memo = new Map<string, ImgData>();
const mkey = (word: string, meaning?: string) => `${word.trim().toLowerCase()}|${(meaning ?? "").trim()}`;

export async function fetchWordImage(word: string, meaning?: string): Promise<ImgData | null> {
  const q = word.trim().toLowerCase();
  if (!q) return null;
  const k = mkey(word, meaning);
  if (memo.has(k)) return memo.get(k)!;
  try {
    const r = await fetch(`/api/word-image?q=${encodeURIComponent(q)}&vi=${encodeURIComponent(meaning ?? "")}`);
    const d = (await r.json()) as ImgData;
    const data: ImgData = { found: !!d.found, results: d.results ?? [] };
    memo.set(k, data);
    if (data.results[0]?.image && typeof window !== "undefined") {
      const im = new window.Image();
      im.src = data.results[0].image;
    }
    return data;
  } catch {
    return null;
  }
}

// Ảnh minh hoạ từ vựng (Openverse, CC) + ghi nguồn + đổi ảnh. Ẩn nếu không có.
export default function WordImage({ word, meaning }: { word: string; meaning?: string }) {
  const [data, setData] = useState<ImgData | null>(() => memo.get(mkey(word, meaning)) ?? null);
  const [idx, setIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const cached = memo.get(mkey(word, meaning));
    setData(cached ?? null);
    setIdx(0);
    setImgLoaded(false);
    if (cached) return;
    fetchWordImage(word, meaning).then((d) => active && setData(d));
    return () => {
      active = false;
    };
  }, [word, meaning]);

  if (data && (!data.found || data.results.length === 0)) return null;

  const pics = data?.results ?? [];
  const pic = pics[idx];
  const loading = !data || (pic && !imgLoaded);

  function next() {
    if (pics.length < 2) return;
    setImgLoaded(false);
    setIdx((i) => (i + 1) % pics.length);
  }

  return (
    <figure className="w-full max-w-[220px] mx-auto">
      <div className="relative h-36 w-full rounded-2xl border border-border/60 bg-white overflow-hidden shadow-sm">
        {loading && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted">đang tải ảnh…</span>
          </div>
        )}
        {pic?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={pic.image}
            src={pic.image}
            alt={word}
            loading="eager"
            onLoad={() => setImgLoaded(true)}
            onError={next}
            className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {pics.length > 1 && imgLoaded && (
          <button
            type="button"
            onClick={next}
            title="Ảnh khác"
            className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-black text-white backdrop-blur hover:bg-black/70"
          >
            🔄 ảnh khác
          </button>
        )}
      </div>
      {pic && imgLoaded && (pic.creator || pic.license) && (
        <figcaption className="mt-1 text-center text-[8px] font-semibold text-muted/70 leading-tight">
          Ảnh:{" "}
          {pic.source ? (
            <a href={pic.source} target="_blank" rel="noopener noreferrer" className="underline">{pic.creator || "nguồn"}</a>
          ) : (
            pic.creator || "nguồn"
          )}
          {pic.license && (
            <>
              {" · "}
              {pic.licenseUrl ? (
                <a href={pic.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{pic.license}</a>
              ) : (
                pic.license
              )}
            </>
          )}{" · Openverse"}
        </figcaption>
      )}
    </figure>
  );
}
