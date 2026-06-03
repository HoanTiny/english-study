-- SpeakUp — cache câu ví dụ theo từ (cho thẻ luyện IPA & nơi khác).
-- Sinh 1 lần bằng AI rồi lưu, dùng chung cho mọi người. Chạy trên Supabase SQL editor.

create table if not exists word_examples (
  word        text primary key,            -- từ tiếng Anh (lowercase)
  example_en  text not null,
  example_vi  text,
  created_at  timestamptz not null default now()
);

alter table word_examples enable row level security;

-- Ai cũng đọc được (để client render). GHI chỉ qua service-role ở server.
create policy "public read" on word_examples for select using (true);
