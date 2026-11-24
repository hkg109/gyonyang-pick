-- One-off cleanup: remove every illustrative course (data.example = true) and the test data that
-- points at it (favorites, wishlist slots, samples, reviews, report access, stats).
-- Run once in the Supabase SQL Editor after 202611240001_course_delete.sql. Jelly history is kept.

do $$
declare
  cid text;
begin
  for cid in select id from public.offerings where (data->>'example')::boolean loop
    perform public.delete_course_cascade(cid);
  end loop;
end $$;

select public.refresh_public_stats(true);

-- Expect 0:
select count(*) as example_courses_left from public.offerings where (data->>'example')::boolean;
