-- SpeakUp — RLS policies cho Supabase (chạy SAU schema.sql).
-- Mỗi người dùng chỉ đọc/ghi dữ liệu của chính mình (auth.uid()).
-- Bảng nội dung (lộ trình, prompt, shadowing) cho đọc công khai.

-- ─── Bảng dữ liệu cá nhân ─────────────────────────────────────
alter table profiles               enable row level security;
alter table user_lesson_progress   enable row level security;
alter table review_items           enable row level security;
alter table review_logs            enable row level security;
alter table journal_entries        enable row level security;
alter table notes                  enable row level security;
alter table shadowing_attempts     enable row level security;
alter table recordings             enable row level security;

-- profiles: id chính là auth.uid()
create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Helper macro thủ công: các bảng có cột user_id
create policy "own rows" on user_lesson_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on review_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on journal_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on shadowing_attempts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on recordings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- review_logs: gắn theo chủ sở hữu review_item cha
create policy "own logs" on review_logs
  for all
  using (exists (
    select 1 from review_items ri
    where ri.id = review_logs.review_item_id and ri.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from review_items ri
    where ri.id = review_logs.review_item_id and ri.user_id = auth.uid()
  ));

-- ─── Bảng nội dung: đọc công khai ─────────────────────────────
alter table stages           enable row level security;
alter table lessons          enable row level security;
alter table vocab_items      enable row level security;
alter table journal_prompts  enable row level security;
alter table shadowing_items  enable row level security;

create policy "public read" on stages          for select using (true);
create policy "public read" on lessons         for select using (true);
create policy "public read" on vocab_items     for select using (true);
create policy "public read" on journal_prompts for select using (true);
create policy "public read" on shadowing_items for select using (true);
