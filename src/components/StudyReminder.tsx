"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadReminder,
  saveReminder,
  notificationSupported,
  permission,
  requestPermission,
  isPastReminder,
  alreadyFiredToday,
  fireReminder,
  msUntilNext,
  type ReminderSettings,
} from "@/lib/reminder";

// `studiedToday`: hôm nay đã có hoạt động học chưa (ôn tập / nhật ký / shadowing).
// Khi đã học rồi thì không nhắc nữa.
export default function StudyReminder({ studiedToday }: { studiedToday: boolean }) {
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    time: "20:00",
  });
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nạp cấu hình + quyền lúc mount.
  useEffect(() => {
    setSettings(loadReminder());
    if (notificationSupported()) setPerm(permission());
  }, []);

  // Banner trong app: đã bật, đã quá giờ, chưa học, chưa bắn lần nào hôm nay.
  useEffect(() => {
    if (!settings.enabled) return;
    if (!studiedToday && isPastReminder(settings.time) && !alreadyFiredToday()) {
      setShowBanner(true);
    }
  }, [settings.enabled, settings.time, studiedToday]);

  // Hẹn giờ bắn Notification khi app đang mở.
  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!settings.enabled || perm !== "granted" || studiedToday) return;

    const schedule = () => {
      timer.current = setTimeout(() => {
        if (!studiedToday) {
          fireReminder("Dành 2 giờ hôm nay để biến điều bạn hiểu thành điều nói được nhé!");
          setShowBanner(true);
        }
        schedule(); // hẹn cho ngày kế tiếp
      }, msUntilNext(settings.time));
    };
    schedule();

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [settings.enabled, settings.time, perm, studiedToday]);

  const toggleEnabled = async () => {
    if (!settings.enabled) {
      // Bật: cần quyền thông báo (yêu cầu rõ ràng từ click của người dùng).
      let p = perm;
      if (p !== "granted") p = await requestPermission();
      setPerm(p);
      const next = { ...settings, enabled: p === "granted" };
      setSettings(next);
      saveReminder(next);
    } else {
      const next = { ...settings, enabled: false };
      setSettings(next);
      saveReminder(next);
      setShowBanner(false);
    }
  };

  const changeTime = (time: string) => {
    const next = { ...settings, time };
    setSettings(next);
    saveReminder(next);
  };

  if (!notificationSupported()) return null;

  return (
    <div className="mt-6">
      {/* Banner nhắc khi đã quá giờ mà chưa học */}
      {showBanner && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 animate-fadeIn">
          <span className="text-xl">⏰</span>
          <p className="flex-1 text-sm font-bold text-foreground">
            Đến giờ học rồi! Chỉ cần ôn vài thẻ hoặc viết 1 dòng nhật ký thôi.
          </p>
          <button
            onClick={() => setShowBanner(false)}
            className="text-xs font-bold text-muted hover:text-foreground"
            aria-label="Đóng nhắc nhở"
          >
            ✕
          </button>
        </div>
      )}

      <div className="liquid-glass-card p-5 border border-border">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-black text-foreground">Nhắc học hằng ngày</p>
            <p className="text-xs font-semibold text-muted">
              {settings.enabled
                ? `Bật · mỗi ngày lúc ${settings.time}`
                : "Tắt · bật để được nhắc giữ chuỗi học"}
            </p>
          </div>
          <span className="text-xs font-bold text-muted">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="mt-4 space-y-4 border-t border-border/50 pt-4 animate-fadeIn">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-foreground">Bật nhắc nhở</span>
              <button
                onClick={toggleEnabled}
                role="switch"
                aria-checked={settings.enabled}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
                  settings.enabled ? "bg-primary" : "bg-black/15 dark:bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${
                    settings.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-foreground">Giờ nhắc</span>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => changeTime(e.target.value)}
                className="rounded-xl border border-border bg-white/40 dark:bg-white/5 px-3 py-1.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {perm === "denied" && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Trình duyệt đang chặn thông báo. Hãy bật quyền thông báo cho trang
                này trong cài đặt trình duyệt để nhận nhắc nhở.
              </p>
            )}
            <p className="text-xs font-semibold text-muted leading-relaxed">
              Nhắc nhở hoạt động khi tab SpeakUp đang mở. Để nhận thông báo cả khi
              đóng app, bản sau sẽ thêm push notification thật.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
