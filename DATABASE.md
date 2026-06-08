# MinCoach Database

MinCoach still uses `localStorage` as the primary beta storage. The database layer is a safety net first:

- beta devices can sync a snapshot in the background
- the app keeps working if Supabase is not configured
- Supabase Auth login is wired, but account data import is intentionally separate

## Setup

1. Create a Supabase project.
2. Open the SQL editor in Supabase.
3. Run `supabase/migrations/0001_mincoach_beta.sql`.
4. Run the remaining migrations listed below.
5. Add these environment variables in Netlify:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Keep `SUPABASE_SERVICE_ROLE_KEY` secret. It must only be used on the server.
The `NEXT_PUBLIC_` values are safe to use in the browser.

## Current Beta Flow

The browser saves normally to `localStorage`. After important saves, the app sends a delayed snapshot to `/api/beta-sync`. That API route stores the snapshot in `beta_device_snapshots`.

Settings can also fetch the latest saved snapshot for the same beta device. This is a manual beta recovery step: it writes the saved snapshot back to `localStorage` and reloads the app. It should not replace real login/account restore later, but it proves the database can preserve app state between sessions.

The full beta profile is included in that snapshot, including exercise type preferences such as free weights, machines, cables, dumbbells, bodyweight, and bands.

Beta feedback is sent from Settings to `/api/beta-feedback` and stored in `beta_feedback`.

Profiles are also sent to `/api/beta-profile` and upserted into `profiles`. During beta, the app creates a stable anonymous `user_id` from the local beta device id. This gives profile, program, workout, set, PR, and coach memory rows a shared owner before real auth exists.

Approved programs are sent to `/api/beta-profile` with `kind = "program"` and stored in `workout_programs`. Older beta programs for the same beta user are marked inactive before the new one is saved.

Completed workouts are also sent to `/api/beta-workout`. That route writes one row to `workouts` and one row per logged set to `workout_sets`. The local beta device id is stored inside `workouts.summary.betaDeviceId` until real user accounts are added.

Workout rows also store `local_workout_id`. This lets the app retry the same workout safely without creating duplicate workouts or duplicate sets.

Timed/static exercises such as plank and wall sit are stored with `duration_seconds` and `metric_type = 'time'` in `workout_sets` and `personal_records`. If the first beta migration has already been run, also run `supabase/migrations/0004_timed_sets.sql` in Supabase so the live database has those columns.

New personal records and coach memory notes are sent to `/api/beta-memory`. During beta they are connected to the local beta device id. When real accounts are added, those rows can be migrated to authenticated users.

The client keeps a small retry queue in `localStorage`. If Supabase is down or slow, the app saves locally first, shows a calm status in Settings, and retries later. This is intentionally beta-only until real user accounts are added.

If the initial migration has already been run, also run:

- `supabase/migrations/0002_beta_permissions.sql`
- `supabase/migrations/0003_beta_memory_device_ids.sql`
- `supabase/migrations/0004_timed_sets.sql`
- `supabase/migrations/0006_beta_profile_program_permissions.sql`
- `supabase/migrations/0007_workout_local_ids.sql`
- `supabase/migrations/0008_personal_records_device_conflict.sql`
- `supabase/migrations/0009_auth_rls_foundation.sql`

If Supabase is missing or temporarily fails, the workout flow continues.

## Auth / Account Direction

Real user accounts should use Supabase Auth. The authenticated user id from
`auth.users.id` should become the real owner id for user data.

Do not treat the current beta `deviceId` as the real account identity. It is only
a beta backup identity for one browser/device.

`0009_auth_rls_foundation.sql` prepares the existing tables for authenticated
access:

- enables RLS on user-owned tables
- adds authenticated policies based on `user_id = auth.uid()`
- adds `legal_acceptances`
- adds `user_settings`
- adds `account_imports` for first-login migration tracking

The migration intentionally does **not** add foreign keys from existing `user_id`
columns to `auth.users`. Existing beta rows use generated UUIDs that may not
exist in `auth.users`, so a foreign key would break current beta data.

The beta API routes still use the server-only service role key and continue to
work after RLS. The service role must never be exposed to the browser.

Recommended login implementation order:

1. Done: install Supabase client packages:
   - `@supabase/supabase-js`
   - `@supabase/ssr`
2. Done: add public browser/server auth env values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Done: add a small auth client layer and session state.
4. Done: add magic link login in Settings.
5. Next: on first login, detect local beta data and ask before importing it.
6. Sync profile, active program and legal acceptance first.
7. Sync workouts, sets and personal records after the account base is stable.
8. Keep coach memories last and conservative.

Do not build Stripe, full offline PWA caching, or cross-device merge logic before
auth and account sync are stable.
