"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Người dùng thật (không ẩn danh) chưa chọn trình độ → đưa vào /onboarding.
// Bỏ qua các trang không nên ép: onboarding, login, admin.
const SKIP = ["/onboarding", "/login", "/admin"];

export default function OnboardingGate() {
  const { ready, profileReady, isAnonymous, onboarded } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !profileReady) return;
    if (isAnonymous || onboarded) return;
    if (SKIP.some((p) => pathname.startsWith(p))) return;
    router.replace("/onboarding");
  }, [ready, profileReady, isAnonymous, onboarded, pathname, router]);

  return null;
}
