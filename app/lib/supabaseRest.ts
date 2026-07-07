import { createHash } from "crypto";

type SnapshotPayload = {
  deviceId: string;
  snapshot: Record<string, unknown>;
  appVersion?: string;
};

type FeedbackPayload = {
  deviceId: string;
  message: string;
  metadata?: Record<string, unknown>;
};

type StructuredWorkoutSet = {
  exerciseName: string;
  exerciseKey: string;
  setIndex: number;
  weight: number;
  reps: number;
  durationSeconds?: number | null;
  metricType?: "reps" | "time";
  rir?: number | null;
  failNote?: string | null;
  notes?: string | null;
  createdAt?: string;
};

type StructuredWorkoutPayload = {
  deviceId: string;
  workout: {
    id: string;
    passKey?: string | null;
    passName?: string | null;
    status?: string;
    startedAt?: string | null;
    completedAt?: string | null;
    warmupNote?: string | null;
    conditioningNote?: string | null;
    review?: Record<string, unknown>;
    summary?: Record<string, unknown>;
    events?: Array<Record<string, unknown>>;
    sets: StructuredWorkoutSet[];
  };
};

type ProfilePayload = {
  deviceId: string;
  profile: Record<string, unknown>;
};

type ProgramPayload = {
  deviceId: string;
  profile: Record<string, unknown>;
  plan: Record<string, unknown>;
  source?: string;
};

type PersonalRecordPayload = {
  deviceId: string;
  record: {
    exerciseKey: string;
    exerciseName: string;
    weight: number;
    reps: number;
    durationSeconds?: number | null;
    metricType?: "reps" | "time";
    rir?: number | null;
    achievedAt?: string;
  };
};

export function getBetaUserUuid(deviceId: string) {
  const hex = createHash("sha256")
    .update(`mincoach-beta-user:${deviceId}`)
    .digest("hex");
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

type CoachMemoryPayload = {
  deviceId: string;
  notes: Array<{
    createdAt: string;
    pass?: string;
    gym?: string;
    exerciseName?: string;
    text: string;
  }>;
};

function getSupabaseConfig() {
  const url = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { url, serviceRoleKey };
}

export function getSupabaseHealth() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  let host: string | null = null;

  try {
    host = url ? new URL(url).host : null;
  } catch {
    host = "invalid-url";
  }

  return {
    configured: Boolean(url && serviceRoleKey),
    hasUrl: Boolean(url),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    host,
  };
}

export function isSupabaseConfigured() {
  return getSupabaseHealth().configured;
}

export async function upsertBetaDeviceSnapshot({
  deviceId,
  snapshot,
  appVersion = "beta-localstorage-v1",
}: SnapshotPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const now = new Date().toISOString();
  const response = await fetch(
    `${url}/rest/v1/beta_device_snapshots?on_conflict=device_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([
        {
          device_id: deviceId,
          snapshot,
          app_version: appVersion,
          last_seen_at: now,
          updated_at: now,
        },
      ]),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase beta sync failed: ${response.status} ${errorText.slice(0, 240)}`
    );
  }

  return { mode: "saved" as const };
}

export async function getBetaDeviceSnapshot(deviceId: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const, snapshot: null };
  }

  const response = await fetch(
    `${url}/rest/v1/beta_device_snapshots?device_id=eq.${encodeURIComponent(
      deviceId
    )}&select=snapshot,app_version,last_seen_at&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase beta restore failed: ${response.status} ${errorText.slice(0, 240)}`
    );
  }

  const rows = (await response.json().catch(() => [])) as Array<{
    snapshot?: Record<string, unknown> | null;
    app_version?: string | null;
    last_seen_at?: string | null;
  }>;
  const row = rows[0];

  if (!row?.snapshot) {
    return { mode: "empty" as const, snapshot: null };
  }

  return {
    mode: "found" as const,
    snapshot: row.snapshot,
    appVersion: row.app_version ?? null,
    lastSeenAt: row.last_seen_at ?? null,
  };
}

export async function insertBetaFeedback({
  deviceId,
  message,
  metadata = {},
}: FeedbackPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const response = await fetch(`${url}/rest/v1/beta_feedback`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([
      {
        device_id: deviceId,
        message,
        metadata,
      },
    ]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase beta feedback failed: ${response.status} ${errorText.slice(0, 240)}`
    );
  }

  return { mode: "saved" as const };
}

async function postSupabaseRows<T>(
  path: string,
  rows: Record<string, unknown>[],
  options?: { prefer?: string; expectJson?: boolean }
) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const, data: null as T | null };
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: options?.prefer ?? "return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase insert failed for ${path}: ${response.status} ${errorText.slice(
        0,
        240
      )}`
    );
  }

  const data = options?.expectJson
    ? ((await response.json().catch(() => null)) as T | null)
    : null;

  return { mode: "saved" as const, data };
}

async function patchSupabaseRows(path: string, body: Record<string, unknown>) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase update failed for ${path}: ${response.status} ${errorText.slice(
        0,
        240
      )}`
    );
  }

  return { mode: "saved" as const };
}

async function deleteSupabaseRows(path: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase delete failed for ${path}: ${response.status} ${errorText.slice(
        0,
        240
      )}`
    );
  }

  return { mode: "saved" as const };
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function arrayOrEmpty(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export async function upsertStructuredProfile({
  deviceId,
  profile,
}: ProfilePayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const now = new Date().toISOString();
  const userId = getBetaUserUuid(deviceId);

  const response = await fetch(
    `${url}/rest/v1/profiles?on_conflict=user_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          display_name: stringOrNull(profile.name),
          age: numberOrNull(profile.age),
          gender: stringOrNull(profile.gender),
          training_experience: stringOrNull(profile.trainingExperience),
          goal_primary: stringOrNull(profile.goalPrimary),
          goal_secondary: arrayOrEmpty(profile.goalSecondary),
          days_per_week: numberOrNull(profile.daysPerWeek),
          minutes_per_session: numberOrNull(profile.minutesPerSession),
          training_location: stringOrNull(profile.location),
          equipment: arrayOrEmpty(profile.equipment),
          limitations: stringOrNull(profile.limitations),
          updated_at: now,
        },
      ]),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase profile sync failed: ${response.status} ${errorText.slice(
        0,
        240
      )}`
    );
  }

  return { mode: "saved" as const, userId };
}

export async function insertStructuredProgram({
  deviceId,
  profile,
  plan,
  source = "ai",
}: ProgramPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const userId = getBetaUserUuid(deviceId);

  await patchSupabaseRows(
    `workout_programs?user_id=eq.${encodeURIComponent(
      userId
    )}&is_active=eq.true`,
    { is_active: false, updated_at: new Date().toISOString() }
  );

  const result = await postSupabaseRows<Array<{ id: string }>>(
    "workout_programs",
    [
      {
        user_id: userId,
        source,
        profile_snapshot: profile,
        plan,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ],
    { prefer: "return=representation", expectJson: true }
  );

  return {
    mode: result.mode,
    userId,
    programId: result.data?.[0]?.id ?? null,
  };
}

export async function insertStructuredWorkout({
  deviceId,
  workout,
}: StructuredWorkoutPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const completedAt = workout.completedAt ?? new Date().toISOString();
  const userId = getBetaUserUuid(deviceId);
  const workoutResult = await postSupabaseRows<Array<{ id: string }>>(
    "workouts?on_conflict=user_id,local_workout_id",
    [
      {
        local_workout_id: workout.id,
        pass_key: workout.passKey ?? null,
        pass_name: workout.passName ?? null,
        user_id: userId,
        status: workout.status ?? "completed",
        started_at: workout.startedAt ?? null,
        completed_at: completedAt,
        warmup_note: workout.warmupNote ?? null,
        conditioning_note: workout.conditioningNote ?? null,
        review: workout.review ?? {},
        summary: {
          ...(workout.summary ?? {}),
          betaDeviceId: deviceId,
          localWorkoutId: workout.id,
          events: workout.events ?? [],
        },
      },
    ],
    { prefer: "resolution=merge-duplicates,return=representation", expectJson: true }
  );

  const workoutId = workoutResult.data?.[0]?.id;

  if (!workoutId) {
    throw new Error("Supabase workout insert did not return an id.");
  }

  if (workout.sets.length > 0) {
    await deleteSupabaseRows(
      `workout_sets?workout_id=eq.${encodeURIComponent(workoutId)}`
    );

    await postSupabaseRows(
      "workout_sets",
      workout.sets.map((set) => ({
        workout_id: workoutId,
        exercise_name: set.exerciseName,
        exercise_key: set.exerciseKey,
        set_index: set.setIndex,
        weight: set.weight,
        reps: set.reps,
        duration_seconds: set.durationSeconds ?? null,
        metric_type: set.metricType ?? (set.durationSeconds ? "time" : "reps"),
        rir: set.rir ?? null,
        fail_note: set.failNote ?? null,
        notes: set.notes ?? null,
        created_at: set.createdAt ?? completedAt,
      }))
    );
  }

  return { mode: "saved" as const, workoutId };
}

export async function upsertPersonalRecord({
  deviceId,
  record,
}: PersonalRecordPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const response = await fetch(
    `${url}/rest/v1/personal_records?on_conflict=device_id,exercise_key`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          device_id: deviceId,
          exercise_key: record.exerciseKey,
          exercise_name: record.exerciseName,
          weight: record.weight,
          reps: record.reps,
          duration_seconds: record.durationSeconds ?? null,
          metric_type:
            record.metricType ?? (record.durationSeconds ? "time" : "reps"),
          rir: record.rir ?? null,
          achieved_at: record.achievedAt ?? new Date().toISOString(),
        },
      ]),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase personal record sync failed: ${response.status} ${errorText.slice(
        0,
        240
      )}`
    );
  }

  return { mode: "saved" as const };
}

export async function replaceCoachMemories({
  deviceId,
  notes,
}: CoachMemoryPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const deleteResponse = await fetch(
    `${url}/rest/v1/coach_memories?device_id=eq.${encodeURIComponent(deviceId)}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=minimal",
      },
    }
  );

  if (!deleteResponse.ok) {
    const errorText = await deleteResponse.text();
    throw new Error(
      `Supabase coach memory cleanup failed: ${deleteResponse.status} ${errorText.slice(
        0,
        240
      )}`
    );
  }

  if (notes.length === 0) {
    return { mode: "saved" as const };
  }

  await postSupabaseRows(
    "coach_memories",
    notes.slice(0, 50).map((note) => ({
      device_id: deviceId,
      memory_type: note.exerciseName ? "exercise_note" : "workout_note",
      exercise_key: note.exerciseName
        ? note.exerciseName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : null,
      content: {
        text: note.text,
        pass: note.pass ?? null,
        gym: note.gym ?? null,
        exerciseName: note.exerciseName ?? null,
        createdAt: note.createdAt,
      },
      importance: note.exerciseName ? 2 : 1,
      created_at: note.createdAt,
      updated_at: new Date().toISOString(),
    }))
  );

  return { mode: "saved" as const };
}
