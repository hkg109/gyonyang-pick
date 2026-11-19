-- The MVP stores imported offering metadata as one validated document per offering.
-- shortcut: normalize catalog metadata when a real multi-semester import replaces the illustrative catalog.
create table public.offerings (id text primary key, data jsonb not null check (data->>'id'=id));
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  year integer not null check(year between 1 and 4), department text not null,
  nationality text not null check(nationality ~ '^[A-Z]{2}$'), international boolean not null,
  marketing boolean not null default false,
  consent_at timestamptz not null default now(), terms_version text not null default '2026-11-17'
);
create table public.wallets (user_id uuid primary key references auth.users(id) on delete cascade, balance integer not null default 0 check(balance>=0), rewarded_pairs integer not null default 0);
create table public.jelly_entries (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, delta integer not null, reason text not null, created_at timestamptz not null default now());
create table public.favorites (user_id uuid not null references auth.users(id) on delete cascade, course_id text not null references public.offerings(id), primary key(user_id,course_id));
create table public.wishlists (user_id uuid not null references auth.users(id) on delete cascade, semester text not null default '2026-2', ranks jsonb not null, version integer not null default 1, created_at timestamptz not null default now(), primary key(user_id,semester));
create table public.samples (user_id uuid not null references auth.users(id) on delete cascade, semester text not null default '2026-2', ranks jsonb not null, primary key(user_id,semester));
create table public.report_access (user_id uuid not null references auth.users(id) on delete cascade, course_id text not null references public.offerings(id), created_at timestamptz not null default now(), primary key(user_id,course_id));
create table public.reviews (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.offerings(id),rating integer not null check(rating between 1 and 5),
  grade text not null check(grade in ('A+','A0','B+','B0','C 이하','P','F')),
  assignment integer not null check(assignment between 0 and 3),team integer not null check(team between 0 and 3),
  exams integer not null check(exams between 0 and 3),attendance jsonb not null,text text not null check(char_length(text) between 5 and 300),
  hidden boolean not null default false,created_at timestamptz not null default now(),unique(user_id,course_id)
);
create table public.review_reports (user_id uuid not null references auth.users(id) on delete cascade,review_id uuid not null references public.reviews(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,review_id));
create table public.test_orders (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,quantity integer not null check(quantity in (5,12)),created_at timestamptz not null default now());
create table public.action_receipts (user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,body jsonb not null,primary key(user_id,request_id));
create table public.public_stats (course_id text primary key references public.offerings(id),ranks jsonb not null,sample_size integer not null,updated_at timestamptz not null);
create table public.registration_calendar (semester text primary key,starts_at timestamptz not null);
insert into public.registration_calendar values('2026-2','2026-12-01T10:00:00+09:00'); -- illustrative schedule, replace before use
create table public.aggregation_status (id integer primary key check(id=1),last_success timestamptz,last_attempt timestamptz,error text);
create table public.operators (user_id uuid primary key references auth.users(id) on delete cascade);
insert into public.aggregation_status(id) values(1);

revoke execute on all functions in schema public from public,anon,authenticated;
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;

do $$ declare t text; begin
  foreach t in array array['offerings','profiles','wallets','jelly_entries','favorites','wishlists','samples','report_access','reviews','review_reports','test_orders','action_receipts','public_stats','registration_calendar','aggregation_status','operators'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  foreach t in array array['profiles','wallets','jelly_entries','favorites','wishlists','samples','report_access','test_orders'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy own_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
  end loop;
end $$;
grant select on public.offerings to authenticated;
create policy catalog_read on public.offerings for select to authenticated using(true);

create function public.before_user_created(event jsonb) returns jsonb language plpgsql set search_path='' as $$
begin
  if coalesce(event->'user'->>'email','') !~* '^[^[:space:]@]+@hanyang[.]ac[.]kr$' then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','한양 이메일로만 가입할 수 있습니다.'));
  end if;
  return '{}'::jsonb;
end $$;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare p jsonb;
begin
  if new.email !~* '^[^[:space:]@]+@hanyang[.]ac[.]kr$' then raise exception '한양 이메일로만 가입할 수 있습니다.'; end if;
  p:=new.raw_user_meta_data->'profile';
  if p is null or new.raw_user_meta_data->>'terms_version' is distinct from '2026-11-17' then raise exception '기본 정보와 필수 동의가 필요합니다.'; end if;
  insert into public.profiles(user_id,year,department,nationality,international,marketing) values(new.id,(p->>'year')::integer,p->>'department',p->>'nationality',(p->>'international')::boolean,coalesce((new.raw_user_meta_data->>'marketing')::boolean,false));
  insert into public.wallets(user_id) values(new.id);
  return new;
end $$;
create trigger create_profile after insert on auth.users for each row execute function public.create_profile();
create function public.guard_email() returns trigger language plpgsql set search_path='' as $$ begin
  if new.email !~* '^[^[:space:]@]+@hanyang[.]ac[.]kr$' then raise exception '한양 이메일을 사용해 주세요.'; end if; return new;
end $$;
create trigger guard_email before update of email on auth.users for each row execute function public.guard_email();

create function public.current_user_id() returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null and email ~* '^[^[:space:]@]+@hanyang[.]ac[.]kr$') then raise exception '학교 이메일 인증 후 로그인해 주세요.'; end if;
  return uid;
end $$;

create function public.review_json(r public.reviews) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',r.id,'courseId',r.course_id,'rating',r.rating,'grade',r.grade,'assignment',r.assignment,'team',r.team,'exams',r.exams,'attendance',r.attendance,'text',r.text,'hidden',r.hidden,'createdAt',r.created_at)
$$;

create function public.get_account() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.current_user_id(); result jsonb;
begin
  select jsonb_build_object(
    'id',uid,'email',(select email from auth.users where id=uid),'admin',exists(select 1 from public.operators where user_id=uid),
    'profile',jsonb_build_object('year',p.year,'department',p.department,'nationality',p.nationality,'international',p.international),
    'favorites',coalesce((select jsonb_agg(course_id order by course_id) from public.favorites where user_id=uid),'[]'),
    'ranks',coalesce(w.ranks,'[null,null,null]'),'saved',w.user_id is not null,'version',coalesce(w.version,0),'balance',b.balance,
    'entries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'delta',delta,'reason',reason,'createdAt',created_at) order by created_at desc) from public.jelly_entries where user_id=uid),'[]'),
    'unlocked',coalesce((select jsonb_agg(course_id) from public.report_access where user_id=uid),'[]'),
    'sample',(select ranks from public.samples where user_id=uid and semester='2026-2'),
    'reviews',coalesce((select jsonb_agg(public.review_json(r)) from public.reviews r where user_id=uid),'[]'),
    'paid',exists(select 1 from public.test_orders where user_id=uid),'rewardedPairs',b.rewarded_pairs,'consentAt',p.consent_at,
    'updatedAt',(select last_success from public.aggregation_status where id=1)
  ) into result from public.profiles p join public.wallets b using(user_id) left join public.wishlists w on w.user_id=p.user_id and w.semester='2026-2' where p.user_id=uid;
  return result;
end $$;
grant execute on function public.get_account() to authenticated;

create function public.validate_ranks(uid uuid,ranks jsonb,need_favorites boolean) returns void language plpgsql set search_path='' as $$
declare item jsonb;cid text;seen text[]:='{}';blank boolean:=false;c jsonb;p public.profiles;
begin
  if jsonb_typeof(ranks) is distinct from 'array' or jsonb_array_length(ranks)<>3 then raise exception '지망 형식을 확인해 주세요.'; end if;
  select * into p from public.profiles where user_id=uid;
  for item in select value from jsonb_array_elements(ranks) loop
    if item='null'::jsonb then blank:=true;continue;end if;
    if jsonb_typeof(item)<>'string' then raise exception '지망 형식을 확인해 주세요.';end if;
    cid:=item#>>'{}';
    if blank or cid=any(seen) then raise exception '지망은 1지망부터 중복 없이 골라 주세요.';end if;
    select data into c from public.offerings where id=cid;
    if c is null or c->>'semester'<>'2026-2' or not (c->'years' @> to_jsonb(p.year))
      or c->'excludedNationalities' ? p.nationality or c->'excludedDepartments' ? p.department
      or (need_favorites and not exists(select 1 from public.favorites where user_id=uid and course_id=cid)) then raise exception '수강 가능한 즐겨찾기 강좌만 지망에 넣을 수 있어요.';end if;
    seen:=array_append(seen,cid);
  end loop;
end $$;

create function public.debit(uid uuid,request_id uuid,description text) returns void language plpgsql set search_path='' as $$
begin
  update public.wallets set balance=balance-1 where user_id=uid and balance>=1;
  if not found then raise exception '젤리가 부족해요. 무료 젤리를 먼저 받아 주세요.';end if;
  insert into public.jelly_entries(id,user_id,delta,reason) values(request_id,uid,-1,description);
end $$;

create function public.mutate_account(p_action jsonb,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.current_user_id();kind text:=p_action->>'type';cid text:=p_action->>'courseId';r jsonb;w public.wishlists;old jsonb;pairs integer;paid_pairs integer;
begin
  perform 1 from public.wallets where user_id=uid for update;
  select body into old from public.action_receipts where user_id=uid and request_id=p_request;
  if found then
    if old<>p_action then raise exception '동일 요청 번호의 내용이 다릅니다.';end if;
    return public.get_account();
  end if;
  case kind
  when 'favorite' then
    if not exists(select 1 from public.offerings where id=cid and data->>'semester'='2026-2') then raise exception '강좌를 찾을 수 없습니다.';end if;
    if exists(select 1 from public.favorites where user_id=uid and course_id=cid) then delete from public.favorites where user_id=uid and course_id=cid;
    else insert into public.favorites values(uid,cid);end if;
  when 'save' then
    r:=p_action->'ranks';perform public.validate_ranks(uid,r,true);
    select * into w from public.wishlists where user_id=uid and semester='2026-2';
    if w.user_id is not null and w.ranks=r then null;
    elsif coalesce(w.version,0)<>(p_action->>'version')::integer then raise exception '다른 창에서 지망이 변경됐어요. 새로고침해 주세요.';
    elsif w.user_id is null then
      if r='[null,null,null]'::jsonb then raise exception '1지망을 선택해 주세요.';end if;
      insert into public.wishlists(user_id,ranks) values(uid,r);
    else
      perform public.debit(uid,p_request,'지망 변경');
      update public.wishlists set ranks=r,version=version+1 where user_id=uid and semester='2026-2';
    end if;
  when 'open' then
    if not exists(select 1 from public.report_access where user_id=uid and course_id=cid) then
      if not exists(select 1 from public.wishlists where user_id=uid and semester='2026-2' and ranks ? cid) then raise exception '저장한 지망의 리포트만 처음 열 수 있어요.';end if;
      perform public.debit(uid,p_request,'리포트 열람 · '||(select data->>'name' from public.offerings where id=cid));
      insert into public.report_access values(uid,cid,now());
    end if;
  when 'sample' then
    if exists(select 1 from public.samples where user_id=uid and semester='2026-2') then raise exception '이번 학기 표본 보상을 이미 받았어요.';end if;
    r:=p_action->'ranks';perform public.validate_ranks(uid,r,false);
    if r='[null,null,null]'::jsonb then raise exception '표본의 1지망을 선택해 주세요.';end if;
    insert into public.samples(user_id,ranks) values(uid,r);
    update public.wallets set balance=balance+1 where user_id=uid;
    insert into public.jelly_entries(id,user_id,delta,reason) values(p_request,uid,1,'모의수강신청 표본 제출');
  when 'review' then
    r:=p_action->'review';
    if r->>'text' ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+[.][[:alpha:]]{2,}|01[016789][- .]?[0-9]{3,4}[- .]?[0-9]{4}' then raise exception '강의평에 개인정보를 적지 말아 주세요.';end if;
    if jsonb_typeof(r->'attendance') is distinct from 'array' or jsonb_array_length(r->'attendance') not between 1 and 4 or exists(select 1 from jsonb_array_elements_text(r->'attendance') a where a not in ('전자출결','호명','서명','반영 안 함')) then raise exception '강의평 출석 방식을 확인해 주세요.';end if;
    if not exists(select 1 from public.offerings where id=r->>'courseId' and data->>'semester'<>'2026-2') then raise exception '지난 학기에 들은 강좌만 강의평을 남길 수 있어요.';end if;
    if exists(select 1 from public.reviews where user_id=uid and course_id=r->>'courseId') then raise exception '이미 강의평을 남긴 강좌입니다.';end if;
    insert into public.reviews(user_id,course_id,rating,grade,assignment,team,exams,attendance,text) values(uid,r->>'courseId',(r->>'rating')::integer,r->>'grade',(r->>'assignment')::integer,(r->>'team')::integer,(r->>'exams')::integer,r->'attendance',trim(r->>'text'));
    select count(*)/2 into pairs from public.reviews where user_id=uid and not hidden;
    select rewarded_pairs into paid_pairs from public.wallets where user_id=uid;
    if pairs>paid_pairs then
      update public.wallets set balance=balance+1,rewarded_pairs=pairs where user_id=uid;
      insert into public.jelly_entries(id,user_id,delta,reason) values(p_request,uid,1,'강의평 2과목 입력');
    end if;
  when 'report' then
    if not exists(select 1 from public.reviews v join public.report_access a on a.course_id=v.course_id and a.user_id=uid where v.id=(p_action->>'reviewId')::uuid) then raise exception '신고할 강의평에 접근할 수 없습니다.';end if;
    insert into public.review_reports(user_id,review_id) values(uid,(p_action->>'reviewId')::uuid) on conflict do nothing;
    update public.reviews set hidden=true where id=(p_action->>'reviewId')::uuid;
  when 'profile' then
    r:=p_action->'profile';update public.profiles set year=(r->>'year')::integer,department=r->>'department',nationality=r->>'nationality',international=(r->>'international')::boolean where user_id=uid;
  else raise exception '지원하지 않는 요청입니다.';
  end case;
  insert into public.action_receipts values(uid,p_request,p_action);
  return public.get_account();
end $$;
grant execute on function public.mutate_account(jsonb,uuid) to authenticated;

create function public.get_report(p_course text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.current_user_id();result jsonb;
begin
  if not exists(select 1 from public.report_access where user_id=uid and course_id=p_course) then raise exception '리포트 열람 권한이 없습니다.';end if;
  select jsonb_build_object('stats',coalesce((select jsonb_build_object('courseId',s.course_id,'ranks',case when (s.ranks->>0)::integer<5 then '[0,0,0]'::jsonb else s.ranks end,'sampleSize',s.sample_size,'updatedAt',s.updated_at) from public.public_stats s where s.course_id=p_course),jsonb_build_object('courseId',p_course,'ranks','[0,0,0]'::jsonb,'sampleSize',0,'updatedAt','1970-01-01T00:00:00Z')),
    'reviews',coalesce((select jsonb_agg(public.review_json(r) order by r.created_at desc) from public.reviews r where course_id=p_course and not hidden),'[]')) into result;
  return result;
end $$;
grant execute on function public.get_report(text) to authenticated;

-- Only the server's service role may read recommendation statistics; never expose raw counts in explore responses.
create function public.recommendation_stats() returns jsonb language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('courseId',course_id,'ranks',ranks,'sampleSize',sample_size,'updatedAt',updated_at)),'[]') from public.public_stats
$$;
grant execute on function public.recommendation_stats() to service_role;

create function public.grant_test_credit(p_user uuid,p_quantity integer,p_request uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_quantity not in (5,12) then raise exception '테스트 상품을 확인해 주세요.';end if;
  perform 1 from public.wallets where user_id=p_user for update;
  if not found then raise exception '사용자를 찾을 수 없습니다.';end if;
  if exists(select 1 from public.test_orders where id=p_request) then return;end if;
  insert into public.test_orders(id,user_id,quantity) values(p_request,p_user,p_quantity);
  update public.wallets set balance=balance+p_quantity where user_id=p_user;
  insert into public.jelly_entries(id,user_id,delta,reason) values(p_request,p_user,p_quantity,'운영자 테스트 충전');
end $$;
grant execute on function public.grant_test_credit(uuid,integer,uuid) to service_role;

create function public.refresh_public_stats(p_force boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare start_time timestamptz;previous timestamptz;minutes integer;today date:=(now() at time zone 'Asia/Seoul')::date;registration_date date;
begin
  perform pg_advisory_xact_lock(20261117);
  select starts_at into start_time from public.registration_calendar where semester='2026-2';
  registration_date:=(start_time at time zone 'Asia/Seoul')::date;
  minutes:=case when today>=registration_date then 5 when today=registration_date-1 then 10 when start_time-now()<=interval '3 days' then 30 else 60 end;
  select last_success into previous from public.aggregation_status where id=1;
  if not p_force and previous is not null and now()-previous<make_interval(mins=>minutes) then return;end if;
  update public.aggregation_status set last_attempt=now() where id=1;
  begin
    with effective as (
      select user_id,ranks from public.wishlists where semester='2026-2'
      union all select s.user_id,s.ranks from public.samples s where semester='2026-2' and not exists(select 1 from public.wishlists w where w.user_id=s.user_id and w.semester=s.semester)
    ), counts as (
      select x.value#>>'{}' as course_id,x.ordinality as rank,count(*)::integer as n from effective e cross join lateral jsonb_array_elements(e.ranks) with ordinality as x(value,ordinality) where x.value<>'null'::jsonb group by 1,2
    )
    insert into public.public_stats(course_id,ranks,sample_size,updated_at)
    select o.id,jsonb_build_array(coalesce(max(n) filter(where rank=1),0),coalesce(max(n) filter(where rank=2),0),coalesce(max(n) filter(where rank=3),0)),coalesce(sum(n),0)::integer,now() from public.offerings o left join counts c on c.course_id=o.id group by o.id
    on conflict(course_id) do update set ranks=excluded.ranks,sample_size=excluded.sample_size,updated_at=excluded.updated_at;
    update public.aggregation_status set last_success=now(),error=null where id=1;
  exception when others then update public.aggregation_status set error=sqlerrm where id=1;
  end;
end $$;
grant execute on function public.refresh_public_stats(boolean) to service_role;

-- Reporting operators use the SQL dashboard/service role; there is no public administrator elevation path.
create index review_course_visible on public.reviews(course_id) where not hidden;

create function public.moderation_queue() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.current_user_id();
begin
  if not exists(select 1 from public.operators where user_id=uid) then raise exception '운영자 권한이 필요합니다.';end if;
  return coalesce((select jsonb_agg(public.review_json(r) order by r.created_at desc) from public.reviews r where exists(select 1 from public.review_reports where review_id=r.id)),'[]');
end $$;
create function public.moderate_review(p_review uuid,p_hidden boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.current_user_id();
begin
  if not exists(select 1 from public.operators where user_id=uid) then raise exception '운영자 권한이 필요합니다.';end if;
  update public.reviews set hidden=p_hidden where id=p_review;
  if not found then raise exception '강의평을 찾을 수 없습니다.';end if;
end $$;
grant execute on function public.moderation_queue() to authenticated;
grant execute on function public.moderate_review(uuid,boolean) to authenticated;
