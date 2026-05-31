"use client";

import { supabase } from "@/lib/supabase";

export type SavedVideo = {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  lastUsed: string;
};

type Row = {
  id: string;
  video_id: string;
  title: string | null;
  channel: string | null;
  last_used: string;
};

function fromRow(r: Row): SavedVideo {
  return {
    id: r.id,
    videoId: r.video_id,
    title: r.title ?? r.video_id,
    channel: r.channel ?? "",
    lastUsed: r.last_used,
  };
}

export async function listSavedVideos(): Promise<SavedVideo[]> {
  const { data, error } = await supabase
    .from("dictation_videos")
    .select("id, video_id, title, channel, last_used")
    .order("last_used", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

// Lưu (hoặc cập nhật last_used nếu đã có) một video.
export async function saveVideo(
  userId: string,
  input: { videoId: string; title: string; channel: string },
): Promise<SavedVideo> {
  const { data, error } = await supabase
    .from("dictation_videos")
    .upsert(
      {
        user_id: userId,
        video_id: input.videoId,
        title: input.title || null,
        channel: input.channel || null,
        last_used: new Date().toISOString(),
      },
      { onConflict: "user_id,video_id" },
    )
    .select("id, video_id, title, channel, last_used")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteSavedVideo(id: string): Promise<void> {
  const { error } = await supabase.from("dictation_videos").delete().eq("id", id);
  if (error) throw error;
}
