-- Give back one AI advice use when the Gemini call fails. Server-only (service role):
-- if users could call it, they could reset their own daily limit and run up AI costs.

create or replace function public.refund_ai_advice_quota(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_advice_usage
    set count = count - 1
    where user_id = p_user
      and usage_date = (now() at time zone 'Asia/Seoul')::date
      and count > 0;
end $$;

revoke execute on function public.refund_ai_advice_quota(uuid) from public, anon, authenticated;
grant execute on function public.refund_ai_advice_quota(uuid) to service_role;
