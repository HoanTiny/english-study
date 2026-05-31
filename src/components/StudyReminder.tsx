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
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 mb-6 animate-fadeIn">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-black/40 border border-primary/20 text-lg shadow-sm">
            ⏰
          </div>
          <p className="flex-1 text-xs sm:text-sm font-extrabold text-foreground text-left leading-relaxed">
            Đến giờ học rồi! Chỉ cần ôn vài thẻ hoặc viết một dòng nhật ký ngắn thôi để giữ chuỗi nhé.
          </p>
          <button
            onClick={() => setShowBanner(false)}
            className="w-8 h-8 rounded-full border border-border/80 bg-white/50 dark:bg-black/25 flex items-center justify-center text-xs font-black text-muted hover:text-foreground active:scale-95 transition-all cursor-pointer"
            aria-label="Đóng nhắc nhở"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Reminder Card */}
      <div className="rounded-3xl border border-border/30 dark:border-white/5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden text-left transition-colors duration-500 hover:border-primary/30 dark:hover:border-primary/20">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-4 text-left cursor-pointer group animate-fadeIn"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-md shadow-inner transition-transform duration-500 group-hover:scale-105">
            <span className="relative z-1 animate-pulse">🔔</span>
          </div>
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider">Nhắc học hằng ngày</p>
            <p className="text-[10px] sm:text-xs font-semibold text-muted mt-0.5">
              {settings.enabled
                ? `Đang bật · Báo lúc ${settings.time} mỗi ngày`
                : "Đang tắt · Bật nhắc nhở để giữ vững chuỗi học của bạn"}
            </p>
          </div>
          <span className="w-8 h-8 rounded-full border border-border/80 bg-white/40 dark:bg-black/20 flex items-center justify-center text-xs font-bold text-muted group-hover:text-foreground transition-all duration-300">
            {open ? "▲" : "▼"}
          </span>
        </button>

        {open && (
          <div className="mt-5 space-y-4.5 border-t border-border/10 pt-5 animate-fadeIn">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider">Bật nhắc nhở</span>
              <button
                onClick={toggleEnabled}
                role="switch"
                aria-checked={settings.enabled}
                className={`relative h-6.5 w-12 shrink-0 rounded-full transition-colors duration-300 cursor-pointer ${
                  settings.enabled ? "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" : "bg-black/10 dark:bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.75 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    settings.enabled ? "translate-x-[22px]" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider">Giờ nhắc nhở</span>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => changeTime(e.target.value)}
                className="rounded-xl border border-border bg-white/60 dark:bg-black/20 px-4.5 py-2 text-xs sm:text-sm font-black text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>

            {perm === "denied" && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 leading-relaxed">
                  ⚠️ Trình duyệt của bạn đang chặn thông báo. Vui lòng cấp quyền nhận thông báo cho SpeakUp trong phần Cài đặt trang web của trình duyệt để có thể nhận nhắc nhở hằng ngày nhé.
                </p>
              </div>
            )}
            
            <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/10">
              <p className="text-[9px] sm:text-[10px] font-semibold text-muted leading-relaxed">
                * Nhắc nhở hoạt động khi tab trình duyệt của SpeakUp đang mở. Ở bản cập nhật tiếp theo, chúng tôi sẽ hỗ trợ Push Notification hệ thống ngay cả khi bạn tắt ứng dụng.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
