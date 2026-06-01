// Server-only: gọi API kiểu OpenAI-compatible (Groq / OpenRouter / Mistral / …)
// để OCR ảnh. Cấu hình qua env — đổi nhà cung cấp mà không sửa code.
//   OPENAI_COMPAT_BASE_URL  (vd https://api.groq.com/openai/v1)
//   OPENAI_COMPAT_API_KEY
//   OPENAI_COMPAT_MODEL     (model có hỗ trợ ảnh)

export function openaiCompatConfigured(): boolean {
  return (
    !!process.env.OPENAI_COMPAT_BASE_URL &&
    !!process.env.OPENAI_COMPAT_API_KEY &&
    !!process.env.OPENAI_COMPAT_MODEL
  );
}

type VisionInput = {
  system?: string;
  text: string;
  image?: { mimeType: string; data: string }; // base64
  temperature?: number;
  maxTokens?: number;
};

export async function openaiCompatVision(opts: VisionInput): Promise<string> {
  const base = process.env.OPENAI_COMPAT_BASE_URL!;
  const key = process.env.OPENAI_COMPAT_API_KEY!;
  const model = process.env.OPENAI_COMPAT_MODEL!;

  const content: unknown[] = [{ type: "text", text: opts.text }];
  if (opts.image) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${opts.image.mimeType};base64,${opts.image.data}` },
    });
  }
  const messages: unknown[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content });

  const body = {
    model,
    messages,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.2,
  };

  const url = `${base.replace(/\/$/, "")}/chat/completions`;
  const MAX = 3;
  let res!: Response;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) break;
    const detail = await res.text().catch(() => "");
    if ((res.status !== 429 && res.status !== 503 && res.status !== 529) || attempt === MAX) {
      throw new Error(`OCR provider ${res.status}: ${detail.slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (json.choices?.[0]?.message?.content ?? "").trim();
}
