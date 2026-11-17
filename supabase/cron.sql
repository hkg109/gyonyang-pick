-- Run in Supabase SQL editor after enabling the pg_cron extension.
-- Stored application dates use timestamptz; the function handles Asia/Seoul boundaries.
select cron.schedule('gyonyang-public-stats','*/5 * * * *','select public.refresh_public_stats();');
