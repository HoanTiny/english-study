-- SpeakUp — bảng lưu các video YouTube người dùng đã dùng cho bài Chép chính tả.
-- Chạy trên Supabase SQL editor (sau schema.sql + policies.sql).
-- Chỉ lưu THAM CHIẾU video (id/tiêu đề/kênh), KHÔNG lưu transcript (tránh bản quyền;
-- transcript luôn lấy lại được khi mở).

create table if not exists dictation_videos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  video_id    text not null,                 -- id 11 ký tự của YouTube
  title       text,
  channel     text,
  last_used   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, video_id)
);

create index if not exists dictation_videos_user_idx
  on dictation_videos (user_id, last_used desc);

alter table dictation_videos enable row level security;

-- Mỗi người chỉ thấy/sửa video của chính mình.
create policy "own rows" on dictation_videos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
