"use client";

const BETA_DEVICE_ID_KEY = "mincoachBetaDeviceId";
const BETA_SYNC_KEYS = [
  "userProfile",
  "customWorkoutPlan",
  "workoutHistory",
  "lastByExercise",
  "personalRecords",
  "coachMemory",
  "programPreferences",
  "customExercisesByPass",
  "removedExercisesByPass",
  "exerciseOverridesByPass",
  "passDisplayNamesByPass",
  "acceptedTrainingSafety",
  "approvedWorkoutPlan",
  "lastPass",
  "lastGym",
  "appTheme",
] as const;

let syncTimer: number | null = null;

function parseStoredValue(raw: string | null) {
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function getOrCreateBetaDeviceId() {
  const existing = window.localStorage.getItem(BETA_DEVICE_ID_KEY);
  if (existing) return existing;

  const generated =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `beta-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(BETA_DEVICE_ID_KEY, generated);
  return generated;
}

function buildSnapshot(extra?: Record<string, unknown>) {
  const data: Record<string, unknown> = {};

  for (const key of BETA_SYNC_KEYS) {
    data[key] = parseStoredValue(window.localStorage.getItem(key));
  }

  return {
    schemaVersion: 1,
    clientSavedAt: new Date().toISOString(),
    data,
    ...extra,
  };
}

export async function syncBetaSnapshotNow(extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return undefined;

  try {
    const response = await fetch("/api/beta-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getOrCreateBetaDeviceId(),
        appVersion: "beta-localstorage-v1",
        snapshot: buildSnapshot(extra),
      }),
      keepalive: true,
    });

    const result = (await response.json().catch(() => null)) as unknown;
    const status = {
      at: new Date().toISOString(),
      httpStatus: response.status,
      ok: response.ok,
      result,
    };
    window.localStorage.setItem("mincoachBetaSyncStatus", JSON.stringify(status));
    return status;
  } catch {
    const status = {
      at: new Date().toISOString(),
      ok: false,
      result: "network-error",
    };
    window.localStorage.setItem("mincoachBetaSyncStatus", JSON.stringify(status));
    // Beta sync must never interrupt the workout flow.
    return status;
  }
}

export function scheduleBetaSync(extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  if (syncTimer) {
    window.clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void syncBetaSnapshotNow(extra);
  }, 1200);
}
