alter table public.workouts
  add column if not exists local_workout_id text;

create unique index if not exists workouts_user_local_workout_idx
  on public.workouts (user_id, local_workout_id);

grant select, insert, update, delete
  on public.workouts
  to service_role;
