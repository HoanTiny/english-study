import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, getRequestRole } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

// Trả vai trò CMS của tài khoản đang đăng nhập (admin | editor | null).
// LUÔN trả 200 để tránh log lỗi 401 ồn ào ở console (kiểm tra này chạy trên mọi trang).
// Quyền thực thi vẫn được chặn ở từng API admin (checkCms/checkAdmin).
export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ ok: false, role: null });
  const role = await getRequestRole(req);
  return NextResponse.json({ ok: !!role, role: role ?? null });
}
