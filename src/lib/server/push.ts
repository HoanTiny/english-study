// Server-only: gửi web push bằng VAPID. KHÔNG import ở client.
import webpush from "web-push";

let configured = false;

export function pushConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY
  );
}

function ensureConfigured() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const priv = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@speakup.app";
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushSub = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

/**
 * Gửi 1 thông báo tới 1 subscription.
 * Trả về { ok } hoặc { gone: true } nếu subscription hết hạn (404/410) → caller nên xoá.
 */
export async function sendPush(
  sub: PushSub,
  payload: PushPayload,
): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  if (!pushConfigured()) return { ok: false, error: "unconfigured" };
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return { ok: false, gone: true };
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}
