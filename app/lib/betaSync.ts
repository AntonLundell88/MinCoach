"use client";

import { flushBetaSyncQueue, postBetaJsonWithQueue } from "./betaSyncQueue";

const BETA_DEVICE_ID_KEY = "mincoachBetaDeviceId";
export const BETA_SYNC_KEYS = [
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
  "loggedFirstSetEver",
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

export function getOrCreateBetaDeviceId() {
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

export function restoreStoredValue(key: string, value: unknown) {
  if (value === null || typeof value === "undefined") {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(
    key,
    typeof value === "string" ? value : JSON.stringify(value)
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function buildBetaLocalSnapshot(extra?: Record<string, unknown>) {
  return buildSnapshot(extra);
}

export function restoreBetaSnapshotData(snapshot: Record<string, unknown>) {
  const data = isRecord(snapshot.data) ? snapshot.data : snapshot;
  const restoredKeys: string[] = [];

  for (const key of BETA_SYNC_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    // En tom enhet sparar alla nycklar som null (buildSnapshot skriver
    // hela nyckellistan oavsett om värdet finns). Att "återställa" ett
    // null raderade lokal data och rapporterade ändå nyckeln som
    // återställd — vilket fick AuthStartScreen att ladda om i evighet.
    // Tomt är inte data: hoppa över, radera inte, räkna inte.
    const value = data[key];
    if (value === null || typeof value === "undefined") continue;

    restoreStoredValue(key, value);
    restoredKeys.push(key);
  }

  return restoredKeys;
}

export async function restoreBetaSnapshotFromServer() {
  if (typeof window === "undefined") return undefined;

  try {
    const deviceId = getOrCreateBetaDeviceId();
    const response = await fetch(
      `/api/beta-sync?deviceId=${encodeURIComponent(deviceId)}`
    );
    const result = (await response.json().catch(() => null)) as unknown;

    if (!response.ok || !isRecord(result)) {
      const status = {
        at: new Date().toISOString(),
        ok: false,
        httpStatus: response.status,
        result,
      };
      window.localStorage.setItem(
        "mincoachBetaRestoreStatus",
        JSON.stringify(status)
      );
      return status;
    }

    if (result.mode !== "found" || !isRecord(result.snapshot)) {
      const status = {
        at: new Date().toISOString(),
        ok: true,
        mode: String(result.mode ?? "empty"),
        restoredKeys: [] as string[],
      };
      window.localStorage.setItem(
        "mincoachBetaRestoreStatus",
        JSON.stringify(status)
      );
      return status;
    }

    const snapshot = result.snapshot;
    const restoredKeys = restoreBetaSnapshotData(snapshot);

    const status = {
      at: new Date().toISOString(),
      ok: true,
      mode: "restored",
      restoredKeys,
      lastSeenAt:
        typeof result.lastSeenAt === "string" ? result.lastSeenAt : null,
    };
    window.localStorage.setItem(
      "mincoachBetaRestoreStatus",
      JSON.stringify(status)
    );
    return status;
  } catch {
    const status = {
      at: new Date().toISOString(),
      ok: false,
      result: "network-error",
    };
    window.localStorage.setItem(
      "mincoachBetaRestoreStatus",
      JSON.stringify(status)
    );
    return status;
  }
}

export async function syncBetaSnapshotNow(extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return undefined;

  // Beta sync must never interrupt the workout flow.
  return postBetaJsonWithQueue({
    endpoint: "/api/beta-sync",
    storageKey: "mincoachBetaSyncStatus",
    label: "Appdata",
    body: {
      deviceId: getOrCreateBetaDeviceId(),
      appVersion: "beta-localstorage-v1",
      snapshot: buildSnapshot(extra),
    },
  });
}

export function scheduleBetaSync(extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  if (syncTimer) {
    window.clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void syncBetaSnapshotNow(extra).then(() => flushBetaSyncQueue());
  }, 1200);
}
