"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import StartScreen from "./components/StartScreen";
import WorkoutScreen from "./components/WorkoutScreen";
import SetupScreen from "./components/SetupScreen";
import WorkoutReviewScreen from "./components/WorkoutReviewScreen";
import WorkoutCompleteScreen from "./components/WorkoutCompleteScreen";
import LobbyScreen from "./components/LobbyScreen";
import ExerciseProgressScreen from "./components/ExerciseProgressScreen";
import StatisticsScreen from "./components/StatisticsScreen";
import HistoryScreen from "./components/HistoryScreen";
import PersonalRecordsScreen from "./components/PersonalRecordsScreen";
import ProgramReviewScreen from "./components/ProgramReviewScreen";
import ProgramBuildLoadingScreen from "./components/ProgramBuildLoadingScreen";
import SettingsScreen from "./components/SettingsScreen";
import { scheduleBetaSync, syncBetaSnapshotNow } from "./lib/betaSync";
import { syncBetaCoachMemory, syncBetaPersonalRecord } from "./lib/betaMemorySync";
import { syncStructuredBetaWorkout } from "./lib/betaWorkoutSync";
import {
  requestAiCoachChatReply,
  requestAiCoachSetReply,
  requestAiProgramBuild,
  requestAiProgramReply,
  requestAiWorkoutReview,
  type BuiltWorkoutPlan,
  type CoachProgramSuggestion,
  type CoachProgramSuggestionAction,
  type CoachSetContext,
  type CoachWorkoutReviewResult,
} from "./lib/coachAi";
import {
  KNOWN_EXERCISE_NAMES,
  getExerciseProfile,
  isBodyweightExercise,
  isTimedExercise,
  normalizeExerciseSearchText,
  resolveExerciseName,
} from "./lib/exercises";
type PassType = "A" | "B" | "C" | "D";
type AppTheme = "dark" | "light";

const PROGRAM_BUILD_MIN_MS = 4500;

function AppControls({
  theme,
  onOpenSettings,
}: {
  theme: AppTheme;
  onOpenSettings: () => void;
}) {
  const isLight = theme === "light";
  const buttonClassName = isLight
    ? "rounded-full border border-[#d8cfc0]/85 bg-white/86 px-3.5 py-2 text-[11px] font-semibold text-[#445064] shadow-[0_14px_34px_rgba(91,72,48,0.14)] backdrop-blur-2xl transition hover:bg-white"
    : "rounded-full border border-white/[0.09] bg-[#101824]/72 px-3.5 py-2 text-[11px] font-semibold text-white/68 shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:border-blue-400/16 hover:bg-[#131c27]/86 hover:text-white/84";

  return (
    <div className="fixed right-5 top-5 z-40 flex items-center gap-1.5 sm:right-7 sm:top-6">
      <button
        type="button"
        onClick={onOpenSettings}
        className={buttonClassName}
      >
        Inställningar
      </button>
    </div>
  );
}

type PassDefinition = {
  key: PassType;
  displayName: string;
  exercises: string[];
};

type DayForm = "trött" | "normal" | "stark";
type WarmupStatus = "unknown" | "skipped" | "light" | "cardio" | "ready";

type WarmupContext = {
  status: WarmupStatus;
  note: string;
  mentionedAt: string;
};

type ConditioningContext = {
  timing: "before" | "after" | "unknown";
  intensity: "light" | "hard" | "unknown";
  activity: string;
  minutes: number | null;
  note: string;
  mentionedAt: string;
};

type UserProfile = {
  name: string;
  age?: number | null;
  gender?: "kvinna" | "man" | "annat" | "vill-inte-saga";
  trainingExperience?: "nyborjare" | "van" | "erfaren";
  goalPrimary: "muskel" | "styrka" | "fett";
  goalSecondary?: ("muskel" | "styrka" | "fett")[];
  daysPerWeek: number;
  minutesPerSession: number;
  location: "gym" | "hemma";
  equipment: string[];
  exercisePreferences?: string[];
  limitations: string;
};

type PersonalRecord = {
  exerciseName: string;
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  createdAt: string;
};
type PlannedExercise = {
  name: string;
  purpose?: string;
  sets?: string;
  reps?: string;
  rir?: string;
  caution?: string;
  alternatives?: string[];
};

type WorkoutPass = {
  key: PassType;
  displayName: string;
  intent?: string;
  exercises: PlannedExercise[];
};

type WorkoutPlan = {
  title: string;
  goalPrimary: UserProfile["goalPrimary"];
  daysPerWeek: number;
  coachSummary?: string;
  planReason?: string;
  structureReason?: string;
  safetyNotes?: string[];
  source?: "ai" | "fallback" | "manual";
  builtAt?: string;
  profileSignature?: string;
  passes: WorkoutPass[];
};

type StoredWorkoutPlan = WorkoutPlan;
type PassDisplayNamesByPass = Partial<Record<PassType, string>>;

type PersonalRecords = Record<string, PersonalRecord>;


type LoggedSet = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
  failNote?: string;
  createdAt: string;
};




type LoggedExercise = {
  name: string;
  sets: LoggedSet[];
};

type SkippedExercise = {
  exercise: LoggedExercise;
  index: number;
};

type WorkoutSummary = {
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  completedExerciseCount: number;
  isPartial: boolean;
  totalVolumeKg: number;
  totalVolumeText: string;
  bestSetText: string;
  coachSummary: string;
};
type WorkoutReview = {
  passLabel: string;
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  completedExerciseCount: number;
  isPartial: boolean;
  totalVolumeKg: number;
  totalVolumeText: string;
  bestSetText: string;
  coachHeadline: string;
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

function getReviewCoachParts(review: WorkoutReview): CoachWorkoutReviewResult {
  return {
    coachHeadline: review.coachHeadline,
    coachSummary: review.coachSummary,
    positives: review.positives,
    adjustments: review.adjustments,
    nextFocus: review.nextFocus,
    coachMemoryTakeaway: review.coachMemoryTakeaway,
  };
}

function applyReviewCoachParts(
  review: WorkoutReview,
  parts: CoachWorkoutReviewResult
): WorkoutReview {
  return {
    ...review,
    coachHeadline: parts.coachHeadline,
    coachSummary: parts.coachSummary,
    positives: parts.positives,
    adjustments: parts.adjustments,
    nextFocus: parts.nextFocus,
    coachMemoryTakeaway: parts.coachMemoryTakeaway,
  };
}

type Workout = {
  id: string;
  startedAt: string;
  gym: string;
  pass: PassType;
  displayName: string;
  planTitle?: string;
  exercises: LoggedExercise[];
  warmupContext?: WarmupContext | null;
  conditioningContext?: ConditioningContext | null;
  summary?: WorkoutSummary;
};


type LastByExercise = Record<
  string,
  {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
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

function getWorkoutIntro(dayForm: DayForm | null) {
  if (dayForm === "trött") {
    return "Vi startar lugnt idag.";
  }

  if (dayForm === "stark") {
    return "Du verkar pigg idag. Första setet visar hur offensiva vi kan vara.";
  }

 const options = [
  "Första setet visar oss var vi ligger.",
  "Vi öppnar lugnt och höjer om det sitter.",
  "Första setet först. Lugnt och tydligt.",
];

return options[Math.floor(Math.random() * options.length)];
}

function buildWarmupContext(input: string): WarmupContext | null {
  const note = input.trim();
  const lower = note.toLowerCase();

  if (!note) return null;

  const mentionsWarmup =
    lower.includes("uppvärm") ||
    lower.includes("uppvarm") ||
    lower.includes("värmer") ||
    lower.includes("värma") ||
    lower.includes("värmt") ||
    lower.includes("varm") ||
    lower.includes("cykl") ||
    lower.includes("löpband") ||
    lower.includes("gångband") ||
    lower.includes("rodd") ||
    lower.includes("crosstrainer") ||
    lower.includes("lätt set") ||
    lower.includes("lätta set") ||
    lower.includes("uppvärmningsset");

  if (!mentionsWarmup) return null;

  let status: WarmupStatus = "unknown";

  if (
    lower.includes("ingen uppvärmning") ||
    lower.includes("ingen uppvarmning") ||
    lower.includes("hoppar uppvärm") ||
    lower.includes("hoppar uppvarm") ||
    lower.includes("skippar uppvärm") ||
    lower.includes("skippar uppvarm") ||
    lower.includes("utan uppvärm") ||
    lower.includes("utan uppvarm")
  ) {
    status = "skipped";
  } else if (
    lower.includes("cykl") ||
    lower.includes("löpband") ||
    lower.includes("gångband") ||
    lower.includes("rodd") ||
    lower.includes("crosstrainer")
  ) {
    status = "cardio";
  } else if (
    lower.includes("lätt set") ||
    lower.includes("lätta set") ||
    lower.includes("uppvärmningsset")
  ) {
    status = "light";
  } else if (
    lower.includes("redan varm") ||
    lower.includes("är varm") ||
    lower.includes("värmt upp") ||
    lower.includes("uppvärmd")
  ) {
    status = "ready";
  }

  return {
    status,
    note,
    mentionedAt: new Date().toISOString(),
  };
}

function getWarmupCoachReply(warmup: WarmupContext) {
  if (warmup.status === "skipped") {
    return "Okej. Då startar vi lugnt.";
  }

  if (warmup.status === "cardio") {
    return "Bra. Jag har uppvärmningen med mig.";
  }

  if (warmup.status === "light") {
    return "Bra. Jag har uppvärmningsseten med mig.";
  }

  if (warmup.status === "ready") {
    return "Bra. Då tar vi första arbetssetet.";
  }

  return "Bra. Starta passet när du är redo.";
}

function getPainCoachReply(warmup: WarmupContext | null) {
  if (!warmup || warmup.status === "unknown") {
    return "Bra att du säger till. Vi tar ingen risk här. Lämna den övningen eller byt till något som känns helt smärtfritt.";
  }

  if (warmup.status === "skipped") {
    return "Bra att du säger till. Vi stoppar den övningen här. Nästa gång värmer vi upp lättare innan första arbetssetet.";
  }

  return "Bra att du säger till. Du värmde upp, så vi chansar inte vidare. Lämna den övningen eller byt till något som känns helt smärtfritt.";
}

function getPainCoachActionText(warmup: WarmupContext | null) {
  return `${getPainCoachReply(warmup)} Tryck Hoppa över om du vill lämna den.`;
}

function getPainCoachContextText(warmup: WarmupContext | null) {
  if (!warmup || warmup.status === "unknown") {
    return "Värm upp lätt nästa gång innan första arbetssetet.";
  }

  if (warmup.status === "skipped") {
    return "Nästa gång vill jag att du värmer upp lätt först.";
  }

  return "Du värmde upp, så vi tar ingen mer risk här.";
}

function buildConditioningContext(input: string): ConditioningContext | null {
  const note = input.trim();
  const lower = note.toLowerCase();

  if (!note) return null;

  const mentionsConditioning =
    lower.includes("kondition") ||
    lower.includes("cardio") ||
    lower.includes("spring") ||
    lower.includes("sprang") ||
    lower.includes("löp") ||
    lower.includes("lop") ||
    lower.includes("cykl") ||
    lower.includes("rodd") ||
    lower.includes("gångband") ||
    lower.includes("gangband") ||
    lower.includes("intervall");

  if (!mentionsConditioning) return null;

  const minuteMatch = lower.match(/(\d+)\s*(min|minuter)/);
  const minutes = minuteMatch ? Number(minuteMatch[1]) : null;

  const timing =
    lower.includes("efter") || lower.includes("avslut")
      ? "after"
      : lower.includes("innan") ||
        lower.includes("före") ||
        lower.includes("fore") ||
        lower.includes("först") ||
        lower.includes("forst")
      ? "before"
      : "unknown";

  const activity = lower.includes("cykl")
    ? "cykel"
    : lower.includes("rodd")
    ? "rodd"
    : lower.includes("gångband") || lower.includes("gangband")
    ? "gångband"
    : lower.includes("löp") || lower.includes("lop") || lower.includes("spring")
    ? "löpning"
    : "kondition";

  const hardByWords =
    lower.includes("intervall") ||
    lower.includes("hårt") ||
    lower.includes("hart") ||
    lower.includes("snabbt") ||
    lower.includes("max");
  const intensity =
    hardByWords || (timing === "before" && minutes !== null && minutes >= 20)
      ? "hard"
      : minutes !== null && minutes <= 10
      ? "light"
      : "unknown";

  return {
    timing,
    intensity,
    activity,
    minutes,
    note,
    mentionedAt: new Date().toISOString(),
  };
}

function getConditioningCoachReply(
  conditioning: ConditioningContext,
  goalPrimary?: UserProfile["goalPrimary"]
) {
  if (conditioning.timing === "after") {
    return "Bra. Vi lägger den efter styrkan.";
  }

  if (conditioning.timing === "before" && conditioning.intensity === "light") {
    return "Bra. Håll det lugnt före första arbetssetet.";
  }

  if (conditioning.timing === "before" && conditioning.intensity === "hard") {
    if (goalPrimary === "fett") {
      return "Håll den lugn före styrkan. Vill du köra hårt lägger vi den efter.";
    }

    return "Lägg den efter styrkan idag.";
  }

  return "Bra. Jag räknar med det när vi startar.";
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
  scheduleBetaSync({ changedKey: key });
}
function saveRawValue(key: string, value: string) {
  localStorage.setItem(key, value);
  scheduleBetaSync({ changedKey: key });
}
function exerciseKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
  }

type ExerciseBestSet = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number | null;
  failNote?: string | null;
  createdAt?: string;
};

type ExerciseProgressionPlan = {
  action: "start" | "hold" | "increase" | "decrease" | "deload";
  weight: string;
  reps: string;
  repsText: string;
  rirText: string;
  note: string;
  reason: string;
};

function formatWeightInput(weight: number) {
  if (!Number.isFinite(weight)) return "";
  return Number(weight.toFixed(2)).toString();
}

function formatRepRange(min: number, max: number) {
  if (min === max) return `${min} reps`;
  return `${min}–${max} reps`;
}

function getLoggedSetScore(set: {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
}) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    return (set.durationSeconds ?? 0) * 1000 + set.weight;
  }

  return set.weight * 1000 + set.reps;
}

function getBestSetFromSets(sets: LoggedSet[]): ExerciseBestSet | null {
  if (sets.length === 0) return null;

  const best = sets.reduce((bestSet, set) => {
    if (getLoggedSetScore(set) > getLoggedSetScore(bestSet)) return set;
    return bestSet;
  });

  return {
    weight: best.weight,
    reps: best.reps,
    durationSeconds: best.durationSeconds,
    metricType: best.metricType,
    rir: best.rir ?? null,
    failNote: best.failNote ?? null,
    createdAt: best.createdAt,
  };
}

function getExerciseBestSets(
  history: Workout[],
  exerciseName: string,
  limit = 6
) {
  const key = exerciseKey(exerciseName);

  const sets: ExerciseBestSet[] = [];

  for (const w of history) {
    const ex = w.exercises.find(
      (e) => exerciseKey(e.name) === key
    );

    if (!ex) continue;

    const best = getBestSetFromSets(ex.sets);
    if (!best) continue;

    sets.push(best);
    if (sets.length >= limit) break;
  }

  return sets;
}

function getExerciseProgression(
  history: Workout[],
  exerciseName: string
) {
  return getExerciseBestSets(history, exerciseName, 3);
}

function isHardOrFailedSet(set: ExerciseBestSet) {
  if (set.failNote) return true;
  return typeof set.rir === "number" && set.rir <= 0;
}

function hasUsefulMargin(set: ExerciseBestSet) {
  if (set.failNote) return false;
  return typeof set.rir !== "number" || set.rir >= 1;
}

function buildProgressionPlan(args: {
  history: Workout[];
  exerciseName: string;
  targetReps: number;
  dayForm: DayForm | null;
}) {
  const { history, exerciseName, targetReps, dayForm } = args;
  const recentBestSets = getExerciseBestSets(history, exerciseName, 6);

  if (recentBestSets.length === 0) {
    return {
      action: "start",
      weight: "",
      reps: String(targetReps),
      repsText: `${targetReps} reps`,
      rirText: "RIR 2",
      note: "Första setet visar oss var vi ligger.",
      reason: "Ingen historik än.",
    } satisfies ExerciseProgressionPlan;
  }

  const topSet = [...recentBestSets].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.reps - a.reps;
  })[0];
  const latestSet = recentBestSets[0];
  const latestHard = isHardOrFailedSet(latestSet);
  const topWeightSets = recentBestSets.filter((set) => set.weight === topSet.weight);
  const topWeightStableSets = topWeightSets.filter(
    (set) => set.reps >= Math.max(targetReps, topSet.reps - 1) && hasUsefulMargin(set)
  );
  const recentHardCount = recentBestSets
    .slice(0, 4)
    .filter((set) => set.failNote || (typeof set.rir === "number" && set.rir <= 1))
    .length;
  const shouldDeload = recentHardCount >= 3;
  const canIncrease =
    dayForm !== "trött" &&
    !shouldDeload &&
    !latestHard &&
    topWeightStableSets.length >= 2;

  if (shouldDeload) {
    const deloadWeight = getNextAvailableWeight(topSet.weight, exerciseName, "down");
    const reps = Math.max(1, Math.min(topSet.reps, targetReps));

    return {
      action: "deload",
      weight: formatWeightInput(deloadWeight),
      reps: String(reps),
      repsText: formatRepRange(Math.max(1, reps - 1), reps),
      rirText: "RIR 2",
      note: "Du har haft flera tunga set. Idag håller vi igen lite.",
      reason: "Flera senaste set har varit nära failure.",
    } satisfies ExerciseProgressionPlan;
  }

  if (latestHard && latestSet.weight >= topSet.weight) {
    const loweredWeight = getNextAvailableWeight(topSet.weight, exerciseName, "down");
    const maxReps = Math.max(1, topSet.reps - 1);

    return {
      action: "decrease",
      weight: formatWeightInput(loweredWeight),
      reps: String(Math.max(1, maxReps - 1)),
      repsText: formatRepRange(Math.max(1, maxReps - 2), maxReps),
      rirText: "RIR 1–2",
      note: "Senast tog det stopp. Vi börjar lite lägre här.",
      reason: "Senaste bästa setet var för tungt.",
    } satisfies ExerciseProgressionPlan;
  }

  if (canIncrease) {
    const nextWeight = getNextAvailableWeight(topSet.weight, exerciseName, "up");
    const maxReps = Math.max(1, topSet.reps - 1);
    const minReps = Math.max(1, topSet.reps - 3);

    return {
      action: "increase",
      weight: formatWeightInput(nextWeight),
      reps: String(minReps),
      repsText: formatRepRange(minReps, maxReps),
      rirText: "RIR 1–2",
      note: `${formatWeightInput(topSet.weight)} kg har suttit flera pass. Nu testar vi lite upp.`,
      reason: "Samma toppvikt har suttit flera pass med tillräckligt många reps.",
    } satisfies ExerciseProgressionPlan;
  }

  if (dayForm === "trött") {
    const maxReps = Math.max(1, topSet.reps - 1);
    const minReps = Math.max(1, topSet.reps - 2);

    return {
      action: "hold",
      weight: formatWeightInput(topSet.weight),
      reps: String(minReps),
      repsText: formatRepRange(minReps, maxReps),
      rirText: "RIR 2",
      note: "Du har mer här, men idag börjar vi kontrollerat.",
      reason: "Dagsformen är trött.",
    } satisfies ExerciseProgressionPlan;
  }

  const maxReps = Math.max(1, topSet.reps);
  const minReps = Math.max(1, topSet.reps - 1);

  return {
    action: "hold",
    weight: formatWeightInput(topSet.weight),
    reps: String(minReps),
    repsText: formatRepRange(minReps, maxReps),
    rirText: "RIR 1–2",
      note: "Samma vikt som ditt bästa. Vi siktar lite lägre först.",
    reason: `Jag vill se att ${formatWeightInput(topSet.weight)} kg sitter nära ${topSet.reps} reps minst ett pass till innan vi höjer.`,
  } satisfies ExerciseProgressionPlan;
}

function buildProgressionCoachExplanation(args: {
  plan: ExerciseProgressionPlan;
  exerciseName: string;
}) {
  const { plan, exerciseName } = args;
  const target = plan.weight
    ? `${plan.weight} kg · ${plan.repsText} · ${plan.rirText}`
    : `${plan.repsText} · ${plan.rirText}`;

  if (plan.action === "increase") {
    return `Ja. I ${exerciseName} har samma vikt suttit flera pass, så nu testar vi upp lite.\n\nIdag: ${target}.`;
  }

  if (plan.action === "hold") {
    return `Inte än: ${plan.reason}\n\nIdag vill jag se ${target}.`;
  }

  if (plan.action === "decrease") {
    return `Inte idag. ${plan.reason}\n\nVi börjar på ${target} och ser hur första setet känns.`;
  }

  if (plan.action === "deload") {
    return `Idag håller vi igen. ${plan.reason}\n\nMålet är ${target}.`;
  }

  return `Jag saknar historik här än. Första setet visar oss var vi ligger: ${target}.`;
}

function isProgressionQuestion(message: string) {
  const lower = message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hasAny = (terms: string[]) => terms.some((term) => lower.includes(term));
  const asksWhy = hasAny([
    "varfor",
    "hur kommer det sig",
    "varfor inte",
    "borde jag",
    "ska jag",
    "kan jag",
  ]);
  const mentionsProgression = hasAny([
    "hogre",
    "hoja",
    "oka",
    "okar",
    "vikt",
    "tyngre",
    "lagre",
    "reps",
    "progression",
  ]);

  return mentionsProgression && (asksWhy || lower.includes("?"));
}

function isExerciseSafetyQuestion(message: string) {
  const lower = message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const asks =
    lower.includes("?") ||
    lower.includes("ar det") ||
    lower.includes("är det") ||
    lower.includes("kan den") ||
    lower.includes("borde jag");

  return (
    asks &&
    [
      "farlig",
      "farligt",
      "risk",
      "saker",
      "saker",
      "skada",
      "ont",
      "orolig",
      "radd",
    ].some((term) => lower.includes(term))
  );
}

function buildExerciseSafetyReply(exerciseName: string) {
  const profile = getExerciseProfile(exerciseName);
  const caution = profile.caution?.trim();
  const cue = profile.techniqueCue?.replace(/^Fokus:\s*/i, "").trim();

  return shortCoach([
    `Bra fråga. ${exerciseName} är inte “farlig” i sig, men den ska kännas trygg.`,
    caution || "Om något gör ont eller känns fel så justerar vi direkt.",
    cue ? `Idag vill jag att du tänker: ${cue}` : "",
    "Börja kontrollerat. Känns något fel stoppar vi direkt.",
  ]);
}

function extractWeightRepText(message: string) {
  const match = message
    .toLowerCase()
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)\s*(?:kg)?\s*(?:x|×)\s*(\d+)/);

  if (!match) return "";

  return `${formatCoachWeight(Number(match[1]))} × ${match[2]}`;
}

function normalizeCoachFreeText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasCoachFreeText(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeCoachFreeText(term)));
}

function buildLocalWorkoutChatFallback(args: {
  message: string;
  userName: string;
  exerciseName: string;
  dayForm: DayForm | null;
  currentSets: LoggedSet[];
  currentBestText?: string;
}) {
  const normalized = normalizeCoachFreeText(args.message);
  const exerciseName = args.exerciseName || "övningen";
  const latestSet = args.currentSets[args.currentSets.length - 1];
  const setText = latestSet
    ? `${formatCoachWeight(latestSet.weight)} × ${latestSet.reps}${
        latestSet.rir !== undefined ? ` · RIR ${latestSet.rir}` : ""
      }`
    : "";
  const askedSetText = extractWeightRepText(args.message);

  if (
    hasCoachFreeText(normalized, [
      "knappte",
      "small till",
      "ont",
      "smarta",
      "kanning",
      "axel",
      "armbage",
      "knat",
      "rygg",
    ])
  ) {
    return shortCoach([
      "Bra att du säger till.",
      "Smärta går före planen här.",
      hasCoachFreeText(normalized, ["knappte", "small till"])
        ? "Om det knäppte till: stoppa den rörelsen nu."
        : "Känns det mer än lätt obehag: lämna övningen.",
      `Vi tar ${exerciseName} lugnt eller byter till något som känns helt tryggt.`,
    ]);
  }

  if (
    hasCoachFreeText(normalized, [
      "farlig",
      "farligt",
      "skada",
      "risk",
      "orolig",
      "radd",
    ])
  ) {
    return buildExerciseSafetyReply(exerciseName);
  }

  if (
    hasCoachFreeText(normalized, [
      "starkt",
      "stark",
      "bra vikt",
      "bra set",
      "ar det bra",
      "är det bra",
    ])
  ) {
    return shortCoach([
      `Ja. ${askedSetText || setText || "Det där"} är starkt i din nivå.`,
      latestSet?.rir !== undefined && latestSet.rir >= 2
        ? "Extra bra: du hade fortfarande marginal kvar."
        : "Det viktiga är att det sitter med kontroll.",
      "Nästa steg är att bygga vidare utan att tappa formen.",
    ]);
  }

  if (
    hasCoachFreeText(normalized, [
      "svett",
      "flas",
      "flås",
      "puls",
      "dryper",
      "rinner",
      "helt slut",
    ])
  ) {
    return shortCoach([
      "Haha ja, nu är du inne i passet 🔥",
      "Bra. Håll huvudet kallt ändå.",
      setText ? `Nästa set bygger vi vidare från ${setText}.` : "",
      "Fokus på kontroll, inte stress.",
    ]);
  }

  if (
    hasCoachFreeText(normalized, [
      "kul",
      "skoj",
      "kanon",
      "gott",
      "gött",
      "nice",
      "riktigt bra",
      "kandes bra",
      "kändes bra",
      "stabilt",
    ])
  ) {
    return shortCoach([
      "Kanon. Det där vill jag höra 🔥",
      setText
        ? `${setText} med den känslan är ett väldigt bra tecken.`
        : "När känslan är så där har vi något att bygga på.",
      "Ta nästa set med samma kontroll.",
    ]);
  }

  if (
    hasCoachFreeText(normalized, [
      "hoja",
      "höja",
      "mer vikt",
      "oka",
      "öka",
      "tyngre",
    ])
  ) {
    return shortCoach([
      "Ja, men bara om kontrollen följer med.",
      "Liten höjning är okej om du fortfarande kan hålla RIR 1–2.",
      "Hellre en smart höjning än ett slarvigt maxförsök.",
    ]);
  }

  if (args.dayForm === "stark") {
    return shortCoach([
      "Bra. Då kan vi vara lite mer offensiva idag 💪",
      "Första setet visar hur mycket vi vågar höja.",
    ]);
  }

  if (args.dayForm === "trött") {
    return shortCoach([
      "Okej. Då öppnar vi lite smartare idag.",
      "Vi jagar kvalitet först, vikten efter det.",
    ]);
  }

  return shortCoach([
    "Jag hör dig.",
    "Jag tar med det i nästa beslut.",
    "Fortsätt skriva så där under passet, det hjälper coachningen.",
  ]);
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

  return `Du har haft flera väldigt tunga set senaste passen. Det kan vara smart att köra en lättare dag runt ${formatWeightInput(deloadWeight)} kg eller ungefär 5–10 % lättare.`;
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
function hasHomeEquipment(profile: UserProfile, equipment: string) {
  return profile.equipment?.includes(equipment) ?? false;
}

function buildBodyweightPlan(pass: PassType, daysPerWeek: number) {
  if (daysPerWeek <= 1) {
    return ["Knäböj", "Armhävningar", "Höftlyft", "Ryggresningar", "Planka"];
  }

  if (daysPerWeek === 2) {
    return pass === "A"
      ? ["Knäböj", "Armhävningar", "Utfall", "Planka"]
      : ["Höftlyft", "Pike push-up", "Step-up", "Sidoplanka"];
  }

  if (pass === "A") return ["Armhävningar", "Pike push-up", "Planka"];
  if (pass === "B") return ["Knäböj", "Utfall", "Höftlyft", "Vadpress"];
  if (pass === "C") return ["Armhävningar", "Ryggresningar", "Sidoplanka"];
  return ["Knäböj", "Step-up", "Höftlyft", "Planka"];
}

function buildBandsOnlyPlan(pass: PassType, daysPerWeek: number) {
  if (daysPerWeek <= 1) {
    return ["Knäböj", "Bandrodd", "Armhävningar", "Band pull-apart", "Planka"];
  }

  if (pass === "A") return ["Armhävningar", "Bandrodd", "Band pull-apart", "Bicepscurl med band"];
  if (pass === "B") return ["Knäböj", "Utfall", "Höftlyft", "Vadpress"];
  if (pass === "C") return ["Bandpress", "Bandrodd", "Sidolyft med band", "Tricepspress med band"];
  return ["Knäböj", "Step-up", "Höftlyft", "Planka"];
}

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
  const isBeginner = profile.trainingExperience === "nyborjare";

  if (profile.location === "gym") {
    if (isBeginner) {
      if (profile.daysPerWeek === 1) {
        return [
          "Benpress",
          "Bröstpress",
          "Latsdrag",
          "Benspark",
          "Cable crunch",
        ];
      }

      if (profile.daysPerWeek === 2) {
        return pass === "A"
          ? ["Bröstpress", "Sittande kabelrodd", "Latsdrag", "Sidolyft"]
          : ["Benpress", "Benspark", "Lårcurl", "Vadpress"];
      }

      if (profile.daysPerWeek === 3) {
        if (pass === "A") {
          return [
            "Bröstpress",
            "Sittande kabelrodd",
            "Latsdrag",
            "Sidolyft",
            "Triceps pushdown",
          ];
        }

        if (pass === "B") {
          return ["Benpress", "Benspark", "Lårcurl", "Vadpress"];
        }

        return [
          "Bröstpress",
          "Latsdrag",
          "Benpress",
          "Cable crunch",
        ];
      }

      if (profile.daysPerWeek === 4) {
        if (pass === "A") {
          return ["Bröstpress", "Sittande kabelrodd", "Sidolyft", "Triceps pushdown"];
        }

        if (pass === "B") {
          return ["Benpress", "Benspark", "Lårcurl", "Vadpress"];
        }

        if (pass === "C") {
          return ["Latsdrag", "Sittande kabelrodd", "Cable cross", "Bicepscurl"];
        }

        return ["Benpress", "Benspark", "Cable crunch", "Vadpress"];
      }
    }

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
  const hasNoEquipment =
    !profile.equipment?.length || hasHomeEquipment(profile, "none");
  const hasDumbbells = hasHomeEquipment(profile, "dumbbells");
  const hasKettlebell = hasHomeEquipment(profile, "kettlebell");
  const hasBands = hasHomeEquipment(profile, "bands");
  const hasWeights = hasDumbbells || hasKettlebell || hasHomeEquipment(profile, "barbell");

  if (hasNoEquipment) {
    return buildBodyweightPlan(pass, profile.daysPerWeek);
  }

  if (hasBands && !hasWeights) {
    return buildBandsOnlyPlan(pass, profile.daysPerWeek);
  }

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

function buildProgramGoalReason(profile: UserProfile) {
  if (profile.goalPrimary === "styrka") {
    return `Jag prioriterar övningar där vi kan följa vikterna tydligt vecka för vecka. ${profile.daysPerWeek} dagar passar bra när vi vill bli starkare utan att varje pass blir för långt.`;
  }

  if (profile.goalPrimary === "fett") {
    return `Jag bygger pass som ger mycket gjort utan att bli stökiga. ${profile.daysPerWeek} dagar och ${profile.minutesPerSession} minuter ger oss träning som går att komma tillbaka till.`;
  }

  return `Jag lägger fokus på tillräckligt många bra set varje vecka. ${profile.daysPerWeek} dagar ger oss utrymme att bygga muskler utan att varje pass blir för långt.`;
}

function buildProgramStructureReason(profile: UserProfile) {
  if (profile.daysPerWeek <= 2) {
    return "Med få pass behöver varje pass täcka mycket av kroppen, så upplägget börjar brett och enkelt.";
  }

  if (profile.daysPerWeek === 3) {
    return "Tre dagar ger plats för tydligare fokus per pass utan att veckan blir svår att följa.";
  }

  return "Fyra dagar ger mer utrymme att dela upp kroppen och hålla passen mer fokuserade.";
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
    coachSummary:
      "Jag bygger ett första upplägg utifrån dina svar. Vi kan justera det innan du startar.",
    planReason: buildProgramGoalReason(profile),
    structureReason: buildProgramStructureReason(profile),
    safetyNotes: profile.limitations?.trim()
      ? [`Jag tar hänsyn till: ${profile.limitations.trim()}.`]
      : [],
    source: "fallback",
    passes: passes.map((pass) => ({
      key: pass.key,
      displayName: pass.displayName,
      exercises: pass.exercises.map((name) => ({ name })),
    })),
  };
}

function applyWorkoutPlanEdits(args: {
  plan: WorkoutPlan;
  customExercisesByPass: CustomExercisesByPass;
  exerciseOverridesByPass: ExerciseOverridesByPass;
  removedExercisesByPass: RemovedExercisesByPass;
  passDisplayNamesByPass: PassDisplayNamesByPass;
}) {
  const {
    plan,
    customExercisesByPass,
    exerciseOverridesByPass,
    removedExercisesByPass,
    passDisplayNamesByPass,
  } = args;

  return {
    ...plan,
    passes: plan.passes.map((pass) => {
      const removed = removedExercisesByPass[pass.key] ?? [];
      const overrides = exerciseOverridesByPass[pass.key] ?? {};
      const custom = customExercisesByPass[pass.key] ?? [];

      const editedExercises = pass.exercises
        .filter(
          (exercise) =>
            !removed.some(
              (removedName) => exerciseKey(removedName) === exerciseKey(exercise.name)
            )
        )
        .map((exercise) => ({
          ...exercise,
          name: overrides[exerciseKey(exercise.name)] ?? exercise.name,
        }));

      const seen = new Set<string>();
      const exercises = [
        ...editedExercises,
        ...custom.map((name) => ({ name })),
      ].filter((exercise) => {
        const key = exerciseKey(exercise.name);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return {
        ...pass,
        displayName: passDisplayNamesByPass[pass.key]?.trim() || pass.displayName,
        exercises,
      };
    }),
  };
}

function getManualPlanExerciseName(rawExercise: string) {
  const cleaned = rawExercise
    .replace(/^\d+[\).]\s*/, "")
    .replace(/^[-•]\s*/, "")
    .trim();

  if (!cleaned) return "";

  const resolved = resolveExerciseName(cleaned);

  if (resolved.status === "known") return resolved.name;
  if (resolved.status === "suggest") return resolved.suggestion;

  return cleaned;
}

function parseManualWorkoutPlan(
  rawText: string,
  profile: UserProfile
): StoredWorkoutPlan | null {
  const text = rawText.trim();
  const markerRegex = /(dag|pass)\s*([1-4a-d])\s*:?\s*/gi;
  const matches = [...text.matchAll(markerRegex)];

  if (matches.length === 0) return null;

  const passes = matches.slice(0, 4).map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const nextMatch = matches[index + 1];
    const end = nextMatch?.index ?? text.length;
    const content = text.slice(start, end);
    const key = ["A", "B", "C", "D"][index] as PassType;
    const label = match[2].toUpperCase();
    const displayName = /^\d+$/.test(label) ? `Dag ${label}` : `Pass ${label}`;
    const exercises = content
      .split(/,|;|\n|\r|\s+och\s+/i)
      .map(getManualPlanExerciseName)
      .filter(Boolean)
      .slice(0, 10);

    return {
      key,
      displayName,
      exercises: exercises.map((name) => ({ name })),
    };
  });

  const usablePasses = passes.filter((pass) => pass.exercises.length > 0);

  if (usablePasses.length === 0) return null;

  return {
    title: "Eget upplägg",
    goalPrimary: profile.goalPrimary,
    daysPerWeek: usablePasses.length,
    coachSummary:
      "Du har lagt in ett eget schema. Jag coachar progressionen ovanpå det och säger till om något ser riskabelt ut.",
    planReason:
      "Här följer vi ditt upplägg först, men coachen håller koll på volym, progression och begränsningar.",
    structureReason:
      "Passen följer den struktur du skrev in, så det blir lätt att känna igen och fortsätta med.",
    safetyNotes: profile.limitations?.trim()
      ? [`Jag tar hänsyn till: ${profile.limitations.trim()}.`]
      : [],
    source: "manual",
    builtAt: new Date().toISOString(),
    passes: usablePasses,
  };
}

function getProgramProfileSignature(profile: UserProfile) {
  return JSON.stringify({
    age: profile.age ?? null,
    gender: profile.gender ?? "",
    trainingExperience: profile.trainingExperience ?? "",
    goalPrimary: profile.goalPrimary,
    goalSecondary: profile.goalSecondary ?? [],
    daysPerWeek: profile.daysPerWeek,
    minutesPerSession: profile.minutesPerSession,
    location: profile.location,
    equipment: profile.equipment ?? [],
    exercisePreferences: profile.exercisePreferences ?? [],
    limitations: profile.limitations?.trim() ?? "",
  });
}

function buildProgramFallbackPlan(profile: UserProfile): BuiltWorkoutPlan {
  return {
    ...buildDefaultWorkoutPlan({
      profile,
      customExercisesByPass: { A: [], B: [], C: [], D: [] },
      exerciseOverridesByPass: { A: {}, B: {}, C: {}, D: {} },
      removedExercisesByPass: { A: [], B: [], C: [], D: [] },
    }),
    profileSignature: getProgramProfileSignature(profile),
  };
}

function getAvailableProgramExercises() {
  return KNOWN_EXERCISE_NAMES.map((name) => {
    const profile = getExerciseProfile(name);

    return {
      name,
      category: profile.category,
      equipment: profile.equipment,
      techniqueCue: profile.techniqueCue,
      progressionRule: profile.progressionRule,
      caution: profile.caution,
    };
  });
}

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 5;
const PROGRESSION_STEP = 2.5;
const DUMBBELL_WEIGHT_SCALE = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30,
  32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5, 55, 57.5, 60,
];

function isDumbbellWeightExercise(exerciseName: string) {
  const lowerName = exerciseName.toLowerCase();
  const equipment = getExerciseProfile(exerciseName).equipment.toLowerCase();

  if (lowerName.includes("kabel") || lowerName.includes("cable")) return false;

  return (
    lowerName.includes("hantel") ||
    lowerName.includes("sidolyft") ||
    equipment.includes("hantel")
  );
}

function getNextAvailableWeight(
  weight: number,
  exerciseName: string,
  direction: "up" | "down"
) {
  if (!Number.isFinite(weight)) return weight;

  if (isDumbbellWeightExercise(exerciseName)) {
    if (direction === "up") {
      return (
        DUMBBELL_WEIGHT_SCALE.find((available) => available > weight + 0.001) ??
        weight + PROGRESSION_STEP
      );
    }

    return (
      [...DUMBBELL_WEIGHT_SCALE]
        .reverse()
        .find((available) => available < weight - 0.001) ?? Math.max(0, weight - 1)
    );
  }

  const next =
    direction === "up" ? weight + PROGRESSION_STEP : Math.max(0, weight - PROGRESSION_STEP);
  return Number(next.toFixed(2));
}

function roundToStep(weight: number, step: number, mode: "nearest" | "down" | "up") {
  if (!Number.isFinite(weight)) return weight;
  if (step <= 0) return Number(weight.toFixed(2));

  const factor = weight / step;
  const rounded =
    mode === "down"
      ? Math.floor(factor + 0.0001)
      : mode === "up"
      ? Math.ceil(factor - 0.0001)
      : Math.round(factor);

  return Number((rounded * step).toFixed(2));
}

function normalizeSuggestedWeight(
  weight: number,
  exerciseName: string,
  mode: "nearest" | "down" | "up" = "nearest"
) {
  if (!Number.isFinite(weight)) return weight;
  if (!isDumbbellWeightExercise(exerciseName)) {
    return roundToStep(weight, PROGRESSION_STEP, mode);
  }

  if (mode === "down") {
    return (
      [...DUMBBELL_WEIGHT_SCALE]
        .reverse()
        .find((available) => available <= weight + 0.001) ?? DUMBBELL_WEIGHT_SCALE[0]
    );
  }

  if (mode === "up") {
    return (
      DUMBBELL_WEIGHT_SCALE.find((available) => available >= weight - 0.001) ??
      DUMBBELL_WEIGHT_SCALE[DUMBBELL_WEIGHT_SCALE.length - 1]
    );
  }

  return DUMBBELL_WEIGHT_SCALE.reduce((closest, available) => {
    const currentDistance = Math.abs(available - weight);
    const closestDistance = Math.abs(closest - weight);
    if (currentDistance < closestDistance) return available;
    return closest;
  }, DUMBBELL_WEIGHT_SCALE[0]);
}

function getExerciseDecisionProfile(exerciseName: string) {
  const profile = getExerciseProfile(exerciseName);
  const lower = exerciseName.toLowerCase();
  const restKind = getExerciseRestKind(exerciseName);
  const isTechnicalHinge =
    lower.includes("rdl") ||
    lower.includes("marklyft") ||
    lower.includes("rumänska") ||
    lower.includes("rumanska") ||
    lower.includes("deadlift");
  const isTechnicalSquat =
    lower.includes("knäböj") ||
    lower.includes("knöböj") ||
    lower.includes("squat");

  if (isTechnicalHinge || isTechnicalSquat) {
    return {
      type: "technical-heavy" as const,
      backoffAfterFailure: 0.92,
      backoffAfterHardSecondSet: 0.94,
      techniqueDrop: 0.88,
      painDrop: 0.8,
      maxHardSets: 2,
      riskNote:
        "Tekniskt känslig basövning: hellre kvalitet och rygg/ledsäkerhet än fler maxreps.",
    };
  }

  if (restKind === "heavy") {
    return {
      type: "heavy" as const,
      backoffAfterFailure: 0.95,
      backoffAfterHardSecondSet: 0.96,
      techniqueDrop: 0.92,
      painDrop: 0.85,
      maxHardSets: 3,
      riskNote: "Tung basövning: backoff ska hålla teknik och fart kvar.",
    };
  }

  if (restKind === "isolation") {
    return {
      type: "isolation" as const,
      backoffAfterFailure: 0.88,
      backoffAfterHardSecondSet: 0.92,
      techniqueDrop: 0.85,
      painDrop: 0.75,
      maxHardSets: 3,
      riskNote: `${profile.category} / isolation: kontakt och kontroll går före last.`,
    };
  }

  return {
    type: "normal" as const,
    backoffAfterFailure: 0.94,
    backoffAfterHardSecondSet: 0.95,
    techniqueDrop: 0.9,
    painDrop: 0.82,
    maxHardSets: 3,
    riskNote: "Normal övning: justera efter marginal och kvalitet.",
  };
}

function getBackoffWeight(args: {
  weight: number;
  exerciseName: string;
  reason: "failure" | "hard-backoff" | "technique" | "pain";
}) {
  const profile = getExerciseDecisionProfile(args.exerciseName);
  const multiplier =
    args.reason === "pain"
      ? profile.painDrop
      : args.reason === "technique"
      ? profile.techniqueDrop
      : args.reason === "hard-backoff"
      ? profile.backoffAfterHardSecondSet
      : profile.backoffAfterFailure;
  const percentageTarget = args.weight * multiplier;
  const oneStepDown = getNextAvailableWeight(args.weight, args.exerciseName, "down");
  const rawTarget = Math.min(oneStepDown, percentageTarget);
  const roundMode = args.reason === "hard-backoff" ? "nearest" : "down";

  return Math.max(0, normalizeSuggestedWeight(rawTarget, args.exerciseName, roundMode));
}

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
  exerciseName?: string; // ny (valfri så gammalt funkar)
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
  return getExerciseProfile(exerciseName).techniqueCue;
}

function getLegacyExerciseCue(exerciseName: string) {
  const name = exerciseName.toLowerCase();

  if (name.includes("hantelpress")) {
    return "Fokus: stabil handled, kontrollerad sänkning, inga studs.";
  }

  if (name.includes("rumänska") || name.includes("rdl")) {
    return "Fokus: höften bak, ryggen låst och ingen ful failure.";
  }

  if (name.includes("benspark")) {
    return "Fokus: paus i toppen och kontakt före mer vikt.";
  }

  if (name.includes("vad")) {
    return "Fokus: stretch i botten och paus i toppen.";
  }

  if (name.includes("biceps") || name.includes("curl")) {
    return "Fokus: ren curl och stoppa innan senan börjar bråka.";
  }

  if (name.includes("triceps") || name.includes("pushdown")) {
    return "Fokus: kontakt i triceps och smärtfritt grepp.";
  }

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
  previousSets: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
  }[];
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir: number;
}) {
  const { previousSets, weight, reps, durationSeconds, metricType, rir } = args;

  if (previousSets.length === 0) {
    return "";
  }

  const previousSet = previousSets[previousSets.length - 1];
  const previousRir =
    typeof previousSet.rir === "number" ? previousSet.rir : null;

  if (metricType === "time" || typeof durationSeconds === "number") {
    const currentDuration = durationSeconds ?? 0;
    const previousDuration = previousSet.durationSeconds ?? 0;

    if (currentDuration > previousDuration) {
      return "Du höll längre än förra setet.";
    }

    if (currentDuration < previousDuration && previousDuration > 0) {
      return "Tiden sjönk lite efter jobbet innan.";
    }

    return "Samma tid som förra setet.";
  }

  if (weight === previousSet.weight && reps === previousSet.reps) {
    if (previousRir !== null) {
      if (rir > previousRir) {
        return "Det här såg lättare ut än förra setet.";
      }

      if (rir < previousRir) {
        return "Nu blev det tyngre än förra setet.";
      }

      return "Samma nivå som förra setet.";
    }

    return "Samma nivå som förra setet.";
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
  previousSets: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
  }[];
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
    return "Seten ser jämna ut.";
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
      rir2: "Bra kvalitet. Håll det rent.",
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

function rirAsCoachText(rir: number) {
  if (rir <= 0) return "ingen rep kvar";
  if (rir === 1) return "en rep kvar";
  return `${rir} reps kvar`;
}

function getNextSetRepRange(args: {
  reps: number;
  rir: number;
  sameWeight?: boolean;
}) {
  const { reps, rir } = args;

  if (rir <= 0) {
    const max = Math.max(1, reps - 2);
    return `${Math.max(1, max - 1)}–${max} reps`;
  }

  if (rir === 1) {
    const max = Math.max(1, reps - 1);
    return `${Math.max(1, max - 1)}–${max} reps`;
  }

  if (rir === 2) {
    return `${Math.max(1, reps - 1)}–${reps} reps`;
  }

  return `${Math.max(6, reps - 1)}–${reps} reps`;
}

function getNextSetRepInput(args: { reps: number; rir: number }) {
  const { reps, rir } = args;

  if (rir <= 0) return Math.max(1, reps - 3);
  if (rir === 1) return Math.max(1, reps - 2);
  if (rir === 2) return Math.max(1, reps - 1);
  return Math.max(1, reps - 1);
}

function getNextSetRirInput(rir: number) {
  if (rir <= 1) return 1;
  return 2;
}

function formatCoachWeight(weight: number) {
  if (!Number.isFinite(weight)) return "";
  return Number(weight.toFixed(2)).toString();
}

function formatDurationText(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;

  if (minutes <= 0) return `${restSeconds} sek`;
  return `${minutes}:${String(restSeconds).padStart(2, "0")}`;
}

function shouldDisplayAsBodyweight(exerciseName: string, weight: number) {
  return isBodyweightExercise(exerciseName) && (!Number.isFinite(weight) || weight <= 0);
}

function formatLoggedSetText(args: {
  exerciseName: string;
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
}) {
  if (args.metricType === "time" || isTimedExercise(args.exerciseName)) {
    const base = `${formatDurationText(args.durationSeconds ?? 0)}${
      Number.isFinite(args.weight) && args.weight > 0
        ? ` + ${formatCoachWeight(args.weight)} kg`
        : ""
    }`;

    return typeof args.rir === "number" ? `${base} · marginal ${args.rir}` : base;
  }

  const base = shouldDisplayAsBodyweight(args.exerciseName, args.weight)
    ? `${args.reps} reps`
    : `${formatCoachWeight(args.weight)} kg x ${args.reps}`;

  return typeof args.rir === "number" ? `${base} · RIR ${args.rir}` : base;
}

function formatNextLoadText(exerciseName: string, weight: number) {
  return shouldDisplayAsBodyweight(exerciseName, weight)
    ? "kroppsvikt"
    : `${formatCoachWeight(weight)} kg`;
}

function getExerciseRestKind(exerciseName: string) {
  const profile = getExerciseProfile(exerciseName);
  const lower = exerciseName.toLowerCase();
  const cue = profile.techniqueCue.toLowerCase();

  if (
    profile.category === "armar" ||
    profile.category === "axlar" ||
    profile.category === "mage" ||
    lower.includes("vad") ||
    lower.includes("benspark") ||
    lower.includes("lårcurl") ||
    lower.includes("larcurl") ||
    lower.includes("curl") ||
    lower.includes("pushdown") ||
    lower.includes("sidolyft") ||
    cue.includes("kontakt")
  ) {
    return "isolation" as const;
  }

  if (
    lower.includes("mark") ||
    lower.includes("knäböj") ||
    lower.includes("knöböj") ||
    lower.includes("squat") ||
    lower.includes("benpress") ||
    lower.includes("bänk") ||
    lower.includes("bank") ||
    lower.includes("rodd") ||
    lower.includes("latsdrag") ||
    lower.includes("press")
  ) {
    return "heavy" as const;
  }

  return "normal" as const;
}

type NextSetPlan = {
  weight: number;
  repsText: string;
  repsInput: number;
  rirText: string;
  rirInput: number;
  restText: string;
  techniqueCue: string;
  strategy: "press" | "hold" | "backoff" | "reduce" | "complete";
  reason: string;
};

function getTimedTargetText(seconds: number, rir: number) {
  const base = Math.max(10, Math.round(seconds));
  const next =
    rir <= 0 ? Math.max(10, base - 10) : rir >= 3 ? base + 15 : base;
  const min = Math.max(10, next - 5);
  const max = Math.max(min, next);

  return min === max
    ? formatDurationText(max)
    : `${formatDurationText(min)}-${formatDurationText(max)}`;
}

function getNextTimedSetPlan(args: {
  weight: number;
  durationSeconds: number;
  rir: number;
  failNote?: string;
  setNumber: number;
  exerciseName?: string;
}) {
  const exerciseName = args.exerciseName ?? "";
  const fail = args.failNote?.trim().toLowerCase() ?? "";
  const hasPainIssue =
    fail.includes("ont") ||
    fail.includes("smärta") ||
    fail.includes("känning") ||
    fail.includes("skarp") ||
    fail.includes("axel") ||
    fail.includes("rygg") ||
    fail.includes("höft") ||
    fail.includes("knä");
  const restText = args.rir <= 1 ? "90-120 sek." : "60-90 sek.";
  const techniqueCue = getExerciseCue(exerciseName);

  if (hasPainIssue) {
    return {
      weight: args.weight,
      repsText: "gå vidare",
      repsInput: 0,
      rirText: "klar",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason:
        "Smärta går före tiden. Vi lämnar övningen eller väljer en smärtfri variant.",
    } satisfies NextSetPlan;
  }

  if (args.setNumber >= 3 || (args.setNumber >= 2 && args.rir <= 0)) {
    return {
      weight: args.weight,
      repsText: "gå vidare",
      repsInput: 0,
      rirText: "klar",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason:
        "Vi har fått den tidskvalitet vi behöver här. Nästa övning nu.",
    } satisfies NextSetPlan;
  }

  const strategy = args.rir >= 3 ? "press" : args.rir <= 0 ? "backoff" : "hold";

  return {
    weight: args.weight,
    repsText: getTimedTargetText(args.durationSeconds, args.rir),
    repsInput: 0,
    rirText: args.rir <= 1 ? "marginal 1-2." : "marginal 2.",
    rirInput: args.rir <= 1 ? 2 : 2,
    restText,
    techniqueCue,
    strategy,
    reason:
      strategy === "press"
        ? "Du hade mer tid kvar i kroppen. Vi bygger vidare lite."
        : strategy === "backoff"
        ? "Det blev nära gränsen. Vi håller kvaliteten och sänker tidskravet lite."
        : "Tiden satt bra. Vi håller oss nära samma nivå.",
  } satisfies NextSetPlan;
}

function getNextSetPlan(args: {
  weight: number;
  reps: number;
  rir: number;
  failNote?: string;
  setNumber: number;
  exerciseName?: string;
  previousSets?: { weight: number; reps: number; rir?: number }[];
}) {
  const { weight, reps, rir, setNumber } = args;
  const exerciseName = args.exerciseName ?? "";
  const decisionProfile = getExerciseDecisionProfile(exerciseName);
  const previousSet = args.previousSets?.[args.previousSets.length - 1];
  const previousRir =
    previousSet && typeof previousSet.rir === "number" ? previousSet.rir : null;
  const rirDroppedHard =
    previousSet &&
    previousSet.weight === weight &&
    previousSet.reps === reps &&
    previousRir !== null &&
    previousRir - rir >= 2;
  const fail = args.failNote?.trim().toLowerCase() ?? "";
  const restText = getRestTextForRir(rir, exerciseName);
  const techniqueCue = getExerciseCue(exerciseName);
  const isIsolation =
    techniqueCue.toLowerCase().includes("curl") ||
    techniqueCue.toLowerCase().includes("triceps") ||
    techniqueCue.toLowerCase().includes("sidolyft") ||
    techniqueCue.toLowerCase().includes("kontakt");
  const range = (min: number, max: number) =>
    min === max ? `${min} reps` : `${min}–${max} reps`;
  const hasTechniqueIssue =
    fail.includes("teknik") ||
    fail.includes("formen") ||
    fail.includes("slarv") ||
    fail.includes("kontakt") ||
    fail.includes("kast") ||
    fail.includes("ostabil");
  const hasPainIssue =
    fail.includes("ont") ||
    fail.includes("smärta") ||
    fail.includes("känning") ||
    fail.includes("skarp") ||
    fail.includes("axel") ||
    fail.includes("armbåge") ||
    fail.includes("handled") ||
    fail.includes("rygg") ||
    fail.includes("knä");

  if (fail) {
    if (hasPainIssue) {
      return {
        weight,
        repsText: "gå vidare",
        repsInput: reps,
        rirText: "klar",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          "Smärta går före planen. Vi lämnar övningen eller väljer en helt smärtfri variant.",
      } satisfies NextSetPlan;
    }

    if (setNumber >= 3) {
      return {
        weight,
        repsText: "gå vidare",
        repsInput: reps,
        rirText: "klar",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason: "Övningen är klar här. Vi tar nästa när du är redo.",
      } satisfies NextSetPlan;
    }

    if (hasTechniqueIssue) {
      const nextWeight = getBackoffWeight({
        weight,
        exerciseName,
        reason: "technique",
      });
      const min = Math.max(1, reps - 3);
      const max = Math.max(min, reps - 1);
      return {
        weight: nextWeight,
        repsText: range(min, max),
        repsInput: min,
        rirText: "RIR 1–2",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "reduce",
        reason: "Tekniken var inte där. Vi sänker lite så nästa set blir renare.",
      } satisfies NextSetPlan;
    }

    if (fail.includes("grepp")) {
      const min = Math.max(1, reps - 2);
      const max = Math.max(min, reps - 1);
      return {
        weight,
        repsText: range(min, max),
        repsInput: min,
        rirText: "RIR 1",
        rirInput: 1,
        restText,
        techniqueCue,
        strategy: "hold",
        reason: "Greppet gav upp, inte hela lyftet. Vi håller vikten men jagar inte extra reps.",
      } satisfies NextSetPlan;
    }

    const nextWeight = getBackoffWeight({
      weight,
      exerciseName,
      reason: "failure",
    });
    const min = Math.max(1, reps - 1);
    const max = Math.max(min, reps);
    return {
      weight: nextWeight,
      repsText: range(min, max),
      repsInput: min,
      rirText: "RIR 1–2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "reduce",
      reason: "Det tog stopp. Vi sänker lite och jagar inte fler maxreps här.",
    } satisfies NextSetPlan;
  }

  if (rir <= 0) {
    if (setNumber >= decisionProfile.maxHardSets) {
      return {
        weight,
        repsText: "gå vidare",
        repsInput: reps,
        rirText: "klar",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          decisionProfile.type === "technical-heavy"
            ? "Det räcker för den här övningen idag. Vi skyddar tekniken och går vidare."
            : "Det räcker för den här övningen idag. Vi går vidare.",
      } satisfies NextSetPlan;
    }

    const nextWeight = getBackoffWeight({
      weight,
      exerciseName,
      reason: "failure",
    });
    const min = Math.max(1, reps - 1);
    const max = Math.max(min, reps);
    return {
      weight: nextWeight,
      repsText: range(min, max),
      repsInput: min,
      rirText: "RIR 1–2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "reduce",
      reason:
        decisionProfile.type === "technical-heavy"
          ? "Där var gränsen. Nu gör vi en tydlig backoff så tekniken håller."
          : isIsolation
          ? "Vi sänker lite och låter nästa set handla om kontroll, inte maxreps."
          : "Vi sänker och låter nästa set bli rent.",
    } satisfies NextSetPlan;
  }

  if (rirDroppedHard) {
    const nextWeight = getBackoffWeight({
      weight,
      exerciseName,
      reason: "hard-backoff",
    });
    const min = Math.max(1, reps - 2);
    const max = Math.max(min, reps);

    return {
      weight: nextWeight,
      repsText: range(min, max),
      repsInput: min,
      rirText: "RIR 1–2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "backoff",
      reason:
        "Samma vikt och reps kostade mer nu. Vi backar lite så nästa set håller kvalitet.",
    } satisfies NextSetPlan;
  }

  if (setNumber >= 3 && rir <= 2) {
    return {
      weight,
      repsText: "gå vidare",
      repsInput: reps,
      rirText: "klar",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason: "Den här övningen är klar. Vi går vidare.",
    } satisfies NextSetPlan;
  }

  if (rir === 1) {
    const isBackoff = setNumber >= 2;
    const nextWeight = isBackoff
      ? getBackoffWeight({
          weight,
          exerciseName,
          reason: "hard-backoff",
        })
      : normalizeSuggestedWeight(weight, exerciseName);
    const min = Math.max(1, reps - 2);
    const max = Math.max(min, isBackoff ? reps : reps - 1);

    return {
      weight: nextWeight,
      repsText: range(min, max),
      repsInput: min,
      rirText: isBackoff ? "RIR 1–2" : "RIR 1",
      rirInput: isBackoff ? 2 : 1,
      restText,
      techniqueCue,
      strategy: isBackoff ? "backoff" : "hold",
      reason: isBackoff
        ? "Nu tar vi ett lättare set med bra kvalitet."
        : "Vi håller vikten och låter nästa set bekräfta nivån.",
    } satisfies NextSetPlan;
  }

  if (rir === 2) {
    const min = Math.max(1, reps - 1);
    return {
      weight: normalizeSuggestedWeight(weight, exerciseName),
      repsText: range(min, reps),
      repsInput: min,
      rirText: "RIR 1–2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "hold",
      reason: "Den nivån sitter. Vi tar samma vikt en gång till.",
    } satisfies NextSetPlan;
  }

  const nextWeight = getNextAvailableWeight(weight, exerciseName, "up");
  const min = Math.max(1, reps - 2);
  return {
    weight: nextWeight,
    repsText: range(min, reps),
    repsInput: min,
    rirText: "RIR 1–2",
    rirInput: 2,
    restText,
    techniqueCue,
    strategy: "press",
    reason: "Vi höjer lite. Du har mer att ge här.",
  } satisfies NextSetPlan;
}

function getRestTextForRir(rir: number, exerciseName = "") {
  const kind = getExerciseRestKind(exerciseName);

  if (kind === "isolation") {
    if (rir <= 0) return "2 minuter";
    if (rir === 1) return "90–120 sek.";
    return "60–90 sek.";
  }

  if (kind === "normal") {
    if (rir <= 0) return "3 minuter";
    if (rir === 1) return "2–3 minuter";
    return "2 minuter";
  }

  if (rir <= 0) return "3–4 minuter";
  if (rir === 1) return "3 minuter";
  return "2–3 minuter";
}

function buildCoachSetContext(args: {
  userName?: string;
  goalPrimary: UserProfile["goalPrimary"];
  passLabel?: string;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir: number;
  failNote: string;
  nextWeight: number;
  nextSetPlan: NextSetPlan;
  previousSets: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
  }[];
  personalRecordText?: string;
  lastCoachMessage?: string;
  warmupContext: WarmupContext | null;
  conditioningContext: ConditioningContext | null;
}): CoachSetContext {
  const previousSet = args.previousSets[args.previousSets.length - 1];
  const decisionProfile = getExerciseDecisionProfile(args.exerciseName);
  const signals: string[] = [];
  const currentSetText = formatLoggedSetText({
    exerciseName: args.exerciseName,
    weight: args.weight,
    reps: args.reps,
    durationSeconds: args.durationSeconds,
    metricType: args.metricType,
    rir: args.rir,
  });
  const previousSetText = previousSet
    ? formatLoggedSetText({
        exerciseName: args.exerciseName,
        weight: previousSet.weight,
        reps: previousSet.reps,
        durationSeconds: previousSet.durationSeconds,
        metricType: previousSet.metricType,
        rir: previousSet.rir,
      })
    : undefined;
  const nextLoadText = formatNextLoadText(args.exerciseName, args.nextSetPlan.weight);

  if (args.personalRecordText) signals.push(args.personalRecordText);
  signals.push(decisionProfile.riskNote);
  if (args.metricType === "time" || isTimedExercise(args.exerciseName)) {
    signals.push(
      "Tidsövning: använd tid som huvudmått. Skriv inte reps som huvuddata. RIR-värdet betyder marginal till att tappa positionen eller behöva släppa, inte reps kvar."
    );
  }
  if (shouldDisplayAsBodyweight(args.exerciseName, args.weight)) {
    signals.push("Kroppsviktsövning utan extra vikt: logga reps och RIR. Skriv inte 0 kg.");
  }

  if (previousSet && args.weight === previousSet.weight && args.reps > previousSet.reps) {
    signals.push(`Reps upp på samma vikt: +${args.reps - previousSet.reps}.`);
  }

  if (
    previousSet &&
    typeof previousSet.rir === "number" &&
    args.weight === previousSet.weight &&
    args.reps === previousSet.reps &&
    args.rir > previousSet.rir
  ) {
    signals.push("Samma reps som förra setet, men mer kvar i tanken.");
  }

  if (
    previousSet &&
    typeof previousSet.rir === "number" &&
    args.weight === previousSet.weight &&
    args.reps === previousSet.reps &&
    previousSet.rir - args.rir >= 2
  ) {
    signals.push(
      "Samma vikt och reps kostade tydligt mer RIR nu. Tolka som högre faktisk ansträngning och använd backoff vid behov."
    );
  }

  if (previousSet && args.weight > previousSet.weight) {
    signals.push(`Vikten höjdes från ${previousSet.weight} kg till ${args.weight} kg.`);
  }

  if (
    previousSet &&
    typeof previousSet.rir === "number" &&
    args.weight === previousSet.weight &&
    args.reps < previousSet.reps &&
    args.reps >= Math.max(1, previousSet.reps - 2) &&
    args.rir >= 1
  ) {
    signals.push(
      "Planerad repsänkning träffad med marginal kvar. Beskriv det som bra utfört, inte som problem eller tappad styrka."
    );
  }

  if (args.failNote) signals.push(`Failure-orsak: ${args.failNote}.`);
  if (args.nextSetPlan.strategy === "backoff" || args.nextSetPlan.strategy === "reduce") {
    signals.push(
      `Nästa belastning är ett coachbeslut enligt autoreglering, inte ett fast viktsteg: ${nextLoadText}.`
    );
  }
  const exerciseCategory = getExerciseProfile(args.exerciseName).category;

  return {
    kind: "set_feedback",
    userName: args.userName,
    goalPrimary: args.goalPrimary,
    passLabel: args.passLabel?.trim() || undefined,
    exerciseName: args.exerciseName,
    exerciseCategory,
    setNumber: args.setNumber,
    currentSet: {
      weight: args.weight,
      reps: args.reps,
      durationSeconds: args.durationSeconds,
      metricType: args.metricType,
      rir: args.rir,
      loadText: shouldDisplayAsBodyweight(args.exerciseName, args.weight)
        ? "kroppsvikt"
        : `${formatCoachWeight(args.weight)} kg`,
      setText: currentSetText,
      failNote: args.failNote || undefined,
    },
    previousSet: previousSet
      ? {
          weight: previousSet.weight,
          reps: previousSet.reps,
          durationSeconds: previousSet.durationSeconds,
          metricType: previousSet.metricType,
          rir: previousSet.rir,
          setText: previousSetText,
        }
      : undefined,
    personalRecordText: args.personalRecordText || undefined,
    nextTarget: {
      weight: args.nextWeight,
      loadText: nextLoadText,
      repsText: args.nextSetPlan.repsText,
      rirText: args.nextSetPlan.rirText,
      strategy: args.nextSetPlan.strategy,
      reason: args.nextSetPlan.reason,
      techniqueCue: args.nextSetPlan.techniqueCue,
    },
    restText: args.nextSetPlan.restText,
    warmupNote: args.warmupContext?.note,
    conditioningNote: args.conditioningContext?.note,
    previousCoachReply: args.lastCoachMessage?.trim() || undefined,
    computedSignals: signals,
  };
}

function pickEarnedExcitement(args: {
  isNewPersonalBest: boolean;
  clearProgression: boolean;
  repsUpSameWeight: boolean;
  sameRepsMoreMargin: boolean;
  rir: number;
  setNumber: number;
  exerciseName: string;
}) {
  const {
    isNewPersonalBest,
    clearProgression,
    repsUpSameWeight,
    sameRepsMoreMargin,
    rir,
    setNumber,
    exerciseName,
  } = args;
  const exerciseCategory = getExerciseProfile(exerciseName).category;

  if (isNewPersonalBest) {
    if (setNumber >= 3) {
      if (exerciseCategory === "rygg") return "Okej, ryggen är med på riktigt idag! 🚀";
      if (exerciseCategory === "ben") return "Okej, benen är med på riktigt idag! 🚀";
      if (exerciseCategory === "bröst" || exerciseCategory === "axlar") {
        return "Okej, pressen sitter på riktigt idag! 🚀";
      }

      return "Okej, det här är en stark träningsdag! 🚀";
    }
    if (setNumber === 2) return "Vänta lite. Ännu ett personbästa! 🔥";
    return rir >= 2 ? "Oj. Nu snackar vi! 🔥" : "Nu snackar vi!";
  }

  if (repsUpSameWeight) return setNumber <= 2 ? "Där satt den!" : "Snyggt. Den repen ville vi ha.";
  if (sameRepsMoreMargin) return "Den där gillar jag.";
  if (clearProgression) return "Bra. Riktigt bra.";
  return setNumber === 1 ? "Bra start." : "Bra jobbat där.";
}

function getPersonalBestMeaning(args: {
  setNumber: number;
  rir: number;
  marginText: string;
  previousSets: { weight: number; reps: number; rir?: number }[];
}) {
  const { setNumber, rir, marginText, previousSets } = args;
  const priorHardSets = previousSets.filter(
    (set) => set.weight > 0 && set.reps > 0
  ).length;

  if (priorHardSets >= 2) {
    return rir > 0
      ? `Ännu ett personbästa i samma övning, och fortfarande ${marginText}.`
      : "Ännu ett tungt personbästa i samma övning. Nu räcker det här.";
  }

  if (priorHardSets >= 1 || setNumber === 2) {
    return rir > 0
      ? `Och du hade fortfarande ${marginText}. Den gamla nivån var för låg idag.`
      : "Den gamla nivån var för låg idag. Nu har vi hittat taket.";
  }

  return rir > 0 ? `Och du hade ${marginText}.` : "";
}

function getPersonalBestPayoff(
  setNumber: number,
  previousSets: { weight: number; reps: number; rir?: number }[]
) {
  if (previousSets.length >= 2 || setNumber >= 3) {
    return "Vi stänger den här övningen med stil.";
  }

  if (setNumber === 2) return "Det där är riktig progression.";
  return "Det där är exakt sånt jag vill se.";
}

function buildCoachMessage(args: {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir: number;
  failNote: string;
  exerciseName: string;
  setNumber: number;
  nextWeight: number;
  nextSetPlan: NextSetPlan;
  lastCoachMessage: string;
  previousSets: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
  }[];
  completedExercises: { sets: { rir?: number }[] }[];
  goalPrimary: UserProfile["goalPrimary"];
  personalRecordText?: string;
  warmupContext: WarmupContext | null;
  conditioningContext: ConditioningContext | null;
}) {
  const {
    weight,
    reps,
    durationSeconds,
    metricType,
    rir,
    failNote,
    exerciseName,
    setNumber,
    nextWeight,
    nextSetPlan,
    previousSets,
    personalRecordText,
    warmupContext,
    conditioningContext,
  } = args;

  const previousSet = previousSets[previousSets.length - 1];
  const hasPreviousSet = Boolean(previousSet);
  const restTime = nextSetPlan.restText;
  const marginText = rirAsCoachText(rir);
  const nextSetRepRange = nextSetPlan.repsText;
  const nextSetWeightText = formatNextLoadText(exerciseName, nextSetPlan.weight);
  const nextSetRirText = nextSetPlan.rirText;
  const nextTechniqueCue = nextSetPlan.techniqueCue;

  const isTimedSet = metricType === "time" || isTimedExercise(exerciseName);
  const currentText = formatLoggedSetText({
    exerciseName,
    weight,
    reps,
    durationSeconds,
    metricType,
    rir,
  });
  const currentCoachText = shouldDisplayAsBodyweight(exerciseName, weight)
    ? `${reps} reps med ${marginText}`
    : `${formatCoachWeight(weight)} kg × ${reps} med ${marginText}`;
  const previousText = previousSet
      ? formatLoggedSetText({
        exerciseName,
        weight: previousSet.weight,
        reps: previousSet.reps,
        durationSeconds: previousSet.durationSeconds,
        metricType: previousSet.metricType,
        rir: previousSet.rir,
      })
    : "";
  const previousRir =
    previousSet && typeof previousSet.rir === "number" ? previousSet.rir : null;
  const repsUpSameWeight =
    hasPreviousSet && weight === previousSet.weight && reps > previousSet.reps;
  const sameRepsMoreMargin =
    hasPreviousSet &&
    previousRir !== null &&
    weight === previousSet.weight &&
    reps === previousSet.reps &&
    rir > previousRir;
  const weightUpFromPrevious = hasPreviousSet && weight > previousSet.weight;
  const heldWeightUnderFatigue =
    hasPreviousSet &&
    previousRir !== null &&
    weight === previousSet.weight &&
    reps >= Math.max(1, previousSet.reps - 1) &&
    rir < previousRir;
  const plannedRepDropHit =
    hasPreviousSet &&
    previousRir !== null &&
    weight === previousSet.weight &&
    reps >= Math.max(1, previousSet.reps - 2) &&
    reps < previousSet.reps &&
    rir >= 1;
  const clearProgression = repsUpSameWeight || sameRepsMoreMargin;
  const isNewPersonalBest = personalRecordText?.startsWith("Nytt personbästa");
  const specificObservation = (() => {
    if (!hasPreviousSet) {
      if (rir >= 3) return "Du hade mycket kvar. Det säger att nivån är för låg idag.";
      if (rir === 2) return "Du öppnade kontrollerat och gav oss bra marginal.";
      if (rir === 1) return "En rep kvar på första setet.";
      return "Ingen rep kvar på första setet. Då backar vi lite.";
    }

    if (repsUpSameWeight) {
      return `Du tog ${reps - previousSet!.reps} rep mer på samma vikt.`;
    }

    if (sameRepsMoreMargin) {
      return "Samma reps som förra setet, men med mer kvar.";
    }

    if (weightUpFromPrevious) {
      return `Du gick upp till ${weight} kg och fick ${reps} reps.`;
    }

    if (heldWeightUnderFatigue) {
      return `Du höll nästan samma reps trots mindre marginal.`;
    }

    if (
      hasPreviousSet &&
      previousRir !== null &&
      weight === previousSet.weight &&
      reps < previousSet.reps &&
      rir <= 1 &&
      previousRir <= 1 &&
      !plannedRepDropHit
    ) {
      return "Det där var nära gränsen efter jobbet innan.";
    }

    if (hasPreviousSet && weight === previousSet.weight && reps === previousSet.reps) {
      if (previousRir !== null && rir < previousRir) {
        return "Samma reps, men med mindre kvar.";
      }

      return "Du låg kvar på samma nivå som förra setet.";
    }

    if (hasPreviousSet && weight < previousSet.weight) {
      if (reps >= previousSet.reps) {
        return "Du sänkte vikten och höll repsen.";
      }

      return "Bra. Du tog ner vikten och höll kvaliteten efter det tunga jobbet.";
    }

    if (hasPreviousSet && reps < previousSet.reps) {
      if (plannedRepDropHit) {
        return "Du träffade repsmålet med marginal kvar. Bra utfört.";
      }

      return "Repsen sjönk lite efter tidigare arbete.";
    }

    return "Jag har setet.";
  })();
  const payoffLines =
    isNewPersonalBest || clearProgression
      ? [
          pickEarnedExcitement({
            isNewPersonalBest: Boolean(isNewPersonalBest),
            clearProgression,
            repsUpSameWeight,
            sameRepsMoreMargin,
            rir,
            setNumber,
            exerciseName,
          }),
          isNewPersonalBest
            ? `${formatLoggedSetText({ exerciseName, weight, reps, durationSeconds, metricType })} är nytt personbästa i ${exerciseName}.`
            : "",
          isNewPersonalBest
            ? getPersonalBestMeaning({ setNumber, rir, marginText, previousSets })
            : "",
          clearProgression ? specificObservation : "",
          clearProgression || isNewPersonalBest
            ? rir <= 1
              ? "Det där var starkt gjort."
              : isNewPersonalBest
              ? getPersonalBestPayoff(setNumber, previousSets)
              : "Det där är exakt sånt jag vill se."
            : "",
        ]
      : [];
  const hasPayoff = payoffLines.filter(Boolean).length > 0;
  const bodyObservation = clearProgression || hasPayoff ? "" : specificObservation;

  const fail = failNote.trim().toLowerCase();
  const conditioningNote =
    setNumber === 1 &&
    conditioningContext?.timing === "before" &&
    conditioningContext.intensity === "hard"
      ? "Konditionen innan kan påverka trycket idag."
      : "";
  const coachResponse = (lines: string[]) =>
    shortCoach(
      payoffLines.length > 0 || conditioningNote
        ? [
            ...(payoffLines.length > 0 ? [...payoffLines, ""] : []),
            ...lines,
            ...(conditioningNote ? ["", conditioningNote] : []),
          ]
        : lines
    );

  if (nextSetPlan.strategy === "complete") {
    if (hasPayoff) {
      return coachResponse([
        `${exerciseName} är klar för idag.`,
        "Tryck Nästa övning när du är redo.",
      ]);
    }

    if (fail || rir <= 0) {
      return coachResponse([
        "Bra jobbat. Vi lämnar den här övningen här.",
        currentText,
        hasPreviousSet
          ? "Du fick ut det vi behövde utan att pressa vidare i onödan."
          : "Det räcker för idag.",
        `${exerciseName} är klar för idag.`,
        "Tryck Nästa övning när du är redo.",
      ]);
    }

    return coachResponse([
      "Snyggt. Den här övningen är klar för idag.",
      currentText,
      nextSetPlan.reason,
      "Tryck Nästa övning när du är redo.",
    ]);
  }

  if (fail) {
    if (fail.includes("grepp")) {
      return coachResponse([
        `Där började greppet ge upp: ${currentText}.`,
        "",
        nextSetPlan.reason,
        "",
        "Nästa set:",
        nextSetWeightText,
        `sikta på ${nextSetRepRange}`,
        `${nextSetRirText}.`,
        nextTechniqueCue,
        `Vila ${restTime}.`,
      ]);
    }

    if (fail.includes("ont") || fail.includes("smärta")) {
      return coachResponse([
        "Okej, vi avbryter den övningen.",
        "",
        "Nu:",
        currentText,
        "",
        getPainCoachContextText(warmupContext),
      ]);
    }

    return coachResponse([
      `Där tog det stopp: ${currentText}.`,
      "",
      hasPreviousSet
        ? "Det är trötthet från arbetet innan. Vi jagar inte igenom det."
        : "Då har vi dagens tak här.",
      nextSetPlan.reason,
      "",
      "Nästa set:",
      nextSetWeightText,
      `sikta på ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  if (rir >= 3) {
    if (isNewPersonalBest) {
      return coachResponse([
        `Personbästa med ${marginText}. Det är starkt.`,
        "",
        nextSetPlan.reason,
        "",
        "Nästa set:",
        nextSetWeightText,
        `sikta på ${nextSetRepRange}`,
        `${nextSetRirText}.`,
        nextTechniqueCue,
        "",
        `Vila ${restTime}.`,
      ]);
    }

    return coachResponse([
      rir >= 4 ? "Bra jobbat! Det där var starkt 🔥" : "Bra jobbat. Det där satt fint.",
      currentText,
      nextSetPlan.reason,
      "",
      "Nästa set:",
      nextSetWeightText,
      `sikta på ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  if (rir === 2) {
    if (hasPayoff) {
      return coachResponse([
        "",
        "Nästa set:",
        nextSetWeightText,
        `sikta på ${nextSetRepRange}`,
        `${nextSetRirText}.`,
        nextTechniqueCue,
        `Vila ${restTime}.`,
      ]);
    }

    return coachResponse([
      setNumber === 1
        ? rir === 2
          ? "Bra start. Det där var en trygg öppning."
          : "Bra öppning."
        : hasPreviousSet && reps < previousSet!.reps
        ? "Bra. Det där var precis uppgiften."
        : "Bra jobbat där.",
      currentText,
      hasPreviousSet && reps < previousSet!.reps
        ? "Du höll kvaliteten även när repsen sjönk lite."
        : bodyObservation,
      hasPreviousSet && reps < previousSet!.reps
        ? `${nextSetWeightText} igen. Samma fokus.`
        : nextSetPlan.reason,
      "",
      "Nästa set:",
      nextSetWeightText,
      `sikta på ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  if (rir === 1) {
    if (hasPayoff) {
      return coachResponse([
        "",
        "Nästa set:",
        nextSetWeightText,
        `sikta på ${nextSetRepRange}`,
        `${nextSetRirText}.`,
        nextTechniqueCue,
        `Vila ${restTime}.`,
      ]);
    }

    return coachResponse([
      payoffLines.length > 0
        ? ""
        : setNumber === 1
        ? "Starkt första set."
        : nextSetPlan.strategy === "backoff"
        ? "Snyggt. Du höll ihop det efter det tunga jobbet."
        : "Bra tryck där!",
      "",
      currentText,
      bodyObservation,
      nextSetPlan.reason,
      "",
      "Nästa set:",
      nextSetWeightText,
      `sikta på ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  if (rir === 0) {
    return coachResponse([
      "Bra kämpat! Där var vi nära gränsen.",
      currentText,
      hasPreviousSet
        ? "Det är helt rimligt efter arbetet innan."
        : bodyObservation,
      nextSetPlan.reason,
      "",
      "Nästa set:",
      nextSetWeightText,
      `sikta på ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  return coachResponse([
    "Bra jobbat där.",
    currentText,
    bodyObservation,
    nextSetPlan.reason,
    "",
    "Nästa set:",
    nextSetWeightText,
    `sikta på ${nextSetRepRange}`,
    `${nextSetRirText}.`,
    nextTechniqueCue,
    "",
    `Vila ${restTime}.`,
  ]);
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
        "Vi startar lugnt idag.",
      coachChatMessage:
        "Säg till direkt om något känns fel.",
      caution:
        "Avbryt om något gör ont.",
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
        "Vi börjar lite lugnare idag.",
      coachChatMessage:
        "Första arbetssetet visar oss var vi ligger.",
      caution:
        "Ingen stress upp i vikt direkt.",
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
        "Bra. Du verkar pigg idag.",
      coachChatMessage:
        "Bra. Första setet visar hur offensiva vi kan vara.",
      caution:
        "Vi börjar fortfarande med kontroll.",
    };
  }

  return {
    dayForm: "normal",
      coachIntro:
        "Vi startar lugnt.",
      coachChatMessage:
        "Första setet visar oss var vi ligger.",
    caution:
      "Logga första setet tidigt.",
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
    return `Vi hoppar över ${removedExercises[0]} idag.`;
  }

  if (removedExercises.length === 2) {
    return `Vi hoppar över ${removedExercises[0]} och ${removedExercises[1]} idag.`;
  }

  return `Vi hoppar över några övningar idag.`;
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
    return "Jag minns att greppet begränsade dig här sist. Vi börjar på samma vikt och ser om det håller längre.";
  }

  if (text.includes("tekniken")) {
    return "Jag minns att tekniken brast här sist. Om det känns likadant vill jag att du säger till direkt.";
  }

  if (text.includes("smärta") || text.includes("känning")) {
    return "Jag minns att du kände av den här övningen sist. Säg till direkt om det kommer tillbaka.";
  }

  if (text.includes("gränsen i muskeln")) {
    return "Jag minns att du nådde gränsen här sist. Första setet visar hur nära vi ska gå idag.";
  }

  return "Jag minns att det blev tufft här sist. Första setet visar oss var vi ligger idag.";
}
export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [started, setStarted] = useState(false);
  const [workoutReview, setWorkoutReview] = useState<WorkoutReview | null>(null);
  const [latestCompletedReview, setLatestCompletedReview] =
  useState<WorkoutReview | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [gym, setGym] = useState<string>("Sjöviksgymmet");
  const [lastPass, setLastPass] = useState<PassType | null>(null);
  const [coachMemory, setCoachMemory] = useState<CoachMemory>({ notes: [] });
const [workoutComplete, setWorkoutComplete] = useState(false);
const [showDailyPlan, setShowDailyPlan] = useState(false);
const [hasAcceptedTrainingSafety, setHasAcceptedTrainingSafety] = useState(false);
const [showExerciseProgress, setShowExerciseProgress] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPersonalRecords, setShowPersonalRecords] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [appTheme, setAppTheme] = useState<AppTheme>("dark");
  const [selectedStartPass, setSelectedStartPass] = useState<PassType | null>(null);
  const [selectedProgressExercise, setSelectedProgressExercise] = useState<
    string | null
  >(null);

  // “Databas”
  const [history, setHistory] = useState<Workout[]>([]);
  const [lastByExercise, setLastByExercise] = useState<LastByExercise>({});

  const [personalRecords, setPersonalRecords] = useState<PersonalRecords>({});


  // Pågående pass
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [skippedExercise, setSkippedExercise] = useState<SkippedExercise | null>(null);


const [dayForm, setDayForm] = useState<DayForm | null>(null);


  // Inputs för set
  const [weightInput, setWeightInput] = useState<string>("");
  const [repsInput, setRepsInput] = useState<string>("");
const [durationSecondsInput, setDurationSecondsInput] = useState(0);
const [rirInput, setRirInput] = useState<number>(2);
const [didFailInput, setDidFailInput] = useState(false);
const [failNoteInput, setFailNoteInput] = useState<string>("");


const [userProfile, setUserProfile] = useState<UserProfile | null>(null);




const [chatInput, setChatInput] = useState("");
const [chatLog, setChatLog] = useState<
  {
    role: "you" | "coach";
    text: string;
    setNumber?: number;
    aiStatus?: "fallback";
  }[]
>([]);
const [nameInput, setNameInput] = useState("");
const [ageInput, setAgeInput] = useState("");
const [genderInput, setGenderInput] =
  useState<UserProfile["gender"]>("vill-inte-saga");
const [trainingExperienceInput, setTrainingExperienceInput] =
  useState<NonNullable<UserProfile["trainingExperience"]>>("van");
const [daysPerWeekInput, setDaysPerWeekInput] = useState("3");
const [minutesPerSessionInput, setMinutesPerSessionInput] = useState("60");
const [locationInput, setLocationInput] = useState<UserProfile["location"]>("gym");
const [equipmentInput, setEquipmentInput] = useState<string[]>([]);
const [exercisePreferencesInput, setExercisePreferencesInput] = useState<string[]>([]);
const [limitationsInput, setLimitationsInput] = useState("");
const [goalInput, setGoalInput] = useState< 
  "muskel" | "styrka" | "fett"
>("muskel");
const [secondaryGoalsInput, setSecondaryGoalsInput] = useState<
  ("muskel" | "styrka" | "fett")[]
>([]);

const [editingProfile, setEditingProfile] = useState(false);

const profileName = userProfile?.name?.trim() || "du";

const [customExercisesByPass, setCustomExercisesByPass] =
  useState<CustomExercisesByPass>({
    A: [],
    B: [],
    C: [],
    D: [],
  });
const [todayExercisesByPass, setTodayExercisesByPass] =
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
const [workoutExerciseInput, setWorkoutExerciseInput] = useState("");
const [checkInInput, setCheckInInput] = useState("");
const [checkInCoachReply, setCheckInCoachReply] = useState("")
const [showProgramReview, setShowProgramReview] = useState(false);
const [programPreferenceInput, setProgramPreferenceInput] = useState("");
const [programPreferenceReply, setProgramPreferenceReply] = useState("");
const [programPreferences, setProgramPreferences] = useState<string[]>([]);
const [programBuildStatus, setProgramBuildStatus] = useState<
  "idle" | "building" | "ready" | "fallback"
>("idle");
const [programBuildScreenVisible, setProgramBuildScreenVisible] =
  useState(false);
const [pendingProgramSuggestion, setPendingProgramSuggestion] =
  useState<CoachProgramSuggestion | null>(null);
const [customWorkoutPlan, setCustomWorkoutPlan] =
  useState<StoredWorkoutPlan | null>(null);
const [passDisplayNamesByPass, setPassDisplayNamesByPass] =
  useState<PassDisplayNamesByPass>({});
const [activeCheckInSignal, setActiveCheckInSignal] =
  useState<CheckInSignal | null>(null);
const [activeWarmupContext, setActiveWarmupContext] =
  useState<WarmupContext | null>(null);
const [activeConditioningContext, setActiveConditioningContext] =
  useState<ConditioningContext | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1250);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = appTheme;
  }, [appTheme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [
    started,
    workoutComplete,
    workoutReview,
    showDailyPlan,
    showExerciseProgress,
    showStatistics,
    showHistory,
    showPersonalRecords,
    showProgramReview,
    editingProfile,
  ]);

// eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      localStorage.clear();
      sessionStorage.clear();
      void syncBetaSnapshotNow({ reason: "url-reset" });
      window.history.replaceState(null, "", window.location.pathname);
      window.location.reload();
      return;
    }

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
    setProgramPreferences(loadJSON<string[]>("programPreferences", []));
    setCustomWorkoutPlan(loadJSON<StoredWorkoutPlan | null>("customWorkoutPlan", null));
    setPassDisplayNamesByPass(loadJSON<PassDisplayNamesByPass>("passDisplayNamesByPass", {}));
    setAppTheme(loadJSON<AppTheme>("appTheme", "dark"));
    setHasAcceptedTrainingSafety(
      loadJSON<boolean>("acceptedTrainingSafety", false)
    );
    const savedProfile = loadJSON<UserProfile | null>("userProfile", null);
if (savedProfile) {
  setUserProfile(savedProfile);
  if (!savedProfile.name?.trim()) {
    setEditingProfile(true);
  } else if (!loadJSON<boolean>("approvedWorkoutPlan", false)) {
    setShowProgramReview(true);
  }
}
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
  // FYLL FORMULÄR FRÅN PROFIL
  // eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => {
if (!userProfile) return;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  setNameInput(userProfile.name ?? "");
  setAgeInput(userProfile.age ? String(userProfile.age) : "");
  setGenderInput(userProfile.gender ?? "vill-inte-saga");
  setTrainingExperienceInput(userProfile.trainingExperience ?? "van");
  setDaysPerWeekInput(String(userProfile.daysPerWeek));
  setMinutesPerSessionInput(String(userProfile.minutesPerSession));
  setLocationInput(userProfile.location);
  setEquipmentInput(
    userProfile.location === "hemma"
      ? userProfile.equipment?.length
        ? userProfile.equipment
        : ["none"]
      : []
  );
  setExercisePreferencesInput(userProfile.exercisePreferences ?? []);
  setGoalInput(userProfile.goalPrimary);
  setSecondaryGoalsInput(
    (userProfile.goalSecondary ?? []).filter(
      (goal) => goal !== userProfile.goalPrimary
    )
  );
  setLimitationsInput(userProfile.limitations);
}, [userProfile]);


  const recommendedNextPass = useMemo(() => {
  const days = userProfile?.daysPerWeek ?? 3;
  return getNextPass(lastPass, days);
}, [lastPass, userProfile]);

const nextPass = selectedStartPass ?? recommendedNextPass;

useEffect(() => {
  const resetFrame = window.setTimeout(() => {
    setSelectedStartPass(null);
  }, 0);

  return () => window.clearTimeout(resetFrame);
}, [lastPass, userProfile?.daysPerWeek]);

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

const basePlan =
  customWorkoutPlan ??
  buildDefaultWorkoutPlan({
    profile: userProfile,
    customExercisesByPass: { A: [], B: [], C: [], D: [] },
    exerciseOverridesByPass: { A: {}, B: {}, C: {}, D: {} },
    removedExercisesByPass: { A: [], B: [], C: [], D: [] },
  });

return applyWorkoutPlanEdits({
  plan: basePlan,
  customExercisesByPass,
  exerciseOverridesByPass,
  removedExercisesByPass,
  passDisplayNamesByPass,
});
}, [
  userProfile,
  customWorkoutPlan,
  customExercisesByPass,
  exerciseOverridesByPass,
  removedExercisesByPass,
  passDisplayNamesByPass,
]);

async function buildAiWorkoutPlanForProfile(profile: UserProfile) {
  const fallbackPlan = buildProgramFallbackPlan(profile);
  const signature = getProgramProfileSignature(profile);
  const buildStartedAt = Date.now();

  setProgramBuildScreenVisible(true);
  setProgramBuildStatus("building");
  setPendingProgramSuggestion(null);
  setProgramPreferenceReply("");

  const result = await requestAiProgramBuild({
    context: {
      kind: "program_build",
      userName: profile.name,
      profile: {
        age: profile.age,
        gender: profile.gender,
        trainingExperience: profile.trainingExperience,
        goalPrimary: profile.goalPrimary,
        goalSecondary: profile.goalSecondary,
        daysPerWeek: profile.daysPerWeek,
        minutesPerSession: profile.minutesPerSession,
        location: profile.location,
        equipment: profile.location === "hemma" ? profile.equipment : [],
        exercisePreferences: profile.exercisePreferences ?? [],
        limitations: profile.limitations,
      },
      availableExercises: getAvailableProgramExercises(),
      existingPreferences: programPreferences,
    },
    fallbackPlan,
  });

  const nextPlan: StoredWorkoutPlan = {
    ...result.plan,
    profileSignature: signature,
    source: result.mode === "ai" ? "ai" : "fallback",
  };

  const waitTime = Math.max(
    0,
    PROGRAM_BUILD_MIN_MS - (Date.now() - buildStartedAt)
  );

  window.setTimeout(() => {
    setCustomWorkoutPlan(nextPlan);
    saveJSON("customWorkoutPlan", nextPlan);
    setProgramBuildStatus(result.mode === "ai" ? "ready" : "fallback");
    setProgramBuildScreenVisible(false);
  }, waitTime);
}

useEffect(() => {
  if (!userProfile || !showProgramReview) return;
  const activeProfile = userProfile;

  if (customWorkoutPlan) {
    const profileSignature = getProgramProfileSignature(activeProfile);
    if (
      customWorkoutPlan.source !== "manual" &&
      customWorkoutPlan.profileSignature &&
      customWorkoutPlan.profileSignature !== profileSignature
    ) {
      localStorage.removeItem("customWorkoutPlan");
      const resetFrame = window.setTimeout(() => {
        setCustomWorkoutPlan(null);
      }, 0);

      return () => window.clearTimeout(resetFrame);
    }

    const nextBuildStatus =
      customWorkoutPlan.source === "ai"
        ? "ready"
        : customWorkoutPlan.source === "fallback"
        ? "fallback"
        : "idle";
    const statusFrame = window.setTimeout(() => {
      setProgramBuildStatus(nextBuildStatus);
      setProgramBuildScreenVisible(false);
    }, 0);

    return () => window.clearTimeout(statusFrame);
  }

  let cancelled = false;
  let finishTimer: number | null = null;

  async function run() {
    const fallbackPlan = buildProgramFallbackPlan(activeProfile);
    const signature = getProgramProfileSignature(activeProfile);
    const buildStartedAt = Date.now();

    setProgramBuildScreenVisible(true);
    setProgramBuildStatus("building");

    const result = await requestAiProgramBuild({
      context: {
        kind: "program_build",
        userName: activeProfile.name,
        profile: {
          age: activeProfile.age,
          gender: activeProfile.gender,
          trainingExperience: activeProfile.trainingExperience,
          goalPrimary: activeProfile.goalPrimary,
          goalSecondary: activeProfile.goalSecondary,
          daysPerWeek: activeProfile.daysPerWeek,
          minutesPerSession: activeProfile.minutesPerSession,
          location: activeProfile.location,
          equipment:
            activeProfile.location === "hemma" ? activeProfile.equipment : [],
          exercisePreferences: activeProfile.exercisePreferences ?? [],
          limitations: activeProfile.limitations,
        },
        availableExercises: getAvailableProgramExercises(),
        existingPreferences: programPreferences,
      },
      fallbackPlan,
    });

    if (cancelled) return;

    const nextPlan: StoredWorkoutPlan = {
      ...result.plan,
      profileSignature: signature,
      source: result.mode === "ai" ? "ai" : "fallback",
    };

    const waitTime = Math.max(
      0,
      PROGRAM_BUILD_MIN_MS - (Date.now() - buildStartedAt)
    );

    finishTimer = window.setTimeout(() => {
      if (cancelled) return;

      setCustomWorkoutPlan(nextPlan);
      saveJSON("customWorkoutPlan", nextPlan);
      setProgramBuildStatus(result.mode === "ai" ? "ready" : "fallback");
      setProgramBuildScreenVisible(false);
    }, waitTime);
  }

  run();

  return () => {
    cancelled = true;
    if (finishTimer) window.clearTimeout(finishTimer);
  };
}, [userProfile, showProgramReview, customWorkoutPlan, programPreferences]);

const nextPlannedPass: WorkoutPass | null =
  workoutPlan?.passes.find((pass: WorkoutPass) => pass.key === nextPass) ?? null;

const availablePassChoices = useMemo(
  () =>
    workoutPlan?.passes.map((pass: WorkoutPass) => ({
      key: pass.key,
      label: pass.displayName ?? `Pass ${pass.key}`,
      exerciseCount: pass.exercises.length,
    })) ?? [],
  [workoutPlan]
);

const savedPlan: string[] =
  nextPlannedPass?.exercises.map((exercise: PlannedExercise) => exercise.name) ?? [];
const plan: string[] = mergePlan(savedPlan, todayExercisesByPass[nextPass] ?? []);

  const removedExercisesForNextPass = useMemo(
    () => removedExercisesByPass[nextPass] ?? [],
    [removedExercisesByPass, nextPass]
  );

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

  const savedProgression = getExerciseProgression(history, currentExerciseName);
  const currentWorkoutExercise = workout?.exercises.find(
    (exercise) => exerciseKey(exercise.name) === exerciseKey(currentExerciseName)
  );
  const currentWorkoutBest = currentWorkoutExercise
    ? getBestSetFromSets(currentWorkoutExercise.sets)
    : null;
  const pr = personalRecords[exerciseKey(currentExerciseName)];

  const liveBestSets = [
    ...(currentWorkoutBest
      ? [
          {
            weight: currentWorkoutBest.weight,
            reps: currentWorkoutBest.reps,
            rir: currentWorkoutBest.rir,
            failNote: currentWorkoutBest.failNote,
            createdAt: currentWorkoutBest.createdAt,
          },
        ]
      : []),
    ...(pr
      ? [
          {
            weight: pr.weight,
            reps: pr.reps,
            createdAt: pr.createdAt,
          },
        ]
      : []),
    ...savedProgression,
  ];

  return liveBestSets
    .filter(
      (set, index, sets) =>
        sets.findIndex(
          (candidate) =>
            candidate.weight === set.weight && candidate.reps === set.reps
        ) === index
    )
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.reps - a.reps;
    })
    .slice(0, 3);
}, [history, currentExerciseName, workout, personalRecords]);

const progressionHistory = useMemo(() => {
  const baseHistory = workout ? [workout, ...history] : history;
  if (!currentExerciseName) return baseHistory;

  const pr = personalRecords[exerciseKey(currentExerciseName)];
  if (!pr) return baseHistory;

  const alreadyHasPr = baseHistory.some((item) =>
    item.exercises.some(
      (exercise) =>
        exerciseKey(exercise.name) === exerciseKey(currentExerciseName) &&
        exercise.sets.some(
          (set) => set.weight === pr.weight && set.reps === pr.reps
        )
    )
  );

  if (alreadyHasPr) return baseHistory;

  const prWorkout: Workout = {
    id: `personal-record-${exerciseKey(currentExerciseName)}`,
    startedAt: pr.createdAt,
    gym: workout?.gym ?? "",
    pass: workout?.pass ?? nextPass,
    displayName: workout?.displayName ?? "Personbästa",
    exercises: [
      {
        name: currentExerciseName,
        sets: [
          {
            weight: pr.weight,
            reps: pr.reps,
            createdAt: pr.createdAt,
          },
        ],
      },
    ],
  };

  return [prWorkout, ...baseHistory];
}, [currentExerciseName, history, nextPass, personalRecords, workout]);

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
 
const progressionPlan = useMemo(() => {
  if (!currentExerciseName) {
    return {
      action: "start",
      weight: "",
      reps: String(goalTargets.targetReps),
      repsText: `${goalTargets.targetReps} reps`,
      rirText: "RIR 2",
      note: "Första setet visar oss var vi ligger.",
      reason: "Ingen övning vald.",
    } satisfies ExerciseProgressionPlan;
  }

  return buildProgressionPlan({
    history: progressionHistory,
    exerciseName: currentExerciseName,
    targetReps: goalTargets.targetReps,
    dayForm,
  });
}, [currentExerciseName, progressionHistory, goalTargets.targetReps, dayForm]);


const suggestion = useMemo(() => {
  return {
    weight: progressionPlan.weight,
    reps: progressionPlan.reps,
  };
}, [progressionPlan]);

const adjustedSuggestion = useMemo(() => {
  return suggestion;
}, [suggestion]);

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
      reason: "Ingen historik än. Första setet visar nivån.",
    };
  }

  if (last.rir === 0) {
    return {
      targetWeight: Math.max(0, last.weight - 2.5),
      reason: "Senast nådde du failure. Vi börjar lite lättare.",
    };
  }

    if (typeof last.rir === "number" && last.rir >= 3 && last.reps >= targetReps) {
    return {
      targetWeight: last.weight + PROGRESSION_STEP,
      reason: "Senast hade du marginal kvar. Du kan testa att höja.",
    };
  }

    if ((last.rir === 1 || last.rir === 2) && last.reps >= targetReps) {
    return {
      targetWeight: last.weight,
      reason: "Senast låg du nära rätt marginal. Vi håller vikten.",
    };
  }

  return {
    targetWeight: last.weight,
    reason: "Utgå från samma vikt som senast.",
  };
}



 const coachData = useMemo(() => {
  if (!workout) return null;

  const last = lastByExercise[exerciseKey(currentExerciseName)];
  const bodyweightCurrentExercise = isBodyweightExercise(currentExerciseName);

  const targetWeight =
    !bodyweightCurrentExercise && adjustedSuggestion.weight && adjustedSuggestion.weight !== ""
      ? adjustedSuggestion.weight
      : bodyweightCurrentExercise
      ? ""
      : progressionPlan.weight;

const removedExercisesNote = buildRemovedExercisesCoachNote(
  removedExercisesForNextPass
);

const introBase = activeCheckInSignal?.coachIntro
  ? `${getWorkoutIntro(dayForm)} ${activeCheckInSignal.coachIntro}`
  : getWorkoutIntro(dayForm);

const intro = removedExercisesNote
  ? `${introBase} ${removedExercisesNote}`
  : introBase;

  const lastText = last
    ? formatLoggedSetText({
        exerciseName: currentExerciseName,
        weight: last.weight,
        reps: last.reps,
        rir: last.rir ?? undefined,
      })
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
else if (!insight && progressionPlan.action === "increase") insight = progressionPlan.reason;
else if (!insight && progressionPlan.action === "deload") insight = progressionPlan.reason;

  return {
    intro,
    pass: workout.pass,
    gym: workout.gym,
    exercise: currentExerciseName,
    lastText,
    plan: progressionPlan.reason,
       target: targetWeight
      ? `${targetWeight} kg · ${progressionPlan.repsText} · ${progressionPlan.rirText}`
      : `${progressionPlan.repsText} · ${progressionPlan.rirText}`,
    insight,
  };
}, [
  workout,
  lastByExercise,
  currentExerciseName,
  adjustedSuggestion.weight,
  progressionPlan,
  dayForm,
  history,
  removedExercisesForNextPass,
  activeCheckInSignal,
  coachMemory,
]);

// När du byter övning: fyll i senaste vikt/reps om det finns
useEffect(() => {
  if (!started) return;
  if (!currentExerciseName) return;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  setWeightInput((prev) =>
    !isBodyweightExercise(currentExerciseName) && prev.trim() === ""
      ? adjustedSuggestion.weight
      : prev
  );
  setRepsInput((prev) => (prev.trim() === "" ? adjustedSuggestion.reps : prev));
}, [currentExerciseName, started, adjustedSuggestion.weight, adjustedSuggestion.reps]);


function startWorkout() {
  if (!nextPlannedPass || !workoutPlan) return;
  const checkInSignal = buildCheckInSignal(checkInInput);
  const warmupContext = buildWarmupContext(checkInInput);
  const conditioningContext = buildConditioningContext(checkInInput);

  const startedAt = new Date();
const w: Workout = {
  id: crypto.randomUUID(),
  startedAt: startedAt.toISOString(),
  gym,
  pass: nextPass,
  displayName: nextPlannedPass?.displayName ?? `Pass ${nextPass}`,
  planTitle: workoutPlan?.title,
  exercises: plan.map((name: string) => ({ name, sets: [] })),
  warmupContext,
  conditioningContext,
};

    setWorkout(w);
    setTodayExercisesByPass((prev) => ({ ...prev, [nextPass]: [] }));
    setExerciseIndex(0);
    setSkippedExercise(null);
    setStarted(true);
    setSelectedStartPass(null);
    setChatInput("");
    setDayForm(checkInSignal?.dayForm ?? "normal");
    setActiveCheckInSignal(checkInSignal);
    setActiveWarmupContext(warmupContext);
    setActiveConditioningContext(conditioningContext);
    setNow(startedAt);
const firstExerciseName = plan[0] ?? "";

const startMessages: { role: "coach" | "you"; text: string; setNumber?: number }[] = [];

if (checkInSignal) {
  startMessages.push({
    role: "coach",
    text: checkInSignal.coachChatMessage,
  });
}

if (warmupContext) {
  startMessages.push({
    role: "coach",
    text: getWarmupCoachReply(warmupContext),
  });
}

if (
  conditioningContext &&
  !(warmupContext?.status === "cardio" && conditioningContext.intensity === "light")
) {
  startMessages.push({
    role: "coach",
    text: getConditioningCoachReply(conditioningContext, userProfile?.goalPrimary),
  });
}

setChatLog(startMessages);
localStorage.setItem("lastGym", gym);

// Fyll direkt första övningens förslag
setWeightInput(isBodyweightExercise(firstExerciseName) ? "" : adjustedSuggestion.weight);
setRepsInput(adjustedSuggestion.reps);
    setCheckInCoachReply("");
    setCheckInInput("");
    setActiveWarmupContext(null);
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
    "Jag hör dig.",
    "Okej.",
    "Jag fattar.",
  ]);
}

function coachDealText() {
  return pickOne([
    "Första setet visar nivån.",
    "Första setet visar nivån.",
    "Vi låter första setet bestämma.",
  ]);
}

function getExerciseMentionIndex(message: string, exercises: LoggedExercise[]) {
  const lower = message.toLowerCase();

  return exercises.findIndex((exercise) => {
    const key = exerciseKey(exercise.name);
    return lower.includes(key) || key.includes(exerciseKey(message));
  });
}

function extractExerciseNameAfter(message: string, triggers: string[]) {
  const lower = message.toLowerCase();

  for (const trigger of triggers) {
    const index = lower.indexOf(trigger);
    if (index === -1) continue;

    return message
      .slice(index + trigger.length)
      .replace(/[.!?]+$/g, "")
      .trim();
  }

  return "";
}

function extractExerciseNameAfterNormalized(message: string, triggers: string[]) {
  const normalized = normalizeExerciseSearchText(message);

  for (const trigger of triggers) {
    const normalizedTrigger = normalizeExerciseSearchText(trigger);
    const index = normalized.indexOf(normalizedTrigger);
    if (index === -1) continue;

    return normalized
      .slice(index + normalizedTrigger.length)
      .replace(/[.!?]+$/g, "")
      .trim();
  }

  return "";
}

type WorkoutChatIntent = {
  topic:
    | "pain"
    | "equipment"
    | "skip"
    | "swap"
    | "addExercise"
    | "fatigue"
    | "strong"
    | "warmup"
    | "conditioning"
    | "general";
  tense: "past" | "present" | "future" | "unknown";
  targetIndex: number | null;
  addExerciseName: string;
  swapFrom: string;
  swapTo: string;
};

function normalizeIntentText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAnyIntent(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function parseWorkoutChatIntent(args: {
  message: string;
  workout: Workout | null;
  exerciseIndex: number;
  plan: string[];
}): WorkoutChatIntent {
  const { message, workout, exerciseIndex, plan } = args;
  const lower = normalizeIntentText(message);
  const workoutExercises = workout?.exercises ?? [];
  const targetIndex = workout
    ? getExerciseMentionIndex(message, workoutExercises)
    : null;
  const resolvedTargetIndex =
    targetIndex !== null && targetIndex >= 0 ? targetIndex : exerciseIndex;

  const base: WorkoutChatIntent = {
    topic: "general",
    tense: "unknown",
    targetIndex: null,
    addExerciseName: "",
    swapFrom: "",
    swapTo: "",
  };

  if (
    includesAnyIntent(lower, [
      "gjorde ont",
      "gor ont",
      "ont",
      "smarta",
      "kanning",
      "kanner av",
    ])
  ) {
    return {
      ...base,
      topic: "pain",
      tense: includesAnyIntent(lower, ["gjorde", "fick", "kande"]) ? "past" : "present",
      targetIndex: workout ? resolvedTargetIndex : null,
    };
  }

  if (
    includesAnyIntent(lower, [
      "upptagen",
      "inte ledig",
      "trasig",
      "finns inte",
      "ingen maskin",
      "maskinen",
    ])
  ) {
    return {
      ...base,
      topic: "equipment",
      tense: "present",
      targetIndex: workout ? resolvedTargetIndex : null,
    };
  }

  if (
    includesAnyIntent(lower, ["lagg till", "lagga till", "lagg in", "ta med"])
  ) {
    return {
      ...base,
      topic: "addExercise",
      tense: "future",
      addExerciseName: extractExerciseNameAfterNormalized(message, [
        "lägg till",
        "lägg in",
        "ta med",
      ]),
    };
  }

  const toIdx = lower.indexOf(" till ");
  if (
    (lower.startsWith("byt ") || lower.startsWith("byt ut ")) &&
    toIdx !== -1
  ) {
    const fromStart = lower.startsWith("byt ut ") ? 7 : 4;
    const fromPart = message.slice(fromStart, toIdx).trim();
    const toPart = message.slice(toIdx + 5).trim();
    const foundFrom = plan.find(
      (ex: string) =>
        exerciseKey(ex).includes(exerciseKey(fromPart)) ||
        exerciseKey(fromPart).includes(exerciseKey(ex))
    );

    return {
      ...base,
      topic: "swap",
      tense: "future",
      swapFrom: foundFrom ?? fromPart,
      swapTo: toPart,
    };
  }

  if (
    includesAnyIntent(lower, ["byt", "ersatt", "vill inte", "orkar inte", "hatar"])
  ) {
    const found = plan.find((ex: string) =>
      lower.includes(normalizeIntentText(ex))
    );

    return {
      ...base,
      topic: "swap",
      tense: "future",
      swapFrom: found ?? "",
      swapTo: found ? suggestReplacementFor(found) : "",
    };
  }

  if (includesAnyIntent(lower, ["hoppa over", "skippa", "ta bort"])) {
    return {
      ...base,
      topic: "skip",
      tense: "future",
      targetIndex: workout ? resolvedTargetIndex : null,
    };
  }

  if (includesAnyIntent(lower, ["trott", "tung", "sov", "helt slut", "sliten"])) {
    return { ...base, topic: "fatigue", tense: "present" };
  }

  if (includesAnyIntent(lower, ["stark", "latt", "bra", "pigga", "enkelt"])) {
    return { ...base, topic: "strong", tense: "present" };
  }

  if (buildWarmupContext(message)) {
    return {
      ...base,
      topic: "warmup",
      tense: includesAnyIntent(lower, ["varmde", "har varmt", "varmt upp"])
        ? "past"
        : "unknown",
    };
  }

  if (buildConditioningContext(message)) {
    return {
      ...base,
      topic: "conditioning",
      tense: includesAnyIntent(lower, ["sprang", "cyklade", "rodde", "gjorde"])
        ? "past"
        : includesAnyIntent(lower, ["ska", "kommer", "forst", "innan", "fore"])
        ? "future"
        : "unknown",
    };
  }

  return base;
}

async function sendChat() {
  const msg = chatInput.trim();
  if (!msg) return;

  // Lägg in ditt meddelande
  setChatLog((prev) => [...prev, { role: "you", text: msg }]);
  setChatInput("");

  const reply = (text: string, aiStatus?: "fallback") => {
    setChatLog((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "coach" && last.text === text) return prev;
      return [...prev, { role: "coach", text, aiStatus }];
    });
  };
  const replyFromAi = (response: {
    mode?: "ai" | "fallback";
    text: string;
  }) => {
    reply(response.text, response.mode === "ai" ? undefined : "fallback");
  };

  const routedIntent = parseWorkoutChatIntent({
    message: msg,
    workout,
    exerciseIndex,
    plan,
  });
  const routedWarmupContext = buildWarmupContext(msg);
  const routedConditioningContext = buildConditioningContext(msg);
  const routedHasAnyLoggedSet =
    workout?.exercises?.some((ex) => ex.sets.length > 0) ?? false;
  const normalizedChatMessage = normalizeIntentText(msg);
  const lastCoachMessage =
    [...chatLog].reverse().find((message) => message.role === "coach")?.text || "";
  const currentWorkoutExercise = workout?.exercises?.[exerciseIndex];
  const aiUnavailableReply = buildLocalWorkoutChatFallback({
    message: msg,
    userName: profileName,
    exerciseName: currentExerciseName,
    dayForm,
    currentSets: currentWorkoutExercise?.sets ?? [],
  });
  const askAiCoach = async (fallbackReply: string, overrides?: {
    dayForm?: DayForm | null;
    warmupContext?: WarmupContext | null;
    conditioningContext?: ConditioningContext | null;
  }) => {
    const response = await requestAiCoachChatReply({
      context: {
        kind: "workout_chat",
        userName: profileName,
        userMessage: msg,
        goalPrimary: userProfile?.goalPrimary ?? "styrka",
        passLabel: currentPassLabel,
        dayForm: overrides?.dayForm ?? dayForm,
        currentExerciseName,
        currentExerciseCategory: currentExerciseName
          ? getExerciseProfile(currentExerciseName).category
          : undefined,
        exerciseIndex: workout ? exerciseIndex + 1 : undefined,
        exerciseCount: workout?.exercises.length,
        currentSets: currentWorkoutExercise?.sets.map((set) => ({
          weight: set.weight,
          reps: set.reps,
          rir: set.rir,
          failNote: set.failNote,
        })),
        currentCoachDecision:
          currentWorkoutExercise && currentWorkoutExercise.sets.length > 0
            ? (() => {
                const latestSet =
                  currentWorkoutExercise.sets[
                    currentWorkoutExercise.sets.length - 1
                  ];
                const decision = getNextSetPlan({
                  weight: latestSet.weight,
                  reps: latestSet.reps,
                  rir: latestSet.rir ?? 2,
                  failNote: latestSet.failNote,
                  setNumber: currentWorkoutExercise.sets.length,
                  exerciseName: currentExerciseName,
                  previousSets: currentWorkoutExercise.sets.slice(0, -1),
                });

                return {
                  strategy: decision.strategy,
                  reason: decision.reason,
                  nextWeight:
                    decision.strategy === "complete"
                      ? undefined
                      : `${formatWeightInput(decision.weight)} kg`,
                  targetReps:
                    decision.strategy === "complete"
                      ? undefined
                      : decision.repsText,
                  targetRir:
                    decision.strategy === "complete"
                      ? undefined
                      : decision.rirText,
                  restText: decision.restText,
                  techniqueCue: decision.techniqueCue,
                };
              })()
            : undefined,
        activePlan,
        warmupNote:
          overrides?.warmupContext?.note ?? activeWarmupContext?.note,
        conditioningNote:
          overrides?.conditioningContext?.note ?? activeConditioningContext?.note,
        previousCoachReply: lastCoachMessage,
      },
      fallbackReply,
    });

    if (process.env.NODE_ENV !== "production" && response.mode !== "ai") {
      console.warn("MinCoach chat fallback", {
        reason: response.reason,
        message: msg,
        fallbackReply,
      });
    }

    return response;
  };
  const confirmsPendingSwap =
    workout &&
    swapFrom &&
    swapToInput &&
    includesAnyIntent(normalizeIntentText(msg), [
      "ja",
      "bekrafta",
      "byt",
      "kor",
      "ok",
      "okej",
      "stammer",
    ]);

  if (confirmsPendingSwap) {
    replaceExerciseInCurrentWorkout(swapFrom, swapToInput);
    return;
  }

  if (workout && isProgressionQuestion(msg)) {
    const chatReply = await askAiCoach(aiUnavailableReply);
    replyFromAi(chatReply);
    return;
  }

  if (workout && isExerciseSafetyQuestion(msg)) {
    const chatReply = await askAiCoach(buildExerciseSafetyReply(currentExerciseName));
    replyFromAi(chatReply);
    return;
  }

  if (
    workout &&
    lastCoachMessage.toLowerCase().includes("risk") &&
    includesAnyIntent(normalizedChatMessage, [
      "kor en till",
      "kör en till",
      "en till",
      "fortsatt",
      "fortsätt",
      "testar igen",
    ])
  ) {
    reply(
      "Jag vill inte att du pressar den här vidare om det gör ont. Det är inte fegt att lämna en övning. Tryck Hoppa över, så fortsätter vi med något som känns bättre."
    );
    return;
  }

  if (routedIntent.topic === "pain") {
    const nextWarmupContext = routedWarmupContext ?? activeWarmupContext;
    const painExerciseName =
      workout && routedIntent.targetIndex !== null
        ? workout.exercises[routedIntent.targetIndex]?.name ?? currentExerciseName
        : currentExerciseName;

    if (routedWarmupContext) {
      setActiveWarmupContext(routedWarmupContext);
      setWorkout((current) =>
        current ? { ...current, warmupContext: routedWarmupContext } : current
      );
    }

    if (workout) {
      savePainCoachMemory(painExerciseName, msg);
    }

    const chatReply = await askAiCoach(
      workout
        ? getPainCoachActionText(nextWarmupContext)
        : getPainCoachReply(nextWarmupContext),
      { warmupContext: nextWarmupContext }
    );
    replyFromAi(chatReply);
    return;
  }

  if (routedIntent.topic === "equipment") {
    if (!workout || routedIntent.targetIndex === null) {
      reply("Okej. Vilken övning gäller det?");
      return;
    }

    const targetExercise = workout.exercises[routedIntent.targetIndex];
    const suggestion = suggestReplacementFor(targetExercise.name);
    setSwapFrom(targetExercise.name);
    setSwapToInput(suggestion);
    reply(
      `${targetExercise.name} verkar inte gå just nu. Jag har ett förslag: ${suggestion}. Bekräfta om du vill byta.`
    );
    return;
  }

  if (routedIntent.topic === "addExercise") {
    if (workout && routedIntent.addExerciseName) {
      addExerciseToCurrentWorkout(routedIntent.addExerciseName);
      return;
    }

    reply("Vilken övning vill du lägga till?");
    return;
  }

  if (routedIntent.topic === "swap") {
    if (routedIntent.swapFrom && routedIntent.swapTo) {
      setSwapFrom(routedIntent.swapFrom);
      setSwapToInput(routedIntent.swapTo);
      reply(
        `Jag kan byta ${routedIntent.swapFrom} mot ${routedIntent.swapTo}. Bekräfta om du vill göra bytet.`
      );
      return;
    }

    reply("Vilken övning vill du byta ut?");
    return;
  }

  if (routedIntent.topic === "skip") {
    if (workout && routedIntent.targetIndex !== null) {
      const targetExercise = workout.exercises[routedIntent.targetIndex];
      reply(
        `${targetExercise.name} kan vi lämna idag. Tryck Hoppa över om du vill göra det.`
      );
      return;
    }

    reply("Vilken övning vill du hoppa över?");
    return;
  }

  if (routedConditioningContext) {
    setActiveConditioningContext(routedConditioningContext);
    setWorkout((current) =>
      current
        ? { ...current, conditioningContext: routedConditioningContext }
        : current
    );
    const chatReply = await askAiCoach(aiUnavailableReply, {
      conditioningContext: routedConditioningContext,
    });
    replyFromAi(chatReply);
    return;
  }

  if (routedWarmupContext) {
    setActiveWarmupContext(routedWarmupContext);
    setWorkout((current) =>
      current ? { ...current, warmupContext: routedWarmupContext } : current
    );
    const chatReply = await askAiCoach(aiUnavailableReply, {
      warmupContext: routedWarmupContext,
    });
    replyFromAi(chatReply);
    return;
  }

  if (routedIntent.topic === "fatigue") {
    if (!routedHasAnyLoggedSet) {
      setDayForm("trött");
      setWeightInput((prev) =>
        !isBodyweightExercise(currentExerciseName) && prev.trim() === ""
          ? adjustedSuggestion.weight
          : prev
      );
      const chatReply = await askAiCoach(aiUnavailableReply, {
        dayForm: "trött",
      });
      replyFromAi(chatReply);
      return;
    }

    const last = lastByExercise[exerciseKey(currentExerciseName)];
    const lastHadTargets = didHitTargets(last, goalTargets.targetReps);
    const hold = shouldHoldYouToPlan({ dayForm, lastHadTargets });

    if (hold) {
      setDayForm("normal");
      const chatReply = await askAiCoach(aiUnavailableReply, {
        dayForm: "normal",
      });
      replyFromAi(chatReply);
      return;
    }

    setDayForm("trött");
    setWeightInput((prev) =>
      !isBodyweightExercise(currentExerciseName) && prev.trim() === ""
        ? adjustedSuggestion.weight
        : prev
    );
    const chatReply = await askAiCoach(aiUnavailableReply, {
      dayForm: "trött",
    });
    replyFromAi(chatReply);
    return;
  }

  if (routedIntent.topic === "strong") {
    setDayForm("stark");
    const chatReply = await askAiCoach(aiUnavailableReply, {
      dayForm: "stark",
    });
    replyFromAi(chatReply);
    return;
  }

  const chatReply = await askAiCoach(aiUnavailableReply);

  replyFromAi(chatReply);
  return;
}

function addCustomExercise(pass: PassType, nameRaw: string) {
  const resolved = resolveExerciseName(nameRaw);
  if (resolved.status === "empty") return;

  if (resolved.status === "suggest") {
    setCustomExerciseInput(resolved.suggestion);
    setCheckInCoachReply(
      `Menar du ${resolved.suggestion}? Jag har fyllt i det namnet. Tryck igen om det stämmer.`
    );
    return;
  }

  if (resolved.status === "needsCategory") {
    setCustomExerciseInput(`egen ben: ${resolved.name}`);
    setCheckInCoachReply(
      "Vad tränar den främst? Skriv till exempel egen ben:, egen rygg: eller egen armar:. Jag fyllde i ben som exempel."
    );
    return;
  }

  if (resolved.status === "unknown") {
    setCheckInCoachReply(
      "Jag är osäker på vilken övning du menar. Skriv gärna det vanligaste namnet, eller börja med egen: om du vill lägga in den exakt så."
    );
    return;
  }

  const name = resolved.name;

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

function addTodayExercise(pass: PassType, nameRaw: string) {
  const resolved = resolveExerciseName(nameRaw);
  if (resolved.status === "empty") return;

  if (resolved.status === "suggest") {
    setCustomExerciseInput(resolved.suggestion);
    setCheckInCoachReply(
      `Menar du ${resolved.suggestion}? Jag har fyllt i det namnet. Tryck igen om det stämmer.`
    );
    return;
  }

  if (resolved.status === "needsCategory") {
    setCustomExerciseInput(`egen ben: ${resolved.name}`);
    setCheckInCoachReply(
      "Vad tränar den främst? Skriv till exempel egen ben:, egen rygg: eller egen armar:. Jag fyllde i ben som exempel."
    );
    return;
  }

  if (resolved.status === "unknown") {
    setCheckInCoachReply(
      "Jag är osäker på vilken övning du menar. Skriv gärna det vanligaste namnet, eller börja med egen: om du vill lägga in den exakt så."
    );
    return;
  }

  const name = resolved.name;

  setTodayExercisesByPass((prev) => {
    const next: CustomExercisesByPass = {
      ...prev,
      [pass]: mergePlan(prev[pass] ?? [], [name]),
    };

    return next;
  });
}

function removeTodayExercise(pass: PassType, nameToRemove: string) {
  setTodayExercisesByPass((prev) => ({
    ...prev,
    [pass]: (prev[pass] ?? []).filter(
      (name) => exerciseKey(name) !== exerciseKey(nameToRemove)
    ),
  }));
}

function addExerciseToCurrentWorkout(nameRaw: string) {
  if (!workout) return;

  const resolved = resolveExerciseName(nameRaw);
  if (resolved.status === "empty") return;

  if (resolved.status === "suggest") {
    setWorkoutExerciseInput(resolved.suggestion);
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: `Menar du ${resolved.suggestion}? Jag har fyllt i det namnet. Tryck plus igen om det stämmer.`,
      },
    ]);
    return;
  }

  if (resolved.status === "needsCategory") {
    setWorkoutExerciseInput(`egen ben: ${resolved.name}`);
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: "Vad tränar den främst? Skriv till exempel egen ben:, egen rygg: eller egen armar:. Jag fyllde i ben som exempel.",
      },
    ]);
    return;
  }

  if (resolved.status === "unknown") {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: "Jag är osäker på vilken övning du menar. Skriv gärna det vanligaste namnet, eller börja med egen: om du vill lägga in den exakt så.",
      },
    ]);
    return;
  }

  const name = resolved.name;

  const key = exerciseKey(name);
  const alreadyInWorkout = workout.exercises.some(
    (exercise) => exerciseKey(exercise.name) === key
  );

  if (alreadyInWorkout) {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: `${name} ligger redan i passet.`,
      },
    ]);
    setWorkoutExerciseInput("");
    return;
  }

  setWorkout({
    ...workout,
    exercises: [...workout.exercises, { name, sets: [] }],
  });
  setWorkoutExerciseInput("");
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: `Bra, vi lägger till ${name}.`,
    },
  ]);
}

function replaceExerciseInCurrentWorkout(fromName: string, toNameRaw: string) {
  if (!workout) return;

  const resolved = resolveExerciseName(toNameRaw);
  if (resolved.status !== "known") {
    addExerciseToCurrentWorkout(toNameRaw);
    return;
  }

  const fromKey = exerciseKey(fromName);
  const replacementName = resolved.name;
  const alreadyInWorkout = workout.exercises.some(
    (exercise) => exerciseKey(exercise.name) === exerciseKey(replacementName)
  );

  if (alreadyInWorkout) {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: `${replacementName} ligger redan i dagens pass.`,
      },
    ]);
    return;
  }

  setWorkout({
    ...workout,
    exercises: workout.exercises.map((exercise) =>
      exerciseKey(exercise.name) === fromKey
        ? { ...exercise, name: replacementName }
        : exercise
    ),
  });
  setSwapFrom(null);
  setSwapToInput("");
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: `Bra, vi kör ${replacementName} i dagens pass.`,
    },
  ]);
}

function addExerciseDuringWorkout() {
  addExerciseToCurrentWorkout(workoutExerciseInput);
}

function resetWorkoutInputs() {
  setWeightInput("");
  setRepsInput("");
  setDurationSecondsInput(0);
  setFailNoteInput("");
  setRirInput(2);
  setDidFailInput(false);
}

function skipExerciseAtIndex(targetIndex: number, coachText?: string | null) {
  if (!workout) return;

  const exercise = workout.exercises[targetIndex];
  if (!exercise) return;

  if (exercise.sets.length > 0) {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: "Du har redan loggat set här. Vi lämnar den kvar.",
      },
    ]);
    return;
  }

  if (workout.exercises.length <= 1) {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: "Det här är sista övningen. Lägg till en ersättning först.",
      },
    ]);
    return;
  }

  const nextExercises = workout.exercises.filter((_, index) => index !== targetIndex);
  const nextIndex =
    targetIndex < exerciseIndex
      ? Math.max(0, exerciseIndex - 1)
      : targetIndex === exerciseIndex
      ? targetIndex
      : exerciseIndex;

  setWorkout({
    ...workout,
    exercises: nextExercises,
  });
  setSkippedExercise({
    exercise,
    index: targetIndex,
  });
  setExerciseIndex(Math.min(nextIndex, nextExercises.length - 1));
  resetWorkoutInputs();
  if (coachText !== null) {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: coachText ?? `Okej, vi hoppar över ${exercise.name}.`,
      },
    ]);
  }
}

function skipCurrentExercise() {
  skipExerciseAtIndex(exerciseIndex);
}

function undoSkipExercise() {
  if (!workout || !skippedExercise) return;

  const insertIndex = Math.min(skippedExercise.index, workout.exercises.length);
  const nextExercises = [...workout.exercises];
  nextExercises.splice(insertIndex, 0, skippedExercise.exercise);

  setWorkout({
    ...workout,
    exercises: nextExercises,
  });
  setExerciseIndex(insertIndex);
  resetWorkoutInputs();
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: `${skippedExercise.exercise.name} är tillbaka.`,
    },
  ]);
  setSkippedExercise(null);
}

function savePainCoachMemory(exerciseName: string, note: string) {
  if (!workout) return;

  const painNote: CoachNote = {
    createdAt: new Date().toISOString(),
    pass: workout.pass,
    gym: workout.gym,
    exerciseName,
    text: `${exerciseName}: användaren kände smärta/känning. ${note}`,
  };
  const nextMemory: CoachMemory = {
    notes: [painNote, ...coachMemory.notes].slice(0, 50),
  };

  setCoachMemory(nextMemory);
  saveJSON("coachMemory", nextMemory);
  void syncBetaCoachMemory(nextMemory.notes);
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
// Om passet redan pågår: uppdatera workout.exercises också
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
  if (key.includes("knöböj")) return "Benpress";
  if (key.includes("bänkpress")) return "Hantelpress";
  if (key.includes("militärpress")) return "Hantelpress (axlar)";
  if (key.includes("latsdrag")) return "Chins (assisterade)";
  if (key.includes("benspark")) return "Goblet squat";
  if (key.includes("vadpress")) return "Tåhävningar med hantlar";
  if (key.includes("sidolyft")) return "Kabellyft åt sidan";
  if (key.includes("rodd")) return "Sittande kabelrodd";
  if (key.includes("curl")) return "Hantelcurl";
  if (key.includes("triceps")) return "Triceps pushdown med rep";

  return "";
}

function isVagueProgramExerciseName(name: string) {
  const key = normalizeExerciseSearchText(name);
  return (
    !key ||
    key.includes("narmsta liknande") ||
    key.includes("liknande ovning") ||
    key === "alternativ" ||
    key === "ersattning" ||
    key === "annan ovning" ||
    key === "nagot annat"
  );
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

function removeExercisesFromProgram(
  matcher: (exerciseName: string) => boolean,
  replacementForPass?: (pass: WorkoutPass, removed: string[]) => string | null
) {
  if (!workoutPlan) return [];

  const removedByPass = workoutPlan.passes
    .map((pass) => ({
      pass,
      removed: pass.exercises
        .map((exercise) => exercise.name)
        .filter((name) => matcher(name)),
    }))
    .filter((entry) => entry.removed.length > 0);

  if (removedByPass.length === 0) return [];

  setRemovedExercisesByPass((prev) => {
    const next: RemovedExercisesByPass = { ...prev };

    for (const { pass, removed } of removedByPass) {
      const current = next[pass.key] ?? [];
      next[pass.key] = mergePlan(current, removed);
    }

    saveJSON("removedExercisesByPass", next);
    return next;
  });

  setCustomExercisesByPass((prev) => {
    const next: CustomExercisesByPass = { ...prev };

    for (const { pass, removed } of removedByPass) {
      const replacement = replacementForPass?.(pass, removed);
      if (!replacement) continue;

      next[pass.key] = mergePlan(next[pass.key] ?? [], [replacement]);
    }

    saveJSON("customExercisesByPass", next);
    return next;
  });

  return removedByPass;
}

function addProgramFocusExercise(matchPass: (pass: WorkoutPass) => boolean, exercise: string) {
  if (!workoutPlan) return 0;

  const resolved = resolveExerciseName(exercise);
  const exerciseName = resolved.status === "known" ? resolved.name : exercise;
  const targetPasses = workoutPlan.passes.filter(matchPass);
  if (targetPasses.length === 0) return 0;

  setCustomExercisesByPass((prev) => {
    const next: CustomExercisesByPass = { ...prev };

    for (const pass of targetPasses) {
      next[pass.key] = mergePlan(next[pass.key] ?? [], [exerciseName]);
    }

    saveJSON("customExercisesByPass", next);
    return next;
  });

  return targetPasses.length;
}

function shortenProgramPasses() {
  if (!workoutPlan) return 0;

  const removedByPass = workoutPlan.passes
    .map((pass) => {
      if (pass.exercises.length <= 4) return null;

      const accessory = [...pass.exercises]
        .reverse()
        .find((exercise) => {
          const key = exerciseKey(exercise.name);
          return (
            key.includes("curl") ||
            key.includes("triceps") ||
            key.includes("crunch") ||
            key.includes("cable cross") ||
            key.includes("sidolyft")
          );
        });

      return accessory ? { pass, removed: accessory.name } : null;
    })
    .filter((entry): entry is { pass: WorkoutPass; removed: string } =>
      Boolean(entry)
    );

  if (removedByPass.length === 0) return 0;

  setRemovedExercisesByPass((prev) => {
    const next: RemovedExercisesByPass = { ...prev };

    for (const { pass, removed } of removedByPass) {
      next[pass.key] = mergePlan(next[pass.key] ?? [], [removed]);
    }

    saveJSON("removedExercisesByPass", next);
    return next;
  });

  return removedByPass.length;
}

function normalizeProgramExerciseName(rawName: string) {
  if (isVagueProgramExerciseName(rawName)) return "";

  const resolved = resolveExerciseName(rawName);

  if (resolved.status === "known") return resolved.name;
  if (resolved.status === "suggest") return resolved.suggestion;
  if (resolved.status === "needsCategory") return resolved.name;
  if (resolved.status === "unknown") return resolved.name;

  return "";
}

function getProgramPassesWithExercise(exerciseName: string) {
  if (!workoutPlan) return [];

  const exerciseNameKey = exerciseKey(exerciseName);
  return workoutPlan.passes.filter((pass) =>
    pass.exercises.some((exercise) => exerciseKey(exercise.name) === exerciseNameKey)
  );
}

function parseProgramSwap(preference: string) {
  const normalized = normalizeExerciseSearchText(preference);
  const swapMatch = normalized.match(
    /(?:byt|byta ut|ersatt|ersatta|ersätt|ersätta)\s+(.+?)\s+(?:mot|till|med)\s+(.+)/
  );
  const preferMatch = normalized.match(/hellre\s+(.+?)\s+(?:an|än)\s+(.+)/);
  const match = swapMatch
    ? { fromRaw: swapMatch[1], toRaw: swapMatch[2] }
    : preferMatch
    ? { fromRaw: preferMatch[2], toRaw: preferMatch[1] }
    : null;

  if (!match) return null;

  const clean = (value: string) =>
    cleanProgramExerciseRequest(
      value.split(/\b(?:tack|snälla|snalla|istallet|istället|i stallet|i stället)\b/i)[0]
    )
      .replace(/\s+/g, " ")
      .trim();

  const fromName = normalizeProgramExerciseName(clean(match.fromRaw));
  const toName = normalizeProgramExerciseName(clean(match.toRaw));

  if (!fromName || !toName) return null;

  return { fromName, toName };
}

function cleanProgramExerciseRequest(value: string) {
  return value
    .split(
      /\b(?:från|fran|i|ur|på|pa)\s+(?:helkropp|överkropp|overkropp|underkropp|ben|armar|passet|pass|upplägget|upplagget|schemat)\b/i
    )[0]
    .split(/\b(?:tack|snälla|snalla)\b/i)[0]
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function swapProgramExercise(fromName: string, toName: string) {
  const matchingPasses = getProgramPassesWithExercise(fromName);

  for (const pass of matchingPasses) {
    setExerciseOverride(pass.key, fromName, toName);
  }

  return matchingPasses.length;
}

function resolveProgramSuggestionPass(
  action: CoachProgramSuggestionAction
): PassType | null {
  if (!workoutPlan) return null;

  if ("passKey" in action && action.passKey) {
    const exists = workoutPlan.passes.some((pass) => pass.key === action.passKey);
    if (exists) return action.passKey;
  }

  if ("passName" in action && action.passName) {
    const requested = normalizeExerciseSearchText(action.passName);
    const matchingPass = workoutPlan.passes.find((pass) => {
      const displayName = normalizeExerciseSearchText(pass.displayName);
      return displayName.includes(requested) || requested.includes(displayName);
    });

    if (matchingPass) return matchingPass.key;
  }

  const exerciseName =
    action.type === "add_exercise" ? action.exerciseName : "";
  const category = exerciseName
    ? normalizeExerciseSearchText(getExerciseProfile(exerciseName).category)
    : "";

  const categoryMatch = workoutPlan.passes.find((pass) => {
    const displayName = normalizeExerciseSearchText(pass.displayName);
    if (category === "ben") {
      return displayName.includes("underkropp") || displayName.includes("ben");
    }
    if (category === "brost" || category === "rygg" || category === "axlar" || category === "armar") {
      return displayName.includes("overkropp") || displayName.includes("helkropp");
    }
    return displayName.includes("helkropp");
  });

  if (categoryMatch) return categoryMatch.key;

  return [...workoutPlan.passes].sort(
    (a, b) => a.exercises.length - b.exercises.length
  )[0]?.key ?? null;
}

function applyPendingProgramSuggestion() {
  if (!pendingProgramSuggestion || !workoutPlan) return;

  const nextCustom: CustomExercisesByPass = {
    ...customExercisesByPass,
    A: [...(customExercisesByPass.A ?? [])],
    B: [...(customExercisesByPass.B ?? [])],
    C: [...(customExercisesByPass.C ?? [])],
    D: [...(customExercisesByPass.D ?? [])],
  };
  const nextRemoved: RemovedExercisesByPass = {
    ...removedExercisesByPass,
    A: [...(removedExercisesByPass.A ?? [])],
    B: [...(removedExercisesByPass.B ?? [])],
    C: [...(removedExercisesByPass.C ?? [])],
    D: [...(removedExercisesByPass.D ?? [])],
  };
  const nextOverrides: ExerciseOverridesByPass = {
    ...exerciseOverridesByPass,
    A: { ...(exerciseOverridesByPass.A ?? {}) },
    B: { ...(exerciseOverridesByPass.B ?? {}) },
    C: { ...(exerciseOverridesByPass.C ?? {}) },
    D: { ...(exerciseOverridesByPass.D ?? {}) },
  };
  const nextNames: PassDisplayNamesByPass = { ...passDisplayNamesByPass };
  let changedCount = 0;

  for (const action of pendingProgramSuggestion.actions) {
    if (action.type === "add_exercise") {
      const passKey = resolveProgramSuggestionPass(action);
      const exerciseName = normalizeProgramExerciseName(action.exerciseName);
      if (!passKey || !exerciseName) continue;

      nextCustom[passKey] = mergePlan(nextCustom[passKey] ?? [], [exerciseName]);
      changedCount += 1;
      continue;
    }

    if (action.type === "remove_exercise") {
      const nameToRemove = normalizeProgramExerciseName(action.exerciseName);
      const keyToRemove = exerciseKey(nameToRemove);
      if (!nameToRemove) continue;

      for (const pass of workoutPlan.passes) {
        const hasExercise = pass.exercises.some(
          (exercise) => exerciseKey(exercise.name) === keyToRemove
        );
        if (!hasExercise) continue;

        nextRemoved[pass.key] = mergePlan(nextRemoved[pass.key] ?? [], [nameToRemove]);
        nextCustom[pass.key] = (nextCustom[pass.key] ?? []).filter(
          (name) => exerciseKey(name) !== keyToRemove
        );
        changedCount += 1;
      }
      continue;
    }

    if (action.type === "replace_exercise") {
      const fromName = normalizeProgramExerciseName(action.fromExerciseName);
      const toName = normalizeProgramExerciseName(action.toExerciseName);
      const fromKey = exerciseKey(fromName);
      if (!fromName || !toName) continue;

      for (const pass of workoutPlan.passes) {
        const hasExercise = pass.exercises.some(
          (exercise) => exerciseKey(exercise.name) === fromKey
        );
        if (!hasExercise) continue;

        nextOverrides[pass.key] = {
          ...(nextOverrides[pass.key] ?? {}),
          [fromKey]: toName,
        };
        changedCount += 1;
      }
      continue;
    }

    if (action.type === "rename_pass") {
      nextNames[action.passKey] = action.displayName.trim();
      changedCount += 1;
    }
  }

  setCustomExercisesByPass(nextCustom);
  setRemovedExercisesByPass(nextRemoved);
  setExerciseOverridesByPass(nextOverrides);
  setPassDisplayNamesByPass(nextNames);
  saveJSON("customExercisesByPass", nextCustom);
  saveJSON("removedExercisesByPass", nextRemoved);
  saveJSON("exerciseOverridesByPass", nextOverrides);
  saveJSON("passDisplayNamesByPass", nextNames);

  setPendingProgramSuggestion(null);
  setProgramPreferenceReply(
    changedCount > 0
      ? "Klart. Jag har lagt in ändringen i upplägget."
      : "Jag kunde inte lägga in det automatiskt. Skriv gärna lite mer exakt vad du vill ändra."
  );
}

async function applyProgramPreference(preferenceRaw: string) {
  const preference = preferenceRaw.trim();
  const lower = preference.toLowerCase();

  if (!preference || !workoutPlan) return "";
  setPendingProgramSuggestion(null);

  if (
    userProfile &&
    (/\b(dag|pass)\s*[1-4a-d]\s*:?\s*/i.test(preference) ||
      lower.includes("eget upplägg") ||
      lower.includes("eget schema"))
  ) {
    const manualPlan = parseManualWorkoutPlan(preference, userProfile);

    if (!manualPlan) {
      return 'Jag ser att du vill lägga in ett eget upplägg. Skriv gärna så här: "Dag 1: bänkpress, hantelpress. Dag 2: latsdrag, rodd."';
    }

    setCustomWorkoutPlan(manualPlan);
    saveJSON("customWorkoutPlan", manualPlan);
    setRemovedExercisesByPass({ A: [], B: [], C: [], D: [] });
    setExerciseOverridesByPass({ A: {}, B: {}, C: {}, D: {} });
    setCustomExercisesByPass({ A: [], B: [], C: [], D: [] });
    saveJSON("removedExercisesByPass", { A: [], B: [], C: [], D: [] });
    saveJSON("exerciseOverridesByPass", { A: {}, B: {}, C: {}, D: {} });
    saveJSON("customExercisesByPass", { A: [], B: [], C: [], D: [] });

    const exerciseCount = manualPlan.passes.reduce(
      (sum, pass) => sum + pass.exercises.length,
      0
    );

    return `Absolut. Jag har lagt in ditt eget upplägg: ${manualPlan.passes.length} pass och ${exerciseCount} övningar. Jag håller koll på progressionen ovanpå det.`;
  }

  const wantsMore =
    lower.includes("mer") ||
    lower.includes("extra") ||
    lower.includes("fokus");
  const wantsLessOrAvoid =
    lower.includes("inte") ||
    lower.includes("undvik") ||
    lower.includes("hatar") ||
    lower.includes("gillar inte") ||
    lower.includes("tycker inte om") ||
    lower.includes("vill inte köra") ||
    lower.includes("ta bort") ||
    lower.includes("plocka bort") ||
    lower.includes("radera") ||
    lower.includes("skippa");
  const wantsAddExercise =
    lower.includes("lägg till") ||
    lower.includes("lägga till") ||
    lower.includes("ta med") ||
    lower.includes("vill ha");
  const asksAboutSafetyOrFit =
    lower.includes("?") ||
    lower.includes("är detta bra") ||
    lower.includes("ar detta bra") ||
    lower.includes("orolig") ||
    lower.includes("rädd") ||
    lower.includes("radd") ||
    lower.includes("förklara") ||
    lower.includes("forklara") ||
    lower.includes("varför") ||
    lower.includes("varfor") ||
    lower.includes("resultat") ||
    lower.includes("funkar") ||
    lower.includes("kommer funka") ||
    lower.includes("hjälpa") ||
    lower.includes("hjalpa") ||
    lower.includes("farligt") ||
    lower.includes("säker") ||
    lower.includes("saker") ||
    lower.includes("ont") ||
    lower.includes("smärta") ||
    lower.includes("smarta") ||
    lower.includes("känns fel") ||
    lower.includes("kanns fel") ||
    lower.includes("obehag") ||
    lower.includes("70 år") ||
    lower.includes("70 ar") ||
    lower.includes("äldre") ||
    lower.includes("aldre") ||
    lower.includes("smalare") ||
    lower.includes("gå ner") ||
    lower.includes("ga ner") ||
    lower.includes("fett") ||
    lower.includes("viktnedgång") ||
    lower.includes("viktnedgang");

  const swapRequest = parseProgramSwap(preference);
  if (swapRequest) {
    const changedCount = swapProgramExercise(swapRequest.fromName, swapRequest.toName);

    return changedCount > 0
      ? `Klart. Jag byter ${swapRequest.fromName} mot ${swapRequest.toName}.`
      : `Jag hittar inte ${swapRequest.fromName} i upplägget. Skriv gärna vilken övning du vill byta bort.`;
  }

  if (
    lower.includes("tränar hemma") ||
    lower.includes("tranar hemma") ||
    lower.includes("hemma") ||
    lower.includes("bara hantlar") ||
    lower.includes("har hantlar") ||
    lower.includes("inga maskiner") ||
    lower.includes("ingen maskin") ||
    lower.includes("saknar kabel") ||
    lower.includes("utan kabel")
  ) {
    return 'Bra att du säger det. Utrustningen styr hela upplägget. Tryck "Ändra mina svar" och välj plats/utrustning, eller skriv exakt vad du vill byta, till exempel "byt latsdrag mot hantelrodd".';
  }

  if (
    lower.includes("för svårt") ||
    lower.includes("for svart") ||
    lower.includes("för tungt") ||
    lower.includes("for tungt") ||
    lower.includes("för avancerat") ||
    lower.includes("for avancerat") ||
    lower.includes("nybörjare") ||
    lower.includes("nyborjare") ||
    lower.includes("ovan")
  ) {
    const count = shortenProgramPasses();

    return count > 0
      ? "Bra att du säger det. Jag gör passen lite lugnare och tar bort sånt som inte behövs just nu."
      : "Bra att du säger det. Då börjar vi lugnare: kontrollerade set, ingen maxning och tydlig marginal i början.";
  }

  if (asksAboutSafetyOrFit && !wantsAddExercise && !wantsLessOrAvoid) {
    const mentionsResults =
      lower.includes("resultat") ||
      lower.includes("funkar") ||
      lower.includes("kommer funka") ||
      lower.includes("hjälpa") ||
      lower.includes("hjalpa") ||
      lower.includes("utveckling") ||
      lower.includes("starkare") ||
      lower.includes("bygga muskler") ||
      lower.includes("muskler");
    const mentionsExplanation =
      lower.includes("förklara") ||
      lower.includes("forklara") ||
      lower.includes("varför") ||
      lower.includes("varfor") ||
      lower.includes("valt upplägget") ||
      lower.includes("valt upplagget");
    const mentionsKnee =
      lower.includes("knä") ||
      lower.includes("kna") ||
      lower.includes("knäna") ||
      lower.includes("knana");
    const mentionsAgeOrRisk =
      lower.includes("70") ||
      lower.includes("äldre") ||
      lower.includes("aldre") ||
      lower.includes("orolig") ||
      lower.includes("rädd") ||
      lower.includes("radd") ||
      mentionsKnee ||
      lower.includes("ont") ||
      lower.includes("smärta") ||
      lower.includes("smarta") ||
      lower.includes("känns fel") ||
      lower.includes("kanns fel") ||
      lower.includes("obehag") ||
      lower.includes("farligt") ||
      lower.includes("säker") ||
      lower.includes("saker");

    const fallbackReply = mentionsKnee
      ? "Bra att du säger det. Då ska upplägget kännas tryggt för knäna. Vi börjar med kontrollerade set, ingen maxning och övningar som går att justera direkt om något känns fel. Gör det ont går smärta före planen. Vill du kan jag göra benpassen ännu lugnare."
      : lower.includes("smalare") || lower.includes("fett") || lower.includes("gå ner") || lower.includes("ga ner")
      ? "Ja, styrketräning passar även när målet är att bli smalare. Den hjälper kroppen behålla muskler och form medan kosten styr viktnedgången mest. Vill du kan jag göra upplägget mer fettminskningsvänligt."
      : mentionsResults
      ? "Jag fattar. Resultat kommer inte av ett perfekt pass, utan av att vi kan upprepa bra pass vecka efter vecka. Det här upplägget ger oss något att följa, höja och justera. Vill du kan jag förklara exakt hur progressionen ska ske."
      : mentionsExplanation
      ? "Jag valde upplägget för att ge dig tydliga pass som går att upprepa och följa. Målet är att vi ska kunna se vad som blir starkare, vad som känns bra och vad vi behöver justera. Om något känns osäkert ändrar vi hellre upplägget än chansar."
      : mentionsAgeOrRisk
      ? "Bra att du säger det. Du ska inte behöva känna dig osäker här. Vi börjar med marginal, undviker max och justerar direkt om något gör ont eller känns fel. Vill du kan jag göra upplägget lugnare."
      : "Bra fråga. Jag kan förklara varför jag valt upplägget eller justera det om något känns fel.";

    const aiReply = await requestAiProgramReply({
      context: {
        kind: "program_input",
        userName: profileName,
        userMessage: preference,
        goalPrimary: userProfile?.goalPrimary ?? "styrka",
        goalSecondary: userProfile?.goalSecondary,
        daysPerWeek: userProfile?.daysPerWeek ?? workoutPlan.daysPerWeek,
        minutesPerSession: userProfile?.minutesPerSession ?? 60,
        location: userProfile?.location ?? "gym",
        equipment: userProfile?.equipment ?? [],
        exercisePreferences: userProfile?.exercisePreferences ?? [],
        limitations: userProfile?.limitations,
        workoutPlan: {
          title: workoutPlan.title,
          passes: workoutPlan.passes.map((pass) => ({
            key: pass.key,
            displayName: pass.displayName,
            exercises: pass.exercises.map((exercise) => exercise.name),
          })),
        },
        existingPreferences: programPreferences,
      },
      fallbackReply,
    });

    return aiReply.text;
  }

  if (wantsAddExercise && wantsLessOrAvoid) {
    const requestedAdditionRaw = extractExerciseNameAfterNormalized(preference, [
      "lägg till",
      "lägga till",
      "ta med",
      "vill ha",
    ])
      .split(/\b(?:men|och|ta bort|skippa|undvik|vill inte|gillar inte)\b/i)[0]
      .trim();
    const addition = resolveExerciseName(requestedAdditionRaw);
    const additionName =
      addition.status === "known"
        ? addition.name
        : addition.status === "suggest"
        ? addition.suggestion
        : "";
    const removedParts: string[] = [];
    let addedCount = 0;

    if (lower.includes("marklyft")) {
      const removed = removeExercisesFromProgram((name) =>
        exerciseKey(name).includes("marklyft")
      );
      if (removed.length > 0) removedParts.push("marklyft");
    }

    if (lower.includes("vadpress")) {
      const removed = removeExercisesFromProgram((name) =>
        exerciseKey(name).includes("vadpress")
      );
      if (removed.length > 0) removedParts.push("vadpress");
    }

    if (additionName) {
      addedCount = addProgramFocusExercise(
        (pass) => {
          const key = exerciseKey(pass.displayName);
          return key.includes("underkropp") || key.includes("helkropp") || key.includes("ben");
        },
        additionName
      );
    }

    if (removedParts.length > 0 || addedCount > 0) {
      const removedText =
        removedParts.length > 0 ? `tar bort ${removedParts.join(" och ")}` : "";
      const addedText =
        addedCount > 0 && additionName ? `lägger in ${additionName}` : "";
      const joiner = removedText && addedText ? " och " : "";

      return `Bra. Jag ${removedText}${joiner}${addedText} i upplägget.`;
    }
  }

  if (wantsLessOrAvoid && lower.includes("marklyft")) {
    const removed = removeExercisesFromProgram((name) =>
      exerciseKey(name).includes("marklyft")
    );

    return removed.length > 0
      ? "Bra. Jag tar bort marklyft ur upplägget."
      : "Bra input. Jag sparar att marklyft inte ska prioriteras i upplägget.";
  }

  if (wantsLessOrAvoid && lower.includes("benpress")) {
    const removed = removeExercisesFromProgram((name) =>
      exerciseKey(name).includes("benpress")
    );

    return removed.length > 0
      ? "Bra. Jag tar bort benpress ur upplägget."
      : "Jag sparar det. Benpress får inte vara en viktig del av upplägget.";
  }

  if (wantsLessOrAvoid && lower.includes("latsdrag")) {
    const removed = removeExercisesFromProgram((name) =>
      exerciseKey(name).includes("latsdrag")
    );

    return removed.length > 0
      ? "Okej. Jag tar bort latsdrag ur upplägget."
      : "Jag sparar det. Vi bygger ryggen utan att latsdrag behöver vara med.";
  }

  if (wantsLessOrAvoid && lower.includes("vadpress")) {
    const removed = removeExercisesFromProgram((name) =>
      exerciseKey(name).includes("vadpress")
    );

    return removed.length > 0
      ? "Bra att du säger det. Jag tar bort vadpress ur upplägget."
      : "Bra att du säger det. Jag sparar att vadpress inte ska prioriteras.";
  }

  if (wantsLessOrAvoid) {
    const requestedExercise =
      extractExerciseNameAfterNormalized(preference, [
        "gillar inte",
        "tycker inte om",
        "vill inte köra",
        "vill inte ha",
        "ta bort",
        "plocka bort",
        "radera",
        "skippa",
        "undvik",
        "hatar",
      ]) || preference;
    const resolved = resolveExerciseName(cleanProgramExerciseRequest(requestedExercise));
    const exerciseName =
      resolved.status === "known"
        ? resolved.name
        : resolved.status === "suggest"
        ? resolved.suggestion
        : "";

    if (exerciseName) {
      const removed = removeExercisesFromProgram(
        (name) => exerciseKey(name) === exerciseKey(exerciseName)
      );

      if (removed.length > 0) {
        return `Bra att du säger det. Jag tar bort ${exerciseName} ur upplägget.`;
      }
    }
  }

  if (
    lower.includes("lägg till") ||
    lower.includes("lägga till") ||
    lower.includes("ta med") ||
    lower.includes("vill ha")
  ) {
    const requestedExercise = cleanProgramExerciseRequest(
      extractExerciseNameAfterNormalized(preference, [
        "lägg till",
        "lägga till",
        "ta med",
        "vill ha",
      ])
    );
    const requestedResolved = resolveExerciseName(requestedExercise);
    const requestedExerciseName =
      requestedResolved.status === "known"
        ? requestedResolved.name
        : requestedResolved.status === "suggest"
        ? requestedResolved.suggestion
        : "";

    if (requestedExerciseName) {
      const count = addProgramFocusExercise(
        (pass) => {
          const key = exerciseKey(pass.displayName);
          if (lower.includes("överkropp") || lower.includes("overkropp")) {
            return key.includes("överkropp") || key.includes("overkropp");
          }
          if (
            lower.includes("underkropp") ||
            lower.includes("benpass") ||
            lower.includes("ben")
          ) {
            return key.includes("underkropp") || key.includes("ben");
          }
          if (lower.includes("helkropp")) {
            return key.includes("helkropp");
          }

          return (
            key.includes("överkropp") ||
            key.includes("overkropp") ||
            key.includes("helkropp")
          );
        },
        requestedExerciseName
      );

      return count > 0
        ? `Bra. Jag lägger in ${requestedExerciseName} i upplägget.`
        : `Bra. Jag sparar att ${requestedExerciseName} ska in i upplägget.`;
    }

    if (
      lower.includes("underkropp") ||
      lower.includes("benpass") ||
      lower.includes("ben")
    ) {
      const exercise = userProfile?.location === "hemma" ? "Utfall" : "Lårcurl";
      const count = addProgramFocusExercise(
        (pass) => {
          const key = exerciseKey(pass.displayName);
          return key.includes("underkropp") || key.includes("ben");
        },
        exercise
      );

      return count > 0
        ? `Bra. Jag lägger in ${exercise.toLowerCase()} i underkroppspasset.`
        : `Bra. Jag sparar att underkropp ska få en övning till.`;
    }

    if (lower.includes("överkropp") || lower.includes("overkropp")) {
      const exercise = userProfile?.location === "hemma" ? "Hantelrodd" : "Sittande kabelrodd";
      const count = addProgramFocusExercise(
        (pass) => {
          const key = exerciseKey(pass.displayName);
          return key.includes("överkropp") || key.includes("overkropp");
        },
        exercise
      );

      return count > 0
        ? `Bra. Jag lägger in ${exercise.toLowerCase()} i överkroppspasset.`
        : `Bra. Jag sparar att överkropp ska få en övning till.`;
    }

    const requestedExerciseFallback = extractExerciseNameAfterNormalized(preference, [
      "lägg till",
      "lägga till",
      "ta med",
      "vill ha",
    ]);
    const resolved = resolveExerciseName(requestedExerciseFallback);

    if (resolved.status === "known") {
      const count = addProgramFocusExercise(
        (pass) =>
          exerciseKey(pass.displayName).includes("överkropp") ||
          exerciseKey(pass.displayName).includes("helkropp"),
        resolved.name
      );

      return count > 0
        ? `Bra. Jag lägger in ${resolved.name} i upplägget.`
        : `Bra. Jag sparar ${resolved.name} till upplägget.`;
    }

    if (resolved.status === "suggest") {
      setProgramPreferenceInput(`lägg till ${resolved.suggestion}`);
      return `Menar du ${resolved.suggestion}? Jag har fyllt i det namnet. Skicka igen om det stämmer.`;
    }

    if (resolved.status === "needsCategory") {
      setProgramPreferenceInput(`lägg till egen ben: ${resolved.name}`);
      return "Vad tränar den främst? Skriv till exempel egen ben:, egen rygg: eller egen armar:. Jag fyllde i ben som exempel.";
    }

    if (requestedExerciseFallback) {
      return "Jag är osäker på vilken övning du menar. Skriv gärna det vanligaste namnet, eller börja med egen: om du vill lägga in den exakt så.";
    }
  }

  if (wantsMore && lower.includes("bröst")) {
    const count = addProgramFocusExercise(
      (pass) => exerciseKey(pass.displayName).includes("överkropp"),
      userProfile?.location === "hemma" ? "Hantelpress" : "Bröstpress"
    );

    return count > 0
      ? "Bra. Jag ger bröst lite mer plats i överkroppspasset."
      : "Bra. Jag sparar att bröst ska få mer fokus i upplägget.";
  }

  if (wantsMore && lower.includes("rygg")) {
    const count = addProgramFocusExercise(
      (pass) =>
        exerciseKey(pass.displayName).includes("överkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      userProfile?.location === "hemma" ? "Bandrodd" : "Sittande kabelrodd"
    );

    return count > 0
      ? "Bra. Jag lägger in lite mer ryggarbete där det passar bäst."
      : "Bra. Jag sparar att ryggen ska få mer fokus.";
  }

  if (wantsMore && (lower.includes("ben") || lower.includes("baksida"))) {
    const count = addProgramFocusExercise(
      (pass) =>
        exerciseKey(pass.displayName).includes("underkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      lower.includes("baksida") ? "Lårcurl" : "Utfall"
    );

    return count > 0
      ? "Bra. Jag ger benen lite mer utrymme i upplägget."
      : "Bra. Jag sparar att benen ska prioriteras mer.";
  }

  if (wantsMore && (lower.includes("axlar") || lower.includes("axel"))) {
    const count = addProgramFocusExercise(
      (pass) => exerciseKey(pass.displayName).includes("överkropp"),
      "Sidolyft"
    );

    return count > 0
      ? "Bra. Jag lägger in mer axelarbete utan att göra passet rörigt."
      : "Bra. Jag sparar att axlar ska få mer fokus.";
  }

  if (wantsMore && (lower.includes("armar") || lower.includes("biceps") || lower.includes("triceps"))) {
    const count = addProgramFocusExercise(
      (pass) =>
        exerciseKey(pass.displayName).includes("överkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      lower.includes("triceps") ? "Triceps pushdown med rep" : "Hantelcurl"
    );

    return count > 0
      ? "Bra. Jag ger armar lite mer plats utan att passet blir rörigt."
      : "Bra. Jag sparar att armar ska få mer fokus.";
  }

  if (wantsMore && (lower.includes("mage") || lower.includes("core") || lower.includes("bål") || lower.includes("bal"))) {
    const count = addProgramFocusExercise(
      (pass) =>
        exerciseKey(pass.displayName).includes("underkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      userProfile?.location === "hemma" ? "Planka" : "Cable crunch"
    );

    return count > 0
      ? "Bra. Jag lägger in lite mage på ett ställe där det inte stör resten."
      : "Bra. Jag sparar att mage ska få mer plats.";
  }

  if (
    lower.includes("kortare") ||
    lower.includes("kort pass") ||
    lower.includes("mindre tid") ||
    lower.includes("ont om tid") ||
    lower.includes("för många övningar") ||
    lower.includes("for manga ovningar") ||
    lower.includes("färre övningar") ||
    lower.includes("farre ovningar") ||
    lower.includes("för mycket övningar") ||
    lower.includes("for mycket ovningar")
  ) {
    const count = shortenProgramPasses();

    return count > 0
      ? "Okej. Jag kortar ner passen lite och tar bort sånt som är minst viktigt."
      : "Okej. Upplägget är redan ganska kompakt, men jag sparar att passen ska hållas korta.";
  }

  if (lower.includes("knä") || lower.includes("kna")) {
    const removed = removeExercisesFromProgram(
      (name) => {
        const key = exerciseKey(name);
        return key.includes("benspark") || key.includes("utfall") || key.includes("knäböj");
      },
      () => "Lårcurl"
    );

    return removed.length > 0
      ? "Bra att du säger det. Jag minskar knäbelastningen och lägger in lugnare benarbete."
      : "Bra att du säger det. Jag sparar knäet som något coachen ska ta hänsyn till.";
  }

  if (lower.includes("ländrygg") || lower.includes("ryggont")) {
    const removed = removeExercisesFromProgram(
      (name) => exerciseKey(name).includes("marklyft"),
      () => "Lårcurl"
    );

    return removed.length > 0
      ? "Bra att du säger det. Jag tar bort marklyft och gör upplägget snällare mot ländryggen."
      : "Bra att du säger det. Jag sparar ländryggen som något coachen ska ha koll på.";
  }

  const aiReply = await requestAiProgramReply({
    context: {
      kind: "program_input",
      userName: profileName,
      userMessage: preference,
      goalPrimary: userProfile?.goalPrimary ?? "styrka",
      goalSecondary: userProfile?.goalSecondary,
      daysPerWeek: userProfile?.daysPerWeek ?? workoutPlan.daysPerWeek,
      minutesPerSession: userProfile?.minutesPerSession ?? 60,
      location: userProfile?.location ?? "gym",
      equipment: userProfile?.equipment ?? [],
      exercisePreferences: userProfile?.exercisePreferences ?? [],
      limitations: userProfile?.limitations,
      workoutPlan: {
        title: workoutPlan.title,
        passes: workoutPlan.passes.map((pass) => ({
          key: pass.key,
          displayName: pass.displayName,
          exercises: pass.exercises.map((exercise) => exercise.name),
        })),
      },
      existingPreferences: programPreferences,
    },
    fallbackReply:
      'Jag är inte helt säker på vad du vill ändra. Skriv gärna lite tydligare, till exempel "ta bort marklyft", "lägg till knäböj", "färre övningar" eller "Dag 1: bänkpress, rodd".',
  });

  if (aiReply.suggestion?.actions.length) {
    const actions =
      wantsLessOrAvoid && !wantsAddExercise
        ? aiReply.suggestion.actions
            .map((action) =>
              action.type === "replace_exercise"
                ? {
                    type: "remove_exercise" as const,
                    exerciseName: action.fromExerciseName,
                    reason: action.reason,
                  }
                : action
            )
            .filter((action) => action.type !== "add_exercise")
        : aiReply.suggestion.actions;

    if (actions.length > 0) {
      setPendingProgramSuggestion({ ...aiReply.suggestion, actions });
    }
  }

  return aiReply.text;
}

function getNextSetWeight(args: {
  weight: number;
  reps?: number;
  rir: number;
  failNote?: string;
  setNumber?: number;
  exerciseName?: string;
}) {
  const { weight, rir, failNote, setNumber = 1 } = args;
  if (typeof args.reps === "number") {
    return getNextSetPlan({
      weight,
      reps: args.reps,
      rir,
      failNote,
      setNumber,
      exerciseName: args.exerciseName,
    }).weight;
  }

  const fail = failNote?.trim().toLowerCase() ?? "";

  if (fail) {
    if (fail.includes("grepp")) {
      return weight; // kroppen hade mer, behåll vikten
    }

    if (fail.includes("teknik") || fail.includes("formen")) {
      return getBackoffWeight({ weight, exerciseName: args.exerciseName ?? "", reason: "technique" });
    }

    if (fail.includes("ont") || fail.includes("smärta")) {
      return getBackoffWeight({ weight, exerciseName: args.exerciseName ?? "", reason: "pain" });
    }

    if (
      fail.includes("ork") ||
      fail.includes("muskel") ||
      fail.includes("slut")
    ) {
      return getBackoffWeight({ weight, exerciseName: args.exerciseName ?? "", reason: "failure" });
    }

    return getBackoffWeight({ weight, exerciseName: args.exerciseName ?? "", reason: "failure" });
  }

  if (rir === 0) return getBackoffWeight({ weight, exerciseName: args.exerciseName ?? "", reason: "failure" });
  if (rir === 1 || rir === 2) return weight;
  return getNextAvailableWeight(weight, args.exerciseName ?? "", "up");
}

function isNewPR(
  existingPR:
    | {
        exerciseName: string;
        weight: number;
        reps: number;
        durationSeconds?: number;
        metricType?: "reps" | "time";
        createdAt: string;
      }
    | undefined,
  attempt: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
  }
) {
  if (!existingPR) return true;

  if (attempt.metricType === "time") {
    const attemptDuration = attempt.durationSeconds ?? 0;
    const existingDuration = existingPR.durationSeconds ?? 0;
    if (attemptDuration > existingDuration) return true;
    if (
      attemptDuration === existingDuration &&
      attempt.weight > existingPR.weight
    ) {
      return true;
    }
    return false;
  }

  if (attempt.weight > existingPR.weight) return true;

  if (attempt.weight === existingPR.weight && attempt.reps > existingPR.reps) {
    return true;
  }

  return false;
}

function getLatestLoggedSetForExercise(
  workouts: Workout[],
  exerciseName: string
) {
  const targetKey = exerciseKey(exerciseName);

  return workouts
    .flatMap((workout) =>
      workout.exercises.flatMap((exercise) =>
        exerciseKey(exercise.name) === targetKey
          ? exercise.sets.map((set) => ({
              set,
              exerciseName: exercise.name,
            }))
          : []
      )
    )
    .sort(
      (a, b) =>
        new Date(b.set.createdAt).getTime() -
        new Date(a.set.createdAt).getTime()
    )[0];
}

function getBestRecordForExercise(workouts: Workout[], exerciseName: string) {
  const targetKey = exerciseKey(exerciseName);

  return workouts
    .flatMap((workout) =>
      workout.exercises.flatMap((exercise) =>
        exerciseKey(exercise.name) === targetKey
          ? exercise.sets.map((set) => ({
              exerciseName: exercise.name,
              weight: set.weight,
              reps: set.reps,
              durationSeconds: set.durationSeconds,
              metricType: set.metricType,
              createdAt: set.createdAt,
            }))
          : []
      )
    )
    .sort((a, b) => {
      if (a.metricType === "time" || b.metricType === "time") {
        const durationDiff =
          (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0);
        if (durationDiff !== 0) return durationDiff;
      }
      if (b.weight !== a.weight) return b.weight - a.weight;
      if (b.reps !== a.reps) return b.reps - a.reps;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
}

function parseNumberInput(value: string) {
  return Number(value.trim().replace(",", "."));
}

  async function addSet() {
    if (!workout) return;

    const rawWeight = parseNumberInput(weightInput);
    const reps = parseNumberInput(repsInput);
    const exerciseName = currentExerciseName;
    const prKey = exerciseKey(exerciseName);
    const bodyweightExercise = isBodyweightExercise(exerciseName);
    const timedExercise = isTimedExercise(exerciseName);
    const hasLoggedWeight =
      weightInput.trim() !== "" && Number.isFinite(rawWeight) && rawWeight > 0;
    const weight = bodyweightExercise && !hasLoggedWeight ? 0 : rawWeight;
    const durationSeconds = timedExercise ? Math.round(durationSecondsInput) : undefined;
    if (timedExercise && (!durationSeconds || durationSeconds <= 0)) {
      const missingInputMessage = "Jag behöver tiden först. Starta klockan eller fyll i tiden.";
      setChatLog((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === "coach" && lastMessage.text === missingInputMessage) return prev;
        return [...prev, { role: "coach", text: missingInputMessage }];
      });
      return;
    }
    const missingRequiredInput =
      (!timedExercise && (!Number.isFinite(reps) || reps <= 0)) ||
      (!bodyweightExercise && (!Number.isFinite(weight) || weight <= 0));
    const missingInputMessage = bodyweightExercise
      ? "Jag behöver reps först."
      : "Jag behöver vikt och reps först.";

if (missingRequiredInput) {
  setChatLog((prev) => {
    const lastMessage = prev[prev.length - 1];
    if (
      lastMessage?.role === "coach" &&
      lastMessage.text === missingInputMessage
    ) {
      return prev;
    }

    return [
      ...prev,
      {
        role: "coach",
        text: missingInputMessage,
      },
    ];
  });
  return;
}

const set: LoggedSet = {
  weight,
  reps: timedExercise ? 0 : reps,
  durationSeconds,
  metricType: timedExercise ? "time" : "reps",
  rir: typeof rirInput === "number" ? Number(rirInput) : undefined,
  failNote: didFailInput ? failNoteInput.trim() || "failure" : undefined,
  createdAt: new Date().toISOString(),
};
const painFailure =
  didFailInput &&
  (failNoteInput.toLowerCase().includes("ont") ||
    failNoteInput.toLowerCase().includes("smärta") ||
    failNoteInput.toLowerCase().includes("känning"));


    const updated = structuredClone(workout);
    updated.exercises[exerciseIndex].sets.push(set);
    setWorkout(updated);
   const setNumber = updated.exercises[exerciseIndex].sets.length;
   const rawNextSetPlan = timedExercise
    ? getNextTimedSetPlan({
        weight,
        durationSeconds: durationSeconds ?? 0,
        rir: rirInput,
        failNote: didFailInput ? failNoteInput : "",
        setNumber,
        exerciseName: currentExerciseName,
      })
    : getNextSetPlan({
        weight,
        reps,
        rir: rirInput,
        failNote: didFailInput ? failNoteInput : "",
        setNumber,
        exerciseName: currentExerciseName,
        previousSets: updated.exercises[exerciseIndex].sets.slice(0, -1),
      });
   const nextSetPlan =
    bodyweightExercise && !hasLoggedWeight
      ? { ...rawNextSetPlan, weight: 0 }
      : rawNextSetPlan;
   const suggestedNextWeight = nextSetPlan.weight;


    setFailNoteInput("");
    setDidFailInput(false);
 // ✅ Coach-reaktion + auto-förslag för nästa set (RIR)
const step = PROGRESSION_STEP;


    // Spara “senaste per övning” direkt när du loggar
const newLastByExercise: LastByExercise = {
  ...lastByExercise,
[exerciseKey(currentExerciseName)]: {
  weight,
  reps: timedExercise ? 0 : reps,
  durationSeconds,
  metricType: timedExercise ? "time" : "reps",
  rir: rirInput ?? null,
  failNote: didFailInput ? failNoteInput.trim() || "failure" : null,
  updatedAt: new Date().toISOString(),
},
};

    setLastByExercise(newLastByExercise);
    saveJSON("lastByExercise", newLastByExercise);
    const existingPR = personalRecords[prKey];
    const prAttempt = {
      weight,
      reps: timedExercise ? 0 : reps,
      durationSeconds,
      metricType: timedExercise ? ("time" as const) : ("reps" as const),
    };
    const personalRecordText = isNewPR(existingPR, prAttempt)
      ? existingPR
        ? `Nytt personbästa i ${currentExerciseName}: ${formatLoggedSetText({
            exerciseName,
            weight,
            reps: timedExercise ? 0 : reps,
            durationSeconds,
            metricType: prAttempt.metricType,
          })}.`
        : `Första noteringen i ${currentExerciseName}: ${formatLoggedSetText({
            exerciseName,
            weight,
            reps: timedExercise ? 0 : reps,
            durationSeconds,
            metricType: prAttempt.metricType,
          })}. Nu har vi en nivå att slå.`
      : "";
    const lastCoachMessage =
  [...chatLog].reverse().find((m) => m.role === "coach")?.text || "";

const coachMessage = buildCoachMessage({
  weight,
  reps: timedExercise ? 0 : reps,
  durationSeconds,
  metricType: prAttempt.metricType,
  rir: rirInput,
  failNote: failNoteInput,
  exerciseName: currentExerciseName,
  setNumber,
  nextWeight: suggestedNextWeight,
  nextSetPlan,
  lastCoachMessage,
  previousSets: updated.exercises[exerciseIndex].sets.slice(0, -1),
  completedExercises: updated.exercises.slice(0, exerciseIndex + 1),
  goalPrimary: userProfile?.goalPrimary ?? "styrka",
  personalRecordText,
  warmupContext: activeWarmupContext,
  conditioningContext: activeConditioningContext,
});
const coachSetContext = buildCoachSetContext({
  userName: profileName,
  goalPrimary: userProfile?.goalPrimary ?? "styrka",
  passLabel: currentPassLabel,
  exerciseName: currentExerciseName,
  setNumber,
  weight,
  reps: timedExercise ? 0 : reps,
  durationSeconds,
  metricType: prAttempt.metricType,
  rir: rirInput,
  failNote: didFailInput ? failNoteInput.trim() || "failure" : "",
  nextWeight: suggestedNextWeight,
  nextSetPlan,
  previousSets: updated.exercises[exerciseIndex].sets.slice(0, -1),
  personalRecordText,
  lastCoachMessage,
  warmupContext: activeWarmupContext,
  conditioningContext: activeConditioningContext,
});
if (isNewPR(existingPR, prAttempt)) {
  const newPR: PersonalRecord = {
    exerciseName,
    weight,
    reps: timedExercise ? 0 : reps,
    durationSeconds,
    metricType: prAttempt.metricType,
    createdAt: new Date().toISOString(),
  };

  const newPRs: PersonalRecords = {
    ...personalRecords,
    [prKey]: newPR,
  };

  setPersonalRecords(newPRs);
  saveJSON("personalRecords", newPRs);
  void syncBetaPersonalRecord({
    exerciseKey: prKey,
    exerciseName,
    weight,
    reps: timedExercise ? 0 : reps,
    durationSeconds,
    metricType: prAttempt.metricType,
    rir: typeof rirInput === "number" ? rirInput : null,
    achievedAt: newPR.createdAt,
  });


}

const coachReply = await requestAiCoachSetReply({
  context: coachSetContext,
  fallbackReply: coachMessage,
});

if (coachReply.text) {
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: coachReply.text,
      setNumber,
      aiStatus: coachReply.mode === "ai" ? undefined : "fallback",
    },
  ]);
}

void syncBetaSnapshotNow({
  reason: "set-logged",
  exerciseName: currentExerciseName,
  setNumber,
});

if (painFailure) {
  savePainCoachMemory(currentExerciseName, failNoteInput);

  setWeightInput("");
  setRepsInput("");
  setFailNoteInput("");
  setRirInput(2);
  setDidFailInput(false);
  return;
}

if (nextSetPlan.strategy === "complete") {
  setWeightInput("");
  setRepsInput("");
  setDurationSecondsInput(0);
  setRirInput(2);
  setFailNoteInput("");
  setDidFailInput(false);
  return;
}

    // För nästa set behåll vikt, men nolla reps (valfritt)
const nextSetRepInput = nextSetPlan.repsInput;
const nextSetRirInput = nextSetPlan.rirInput;

setRepsInput(String(nextSetRepInput));
setDurationSecondsInput(0);
setWeightInput(bodyweightExercise && !hasLoggedWeight ? "" : String(suggestedNextWeight));
setRirInput(nextSetRirInput);

  }

  function removeLastSet() {
    if (!workout) return;
    const updated = structuredClone(workout);
    const sets = updated.exercises[exerciseIndex].sets;
    if (sets.length === 0) return;
    const exerciseName = updated.exercises[exerciseIndex].name;
    const key = exerciseKey(exerciseName);
    sets.pop();
    setWorkout(updated);

    const workoutsForExercise = [updated, ...history];
    const latest = getLatestLoggedSetForExercise(
      workoutsForExercise,
      exerciseName
    );
    const nextLastByExercise = { ...lastByExercise };

    if (latest) {
      nextLastByExercise[key] = {
        weight: latest.set.weight,
        reps: latest.set.reps,
        rir: latest.set.rir ?? null,
        failNote: latest.set.failNote ?? null,
        updatedAt: latest.set.createdAt,
      };
    } else {
      delete nextLastByExercise[key];
    }

    setLastByExercise(nextLastByExercise);
    saveJSON("lastByExercise", nextLastByExercise);

    const bestRecord = getBestRecordForExercise(
      workoutsForExercise,
      exerciseName
    );
    const nextPersonalRecords = { ...personalRecords };

    if (bestRecord) {
      nextPersonalRecords[key] = bestRecord;
    } else {
      delete nextPersonalRecords[key];
    }

    setPersonalRecords(nextPersonalRecords);
    saveJSON("personalRecords", nextPersonalRecords);
  }

  function nextExercise() {
 if (exerciseIndex < activePlan.length - 1) {
    setExerciseIndex(exerciseIndex + 1);
    setWeightInput("");
    setRepsInput("");
    setDurationSecondsInput(0);
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
      setDurationSecondsInput(0);
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

  if (dayForm === "trött") {
    notes.push({ ...base, text: "Du kom in trött och höll det kontrollerat." });
  }
  if (dayForm === "stark") {
    notes.push({ ...base, text: "Du kände dig stark idag." });
  }

  if (
    w.conditioningContext?.timing === "before" &&
    w.conditioningContext.intensity === "hard"
  ) {
    notes.push({
      ...base,
      text: `Du körde ${w.conditioningContext.note} före styrkan. Det kan ha påverkat vikterna.`,
    });
  }

for (const ex of w.exercises) {
  const totalSets = ex.sets.length;

  const failedSets = ex.sets.filter((s) => Boolean(s.failNote?.trim()));
  const hardSets = ex.sets.filter((s) => s.rir === 0 || s.rir === 1);

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
  } else if (hardSets.length >= 2) {
    notes.push({
      ...base,
      exerciseName: ex.name,
      text: `${ex.name}: flera tunga set senast.`,
    });
  } else if (totalSets >= 3) {
    const best = ex.sets.reduce((bestSet, set) => {
      if (set.weight > bestSet.weight) return set;
      if (set.weight === bestSet.weight && set.reps > bestSet.reps) return set;
      return bestSet;
    });

    notes.push({
      ...base,
      exerciseName: ex.name,
      text: `${ex.name}: bästa set senast var ${best.weight} kg × ${best.reps}.`,
    });
  }
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
  const improvedText = progression.improved.slice(0, 2).join(", ");
  const hardSetCount = hardSets.length;
  const failedSetCount = failedSets.length;
  let coachHeadline = "Bra pass. Det här är sparat.";

  if (summary.totalSets === 0) {
    coachHeadline = "Ingen stress. Vi börjar rent nästa gång.";
  } else if (summary.isPartial) {
    coachHeadline = "Bra att du sparade där du var.";
  } else if (progression.improved.length >= 2) {
    coachHeadline = `Det här var en stark dag. ${improvedText} gick framåt 🔥`;
  } else if (progression.improved.length === 1) {
    coachHeadline = `${progression.improved[0]} tog ett tydligt steg idag 🔥`;
  } else if (hardSetCount >= 3 && failedSetCount === 0) {
    coachHeadline = "Tungt jobb, men du höll kontrollen hela vägen.";
  } else if (hardSetCount >= 3) {
    coachHeadline = "Du gjorde jobbet även när det blev tungt.";
  }

  if (progression.improved.length > 0) {
    positives.push(
      `Du tog steg framåt i ${progression.improved.slice(0, 3).join(", ")}. Det är precis så här vi vill att det ska röra sig.`
    );
  }

  if (summary.bestSetText && summary.bestSetText !== "Inget set loggat.") {
    positives.push(`Starkaste träffen idag: ${summary.bestSetText}. Den sticker ut.`);
  }

  if (summary.totalSets > 0 && hardSets.length >= 3) {
    positives.push("Du jobbade nära gränsen flera gånger och höll ihop passet. Starkt gjort.");
  } else if (summary.totalSets > 0) {
    positives.push(`Du fick in ${summary.totalSets} set. Det ger bra nivåer att styra nästa pass från.`);
  }

  if (failedSets.length === 0 && summary.totalSets > 0) {
    positives.push("Du höll marginal hela vägen. Det är snyggt, särskilt när målet är att kunna komma tillbaka stark nästa gång.");
  } else if (failedSets.length > 0) {
    adjustments.push(
      failedSets.length >= 3
        ? "Du var vid gränsen många gånger idag. Nästa pass sparar vi lite mer tidigt, så kvaliteten håller längre."
        : "Du var vid gränsen i några set. Nästa gång håller vi lite mer kontroll där."
    );
  }

  if (hardSets.length >= 3 && failedSets.length === 0) {
    adjustments.push(
      "Det blev flera tunga set idag. Nästa pass öppnar vi kontrollerat och höjer om det känns rätt."
    );
  }

  if (summary.totalSets === 0) {
    adjustments.push(
      "Inget att justera än. Vi börjar om lugnt nästa gång."
    );
  }

  const lastExercise = workout.exercises[workout.exercises.length - 1];
  if (progression.improved.length > 0) {
    nextFocus.push(`Nästa gång testar vi om ${progression.improved[0]} håller den här nivån igen.`);
  } else if (summary.totalSets > 0 && lastExercise && lastExercise.sets.length > 0) {
    nextFocus.push(
      `Nästa gång börjar vi rent i ${lastExercise.name} och låter första setet sätta nivån.`
    );
  }

  if (positives.length === 0) {
    positives.push(
      "Du dök upp och passet är sparat. Det räknas."
    );
  }

  if (adjustments.length === 0) {
    adjustments.push("Inget stort att ändra just nu. Nästa pass bygger vi från dagens nivåer.");
  }
if (progression.improved.length > 0) {
  coachMemoryTakeaway.push(
    `Jag sparar att ${progression.improved.join(", ")} gick framåt idag.`
  );
}

if (progression.worse.length > 0) {
  coachMemoryTakeaway.push(
    `Jag sparar att ${progression.worse.join(", ")} tappade lite. Där öppnar vi smartare nästa gång.`
  );
}

const exercisesWithFailure = workout.exercises
  .filter((ex) => ex.sets.some((set) => Boolean(set.failNote?.trim())))
  .map((ex) => ex.name);

if (exercisesWithFailure.length > 0) {
  coachMemoryTakeaway.push(
    `Jag sparar att ${exercisesWithFailure.join(", ")} blev riktigt tungt idag.`
  );
}

if (
  workout.conditioningContext?.timing === "before" &&
  workout.conditioningContext.intensity === "hard"
) {
  coachMemoryTakeaway.push(
    `Du körde ${workout.conditioningContext.note} före styrkan. Det kan ha påverkat vikterna.`
  );
}

if (coachMemoryTakeaway.length === 0) {
  coachMemoryTakeaway.push(
    summary.isPartial
      ? "Jag sparar passet precis som det blev."
      : "Jag sparar dagens nivåer till nästa pass."
  );
}
return {
  passLabel: workout.displayName,
  durationMinutes: summary.durationMinutes,
  totalSets: summary.totalSets,
  exerciseCount: summary.exerciseCount,
  completedExerciseCount: summary.completedExerciseCount,
  isPartial: summary.isPartial,
  totalVolumeKg: summary.totalVolumeKg,
  totalVolumeText: summary.totalVolumeText,
  bestSetText: summary.bestSetText,
  coachHeadline,
  coachSummary: summary.coachSummary,
  positives,
  adjustments,
  nextFocus,
  progression,
  coachMemoryTakeaway,
};
}

function buildWorkoutSummary(w: Workout) {
  const allSets = w.exercises.flatMap((ex) =>
    ex.sets.map((set) => ({
      ...set,
      exerciseName: ex.name,
    }))
  );

  const totalSets = allSets.length;
  const totalVolumeKg = allSets.reduce((sum, set) => {
    return sum + set.weight * set.reps;
  }, 0);
  const totalVolumeText =
    totalVolumeKg >= 1000
      ? `${Number((totalVolumeKg / 1000).toFixed(1)).toLocaleString("sv-SE")} ton`
      : `${Math.round(totalVolumeKg).toLocaleString("sv-SE")} kg`;
  const exerciseCount = w.exercises.length;
  const completedExerciseCount = w.exercises.filter(
    (exercise) => exercise.sets.length > 0
  ).length;
  const isPartial = completedExerciseCount < exerciseCount;

  const startedAtMs = new Date(w.startedAt).getTime();
  const finishedAtMs = Date.now();
  const durationMinutes = Math.max(
    1,
    Math.round((finishedAtMs - startedAtMs) / 1000 / 60)
  );

  let bestSetText = "Inget set loggat.";
  if (allSets.length > 0) {
    const bestSet = allSets.reduce((best, current) => {
      if (getLoggedSetScore(current) > getLoggedSetScore(best)) return current;
      return best;
    });

    bestSetText = formatLoggedSetText({
      exerciseName: bestSet.exerciseName,
      weight: bestSet.weight,
      reps: bestSet.reps,
      durationSeconds: bestSet.durationSeconds,
      metricType: bestSet.metricType,
    });
  }

  let coachSummary = "Passet är sparat. Bra jobbat idag.";

  if (totalSets === 0) {
    coachSummary = "Passet sparat. Nästa pass tar vi från början.";
  } else if (isPartial) {
    coachSummary = `Passet sparat. ${totalSets} set är gjort, och vi fortsätter klokt nästa gång.`;
  } else if (allSets.filter((set) => typeof set.rir === "number" && set.rir <= 1).length >= 3) {
    coachSummary = "Det där var ett tungt pass. Du jobbade nära gränsen och fick jobbet gjort.";
  } else if (dayForm === "stark") {
    coachSummary = "Du kom in stark idag och använde det bra. Det där var ett bra pass.";
  } else if (dayForm === "trött") {
    coachSummary =
      "Du tog dig igenom passet smart trots trött känsla. Det är ett bra kvitto.";
  }

  const summary = {
    durationMinutes,
    totalSets,
    exerciseCount,
    completedExerciseCount,
    isPartial,
    totalVolumeKg,
    totalVolumeText,
    bestSetText,
    coachSummary,
  };

  const alertText = [
    `Pass ${w.pass} sparat ✅`,
    `Tid: ${durationMinutes} min`,
    `Övningar: ${exerciseCount}`,
    `Totala set: ${totalSets}`,
    `Flyttad vikt: ${totalVolumeText}`,
    `Bästa set: ${bestSetText}`,
    coachSummary,
  ].join("\n");

  return { summary, alertText };
}

  function finishWorkout() {
    if (!workout) return;

    const { summary } = buildWorkoutSummary(workout);

    const workoutWithSummary: Workout = {
  ...workout,
  summary,
};


    const newHistory = [workoutWithSummary, ...history].slice(0, 50); // spara senaste 50 pass
    const progressionComparison = getWorkoutComparison(newHistory);
    setHistory(newHistory);
    saveJSON("workoutHistory", newHistory);
// COACH MEMORY: spara en kort sammanfattning (per övning)
const freshNotes = makeCoachNotesFromWorkout(workout);

const newNotes: CoachNote[] = [...freshNotes, ...coachMemory.notes].slice(0, 50);

const nextMemory: CoachMemory = { notes: newNotes };
setCoachMemory(nextMemory);
saveJSON("coachMemory", nextMemory);
void syncBetaCoachMemory(nextMemory.notes);



    saveRawValue("lastPass", workout.pass);
    setLastPass(workout.pass);
    void syncBetaSnapshotNow({ reason: "workout-finished" });

const review = buildWorkoutReview({
  workout: workoutWithSummary,
  summary,
  progression: progressionComparison,
});

setWorkoutReview(review);
setLatestCompletedReview(review);
void syncStructuredBetaWorkout({
  id: workoutWithSummary.id,
  passKey: workoutWithSummary.pass,
  passName: workoutWithSummary.displayName,
  status: summary.isPartial ? "partial" : "completed",
  startedAt: workoutWithSummary.startedAt,
  completedAt: new Date().toISOString(),
  warmupNote: workoutWithSummary.warmupContext?.note ?? null,
  conditioningNote: workoutWithSummary.conditioningContext?.note ?? null,
  summary: summary as unknown as Record<string, unknown>,
  review: review as unknown as Record<string, unknown>,
  sets: workoutWithSummary.exercises.flatMap((exercise) =>
    exercise.sets.map((set, setIndex) => ({
      exerciseName: exercise.name,
      exerciseKey: normalizeExerciseSearchText(exercise.name),
      setIndex: setIndex + 1,
      weight: set.weight,
      reps: set.reps,
      rir: set.rir ?? null,
      failNote: set.failNote ?? null,
      createdAt: set.createdAt,
    }))
  ),
});
void requestAiWorkoutReview({
  context: {
    kind: "workout_review",
    userName: profileName,
    passLabel: workoutWithSummary.displayName,
    summary: {
      durationMinutes: summary.durationMinutes,
      totalSets: summary.totalSets,
      completedExerciseCount: summary.completedExerciseCount,
      exerciseCount: summary.exerciseCount,
      totalVolumeText: summary.totalVolumeText,
      bestSetText: summary.bestSetText,
      isPartial: summary.isPartial,
    },
    progression: progressionComparison,
    exercises: workoutWithSummary.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
        failNote: set.failNote,
      })),
    })),
    warmupNote: workoutWithSummary.warmupContext?.note,
    conditioningNote: workoutWithSummary.conditioningContext?.note,
  },
  fallbackReview: getReviewCoachParts(review),
}).then((response) => {
  if (response.mode !== "ai") return;

  setWorkoutReview((current) =>
    current ? applyReviewCoachParts(current, response.review) : current
  );
  setLatestCompletedReview((current) =>
    current ? applyReviewCoachParts(current, response.review) : current
  );
});
setWorkoutComplete(false);
setWorkout(null);
setSkippedExercise(null);
setActiveWarmupContext(null);
setActiveConditioningContext(null);
setStarted(false);
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
    localStorage.removeItem("acceptedTrainingSafety");
    localStorage.removeItem("approvedWorkoutPlan");
    localStorage.removeItem("programPreferences");
    localStorage.removeItem("customWorkoutPlan");
    localStorage.removeItem("passDisplayNamesByPass");

    setLastPass(null);
    setSelectedStartPass(null);
    setGym("Sjöviksgymmet");
    setHistory([]);
    setLastByExercise({});
    setCheckInInput("");
    setCheckInCoachReply("");
    setActiveCheckInSignal(null);
    setActiveWarmupContext(null);
    setActiveConditioningContext(null);
    setUserProfile(null);
    setHasAcceptedTrainingSafety(false);
    setShowProgramReview(false);
    setProgramPreferenceInput("");
    setProgramPreferenceReply("");
    setProgramPreferences([]);
    setCustomWorkoutPlan(null);
    setPassDisplayNamesByPass({});
    setWorkout(null);
    setSkippedExercise(null);
    setStarted(false);
    alert("Allt återställt ✅");
    setCoachMemory({ notes: [] });
  setCustomExercisesByPass({ A: [], B: [], C: [], D: [] });
  setTodayExercisesByPass({ A: [], B: [], C: [], D: [] });
  setRemovedExercisesByPass({ A: [], B: [], C: [], D: [] });
  setExerciseOverridesByPass({ A: {}, B: {}, C: {}, D: {} });
    setPersonalRecords({});
    void syncBetaSnapshotNow({ reason: "settings-reset" });
  }

const globalAppControls = (
  <AppControls
    theme={appTheme}
    onOpenSettings={() => setShowSettings(true)}
  />
);
const shouldShowGlobalAppControls =
  !showExerciseProgress &&
  !showStatistics &&
  !showHistory &&
  !showPersonalRecords &&
  !showProgramReview &&
  !editingProfile;

const settingsPanel = showSettings ? (
  <SettingsScreen
    theme={appTheme}
    onThemeChange={(theme) => {
      setAppTheme(theme);
      saveJSON("appTheme", theme);
    }}
    onBack={() => setShowSettings(false)}
    onOpenProfile={() => {
      setShowSettings(false);
      setEditingProfile(true);
    }}
    onOpenProgram={
      userProfile
        ? () => {
            setShowSettings(false);
            setShowDailyPlan(false);
            setShowStatistics(false);
            setShowHistory(false);
            setShowExerciseProgress(false);
            setShowPersonalRecords(false);
            setShowProgramReview(true);
          }
        : undefined
    }
    onResetAll={resetAll}
  />
) : null;

if (showSplash) {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1018] px-6 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.11),transparent_34%),linear-gradient(180deg,#0b1018_0%,#111a25_55%,#0b1018_100%)]" />

      <div className="splash-mark flex flex-col items-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-[2.25rem] border border-blue-400/20 bg-blue-500/[0.07] shadow-[0_0_70px_rgba(59,130,246,0.10)] backdrop-blur-2xl sm:h-36 sm:w-36">
          <Image
            src="/logo-dark.png"
            alt="MinCoach"
            width={128}
            height={128}
            className="h-24 w-24 object-contain sm:h-28 sm:w-28"
            priority
          />
        </div>

        <p className="splash-word mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-100/55">
          MinCoach
        </p>
      </div>
    </main>
  );
}

if (!userProfile || editingProfile) {
  return (
    <>
    {globalAppControls}
    <SetupScreen
      nameInput={nameInput}
      setNameInput={setNameInput}
      ageInput={ageInput}
      setAgeInput={setAgeInput}
      genderInput={genderInput ?? "vill-inte-saga"}
      setGenderInput={setGenderInput}
      trainingExperienceInput={trainingExperienceInput}
      setTrainingExperienceInput={setTrainingExperienceInput}
      daysPerWeekInput={daysPerWeekInput}
      setDaysPerWeekInput={setDaysPerWeekInput}
      minutesPerSessionInput={minutesPerSessionInput}
      setMinutesPerSessionInput={setMinutesPerSessionInput}
      locationInput={locationInput}
      setLocationInput={setLocationInput}
      equipmentInput={equipmentInput}
      setEquipmentInput={setEquipmentInput}
      exercisePreferencesInput={exercisePreferencesInput}
      setExercisePreferencesInput={setExercisePreferencesInput}
      limitationsInput={limitationsInput}
      setLimitationsInput={setLimitationsInput}
      goalInput={goalInput}
      setGoalInput={setGoalInput}
      secondaryGoalsInput={secondaryGoalsInput}
      setSecondaryGoalsInput={setSecondaryGoalsInput}
      isEditing={editingProfile}
      onSubmit={() => {
const parsedAge = Number(ageInput);
const profile: UserProfile = {
  name: nameInput.trim() || "Du",
  age: Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : null,
  gender: genderInput,
  trainingExperience: trainingExperienceInput,
  goalPrimary: goalInput,
  goalSecondary: secondaryGoalsInput.filter((goal) => goal !== goalInput),
  daysPerWeek: Number(daysPerWeekInput),
  minutesPerSession: Number(minutesPerSessionInput),
  location: locationInput,
  equipment: locationInput === "hemma" ? equipmentInput : [],
  exercisePreferences: exercisePreferencesInput,
  limitations: limitationsInput,
};

        saveJSON("userProfile", profile);
        setUserProfile(profile);
        setCustomWorkoutPlan(null);
        setCustomExercisesByPass({ A: [], B: [], C: [], D: [] });
        setRemovedExercisesByPass({ A: [], B: [], C: [], D: [] });
        setExerciseOverridesByPass({ A: {}, B: {}, C: {}, D: {} });
        setPassDisplayNamesByPass({});
        localStorage.removeItem("customWorkoutPlan");
        saveJSON("customExercisesByPass", { A: [], B: [], C: [], D: [] });
        saveJSON("removedExercisesByPass", { A: [], B: [], C: [], D: [] });
        saveJSON("exerciseOverridesByPass", { A: {}, B: {}, C: {}, D: {} });
        saveJSON("passDisplayNamesByPass", {});
        setEditingProfile(false);
        setProgramBuildStatus("building");
        setProgramBuildScreenVisible(true);
        setShowProgramReview(true);
        saveJSON("approvedWorkoutPlan", false);
      }}
    />
    {settingsPanel}
    </>
  );
}

if (userProfile && showProgramReview && programBuildScreenVisible) {
  return <ProgramBuildLoadingScreen />;
}

if (userProfile && workoutPlan && showProgramReview) {
  return (
    <>
    {globalAppControls}
    <ProgramReviewScreen
      profile={userProfile}
      workoutPlan={workoutPlan}
      preferenceInput={programPreferenceInput}
      setPreferenceInput={setProgramPreferenceInput}
      preferenceReply={programPreferenceReply}
      pendingProgramSuggestion={pendingProgramSuggestion}
      programBuildStatus={programBuildStatus}
      onSavePreference={async () => {
        const preference = programPreferenceInput.trim();
        if (!preference) return;

        const reply = await applyProgramPreference(preference);
        const nextPreferences = [preference, ...programPreferences].slice(0, 12);
        setProgramPreferences(nextPreferences);
        saveJSON("programPreferences", nextPreferences);
        if (!reply.startsWith("Menar du")) {
          setProgramPreferenceInput("");
        }
        setProgramPreferenceReply(reply);
      }}
      onApproveProgramSuggestion={applyPendingProgramSuggestion}
      onDismissProgramSuggestion={() => {
        setPendingProgramSuggestion(null);
        setProgramPreferenceReply("Inga problem. Jag lämnar upplägget som det är.");
      }}
      onRebuildProgram={() => {
        if (!userProfile) return;
        buildAiWorkoutPlanForProfile(userProfile);
      }}
      onRenamePass={(passKey, displayName) => {
        const nextNames = {
          ...passDisplayNamesByPass,
          [passKey]: displayName.trim(),
        };
        setPassDisplayNamesByPass(nextNames);
        saveJSON("passDisplayNamesByPass", nextNames);
      }}
      onRemoveExercise={(passKey, exerciseName) => {
        const currentPass = workoutPlan.passes.find((pass) => pass.key === passKey);
        const isCustomExercise = customExercisesByPass[passKey]?.some(
          (name) => exerciseKey(name) === exerciseKey(exerciseName)
        );

        if (isCustomExercise) {
          removeCustomExercise(passKey, exerciseName);
          setProgramPreferenceReply(`${exerciseName} är borttagen från upplägget.`);
          return;
        }

        if (
          currentPass?.exercises.some(
            (exercise) => exerciseKey(exercise.name) === exerciseKey(exerciseName)
          )
        ) {
          setRemovedExercisesByPass((prev) => {
            const next: RemovedExercisesByPass = {
              ...prev,
              [passKey]: mergePlan(prev[passKey] ?? [], [exerciseName]),
            };

            saveJSON("removedExercisesByPass", next);
            return next;
          });
          setProgramPreferenceReply(`${exerciseName} är borttagen från upplägget.`);
        }
      }}
      onApprove={() => {
        saveJSON("approvedWorkoutPlan", true);
        void syncBetaSnapshotNow({ reason: "program-approved" });
        setShowProgramReview(false);
      }}
      onEditProfile={() => setEditingProfile(true)}
    />
    {settingsPanel}
    </>
  );
}


return (
  <main
    data-theme={appTheme}
    className="flex min-h-screen flex-col items-center justify-start gap-6 bg-[#0b1018] px-0 text-white"
  >
   {shouldShowGlobalAppControls ? globalAppControls : null}
   {workoutComplete ? (
  <WorkoutCompleteScreen
    isPartial={latestCompletedReview?.isPartial ?? false}
    review={latestCompletedReview}
    onDone={() => {
      setWorkoutComplete(false);
      setWorkoutReview(null);
      setShowDailyPlan(false);
    }}
  />
) : started && workout ? (
      <WorkoutScreen
        exerciseIndex={exerciseIndex}
        activePlan={activePlan}
        passLabel={currentPassLabel}
        coachData={coachData}
        dayForm={dayForm}
        setDayForm={setDayForm}
        currentSets={workout?.exercises?.[exerciseIndex]?.sets ?? []}
        chatLog={chatLog}
        chatInput={chatInput}
        setChatInput={setChatInput}
        sendChat={sendChat}
        workoutExerciseInput={workoutExerciseInput}
        setWorkoutExerciseInput={setWorkoutExerciseInput}
        addExerciseDuringWorkout={addExerciseDuringWorkout}
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
        durationSecondsInput={durationSecondsInput}
        setDurationSecondsInput={setDurationSecondsInput}
        rirInput={rirInput}
        setRirInput={setRirInput}
        didFailInput={didFailInput}
        setDidFailInput={setDidFailInput}
        failNoteInput={failNoteInput}
        setFailNoteInput={setFailNoteInput}
        addSet={addSet}
        removeLastSet={removeLastSet}
        skipCurrentExercise={skipCurrentExercise}
        canSkipCurrentExercise={(workout?.exercises?.[exerciseIndex]?.sets.length ?? 0) === 0}
        skippedExerciseName={skippedExercise?.exercise.name ?? null}
        undoSkipExercise={undoSkipExercise}
        prevExercise={prevExercise}
        nextExercise={nextExercise}
        finishWorkout={finishWorkout}
        personalRecords={personalRecords}
        progression={progression}
        progressionPlan={progressionPlan}
      />
      
) : workoutReview ? (
  <WorkoutReviewScreen
    review={workoutReview}
    onClose={() => {
      setWorkoutReview(null);
      setWorkoutComplete(true);
    }}
  />
) : showDailyPlan ? (
  <StartScreen
    nextPass={nextPass}
    nextPassLabel={nextPassLabel}
    recommendedPass={recommendedNextPass}
    availablePasses={availablePassChoices}
    onSelectPass={(pass) => {
      setSelectedStartPass(pass);
      setCheckInCoachReply("");
    }}
    now={now}
    plan={savedPlan}
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
    addTodayExercise={addTodayExercise}
    removeTodayExercise={removeTodayExercise}
    removeCustomExercise={removeCustomExercise}
    removePlannedExercise={removePlannedExercise}
    customExercisesByPass={customExercisesByPass}
    todayExercisesByPass={todayExercisesByPass}
    checkInInput={checkInInput}
    setCheckInInput={setCheckInInput}
    checkInCoachReply={checkInCoachReply}
    setCheckInCoachReply={setCheckInCoachReply}
    startWorkout={startWorkout}
    hasAcceptedTrainingSafety={hasAcceptedTrainingSafety}
    onAcceptTrainingSafety={() => {
      setHasAcceptedTrainingSafety(true);
      saveJSON("acceptedTrainingSafety", true);
    }}
    setEditingProfile={setEditingProfile}
    name={profileName}
  />
) : showStatistics ? (
  <StatisticsScreen
    history={history}
    onBack={() => setShowStatistics(false)}
    onOpenExercises={(exerciseName) => {
      setSelectedProgressExercise(exerciseName ?? null);
      setShowStatistics(false);
      setShowExerciseProgress(true);
    }}
  />
) : showHistory ? (
  <HistoryScreen
    history={history}
    onBack={() => setShowHistory(false)}
    onOpenExercise={(exerciseName) => {
      setSelectedProgressExercise(exerciseName);
      setShowHistory(false);
      setShowExerciseProgress(true);
    }}
  />
) : showPersonalRecords ? (
  <PersonalRecordsScreen
    personalRecords={personalRecords}
    onBack={() => setShowPersonalRecords(false)}
    onOpenExercise={(exerciseName) => {
      setSelectedProgressExercise(exerciseName);
      setShowPersonalRecords(false);
      setShowExerciseProgress(true);
    }}
  />
) : showExerciseProgress ? (
  <ExerciseProgressScreen
    history={history}
    initialExerciseName={selectedProgressExercise}
    onBack={() => {
      setSelectedProgressExercise(null);
      setShowExerciseProgress(false);
    }}
  />
) : (
  <LobbyScreen
    name={profileName}
    nextPassLabel={nextPassLabel}
    history={history}
    personalRecords={personalRecords}
    weeklyStats={weeklyStats}
    daysPerWeek={userProfile.daysPerWeek}
    theme={appTheme}
    onStartWorkout={() => {
      setShowExerciseProgress(false);
      setShowStatistics(false);
      setShowHistory(false);
      setShowPersonalRecords(false);
      setShowSettings(false);
      setSelectedProgressExercise(null);
      setShowDailyPlan(true);
    }}
    onOpenStatistics={() => {
      setShowHistory(false);
      setShowExerciseProgress(false);
      setShowPersonalRecords(false);
      setShowSettings(false);
      setShowStatistics(true);
    }}
    onOpenHistory={() => {
      setShowStatistics(false);
      setShowExerciseProgress(false);
      setShowPersonalRecords(false);
      setShowSettings(false);
      setShowHistory(true);
    }}
    onOpenExercises={() => {
      setShowHistory(false);
      setShowStatistics(false);
      setShowPersonalRecords(false);
      setShowSettings(false);
      setSelectedProgressExercise(null);
      setShowExerciseProgress(true);
    }}
    onOpenPersonalRecords={() => {
      setShowHistory(false);
      setShowStatistics(false);
      setShowExerciseProgress(false);
      setShowSettings(false);
      setShowPersonalRecords(true);
    }}
    onOpenSetup={() => {
      setShowExerciseProgress(false);
      setShowStatistics(false);
      setShowHistory(false);
      setShowPersonalRecords(false);
      setShowSettings(false);
      setSelectedProgressExercise(null);
      setEditingProfile(true);
    }}
  />
)}
{settingsPanel}
</main>
);
}
