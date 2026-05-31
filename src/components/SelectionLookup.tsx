"use client";

import { useEffect, useState } from "react";
import DictionaryModal from "./DictionaryModal";

// Bôi đen từ/cụm bất kỳ trong app → hiện nút "🔎 Tra" nổi → mở từ điển tra ngay.
export default function SelectionLookup() {
  const [chip, setChip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [query, setQuery] = useState<string | null>(null);

  useEffect(() => {
    function onUp() {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      // Chỉ bắt từ/cụm ngắn có chữ cái (kể cả tiếng Việt), tối đa 6 từ.
      if (!text || text.length > 40 || text.split(/\s+/).length > 6 || !/[a-zA-ZÀ-ỹ]/.test(text)) {
        setChip(null);
        return;
      }
      // Bỏ qua khi đang chọn trong ô nhập / vùng soạn thảo / chính popup từ điển.
      const node = sel?.anchorNode;
      const el = node?.nodeType === 3 ? node.parentElement : (node as HTMLElement | null);
      if (el?.closest("input,textarea,[contenteditable='true'],[data-no-lookup]")) {
        setChip(null);
        return;
      }
      try {
        const rect = sel!.getRangeAt(0).getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setChip(null);
          return;
        }
        setChip({ text, x: rect.left + rect.width / 2, y: rect.top });
      } catch {
        setChip(null);
      }
    }
    function clear() {
      setChip(null);
    }
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("scroll", clear, true);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("scroll", clear, true);
    };
  }, []);

  return (
    <>
      {chip && query === null && (
        <button
          onMouseDown={(e) => e.preventDefault()} // giữ vùng chọn khi bấm
          onClick={() => {
            setQuery(chip.text);
            setChip(null);
          }}
          style={{ position: "fixed", left: chip.x, top: Math.max(8, chip.y - 46), transform: "translateX(-50%)" }}
          className="z-[90] rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          🔎 Tra “{chip.text.length > 16 ? chip.text.slice(0, 16) + "…" : chip.text}”
        </button>
      )}
      <DictionaryModal open={query !== null} initialQuery={query ?? undefined} onClose={() => setQuery(null)} />
    </>
  );
}
