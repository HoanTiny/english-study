"use client";

import { supabase } from "@/lib/supabase";

export type ExItem = {
  prompt?: string;
  options?: string[];
  answer?: number | string | boolean;
  label?: string;
  text?: string;
  image?: string; // path ảnh (bucket) — phát qua signed URL
};

export type ListeningExercise = {
  id: string;
  unit: number | null;
  section: string | null;
  activity: number | null;
  title: string;
  level: string;
  audio_path: string | null;
  instructions: string | null;
  type: "mc" | "fill" | "truefalse" | "ordering" | "speaking";
  items: ExItem[];
  transcript: string | null;
};

const COLS =
  "id, unit, section, activity, title, level, audio_path, instructions, type, items, transcript";

export async function listExercises(): Promise<ListeningExercise[]> {
  const { data, error } = await supabase
    .from("listening_exercises")
    .select(COLS)
    .eq("visible", true)
    .order("unit", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("listExercises", error);
    return [];
  }
  return (data ?? []) as ListeningExercise[];
}

// URL phát audio (bucket private → signed URL qua route).
export function exAudioSrc(path: string): string {
  return `/api/lesson-audio?path=${encodeURIComponent(path)}`;
}
