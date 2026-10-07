"use client";

import { recordStudyEvent } from "./studySession";
import { touchStreak } from "@/lib/profileRepo";
import { supabase } from "@/lib/supabase";
import type { PronResult } from "./pronunciation";
import type { ShadowAttempt } from "./shadowPractice";

export async function listShadowHistory(clientKey: string): Promise<ShadowAttempt[]> {
  const { data, error } = await supabase.from("shadowing_history").select("*")
    .eq("client_key", clientKey).order("created_at", { ascending: false }).limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function listShadowLatest(): Promise<ShadowAttempt[]> {
  const { data, error } = await supabase.from("shadowing_attempts")
    .select("id,client_key,pronunciation_score,created_at,speed_rate,assessment").eq("score_source", "azure");
  if (error) throw error;
  return data ?? [];
}

type Row = { client_key: string; pronunciation_score: number | null };

/** Điểm phát âm mới nhất theo từng câu (client_key = id tĩnh 's1'..). */
export async function listShadowScores(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("shadowing_attempts")
    .select("client_key, pronunciation_score").eq("score_source", "azure");
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
  result: PronResult,
  speedRate: number,
  attemptKey: string,
): Promise<void> {
  const { error } = await supabase.from("shadowing_attempts").upsert(
    {
      user_id: userId,
      client_key: clientKey,
      pronunciation_score: result.pronunciation,
      assessment: result,
      attempt_key: attemptKey,
      score_source: "azure",
      created_at: new Date().toISOString(),
      speed_rate: speedRate,
    },
    { onConflict: "user_id,client_key" },
  );
  if (error) throw error;
  recordStudyEvent(userId, { kind: "shadowing", id: clientKey });
  void touchStreak(userId).then(() => window.dispatchEvent(new Event("study-activity"))).catch(console.error);
}
