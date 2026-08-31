create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  total_xp integer not null default 0 check (total_xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_completion_date date,
  mission_pace text not null default 'standard'
    check (mission_pace in ('light', 'standard', 'stretch')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (char_length(subject) between 2 and 120),
  current_level text not null
    check (current_level in ('beginner', 'intermediate', 'advanced')),
  desired_outcome text not null
    check (char_length(desired_outcome) between 10 and 1000),
  minutes_per_day integer not null check (minutes_per_day between 30 and 480),
  days_per_week integer not null check (days_per_week between 1 and 7),
  deadline date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_active_goal_per_user
  on public.learning_goals(user_id)
  where is_active;

create table public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.learning_goals(id) on delete cascade,
  mission_date date not null,
  subject text not null,
  title text not null,
  objective text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  pace text not null check (pace in ('light', 'standard', 'stretch')),
  xp integer not null check (xp in (10, 20, 30)),
  steps jsonb not null check (jsonb_typeof(steps) = 'array'),
  evidence_requirements jsonb not null
    check (jsonb_typeof(evidence_requirements) = 'array'),
  status text not null default 'active'
    check (status in ('active', 'completed', 'missed')),
  evidence jsonb,
  xp_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, mission_date)
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  win text not null check (char_length(win) between 1 and 2000),
  obstacle text not null check (char_length(obstacle) between 1 and 2000),
  next_focus text not null check (char_length(next_focus) between 1 and 2000),
  next_mission_pace text not null
    check (next_mission_pace in ('light', 'standard', 'stretch')),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger goals_set_updated_at
before update on public.learning_goals
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Learner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.learning_goals enable row level security;
alter table public.daily_missions enable row level security;
alter table public.weekly_reviews enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "goals_select_own"
on public.learning_goals for select
using (auth.uid() = user_id);

create policy "goals_insert_own"
on public.learning_goals for insert
with check (auth.uid() = user_id);

create policy "goals_update_own"
on public.learning_goals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "goals_delete_own"
on public.learning_goals for delete
using (auth.uid() = user_id);

create policy "missions_select_own"
on public.daily_missions for select
using (auth.uid() = user_id);

create policy "missions_insert_own"
on public.daily_missions for insert
with check (auth.uid() = user_id);

create policy "missions_update_own"
on public.daily_missions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reviews_select_own"
on public.weekly_reviews for select
using (auth.uid() = user_id);

create policy "reviews_insert_own"
on public.weekly_reviews for insert
with check (auth.uid() = user_id);

create policy "reviews_update_own"
on public.weekly_reviews for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
