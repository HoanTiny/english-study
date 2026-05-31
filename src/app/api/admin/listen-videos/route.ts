import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, adminConfigured, checkAdmin } from "@/lib/server/supabaseAdmin";
import { parseVideoId, hasCaptions, getMeta } from "@/lib/server/youtube";

export const runtime = "nodejs";

const COLS = "id, video_id, title, channel, topic, level, cc, hidden, sort_order";

function guard(req: Request): NextResponse | null {
  if (!adminConfigured())
    return NextResponse.json({ error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSCODE." }, { status: 503 });
  if (!checkAdmin(req)) return NextResponse.json({ error: "Sai mật mã admin." }, { status: 401 });
  return null;
}

// GET — danh sách toàn bộ (gồm cả ẩn) cho CMS.
export async function GET(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  const { data, error } = await supabaseAdmin()
    .from("listen_videos")
    .select(COLS)
    .order("topic", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ videos: data });
}

// POST — action: create | reorder | recheck
export async function POST(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  if (body.action === "reorder") {
    const ids: string[] = body.ids ?? [];
    // Cập nhật sort_order theo thứ tự mảng
    for (let i = 0; i < ids.length; i++) {
      const { error } = await db.from("listen_videos").update({ sort_order: i }).eq("id", ids[i]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "recheck") {
    const { data, error } = await db.from("listen_videos").select("id, video_id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    let updated = 0;
    for (const row of (data as { id: string; video_id: string }[]) ?? []) {
      const cc = await hasCaptions(row.video_id);
      await db.from("listen_videos").update({ cc }).eq("id", row.id);
      updated++;
    }
    return NextResponse.json({ ok: true, updated });
  }

  // create (mặc định): dán link/id → tự lấy meta + cc
  const id = parseVideoId(body.link ?? body.videoId ?? "");
  if (!id) return NextResponse.json({ error: "Link/ID video không hợp lệ." }, { status: 400 });
  const topic = (body.topic ?? "").trim();
  if (!topic) return NextResponse.json({ error: "Thiếu chủ đề." }, { status: 400 });

  const [meta, cc] = await Promise.all([getMeta(id), hasCaptions(id)]);
  // sort_order = cuối danh sách trong chủ đề
  const { data: maxRow } = await db
    .from("listen_videos")
    .select("sort_order")
    .eq("topic", topic)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await db
    .from("listen_videos")
    .upsert(
      {
        video_id: id,
        title: body.title?.trim() || meta.title || id,
        channel: body.channel?.trim() || meta.channel || "",
        topic,
        level: body.level || "A1",
        cc,
        hidden: false,
        sort_order: nextOrder,
      },
      { onConflict: "video_id" },
    )
    .select(COLS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ video: data });
}

// PATCH — sửa 1 video (title/channel/topic/level/cc/hidden)
export async function PATCH(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const k of ["title", "channel", "topic", "level", "cc", "hidden"]) {
    if (k in body) patch[k] = body[k];
  }
  const { data, error } = await supabaseAdmin()
    .from("listen_videos")
    .update(patch)
    .eq("id", body.id)
    .select(COLS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ video: data });
}

// DELETE — ?id=
export async function DELETE(req: NextRequest) {
  const g = guard(req);
  if (g) return g;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  const { error } = await supabaseAdmin().from("listen_videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
