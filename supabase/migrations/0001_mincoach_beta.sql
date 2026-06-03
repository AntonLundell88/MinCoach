create extension if not exists pgcrypto;

create table if not exists public.beta_device_snapshots (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  app_version text not null default 'beta-localstorage-v1',
  snapshot jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_device_snapshots_last_seen_idx
  on public.beta_device_snapshots (last_seen_at desc);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  display_name text,
  age int,
  gender text,
  training_experience text,
  goal_primary text,
  goal_secondary jsonb not null default '[]'::jsonb,
  days_per_week int,
  minutes_per_session int,
  training_location text,
  equipment jsonb not null default '{}'::jsonb,
  exercise_preferences jsonb not null default '[]'::jsonb,
  limitations text,
  schema_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  source text not null default 'ai',
  profile_snapshot jsonb not null default '{}'::jsonb,
  plan jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  schema_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  program_id uuid references public.workout_programs(id) on delete set null,
  pass_key text,
  pass_name text,
  status text not null default 'completed',
  started_at timestamptz,
  completed_at timestamptz,
  warmup_note text,
  conditioning_note text,
  review jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references public.workouts(id) on delete cascade,
  exercise_name text not null,
  exercise_key text not null,
  set_index int not null,
  weight numeric,
  reps int,
  duration_seconds int,
  metric_type text not null default 'reps',
  rir numeric,
  fail_note text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists workout_sets_exercise_key_idx
  on public.workout_sets (exercise_key);

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  exercise_key text not null,
  exercise_name text not null,
  weight numeric not null,
  reps int not null,
  duration_seconds int,
  metric_type text not null default 'reps',
  rir numeric,
  achieved_at timestamptz not null default now(),
  source_workout_id uuid references public.workouts(id) on delete set null,
  unique (user_id, exercise_key)
);

create table if not exists public.coach_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  memory_type text not null,
  exercise_key text,
  content jsonb not null default '{}'::jsonb,
  importance int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.beta_device_snapshots is
  'Temporary beta safety net. The app still uses localStorage as primary storage until real auth is added.';

comment on table public.profiles is
  'Future authenticated user profile. Enable RLS before exposing user accounts.';
