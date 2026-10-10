import { getUserId } from "./authUser";
import { supabaseAdmin } from "./supabaseAdmin";

/** Bound the actual body, including chunked requests without Content-Length. */
export async function bodyWithinLimit(req: Request, limit = 16000): Promise<boolean> {
  const reader = req.clone().body?.getReader();
  if (!reader) return true;
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return true;
      bytes += value.byteLength;
      if (bytes > limit) { void reader.cancel(); return false; }
    }
  } finally { reader.releaseLock(); }
}

export async function guardPaidApi(req: Request): Promise<Response | null> {
  const userId = await getUserId(req);
  if (!userId) return Response.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (req.url.length > 2000 || !(await bodyWithinLimit(req)))
    return Response.json({ error: "Nội dung quá dài." }, { status: 413 });
  try {
    const { data, error } = await supabaseAdmin().rpc("consume_api_quota", { p_user: userId });
    if (error) throw error;
    if (!data) return Response.json({ error: "Đã đạt hạn mức. Vui lòng thử lại sau." }, { status: 429, headers: { "Retry-After": "60" } });
    return null;
  } catch {
    return Response.json({ error: "Dịch vụ tạm thời chưa sẵn sàng." }, { status: 503 });
  }
}
