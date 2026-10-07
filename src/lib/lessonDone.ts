"use client";
import { recordStudyEvent } from "./studySession";
import { touchStreak } from "@/lib/profileRepo";
import { supabase } from "./supabase";
export const QUIZ_PASS_RATIO = 0.8;
export async function listDoneSlugs(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("lesson_quiz_results").select("slug,score,total").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).filter(r => r.total > 0 && r.score / r.total >= QUIZ_PASS_RATIO).map(r => r.slug);
}
export async function isLessonDone(userId: string, slug: string): Promise<boolean> {
  return (await listDoneSlugs(userId)).includes(slug);
}
export async function markLessonDone(userId: string, slug: string, score: number, total: number): Promise<void> {
  if (total <= 0 || score / total < QUIZ_PASS_RATIO) return;
  const { error } = await supabase.from("lesson_quiz_results").upsert({user_id: userId, slug, score, total, completed_at: new Date().toISOString()}, { onConflict: "user_id,slug" });
  if (error) throw error;
  recordStudyEvent(userId, { kind: "quiz", id: slug, slug });
  void touchStreak(userId).then(() => window.dispatchEvent(new Event("study-activity"))).catch(console.error);
}
