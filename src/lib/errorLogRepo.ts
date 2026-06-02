"use client";

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
};

// Thêm nhiều lỗi (bỏ qua mục rỗng). Không chặn luồng nếu lỗi DB.
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
  try {
    await supabase.from("error_log").insert(rows);
  } catch (e) {
    console.error("addErrors", e);
  }
}

export async function listErrors(): Promise<ErrorRow[]> {
  const { data, error } = await supabase
    .from("error_log")
    .select("id, source, original, correction, note, resolved, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listErrors", error);
    return [];
  }
  return (data ?? []) as ErrorRow[];
}

export async function setResolved(id: string, resolved: boolean): Promise<void> {
  await supabase.from("error_log").update({ resolved }).eq("id", id);
}

export async function deleteError(id: string): Promise<void> {
  await supabase.from("error_log").delete().eq("id", id);
}
