// Client helper: lấy IPA + audio người bản xứ cho MỘT từ qua /api/pronounce.
// Có cache trong bộ nhớ trình duyệt để không gọi lại cùng một từ.

export type Accent = { ipa?: string; audio?: string };
export type Pronounce = {
  found: boolean;
  word?: string;
  ipa?: string;
  audio?: string;
  us?: Accent;
  uk?: Accent;
};

const memo = new Map<string, Pronounce>();

/** Chỉ áp dụng cho từ đơn (không khoảng trắng, chỉ chữ cái/’/-). */
export function isSingleWord(text: string): boolean {
  return /^[a-zA-Z][a-zA-Z'’-]*$/.test(text.trim());
}

export async function fetchPronounce(word: string): Promise<Pronounce> {
  const key = word.trim().toLowerCase();
  const cached = memo.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/pronounce?word=${encodeURIComponent(key)}`);
    const data: Pronounce = res.ok ? await res.json() : { found: false };
    memo.set(key, data);
    return data;
  } catch {
    return { found: false };
  }
}
