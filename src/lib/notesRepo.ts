"use client";

import { supabase } from "@/lib/supabase";

export type NoteKind = "structure" | "word";

export type Note = {
  id: string;
  kind: NoteKind;
  content: string;
  meaning: string;
  example: string;
  tags: string[];
  inReview: boolean;
};

// Hàng từ DB (snake_case) → kiểu Note (camelCase).
type Row = {
  id: string;
  kind: NoteKind;
  content: string;
  meaning: string | null;
  example: string | null;
  tags: string[] | null;
  in_review: boolean;
};

function fromRow(r: Row): Note {
  return {
    id: r.id,
    kind: r.kind,
    content: r.content,
    meaning: r.meaning ?? "",
    example: r.example ?? "",
    tags: r.tags ?? [],
    inReview: r.in_review,
  };
}

const COLS = "id, kind, content, meaning, example, tags, in_review";
const COLS_LEGACY = "id, kind, content, example, tags, in_review";

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select(COLS)
    .order("created_at", { ascending: false });
  if (!error) return (data as Row[]).map(fromRow);
  // Fallback: cột meaning chưa được migrate → đọc không kèm meaning.
  const legacy = await supabase
    .from("notes")
    .select(COLS_LEGACY)
    .order("created_at", { ascending: false });
  if (legacy.error) throw legacy.error;
  return (legacy.data as Omit<Row, "meaning">[]).map((r) => fromRow({ ...r, meaning: null }));
}

export async function addNote(
  userId: string,
  input: {
    kind: NoteKind;
    content: string;
    meaning?: string;
    example: string;
    tags: string[];
    inReview?: boolean;
  },
): Promise<Note> {
  const base = {
    user_id: userId,
    kind: input.kind,
    content: input.content,
    example: input.example || null,
    tags: input.tags,
    in_review: input.inReview ?? false,
  };
  const { data, error } = await supabase
    .from("notes")
    .insert({ ...base, meaning: input.meaning?.trim() || null })
    .select(COLS)
    .single();
  if (!error) return fromRow(data as Row);
  // Fallback: cột meaning chưa migrate → lưu không kèm meaning.
  const legacy = await supabase.from("notes").insert(base).select(COLS_LEGACY).single();
  if (legacy.error) throw legacy.error;
  return fromRow({ ...(legacy.data as Omit<Row, "meaning">), meaning: null });
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
