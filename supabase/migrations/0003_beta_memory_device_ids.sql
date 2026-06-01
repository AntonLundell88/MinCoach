alter table public.personal_records
  add column if not exists device_id text;

alter table public.coach_memories
  add column if not exists device_id text;

create unique index if not exists personal_records_device_exercise_idx
  on public.personal_records (device_id, exercise_key)
  where device_id is not null;

create index if not exists coach_memories_device_idx
  on public.coach_memories (device_id);

grant select, insert, update, delete
on public.personal_records
to service_role;

grant select, insert, update, delete
on public.coach_memories
to service_role;
