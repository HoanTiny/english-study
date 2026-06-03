"use client";

import { useState } from "react";

// Minh hoạ 3D thay emoji — dùng bộ Microsoft Fluent Emoji 3D (giấy phép MIT) qua CDN jsdelivr.
// Nếu ảnh lỗi/không có trong map → tự fallback về emoji gốc (không bao giờ vỡ UI).
const BASE = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets";

const MAP: Record<string, string> = {
  "🔥": `${BASE}/Fire/3D/fire_3d.png`,
  "🎧": `${BASE}/Headphone/3D/headphone_3d.png`,
  "🔁": `${BASE}/Repeat button/3D/repeat_button_3d.png`,
  "🔂": `${BASE}/Repeat single button/3D/repeat_single_button_3d.png`,
  "📊": `${BASE}/Bar chart/3D/bar_chart_3d.png`,
  "📔": `${BASE}/Notebook with decorative cover/3D/notebook_with_decorative_cover_3d.png`,
  "📓": `${BASE}/Notebook/3D/notebook_3d.png`,
  "✍️": `${BASE}/Writing hand/Default/3D/writing_hand_3d_default.png`,
  "🗣️": `${BASE}/Speaking head/3D/speaking_head_3d.png`,
  "📅": `${BASE}/Calendar/3D/calendar_3d.png`,
  "🗓️": `${BASE}/Spiral calendar/3D/spiral_calendar_3d.png`,
  "🧩": `${BASE}/Puzzle piece/3D/puzzle_piece_3d.png`,
  "⚡": `${BASE}/High voltage/3D/high_voltage_3d.png`,
  "🚀": `${BASE}/Rocket/3D/rocket_3d.png`,
  "📝": `${BASE}/Memo/3D/memo_3d.png`,
  "📚": `${BASE}/Books/3D/books_3d.png`,
  "🔊": `${BASE}/Speaker high volume/3D/speaker_high_volume_3d.png`,
  "🎓": `${BASE}/Graduation cap/3D/graduation_cap_3d.png`,
  "🎯": `${BASE}/Bullseye/3D/bullseye_3d.png`,
  "🔒": `${BASE}/Locked/3D/locked_3d.png`,
  "🎉": `${BASE}/Party popper/3D/party_popper_3d.png`,
  "🌟": `${BASE}/Glowing star/3D/glowing_star_3d.png`,
  "💡": `${BASE}/Light bulb/3D/light_bulb_3d.png`,
  "🔎": `${BASE}/Magnifying glass tilted left/3D/magnifying_glass_tilted_left_3d.png`,
  "🔍": `${BASE}/Magnifying glass tilted left/3D/magnifying_glass_tilted_left_3d.png`,
  "🔔": `${BASE}/Bell/3D/bell_3d.png`,
  "✅": `${BASE}/Check mark button/3D/check_mark_button_3d.png`,
  "✨": `${BASE}/Sparkles/3D/sparkles_3d.png`,
  "🧭": `${BASE}/Compass/3D/compass_3d.png`,
  "📞": `${BASE}/Telephone receiver/3D/telephone_receiver_3d.png`,
  "📕": `${BASE}/Closed book/3D/closed_book_3d.png`,
  "📗": `${BASE}/Green book/3D/green_book_3d.png`,
  "🎒": `${BASE}/Backpack/3D/backpack_3d.png`,
  "🔤": `${BASE}/Input latin letters/3D/input_latin_letters_3d.png`,
  "💬": `${BASE}/Speech balloon/3D/speech_balloon_3d.png`,
  "🎮": `${BASE}/Video game/3D/video_game_3d.png`,
};

export default function Icon3D({
  emoji,
  size = 28,
  className = "",
}: {
  emoji: string;
  size?: number;
  className?: string;
}) {
  const src = MAP[emoji];
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={className} style={{ fontSize: Math.round(size * 0.86), lineHeight: 1 }} aria-hidden>
        {emoji}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={encodeURI(src)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
