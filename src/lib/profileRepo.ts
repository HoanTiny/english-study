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
  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

// Called only after a learning activity has been saved successfully.
export async function touchStreak(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("record_study_day", { p_user: userId, p_day: dateStr(new Date()) });
  if (error) throw error;
  return data as number;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error: readError } = await supabase
    .from("profiles")
    .select("display_name, email, streak_count, current_stage, last_active, onboarded")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw readError;
  return {
    displayName: data?.display_name ?? null,
    email: data?.email ?? null,
    streak: data?.streak_count ?? 0,
    currentStage: data && [1, 2, 3, 4].includes(data.current_stage) ? data.current_stage : 1,
    lastActive: data?.last_active ?? null,
    onboarded: data?.onboarded ?? false,
  };
}

export async function updateDisplayName(userId: string, name: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", userId).select("id").single();
  if (error) throw error;
}

// Lưu trình độ đã chọn (current_stage) và đánh dấu đã onboard.
export async function setOnboarding(userId: string, stage: number): Promise<void> {
  if (![1, 2, 3, 4].includes(stage)) throw new Error("Trình độ không hợp lệ.");
  const { error } = await supabase.from("profiles").update({ current_stage: stage, onboarded: true }).eq("id", userId).select("id").single();
  if (error) throw error;
}

// Kiểm tra đã onboard chưa (để quyết định có hiện bước chọn trình độ).
export async function isOnboarded(userId: string): Promise<boolean> {
  const { data, error: readError } = await supabase.from("profiles").select("onboarded").eq("id", userId).maybeSingle();
  if (readError) throw readError;
  return data?.onboarded ?? false;
}
