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
    sets: StructuredWorkoutSet[];
  };
};

type PersonalRecordPayload = {
  deviceId: string;
  record: {
    exerciseKey: string;
    exerciseName: string;
    weight: number;
    reps: number;
    rir?: number | null;
    achievedAt?: string;
  };
};

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
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
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

export async function insertStructuredWorkout({
  deviceId,
  workout,
}: StructuredWorkoutPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const completedAt = workout.completedAt ?? new Date().toISOString();
  const workoutResult = await postSupabaseRows<Array<{ id: string }>>(
    "workouts",
    [
      {
        pass_key: workout.passKey ?? null,
        pass_name: workout.passName ?? null,
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
        },
      },
    ],
    { prefer: "return=representation", expectJson: true }
  );

  const workoutId = workoutResult.data?.[0]?.id;

  if (!workoutId) {
    throw new Error("Supabase workout insert did not return an id.");
  }

  if (workout.sets.length > 0) {
    await postSupabaseRows(
      "workout_sets",
      workout.sets.map((set) => ({
        workout_id: workoutId,
        exercise_name: set.exerciseName,
        exercise_key: set.exerciseKey,
        set_index: set.setIndex,
        weight: set.weight,
        reps: set.reps,
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
