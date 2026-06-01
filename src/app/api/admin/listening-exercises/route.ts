import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, checkAdmin } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

const COLS =
  "id, unit, section, activity, title, level, cd, track, audio_path, instructions, type, items, transcript, visible, sort_order, created_at";

function guard(req: Request): NextResponse | null {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSCODE." }, { status: 503 });
  if (!checkAdmin(req)) return NextResponse.json({ error: "Sai mật mã admin." }, { status: 401 });
  return null;
}

// GET — danh sách (gồm ẩn) hoặc ?id= để lấy chi tiết.
export async function GET(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  const db = supabaseAdmin();
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const { data, error } = await db.from("listening_exercises").select(COLS).eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ exercise: data });
  }
  const { data, error } = await db
    .from("listening_exercises")
    .select(COLS)
    .order("unit", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exercises: data ?? [] });
}

// POST — { action: "save" | "delete" | "toggleVisible", ... }
export async function POST(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  const db = supabaseAdmin();
  const body = await req.json().catch(() => ({}));

  if (body.action === "save") {
    const e = body.exercise ?? {};
    if (!e.title) return NextResponse.json({ error: "Thiếu tiêu đề." }, { status: 400 });
    const row = {
      unit: e.unit ?? null,
      section: e.section ?? null,
      activity: e.activity ?? null,
      title: e.title,
      level: e.level ?? "A2",
      cd: e.cd ?? null,
      track: e.track ?? null,
      instructions: e.instructions ?? null,
      type: e.type ?? "mc",
      items: e.items ?? [],
      transcript: e.transcript ?? null,
      visible: e.visible ?? true,
      sort_order: e.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (e.id) {
      const { error } = await db.from("listening_exercises").update(row).eq("id", e.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: e.id });
    }
    const { data, error } = await db.from("listening_exercises").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (body.action === "toggleVisible") {
    const { error } = await db
      .from("listening_exercises")
      .update({ visible: !!body.visible, updated_at: new Date().toISOString() })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    const { error } = await db.from("listening_exercises").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
