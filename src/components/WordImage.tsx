"use client";
import { useEffect, useState } from "react";
import { cachedWordImage, fetchWordImage } from "@/lib/wordImages";
import { wordImageKey, type WordImageResult } from "@/lib/wordImageTypes";
export { fetchWordImage } from "@/lib/wordImages";

export default function WordImage({ word, meaning }: { word: string; meaning?: string }) {
  return <UploadedImage key={wordImageKey(word, meaning)} word={word} meaning={meaning} />;
}
function UploadedImage({ word, meaning }: { word: string; meaning?: string }) {
  const [data, setData] = useState<WordImageResult | null>(() => cachedWordImage(word, meaning));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetchWordImage(word, meaning).then(result => { if (active) setData(result); });
    return () => { active = false; };
  }, [word, meaning]);
  const picture = data?.found ? data.results[0] : null;
  if (!picture || failed) return null;
  return <figure className="w-full max-w-[220px] mx-auto">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={picture.image} alt={`Minh họa cho ${word}`} onError={() => setFailed(true)} className="w-full aspect-square object-contain rounded-2xl" />
  </figure>;
}
