-- Apply after migrate_learning_integrity.sql. No existing errors are deleted.
begin;
alter table public.error_log add column if not exists practice_count int not null default 0;
alter table public.error_log add column if not exists correct_streak int not null default 0;
alter table public.error_log add column if not exists last_practiced_at timestamptz;
alter table public.error_log add column if not exists next_review_at timestamptz not null default now();
create index if not exists error_log_due_idx on public.error_log(user_id, next_review_at) where not resolved;

-- Self-assessment is explicit. Only due attempts count towards spaced mastery.
create or replace function public.practice_error(p_id uuid, p_remembered boolean)
returns public.error_log language plpgsql set search_path = public as $$
declare item public.error_log; successes int;
begin
  if p_remembered is null then raise exception 'Missing assessment'; end if;
  select * into item from error_log where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'Error not found'; end if;
  if item.resolved or item.next_review_at > now() then raise exception 'Error is not due'; end if;
  successes := case when p_remembered then least(item.correct_streak+1, 3) else 0 end;
  update error_log set practice_count=practice_count+1, correct_streak=successes,
    last_practiced_at=now(), resolved=(successes >= 3),
    next_review_at=now() + case when not p_remembered then interval '10 minutes'
      when successes=1 then interval '1 day' when successes=2 then interval '3 days' else interval '7 days' end
    where id=item.id returning * into item;
  return item;
end $$;
revoke all on function public.practice_error(uuid,boolean) from public, anon;
grant execute on function public.practice_error(uuid,boolean) to authenticated;
commit;
