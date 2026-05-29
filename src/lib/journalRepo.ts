"use client";

import { supabase } from "@/lib/supabase";

export type Feedback = { fragment: string; issue: string; suggestion: string };

export type Entry = {
  date: string;
  prompt: string;
  body: string;
  sentences: number;
  feedback: Feedback[];
};

type Row = {
  entry_date: string;
  prompt_text: string | null;
  body: string;
  sentence_count: number;
  ai_feedback: Feedback[] | null;
};

function fromRow(r: Row): Entry {
  return {
    date: r.entry_date,
    prompt: r.prompt_text ?? "",
    body: r.body,
    sentences: r.sentence_count,
    feedback: r.ai_feedback ?? [],
  };
}

export async function listEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("entry_date, prompt_text, body, sentence_count, ai_feedback")
    .order("entry_date", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

/** Lưu (hoặc cập nhật) bài của một ngày — upsert theo (user_id, entry_date). */
export async function saveEntry(
  userId: string,
  entry: Entry,
): Promise<Entry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .upsert(
      {
        user_id: userId,
        entry_date: entry.date,
        prompt_text: entry.prompt,
        body: entry.body,
        sentence_count: entry.sentences,
        ai_feedback: entry.feedback,
      },
      { onConflict: "user_id,entry_date" },
    )
    .select("entry_date, prompt_text, body, sentence_count, ai_feedback")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}
