export type LoggedSet = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
  failNote?: string;
  createdAt: string;
};

export type LoggedExercise = {
  name: string;
  sets: LoggedSet[];
};

export type Workout = {
  id: string;
  startedAt: string;
  displayName: string;
  exercises: LoggedExercise[];
};

export type ExerciseSession = {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  sets: LoggedSet[];
};

export type ExerciseProgress = {
  name: string;
  sessions: ExerciseSession[];
  sets: Array<LoggedSet & { workoutId: string; workoutName: string }>;
};

export function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function getSetScore(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    return (set.durationSeconds ?? 0) + set.weight * 0.1;
  }

  return set.weight * set.reps;
}

export function getSetLabel(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    const base = formatDuration(set.durationSeconds ?? 0);
    return set.weight > 0 ? `${base} + ${set.weight.toLocaleString("sv-SE")} kg` : base;
  }

  return `${set.weight.toLocaleString("sv-SE")} × ${set.reps}`;
}

export function getBestSet(sets: LoggedSet[]) {
  return sets.reduce<LoggedSet | null>((best, set) => {
    if (!best) return set;

    if (getSetScore(set) > getSetScore(best)) return set;
    if (getSetScore(set) === getSetScore(best) && set.weight > best.weight) {
      return set;
    }

    return best;
  }, null);
}

export function getExerciseProgress(history: Workout[]): ExerciseProgress[] {
  const byExercise = new Map<string, ExerciseProgress>();

  history
    .slice()
    .reverse()
    .forEach((workout) => {
      workout.exercises?.forEach((exercise) => {
        const loggedSets = exercise.sets ?? [];
        if (loggedSets.length === 0) return;

        const current =
          byExercise.get(exercise.name) ??
          {
            name: exercise.name,
            sessions: [],
            sets: [],
          };

        current.sessions.push({
          workoutId: workout.id,
          workoutName: workout.displayName,
          startedAt: workout.startedAt,
          sets: loggedSets,
        });

        loggedSets.forEach((set) => {
          current.sets.push({
            ...set,
            workoutId: workout.id,
            workoutName: workout.displayName,
          });
        });

        byExercise.set(exercise.name, current);
      });
    });

  return Array.from(byExercise.values()).sort((a, b) => {
    const latestA = new Date(a.sets.at(-1)?.createdAt ?? 0).getTime();
    const latestB = new Date(b.sets.at(-1)?.createdAt ?? 0).getTime();
    return latestB - latestA;
  });
}
