-- One deterministic monthly recap ("MinCoach Wrapped") per authenticated
-- user per calendar month, plus up to 3 AI-written caption lines and a
-- seen_at flag so the Lobby only offers it once. month is "YYYY-MM" text
-- (matches the client's getMonthKey format exactly) rather than a date,
-- so it sorts/filters trivially with zero client<->DB conversion. stats
-- is jsonb because it's display-only data, never filtered/joined on
-- individual fields, and its shape may evolve without a migration.

create table if not exists public.wrapped_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  month text not null,
  stats jsonb not null default '{}'::jsonb,
  activity_caption text not null,
  pb_caption text not null,
  reflection_caption text not null,
  caption_mode text not null default 'fallback',
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists wrapped_snapshots_user_month_idx
  on public.wrapped_snapshots (user_id, month desc);

alter table public.wrapped_snapshots enable row level security;

drop policy if exists "Users can manage their wrapped snapshots" on public.wrapped_snapshots;
create policy "Users can manage their wrapped snapshots"
  on public.wrapped_snapshots
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.wrapped_snapshots to authenticated;

comment on table public.wrapped_snapshots is
  'One deterministic monthly recap ("MinCoach Wrapped") per authenticated user per calendar month, plus up to 3 AI-written caption lines and a seen_at flag so the Lobby only offers it once.';
