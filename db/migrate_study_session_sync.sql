-- Apply after migrate_learning_integrity.sql. Adds new objects only; no learning records are deleted.
begin;

create or replace function public.valid_study_session(p_session jsonb, p_user uuid, p_day date)
returns boolean language plpgsql immutable set search_path = public as $$
declare step jsonb; item jsonb; kinds text[] := '{}'; total_minutes int := 0;
begin
  if p_session is null then return true; end if;
  if jsonb_typeof(p_session) is distinct from 'object' or octet_length(p_session::text) > 128000
    or p_session->>'version' is distinct from '1'
    or p_session->>'userId' is distinct from p_user::text
    or p_session->>'day' is distinct from p_day::text
    or jsonb_typeof(p_session->'minutes') is distinct from 'number'
    or (p_session->>'minutes')::numeric not in (10,20,30)
    or jsonb_typeof(p_session->'startedAt') is distinct from 'string'
    or jsonb_typeof(p_session->'steps') is distinct from 'array' then return false; end if;
  perform (p_session->>'startedAt')::timestamptz;
  if p_session ? 'id' and (jsonb_typeof(p_session->'id') is distinct from 'string'
    or p_session->>'id' !~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$') then return false; end if;
  if jsonb_array_length(p_session->'steps') not between 1 and 5 then return false; end if;
  for step in select value from jsonb_array_elements(p_session->'steps') loop
    if jsonb_typeof(step) is distinct from 'object'
      or coalesce(step->>'kind', '') not in ('review','lesson','quiz','errors','shadowing')
      or step->>'kind' = any(kinds)
      or jsonb_typeof(step->'title') is distinct from 'string' or length(step->>'title') > 200
      or jsonb_typeof(step->'href') is distinct from 'string'
      or jsonb_typeof(step->'skipped') is distinct from 'boolean'
      or jsonb_typeof(step->'target') is distinct from 'number'
      or (step->>'target')::numeric <> trunc((step->>'target')::numeric)
      or (step->>'target')::numeric not between 1 and 100
      or jsonb_typeof(step->'minutes') is distinct from 'number'
      or (step->>'minutes')::numeric <> trunc((step->>'minutes')::numeric)
      or (step->>'minutes')::numeric not between 1 and 30
      or jsonb_typeof(step->'completedIds') is distinct from 'array'
      or jsonb_array_length(step->'completedIds') > 100 then return false; end if;
    if step->>'kind' in ('lesson','quiz') then
      if jsonb_typeof(step->'slug') is distinct from 'string' or length(step->>'slug') not between 1 and 200
        or step->>'href' not like '/lesson/%' then return false; end if;
    elsif step->>'href' <> '/' || (step->>'kind') then return false;
    end if;
    for item in select value from jsonb_array_elements(step->'completedIds') loop
      if jsonb_typeof(item) is distinct from 'string' or length(item #>> '{}') > 1000 then return false; end if;
    end loop;
    if (select count(*) <> count(distinct value) from jsonb_array_elements(step->'completedIds')) then return false; end if;
    kinds := array_append(kinds, step->>'kind');
    total_minutes := total_minutes + (step->>'minutes')::int;
  end loop;
  return total_minutes = (p_session->>'minutes')::int;
exception when others then return false;
end $$;
revoke all on function public.valid_study_session(jsonb,uuid,date) from public, anon, authenticated;

create table if not exists public.study_sessions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_day date not null,
  revision bigint not null default 0 check (revision >= 0),
  session jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, study_day),
  constraint study_sessions_valid check (public.valid_study_session(session, user_id, study_day))
);
alter table public.study_sessions enable row level security;
drop policy if exists study_sessions_read_own on public.study_sessions;
create policy study_sessions_read_own on public.study_sessions for select to authenticated using (user_id = auth.uid());
revoke all on public.study_sessions from anon, authenticated;
grant select on public.study_sessions to authenticated;

-- Compare-and-set under a row lock. A null session is a durable reset marker.
-- p_user explicitly fences requests that were queued before an account switch.
create or replace function public.sync_study_session(p_user uuid, p_day date, p_expected_revision bigint, p_session jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare stored public.study_sessions;
begin
  if auth.uid() is null or p_user is distinct from auth.uid() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_day is null or p_expected_revision is null or p_expected_revision < 0
    or not public.valid_study_session(p_session, p_user, p_day) then raise exception 'Invalid study session' using errcode = '22023'; end if;
  insert into public.study_sessions(user_id, study_day) values (p_user, p_day) on conflict do nothing;
  select * into stored from public.study_sessions where user_id = p_user and study_day = p_day for update;
  if stored.revision <> p_expected_revision then
    return jsonb_build_object('applied', false, 'revision', stored.revision, 'session', stored.session);
  end if;
  update public.study_sessions set session = p_session, revision = revision + 1, updated_at = now()
    where user_id = p_user and study_day = p_day returning * into stored;
  return jsonb_build_object('applied', true, 'revision', stored.revision, 'session', stored.session);
end $$;
revoke all on function public.sync_study_session(uuid,date,bigint,jsonb) from public, anon;
grant execute on function public.sync_study_session(uuid,date,bigint,jsonb) to authenticated;

commit;
