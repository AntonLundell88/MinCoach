-- MinCoach authenticated account foundation.
-- This migration prepares the existing beta schema for Supabase Auth without
-- removing the current device-based beta backup flow.
--
-- Important:
-- - Existing beta rows may have generated user_id values that do not exist in auth.users.
-- - Do not add foreign keys from existing user_id columns to auth.users yet.
-- - service_role keeps working for beta API routes and bypasses RLS.
-- - Authenticated clients only see rows where user_id = auth.uid().

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  document_id text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, document_id, document_version)
);

create table if not exists public.user_settings (
  user_id uuid primary key,
  app_theme text,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.account_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  beta_device_id text,
  import_type text not null default 'local_device',
  status text not null default 'pending',
  imported_keys jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists workout_programs_user_active_idx
  on public.workout_programs (user_id, is_active, updated_at desc);

create index if not exists workouts_user_completed_idx
  on public.workouts (user_id, completed_at desc);

create index if not exists coach_memories_user_updated_idx
  on public.coach_memories (user_id, updated_at desc);

create index if not exists legal_acceptances_user_document_idx
  on public.legal_acceptances (user_id, document_id, accepted_at desc);

create index if not exists account_imports_user_idx
  on public.account_imports (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.workout_programs enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;
alter table public.coach_memories enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.user_settings enable row level security;
alter table public.account_imports enable row level security;

drop policy if exists "Users can manage their profile" on public.profiles;
create policy "Users can manage their profile"
  on public.profiles
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can manage their workout programs" on public.workout_programs;
create policy "Users can manage their workout programs"
  on public.workout_programs
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can manage their workouts" on public.workouts;
create policy "Users can manage their workouts"
  on public.workouts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can read their workout sets" on public.workout_sets;
create policy "Users can read their workout sets"
  on public.workout_sets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert their workout sets" on public.workout_sets;
create policy "Users can insert their workout sets"
  on public.workout_sets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their workout sets" on public.workout_sets;
create policy "Users can update their workout sets"
  on public.workout_sets
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their workout sets" on public.workout_sets;
create policy "Users can delete their workout sets"
  on public.workout_sets
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workouts
      where workouts.id = workout_sets.workout_id
        and workouts.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage their personal records" on public.personal_records;
create policy "Users can manage their personal records"
  on public.personal_records
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can manage their coach memories" on public.coach_memories;
create policy "Users can manage their coach memories"
  on public.coach_memories
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can manage their legal acceptances" on public.legal_acceptances;
create policy "Users can manage their legal acceptances"
  on public.legal_acceptances
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can manage their settings" on public.user_settings;
create policy "Users can manage their settings"
  on public.user_settings
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can manage their imports" on public.account_imports;
create policy "Users can manage their imports"
  on public.account_imports
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete
  on public.profiles,
     public.workout_programs,
     public.workouts,
     public.workout_sets,
     public.personal_records,
     public.coach_memories,
     public.legal_acceptances,
     public.user_settings,
     public.account_imports
  to authenticated;

grant select, insert, update, delete
  on public.legal_acceptances,
     public.user_settings,
     public.account_imports
  to service_role;

comment on table public.legal_acceptances is
  'Tracks accepted legal/safety document versions per authenticated user.';

comment on table public.user_settings is
  'Small authenticated user settings that should sync across devices.';

comment on table public.account_imports is
  'Tracks first-login import decisions from beta/local device storage to an authenticated account.';
