"use client";

import { supabase } from "@/lib/supabase";

export type Profile = {
  displayName: string | null;
  email: string | null;
  streak: number;
  currentStage: number;
  lastActive: string | null;
  onboarded: boolean;
};

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Tạo/đảm bảo có hàng profiles cho user; cập nhật email/tên nếu có.
export async function ensureProfile(
  userId: string,
  email?: string | null,
  displayName?: string | null,
): Promise<void> {
  const row: Record<string, unknown> = { id: userId };
  if (email) row.email = email;
  if (displayName) row.display_name = displayName;
  await supabase.from("profiles").upsert(row, { onConflict: "id" });
}

// Cập nhật streak theo ngày hoạt động (gọi khi mở app/đăng nhập). Trả streak mới.
export async function touchStreak(userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("streak_count, last_active")
    .eq("id", userId)
    .maybeSingle();

  const today = dateStr(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = dateStr(y);

  let streak = data?.streak_count ?? 0;
  const last = data?.last_active ?? null;

  if (last === today) return streak || 1; // hôm nay đã tính
  streak = last === yesterday ? (streak || 0) + 1 : 1; // nối tiếp hoặc reset
  await supabase.from("profiles").update({ streak_count: streak, last_active: today }).eq("id", userId);
  return streak;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, email, streak_count, current_stage, last_active, onboarded")
    .eq("id", userId)
    .maybeSingle();
  return {
    displayName: data?.display_name ?? null,
    email: data?.email ?? null,
    streak: data?.streak_count ?? 0,
    currentStage: data?.current_stage ?? 1,
    lastActive: data?.last_active ?? null,
    onboarded: data?.onboarded ?? false,
  };
}

export async function updateDisplayName(userId: string, name: string): Promise<void> {
  await supabase.from("profiles").update({ display_name: name }).eq("id", userId);
}

// Lưu trình độ đã chọn (current_stage) và đánh dấu đã onboard.
export async function setOnboarding(userId: string, stage: number): Promise<void> {
  await supabase.from("profiles").update({ current_stage: stage, onboarded: true }).eq("id", userId);
}

// Kiểm tra đã onboard chưa (để quyết định có hiện bước chọn trình độ).
export async function isOnboarded(userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("onboarded").eq("id", userId).maybeSingle();
  return data?.onboarded ?? false;
}
