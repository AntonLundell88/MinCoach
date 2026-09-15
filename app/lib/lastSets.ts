import { exerciseKey } from "./exercises";

/**
 * Senaste loggade setet per övning, ur passen du skickar in. Samma form som
 * lastByExercise i page.tsx, men den sparas för alla gym. Skickas bara passen
 * på gymmet du står i blir det "senast här": vikten som förifylls och det
 * introt läser som förra gången.
 */
type LoggedSetLike = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
  failNote?: string;
  createdAt: string;
};

export type LastSet = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir: number | null;
  failNote: string | null;
  updatedAt: string;
};

export function latestSetsByExercise(
  workouts: Array<{ exercises: Array<{ name: string; sets: LoggedSetLike[] }> }>
): Record<string, LastSet> {
  const latest: Record<string, LastSet> = {};

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const key = exerciseKey(exercise.name);

      for (const set of exercise.sets) {
        const current = latest[key];
        if (current && new Date(current.updatedAt).getTime() >= new Date(set.createdAt).getTime()) {
          continue;
        }

        latest[key] = {
          weight: set.weight,
          reps: set.reps,
          durationSeconds: set.durationSeconds,
          metricType: set.metricType,
          rir: set.rir ?? null,
          failNote: set.failNote ?? null,
          updatedAt: set.createdAt,
        };
      }
    }
  }

  return latest;
}
