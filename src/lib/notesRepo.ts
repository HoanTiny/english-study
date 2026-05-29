"use client";

import { supabase } from "@/lib/supabase";

export type NoteKind = "structure" | "word";

export type Note = {
  id: string;
  kind: NoteKind;
  content: string;
  example: string;
  tags: string[];
  inReview: boolean;
};

// Hàng từ DB (snake_case) → kiểu Note (camelCase).
type Row = {
  id: string;
  kind: NoteKind;
  content: string;
  example: string | null;
  tags: string[] | null;
  in_review: boolean;
};

function fromRow(r: Row): Note {
  return {
    id: r.id,
    kind: r.kind,
    content: r.content,
    example: r.example ?? "",
    tags: r.tags ?? [],
    inReview: r.in_review,
  };
}

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, kind, content, example, tags, in_review")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function addNote(
  userId: string,
  input: {
    kind: NoteKind;
    content: string;
    example: string;
    tags: string[];
    inReview?: boolean;
  },
): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      kind: input.kind,
      content: input.content,
      example: input.example || null,
      tags: input.tags,
      in_review: input.inReview ?? false,
    })
    .select("id, kind, content, example, tags, in_review")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function setNoteReview(id: string, inReview: boolean): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .update({ in_review: inReview })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
