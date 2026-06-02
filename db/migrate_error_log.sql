-- SpeakUp — Sổ lỗi cá nhân: gom lỗi từ nhật ký / roleplay / luyện ngữ pháp.
-- Chạy trên Supabase SQL editor.

create table if not exists error_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  source      text not null default 'journal',   -- journal | roleplay | grammar
  original    text not null,                      -- câu/đoạn có lỗi
  correction  text not null,                      -- gợi ý sửa
  note        text,                               -- giải thích ngắn
  resolved    boolean not null default false,     -- đã ôn/đã nắm
  created_at  timestamptz not null default now()
);

create index if not exists error_log_user_idx on error_log(user_id, created_at desc);

alter table error_log enable row level security;
drop policy if exists "own error_log" on error_log;
create policy "own error_log" on error_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
