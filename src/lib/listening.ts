// Gợi ý nguồn luyện nghe YouTube theo cấp độ CEFR.
// Mặc định KHÔNG nhúng video ID cứng (dễ bị gỡ/khoá vùng → embed chết); thay vào đó
// link tới tìm kiếm YouTube đã lọc theo kênh uy tín + chủ đề bài (hợp ToS YouTube,
// luôn còn sống). Nếu một bài có `youtubeId` hợp lệ thì sẽ nhúng iframe thật.

export type ChannelRec = {
  /** Tên kênh hiển thị */
  name: string;
  /** Từ khoá tên kênh để lọc khi tìm trên YouTube */
  query: string;
  /** Nhãn cấp độ rút gọn để hiển thị */
  levelLabel: string;
};

// Chọn kênh theo chuỗi cefr trong lessons.ts: "A1", "A1 Movers", "A2 Flyers", "B1", "B1+".
export function channelForLevel(cefr: string): ChannelRec {
  const c = cefr.toUpperCase();
  if (c.startsWith("A1")) {
    return { name: "Bob the Canadian", query: "Bob the Canadian", levelLabel: "A1 · nói chậm, rõ" };
  }
  if (c.startsWith("A2")) {
    return { name: "VOA Learning English", query: "VOA Learning English", levelLabel: "A2 · tốc độ chậm" };
  }
  if (c === "B1") {
    return { name: "BBC Learning English", query: "BBC 6 Minute English", levelLabel: "B1 · hội thoại chủ đề" };
  }
  // B1+ trở lên
  return { name: "English with Lucy", query: "English with Lucy", levelLabel: "B1+ · phát âm & fluency" };
}

/** URL tìm kiếm YouTube đã lọc theo kênh + chủ đề bài (mở tab mới). */
export function youtubeSearchUrl(channelQuery: string, topic: string): string {
  const q = `${channelQuery} ${topic} English`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/** URL nhúng riêng tư (không đặt cookie cho tới khi phát). */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}
