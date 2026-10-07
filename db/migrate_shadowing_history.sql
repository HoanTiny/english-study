-- Apply after migrate_learning_integrity.sql. Latest scores remain compatible.
begin;
alter table public.shadowing_attempts add column if not exists assessment jsonb;
alter table public.shadowing_attempts add column if not exists attempt_key uuid;
create table if not exists public.shadowing_history (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_key text not null,
  pronunciation_score numeric(5,2) not null check (pronunciation_score between 0 and 100),
  speed_rate numeric(3,2) not null,
  assessment jsonb,
  created_at timestamptz not null default now()
);
create index if not exists shadowing_history_user_sentence_date on public.shadowing_history(user_id, client_key, created_at desc);
alter table public.shadowing_history enable row level security;
drop policy if exists shadowing_history_read on public.shadowing_history;
create policy shadowing_history_read on public.shadowing_history for select to authenticated using (auth.uid() = user_id);
grant select on public.shadowing_history to authenticated;
revoke insert, update, delete on public.shadowing_history from anon, authenticated;
create or replace function public.capture_shadowing_attempt() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.score_source = 'azure' and new.client_key is not null and new.attempt_key is not null then
    insert into public.shadowing_history(id, user_id, client_key, pronunciation_score, speed_rate, assessment)
    values(new.attempt_key, new.user_id, new.client_key, new.pronunciation_score, new.speed_rate, new.assessment)
    on conflict(id) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.capture_shadowing_attempt() from public;
drop trigger if exists capture_shadowing_attempt on public.shadowing_attempts;
create trigger capture_shadowing_attempt after insert or update on public.shadowing_attempts
for each row execute function public.capture_shadowing_attempt();
commit;
