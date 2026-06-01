-- SpeakUp — Web Push: lưu subscription trình duyệt + lịch nhắc của từng user.
-- Chạy trên Supabase SQL editor.

create table if not exists push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  enabled       boolean not null default true,
  reminder_time text not null default '20:00',   -- giờ nhắc "HH:MM" (giờ địa phương của user)
  tz_offset     int  not null default 0,         -- chênh lệch phút so với UTC (getTimezoneOffset đảo dấu)
  last_sent     date,                             -- ngày (giờ local) đã gửi nhắc gần nhất, tránh gửi trùng
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- Người dùng chỉ thao tác subscription của chính mình.
drop policy if exists "own push subs" on push_subscriptions;
create policy "own push subs" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
