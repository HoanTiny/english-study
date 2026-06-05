-- Phân quyền CMS: thêm cột role vào profiles.
-- role: 'admin' (toàn quyền + quản lý tài khoản) | 'editor' (chỉ sửa nội dung) | null (user thường).
-- Chạy 1 lần trong Supabase SQL Editor.
alter table profiles add column if not exists role text;

-- (Tùy chọn) ràng buộc giá trị hợp lệ.
do $$ begin
  alter table profiles add constraint profiles_role_chk
    check (role is null or role in ('admin','editor'));
exception when duplicate_object then null; end $$;
