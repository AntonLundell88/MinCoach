create unique index if not exists personal_records_device_exercise_full_idx
  on public.personal_records (device_id, exercise_key);

comment on index public.personal_records_device_exercise_full_idx is
  'Supports beta personal-record upserts via PostgREST on_conflict=device_id,exercise_key.';
