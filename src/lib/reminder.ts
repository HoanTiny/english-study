"use client";

// Nhắc học hằng ngày — bản tự chứa (không cần backend/service worker).
// Cơ chế: lưu cấu hình trong localStorage; khi app đang mở sẽ hẹn giờ bắn
// Notification của trình duyệt vào đúng giờ nếu hôm nay chưa học. Khi mở app,
// nếu đã quá giờ nhắc mà chưa học thì hiện banner nhắc trong app.

export type ReminderSettings = {
  enabled: boolean;
  time: string; // "HH:MM"
};

const KEY = "speakup.reminder";
const LAST_FIRED_KEY = "speakup.reminder.lastFired"; // YYYY-MM-DD đã bắn

export function loadReminder(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ReminderSettings;
  } catch {
    // bỏ qua dữ liệu hỏng
  }
  return { enabled: false, time: "20:00" };
}

export function saveReminder(s: ReminderSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // bỏ qua
  }
}

export function notificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permission(): NotificationPermission {
  if (!notificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// Chuyển "HH:MM" thành số phút từ 0h.
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 20 * 60;
  return h * 60 + m;
}

export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Đã quá giờ nhắc trong ngày hôm nay chưa.
export function isPastReminder(time: string, d = new Date()): boolean {
  return nowMinutes(d) >= toMinutes(time);
}

// Đã bắn thông báo cho hôm nay chưa (tránh bắn lặp).
export function alreadyFiredToday(): boolean {
  try {
    return localStorage.getItem(LAST_FIRED_KEY) === dayKey();
  } catch {
    return false;
  }
}

function markFiredToday() {
  try {
    localStorage.setItem(LAST_FIRED_KEY, dayKey());
  } catch {
    // bỏ qua
  }
}

// Bắn thông báo nhắc học (1 lần/ngày). Trả về true nếu đã bắn.
export function fireReminder(body: string): boolean {
  if (permission() !== "granted") return false;
  if (alreadyFiredToday()) return false;
  try {
    new Notification("SpeakUp · Đến giờ học rồi 📚", {
      body,
      tag: "speakup-daily-reminder",
    });
    markFiredToday();
    return true;
  } catch {
    return false;
  }
}

// Số mili-giây tới lần nhắc kế tiếp (hôm nay nếu chưa qua, nếu không thì mai).
export function msUntilNext(time: string, d = new Date()): number {
  const target = new Date(d);
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  target.setHours(Number.isNaN(h) ? 20 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  if (target.getTime() <= d.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - d.getTime();
}
