// Server-only: gọi Anthropic Claude (hỗ trợ ảnh). KHÔNG import ở client.
// Key đọc từ env ANTHROPIC_API_KEY (không có NEXT_PUBLIC → chỉ ở server).

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

export function anthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

type VisionInput = {
  system?: string;
  text: string;
  image?: { mimeType: string; data: string }; // base64 (không kèm tiền tố data:)
  temperature?: number;
  maxTokens?: number;
};

/** Gọi Claude với 1 ảnh + 1 đoạn text, trả về text trả lời. */
export async function anthropicVision(opts: VisionInput): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY chưa được cấu hình");

  const content: unknown[] = [];
  if (opts.image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: opts.image.mimeType, data: opts.image.data },
    });
  }
  content.push({ type: "text", text: opts.text });

  const body = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.2,
    ...(opts.system ? { system: opts.system } : {}),
    messages: [{ role: "user", content }],
  };

  // 429 (rate limit) / 529 (overloaded) là tạm thời → thử lại với backoff.
  const MAX = 3;
  let res!: Response;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) break;
    const detail = await res.text().catch(() => "");
    if ((res.status !== 429 && res.status !== 529) || attempt === MAX) {
      throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }

  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (json.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();
}
