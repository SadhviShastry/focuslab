-- ============================================================
-- FOCUSLAB — Supabase schema
-- Run this ONCE in: Supabase Dashboard -> SQL Editor -> New query
-- (use a fresh project, or drop the tables first if re-running)
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

-- Profiles: one row per auth user (created automatically by a trigger)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  role        text not null default 'user' check (role in ('user', 'admin')),
  xp          integer not null default 0 check (xp >= 0),
  created_at  timestamptz not null default now()
);

-- Helper used by RLS policies: is the current user an admin?
-- SECURITY DEFINER lets it read profiles without triggering RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 200),
  description        text not null default '',
  priority           text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date           date,
  plan_date          date,                         -- the day the task is planned for ("Today")
  estimated_sessions integer not null default 1 check (estimated_sessions between 1 and 50),
  completed          boolean not null default false,
  completed_at       timestamptz,
  xp_awarded         boolean not null default false, -- prevents duplicate task XP
  created_at         timestamptz not null default now()
);
create index tasks_user_idx on public.tasks (user_id, created_at desc);

create table public.experiments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  hypothesis  text not null default '',
  minutes_a   integer not null default 25 check (minutes_a between 1 and 180),
  minutes_b   integer not null default 50 check (minutes_b between 1 and 180),
  status      text not null default 'active' check (status in ('active', 'ended')),
  conclusion  text,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  check (minutes_a <> minutes_b)
);
-- Only one active experiment per user
create unique index one_active_experiment on public.experiments (user_id) where status = 'active';

create table public.focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  task_id          uuid references public.tasks(id) on delete set null,
  experiment_id    uuid references public.experiments(id) on delete set null,
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  planned_minutes  integer,
  xp_earned        integer not null default 10,
  focus_rating     integer check (focus_rating between 1 and 5),
  completed_at     timestamptz not null default now()
);
create index sessions_user_idx on public.focus_sessions (user_id, completed_at desc);

create table public.daily_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  goal_date      date not null,
  target_minutes integer not null default 60,
  focus_minutes  integer not null default 0,
  sessions       integer not null default 0,
  goal_met       boolean not null default false,
  unique (user_id, goal_date)
);

create table public.garden_progress (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  stage           integer not null default 0,
  plants_bloomed  integer not null default 0,
  last_watered_at timestamptz
);

create table public.achievements (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name           text not null,
  description    text not null,
  icon           text not null default 'award',
  condition_type text not null check (condition_type in ('sessions', 'tasks', 'streak', 'minutes', 'goals', 'bloom')),
  threshold      integer not null check (threshold > 0)
);

create table public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.user_settings (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  focus_minutes        integer not null default 25 check (focus_minutes between 1 and 180),
  short_break_minutes  integer not null default 5  check (short_break_minutes between 1 and 60),
  long_break_minutes   integer not null default 15 check (long_break_minutes between 1 and 120),
  sessions_before_long integer not null default 4  check (sessions_before_long between 2 and 12),
  daily_goal_minutes   integer not null default 60 check (daily_goal_minutes between 10 and 720),
  auto_start_breaks    boolean not null default false,
  theme                text not null default 'light' check (theme in ('light', 'dark'))
);

-- Audit log of important events (signups, sessions, tasks, achievements, admin actions)
create table public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  event_type text not null,
  message    text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index logs_created_idx on public.activity_logs (created_at desc);

-- Global announcement banner controlled from the Admin Panel
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null check (char_length(message) between 1 and 300),
  is_active  boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------

-- New auth user -> profile + settings + garden + signup log
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1));

  insert into public.profiles (id, full_name, email) values (new.id, v_name, new.email);
  insert into public.user_settings (user_id) values (new.id);
  insert into public.garden_progress (user_id) values (new.id);
  insert into public.activity_logs (user_id, event_type, message)
    values (new.id, 'signup', v_name || ' signed up');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync when the auth email changes
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- SECURITY: normal users can never change their own role, and can only
-- change XP through the add_xp() function below.
-- (auth.uid() is null in the SQL editor, so you can still promote an admin there.)
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    if coalesce(current_setting('focuslab.allow_xp', true), '') <> '1' then
      new.xp := old.xp;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Atomic XP award (max 50 per call). Returns the new XP total.
create or replace function public.add_xp(amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_xp integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if amount < 1 or amount > 50 then raise exception 'Invalid XP amount'; end if;

  perform set_config('focuslab.allow_xp', '1', true);
  update public.profiles set xp = xp + amount where id = auth.uid() returning xp into new_xp;
  return new_xp;
end;
$$;

-- Admin: platform-wide numbers
create or replace function public.admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return json_build_object(
    'total_users',         (select count(*) from public.profiles),
    'total_focus_minutes', (select coalesce(sum(duration_minutes), 0) from public.focus_sessions),
    'active_tasks',        (select count(*) from public.tasks where not completed),
    'total_sessions',      (select count(*) from public.focus_sessions)
  );
end;
$$;

-- Admin: delete a user completely (auth + all their data via cascade)
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if target = auth.uid() then raise exception 'You cannot delete your own account here'; end if;
  delete from auth.users where id = target;
end;
$$;

revoke execute on function public.add_xp(integer)        from public, anon;
revoke execute on function public.admin_stats()          from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant  execute on function public.add_xp(integer)        to authenticated;
grant  execute on function public.admin_stats()          to authenticated;
grant  execute on function public.admin_delete_user(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.tasks             enable row level security;
alter table public.experiments       enable row level security;
alter table public.focus_sessions    enable row level security;
alter table public.daily_goals       enable row level security;
alter table public.garden_progress   enable row level security;
alter table public.achievements      enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_settings     enable row level security;
alter table public.activity_logs     enable row level security;
alter table public.announcements     enable row level security;

-- profiles: own row (or any row for admins). No client INSERT/DELETE:
-- rows are created by the trigger and removed by admin_delete_user().
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Strictly private, user-owned tables
create policy "tasks_own" on public.tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "experiments_own" on public.experiments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions_own" on public.focus_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily_goals_own" on public.daily_goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "garden_own" on public.garden_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_achievements_own" on public.user_achievements for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "settings_own" on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- achievements catalogue: everyone signed in can read, only admins can change
create policy "achievements_read" on public.achievements for select to authenticated using (true);
create policy "achievements_admin_write" on public.achievements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- activity logs: users add + read their own events, admins read everything.
-- Nobody can edit logs; only admins can delete them.
create policy "logs_select" on public.activity_logs for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "logs_insert_own" on public.activity_logs for insert to authenticated
  with check (user_id = auth.uid());
create policy "logs_admin_delete" on public.activity_logs for delete to authenticated
  using (public.is_admin());

-- announcements: everyone reads the active one, only admins manage them
create policy "announcements_read" on public.announcements for select to authenticated
  using (is_active or public.is_admin());
create policy "announcements_admin_write" on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 4. REALTIME (live task updates, live admin log, live banner)
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.activity_logs;
alter publication supabase_realtime add table public.announcements;

-- ------------------------------------------------------------
-- 5. SEED DATA — achievements
-- ------------------------------------------------------------
insert into public.achievements (code, name, description, icon, condition_type, threshold) values
  ('first_focus',   'First Focus',    'Complete your first focus session.',     'timer',    'sessions', 1),
  ('warming_up',    'Warming Up',     'Complete 10 focus sessions.',            'flame',    'sessions', 10),
  ('deep_worker',   'Deep Worker',    'Complete 50 focus sessions.',            'target',   'sessions', 50),
  ('first_task',    'First Task',     'Complete your first task.',              'check',    'tasks',    1),
  ('task_finisher', 'Task Finisher',  'Complete 10 tasks.',                     'tasks',    'tasks',    10),
  ('task_master',   'Task Master',    'Complete 50 tasks.',                     'trophy',   'tasks',    50),
  ('consistent',    'Consistent',     'Reach a 3-day focus streak.',            'calendar', 'streak',   3),
  ('week_warrior',  'Week Warrior',   'Reach a 7-day focus streak.',            'flame',    'streak',   7),
  ('habit_builder', 'Habit Builder',  'Reach a 30-day focus streak.',           'award',    'streak',   30),
  ('ten_hours',     'Ten Hours',      'Focus for 10 hours in total.',           'clock',    'minutes',  600),
  ('fifty_hours',   'Fifty Hours',    'Focus for 50 hours in total.',           'clock',    'minutes',  3000),
  ('goal_getter',   'Goal Getter',    'Meet your daily goal once.',             'target',   'goals',    1),
  ('goal_crusher',  'Goal Crusher',   'Meet your daily goal 7 times.',          'target',   'goals',    7),
  ('in_bloom',      'In Bloom',       'Grow your first plant to full bloom.',   'leaf',     'bloom',    1);

-- ------------------------------------------------------------
-- 6. BACKFILL (only matters if users signed up BEFORE you ran this file)
-- ------------------------------------------------------------
insert into public.profiles (id, full_name, email)
  select id, coalesce(nullif(raw_user_meta_data->>'full_name', ''), split_part(email, '@', 1)), email
  from auth.users on conflict (id) do nothing;
insert into public.user_settings (user_id) select id from public.profiles on conflict do nothing;
insert into public.garden_progress (user_id) select id from public.profiles on conflict do nothing;

-- ------------------------------------------------------------
-- 7. MAKE YOURSELF AN ADMIN (run after you have signed up in the app)
-- ------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'you@example.com';
