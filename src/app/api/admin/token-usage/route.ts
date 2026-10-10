import { checkAdmin, supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  if (!(await checkAdmin(req))) return Response.json({ error: "Chỉ admin được xem thống kê token." }, { status: 403 });
  const month = new URL(req.url).searchParams.get("month");
  if (!month || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ error: "Tháng không hợp lệ." }, { status: 400 });
  try {
    const db = supabaseAdmin();
    const [usage, limits] = await Promise.all([
      db.rpc("ai_token_report", { p_month: `${month}-01` }),
      db.from("ai_token_limits").select("user_id,monthly_limit"),
    ]);
    if (usage.error || limits.error) throw new Error("database");
    return Response.json({ usage: usage.data, limits: limits.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Chưa tải được thống kê token. Kiểm tra đã chạy db/migrate_ai_token_usage.sql trong Supabase." }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin(req))) return Response.json({ error: "Chỉ admin được đổi hạn mức token." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !UUID.test(body.id) ||
      (body.monthlyLimit !== null && (!Number.isSafeInteger(body.monthlyLimit) || body.monthlyLimit < 0 || body.monthlyLimit > 1000000000))) {
    return Response.json({ error: "Hạn mức phải là số nguyên 0–1.000.000.000; null là không giới hạn." }, { status: 400 });
  }
  try {
    const { error } = await supabaseAdmin().rpc("set_ai_token_limit", { p_user: body.id, p_limit: body.monthlyLimit });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Chưa lưu được hạn mức. Kiểm tra tài khoản và migration token." }, { status: 503 });
  }
}
