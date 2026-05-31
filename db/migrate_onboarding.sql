-- SpeakUp — onboarding chọn trình độ. Chạy trên Supabase SQL editor.
-- Thêm cờ đã hoàn tất onboarding (để biết có cần hiện bước chọn trình độ không).

alter table profiles add column if not exists onboarded boolean not null default false;

-- current_stage (1..4) đã có sẵn — dùng để lưu trình độ đã chọn (A1→1, A2→2, B1→3, B2→4).
