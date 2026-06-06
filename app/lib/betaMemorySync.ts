"use client";

import { getOrCreateBetaDeviceId } from "./betaSync";
import { postBetaJsonWithQueue } from "./betaSyncQueue";

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

async function postBetaMemory(
  body: Record<string, unknown>,
  storageKey: string,
  label: string
) {
  if (typeof window === "undefined") return undefined;

  return postBetaJsonWithQueue({
    endpoint: "/api/beta-memory",
    storageKey,
    label,
    body: {
      deviceId: getOrCreateBetaDeviceId(),
      ...body,
    },
  });
}

export function syncBetaPersonalRecord(record: BetaPersonalRecord) {
  return postBetaMemory(
    {
      kind: "personal-record",
      record,
    },
    "mincoachBetaPersonalRecordSyncStatus",
    "Personbästan"
  );
}

export function syncBetaCoachMemory(notes: BetaCoachNote[]) {
  return postBetaMemory(
    {
      kind: "coach-memory",
      notes,
    },
    "mincoachBetaCoachMemorySyncStatus",
    "Coachminne"
  );
}
