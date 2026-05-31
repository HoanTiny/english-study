"use client";

import { supabase } from "@/lib/supabase";

// Video luyện nghe đọc từ DB (CMS quản lý). Hàng public, RLS cho đọc tự do.
export type PublicVid = {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  topic: string;
  level: string;
  cc: boolean;
};

type Row = {
  id: string;
  video_id: string;
  title: string;
  channel: string;
  topic: string;
  level: string;
  cc: boolean;
};

// Lấy video chưa ẩn, sắp theo chủ đề + thứ tự. Trang Luyện nghe gọi hàm này;
// nếu DB trống/lỗi → trang tự fallback về seed tĩnh.
export async function listPublicVideos(): Promise<PublicVid[]> {
  const { data, error } = await supabase
    .from("listen_videos")
    .select("id, video_id, title, channel, topic, level, cc")
    .eq("hidden", false)
    .order("topic", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map((r) => ({
    id: r.id,
    videoId: r.video_id,
    title: r.title,
    channel: r.channel,
    topic: r.topic,
    level: r.level,
    cc: r.cc,
  }));
}
