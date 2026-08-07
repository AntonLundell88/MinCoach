-- Adds the set metadata that was already available at analysis time
-- (sent to the model as prompt context) but previously discarded instead
-- of stored alongside the resulting feedback row.

alter table public.set_video_feedback
  add column if not exists weight numeric,
  add column if not exists reps integer,
  add column if not exists duration_seconds integer,
  add column if not exists metric_type text,
  add column if not exists rir integer;
