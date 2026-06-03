alter table public.workout_sets
  add column if not exists duration_seconds int,
  add column if not exists metric_type text not null default 'reps';

alter table public.personal_records
  add column if not exists duration_seconds int,
  add column if not exists metric_type text not null default 'reps';
