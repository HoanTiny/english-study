// Server-only: client Supabase dùng SERVICE ROLE KEY (bỏ qua RLS) để CMS ghi dữ liệu.
// Phân quyền: 'admin' (toàn quyền + quản lý tài khoản) · 'editor' (chỉ sửa nội dung).
//  - Email trong ADMIN_EMAILS → luôn là admin (bootstrap, không xoá được qua UI).
//  - Còn lại lấy theo cột profiles.role.
// KHÔNG import ở client.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

export type CmsRole = "admin" | "editor" | null;

// Hạ tầng admin sẵn sàng (có service role để ghi DB / ký URL).
export function adminConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function supabaseAdmin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Email admin "cố định" (env ADMIN_EMAILS, phân tách dấu phẩy) — bootstrap super-admin.
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function bearer(req: Request): string {
  const authz = req.headers.get("authorization") || "";
  return (
    req.headers.get("x-admin-key") ||
    (authz.startsWith("Bearer ") ? authz.slice(7) : "")
  );
}

// Xác thực token Supabase → trả userId + email, hoặc null.
async function userFromReq(req: Request): Promise<{ id: string; email: string | null } | null> {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = bearer(req);
  if (!url || !anon || !token) return null;
  try {
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

// Vai trò của user gửi request: email bootstrap → 'admin'; ngược lại đọc profiles.role.
export async function getRequestRole(req: Request): Promise<CmsRole> {
  const u = await userFromReq(req);
  if (!u) return null;
  if (u.email && adminEmails().includes(u.email.toLowerCase())) return "admin";
  try {
    const { data } = await supabaseAdmin()
      .from("profiles")
      .select("role")
      .eq("id", u.id)
      .maybeSingle();
    return data?.role === "admin" || data?.role === "editor" ? data.role : null;
  } catch {
    return null;
  }
}

// admin = toàn quyền (quản lý tài khoản, seed…).
export async function checkAdmin(req: Request): Promise<boolean> {
  return (await getRequestRole(req)) === "admin";
}

// CMS = được sửa nội dung (admin hoặc editor).
export async function checkCms(req: Request): Promise<boolean> {
  const role = await getRequestRole(req);
  return role === "admin" || role === "editor";
}
