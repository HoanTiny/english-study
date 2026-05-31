// Server-only: client Supabase dùng SERVICE ROLE KEY (bỏ qua RLS) để CMS ghi dữ liệu.
// Bảo vệ bằng mật mã admin (env ADMIN_PASSCODE). KHÔNG import ở client.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function adminConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.ADMIN_PASSCODE;
}

export function supabaseAdmin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Kiểm tra header x-admin-key khớp mật mã admin.
export function checkAdmin(req: Request): boolean {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) return false;
  const key = req.headers.get("x-admin-key");
  return !!key && key === passcode;
}
