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

Beta feedback is sent from Settings to `/api/beta-feedback` and stored in `beta_feedback`.

Completed workouts are also sent to `/api/beta-workout`. That route writes one row to `workouts` and one row per logged set to `workout_sets`. The local beta device id is stored inside `workouts.summary.betaDeviceId` until real user accounts are added.

New personal records and coach memory notes are sent to `/api/beta-memory`. During beta they are connected to the local beta device id. When real accounts are added, those rows can be migrated to authenticated users.

If Supabase is missing or temporarily fails, the workout flow continues.
