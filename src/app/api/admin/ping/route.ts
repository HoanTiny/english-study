import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, getRequestRole } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

// Trả vai trò CMS của tài khoản đang đăng nhập (admin | editor). 401 nếu không có quyền.
export async function GET(req: NextRequest) {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  const role = await getRequestRole(req);
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, role });
}
