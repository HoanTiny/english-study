-- SpeakUp — CMS bài học: lưu nội dung bài (text + audio) trong DB.
-- Nguồn chính = DB; app vẫn fallback về file tĩnh lessons.ts nếu DB trống.
-- Dùng tên cms_* để KHÔNG đụng bảng "lessons" di sản trong schema.sql.
-- Chạy trên Supabase SQL editor.

create table if not exists cms_lessons (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  cefr        text not null default 'A1',
  intro       text,
  tip         text,
  stage       int  not null default 1,        -- giai đoạn (1..4)
  order_index int  not null default 0,         -- thứ tự trong giai đoạn
  audio_url   text,                            -- audio cả bài (tuỳ chọn)
  youtube_id  text,                            -- video luyện nghe (tuỳ chọn)
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists cms_lesson_phrases (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references cms_lessons(id) on delete cascade,
  en          text not null,
  vi          text,
  ipa         text,
  example     text,
  audio_url   text,                            -- audio riêng cụm (tuỳ chọn)
  order_index int  not null default 0
);
create index if not exists cms_lesson_phrases_lesson_idx on cms_lesson_phrases(lesson_id);

-- RLS: ai cũng ĐỌC được bài đang hiện; GHI chỉ qua service role (CMS admin, bỏ qua RLS).
alter table cms_lessons        enable row level security;
alter table cms_lesson_phrases enable row level security;

drop policy if exists "public read cms_lessons" on cms_lessons;
create policy "public read cms_lessons" on cms_lessons
  for select using (visible = true);

drop policy if exists "public read cms_lesson_phrases" on cms_lesson_phrases;
create policy "public read cms_lesson_phrases" on cms_lesson_phrases
  for select using (
    exists (select 1 from cms_lessons l where l.id = cms_lesson_phrases.lesson_id and l.visible = true)
  );

-- ───────────────────────────────────────────────────────────────
-- Storage (tạo thủ công trong Supabase Dashboard → Storage):
--   Bucket: "lesson-audio"  ·  Public: TẮT (private)
--   App sẽ tạo signed URL khi cần phát — an toàn cho cả nội dung cá nhân.
-- ───────────────────────────────────────────────────────────────
