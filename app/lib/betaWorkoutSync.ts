"use client";

import { getOrCreateBetaDeviceId } from "./betaSync";
import { postBetaJsonWithQueue } from "./betaSyncQueue";

type BetaWorkoutSet = {
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

  return postBetaJsonWithQueue({
    endpoint: "/api/beta-workout",
    storageKey: "mincoachBetaWorkoutSyncStatus",
    label: "Pass",
    body: {
      deviceId: getOrCreateBetaDeviceId(),
      workout,
    },
  });
}
