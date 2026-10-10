import { getUserId } from "./authUser";
import { supabaseAdmin } from "./supabaseAdmin";

export class TokenBudgetError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
export function tokenErrorResponse(error: unknown): Response | null {
  return error instanceof TokenBudgetError ? Response.json({ error: error.message }, { status: error.status }) : null;
}
export type TokenUsage = { input: number; output: number; thinking: number; total: number };
export function parseTokenUsage(raw: unknown): TokenUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const input = r.promptTokenCount;
  const output = r.candidatesTokenCount ?? 0;
  const thinking = r.thoughtsTokenCount ?? 0;
  const total = r.totalTokenCount;
  if (![input,output,thinking,total].every(n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0)) return null;
  if ((total as number) < (input as number)+(output as number)+(thinking as number)) return null;
  return { input: input as number, output: output as number, thinking: thinking as number, total: total as number };
}
export async function tokenUser(req: Request): Promise<string> {
  // CMS uses x-admin-key containing a Supabase access token, never a user ID from the body.
  const headers = new Headers(req.headers);
  if (!headers.has("authorization") && headers.has("x-admin-key")) headers.set("authorization", `Bearer ${headers.get("x-admin-key")}`);
  const user = await getUserId(new Request(req.url, { headers }));
  if (!user) throw new TokenBudgetError("Vui lòng đăng nhập để dùng AI.", 401);
  return user;
}
export async function reserveTokens(req: Request, input: number, model: string, authenticatedUser?: string) {
  const user = authenticatedUser ?? await tokenUser(req);
  const id = crypto.randomUUID();
  const { data, error } = await supabaseAdmin().rpc("reserve_ai_tokens", {
    p_id: id, p_user: user, p_input: input, p_output: 8192, p_model: model, p_feature: new URL(req.url).pathname,
  });
  if (error || !data || typeof data.allowed !== "boolean") throw new TokenBudgetError("Chưa kiểm tra được hạn mức token. Vui lòng thử lại sau.");
  if (!data.allowed) throw new TokenBudgetError("Hạn mức token Gemini tháng này không đủ cho yêu cầu. Liên hệ admin để tăng hạn mức.", 429);
  if (!Number.isInteger(data.maxOutputTokens) || data.maxOutputTokens < 256 || data.maxOutputTokens > 8192) throw new TokenBudgetError("Hạn mức token không hợp lệ.");
  return { id, maxOutputTokens: data.maxOutputTokens as number };
}
export async function settleTokens(id: string, status: "completed" | "uncertain" | "released", usage?: TokenUsage) {
  const { error } = await supabaseAdmin().rpc("settle_ai_tokens", {
    p_id: id, p_status: status, p_input: usage?.input ?? 0, p_output: usage?.output ?? 0,
    p_thinking: usage?.thinking ?? 0, p_total: usage?.total ?? 0,
  });
  if (error) throw new TokenBudgetError("Chưa lưu được thống kê token. Hạn mức đã được tạm giữ để tránh vượt mức.");
}
