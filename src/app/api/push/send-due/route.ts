import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { sendPush, pushConfigured } from "@/lib/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint cho CRON gọi định kỳ (vài lần/giờ). Gửi nhắc cho các subscription
// đã tới/qua giờ nhắc trong ngày (giờ local của user) và chưa gửi hôm nay.
// Bảo vệ bằng PUSH_CRON_SECRET (query ?secret= hoặc header x-cron-secret).
async function handle(req: NextRequest) {
  const secret = process.env.PUSH_CRON_SECRET;
  const given =
    new URL(req.url).searchParams.get("secret") ||
    req.headers.get("x-cron-secret") ||
    "";
  if (!secret || given !== secret) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (!pushConfigured()) {
    return Response.json({ ok: false, error: "unconfigured" }, { status: 200 });
  }

  const admin = supabaseAdmin();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, reminder_time, tz_offset, last_sent")
    .eq("enabled", true);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const nowMs = Date.now();
  let sent = 0;
  let due = 0;

  for (const s of subs ?? []) {
    // Giờ local của user = UTC - getTimezoneOffset (tz_offset đã là getTimezoneOffset()).
    const localMs = nowMs - (s.tz_offset ?? 0) * 60000;
    const local = new Date(localMs);
    const localDate = local.toISOString().slice(0, 10); // YYYY-MM-DD theo local
    const minutesNow = local.getUTCHours() * 60 + local.getUTCMinutes();
    const [rh, rm] = String(s.reminder_time ?? "20:00")
      .split(":")
      .map((x) => parseInt(x, 10));
    const reminderMinutes = (rh || 20) * 60 + (rm || 0);

    const alreadySent = s.last_sent === localDate;
    if (minutesNow < reminderMinutes || alreadySent) continue;
    due++;

    const r = await sendPush(s, {
      title: "SpeakUp · Đến giờ học rồi 📚",
      body: "Dành ít phút hôm nay để biến điều bạn hiểu thành điều nói được nhé!",
      url: "/today",
      tag: "speakup-daily-reminder",
    });
    if (r.gone) {
      await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      continue;
    }
    if (r.ok) {
      sent++;
      await admin
        .from("push_subscriptions")
        .update({ last_sent: localDate })
        .eq("endpoint", s.endpoint);
    }
  }

  return Response.json({ ok: true, total: subs?.length ?? 0, due, sent });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
