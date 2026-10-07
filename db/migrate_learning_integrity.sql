-- Run after all existing migrations, before deploying the matching application.
begin;

-- RLS restricts rows, not columns. Prevent self-assigned CMS roles on INSERT too.
create or replace function public.protect_profile_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') then
    if TG_OP = 'INSERT' then
      if new.role is not null then raise exception 'role is server-managed'; end if;
    elsif new.role is distinct from old.role then
      raise exception 'role is server-managed';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before insert or update on public.profiles
for each row execute function public.protect_profile_role();

-- Atomic replacement: invalid rows or failed inserts roll back the delete.
create or replace function public.replace_lesson_phrases(p_lesson uuid, p_phrases jsonb)
returns void language plpgsql set search_path = public as $$
declare old_audio jsonb;
begin
  perform 1 from cms_lessons where id = p_lesson for update;
  if not found then raise exception 'Lesson not found'; end if;
  if jsonb_typeof(p_phrases) <> 'array' then raise exception 'Expected array'; end if;
  select coalesce(jsonb_object_agg(en, audio_url), '{}'::jsonb) into old_audio
    from cms_lesson_phrases where lesson_id = p_lesson;
  delete from cms_lesson_phrases where lesson_id = p_lesson;
  insert into cms_lesson_phrases(lesson_id, en, vi, ipa, example, audio_url, order_index)
  select p_lesson, trim(p->>'en'), p->>'vi', p->>'ipa', p->>'example',
    coalesce(p->>'audio_url', old_audio->>trim(p->>'en')), n::int - 1
    from jsonb_array_elements(p_phrases) with ordinality as x(p,n);
end $$;
revoke all on function public.replace_lesson_phrases(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.replace_lesson_phrases(uuid,jsonb) to service_role;

create table if not exists public.api_usage (
  bucket text primary key, window_start timestamptz not null, hits int not null
);
alter table public.api_usage enable row level security;
revoke all on public.api_usage from anon, authenticated;
create or replace function public.consume_api_quota(p_user uuid) returns boolean
language plpgsql set search_path = public as $$
declare n int; minute_start timestamptz := date_trunc('minute', now());
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  -- Global ceiling also bounds abuse from repeatedly created anonymous accounts.
  insert into api_usage values ('global-day', day_start, 1)
  on conflict(bucket) do update set window_start=excluded.window_start,
    hits=case when api_usage.window_start=excluded.window_start then api_usage.hits+1 else 1 end
  returning hits into n;
  if n > 5000 then return false; end if;
  insert into api_usage values (p_user::text || '-day', day_start, 1)
  on conflict(bucket) do update set window_start=excluded.window_start,
    hits=case when api_usage.window_start=excluded.window_start then api_usage.hits+1 else 1 end
  returning hits into n;
  if n > 200 then return false; end if;
  insert into api_usage values (p_user::text || '-minute', minute_start, 1)
  on conflict(bucket) do update set window_start=excluded.window_start,
    hits=case when api_usage.window_start=excluded.window_start then api_usage.hits+1 else 1 end
  returning hits into n;
  delete from api_usage where window_start < now() - interval '2 days';
  return n <= 20;
end $$;
revoke all on function public.consume_api_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_api_quota(uuid) to service_role;

create table if not exists public.lesson_quiz_results (
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null, score int not null, total int not null,
  completed_at timestamptz not null default now(),
  primary key(user_id,slug), check(total > 0 and score >= 0 and score <= total)
);
alter table public.lesson_quiz_results enable row level security;
drop policy if exists "own quiz results" on public.lesson_quiz_results;
create policy "own quiz results" on public.lesson_quiz_results for all
  using(user_id=auth.uid()) with check(user_id=auth.uid());

alter table public.review_items add column if not exists fsrs_card jsonb;
-- Serialize updates so simultaneous completed activities only add one day.
create or replace function public.record_study_day(p_user uuid, p_day date) returns int
language plpgsql set search_path = public as $$
declare last_day date; current_streak int;
begin
  if auth.uid() is distinct from p_user then raise exception 'Unauthorized'; end if;
  if p_day is null or abs(p_day - current_date) > 1 then raise exception 'Invalid study day'; end if;
  select last_active, streak_count into last_day, current_streak from profiles where id=p_user for update;
  if not found then raise exception 'Profile not found'; end if;
  if last_day >= p_day then return current_streak; end if;
  current_streak := case when last_day=p_day-1 then coalesce(current_streak,0)+1 else 1 end;
  update profiles set last_active=p_day, streak_count=current_streak where id=p_user;
  return current_streak;
end $$;
revoke all on function public.record_study_day(uuid,date) from public, anon;
grant execute on function public.record_study_day(uuid,date) to authenticated;
-- Old scores have no provenance: retain them, but exclude from verified statistics.
alter table public.shadowing_attempts add column if not exists score_source text not null default 'legacy';
commit;
