import { NextRequest } from "next/server";
import { getUserId } from "@/lib/server/authUser";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { sendPush, pushConfigured } from "@/lib/server/push";

export const runtime = "nodejs";

// Gửi thông báo THỬ tới mọi thiết bị của user đang đăng nhập (xác thực bằng Bearer token).
export async function POST(req: NextRequest) {
  if (!pushConfigured()) {
    return Response.json({ ok: false, error: "unconfigured" }, { status: 200 });
  }
  const userId = await getUserId(req);
  if (!userId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("enabled", true);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) {
    return Response.json({ ok: false, error: "no_subscription" });
  }

  let sent = 0;
  for (const s of subs) {
    const r = await sendPush(s, {
      title: "SpeakUp · Thử thông báo 🔔",
      body: "Nếu bạn thấy thông báo này, push đã hoạt động! Bạn sẽ được nhắc học mỗi ngày.",
      url: "/today",
      tag: "speakup-test",
    });
    if (r.ok) sent++;
    if (r.gone) {
      await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return Response.json({ ok: sent > 0, sent, total: subs.length });
}
