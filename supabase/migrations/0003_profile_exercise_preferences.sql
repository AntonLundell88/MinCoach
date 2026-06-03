alter table public.profiles
  add column if not exists exercise_preferences jsonb not null default '[]'::jsonb;
