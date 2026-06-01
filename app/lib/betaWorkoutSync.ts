"use client";

import { getOrCreateBetaDeviceId } from "./betaSync";

type BetaWorkoutSet = {
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

type BetaWorkout = {
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
  sets: BetaWorkoutSet[];
};

export async function syncStructuredBetaWorkout(workout: BetaWorkout) {
  if (typeof window === "undefined") return undefined;

  try {
    const response = await fetch("/api/beta-workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getOrCreateBetaDeviceId(),
        workout,
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
    window.localStorage.setItem("mincoachBetaWorkoutSyncStatus", JSON.stringify(status));
    return status;
  } catch {
    const status = {
      at: new Date().toISOString(),
      ok: false,
      result: "network-error",
    };
    window.localStorage.setItem("mincoachBetaWorkoutSyncStatus", JSON.stringify(status));
    return status;
  }
}
