import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, checkAdmin, adminEmails } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

async function guard(req: Request): Promise<NextResponse | null> {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  if (!(await checkAdmin(req)))
    return NextResponse.json({ error: "Chỉ admin mới quản lý được tài khoản." }, { status: 401 });
  return null;
}

// GET — danh sách tài khoản (có email) + vai trò.
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, display_name, role, created_at, last_active")
    .not("email", "is", null)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const envAdmins = new Set(adminEmails());
  const users = (data ?? []).map((u) => {
    const envAdmin = !!u.email && envAdmins.has(u.email.toLowerCase());
    return {
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      // Email cố định trong ADMIN_EMAILS luôn là admin (không sửa qua UI).
      role: envAdmin ? "admin" : (u.role ?? null),
      envAdmin,
      lastActive: u.last_active,
    };
  });
  return NextResponse.json({ users });
}

// PATCH — đặt vai trò cho 1 tài khoản. Body: { id, role: 'admin'|'editor'|null }.
export async function PATCH(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;

  const body = (await req.json().catch(() => ({}))) as { id?: string; role?: string | null };
  const id = body.id;
  const role = body.role === "admin" || body.role === "editor" ? body.role : null;
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });

  // Không cho đổi vai trò của email admin cố định (env) — họ luôn là admin.
  const { data: row } = await supabaseAdmin().from("profiles").select("email").eq("id", id).maybeSingle();
  if (row?.email && adminEmails().includes(row.email.toLowerCase()))
    return NextResponse.json({ error: "Tài khoản admin cố định (ADMIN_EMAILS) không đổi được qua UI." }, { status: 400 });

  const { error } = await supabaseAdmin().from("profiles").update({ role }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, role });
}
