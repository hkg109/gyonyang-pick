-- Admin mode (course upsert/import, user search, jelly adjustment) and AI cache/quota support.

alter table public.jelly_entries
  add column if not exists request_id uuid unique,
  add column if not exists operator_id uuid references auth.users(id);

create table if not exists public.review_summaries (
  course_id text primary key references public.offerings(id) on delete cascade,
  review_hash text not null,
  review_count integer not null check (review_count >= 0),
  summary_text text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_advice_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  count integer not null default 0 check (count >= 0 and count <= 5),
  primary key (user_id, usage_date)
);

alter table public.review_summaries enable row level security;
revoke all on public.review_summaries from anon, authenticated;
grant all on public.review_summaries to service_role;

alter table public.ai_advice_usage enable row level security;
revoke all on public.ai_advice_usage from anon, authenticated;
grant all on public.ai_advice_usage to service_role;

create or replace function public.admin_upsert_course(p_course jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.current_user_id();
  cid text;
begin
  if not exists (select 1 from public.operators where user_id = uid) then
    raise exception '운영자 권한이 필요합니다.';
  end if;
  cid := nullif(trim(coalesce(p_course->>'id', '')), '');
  if cid is null then
    raise exception '강좌 ID가 필요합니다.';
  end if;
  insert into public.offerings(id, data)
  values (cid, p_course)
  on conflict (id) do update set data = excluded.data;
  return p_course;
end $$;

create or replace function public.admin_import_courses(p_courses jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.current_user_id();
  item jsonb;
  cid text;
  added_count integer := 0;
  updated_count integer := 0;
  existed boolean;
begin
  if not exists (select 1 from public.operators where user_id = uid) then
    raise exception '운영자 권한이 필요합니다.';
  end if;
  if p_courses is null or jsonb_typeof(p_courses) <> 'array' then
    raise exception '강좌 목록 형식이 올바르지 않습니다.';
  end if;
  for item in select value from jsonb_array_elements(p_courses) loop
    cid := nullif(trim(coalesce(item->>'id', '')), '');
    if cid is null then
      raise exception '강좌 ID가 비어 있습니다.';
    end if;
    select exists(select 1 from public.offerings where id = cid) into existed;
    insert into public.offerings(id, data)
    values (cid, item)
    on conflict (id) do update set data = excluded.data;
    if existed then
      updated_count := updated_count + 1;
    else
      added_count := added_count + 1;
    end if;
  end loop;
  return jsonb_build_object('added', added_count, 'updated', updated_count);
end $$;

create or replace function public.admin_search_users(p_email text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.current_user_id();
  prefix text := lower(trim(coalesce(p_email, '')));
  escaped text;
begin
  if not exists (select 1 from public.operators where user_id = uid) then
    raise exception '운영자 권한이 필요합니다.';
  end if;
  escaped := replace(replace(replace(prefix, '\', '\\'), '%', '\%'), '_', '\_');
  return coalesce((
    select jsonb_agg(u_row order by u_row->>'email')
    from (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'balance', coalesce(w.balance, 0),
        'entries', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', e.id,
              'delta', e.delta,
              'reason', e.reason,
              'createdAt', e.created_at
            )
            order by e.created_at desc
          )
          from (
            select id, delta, reason, created_at
            from public.jelly_entries
            where user_id = u.id
            order by created_at desc
            limit 10
          ) e
        ), '[]'::jsonb)
      ) as u_row
      from auth.users u
      left join public.wallets w on w.user_id = u.id
      where u.email is not null
        and (escaped = '' or lower(u.email) like escaped || '%' escape '\')
      order by u.email
      limit 20
    ) t
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_adjust_jelly(
  p_user uuid,
  p_delta integer,
  p_reason text,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  op_id uuid := public.current_user_id();
  clean_reason text := trim(coalesce(p_reason, ''));
  w public.wallets%rowtype;
  u_email text;
begin
  if not exists (select 1 from public.operators where user_id = op_id) then
    raise exception '운영자 권한이 필요합니다.';
  end if;
  if p_delta is null or p_delta = 0 or p_delta < -100 or p_delta > 100 then
    raise exception '조정 수량은 0이 아닌 -100~100 사이의 정수여야 합니다.';
  end if;
  if char_length(clean_reason) < 2 or char_length(clean_reason) > 100 then
    raise exception '조정 사유는 2~100자로 입력해 주세요.';
  end if;
  if p_request is null then
    raise exception '요청 번호가 필요합니다.';
  end if;

  select email into u_email from auth.users where id = p_user;
  if u_email is null then
    raise exception '사용자를 찾을 수 없습니다.';
  end if;

  select * into w from public.wallets where user_id = p_user for update;
  if not found then
    raise exception '사용자 지갑을 찾을 수 없습니다.';
  end if;

  if not exists (select 1 from public.jelly_entries where request_id = p_request) then
    if w.balance + p_delta < 0 then
      raise exception '젤리 잔액이 음수가 될 수 없습니다.';
    end if;
    update public.wallets
      set balance = balance + p_delta
      where user_id = p_user
      returning * into w;
    insert into public.jelly_entries(user_id, delta, reason, request_id, operator_id)
    values (p_user, p_delta, '운영자 조정 · ' || clean_reason, p_request, op_id);
  end if;

  return jsonb_build_object(
    'id', p_user,
    'email', u_email,
    'balance', w.balance,
    'entries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'delta', e.delta,
          'reason', e.reason,
          'createdAt', e.created_at
        )
        order by e.created_at desc
      )
      from (
        select id, delta, reason, created_at
        from public.jelly_entries
        where user_id = p_user
        order by created_at desc
        limit 10
      ) e
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.consume_ai_advice_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.current_user_id();
  today date := (now() at time zone 'Asia/Seoul')::date;
  next_count integer;
begin
  insert into public.ai_advice_usage(user_id, usage_date, count)
  values (uid, today, 1)
  on conflict (user_id, usage_date) do update
    set count = public.ai_advice_usage.count + 1
    where public.ai_advice_usage.count < 5
  returning count into next_count;

  if next_count is null then
    raise exception '오늘은 AI 도우미를 모두 사용했어요.';
  end if;

  return next_count;
end $$;

grant execute on function public.admin_upsert_course(jsonb) to authenticated;
grant execute on function public.admin_import_courses(jsonb) to authenticated;
grant execute on function public.admin_search_users(text) to authenticated;
grant execute on function public.admin_adjust_jelly(uuid, integer, text, uuid) to authenticated;
grant execute on function public.consume_ai_advice_quota() to authenticated;
