begin;

create table if not exists public.ai_token_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_limit bigint check (monthly_limit between 0 and 1000000000),
  updated_at timestamptz not null default now()
);
create table if not exists public.ai_token_usage (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  feature text not null,
  model text not null,
  status text not null check (status in ('pending','completed','uncertain','released')),
  reserved_tokens bigint not null check (reserved_tokens >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  thinking_tokens bigint not null default 0 check (thinking_tokens >= 0),
  total_tokens bigint not null default 0 check (total_tokens >= 0),
  created_at timestamptz not null default now()
);
create index if not exists ai_token_usage_user_month on public.ai_token_usage(user_id, month);
alter table public.ai_token_limits enable row level security;
alter table public.ai_token_usage enable row level security;
revoke all on public.ai_token_limits, public.ai_token_usage from anon, authenticated;
grant all on public.ai_token_limits, public.ai_token_usage to service_role;

-- All mutations use the same per-user transaction lock, including limit changes.
create or replace function public.set_ai_token_limit(p_user uuid, p_limit bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_limit is not null and (p_limit < 0 or p_limit > 1000000000) then raise exception 'Invalid limit'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 1));
  insert into ai_token_limits(user_id, monthly_limit) values(p_user, p_limit)
  on conflict(user_id) do update set monthly_limit=excluded.monthly_limit, updated_at=now();
end $$;

create or replace function public.reserve_ai_tokens(p_id uuid, p_user uuid, p_input int, p_output int, p_model text, p_feature text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  period date := date_trunc('month', now() at time zone 'Asia/Bangkok')::date;
  lim bigint; used bigint; allowed int;
begin
  if p_input < 0 or p_input > 2000000 or p_output < 256 or p_output > 8192 then raise exception 'Invalid reservation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 1));
  select monthly_limit into lim from ai_token_limits where user_id=p_user;
  select coalesce(sum(case when status in ('pending','uncertain') then reserved_tokens else total_tokens end),0)
    into used from ai_token_usage where user_id=p_user and month=period;
  allowed := p_output;
  if lim is not null then
    if lim-used-p_input < 256 then return jsonb_build_object('allowed',false); end if;
    allowed := least(p_output,lim-used-p_input)::int;
  end if;
  insert into ai_token_usage(id,user_id,month,feature,model,status,reserved_tokens)
    values(p_id,p_user,period,left(p_feature,100),left(p_model,100),'pending',p_input+allowed);
  return jsonb_build_object('allowed',true,'maxOutputTokens',allowed);
end $$;

-- Idempotent settlement; unknown network outcomes retain the reservation.
create or replace function public.settle_ai_tokens(p_id uuid, p_status text, p_input bigint default 0, p_output bigint default 0, p_thinking bigint default 0, p_total bigint default 0)
returns void language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  if p_status not in ('completed','uncertain','released') or least(p_input,p_output,p_thinking,p_total)<0 or
    (p_status='completed' and p_total < p_input+p_output+p_thinking) then raise exception 'Invalid usage'; end if;
  select user_id into owner_id from ai_token_usage where id=p_id;
  if owner_id is null then raise exception 'Reservation not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 1));
  update ai_token_usage set status=p_status,
    input_tokens=case when p_status='completed' then p_input else 0 end,
    output_tokens=case when p_status='completed' then p_output else 0 end,
    thinking_tokens=case when p_status='completed' then p_thinking else 0 end,
    total_tokens=case when p_status='completed' then p_total else 0 end
    where id=p_id and status in ('pending','uncertain');
end $$;

create or replace function public.ai_token_report(p_month date)
returns table(user_id uuid, model text, feature text, input_tokens bigint, output_tokens bigint, thinking_tokens bigint, total_tokens bigint, held_tokens bigint, requests bigint)
language sql security definer set search_path = public as $$
  select u.user_id,u.model,u.feature,sum(u.input_tokens)::bigint,sum(u.output_tokens)::bigint,
    sum(u.thinking_tokens)::bigint,sum(u.total_tokens)::bigint,
    sum(case when u.status in ('pending','uncertain') then u.reserved_tokens else 0 end)::bigint,
    count(*) filter (where u.status='completed')
  from ai_token_usage u where u.month=p_month group by u.user_id,u.model,u.feature;
$$;
revoke all on function public.set_ai_token_limit(uuid,bigint) from public,anon,authenticated;
revoke all on function public.reserve_ai_tokens(uuid,uuid,int,int,text,text) from public,anon,authenticated;
revoke all on function public.settle_ai_tokens(uuid,text,bigint,bigint,bigint,bigint) from public,anon,authenticated;
revoke all on function public.ai_token_report(date) from public,anon,authenticated;
grant execute on function public.set_ai_token_limit(uuid,bigint) to service_role;
grant execute on function public.reserve_ai_tokens(uuid,uuid,int,int,text,text) to service_role;
grant execute on function public.settle_ai_tokens(uuid,text,bigint,bigint,bigint,bigint) to service_role;
grant execute on function public.ai_token_report(date) to service_role;
commit;
