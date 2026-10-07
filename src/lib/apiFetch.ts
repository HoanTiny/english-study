"use client";
import { supabase } from "@/lib/supabase";

export async function apiFetch(input: string, init: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Phiên đăng nhập chưa sẵn sàng. Vui lòng thử lại.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const response = await fetch(input, { ...init, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(typeof data?.error === "string" ? data.error : "Không thực hiện được yêu cầu. Vui lòng thử lại.");
  }
  return response;
}
