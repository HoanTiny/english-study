"use client";

import { supabase } from "@/lib/supabase";

type Row = { client_key: string; pronunciation_score: number | null };

/** Điểm phát âm mới nhất theo từng câu (client_key = id tĩnh 's1'..). */
export async function listShadowScores(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("shadowing_attempts")
    .select("client_key, pronunciation_score");
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const r of data as Row[]) {
    if (r.client_key != null && r.pronunciation_score != null)
      map[r.client_key] = Number(r.pronunciation_score);
  }
  return map;
}

/** Lưu (upsert) điểm một lần luyện theo (user, client_key). */
export async function saveShadowAttempt(
  userId: string,
  clientKey: string,
  score: number,
  speedRate: number,
): Promise<void> {
  const { error } = await supabase.from("shadowing_attempts").upsert(
    {
      user_id: userId,
      client_key: clientKey,
      pronunciation_score: score,
      speed_rate: speedRate,
    },
    { onConflict: "user_id,client_key" },
  );
  if (error) throw error;
}
