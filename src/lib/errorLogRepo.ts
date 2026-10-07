"use client";

import { touchStreak } from "./profileRepo";
import { recordStudyEvent } from "./studySession";
import { supabase } from "@/lib/supabase";

export type ErrorItem = {
  source: "journal" | "roleplay" | "grammar";
  original: string;
  correction: string;
  note?: string;
};

export type ErrorRow = ErrorItem & {
  id: string;
  resolved: boolean;
  created_at: string;
  practice_count: number;
  correct_streak: number;
  last_practiced_at: string | null;
  next_review_at: string;
};

// Thêm nhiều lỗi; caller quyết định cách thông báo khi lưu thất bại.
export async function addErrors(userId: string, items: ErrorItem[]): Promise<void> {
  const rows = items
    .filter((it) => (it.original?.trim() || it.correction?.trim()))
    .map((it) => ({
      user_id: userId,
      source: it.source,
      original: (it.original ?? "").trim(),
      correction: (it.correction ?? "").trim(),
      note: it.note?.trim() || null,
    }));
  if (!rows.length) return;
  const { error } = await supabase.from("error_log").insert(rows);
  if (error) throw error;
}

export async function listErrors(): Promise<ErrorRow[]> {
  const { data, error } = await supabase
    .from("error_log")
    .select("id, source, original, correction, note, resolved, created_at, practice_count, correct_streak, last_practiced_at, next_review_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as ErrorRow[];
}

export async function setResolved(id: string, resolved: boolean): Promise<void> {
  const { error } = await supabase.from("error_log").update({ resolved, ...(!resolved ? { correct_streak: 0, next_review_at: new Date().toISOString() } : {}) }).eq("id", id);
  if (error) throw error;
}

export async function deleteError(id: string): Promise<void> {
  const { error } = await supabase.from("error_log").delete().eq("id", id);
  if (error) throw error;
}

export async function practiceError(userId: string, id: string, remembered: boolean): Promise<ErrorRow> {
  const { data, error } = await supabase.rpc("practice_error", { p_id: id, p_remembered: remembered }).single<ErrorRow>();
  if (error) throw error;
  if (!data) throw new Error("Không nhận được kết quả luyện lỗi.");
  recordStudyEvent(userId, { kind: "errors", id });
  void touchStreak(userId).then(() => window.dispatchEvent(new Event("study-activity"))).catch(console.error);
  return data as ErrorRow;
}
