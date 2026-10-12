// Client helper: lấy IPA + audio người bản xứ cho MỘT từ qua /api/pronounce.
// Có cache trong bộ nhớ trình duyệt để không gọi lại cùng một từ.

export type Accent = { ipa?: string; audio?: string; cached?: boolean; synthetic?: boolean; ipaSources?: string[]; reviewStatus?: string; attribution?: { creator?: string; sourceUrl?: string; license?: string; licenseUrl?: string } };
export type Pronounce = {
  found: boolean;
  word?: string;
  ipa?: string;
  audio?: string;
  pronunciationRevision?: string;
  needsReview?: boolean;
  us?: Accent;
  uk?: Accent;
  pos?: string[];
  error?: "timeout" | "unavailable";
};

const memo = new Map<string, { data: Pronounce; at: number }>();
const CACHE_MS = 5 * 60 * 1000;
export const canPronounce = (word: string) => word.trim().length <= 160 && /^[a-zé][a-zé '’.,!?;:-]*$/i.test(word.trim());

/** Chỉ áp dụng cho từ đơn (không khoảng trắng, chỉ chữ cái/’/-). */
export function isSingleWord(text: string): boolean {
  return /^[a-zA-Z][a-zA-Z'’-]*$/.test(text.trim());
}

export async function fetchPronounce(word: string, options: { signal?: AbortSignal; force?: boolean } = {}): Promise<Pronounce> {
  const key = word.trim().toLowerCase();
  if (!canPronounce(key)) return { found: false };
  const cached = memo.get(key);
  if (!options.force && cached && Date.now() - cached.at < (cached.data.found ? CACHE_MS : 15000)) return cached.data;
  const timeout = AbortSignal.timeout(8000);
  try {
    const res = await fetch(`/api/pronounce?word=${encodeURIComponent(key)}`, {
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
    if (!res.ok) return { found: false, error: res.status === 504 ? "timeout" : "unavailable" };
    const data: Pronounce = await res.json();
    if (typeof data?.found !== "boolean" || data.error) return { found: false, error: "unavailable" };
    if (memo.size >= 300) memo.delete(memo.keys().next().value!);
    memo.set(key, { data, at: Date.now() });
    return data;
  } catch {
    return { found: false, error: timeout.aborted ? "timeout" : "unavailable" };
  }
}
