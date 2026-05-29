"use client";

import { useEffect, useState } from "react";

// Lưu trữ tạm bằng localStorage cho bản demo (thật sẽ thay bằng Supabase).
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // bỏ qua dữ liệu hỏng
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (loaded) localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function countSentences(text: string) {
  const matches = text.trim().match(/[^.!?]+[.!?]+/g);
  if (matches) return matches.length;
  return text.trim().length > 0 ? 1 : 0;
}
