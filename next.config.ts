import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép truy cập dev server qua IP LAN (điện thoại/máy khác cùng mạng).
  // Next 15/16 chặn request cross-origin ở chế độ dev (mặc định chỉ localhost) →
  // không khai báo thì RSC/hydration bị chặn, bấm nút không ăn. Chỉ ảnh hưởng dev.
  allowedDevOrigins: ["192.168.200.219", "192.168.200.*", "192.168.1.*", "192.168.0.*"],
};

export default nextConfig;
