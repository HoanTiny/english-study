// Server-only: sinh văn bản với fallback Gemini → Groq (OpenAI-compat).
import { geminiConfigured, geminiGenerate } from "@/lib/server/gemini";
import { openaiCompatConfigured, openaiCompatVision } from "@/lib/server/openaiCompat";

export function textProviderConfigured(): boolean {
  return geminiConfigured() || openaiCompatConfigured();
}

export async function generateText(opts: {
  system?: string;
  user: string;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<{ text: string; provider: string }> {
  // Gemini trước.
  if (geminiConfigured()) {
    try {
      const text = await geminiGenerate(
        [{ role: "user", parts: [{ text: opts.user }] }],
        { system: opts.system, jsonMode: opts.jsonMode, temperature: opts.temperature ?? 0.4 },
      );
      return { text, provider: "gemini" };
    } catch {
      /* rớt sang Groq */
    }
  }
  if (openaiCompatConfigured()) {
    const sys = opts.jsonMode
      ? `${opts.system ?? ""}\nChỉ trả về JSON hợp lệ, không kèm văn bản khác.`
      : opts.system;
    const text = await openaiCompatVision({ system: sys, text: opts.user, temperature: opts.temperature ?? 0.4 });
    return { text, provider: "openai-compat" };
  }
  throw new Error("Chưa cấu hình provider AI (GEMINI / OPENAI_COMPAT).");
}

// Bóc JSON từ chuỗi (kể cả khi bị bọc ```json ... ```).
export function parseJsonLoose<T>(s: string): T | null {
  const t = s.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(t) as T;
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(t.slice(a, b + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
