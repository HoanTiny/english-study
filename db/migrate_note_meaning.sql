-- SpeakUp — thêm ô NGHĨA cho ghi chú trong Sổ tay (từ/cụm mới).
-- Chạy trên Supabase SQL editor.

alter table notes add column if not exists meaning text;
