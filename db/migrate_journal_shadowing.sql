-- Bổ sung cột để lưu Journal & Shadowing khi nội dung gốc còn ở phía client.
-- Chạy 1 lần trong Supabase SQL Editor.

-- JOURNAL: lưu thẳng text của prompt (prompt_id để null vì prompt đang ở code).
alter table journal_entries add column if not exists prompt_text text;

-- SHADOWING: nội dung shadowing là tĩnh trong code (id dạng 's1'..),
-- nên cho phép shadowing_item_id null và thêm khóa client để upsert điểm/người dùng.
alter table shadowing_attempts alter column shadowing_item_id drop not null;
alter table shadowing_attempts add column if not exists client_key text;
-- mỗi người dùng giữ 1 lần luyện mới nhất cho mỗi câu (theo client_key)
create unique index if not exists shadowing_attempts_user_client_key
  on shadowing_attempts (user_id, client_key);
