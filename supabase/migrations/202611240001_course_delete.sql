-- Course deletion for admin mode. Favorites, report access, reviews and stats point at offerings
-- without ON DELETE CASCADE, so they are removed here first, and the course is taken out of
-- saved wishlists and samples (remaining picks move up so ranks stay 1지망부터 without gaps).

create or replace function public.drop_rank(p_ranks jsonb, p_course text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_array(k->0, k->1, k->2)
  from (
    select coalesce(jsonb_agg(x.value order by x.ord), '[]'::jsonb) as k
    from jsonb_array_elements(p_ranks) with ordinality as x(value, ord)
    where x.value <> 'null'::jsonb and x.value <> to_jsonb(p_course)
  ) s
$$;

-- Internal: no execute grant for app roles. Used by admin_delete_course and one-off cleanups.
create or replace function public.delete_course_cascade(p_course text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.offerings where id = p_course) then
    raise exception '강좌를 찾을 수 없습니다.';
  end if;
  delete from public.favorites where course_id = p_course;
  delete from public.report_access where course_id = p_course;
  delete from public.reviews where course_id = p_course;
  delete from public.public_stats where course_id = p_course;
  update public.wishlists
    set ranks = public.drop_rank(ranks, p_course), version = version + 1
    where ranks ? p_course;
  update public.samples
    set ranks = public.drop_rank(ranks, p_course)
    where ranks ? p_course;
  delete from public.offerings where id = p_course;
end $$;

create or replace function public.admin_delete_course(p_course text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.current_user_id();
begin
  if not exists (select 1 from public.operators where user_id = uid) then
    raise exception '운영자 권한이 필요합니다.';
  end if;
  perform public.delete_course_cascade(p_course);
end $$;

revoke execute on function public.drop_rank(jsonb, text) from public, anon, authenticated;
revoke execute on function public.delete_course_cascade(text) from public, anon, authenticated;
revoke execute on function public.admin_delete_course(text) from public, anon;
grant execute on function public.admin_delete_course(text) to authenticated;
