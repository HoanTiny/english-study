-- Cho phép profiles không có email (cần cho đăng nhập ẩn danh).
-- Chạy 1 lần trong Supabase SQL Editor.
alter table profiles alter column email drop not null;
