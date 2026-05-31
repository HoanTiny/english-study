-- SpeakUp — CMS quản lý video Luyện nghe.
-- Chạy trên Supabase SQL editor (sau schema.sql + policies.sql).
-- Đọc công khai (trang Luyện nghe); GHI chỉ qua service-role key ở server (bỏ qua RLS).

create table if not exists listen_videos (
  id          uuid primary key default gen_random_uuid(),
  video_id    text not null unique,            -- id 11 ký tự YouTube
  title       text not null default '',
  channel     text not null default '',
  topic       text not null,                    -- key chủ đề: daily/travel/kids/...
  level       text not null default 'A1',       -- A1/A2/B1/B2
  cc          boolean not null default false,   -- có phụ đề (chép chính tả được)
  hidden      boolean not null default false,   -- ẩn khỏi trang Luyện nghe
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists listen_videos_topic_idx on listen_videos (topic, sort_order);

alter table listen_videos enable row level security;

-- Ai cũng đọc được (kể cả ẩn danh) để render trang Luyện nghe.
create policy "public read" on listen_videos for select using (true);

-- KHÔNG tạo policy insert/update/delete cho anon → chỉ server (service role) ghi được.
