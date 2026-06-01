"use client";

import { supabase } from "@/lib/supabase";

// Web Push phía client: đăng ký service worker, subscribe PushManager,
// và lưu subscription + lịch nhắc lên Supabase (bảng push_subscriptions).

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.error("SW register", e);
    return null;
  }
}

/**
 * Bật push: xin quyền → subscribe → lưu lên Supabase kèm giờ nhắc.
 * Trả về true nếu thành công.
 */
export async function enablePush(
  userId: string,
  reminderTime: string,
): Promise<boolean> {
  if (!pushSupported() || !VAPID_PUBLIC) return false;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      enabled: true,
      reminder_time: reminderTime,
      tz_offset: new Date().getTimezoneOffset(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("save push sub", error);
    return false;
  }
  return true;
}

/** Cập nhật giờ nhắc cho subscription hiện tại của thiết bị này. */
export async function updateReminderTime(time: string): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase
    .from("push_subscriptions")
    .update({ reminder_time: time, updated_at: new Date().toISOString() })
    .eq("endpoint", sub.endpoint);
}

/** Tắt push: huỷ subscribe + đánh dấu enabled=false trong DB. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase
    .from("push_subscriptions")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("endpoint", sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}

/** Đã đăng ký push trên thiết bị này chưa. */
export async function hasPushSubscription(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}
