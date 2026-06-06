# MinCoach Database

MinCoach still uses `localStorage` as the primary beta storage. The database layer is a safety net first:

- beta devices can sync a snapshot in the background
- the app keeps working if Supabase is not configured
- future real account tables are prepared but not wired to login yet

## Setup

1. Create a Supabase project.
2. Open the SQL editor in Supabase.
3. Run `supabase/migrations/0001_mincoach_beta.sql`.
4. Add these environment variables in Netlify:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep `SUPABASE_SERVICE_ROLE_KEY` secret. It must only be used on the server.

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

If Supabase is missing or temporarily fails, the workout flow continues.
