-- ============================================================
-- FOCUSLAB — fix.sql
-- Run this in Supabase SQL Editor if you see "Profile not found".
-- It is safe to run more than once.
--   1) gives the API roles permission to use the tables (newer Supabase
--      projects do not always expose new tables automatically)
--   2) creates missing profile / settings / garden rows for users who
--      signed up before the schema or trigger existed
-- Run schema.sql FIRST if you have not (this file does not create tables).
-- ============================================================

-- 1) Permissions for the Data API (RLS policies still decide who sees what)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_admin()              to authenticated;
grant execute on function public.add_xp(integer)         to authenticated;
grant execute on function public.admin_stats()           to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- 2) Backfill rows for existing users
insert into public.profiles (id, full_name, email)
  select id, coalesce(nullif(raw_user_meta_data->>'full_name', ''), split_part(email, '@', 1)), email
  from auth.users
  on conflict (id) do nothing;
insert into public.user_settings (user_id)   select id from public.profiles on conflict do nothing;
insert into public.garden_progress (user_id) select id from public.profiles on conflict do nothing;

-- 3) Quick check: you should see your user(s) listed here
select id, email, full_name, role from public.profiles;