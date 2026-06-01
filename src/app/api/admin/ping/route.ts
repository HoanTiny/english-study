import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, checkAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

// Kiểm tra nhanh mật mã admin (dùng cho đăng nhập 1 lần của CMS shell).
export async function GET(req: NextRequest) {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSCODE." }, { status: 503 });
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
