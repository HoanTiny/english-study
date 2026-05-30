import { NextRequest } from "next/server";

export const runtime = "nodejs";

// Lấy IPA + audio phát âm của MỘT từ tiếng Anh từ Free Dictionary API
// (dictionaryapi.dev — miễn phí, mã nguồn mở). Có cache trong bộ nhớ server
// để giảm gọi mạng và né rate-limit không công bố của API gốc.
//
// GET /api/pronounce?word=hello
//   → { found: true, word, ipa: "/həˈloʊ/", audio: "https://…mp3" }
//   → { found: false } khi không có dữ liệu (client tự fallback sang TTS)

const API = "https://api.dictionaryapi.dev/api/v2/entries/en";

type PronounceResult = { found: boolean; word?: string; ipa?: string; audio?: string };

// Cache đơn giản theo vòng đời tiến trình. TTL 7 ngày; giới hạn số mục để khỏi phình bộ nhớ.
const cache = new Map<string, { data: PronounceResult; at: number }>();
const TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

type DictPhonetic = { text?: string; audio?: string };
type DictEntry = { word?: string; phonetic?: string; phonetics?: DictPhonetic[] };

function extract(entries: DictEntry[]): PronounceResult {
  const word = entries[0]?.word;
  const phonetics = entries.flatMap((e) => e.phonetics ?? []);
  // IPA: ưu tiên trường `phonetic` ở cấp entry, nếu không lấy text đầu tiên có nội dung.
  const ipa =
    entries.find((e) => e.phonetic?.trim())?.phonetic?.trim() ||
    phonetics.find((p) => p.text?.trim())?.text?.trim() ||
    undefined;
  // Audio: link mp3 đầu tiên không rỗng.
  const audio = phonetics.find((p) => p.audio?.trim())?.audio?.trim() || undefined;
  if (!ipa && !audio) return { found: false };
  return { found: true, word, ipa, audio };
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("word") ?? "";
  const word = raw.trim().toLowerCase();

  // Free Dictionary API chỉ tra được TỪ ĐƠN; chặn chuỗi rỗng/quá dài/nhiều từ.
  if (!word || word.length > 40 || /\s/.test(word) || !/^[a-z][a-z'’-]*$/.test(word)) {
    return Response.json(
      { found: false, error: "invalid_word" },
      { status: word ? 422 : 400 },
    );
  }

  const hit = cache.get(word);
  if (hit && Date.now() - hit.at < TTL) {
    return Response.json(hit.data, { headers: { "x-cache": "hit" } });
  }

  try {
    const res = await fetch(`${API}/${encodeURIComponent(word)}`, {
      headers: { Accept: "application/json" },
      // Cache phía Next/CDN thêm 1 ngày.
      next: { revalidate: 86_400 },
    });

    let data: PronounceResult;
    if (res.status === 404) {
      data = { found: false };
    } else if (!res.ok) {
      return Response.json({ found: false, error: "upstream" }, { status: 502 });
    } else {
      const json = (await res.json()) as DictEntry[];
      data = Array.isArray(json) ? extract(json) : { found: false };
    }

    // Lưu cache (kể cả kết quả "không tìm thấy" để khỏi gọi lại liên tục).
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(word, { data, at: Date.now() });

    return Response.json(data, { headers: { "x-cache": "miss" } });
  } catch (e) {
    console.error("pronounce error", e);
    return Response.json({ found: false, error: "exception" }, { status: 502 });
  }
}
