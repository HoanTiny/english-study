import type { ReactNode } from "react";

// Thẻ kính dùng chung toàn app. Style nền/viền/đổ bóng nằm ở .glass-card (globals.css);
// component chỉ lo bo góc + padding + gộp className tuỳ biến.
export default function GlassCard({
  children,
  className = "",
  rounded = "rounded-[28px]",
  padding = "p-6",
}: {
  children: ReactNode;
  className?: string;
  rounded?: string;
  padding?: string;
}) {
  return <div className={`glass-card relative overflow-hidden ${rounded} ${padding} ${className}`}>{children}</div>;
}
