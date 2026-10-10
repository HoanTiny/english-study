import { parseTokenUsage, reserveTokens, settleTokens, tokenUser, TokenBudgetError } from "./tokenUsage";
// Server-only helper gọi Google Gemini (Flash). KHÔNG import ở client.
// Key đọc từ env GEMINI_API_KEY (không có tiền tố NEXT_PUBLIC → chỉ ở server).

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Model có thể đổi qua env; mặc định Flash cho rẻ/nhanh.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
type GeminiContent = { role?: string; parts: GeminiPart[] };

type GenerateOptions = {
  request: Request;
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
  opts: GenerateOptions,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY chưa được cấu hình");
  const user = await tokenUser(opts.request);

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

  // countTokens includes the system instruction and any inline image. It does not generate text.
  const count = await fetch(`${API_BASE}/${MODEL}:countTokens`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ generateContentRequest: { model: `models/${MODEL}`, ...body } }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => { throw new TokenBudgetError("Chưa kết nối được dịch vụ đếm token. Vui lòng thử lại sau."); });
  if (!count.ok) throw new TokenBudgetError("Chưa đếm được token. Vui lòng thử lại sau.");
  const counted = await count.json().catch(() => { throw new TokenBudgetError("Không đọc được số token đầu vào."); });
  if (!counted || !Number.isSafeInteger(counted.totalTokens) || counted.totalTokens < 0 || counted.totalTokens > 1999936) throw new TokenBudgetError("Không đọc được số token đầu vào.");
  // A small buffer covers tokenizer differences between counting and generation.
  const reservation = await reserveTokens(opts.request, counted.totalTokens + 64, MODEL, user);
  (body.generationConfig as Record<string, unknown>).maxOutputTokens = reservation.maxOutputTokens;
  let json: { candidates?: { content?: { parts?: GeminiPart[] } }[]; usageMetadata?: unknown };
  let outcome: "uncertain" | "released" = "uncertain";
  try {
    // Do not retry generation automatically: an interrupted request may already be billable.
    const res = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body), signal: AbortSignal.timeout(40000),
    });
    if (!res.ok) {
      if ([400,401,403,404,429].includes(res.status)) outcome = "released";
      throw new Error(`Gemini tạm thời không khả dụng (${res.status}).`);
    }
    json = await res.json();
  } catch (error) {
    await settleTokens(reservation.id, outcome);
    throw error;
  }
  const usage = parseTokenUsage(json?.usageMetadata);
  if (!usage) {
    await settleTokens(reservation.id, "uncertain");
    throw new TokenBudgetError("Gemini chưa trả số liệu token hợp lệ. Hạn mức tạm giữ chờ đối soát.");
  }
  await settleTokens(reservation.id, "completed", usage);
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";
  return text.trim();
}
