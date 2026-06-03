"use client";

import { getOrCreateBetaDeviceId } from "./betaSync";

type BetaPersonalRecord = {
  exerciseKey: string;
  exerciseName: string;
  weight: number;
  reps: number;
  durationSeconds?: number | null;
  metricType?: "reps" | "time";
  rir?: number | null;
  achievedAt?: string;
};

type BetaCoachNote = {
  createdAt: string;
  pass?: string;
  gym?: string;
  exerciseName?: string;
  text: string;
};

async function postBetaMemory(body: Record<string, unknown>, storageKey: string) {
  if (typeof window === "undefined") return undefined;

  try {
    const response = await fetch("/api/beta-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getOrCreateBetaDeviceId(),
        ...body,
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
    window.localStorage.setItem(storageKey, JSON.stringify(status));
    return status;
  } catch {
    const status = {
      at: new Date().toISOString(),
      ok: false,
      result: "network-error",
    };
    window.localStorage.setItem(storageKey, JSON.stringify(status));
    return status;
  }
}

export function syncBetaPersonalRecord(record: BetaPersonalRecord) {
  return postBetaMemory(
    {
      kind: "personal-record",
      record,
    },
    "mincoachBetaPersonalRecordSyncStatus"
  );
}

export function syncBetaCoachMemory(notes: BetaCoachNote[]) {
  return postBetaMemory(
    {
      kind: "coach-memory",
      notes,
    },
    "mincoachBetaCoachMemorySyncStatus"
  );
}
