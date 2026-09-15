import type { CoachHealthNote, CoachLobbyContext } from "./coachAi";
import { exerciseKey, formatSetDisplay, isTimedExercise } from "./exercises";

/**
 * Det lobbycoachen får veta när appen öppnas: fakta ur loggen och minnet,
 * färdigformaterade här så att modellen läser dem som en människa hade gjort.
 * Inga färdiga meningar från oss — sådana kommer tillbaka i svaret.
 */

type LobbySet = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
};

type LobbyWorkout = {
  id: string;
  startedAt: string;
  displayName: string;
  exercises: Array<{ name: string; sets: LobbySet[] }>;
  events?: Array<{
    type: string;
    exerciseName?: string;
    note?: string;
    setCount?: number;
    replacementName?: string;
  }>;
  summary?: {
    isPartial: boolean;
    completedExerciseCount: number;
    exerciseCount: number;
  };
};

type LobbyPersonalRecord = {
  exerciseName: string;
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  createdAt: string;
};

export type LobbyCoachNote = {
  text: string;
  createdAt: string;
  /** Senaste passet när texten skrevs. Loggas ett nytt pass är texten inaktuell. */
  lastWorkoutId: string | null;
};

const GOAL_LABELS = {
  muskel: "bygga muskler",
  styrka: "bli starkare",
  fett: "tappa fett",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function startOfWeek(date: Date) {
  const monday = startOfDay(date);
  const weekday = monday.getDay();
  monday.setDate(monday.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return monday;
}

// Kalenderdagar, inte timmar: ett pass i går kväll var "igår" fast det bara
// gått tio timmar.
function whenLabel(iso: string, now: Date) {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / DAY_MS
  );

  if (days <= 0) return "idag";
  if (days === 1) return "igår";
  if (days < 14) return `för ${days} dagar sedan`;
  if (days < 60) return `för ${Math.round(days / 7)} veckor sedan`;
  return `för ${Math.round(days / 30)} månader sedan`;
}

// Veckor i rad med minst ett pass. Den här veckan räknas om den har ett pass,
// annars börjar räkningen förra veckan — en måndagsmorgon ska inte nolla allt.
function weeksInARow(history: LobbyWorkout[], now: Date) {
  const weeksWithWorkout = new Set(
    history.map((workout) => startOfWeek(new Date(workout.startedAt)).getTime())
  );
  const week = startOfWeek(now);

  if (!weeksWithWorkout.has(week.getTime())) week.setDate(week.getDate() - 7);

  let count = 0;
  while (weeksWithWorkout.has(week.getTime())) {
    count += 1;
    week.setDate(week.getDate() - 7);
  }

  return count;
}

// "100 kg × 5, 2 kvar" — appens eget ord för RIR är "reps kvar i tanken".
// Med "RIR 2" i datan stod "RIR" i 2 av 6 testtexter (2026-09-14).
function describeSet(exerciseName: string, set: LobbySet) {
  const base = formatSetDisplay({ exerciseName, ...set, rir: null });
  const isTimed = set.metricType === "time" || isTimedExercise(exerciseName);

  return typeof set.rir === "number" && !isTimed ? `${base}, ${set.rir} kvar` : base;
}

// Tyngsta setet: högst vikt, sedan flest reps eller längst tid.
function topSet(sets: LobbySet[]) {
  const effort = (set: LobbySet) =>
    set.metricType === "time" ? set.durationSeconds ?? 0 : set.reps;

  return sets.reduce<LobbySet | null>((best, set) => {
    if (!best) return set;
    if (set.weight !== best.weight) return set.weight > best.weight ? set : best;
    return effort(set) > effort(best) ? set : best;
  }, null);
}

// De tre senaste gångerna övningen kördes, äldst först:
// "100 kg × 5, 2 kvar (för 3 dagar sedan)".
function recentTopSets(exerciseName: string, history: LobbyWorkout[], now: Date) {
  const key = exerciseKey(exerciseName);

  return history
    .flatMap((workout) => {
      const exercise = workout.exercises.find((entry) => exerciseKey(entry.name) === key);
      const best = exercise ? topSet(exercise.sets) : null;
      if (!best) return [];

      return [`${describeSet(exerciseName, best)} (${whenLabel(workout.startedAt, now)})`];
    })
    .slice(0, 3)
    .reverse();
}

// Utvecklingen per övning, från de senaste passen: högst sex övningar, den
// senast körda först. Den låg under nästa pass, med just de övningarna, och
// då skrev coachen som om eleven skulle köra passet direkt: "Börja bänken på
// 77,5 kg" (2026-09-15). Nästa pass är nu bara ett namn, sist i kontexten.
function recentProgress(history: LobbyWorkout[], now: Date) {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const workout of history.slice(0, 3)) {
    for (const exercise of workout.exercises) {
      const key = exerciseKey(exercise.name);
      if (seen.has(key) || names.length >= 6) continue;
      seen.add(key);
      names.push(exercise.name);
    }
  }

  return names
    .map((name) => ({
      namn: name,
      förut: earlierTopSet(name, history, now),
      senaste: recentTopSets(name, history, now),
    }))
    .filter((entry) => entry.senaste.length > 0);
}

// Material om eleven som coachen inte kan räkna fram själv (2026-09-15).
// Utveckling över veckor syns inte från pass till pass, men coachen kan se
// den och säga det eleven inte ser själv. Inga tolkningar här, bara fakta.
const PROGRESS_WINDOW_DAYS = 56;

// Bästa setet för ungefär två månader sedan. Bara när övningen körts oftare
// än de tre gångerna i senaste, annars säger fältet samma sak igen.
function earlierTopSet(exerciseName: string, history: LobbyWorkout[], now: Date) {
  const key = exerciseKey(exerciseName);
  const since = now.getTime() - PROGRESS_WINDOW_DAYS * DAY_MS;
  const occurrences = history.flatMap((workout) => {
    if (new Date(workout.startedAt).getTime() < since) return [];
    const exercise = workout.exercises.find((entry) => exerciseKey(entry.name) === key);
    const best = exercise ? topSet(exercise.sets) : null;
    return best ? [{ startedAt: workout.startedAt, best }] : [];
  });

  if (occurrences.length <= 3) return undefined;

  const oldest = occurrences[occurrences.length - 1];
  return `${describeSet(exerciseName, oldest.best)} (${whenLabel(oldest.startedAt, now)})`;
}

// Flest veckor i rad med minst ett pass, någonsin. Då vet coachen när den
// pågående perioden är den längsta hittills.
function mostWeeksInARow(history: LobbyWorkout[]) {
  const weeks = new Set(
    history.map((workout) => startOfWeek(new Date(workout.startedAt)).getTime())
  );
  let most = 0;

  for (const start of weeks) {
    const before = new Date(start);
    before.setDate(before.getDate() - 7);
    if (weeks.has(before.getTime())) continue;

    let count = 0;
    const week = new Date(start);
    while (weeks.has(week.getTime())) {
      count += 1;
      week.setDate(week.getDate() + 7);
    }
    most = Math.max(most, count);
  }

  return most;
}

// Antal pass i ett fönster bakåt, räknat i dagar från nu.
function workoutsBetween(
  history: LobbyWorkout[],
  fromDaysAgo: number,
  toDaysAgo: number,
  now: Date
) {
  const from = now.getTime() - fromDaysAgo * DAY_MS;
  const to = now.getTime() - toDaysAgo * DAY_MS;

  return history.filter((workout) => {
    const time = new Date(workout.startedAt).getTime();
    return time > from && time <= to;
  }).length;
}

// PB från förra passet. Första gången en övning loggas blir den också ett
// "rekord" i appen — det är inget PB att prata om, så de räknas inte.
function newRecords(history: LobbyWorkout[], records: LobbyPersonalRecord[]) {
  const [latest, ...earlier] = history;
  if (!latest) return [];

  const since = new Date(latest.startedAt).getTime();

  return records
    .filter((record) => new Date(record.createdAt).getTime() >= since)
    .filter((record) =>
      earlier.some((workout) =>
        workout.exercises.some(
          (exercise) => exerciseKey(exercise.name) === exerciseKey(record.exerciseName)
        )
      )
    )
    .map((record) => `${record.exerciseName} ${describeSet(record.exerciseName, record)}`);
}

function describeEvents(workout: LobbyWorkout) {
  const events = (workout.events ?? []).flatMap((event) => {
    if (!event.exerciseName) return [];

    if (event.type === "pain") {
      const note = event.note?.trim().slice(0, 120);
      return [`ont vid ${event.exerciseName}${note ? `: ${note}` : ""}`];
    }
    if (event.type === "exercise_completed_early") {
      return [
        typeof event.setCount === "number"
          ? `avslutade ${event.exerciseName} efter ${event.setCount} set`
          : `avslutade ${event.exerciseName} i förtid`,
      ];
    }
    if (event.type === "exercise_replaced" && event.replacementName) {
      return [`bytte ${event.exerciseName} mot ${event.replacementName}`];
    }

    return [];
  });

  if (workout.summary?.isPartial) {
    events.push(
      `gjorde ${workout.summary.completedExerciseCount} av ${workout.summary.exerciseCount} övningar`
    );
  }

  return events;
}

export function buildLobbyContext(args: {
  now: Date;
  goalPrimary?: keyof typeof GOAL_LABELS;
  daysPerWeek?: number;
  limitations?: string;
  history: LobbyWorkout[];
  todayPass: { label: string } | null;
  personalRecords: LobbyPersonalRecord[];
  memoryNotes: Array<{ text: string; createdAt: string; kind?: string }>;
  healthNotes: CoachHealthNote[];
  previousNotes: LobbyCoachNote[];
}): CoachLobbyContext {
  const { now, history } = args;
  const latest = history[0];
  const weekStart = startOfWeek(now).getTime();

  // Ordningen är en tidslinje: nu, förra passet, utvecklingen, sedan historik
  // och minne. Stod dagens övningar först pratade coachen om siffrorna och
  // missade att det gått 12 dagar sedan förra passet (2026-09-14). Nästa pass
  // står sist, bredvid mål och antal pass i veckan: det är schemat, inte något
  // eleven nödvändigtvis ska göra nu. Namnet skickas inte: appen hälsar redan
  // med det ovanför texten.
  return {
    kind: "lobby_note",
    nu: `${now.toLocaleDateString("sv-SE", { weekday: "long" })} kl ${now.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`,
    förraPasset: latest
      ? {
          när: whenLabel(latest.startedAt, now),
          pass: latest.displayName,
          nyaPB: newRecords(history, args.personalRecords),
          händelser: describeEvents(latest),
        }
      : undefined,
    antalPass: history.length,
    veckan: {
      passHittills: history.filter(
        (workout) => new Date(workout.startedAt).getTime() >= weekStart
      ).length,
      veckorIRad: weeksInARow(history, now),
      flestVeckorIRad: mostWeeksInARow(history),
    },
    passSenaste4Veckorna: workoutsBetween(history, 28, 0, now),
    passFyraVeckornaInnan: workoutsBetween(history, 56, 28, now),
    utveckling: recentProgress(history, now),
    passenInnan: history.slice(1, 6).map((workout) => ({
      pass: workout.displayName,
      när: whenLabel(workout.startedAt, now),
    })),
    minne: args.memoryNotes
      .filter((note) => note.kind !== "limitation")
      .slice(0, 6)
      .map((note) => ({ text: note.text, när: whenLabel(note.createdAt, now) })),
    limitations: args.limitations?.trim() || undefined,
    recentHealthNotes: args.healthNotes.length > 0 ? args.healthNotes : undefined,
    detDuSkrevSenast: args.previousNotes.slice(0, 3).map((note) => ({
      text: note.text,
      när: whenLabel(note.createdAt, now),
    })),
    nästaPass: args.todayPass?.label,
    mål: args.goalPrimary ? GOAL_LABELS[args.goalPrimary] : undefined,
    passPerVecka: args.daysPerWeek,
  };
}
