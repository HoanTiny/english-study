// Server-only helper gọi Google Gemini (Flash). KHÔNG import ở client.
// Key đọc từ env GEMINI_API_KEY (không có tiền tố NEXT_PUBLIC → chỉ ở server).

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Model có thể đổi qua env; mặc định Flash cho rẻ/nhanh.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

type GeminiPart = { text?: string };
type GeminiContent = { role?: string; parts: GeminiPart[] };

type GenerateOptions = {
  system?: string;
  // Nếu muốn JSON thuần, đặt jsonMode = true.
  jsonMode?: boolean;
  temperature?: number;
};

/**
 * Gọi Gemini generateContent. `contents` là mảng hội thoại (role: "user"|"model").
 * Trả về chuỗi text của lượt trả lời. Ném lỗi nếu chưa cấu hình hoặc API lỗi.
 */
export async function geminiGenerate(
  contents: GeminiContent[],
  opts: GenerateOptions = {},
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY chưa được cấu hình");

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  // Gemini Flash thỉnh thoảng trả 503 "high demand" / 429 (rate limit) —
  // đều tạm thời, nên thử lại với backoff trước khi báo lỗi.
  const url = `${API_BASE}/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const MAX_ATTEMPTS = 3;
  let res!: Response;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) break;
    const detail = await res.text().catch(() => "");
    const retryable = res.status === 503 || res.status === 429;
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
    }
    // backoff tăng dần: 0.8s, 1.6s
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: GeminiPart[] } }[];
  };
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";
  return text.trim();
}
