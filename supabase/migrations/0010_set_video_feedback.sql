-- Text-only feedback from AI video analysis of a logged set.
-- The video/frames themselves are never stored anywhere — only the
-- resulting coach text and a few structured signals, so the coach can
-- reference this later. Not linked to workout_sets by foreign key because
-- sets are local-first and only synced to Supabase in bulk at workout
-- completion, so no workout_sets row exists yet at recording time.

create table if not exists public.set_video_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exercise_name text not null,
  visibility text not null,
  visibility_reason text not null default '',
  what_looks_good text not null default '',
  main_adjustment text not null default '',
  needs_new_angle boolean not null default false,
  coach_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists set_video_feedback_user_created_idx
  on public.set_video_feedback (user_id, created_at desc);

alter table public.set_video_feedback enable row level security;

drop policy if exists "Users can manage their set video feedback" on public.set_video_feedback;
create policy "Users can manage their set video feedback"
  on public.set_video_feedback
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.set_video_feedback to authenticated;

comment on table public.set_video_feedback is
  'Text-only technique feedback from AI video analysis of a logged set. The video/frames are never stored — only the resulting coach text and structured signals.';
