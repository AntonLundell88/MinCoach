"use client";

import { useEffect, useMemo, useState } from "react";
import StartScreen from "./components/StartScreen";
import WorkoutScreen from "./components/WorkoutScreen";
import SetupScreen from "./components/SetupScreen";
import WorkoutReviewScreen from "./components/WorkoutReviewScreen";
import WorkoutCompleteScreen from "./components/WorkoutCompleteScreen";
type PassType = "A" | "B" | "C" | "D";
type PassDefinition = {
  key: PassType;
  displayName: string;
  exercises: string[];
};

type DayForm = "trött" | "normal" | "stark";

type UserProfile = {
  goalPrimary: "muskel" | "styrka" | "fett";
  daysPerWeek: number;
  minutesPerSession: number;
  location: "gym" | "hemma";
  equipment: string[];
  limitations: string;
};

type PersonalRecord = {
  exerciseName: string;
  weight: number;
  reps: number;
  createdAt: string;
};
type PlannedExercise = {
  name: string;
};

type WorkoutPass = {
  key: PassType;
  displayName: string;
  exercises: PlannedExercise[];
};

type WorkoutPlan = {
  title: string;
  goalPrimary: UserProfile["goalPrimary"];
  daysPerWeek: number;
  passes: WorkoutPass[];
};

type PersonalRecords = Record<string, PersonalRecord>;


type LoggedSet = {
  weight: number;
  reps: number;
  rir?: number;
  failNote?: string;
  createdAt: string;
};




type LoggedExercise = {
  name: string;
  sets: LoggedSet[];
};

type WorkoutSummary = {
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  bestSetText: string;
  coachSummary: string;
};
type WorkoutReview = {
  passLabel: string;
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  bestSetText: string;
  coachSummary: string;
  positives: string[];
  adjustments: string[];
  nextFocus: string[];
  progression: {
    improved: string[];
    same: string[];
    worse: string[];
  };
    coachMemoryTakeaway: string[];
};

type Workout = {
  id: string;
  startedAt: string;
  gym: string;
  pass: PassType;
  displayName: string;
  planTitle?: string;
  exercises: LoggedExercise[];
  summary?: WorkoutSummary;
};


type LastByExercise = Record<
  string,
  {
    weight: number;
    reps: number;
    rir: number | null;
    failNote: string | null;
    updatedAt: string;
  }
>;


type CustomExercisesByPass = Record<PassType, string[]>;

type RemovedExercisesByPass = Record<PassType, string[]>;


function getNextPass(
  lastPass: PassType | null,
  daysPerWeek: number
): PassType {
  if (daysPerWeek <= 2) {
    return lastPass === "A" ? "B" : "A";
  }

  if (daysPerWeek === 3) {
    if (lastPass === "A") return "B";
    if (lastPass === "B") return "C";
    return "A";
  }

  if (daysPerWeek === 4) {
    if (lastPass === "A") return "B";
    if (lastPass === "B") return "C";
    if (lastPass === "C") return "D";
    return "A";
  }

  if (lastPass === "A") return "B";
  if (lastPass === "B") return "C";
  if (lastPass === "C") return "D";
  return "A";
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}
function getWorkoutIntro(dayForm: DayForm | null, passDisplayName?: string) {
  const passPrefix =
    passDisplayName && passDisplayName.trim().length > 0
      ? `Vi kör ${passDisplayName} idag. `
      : "";

  if (dayForm === "trött") {
    return `${passPrefix}Jag ser att du är trött idag. Vi kör smart och kontrollerat.`;
  }

  if (dayForm === "stark") {
    return `${passPrefix}Du är i bra mode idag. Vi kan trycka lite mer.`;
  }

 const options = [
  "Fokus på bra form och jämna set.",
  "Vi jobbar kontrollerat och håller kvalitet i varje set.",
  "Håll tekniken ren och bygg stabila set idag.",
];

return `${passPrefix}${options[Math.floor(Math.random() * options.length)]}`;
}
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
function exerciseKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
  }
  function getExerciseProgression(
  history: Workout[],
  exerciseName: string
) {
  const key = exerciseKey(exerciseName);

  const sets: { weight: number; reps: number }[] = [];

  for (const w of history) {
    const ex = w.exercises.find(
      (e) => exerciseKey(e.name) === key
    );

    if (!ex) continue;

    if (ex.sets.length === 0) continue;

    const best = ex.sets.reduce((best, s) => {
      if (s.weight > best.weight) return s;
      if (s.weight === best.weight && s.reps > best.reps) return s;
      return best;
    });

    sets.push({
      weight: best.weight,
      reps: best.reps,
    });
  }

  return sets.slice(0, 3);
}

function getStagnationInsight(
  history: Workout[],
  exerciseName: string
) {
  const key = exerciseKey(exerciseName);

  const recentBestSets: { weight: number; reps: number }[] = [];

  for (const w of history) {
    const ex = w.exercises.find((e) => exerciseKey(e.name) === key);

    if (!ex || ex.sets.length === 0) continue;

    const best = ex.sets.reduce((best, s) => {
      if (s.weight > best.weight) return s;
      if (s.weight === best.weight && s.reps > best.reps) return s;
      return best;
    });

    recentBestSets.push({
      weight: best.weight,
      reps: best.reps,
    });
  }

  if (recentBestSets.length < 3) return "";

  const latestThree = recentBestSets.slice(0, 3);

  const sameWeightAllThree = latestThree.every(
    (set) => set.weight === latestThree[0].weight
  );

  if (!sameWeightAllThree) return "";

  return `Du har legat på ${latestThree[0].weight} kg i 3 pass. Om tekniken känns bra kan vi testa +${PROGRESSION_STEP} kg nästa gång.`;
}

function getFatigueInsight(
  history: Workout[],
  exerciseName: string
) {
  const key = exerciseKey(exerciseName);

  const recentSets: { rir?: number }[] = [];

  for (const w of history) {
    const ex = w.exercises.find((e) => exerciseKey(e.name) === key);

    if (!ex || ex.sets.length === 0) continue;

    for (const s of ex.sets) {
      recentSets.push({ rir: s.rir });
    }

    if (recentSets.length >= 6) break;
  }

  const latestSix = recentSets.slice(0, 6);

  if (latestSix.length < 4) return "";

  const hardSets = latestSix.filter(
    (s) => s.rir === 0 || s.rir === 1
  ).length;

  if (hardSets < 3) return "";

  return "Du har haft flera tunga set senaste passen. Det kan vara läge att hålla igen lite idag.";
}

function getDeloadInsight(
  history: Workout[],
  exerciseName: string
) {
  const key = exerciseKey(exerciseName);

  const recentSets: { rir?: number; weight: number }[] = [];

  for (const w of history) {
    const ex = w.exercises.find((e) => exerciseKey(e.name) === key);

    if (!ex || ex.sets.length === 0) continue;

    for (const s of ex.sets) {
      recentSets.push({
        rir: s.rir,
        weight: s.weight,
      });
    }

    if (recentSets.length >= 8) break;
  }

  const latestEight = recentSets.slice(0, 8);

  if (latestEight.length < 6) return "";

  const failureCount = latestEight.filter((s) => s.rir === 0).length;
  const hardCount = latestEight.filter((s) => s.rir === 0 || s.rir === 1).length;

  if (failureCount < 2 && hardCount < 5) return "";

  const heaviestWeight = Math.max(...latestEight.map((s) => s.weight));
  const deloadWeight = Math.max(0, heaviestWeight * 0.9);

  return `Du har haft flera väldigt tunga set senaste passen. Det kan vara smart att köra en lättare dag runt ${deloadWeight.toFixed(1)} kg eller ungefär 5–10 % lättare.`;
}

 function didHitTargets(
  last: { weight: number; reps: number } | undefined,
  targetReps: number
) {
  if (!last) return false;
  return last.reps >= targetReps;
}
function mergePlan(base: string[], custom: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const ex of [...base, ...custom]) {
    const key = exerciseKey(ex);
    if (key.length === 0) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ex.trim());
  }

  return out;
}



const PASS_TEMPLATES: Record<PassType, string[]> = {
  A: ["Hantelpress", "Skivstångsrodd", "Sidolyft"],
  B: ["Rumänska marklyft", "Benpress", "Benspark"],
  C: ["Lutande hantelpress", "Latsdrag", "Cable cross"],
  D: ["Benpress", "Utfall", "Vadpress"],
};
function getDefaultPassDisplayName(
  profile: UserProfile,
  pass: PassType
): string {
  if (profile.daysPerWeek <= 2) {
    return pass === "A" ? "Helkropp 1" : "Helkropp 2";
  }

  if (profile.daysPerWeek === 3) {
    if (pass === "A") return "Överkropp";
    if (pass === "B") return "Underkropp";
    return "Helkropp";
  }

  if (profile.daysPerWeek === 4) {
    if (pass === "A") return "Överkropp 1";
    if (pass === "B") return "Underkropp 1";
    if (pass === "C") return "Överkropp 2";
    return "Underkropp 2";
  }

  return `Pass ${pass}`;
}
function buildPlan(profile: UserProfile, pass: PassType): string[] {
  const hasLowBackIssue = profile.limitations
    .toLowerCase()
    .includes("ländrygg");

  if (profile.location === "gym") {
    if (profile.daysPerWeek === 1) {
      return hasLowBackIssue
        ? ["Benpress", "Hantelpress", "Latsdrag", "Benspark", "Cable crunch"]
        : ["Benpress", "Hantelpress", "Skivstångsrodd", "Rumänska marklyft", "Cable crunch"];
    }

    if (profile.daysPerWeek === 2) {
      if (hasLowBackIssue) {
        return pass === "A"
          ? ["Benpress", "Hantelpress", "Latsdrag"]
          : ["Hip thrust", "Skivstångsrodd", "Sidolyft"];
      }

      return pass === "A"
        ? ["Benpress", "Hantelpress", "Skivstångsrodd"]
        : ["Rumänska marklyft", "Latsdrag", "Sidolyft"];
    }

    if (profile.daysPerWeek === 3) {
      if (pass === "A") {
        return [
          "Hantelpress",
          "Skivstångsrodd",
          "Sidolyft",
          "Cable cross",
          "Stångcurl",
          "Triceps pushdown",
        ];
      }

      if (pass === "B") {
        return hasLowBackIssue
          ? ["Benpress", "Benspark", "Lårcurl", "Vadpress"]
          : ["Rumänska marklyft", "Benpress", "Benspark", "Vadpress"];
      }

      return [
        "Lutande hantelpress",
        "Latsdrag",
        "Benpress",
        "Sidolyft + biceps",
        "Triceps pushdown",
        "Cable crunch",
      ];
    }

    if (profile.daysPerWeek === 4) {
      if (pass === "A") {
        return [
          "Hantelpress",
          "Skivstångsrodd",
          "Sidolyft",
          "Cable cross",
          "Stångcurl",
          "Triceps pushdown",
        ];
      }

      if (pass === "B") {
        return hasLowBackIssue
          ? ["Benpress", "Benspark", "Lårcurl", "Vadpress"]
          : ["Rumänska marklyft", "Benpress", "Benspark", "Vadpress"];
      }

      if (pass === "C") {
        return [
          "Lutande hantelpress",
          "Latsdrag",
          "Cable cross",
          "Sidolyft",
          "Hammercurl",
          "Triceps pushdown",
        ];
      }

      return hasLowBackIssue
        ? ["Benpress", "Benspark", "Lårcurl", "Vadpress", "Cable crunch"]
        : ["Benpress", "Utfall", "Benspark", "Vadpress", "Cable crunch"];
    }

    if (hasLowBackIssue) {
      if (pass === "A") return ["Hantelpress", "Skivstångsrodd", "Sidolyft"];
      if (pass === "B") return ["Benpress", "Benspark", "Vadpress"];
      if (pass === "C") return ["Lutande hantelpress", "Latsdrag", "Cable crunch"];
      return ["Benpress", "Lårcurl", "Cable crunch"];
    }

    if (pass === "A") return ["Hantelpress", "Skivstångsrodd", "Sidolyft"];
    if (pass === "B") return ["Rumänska marklyft", "Benpress", "Benspark"];
    if (pass === "C") return ["Lutande hantelpress", "Latsdrag", "Cable crunch"];
    return ["Benpress", "Utfall", "Vadpress"];
  }

  // Hemma
  if (profile.daysPerWeek === 1) {
    return [
      "Armhävningar",
      "Hantelrodd",
      "Goblet squat",
      "Rumänska marklyft (lätt)",
      "Crunches",
    ];
  }

  if (profile.daysPerWeek === 2) {
    return pass === "A"
      ? ["Armhävningar", "Hantelrodd", "Goblet squat"]
      : ["Rumänska marklyft (lätt)", "Hantelpress", "Bandrodd"];
  }

  if (profile.daysPerWeek === 3) {
    if (pass === "A") {
      return [
        "Hantelpress",
        "Hantelrodd",
        "Sidolyft",
        "Hantelflyes",
        "Bicepscurl",
        "Triceps extension",
      ];
    }

    if (pass === "B") {
      return [
        "Rumänska marklyft (lätt)",
        "Goblet squat",
        "Utfall",
        "Vadpress",
      ];
    }

    return [
      "Lutande hantelpress",
      "Bandlatsdrag",
      "Goblet squat",
      "Sidolyft + biceps",
      "Triceps extension",
      "Crunches",
    ];
  }

  if (profile.daysPerWeek === 4) {
    if (pass === "A") {
      return [
        "Hantelpress",
        "Hantelrodd",
        "Sidolyft",
        "Hantelflyes",
        "Bicepscurl",
        "Triceps extension",
      ];
    }

    if (pass === "B") {
      return [
        "Rumänska marklyft (lätt)",
        "Goblet squat",
        "Utfall",
        "Vadpress",
      ];
    }

    if (pass === "C") {
      return [
        "Lutande hantelpress",
        "Bandlatsdrag",
        "Sidolyft",
        "Bicepscurl",
        "Triceps extension",
      ];
    }

    return ["Goblet squat", "Utfall", "Vadpress", "Crunches"];
  }

  if (pass === "A") return ["Hantelpress", "Hantelrodd", "Sidolyft"];
  if (pass === "B") return ["Rumänska marklyft (lätt)", "Goblet squat", "Vadpress"];
  if (pass === "C") return ["Lutande hantelpress", "Bandlatsdrag", "Crunches"];
  return ["Goblet squat", "Utfall", "Crunches"];
}
function buildPassDefinition(args: {
  profile: UserProfile;
  pass: PassType;
  customExercises: string[];
  overrides: Record<string, string>;
  removedExercises: string[];
}): PassDefinition {
const { profile, pass, customExercises, overrides, removedExercises } = args;
const base = buildPlan(profile, pass);

const filteredBase = base.filter(
  (ex) =>
    !removedExercises.some(
      (removed) => exerciseKey(removed) === exerciseKey(ex)
    )
);

  const overriddenBase = filteredBase.map((ex) => {
    const key = exerciseKey(ex);
    return overrides[key] ?? ex;
  });

  const exercises = mergePlan(overriddenBase, customExercises);

  return {
    key: pass,
    displayName: getDefaultPassDisplayName(profile, pass),
    exercises,
  };
}

function buildDefaultWorkoutPlan(args: {
  profile: UserProfile;
  customExercisesByPass: CustomExercisesByPass;
  exerciseOverridesByPass: ExerciseOverridesByPass;
  removedExercisesByPass: RemovedExercisesByPass;
}): WorkoutPlan {
  const {
  profile,
  customExercisesByPass,
  exerciseOverridesByPass,
  removedExercisesByPass,
} = args;

 const passKeys: PassType[] =
  profile.daysPerWeek <= 2
    ? ["A", "B"]
    : profile.daysPerWeek === 3
    ? ["A", "B", "C"]
    : ["A", "B", "C", "D"];

const passes = passKeys.map((passKey) =>
  buildPassDefinition({
    profile,
    pass: passKey,
    customExercises: customExercisesByPass[passKey] ?? [],
    overrides: exerciseOverridesByPass[passKey] ?? {},
    removedExercises: removedExercisesByPass[passKey] ?? [],
  })
);

  return {
    title: "Ditt upplägg",
    goalPrimary: profile.goalPrimary,
    daysPerWeek: profile.daysPerWeek,
    passes: passes.map((pass) => ({
      key: pass.key,
      displayName: pass.displayName,
      exercises: pass.exercises.map((name) => ({ name })),
    })),
  };
}

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 5;
const PROGRESSION_STEP = 2.5;

function getGoalTargets(goalPrimary: UserProfile["goalPrimary"]) {
  if (goalPrimary === "styrka") {
    return {
      targetSets: 3,
      targetReps: 5,
    };
  }

  if (goalPrimary === "muskel") {
    return {
      targetSets: 3,
      targetReps: 10,
    };
  }

  return {
    targetSets: 3,
    targetReps: 12,
  };
}

type CoachNote = {
  createdAt: string;
  pass: PassType;
  gym: string;
  exerciseName?: string; // ⭐ ny (valfri så gammalt funkar)
  text: string;
};


type CoachMemory = {
  notes: CoachNote[]; // senaste 50
};
 type ExerciseOverridesByPass = Record<
  PassType,
  Record<string, string>
>;

function getExerciseCue(exerciseName: string) {
  const name = exerciseName.toLowerCase();

  if (name.includes("knäböj") || name.includes("squat")) {
    return "Fokus på kontroll hela vägen och stabilitet i botten.";
  }

  if (name.includes("marklyft") || name.includes("deadlift")) {
    return "Håll ryggen låst och lyftet jämnt från golvet.";
  }

  if (name.includes("bänk") || name.includes("bench")) {
    return "Tänk kontroll genom hela pressen och håll banan jämn.";
  }

  if (name.includes("rodd") || name.includes("row")) {
    return "Håll tempot kontrollerat och få med ryggen i varje rep.";
  }

  if (name.includes("latsdrag") || name.includes("pulldown")) {
    return "Dra med kontroll och håll kontakt hela vägen ner.";
  }

  if (name.includes("militärpress") || name.includes("axelpress") || name.includes("overhead")) {
    return "Håll kroppen stabil och pressa rakt genom hela rörelsen.";
  }

  return "Fokus på ren teknik och jämn kontroll.";
}

function pickDifferentOption(options: string[], lastCoachMessage: string) {
  if (options.length === 0) return "";

  const filtered = options.filter((option) => option !== lastCoachMessage);

  if (filtered.length === 0) {
    return options[Math.floor(Math.random() * options.length)];
  }

  return filtered[Math.floor(Math.random() * filtered.length)];
}
function getSetTrend(args: {
  previousSets: { weight: number; reps: number; rir?: number }[];
  weight: number;
  reps: number;
  rir: number;
}) {
  const { previousSets, weight, reps, rir } = args;

  if (previousSets.length === 0) {
    return "";
  }

  const previousSet = previousSets[previousSets.length - 1];
  const previousRir =
    typeof previousSet.rir === "number" ? previousSet.rir : null;

  if (weight === previousSet.weight && reps === previousSet.reps) {
    if (previousRir !== null) {
      if (rir > previousRir) {
        return "Det här såg lättare ut än förra setet.";
      }

      if (rir < previousRir) {
        return "Nu blev det tyngre än förra setet.";
      }

      return "Du håller samma nivå som i förra setet.";
    }

    return "Du håller samma nivå som i förra setet.";
  }

  if (weight > previousSet.weight) {
    return "Du har gått upp i vikt jämfört med förra setet.";
  }

  if (weight < previousSet.weight) {
    return "Du har backat lite i vikt jämfört med förra setet.";
  }

  if (reps > previousSet.reps) {
    return "Fler reps än i förra setet. Bra.";
  }

  if (reps < previousSet.reps) {
    return "Lite färre reps än i förra setet.";
  }

  return "";
}
function getExerciseFatigueSignal(args: {
  previousSets: { weight: number; reps: number; rir?: number }[];
  rir: number;
}) {
  const { previousSets, rir } = args;

  if (previousSets.length < 2) {
    return "";
  }

  const previousRirs = previousSets
    .map((set) => (typeof set.rir === "number" ? set.rir : null))
    .filter((rirValue): rirValue is number => rirValue !== null);

  if (previousRirs.length < 2) {
    return "";
  }

  const averagePreviousRir =
    previousRirs.reduce((sum, value) => sum + value, 0) / previousRirs.length;

  if (averagePreviousRir >= 2 && rir <= 1) {
    return "Nu börjar det bli tungt genom övningen.";
  }

  if (averagePreviousRir <= 1.5 && rir >= 2) {
    return "Bra återhämtat set. Du håller ihop det fint.";
  }

  if (averagePreviousRir >= 2 && rir >= 2) {
    return "Du håller nivån stabil genom övningen.";
  }

  return "";
}
function getWorkoutFatigueSignal(args: {
  completedExercises: { sets: { rir?: number }[] }[];
}) {
  const { completedExercises } = args;

  const allRirs = completedExercises
    .flatMap((exercise) => exercise.sets)
    .map((set) => (typeof set.rir === "number" ? set.rir : null))
    .filter((rirValue): rirValue is number => rirValue !== null);

  if (allRirs.length < 4) {
    return "";
  }

  const averageRir =
    allRirs.reduce((sum, value) => sum + value, 0) / allRirs.length;

  if (averageRir <= 1) {
    return "Du börjar bli rätt sliten genom passet nu.";
  }

  if (averageRir <= 1.75) {
    return "Passet börjar kosta nu, så håll tekniken ren.";
  }

  if (averageRir >= 2.5) {
    return "Du håller energin bra genom passet.";
  }

  return "";
}
function getGoalTone(goalPrimary: UserProfile["goalPrimary"]) {
  if (goalPrimary === "styrka") {
    return {
      rir2: "Bra kvalitet. Bygg vidare därifrån.",
      cueStyle: "Fokus på stark och ren teknik.",
    };
  }

  if (goalPrimary === "muskel") {
    return {
      rir2: "Bra stimulans. Håll kontrollen hög.",
      cueStyle: "Fokus på kontakt och jämn kontroll.",
    };
  }

  return {
    rir2: "Bra arbete. Håll jämn nivå och ren teknik.",
    cueStyle: "Fokus på tempo, kontroll och disciplin.",
  };
}
function shortCoach(lines: string[]) {
  return lines.filter(Boolean).join("\n");
}
function buildCoachMessage(args: {
  weight: number;
  reps: number;
  rir: number;
  failNote: string;
  exerciseName: string;
  setNumber: number;
  nextWeight: number;
  lastCoachMessage: string;
  previousSets: { weight: number; reps: number; rir?: number }[];
  completedExercises: { sets: { rir?: number }[] }[];
  goalPrimary: UserProfile["goalPrimary"];
}) {
  const {
  weight,
  reps,
  rir,
  failNote,
  exerciseName,
  setNumber,
  nextWeight,
  lastCoachMessage,
  previousSets,
  completedExercises,
   goalPrimary,
} = args;
const cue = getExerciseCue(exerciseName);
const goalTone = getGoalTone(goalPrimary);
const trend = getSetTrend({
  previousSets,
  weight,
  reps,
  rir,
});
const fatigueSignal = getExerciseFatigueSignal({
  previousSets,
  rir,
});
const workoutFatigueSignal = getWorkoutFatigueSignal({
  completedExercises,
});
const isEarlySet = setNumber <= 1;
const isLaterSet = setNumber >= 3;
const setPhase = isEarlySet
  ? "early"
  : isLaterSet
  ? "late"
  : "mid";

if (rir >= 3) {
  const options =
    setPhase === "early"
      ? [
          shortCoach(["Lätt start.", `Höj till ${nextWeight} kg nästa.`]),
          shortCoach(["Bra marginal.", "Du kan gå upp lite."]),
        ]
      : setPhase === "late"
      ? [
          shortCoach(["Fortfarande lätt.", `Testa ${nextWeight} kg om tekniken känns bra.`]),
          shortCoach(["Du har mer kvar.", "Höj lite om du vill trycka på."]),
        ]
      : [
          shortCoach(["Lätt set.", `Höj till ${nextWeight} kg nästa.`]),
          shortCoach(["Bra kontroll.", "Du kan gå upp lite."]),
        ];

  return pickDifferentOption(options, lastCoachMessage);
}
if (rir === 2) {
  const options = isEarlySet
    ? [
        shortCoach(["Bra start.", "Behåll vikten."]),
        shortCoach(["Rätt nivå.", "Bygg vidare därifrån."]),
      ]
    : isLaterSet
    ? [
        shortCoach(["Bra nivå.", "Avsluta lika rent."]),
        shortCoach(["Stabilt.", "Håll samma linje."]),
      ]
    : [
        shortCoach(["Bra set.", "Behåll vikten."]),
        shortCoach(["Rätt nivå.", "Fortsätt så."]),
      ];

  return pickDifferentOption(options, lastCoachMessage);
}

if (rir === 1) {
  const options =
    setPhase === "early"
      ? [
          shortCoach(["Tung öppning.", "Sänk tempot och håll kontroll."]),
          shortCoach(["Redan tungt.", "Teknik först nu."]),
        ]
      : setPhase === "late"
      ? [
          shortCoach(["Nu blir det tungt.", "Håll ihop tekniken."]),
          shortCoach(["Rätt tungt nu.", "Avsluta rent."]),
        ]
      : [
          shortCoach(["Tungt set.", "Behåll kontrollen."]),
          shortCoach(["På gränsen.", "Håll tekniken ren."]),
        ];

  return pickDifferentOption(options, lastCoachMessage);
}
if (rir === 0 && !failNote.trim()) {
  const options =
    setPhase === "early"
      ? [
          shortCoach(["Maxnära direkt.", "Jaga inte mer vikt nu."]),
          shortCoach(["Väldigt tung öppning.", "Behåll kontrollen."]),
        ]
      : setPhase === "late"
      ? [
          shortCoach(["Nu är du nära taket.", "Nästa set ska fortfarande vara rent."]),
          shortCoach(["Riktigt tungt.", "Backa lite om tekniken glider."]),
        ]
      : [
          shortCoach(["Tungt men klarat.", "Nästa set ska se lika rent ut."]),
          shortCoach(["Precis på gränsen.", "Håll ihop tekniken nu."]),
        ];

  return pickDifferentOption(options, lastCoachMessage);
}
if (failNote.trim()) {
  const fail = failNote.trim().toLowerCase();

  const trendText = trend ? ` ${trend}` : "";
  const fatigueText = fatigueSignal ? ` ${fatigueSignal}` : "";
  const workoutText = workoutFatigueSignal ? ` ${workoutFatigueSignal}` : "";

  // 🔹 GREPP
  if (fail.includes("grepp")) {
const options = [
  shortCoach(["Greppet gav upp.", "Behåll vikten nästa set."]),
  shortCoach(["Det var greppet.", "Justera greppet, inte vikten först."]),
  shortCoach(["Greppet begränsar dig.", "Samma vikt, renare set."]),
];
    return pickDifferentOption(options, lastCoachMessage);
  }

  // 🔹 TEKNIK
  if (fail.includes("teknik") || fail.includes("formen")) {
const options = [
  shortCoach(["Tekniken brast.", "Sänk lite nästa set."]),
  shortCoach(["Du tappade positionen.", "Backa och håll lyftet rent."]),
  shortCoach(["Bra att du märkte det.", "Nästa set ska se bättre ut."]),
];
    return pickDifferentOption(options, lastCoachMessage);
  }

  // 🔹 MUSKEL / ORK
  if (fail.includes("ork") || fail.includes("muskel") || fail.includes("slut")) {
const options = [
  shortCoach(["Muskeln tog slut.", "Sänk lite eller kapa reps."]),
  shortCoach(["Du nådde gränsen.", "Håll nästa set mer kontrollerat."]),
  shortCoach(["Rent stopp i muskeln.", "Justera lite nästa."]),
];
    return pickDifferentOption(options, lastCoachMessage);
  }

  // 🔹 SMÄRTA
  if (fail.includes("ont") || fail.includes("smärta")) {
const options = [
  shortCoach(["Känning där.", "Backa direkt nästa set."]),
  shortCoach(["Bra att du avbröt.", "Prioritera smärtfri rörelse nu."]),
  shortCoach(["Noterat.", "Klart lättare nästa set."]),
];
    return pickDifferentOption(options, lastCoachMessage);
  }

  // 🔹 GENERELL
const options = [
  shortCoach(["Där tog det stopp.", "Backa lite nästa set."]),
  shortCoach(["Nu nådde du taket.", "Sänk eller kapa reps."]),
  shortCoach(["Stopp där.", "Nästa set ska vara renare."]),
];

  return pickDifferentOption(options, lastCoachMessage);
}
}
type CheckInSignal = {
  dayForm: DayForm;
  coachIntro: string;
  coachChatMessage: string;
  caution: string;
};

function buildCheckInSignal(input: string): CheckInSignal | null {
  const lower = input.trim().toLowerCase();

  if (!lower) return null;

  if (
    lower.includes("rygg") ||
    lower.includes("ländrygg") ||
    lower.includes("ont") ||
    lower.includes("stel")
  ) {
    return {
      dayForm: "trött",
      coachIntro:
        "Jag tar hänsyn till att kroppen inte känns helt hundra idag. Vi öppnar kontrollerat och känner in passet.",
      coachChatMessage:
        "Noterat. Vi håller passet kontrollerat idag och prioriterar teknik från första övningen.",
      caution:
        "Extra fokus idag: lugn start, ren teknik och backa direkt om något känns fel.",
    };
  }

  if (
    lower.includes("trött") ||
    lower.includes("sliten") ||
    lower.includes("seg") ||
    lower.includes("sovit dåligt")
  ) {
    return {
      dayForm: "trött",
      coachIntro:
        "Jag hör dig. Då bygger vi passet lugnt från start och håller kvaliteten hög.",
      coachChatMessage:
        "Noterat. Vi kör smart idag och låter första arbetssetet styra hur hårt vi går vidare.",
      caution:
        "Extra fokus idag: jämn kontroll och ingen stress upp i vikt direkt.",
    };
  }

  if (
    lower.includes("stark") ||
    lower.includes("redo") ||
    lower.includes("taggad") ||
    lower.includes("pigga ben")
  ) {
    return {
      dayForm: "stark",
      coachIntro:
        "Härligt. Då kan vi vara lite mer offensiva idag, men fortfarande med kontroll från start.",
      coachChatMessage:
        "Bra. Du verkar redo idag. Vi öppnar stabilt och trycker på om första setet ser bra ut.",
      caution:
        "Extra fokus idag: håll kvalitet i första setet, sedan kan vi bygga vidare.",
    };
  }

  return {
    dayForm: "normal",
    coachIntro:
      "Noterat. Jag tar med det in i passet och vi känner av läget från första övningen.",
    coachChatMessage:
      "Jag tar med det i dagens plan. Vi börjar kontrollerat och justerar efter känslan.",
    caution:
      "Extra fokus idag: logga första setet tidigt så kan jag guida dig bättre vidare.",
  };
}

function getWorkoutComparison(history: Workout[]) {
  if (history.length < 2) {
    return {
      improved: [],
      same: [],
      worse: [],
    };
  }

  const [latest, previous] = history;

  const result: {
    improved: string[];
    same: string[];
    worse: string[];
  } = {
    improved: [],
    same: [],
    worse: [],
  };

  for (const ex of latest.exercises) {
    const prevEx = previous.exercises.find(
      (e) => exerciseKey(e.name) === exerciseKey(ex.name)
    );

    if (!prevEx) continue;
    if (ex.sets.length === 0 || prevEx.sets.length === 0) continue;

    const bestLatest = ex.sets.reduce((best, s) => {
      if (s.weight > best.weight) return s;
      if (s.weight === best.weight && s.reps > best.reps) return s;
      return best;
    }, ex.sets[0]);

    const bestPrev = prevEx.sets.reduce((best, s) => {
      if (s.weight > best.weight) return s;
      if (s.weight === best.weight && s.reps > best.reps) return s;
      return best;
    }, prevEx.sets[0]);

    if (
      bestLatest.weight > bestPrev.weight ||
      (bestLatest.weight === bestPrev.weight && bestLatest.reps > bestPrev.reps)
    ) {
      result.improved.push(ex.name);
    } else if (
      bestLatest.weight === bestPrev.weight &&
      bestLatest.reps === bestPrev.reps
    ) {
      result.same.push(ex.name);
    } else {
      result.worse.push(ex.name);
    }
  }

  return result;
}
function buildRemovedExercisesCoachNote(removedExercises: string[]) {
  if (removedExercises.length === 0) return "";

  if (removedExercises.length === 1) {
    return `Jag ser att du plockade bort ${removedExercises[0]}. Då håller vi upplägget lite renare idag.`;
  }

  if (removedExercises.length === 2) {
    return `Jag ser att du plockade bort ${removedExercises[0]} och ${removedExercises[1]}. Då håller vi passet lite mer fokuserat idag.`;
  }

  return `Jag ser att du har justerat bort några övningar. Bra — då håller vi passet tydligare och mer fokuserat idag.`;
}
function buildExerciseMemoryInsight(args: {
  coachMemory: CoachMemory;
  exerciseName: string;
}) {
  const { coachMemory, exerciseName } = args;

  const note = coachMemory.notes.find(
    (n) =>
      n.exerciseName &&
      exerciseKey(n.exerciseName) === exerciseKey(exerciseName)
  );

  if (!note) return "";

  const text = note.text.toLowerCase();

  if (text.includes("greppet")) {
    return "Jag minns att greppet begränsade dig här sist. Håll setet rent innan vi jagar mer vikt.";
  }

  if (text.includes("tekniken")) {
    return "Jag minns att tekniken brast här sist. Prioritera kvalitet i första setet.";
  }

  if (text.includes("smärta") || text.includes("känning")) {
    return "Jag minns att du kände av den här övningen sist. Var extra noga med kontroll från start.";
  }

  if (text.includes("gränsen i muskeln")) {
    return "Jag minns att du nådde gränsen ordentligt här sist. Bygg vidare, men håll setet rent.";
  }

  return "Jag minns att det blev tufft här sist. Ta första setet kontrollerat så justerar vi därifrån.";
}
export default function Home() {
  const [started, setStarted] = useState(false);
  const [workoutReview, setWorkoutReview] = useState<WorkoutReview | null>(null);
  const [latestCompletedReview, setLatestCompletedReview] =
  useState<WorkoutReview | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [gym, setGym] = useState<string>("Sjöviksgymmet");
  const [lastPass, setLastPass] = useState<PassType | null>(null);
  const [coachMemory, setCoachMemory] = useState<CoachMemory>({ notes: [] });
  const [workoutComplete, setWorkoutComplete] = useState(false);

  // “Databas”
  const [history, setHistory] = useState<Workout[]>([]);
  const [lastByExercise, setLastByExercise] = useState<LastByExercise>({});

  const [personalRecords, setPersonalRecords] = useState<PersonalRecords>({});


  // Pågående pass
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);


const [dayForm, setDayForm] = useState<DayForm | null>(null);


  // Inputs för set
  const [weightInput, setWeightInput] = useState<string>("");
  const [repsInput, setRepsInput] = useState<string>("");
const [rirInput, setRirInput] = useState<number>(2);
const [didFailInput, setDidFailInput] = useState(false);
const [failNoteInput, setFailNoteInput] = useState<string>("");


const [userProfile, setUserProfile] = useState<UserProfile | null>(null);




  const [chatInput, setChatInput] = useState("");
const [chatLog, setChatLog] = useState<{ role: "you" | "coach"; text: string }[]>([]);
const [daysPerWeekInput, setDaysPerWeekInput] = useState("3");
const [minutesPerSessionInput, setMinutesPerSessionInput] = useState("60");
const [locationInput, setLocationInput] = useState<UserProfile["location"]>("gym");
const [limitationsInput, setLimitationsInput] = useState("");
const [goalInput, setGoalInput] = useState< 
  "muskel" | "styrka" | "fett"
>("muskel");

const [editingProfile, setEditingProfile] = useState(false);

const [customExercisesByPass, setCustomExercisesByPass] =
  useState<CustomExercisesByPass>({
    A: [],
    B: [],
    C: [],
    D: [],
  });
  const [removedExercisesByPass, setRemovedExercisesByPass] =
  useState<RemovedExercisesByPass>({
    A: [],
    B: [],
    C: [],
    D: [],
  });
const [exerciseOverridesByPass, setExerciseOverridesByPass] =
  useState<ExerciseOverridesByPass>({
    A: {},
    B: {},
    C: {},
    D: {},
  });
const [swapFrom, setSwapFrom] = useState<string | null>(null);
const [swapToInput, setSwapToInput] = useState("");

const [customExerciseInput, setCustomExerciseInput] = useState("");
const [checkInInput, setCheckInInput] = useState("");
const [checkInCoachReply, setCheckInCoachReply] = useState("")
const [activeCheckInSignal, setActiveCheckInSignal] =
  useState<CheckInSignal | null>(null);

// eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {

    const savedLastPass = localStorage.getItem("lastPass") as PassType | null;
    const savedGym = localStorage.getItem("lastGym");
if (
  savedLastPass === "A" ||
  savedLastPass === "B" ||
  savedLastPass === "C" ||
  savedLastPass === "D"
) {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setLastPass(savedLastPass);
}
    
    if (savedGym) setGym(savedGym);

    setHistory(loadJSON<Workout[]>("workoutHistory", []));
    setLastByExercise(loadJSON<LastByExercise>("lastByExercise", {}));
    setCoachMemory(loadJSON<CoachMemory>("coachMemory", { notes: [] }));
    setPersonalRecords(loadJSON<PersonalRecords>("personalRecords", {}));
    const savedProfile = loadJSON<UserProfile | null>("userProfile", null);
if (savedProfile) setUserProfile(savedProfile);
setCustomExercisesByPass(
  loadJSON<CustomExercisesByPass>("customExercisesByPass", {
    A: [],
    B: [],
    C: [],
    D: [],
  })
);

setExerciseOverridesByPass(
  loadJSON<ExerciseOverridesByPass>("exerciseOverridesByPass", {
    A: {},
    B: {},
    C: {},
    D: {},
  })
);


  }, []);
  // ⭐ FYLL FORMULÄR FRÅN PROFIL
  // eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => {
  if (!userProfile) return;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  setDaysPerWeekInput(String(userProfile.daysPerWeek));
  setMinutesPerSessionInput(String(userProfile.minutesPerSession));
  setLocationInput(userProfile.location);
  setLimitationsInput(userProfile.limitations);
}, [userProfile]);


  const nextPass = useMemo(() => {
  const days = userProfile?.daysPerWeek ?? 3;
  return getNextPass(lastPass, days);
}, [lastPass, userProfile]);
const nextPassDefinition = useMemo(() => {
  if (!userProfile) return null;

return buildPassDefinition({
  profile: userProfile,
  pass: nextPass,
  customExercises: customExercisesByPass[nextPass] ?? [],
  overrides: exerciseOverridesByPass[nextPass] ?? {},
  removedExercises: removedExercisesByPass[nextPass] ?? [],
});
}, [
  userProfile,
  nextPass,
  customExercisesByPass,
  exerciseOverridesByPass,
  removedExercisesByPass,
]);
const workoutPlan = useMemo(() => {
  if (!userProfile) return null;

return buildDefaultWorkoutPlan({
  profile: userProfile,
  customExercisesByPass,
  exerciseOverridesByPass,
  removedExercisesByPass,
});
}, [userProfile, customExercisesByPass, exerciseOverridesByPass]);

const nextPlannedPass: WorkoutPass | null =
  workoutPlan?.passes.find((pass: WorkoutPass) => pass.key === nextPass) ?? null;

const plan: string[] =
  nextPlannedPass?.exercises.map((exercise: PlannedExercise) => exercise.name) ?? [];

  const removedExercisesForNextPass = removedExercisesByPass[nextPass] ?? [];

const activePlan = workout ? workout.exercises.map((e) => e.name) : plan;

const currentPassLabel =
  workout?.displayName ?? nextPlannedPass?.displayName ?? "";

const nextPassLabel = nextPlannedPass?.displayName ?? `Pass ${nextPass}`;

const lastPassLabel =
  userProfile && lastPass
    ? getDefaultPassDisplayName(userProfile, lastPass)
    : lastPass
    ? `Pass ${lastPass}`
    : "";

const currentExerciseName = activePlan[exerciseIndex] ?? "";

const goalTargets = useMemo(() => {
  return getGoalTargets(userProfile?.goalPrimary ?? "muskel");
}, [userProfile]);

const progression = useMemo(() => {
  if (!currentExerciseName) return [];

  return getExerciseProgression(history, currentExerciseName);
}, [history, currentExerciseName]);
const stagnationInsight = useMemo(() => {
  if (!currentExerciseName) return "";

  return getStagnationInsight(history, currentExerciseName);
}, [history, currentExerciseName]);

const fatigueInsight = useMemo(() => {
  if (!currentExerciseName) return "";

  return getFatigueInsight(history, currentExerciseName);
}, [history, currentExerciseName]);

const deloadInsight = useMemo(() => {
  if (!currentExerciseName) return "";

  return getDeloadInsight(history, currentExerciseName);
}, [history, currentExerciseName]);



const weeklyStats = useMemo(() => {
  const now = new Date();

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1; // måndag som start
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const workoutsThisWeek = history.filter((w) => {
    const started = new Date(w.startedAt);
    return started >= startOfWeek;
  });

  const passCount = workoutsThisWeek.length;

  const totalMinutes = workoutsThisWeek.reduce((sum, w) => {
    return sum + (w.summary?.durationMinutes ?? 0);
  }, 0);

  const totalSets = workoutsThisWeek.reduce((sum, w) => {
    return sum + (w.summary?.totalSets ?? 0);
  }, 0);

  return {
    passCount,
    totalMinutes,
    totalSets,
  };
}, [history]);
 

const suggestion = useMemo(() => {
  const last = lastByExercise[exerciseKey(currentExerciseName)];
  if (!last) {
    return {
      weight: "",
      reps: String(goalTargets.targetReps),
    };
  }

  const lastWorkoutWithExercise = history.find((w) =>
    w.exercises.some((e) => e.name === currentExerciseName)
  );

  let suggestedWeight = last.weight;

  if (lastWorkoutWithExercise) {
    const ex = lastWorkoutWithExercise.exercises.find(
      (e) => e.name === currentExerciseName
    );

    if (ex && ex.sets.length >= goalTargets.targetSets) {
      const firstTargetSets = ex.sets.slice(0, goalTargets.targetSets);

      const allSetsPassed = firstTargetSets.every(
        (s) => s.reps >= goalTargets.targetReps
      );

      if (allSetsPassed) {
        suggestedWeight = last.weight + PROGRESSION_STEP;
      }
    }
  }

  return {
    weight: String(suggestedWeight),
    reps: String(goalTargets.targetReps),
  };
}, [currentExerciseName, lastByExercise, history, goalTargets]);

const adjustedSuggestion = useMemo(() => {
  const baseWeight = Number(suggestion.weight);
  if (!Number.isFinite(baseWeight) || baseWeight <= 0) {
    return suggestion; // inget att justera
  }

  let delta = 0;
  if (dayForm === "trött") delta = -PROGRESSION_STEP;
  if (dayForm === "stark") delta = PROGRESSION_STEP;

  return {
    weight: String(Math.max(0, baseWeight + delta)),
    reps: suggestion.reps,
  };
}, [suggestion, dayForm]);

const latestCoachNoteForExercise = useMemo(() => {
  if (!currentExerciseName) return "";
  const found = coachMemory.notes.find(
   (n) => n.exerciseName && exerciseKey(n.exerciseName) === exerciseKey(currentExerciseName)

  );
  return found?.text ?? "";
}, [coachMemory, currentExerciseName]);


function getProgressionSuggestion(
  last: {
    weight: number;
    reps: number;
    rir: number | null;
  } | undefined,
  targetReps: number
) {
  if (!last) {
    return {
      targetWeight: 40,
      reason: "Ingen historik än. Börja kontrollerat och bygg därifrån.",
    };
  }

  if (last.rir === 0) {
    return {
      targetWeight: Math.max(0, last.weight - 2.5),
      reason: "Senast nådde du failure. Börja lite lättare eller håll igen.",
    };
  }

    if (typeof last.rir === "number" && last.rir >= 3 && last.reps >= targetReps) {
    return {
      targetWeight: last.weight + PROGRESSION_STEP,
      reason: "Senast såg det kontrollerat ut. Du kan testa att höja.",
    };
  }

    if ((last.rir === 1 || last.rir === 2) && last.reps >= targetReps) {
    return {
      targetWeight: last.weight,
      reason: "Senast var ansträngningen bra. Håll vikten och bygg stabilitet.",
    };
  }

  return {
    targetWeight: last.weight,
    reason: "Utgå från samma vikt som senast och justera efter känslan.",
  };
}



 const coachData = useMemo(() => {
  if (!workout) return null;

  const last = lastByExercise[exerciseKey(currentExerciseName)];

    const progression = getProgressionSuggestion(last, goalTargets.targetReps);

  const targetWeight =
    adjustedSuggestion.weight && adjustedSuggestion.weight !== ""
      ? adjustedSuggestion.weight
      : String(progression.targetWeight);

const removedExercisesNote = buildRemovedExercisesCoachNote(
  removedExercisesForNextPass
);

const introBase = activeCheckInSignal?.coachIntro
  ? `${getWorkoutIntro(dayForm, workout.displayName)} ${activeCheckInSignal.coachIntro}`
  : getWorkoutIntro(dayForm, workout.displayName);

const intro = removedExercisesNote
  ? `${introBase} ${removedExercisesNote}`
  : introBase;

  const lastText = last
    ? `${last.weight} kg × ${last.reps}`
    : "ingen data än";

const stagnation = getStagnationInsight(history, currentExerciseName);
const fatigue = getFatigueInsight(history, currentExerciseName);
const memoryInsight = buildExerciseMemoryInsight({
  coachMemory,
  exerciseName: currentExerciseName,
});

let insight = activeCheckInSignal?.caution ?? "";
if (!insight && memoryInsight) insight = memoryInsight;
else if (!insight && fatigue) insight = fatigue;
else if (!insight && stagnation) insight = stagnation;

  return {
    intro,
    pass: workout.pass,
    gym: workout.gym,
    exercise: currentExerciseName,
    lastText,
    plan: progression.reason,
       target: `${targetWeight} kg × ${goalTargets.targetReps} i ${goalTargets.targetSets} set`,
    insight,
  };
}, [
  workout,
  lastByExercise,
  currentExerciseName,
  adjustedSuggestion.weight,
  dayForm,
  history,
  removedExercisesForNextPass,
  goalTargets,
  activeCheckInSignal,
  coachMemory,
]);

// När du byter övning: fyll i senaste vikt/reps om det finns
useEffect(() => {
  if (!started) return;
  if (!currentExerciseName) return;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  setWeightInput((prev) => (prev.trim() === "" ? adjustedSuggestion.weight : prev));
  setRepsInput((prev) => (prev.trim() === "" ? adjustedSuggestion.reps : prev));
}, [currentExerciseName, started, adjustedSuggestion.weight, adjustedSuggestion.reps]);


function startWorkout() {
  if (!nextPlannedPass || !workoutPlan) return;
  const checkInSignal = buildCheckInSignal(checkInInput);

  const startedAt = new Date();
const w: Workout = {
  id: crypto.randomUUID(),
  startedAt: startedAt.toISOString(),
  gym,
  pass: nextPass,
  displayName: nextPlannedPass?.displayName ?? `Pass ${nextPass}`,
  planTitle: workoutPlan?.title,
  exercises: plan.map((name: string) => ({ name, sets: [] })),
};

    setWorkout(w);
    setExerciseIndex(0);
    setStarted(true);
    setChatInput("");
    setDayForm(checkInSignal?.dayForm ?? "normal");
    setActiveCheckInSignal(checkInSignal);
    setNow(startedAt);
const firstExerciseName = plan[0] ?? "";

const startMessages: { role: "coach" | "you"; text: string }[] = [];

if (checkInSignal) {
  startMessages.push({
    role: "coach",
    text: checkInSignal.coachChatMessage,
  });
}

setChatLog(startMessages);
localStorage.setItem("lastGym", gym);

// Fyll direkt första övningens förslag
setWeightInput(adjustedSuggestion.weight);
setRepsInput(adjustedSuggestion.reps);
    setCheckInCoachReply("");
    setCheckInInput("");
    setDidFailInput(false);
  }
function shouldHoldYouToPlan(opts: {
  dayForm: DayForm | null;
  lastHadTargets: boolean;
}) {
  if (opts.dayForm === "stark") return true;
  if (opts.dayForm === "trött") return false;
  if (opts.lastHadTargets) return true;
  return false;
  }
  function pickOne(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function coachPushbackText() {
  return pickOne([
    "Jag hör dig 😈 Men vi ska inte ge efter direkt.",
    "Okej… men jag är inte övertygad än. 😏",
    "Jag fattar. Men vi ska vara smarta, inte fega. 💪",
    "Noterat. Men vi behöver bevis från set 1. 👀",
  ]);
}

function coachDealText() {
  return pickOne([
    "Deal? Kör set 1 först så tar vi beslut efter. 🤝",
    "Vi kör ett test-set. Sen justerar vi. Deal? ✅",
    "Ge mig ett set så kan jag coacha på riktigt. 💬",
  ]);
}

function sendChat() {
  const msg = chatInput.trim();
  if (!msg) return;

  // Lägg in ditt meddelande
  setChatLog((prev) => [...prev, { role: "you", text: msg }]);
  setChatInput("");

  const lower = msg.toLowerCase();
const hasAnyLoggedSet = workout?.exercises?.some((ex) => ex.sets.length > 0) ?? false;
// ⭐ Byte av övning via chat (enkel version)
const wantsSwap =
  lower.includes("byt") ||
  lower.includes("ersätt") ||
  lower.includes("vill inte") ||
  lower.includes("orkar inte") ||
  lower.includes("hatar");

if (wantsSwap) {
  // ⭐ Direktkommando: "byt X till Y"
const toIdx = lower.indexOf(" till ");
if ((lower.startsWith("byt ") || lower.startsWith("byt ut ")) && toIdx !== -1) {
  const fromStart = lower.startsWith("byt ut ") ? 7 : 4; // "byt ut " = 7, "byt " = 4
  const fromPart = msg.slice(fromStart, toIdx).trim();
  const toPart = msg.slice(toIdx + 5).trim();  // efter " till "

  // hitta match i plan (fuzzy: innehåller)
const foundFrom = plan.find(
  (ex: string) =>
    exerciseKey(ex).includes(exerciseKey(fromPart)) ||
    exerciseKey(fromPart).includes(exerciseKey(ex))
);

  if (foundFrom && toPart) {
    setExerciseOverride(nextPass, foundFrom, toPart);

    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: `Klart. Jag byter ${foundFrom} → ${toPart} i Pass ${nextPass}. ✅`,
      },
    ]);
    return;
  }
}

  // försök hitta vilken övning i dagens plan som nämns
 const found = plan.find((ex: string) => lower.includes(exerciseKey(ex)));

  if (found) {
    const suggestion = suggestReplacementFor(found);

    // öppna swap-panelen + föreslå text
    setSwapFrom(found);
    setSwapToInput(suggestion);

    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: `Okej. Jag byter ut ${found}. Skriv vad du vill köra istället (förslag: "${suggestion}").`,
      },
    ]);
    return;
  }

  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: "Okej — vilken övning vill du byta ut? Skriv namnet så fixar jag det.",
    },
  ]);
  return;
}


 // Enkel coach-logik (med pushback 😈)
if (
  lower.includes("tung") ||
  lower.includes("trött") ||
  lower.includes("sov")
) {
  // GUARD: om inget set är loggat än → coachen kräver bevis först
  if (!hasAnyLoggedSet) {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: `${coachPushbackText()} ${coachDealText()}`,
      },
    ]);
    return;
  }

  const last = lastByExercise[exerciseKey(currentExerciseName)];
    const lastHadTargets = didHitTargets(last, goalTargets.targetReps);

  const hold = shouldHoldYouToPlan({
    dayForm,
    lastHadTargets,
  });

  if (hold) {
    setDayForm("normal");
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text:
          `${coachPushbackText()} ` +
          "Men du klarade målet sist – vi testar samma vikt i set 1. " +
          "Känns det tungt efter set 1 så sänker vi 2.5 kg. Deal? 🤝",
      },
    ]);
    return;
  }

  // annars: acceptera att det känns tungt → sänk förslag
  setDayForm("trött");
  setWeightInput((prev) => (prev.trim() === "" ? adjustedSuggestion.weight : prev));
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: "Okej. Vi kör smart idag. Jag sänker förslaget 2.5 kg ✅",
    },
  ]);
  return;
}
if (
    lower.includes("stark") ||
    lower.includes("lätt") ||
    lower.includes("bra")
  ) {
    if (!hasAnyLoggedSet) {
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text:
        "Härligt. Kör ett första set och logga det så kan jag säga exakt om vi ska höja vikten. 🔥",
    },
  ]);
  return;
}
    setDayForm("stark");
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: "Härligt! Vi trycker på lite idag. Jag höjer vikten 2.5 kg ✅",
      },
    ]);
    return;
  }

  setDayForm("normal");
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: "Fattar. Vi kör normal plan idag ✅",
    },
  ]);
}

function addCustomExercise(pass: PassType, nameRaw: string) {
  const name = nameRaw.trim();
  if (!name) return;

  setCustomExercisesByPass((prev) => {
    const next: CustomExercisesByPass = {
      ...prev,
      [pass]: [...(prev[pass] ?? []), name],
    };

    // dedupe (tar bort dubbletter)
    next[pass] = mergePlan([], next[pass]);

    saveJSON("customExercisesByPass", next);
    return next;
  });
}


function removeCustomExercise(pass: PassType, nameToRemove: string) {
  const keyToRemove = exerciseKey(nameToRemove);

  setCustomExercisesByPass((prev) => {
    const next: CustomExercisesByPass = {
      ...prev,
      [pass]: (prev[pass] ?? []).filter((n) => exerciseKey(n) !== keyToRemove),
    };

    saveJSON("customExercisesByPass", next);
    return next;
  });
}
function removePlannedExercise(nameToRemove: string) {
  const keyToRemove = exerciseKey(nameToRemove);

  setRemovedExercisesByPass((prev) => {
    const alreadyRemoved = prev[nextPass] ?? [];

    if (alreadyRemoved.some((name) => exerciseKey(name) === keyToRemove)) {
      return prev;
    }

    const next: RemovedExercisesByPass = {
      ...prev,
      [nextPass]: [...alreadyRemoved, nameToRemove],
    };

    saveJSON("removedExercisesByPass", next);
    return next;
  });

  setCustomExercisesByPass((prev) => {
    const next: CustomExercisesByPass = {
      ...prev,
      [nextPass]: (prev[nextPass] ?? []).filter(
        (name) => exerciseKey(name) !== keyToRemove
      ),
    };

    saveJSON("customExercisesByPass", next);
    return next;
  });

  setWorkout((w) => {
    if (!w || w.pass !== nextPass) return w;

    return {
      ...w,
      exercises: w.exercises.filter(
        (exercise) => exerciseKey(exercise.name) !== keyToRemove
      ),
    };
  });
}
function setExerciseOverride(pass: PassType, fromName: string, toNameRaw: string) {
  const toName = toNameRaw.trim();
  if (!toName) return;

  const fromKey = exerciseKey(fromName);

  setExerciseOverridesByPass((prev) => {
    const next: ExerciseOverridesByPass = {
      ...prev,
      [pass]: {
        ...(prev[pass] ?? {}),
        [fromKey]: toName,
      },
    };

    saveJSON("exerciseOverridesByPass", next);
    return next;
  });
// ⭐ Om passet redan pågår: uppdatera workout.exercises också
setWorkout((w) => {
  if (!w) return w;
  if (w.pass !== pass) return w;

  const updated = structuredClone(w);

  updated.exercises = updated.exercises.map((ex) => {
    if (exerciseKey(ex.name) !== fromKey) return ex;
    return { ...ex, name: toName };
  });

  return updated;
});
}
function suggestReplacementFor(exName: string): string {
  const key = exerciseKey(exName);

  if (key.includes("marklyft")) return "Hip thrust";
  if (key.includes("knäböj")) return "Benpress";
  if (key.includes("bänkpress")) return "Hantelpress";
  if (key.includes("militärpress")) return "Hantelpress (axlar)";
  if (key.includes("latsdrag")) return "Chins (assisterade)";

  return "Valfri maskin-variant";
}


function clearExerciseOverride(pass: PassType, fromName: string) {
  const fromKey = exerciseKey(fromName);

  setExerciseOverridesByPass((prev) => {
    const copy = { ...(prev[pass] ?? {}) };
    delete copy[fromKey];

    const next: ExerciseOverridesByPass = {
      ...prev,
      [pass]: copy,
    };

    saveJSON("exerciseOverridesByPass", next);
    return next;
  });
}

function getNextSetWeight(args: {
  weight: number;
  rir: number;
  failNote?: string;
}) {
  const { weight, rir, failNote } = args;
  const fail = failNote?.trim().toLowerCase() ?? "";

  if (fail) {
    if (fail.includes("grepp")) {
      return weight; // kroppen hade mer, behåll vikten
    }

    if (fail.includes("teknik") || fail.includes("formen")) {
      return Math.max(0, weight - PROGRESSION_STEP);
    }

    if (fail.includes("ont") || fail.includes("smärta")) {
      return Math.max(0, weight - PROGRESSION_STEP * 2);
    }

    if (
      fail.includes("ork") ||
      fail.includes("muskel") ||
      fail.includes("slut")
    ) {
      return Math.max(0, weight - PROGRESSION_STEP);
    }

    return Math.max(0, weight - PROGRESSION_STEP);
  }

  if (rir === 0) return Math.max(0, weight - PROGRESSION_STEP);
  if (rir === 1 || rir === 2) return weight;
  return weight + PROGRESSION_STEP;
}

function isNewPR(
  existingPR:
    | {
        exerciseName: string;
        weight: number;
        reps: number;
        createdAt: string;
      }
    | undefined,
  attempt: { weight: number; reps: number }
) {
  if (!existingPR) return true;

  if (attempt.weight > existingPR.weight) return true;

  if (attempt.weight === existingPR.weight && attempt.reps > existingPR.reps) {
    return true;
  }

  return false;
}

  function addSet() {
    if (!workout) return;

    const weight = Number(weightInput);
    const reps = Number(repsInput);
    const exerciseName = currentExerciseName;
    const prKey = exerciseKey(exerciseName);

    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) {
      alert("Fyll i vikt och reps (t.ex. 80 och 5).");
      return;
    }

const set: LoggedSet = {
  weight,
  reps,
  rir: typeof rirInput === "number" ? Number(rirInput) : undefined,
  failNote: didFailInput ? failNoteInput.trim() || "failure" : undefined,
  createdAt: new Date().toISOString(),
};


    const updated = structuredClone(workout);
    updated.exercises[exerciseIndex].sets.push(set);
    setWorkout(updated);
   const suggestedNextWeight = getNextSetWeight({
  weight,
  rir: rirInput,
  failNote: didFailInput ? failNoteInput : "",
});


    setFailNoteInput("");
    setRirInput(2);
    setDidFailInput(false);
 // ✅ Coach-reaktion + auto-förslag för nästa set (RIR)
const step = PROGRESSION_STEP;


    // Spara “senaste per övning” direkt när du loggar
const newLastByExercise: LastByExercise = {
  ...lastByExercise,
[exerciseKey(currentExerciseName)]: {
  weight,
  reps,
  rir: rirInput ?? null,
  failNote: didFailInput ? failNoteInput.trim() || "failure" : null,
  updatedAt: new Date().toISOString(),
},
};

    setLastByExercise(newLastByExercise);
    saveJSON("lastByExercise", newLastByExercise);
    const existingPR = personalRecords[prKey];
    const lastCoachMessage =
  [...chatLog].reverse().find((m) => m.role === "coach")?.text || "";

const coachMessage = buildCoachMessage({
  weight,
  reps,
  rir: rirInput,
  failNote: failNoteInput,
  exerciseName: currentExerciseName,
  setNumber: updated.exercises[exerciseIndex].sets.length,
  nextWeight: suggestedNextWeight,
  lastCoachMessage,
  previousSets: updated.exercises[exerciseIndex].sets.slice(0, -1),
  completedExercises: updated.exercises.slice(0, exerciseIndex + 1),
  goalPrimary: userProfile?.goalPrimary ?? "styrka",
});

if (coachMessage) {
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: coachMessage,
    },
  ]);
}
if (isNewPR(existingPR, { weight, reps })) {
 setChatLog((prev) => {
  const prText = `Snyggt också — det där är ett nytt PR i ${currentExerciseName}: ${weight} kg × ${reps}.`;
  const lastMessage = prev[prev.length - 1];

  if (lastMessage?.role === "coach") {
    if (lastMessage.text.includes(prText)) {
      return prev;
    }

    return [
      ...prev.slice(0, -1),
      {
        ...lastMessage,
        text: `${lastMessage.text} ${prText}`,
      },
    ];
  }

  return [
    ...prev,
    {
      role: "coach",
      text: prText,
    },
  ];
});
}


if (isNewPR(existingPR, { weight, reps })) {
  const newPR: PersonalRecord = {
    exerciseName,
    weight,
    reps,
    createdAt: new Date().toISOString(),
  };

  const newPRs: PersonalRecords = {
    ...personalRecords,
    [prKey]: newPR,
  };

  setPersonalRecords(newPRs);
  saveJSON("personalRecords", newPRs);


}

    // För nästa set behåll vikt, men nolla reps (valfritt)
setRepsInput(String(reps));
setWeightInput(String(suggestedNextWeight));

  }

  function removeLastSet() {
    if (!workout) return;
    const updated = structuredClone(workout);
    const sets = updated.exercises[exerciseIndex].sets;
    if (sets.length === 0) return;
    sets.pop();
    setWorkout(updated);
  }

  function nextExercise() {
 if (exerciseIndex < activePlan.length - 1) {
    setExerciseIndex(exerciseIndex + 1);
    setWeightInput("");
    setRepsInput("");
    setFailNoteInput("");
    setRirInput(2);
    setDidFailInput(false);

  }
}


  function prevExercise() {
    if (exerciseIndex > 0) {
      setExerciseIndex(exerciseIndex - 1);
      setWeightInput("");
      setRepsInput("");
      setFailNoteInput("");
      setRirInput(2);
      setDidFailInput(false);

    }
  }

function makeCoachNotesFromWorkout(w: Workout): CoachNote[] {
  const notes: CoachNote[] = [];

  const base = {
    createdAt: new Date().toISOString(),
    pass: w.pass,
    gym: w.gym,
  };

  // 1) Dagsform som en generell note
  if (dayForm === "trött") {
    notes.push({ ...base, text: "Du var trött idag → vi körde lite lättare." });
  }
  if (dayForm === "stark") {
    notes.push({ ...base, text: "Du kände dig stark idag → vi tryckte på lite." });
  }

  // 2) En note per övning
for (const ex of w.exercises) {
  const totalSets = ex.sets.length;

  const failedSets = ex.sets.filter((s) => Boolean(s.failNote?.trim()));

  if (failedSets.length > 0) {
    const reasons = failedSets
      .map((s) => (s.failNote ? s.failNote.trim().toLowerCase() : "stopp"))
      .join(", ");

    let memoryText = `${ex.name}: där tog det stopp senast.`;

    if (reasons.includes("grepp")) {
      memoryText = `${ex.name}: senast var det greppet som gav upp.`;
    } else if (reasons.includes("teknik") || reasons.includes("formen")) {
      memoryText = `${ex.name}: senast var det tekniken som brast.`;
    } else if (reasons.includes("ont") || reasons.includes("smärta")) {
      memoryText = `${ex.name}: senast avbröt du på grund av känning eller smärta.`;
    } else if (
      reasons.includes("ork") ||
      reasons.includes("muskel") ||
      reasons.includes("slut")
    ) {
      memoryText = `${ex.name}: senast nådde du gränsen i muskeln där.`;
    }

    notes.push({
      ...base,
      exerciseName: ex.name,
      text: memoryText,
    });
  } else if (totalSets === 0) {
    notes.push({
      ...base,
      exerciseName: ex.name,
      text: `${ex.name}: inga set loggade.`,
    });
  } else {
    notes.push({
      ...base,
      exerciseName: ex.name,
      text: `${ex.name}: ${totalSets} set loggade.`,
    });
  }
}


  if (notes.length === 0) {
    notes.push({ ...base, text: "Bra jobbat. Vi fortsätter enligt plan nästa gång." });
  }

  return notes;
}
function buildWorkoutReview(args: {
  workout: Workout;
  summary: WorkoutSummary;
  progression: {
    improved: string[];
    same: string[];
    worse: string[];
  };
}): WorkoutReview {
  const { workout, summary, progression } = args;
  const coachMemoryTakeaway: string[] = [];

  const allSets = workout.exercises.flatMap((ex) => ex.sets);
  const failedSets = allSets.filter((set) => set.rir === 0);
  const hardSets = allSets.filter((set) => set.rir === 0 || set.rir === 1);

  const positives: string[] = [];
  const adjustments: string[] = [];
  const nextFocus: string[] = [];

  if (summary.totalSets > 0) {
    positives.push(`Du fick in ${summary.totalSets} set i passet.`);
  }

  if (summary.bestSetText && summary.bestSetText !== "Inget set loggat.") {
    positives.push(`Bästa set idag var ${summary.bestSetText}.`);
  }

  if (failedSets.length === 0) {
    positives.push("Du höll passet kontrollerat utan att köra in i stopp.");
  } else {
    adjustments.push(
      `Du hade ${failedSets.length} set som gick till failure. Håll extra koll på teknik när det blir tungt.`
    );
  }

  if (hardSets.length >= 3) {
    adjustments.push(
      "Det blev flera tunga set idag. Se till att nästa pass startar kontrollerat."
    );
  }

  if (summary.totalSets === 0) {
    adjustments.push(
      "Det blev inga loggade set idag, så nästa pass behöver vi få tydligare data."
    );
  }

  const lastExercise = workout.exercises[workout.exercises.length - 1];
  if (lastExercise && lastExercise.sets.length > 0) {
    nextFocus.push(
      `Bygg vidare från ${lastExercise.name} med samma kontroll nästa gång.`
    );
  } else {
    nextFocus.push(
      "Nästa gång vill jag att du loggar första arbetssetet tidigt så vi får bättre guidning."
    );
  }

  nextFocus.push("Fortsätt prioritera ren teknik före att jaga vikt för tidigt.");

  if (positives.length === 0) {
    positives.push(
      "Bra att du tog dig igenom passet och gav oss ny data att bygga vidare på."
    );
  }

  if (adjustments.length === 0) {
    adjustments.push("Inget stort att justera just nu. Fortsätt i samma linje.");
  }
if (progression.improved.length > 0) {
  coachMemoryTakeaway.push(
    `Du tog steg framåt i ${progression.improved.join(", ")}. Det bygger vi vidare på nästa pass.`
  );
}

if (progression.worse.length > 0) {
  coachMemoryTakeaway.push(
    `Vi tappade lite i ${progression.worse.join(", ")}. Där vill jag ha extra kontroll nästa gång.`
  );
}

const exercisesWithFailure = workout.exercises
  .filter((ex) => ex.sets.some((set) => Boolean(set.failNote?.trim())))
  .map((ex) => ex.name);

if (exercisesWithFailure.length > 0) {
  coachMemoryTakeaway.push(
    `Jag tar med mig att det tog stopp i ${exercisesWithFailure.join(", ")}. Vi justerar det smart nästa gång.`
  );
}

if (coachMemoryTakeaway.length === 0) {
  coachMemoryTakeaway.push(
    "Inget stort att korrigera just nu. Vi bygger vidare i samma linje nästa gång."
  );
}
return {
  passLabel: workout.displayName,
  durationMinutes: summary.durationMinutes,
  totalSets: summary.totalSets,
  exerciseCount: summary.exerciseCount,
  bestSetText: summary.bestSetText,
  coachSummary: summary.coachSummary,
  positives,
  adjustments,
  nextFocus,
  progression,
  coachMemoryTakeaway,
};
}

function buildWorkoutSummary(w: Workout) {
  const allSets = w.exercises.flatMap((ex) => ex.sets);

  const totalSets = allSets.length;
  const exerciseCount = w.exercises.length;

  const startedAtMs = new Date(w.startedAt).getTime();
  const finishedAtMs = Date.now();
  const durationMinutes = Math.max(
    1,
    Math.round((finishedAtMs - startedAtMs) / 1000 / 60)
  );

  let bestSetText = "Inget set loggat.";
  if (allSets.length > 0) {
    const bestSet = allSets.reduce((best, current) => {
      if (current.weight > best.weight) return current;
      if (current.weight === best.weight && current.reps > best.reps) {
        return current;
      }
      return best;
    });

    bestSetText = `${bestSet.weight} kg × ${bestSet.reps}`;
  }

  let coachSummary = "Stabilt pass. Fortsätt enligt plan nästa gång.";
  if (dayForm === "stark") {
    coachSummary = "Du såg stark ut idag. Bra läge att bygga vidare på nästa pass.";
  } else if (dayForm === "trött") {
    coachSummary =
      "Du tog dig igenom passet smart trots trött känsla. Bra disciplin.";
  }

  const summary = {
    durationMinutes,
    totalSets,
    exerciseCount,
    bestSetText,
    coachSummary,
  };

  const alertText = [
    `Pass ${w.pass} sparat ✅`,
    `Tid: ${durationMinutes} min`,
    `Övningar: ${exerciseCount}`,
    `Totala set: ${totalSets}`,
    `Bästa set: ${bestSetText}`,
    coachSummary,
  ].join("\n");

  return { summary, alertText };
}

  function finishWorkout() {
    if (!workout) return;

    const { summary, alertText } = buildWorkoutSummary(workout);

    const workoutWithSummary: Workout = {
  ...workout,
  summary,
};


    const newHistory = [workoutWithSummary, ...history].slice(0, 50); // spara senaste 50 pass
    const progressionComparison = getWorkoutComparison(newHistory);
    setHistory(newHistory);
    saveJSON("workoutHistory", newHistory);
// ⭐ COACH MEMORY: spara en kort sammanfattning (per övning)
const freshNotes = makeCoachNotesFromWorkout(workout);

const newNotes: CoachNote[] = [...freshNotes, ...coachMemory.notes].slice(0, 50);

const nextMemory: CoachMemory = { notes: newNotes };
setCoachMemory(nextMemory);
saveJSON("coachMemory", nextMemory);



    localStorage.setItem("lastPass", workout.pass);
    setLastPass(workout.pass);

const review = buildWorkoutReview({
  workout: workoutWithSummary,
  summary,
  progression: progressionComparison,
});

setWorkoutReview(review);
setLatestCompletedReview(review);
setWorkoutComplete(false);
setWorkout(null);
setStarted(false);
finishWorkout
  }

  function resetAll() {
    localStorage.removeItem("lastPass");
    localStorage.removeItem("lastGym");
    localStorage.removeItem("workoutHistory");
    localStorage.removeItem("lastByExercise");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("coachMemory");
    localStorage.removeItem("customExercisesByPass");
    localStorage.removeItem("removedExercisesByPass");
    localStorage.removeItem("exerciseOverridesByPass");
    localStorage.removeItem("personalRecords");

    setLastPass(null);
    setGym("Sjöviksgymmet");
    setHistory([]);
    setLastByExercise({});
    setCheckInInput("");
    setCheckInCoachReply("");
    setActiveCheckInSignal(null);
    setUserProfile(null);
    setWorkout(null);
    setStarted(false);
    alert("Allt återställt ✅");
    setCoachMemory({ notes: [] });
  setCustomExercisesByPass({ A: [], B: [], C: [], D: [] });
  setRemovedExercisesByPass({ A: [], B: [], C: [], D: [] }); 
  setExerciseOverridesByPass({ A: {}, B: {}, C: {}, D: {} });
    setPersonalRecords({});
  }

if (!userProfile || editingProfile) {
  return (
    <SetupScreen
      daysPerWeekInput={daysPerWeekInput}
      setDaysPerWeekInput={setDaysPerWeekInput}
      minutesPerSessionInput={minutesPerSessionInput}
      setMinutesPerSessionInput={setMinutesPerSessionInput}
      locationInput={locationInput}
      setLocationInput={setLocationInput}
      limitationsInput={limitationsInput}
      setLimitationsInput={setLimitationsInput}
      goalInput={goalInput}
      setGoalInput={setGoalInput}
      isEditing={editingProfile}
      onSubmit={() => {
const profile = {
  goalPrimary: goalInput,
  daysPerWeek: Number(daysPerWeekInput),
  minutesPerSession: Number(minutesPerSessionInput),
  location: locationInput,
  equipment: [],
  limitations: limitationsInput,
};

        saveJSON("userProfile", profile);
        setUserProfile(profile);
        setEditingProfile(false);
      }}
    />
  );
}


return (
  <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-white">
    {workoutComplete ? (
  <WorkoutCompleteScreen
    onDone={() => {
      setWorkoutComplete(false);
      setWorkoutReview(null);
    }}
  />
) : started && workout ? (
      <WorkoutScreen
        workout={workout}
        exerciseIndex={exerciseIndex}
        activePlan={activePlan}
        passLabel={currentPassLabel}
        coachData={coachData}
        dayForm={dayForm}
        setDayForm={setDayForm}
        currentSets={workout?.exercises?.[exerciseIndex]?.sets ?? []}
        formatTime={formatTime}
        chatLog={chatLog}
        chatInput={chatInput}
        setChatInput={setChatInput}
        sendChat={sendChat}
addCoachMessage={(text) =>
  setChatLog((prev) => {
    const last = prev[prev.length - 1];

    if (last?.role === "coach" && last.text === text) {
      return prev;
    }

    return [
      ...prev,
      {
        role: "coach",
        text,
      },
    ];
  })
}
        currentExerciseName={currentExerciseName}
        lastByExercise={lastByExercise}
        exerciseKey={exerciseKey}
        weightInput={weightInput}
        setWeightInput={setWeightInput}
        repsInput={repsInput}
        setRepsInput={setRepsInput}
        rirInput={rirInput}
        setRirInput={setRirInput}
        didFailInput={didFailInput}
        setDidFailInput={setDidFailInput}
        failNoteInput={failNoteInput}
        setFailNoteInput={setFailNoteInput}
        addSet={addSet}
        removeLastSet={removeLastSet}
        prevExercise={prevExercise}
        nextExercise={nextExercise}
        finishWorkout={finishWorkout}
        personalRecords={personalRecords}
        progression={progression}
      />
      
) : workoutReview ? (
  <WorkoutReviewScreen
    review={workoutReview}
    onClose={() => {
      setWorkoutReview(null);
      setWorkoutComplete(true);
    }}
  />
) : (
      <StartScreen
        lastPass={lastPass}
        nextPass={nextPass}
        nextPassLabel={nextPassLabel}
        lastPassLabel={lastPassLabel}
        now={now}
        plan={plan}
        exerciseKey={exerciseKey}
        swapFrom={swapFrom}
        setSwapFrom={setSwapFrom}
        swapToInput={swapToInput}
        setSwapToInput={setSwapToInput}
        setExerciseOverride={setExerciseOverride}
        clearExerciseOverride={clearExerciseOverride}
        customExerciseInput={customExerciseInput}
        setCustomExerciseInput={setCustomExerciseInput}
        addCustomExercise={addCustomExercise}
        removeCustomExercise={removeCustomExercise}
        removePlannedExercise={removePlannedExercise}
        customExercisesByPass={customExercisesByPass}
        checkInInput={checkInInput}
        setCheckInInput={setCheckInInput}
        checkInCoachReply={checkInCoachReply}
        setCheckInCoachReply={setCheckInCoachReply}
        startWorkout={startWorkout}
        history={history}
        coachMemory={coachMemory}
        latestReview={latestCompletedReview}
        setEditingProfile={setEditingProfile}
        formatTime={formatTime}
        weeklyStats={weeklyStats}
        userProfile={userProfile}
        name="Anton"
      />
    )}
  </main>
);
}
