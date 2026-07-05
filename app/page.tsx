"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import StartScreen from "./components/StartScreen";
import WorkoutScreen from "./components/WorkoutScreen";
import SetupScreen from "./components/SetupScreen";
import WorkoutReviewScreen from "./components/WorkoutReviewScreen";
import WorkoutCompleteScreen from "./components/WorkoutCompleteScreen";
import LobbyScreen from "./components/LobbyScreen";
import AuthStartScreen from "./components/AuthStartScreen";
import ExerciseProgressScreen from "./components/ExerciseProgressScreen";
import StatisticsScreen from "./components/StatisticsScreen";
import HistoryScreen from "./components/HistoryScreen";
import PersonalRecordsScreen from "./components/PersonalRecordsScreen";
import ProgramReviewScreen from "./components/ProgramReviewScreen";
import ProgramBuildLoadingScreen from "./components/ProgramBuildLoadingScreen";
import SettingsScreen from "./components/SettingsScreen";
import { SettingsGlyph } from "./components/IconGlyphs";
import { scheduleBetaSync, syncBetaSnapshotNow } from "./lib/betaSync";
import { syncBetaCoachMemory, syncBetaPersonalRecord } from "./lib/betaMemorySync";
import {
  syncStructuredBetaProfile,
  syncStructuredBetaProgram,
} from "./lib/betaProfileSync";
import { syncStructuredBetaWorkout } from "./lib/betaWorkoutSync";
import {
  requestAiCoachChatReply,
  requestAiCoachSetReply,
  requestAiProgramBuild,
  requestAiProgramReply,
  requestAiWorkoutReview,
  type BuiltWorkoutPlan,
  type CoachExerciseLibraryInfo,
  type CoachProgramSuggestion,
  type CoachProgramSuggestionAction,
  type CoachSetContext,
  type CoachWorkoutReviewResult,
} from "./lib/coachAi";
import {
  getExerciseDefinition,
  getExerciseProfile,
  getExerciseUserInfo,
  getProgramExercisePool,
  isBodyweightExercise,
  isTimedExercise,
  normalizeExerciseSearchText,
  resolveExerciseName,
} from "./lib/exercises";
type PassType = "A" | "B" | "C" | "D" | "E" | "F" | "G";
type ProgramStartMode = "coach" | "manual";
type AppTheme = "dark" | "light";

const PROGRAM_BUILD_MIN_MS = 4500;
const ALL_PASS_KEYS: PassType[] = ["A", "B", "C", "D", "E", "F", "G"];
const ACTIVE_WORKOUT_DRAFT_KEY = "activeWorkoutDraft";
const AUTH_GATE_BYPASS_KEY = "mincoachContinueWithoutAccount";
const COACH_PROGRAM_MAX_DAYS = 6;
const MANUAL_PROGRAM_MAX_DAYS = 7;
const WORKOUT_FINISH_LINES = [
  "Där är vi klara med dagens pass. Gå vidare så kollar vi igenom det.",
  "Där stänger vi passet. Gå vidare så tar vi genomgången.",
  "Klart för idag. Tryck vidare så går vi igenom vad vi tar med oss.",
  "Där har vi dagens jobb. Gå vidare så summerar vi passet.",
  "Passet är klart. Gå vidare så tittar vi på helheten.",
];

function getPassKeys(daysPerWeek: number, maxDays = COACH_PROGRAM_MAX_DAYS) {
  const count = Math.min(Math.max(1, Math.round(daysPerWeek) || 1), maxDays);
  return ALL_PASS_KEYS.slice(0, count);
}

function cleanPassDisplayLabel(value: string) {
  return value
    .replace(/\bRyggraden\b/g, "Ryggen")
    .replace(/\bryggraden\b/g, "ryggen")
    .replace(/\bRyggrad\b/g, "Rygg")
    .replace(/\bryggrad\b/g, "rygg")
    .replace(/\s+/g, " ")
    .trim();
}

function createEmptyPassStringMap(): Record<PassType, string[]> {
  return ALL_PASS_KEYS.reduce(
    (map, key) => ({ ...map, [key]: [] }),
    {} as Record<PassType, string[]>
  );
}

function createEmptyPassOverrideMap(): Record<PassType, Record<string, string>> {
  return ALL_PASS_KEYS.reduce(
    (map, key) => ({ ...map, [key]: {} }),
    {} as Record<PassType, Record<string, string>>
  );
}

function copyPassStringMap(map: Partial<Record<PassType, string[]>>) {
  return ALL_PASS_KEYS.reduce(
    (next, key) => ({ ...next, [key]: [...(map[key] ?? [])] }),
    {} as Record<PassType, string[]>
  );
}

function copyPassOverrideMap(
  map: Partial<Record<PassType, Record<string, string>>>
) {
  return ALL_PASS_KEYS.reduce(
    (next, key) => ({ ...next, [key]: { ...(map[key] ?? {}) } }),
    {} as Record<PassType, Record<string, string>>
  );
}

function AppControls({
  theme,
  onOpenSettings,
}: {
  theme: AppTheme;
  onOpenSettings: () => void;
}) {
  const isLight = theme === "light";
  const buttonClassName = isLight
    ? "flex h-11 w-11 items-center justify-center rounded-full bg-white/76 text-[#4a3f34] shadow-[0_16px_38px_rgba(91,72,48,0.14),inset_0_0_0_1px_rgba(122,101,72,0.12)] backdrop-blur-2xl transition hover:bg-white"
    : "flex h-11 w-11 items-center justify-center rounded-full bg-[#101824]/76 text-white/86 shadow-[0_16px_38px_rgba(0,0,0,0.30),inset_0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl transition hover:bg-[#131c27]/92 hover:text-white";

  return (
    <div className="fixed right-3 top-3 z-40 flex items-center gap-1.5 sm:right-6 sm:top-5">
      <button
        type="button"
        onClick={onOpenSettings}
        className={buttonClassName}
        aria-label="Inställningar"
        title="Inställningar"
      >
        <SettingsGlyph
          className={`h-5 w-5 ${
            isLight
              ? "drop-shadow-[0_0_10px_rgba(47,109,246,0.22)]"
              : "drop-shadow-[0_0_12px_rgba(47,109,246,0.46)]"
          }`}
        />
      </button>
    </div>
  );
}

function WorkoutReviewLoadingScreen({ theme }: { theme: AppTheme }) {
  const isLight = theme === "light";

  return (
    <div className="w-full max-w-xl px-5 pb-10 pt-16 sm:px-6">
      <section
        className={`rounded-[1.75rem] px-6 py-7 ${
          isLight
            ? "border border-[#d9cbbb]/70 bg-[#fffdf8]/92 text-[#2b2520] shadow-[0_24px_70px_rgba(92,74,49,0.18)]"
            : "border border-white/8 bg-[#131a25] text-white shadow-[0_24px_70px_rgba(0,0,0,0.34)]"
        }`}
      >
        <p
          className={`text-[0.68rem] font-black uppercase tracking-[0.22em] ${
            isLight ? "text-[#8a7867]" : "text-slate-400"
          }`}
        >
          Pass klart
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight">
          Coachen sammanfattar passet.
        </h1>
        <p
          className={`mt-3 max-w-sm text-sm font-semibold leading-6 ${
            isLight ? "text-[#6f6256]" : "text-slate-300"
          }`}
        >
          Jag kollar igenom seten och tar fram det viktigaste.
        </p>
        <div className="mt-7 flex items-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-10 animate-pulse rounded-full bg-[#2f6df6] shadow-[0_0_20px_rgba(47,109,246,0.52)]" />
          <span
            className={`h-2.5 w-2.5 animate-pulse rounded-full [animation-delay:120ms] ${
              isLight ? "bg-[#8a7867]/24" : "bg-white/18"
            }`}
          />
          <span
            className={`h-2.5 w-2.5 animate-pulse rounded-full [animation-delay:240ms] ${
              isLight ? "bg-[#8a7867]/24" : "bg-white/18"
            }`}
          />
        </div>
      </section>
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
  exerciseKey?: string;
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
  plannedSets?: number;
  plannedReps?: string;
  plannedRir?: string;
  completed?: boolean;
  sets: LoggedSet[];
};

type WorkoutEvent = {
  type: "pain" | "exercise_replaced" | "exercise_completed_early";
  exerciseName: string;
  note?: string;
  setCount?: number;
  replacementName?: string;
  createdAt: string;
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
type ReviewSet = {
  weight: number;
  reps: number;
  rir?: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  setIndex: number;
  exerciseKey: string;
};

type ReviewExercise = {
  name: string;
  sets: ReviewSet[];
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
  loggedExercises: ReviewExercise[];
  workoutId: string;
  passKey: string;
  startedAt: string;
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
  events?: WorkoutEvent[];
  warmupContext?: WarmupContext | null;
  conditioningContext?: ConditioningContext | null;
  summary?: WorkoutSummary;
};

type ActiveWorkoutDraft = {
  workout: Workout;
  exerciseIndex: number;
  skippedExercise: SkippedExercise | null;
  chatLog: {
    role: "you" | "coach";
    text: string;
    setNumber?: number;
    source?: "engine" | "llm" | "fallback";
  }[];
  chatInput: string;
  weightInput: string;
  repsInput: string;
  durationSecondsInput: number;
  rirInput: number;
  didFailInput: boolean;
  failNoteInput: string;
  dayForm: DayForm | null;
  activeWarmupContext: WarmupContext | null;
  activeConditioningContext: ConditioningContext | null;
  savedAt: string;
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
  const passKeys = getPassKeys(daysPerWeek);
  const currentIndex = lastPass ? passKeys.indexOf(lastPass) : -1;

  return passKeys[(currentIndex + 1) % passKeys.length] ?? "A";
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

function getPreviousWorkoutSummaryLine(history: Workout[]): string | null {
  const prev = history[0];
  if (!prev) return null;

  const allSets = prev.exercises.flatMap((ex) => ex.sets);
  const totalSets = allSets.length;
  if (totalSets === 0) return null;

  const exerciseCount = prev.exercises.filter((ex) => ex.sets.length > 0).length;
  const exWord = exerciseCount === 1 ? "övning" : "övningar";
  return `Förra passet: ${totalSets} set, ${exerciseCount} ${exWord}.`;
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

function getRotatingWorkoutFinishLine(workoutId: string, setNumber: number) {
  const seed = `${workoutId}-${setNumber}`;
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return WORKOUT_FINISH_LINES[hash % WORKOUT_FINISH_LINES.length];
}

function appendWorkoutFinishLine(text: string, finishLine: string) {
  const trimmed = text.trim();
  if (!trimmed) return finishLine;

  const normalized = trimmed.toLowerCase();
  const alreadySendsToReview =
    normalized.includes("genomg") ||
    normalized.includes("kollar vi igenom") ||
    normalized.includes("tittar vi p") ||
    normalized.includes("summerar vi") ||
    normalized.includes("gå vidare") ||
    normalized.includes("gå vidare");

  if (alreadySendsToReview) return trimmed;

  return `${trimmed}\n\n${finishLine}`;
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

type ProgressionOpportunity = {
  type: "offer_increase" | "increase_now" | "optional_last_set_test";
  confidence: "medium" | "high";
  suggestedWeight: string;
  reason: string;
  tone: "offer" | "clear";
};

type ExerciseProgressionPlan = {
  action: "start" | "hold" | "increase" | "decrease" | "deload";
  weight: string;
  reps: string;
  repsText: string;
  rirText: string;
  note: string;
  reason: string;
  opportunity?: ProgressionOpportunity;
};

function formatWeightInput(weight: number) {
  if (!Number.isFinite(weight)) return "";
  return Number(weight.toFixed(2)).toString();
}

function formatRepRange(min: number, max: number) {
  if (min === max) return `${min} reps`;
  return `${min}-${max} reps`;
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

function getPreviousExerciseSets(
  history: Workout[],
  exerciseName: string
) {
  const key = exerciseKey(exerciseName);
  const workouts = [...history].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)
  );
  const matches: LoggedExercise[] = [];

  for (const workout of workouts) {
    const exercise = workout.exercises.find(
      (item) => exerciseKey(item.name) === key
    );

    if (exercise?.sets.length) matches.push(exercise);
  }

  const completedMatch = matches.find(
    (exercise) =>
      typeof exercise.plannedSets === "number" &&
      exercise.plannedSets > 1 &&
      exercise.sets.length >= exercise.plannedSets
  );

  if (completedMatch) return completedMatch.sets;

  const usefulMatch = matches.find((exercise) => exercise.sets.length > 1);

  return usefulMatch?.sets ?? matches[0]?.sets ?? [];
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
  const workingRepRange = getWorkingRepRange(exerciseName, targetReps);
  const topSetBelowWorkingRange =
    targetReps >= 8 && topSet.reps < workingRepRange.min;
  const topSetTooLight =
    targetReps >= 8 &&
    !latestHard &&
    !shouldDeload &&
    topSet.reps >= Math.max(targetReps + 4, workingRepRange.max + 4) &&
    hasUsefulMargin(topSet);
  const canIncrease =
    dayForm !== "trött" &&
    !shouldDeload &&
    !latestHard &&
    topWeightStableSets.length >= 2;
  const canOfferIncrease =
    dayForm !== "trött" &&
    !shouldDeload &&
    !latestHard &&
    !topSetBelowWorkingRange &&
    topSet.reps >= targetReps &&
    hasUsefulMargin(topSet) &&
    topWeightStableSets.length >= 1;
  const offerIncreaseOpportunity: ProgressionOpportunity | undefined =
    canOfferIncrease && !canIncrease
      ? {
          type: "offer_increase",
          confidence: "medium",
          suggestedWeight: formatWeightInput(
            getNextAvailableWeight(topSet.weight, exerciseName, "up")
          ),
          reason:
            "Toppsetet har nått målet med marginal nog för att ett försiktigt test upp kan vara rimligt.",
          tone: "offer",
        }
      : undefined;

  if (topSetTooLight && dayForm !== "trött") {
    const nextWeight = scaledProgressionJump(topSet.weight, exerciseName, topSet.reps, targetReps, topSet.rir);
    const minReps = workingRepRange.min;
    const maxReps = Math.max(
      minReps,
      Math.min(targetReps + 4, topSet.reps - 3)
    );

    return {
      action: "increase",
      weight: formatWeightInput(nextWeight),
      reps: String(minReps),
      repsText: formatRepRange(minReps, maxReps),
      rirText: "RIR 1-2",
      note: "Förra nivån blev för lätt. Vi går upp ett steg och hittar rätt belastning.",
      reason: "Senaste bästa setet hade höga reps med marginal kvar.",
      opportunity: {
        type: "increase_now",
        confidence: "high",
        suggestedWeight: formatWeightInput(nextWeight),
        reason: "Repsen blev för höga med marginal kvar.",
        tone: "clear",
      },
    } satisfies ExerciseProgressionPlan;
  }

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

  if (topSetBelowWorkingRange) {
    const loweredWeight = getNextAvailableWeight(topSet.weight, exerciseName, "down");

    return {
      action: "decrease",
      weight: formatWeightInput(loweredWeight),
      reps: String(workingRepRange.min),
      repsText: formatRepRange(workingRepRange.min, workingRepRange.max),
      rirText: "RIR 1-2",
      note: "Senaste nivån hamnade för lågt i reps för målet. Jag tycker vi sänker lite och bygger bättre arbetsset.",
      reason: "Repsspannet ska passa muskelbygge, inte bli ett tungt styrketest.",
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
      rirText: "RIR 1-2",
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
      rirText: "RIR 1-2",
      note: `${formatWeightInput(topSet.weight)} kg har suttit flera pass. Nu testar vi lite upp.`,
      reason: "Samma toppvikt har suttit flera pass med tillräckligt många reps.",
      opportunity: {
        type: "increase_now",
        confidence: "high",
        suggestedWeight: formatWeightInput(nextWeight),
        reason:
          "Samma toppvikt har suttit flera pass med tillräckligt många reps.",
        tone: "clear",
      },
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
    rirText: "RIR 1-2",
    note: "Samma vikt som ditt bästa. Vi siktar lite lägre först.",
    reason: `Jag vill se att ${formatWeightInput(topSet.weight)} kg sitter nära ${topSet.reps} reps minst ett pass till innan vi höjer.`,
    opportunity: offerIncreaseOpportunity,
  } satisfies ExerciseProgressionPlan;
}

function buildProgressionCoachExplanation(args: {
  plan: ExerciseProgressionPlan;
  exerciseName: string;
}) {
  const { plan, exerciseName } = args;
  const target = plan.weight
    ? `${plan.weight} kg - ${plan.repsText} - ${plan.rirText}`
    : `${plan.repsText} - ${plan.rirText}`;

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
    `Bra fråga. ${exerciseName} är inte â€œfarligâ€ i sig, men den ska kännas trygg.`,
    caution || "Om något gör ont eller känns fel så justerar vi direkt.",
    cue ? `Idag vill jag att du tänker: ${cue}` : "",
    "Börja kontrollerat. Känns något fel stoppar vi direkt.",
  ]);
}

function extractWeightRepText(message: string) {
  const match = message
    .toLowerCase()
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)\s*(?:kg)?\s*(?:x|Ã—)\s*(\d+)/);

  if (!match) return "";

  return `${formatCoachWeight(Number(match[1]))} Ã— ${match[2]}`;
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
    ? `${formatCoachWeight(latestSet.weight)} Ã— ${latestSet.reps}${
        latestSet.rir !== undefined ? ` - RIR ${latestSet.rir}` : ""
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
      "Haha ja, nu är du inne i passet ðŸ”¥",
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
      "Kanon. Det där vill jag höra ðŸ”¥",
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
      "Liten höjning är okej om du fortfarande kan hålla RIR 1-2.",
      "Hellre en smart höjning än ett slarvigt maxförsök.",
    ]);
  }

  if (args.dayForm === "stark") {
    return shortCoach([
      "Bra. Då kan vi vara lite mer offensiva idag ðŸ’ª",
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

  return `Du har legat på ${latestThree[0].weight} kg i 3 pass. Om tekniken känns bra kan vi testa +${formatWeightInput(
    getExerciseWeightStep(exerciseName)
  )} kg nästa gång.`;
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

  return `Du har haft flera väldigt tunga set senaste passen. Det kan vara smart att köra en lättare dag runt ${formatWeightInput(deloadWeight)} kg eller ungefär 5â€“10 % lättare.`;
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
  E: ["Bröstpress", "Maskinrodd", "Sidolyft"],
  F: ["Benpress", "Lårcurl", "Machine crunch"],
  G: ["Planka", "Höftlyft", "Upphöjda armhävningar"],
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

 const passKeys = getPassKeys(profile.daysPerWeek);

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
        .map((exercise) => {
          const overrideName = overrides[exerciseKey(exercise.name)];

          return overrideName
            ? { ...exercise, exerciseKey: undefined, name: overrideName }
            : exercise;
        });

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
    .replace(/^[-â€¢]\s*/, "")
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
  const markerRegex = /(dag|pass)\s*([1-7a-g])\s*:?\s*/gi;
  const matches = [...text.matchAll(markerRegex)];

  if (matches.length === 0) return null;

  const passes = matches.slice(0, MANUAL_PROGRAM_MAX_DAYS).map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const nextMatch = matches[index + 1];
    const end = nextMatch?.index ?? text.length;
    const content = text.slice(start, end);
    const key = ALL_PASS_KEYS[index] as PassType;
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

function buildEmptyManualWorkoutPlan(profile: UserProfile): StoredWorkoutPlan {
  const passes = getPassKeys(profile.daysPerWeek, MANUAL_PROGRAM_MAX_DAYS).map(
    (key, index) => ({
      key,
      displayName: `Pass ${index + 1}`,
      intent: "Du bygger detta pass själv. Coachen kan granska och hjälpa till när övningarna är på plats.",
      exercises: [],
    })
  );

  return {
    title: "Eget upplägg",
    goalPrimary: profile.goalPrimary,
    daysPerWeek: passes.length,
    coachSummary:
      "Du startar med tomma pass. Lägg in övningar själv, så hjälper coachen dig att hålla upplägget rimligt.",
    planReason:
      "Här styr du övningsvalen. Coachen finns kvar som kvalitetskontroll.",
    structureReason:
      "Passen är tomma tills du lägger in övningar. Det här är rätt start om du redan vet hur du vill träna.",
    safetyNotes: profile.limitations?.trim()
      ? [`Jag tar hänsyn till: ${profile.limitations.trim()}.`]
      : [],
    source: "manual",
    builtAt: new Date().toISOString(),
    profileSignature: getProgramProfileSignature(profile),
    passes,
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
      customExercisesByPass: createEmptyPassStringMap(),
      exerciseOverridesByPass: createEmptyPassOverrideMap(),
      removedExercisesByPass: createEmptyPassStringMap(),
    }),
    profileSignature: getProgramProfileSignature(profile),
  };
}

function getAvailableProgramExercises(profile: UserProfile) {
  return getProgramExercisePool({
    location: profile.location,
    equipment: profile.location === "hemma" ? profile.equipment : [],
    exercisePreferences: profile.exercisePreferences ?? [],
    trainingExperience: profile.trainingExperience,
  }).map((exercise) => {
    const profile = getExerciseProfile(exercise.name);

    return {
      exerciseKey: exercise.exerciseKey,
      name: exercise.name,
      category: profile.category,
      equipment: profile.equipment,
      environment: exercise.environment,
      equipmentTags: exercise.equipmentTags,
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles,
      exerciseType: exercise.exerciseType,
      movementPattern: exercise.movementPattern,
      logType: exercise.logType,
      difficulty: exercise.difficulty,
      beginnerFit: exercise.beginnerFit,
      stability: exercise.stability,
      beginnerNote: exercise.beginnerNote,
      substitutions: exercise.substitutions,
      coachReason: exercise.coachReason,
      techniqueCue: profile.techniqueCue,
      progressionRule: profile.progressionRule,
      caution: profile.caution,
    };
  });
}

function buildExerciseLibraryInfo(
  exerciseName: string
): CoachExerciseLibraryInfo {
  const info = getExerciseUserInfo(exerciseName);
  const def = getExerciseDefinition(exerciseName);

  return {
    exerciseKey: info.exerciseKey || undefined,
    name: info.name,
    trains: info.trains,
    equipment: info.equipment,
    whyChosen: info.whyChosen,
    logTypeText: info.logTypeText,
    keepInMind: info.keepInMind,
    easierAlternative: info.easierAlternative || undefined,
    techniqueCue: info.techniqueCue,
    progressionRule: info.progressionRule,
    category: def?.category,
    primaryMuscle: def?.primaryMuscle,
    movementPattern: def?.movementPattern,
    techniqueFocus: def?.techniqueFocus,
  };
}

function buildExerciseLibraryInfoList(exerciseNames: string[]) {
  const seen = new Set<string>();

  return exerciseNames
    .map(buildExerciseLibraryInfo)
    .filter((info) => {
      const key = info.exerciseKey || exerciseKey(info.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 24)
    .map(({ techniqueFocus: _tf, ...rest }) => rest);
}

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 5;
const PROGRESSION_STEP = 2.5;
const BARBELL_WEIGHT_STEP = 5;
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

function isBarbellWeightExercise(exerciseName: string) {
  const lowerName = exerciseName.toLowerCase();
  const definition = getExerciseDefinition(exerciseName);
  const tags = definition?.equipmentTags ?? [];
  const equipment = definition?.equipment.toLowerCase() ?? "";
  const explicitlyNamedBarbell =
    lowerName.includes("stång") ||
    lowerName.includes("stang") ||
    lowerName.includes("skivstång") ||
    lowerName.includes("skivstang") ||
    lowerName.includes("barbell");
  const barbellOnlyDefinition =
    tags.includes("barbell") &&
    !tags.includes("dumbbells") &&
    !tags.includes("machines") &&
    !tags.includes("cables");

  return (
    explicitlyNamedBarbell ||
    barbellOnlyDefinition ||
    equipment === "skivstång" ||
    equipment === "skivstang"
  );
}

function getExerciseWeightStep(exerciseName: string) {
  if (isBarbellWeightExercise(exerciseName)) return BARBELL_WEIGHT_STEP;
  return PROGRESSION_STEP;
}

// Returns a scaled weight increase when the user was clearly underloaded.
// Uses "could-have-done reps" (actual + RIR) vs target to estimate load deficit.
function scaledProgressionJump(
  weight: number,
  exerciseName: string,
  actualReps: number,
  targetReps: number,
  rir: number | null | undefined
): number {
  const baseStep = getExerciseWeightStep(exerciseName);
  const couldHaveDone = actualReps + (typeof rir === "number" ? rir : 2);
  const excessCapacity = Math.max(0, couldHaveDone - targetReps);
  if (excessCapacity < 5) {
    return normalizeSuggestedWeight(weight + baseStep, exerciseName, "nearest");
  }
  // ~2.5% load increase per rep of excess capacity, capped at 40%
  const loadIncreasePct = Math.min(excessCapacity * 0.025, 0.40);
  return normalizeSuggestedWeight(weight * (1 + loadIncreasePct), exerciseName, "nearest");
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

  const step = getExerciseWeightStep(exerciseName);
  const next =
    direction === "up" ? weight + step : Math.max(0, weight - step);
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
    return roundToStep(weight, getExerciseWeightStep(exerciseName), mode);
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

function isStableMachineOrCableExercise(exerciseName: string) {
  const definition = getExerciseDefinition(exerciseName);

  if (!definition) return false;

  return (
    definition.logType === "weight_reps_rir" &&
    (definition.equipmentTags.includes("machines") ||
      definition.equipmentTags.includes("cables"))
  );
}

function getMinimumWorkingReps(exerciseName: string, targetReps: number) {
  if (targetReps <= 6) return Math.max(3, targetReps - 1);

  if (isStableMachineOrCableExercise(exerciseName)) {
    return Math.min(targetReps, 8);
  }

  const restKind = getExerciseRestKind(exerciseName);

  if (restKind === "heavy") return Math.min(targetReps, 6);
  if (restKind === "isolation") return Math.min(targetReps, 8);

  return Math.min(targetReps, 8);
}

function getWorkingRepRange(exerciseName: string, targetReps: number) {
  const min = getMinimumWorkingReps(exerciseName, targetReps);
  return {
    min,
    max: Math.max(min, targetReps),
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
    return "Fokus: paus i toppen och kontakt innan vi höjer.";
  }

  if (name.includes("vad")) {
    return "Fokus: stretch i botten och paus i toppen.";
  }

  if (name.includes("biceps") || name.includes("curl")) {
    return "Fokus: ren curl, stilla armbågar och ingen sving.";
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
    return "Ansträngningen börjar märkas nu, så håll tekniken ren.";
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
    return `${Math.max(1, max - 1)}â€“${max} reps`;
  }

  if (rir === 1) {
    const max = Math.max(1, reps - 1);
    return `${Math.max(1, max - 1)}â€“${max} reps`;
  }

  if (rir === 2) {
    return `${Math.max(1, reps - 1)}â€“${reps} reps`;
  }

  return `${Math.max(6, reps - 1)}â€“${reps} reps`;
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

    return base;
  }

  const base = shouldDisplayAsBodyweight(args.exerciseName, args.weight)
    ? `${args.reps} reps`
    : `${formatCoachWeight(args.weight)} kg x ${args.reps}`;

  return typeof args.rir === "number" ? `${base} - RIR ${args.rir}` : base;
}

function formatNextLoadText(exerciseName: string, weight: number) {
  return shouldDisplayAsBodyweight(exerciseName, weight)
    ? "kroppsvikt"
    : `${formatCoachWeight(weight)} kg`;
}

function parsePlannedSetCount(sets?: string | null) {
  if (!sets) return null;

  const numbers = sets.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (numbers.length === 0) return null;

  return Math.max(1, Math.min(...numbers));
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
  opportunity?: ProgressionOpportunity;
};

function getSameWeightTrendSignal(args: {
  weight: number;
  reps: number;
  rir: number;
  previousSets?: { weight: number; reps: number; rir?: number }[];
  targetReps: number;
  exerciseName?: string;
}) {
  const sets = [
    ...(args.previousSets ?? []),
    { weight: args.weight, reps: args.reps, rir: args.rir },
  ].filter(
    (set) =>
      set.weight === args.weight &&
      set.reps > 0 &&
      typeof set.rir === "number"
  );

  if (sets.length < 2) {
    return {
      repsClimbed: false,
      tooEasy: false,
      firstReps: args.reps,
      currentReps: args.reps,
    };
  }

  const first = sets[0];
  const current = sets[sets.length - 1];
  const exerciseName = args.exerciseName ?? "";
  const restKind = exerciseName ? getExerciseRestKind(exerciseName) : "normal";
  const isHighRepExercise =
    restKind === "isolation" ||
    (exerciseName ? isStableMachineOrCableExercise(exerciseName) : false);
  const tooEasyRepFloor = isHighRepExercise
    ? Math.max(args.targetReps + 4, 14)
    : Math.max(args.targetReps + 5, 16);
  const allHadMargin = sets.every((set) => typeof set.rir === "number" && set.rir >= 2);
  const repsClimbed = current.reps >= first.reps + 2;
  const highEnoughToBeTooEasy =
    current.reps >= tooEasyRepFloor;
  const singleSetClearlyTooEasy =
    typeof current.rir === "number" &&
    current.rir >= 2 &&
    current.reps >= tooEasyRepFloor;

  return {
    repsClimbed,
    tooEasy:
      (repsClimbed && allHadMargin && highEnoughToBeTooEasy) ||
      singleSetClearlyTooEasy,
    firstReps: first.reps,
    currentReps: current.reps,
  };
}

function getTimedTargetText(seconds: number) {
  return formatDurationText(Math.max(1, Math.round(seconds)));
}

function getNextTimedSetPlan(args: {
  weight: number;
  durationSeconds: number;
  failNote?: string;
  setNumber: number;
  plannedSetCount?: number;
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
  const restText = "60-90 sek.";
  const techniqueCue = getExerciseCue(exerciseName);
  const plannedSetCount = Math.max(1, args.plannedSetCount ?? 3);

  if (hasPainIssue) {
    return {
      weight: args.weight,
      repsText: "gå vidare",
      repsInput: 0,
      rirText: "",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason:
        "Smärta går före tiden. Vi lämnar övningen eller väljer en smärtfri variant.",
    } satisfies NextSetPlan;
  }

  if (args.setNumber >= plannedSetCount) {
    return {
      weight: args.weight,
      repsText: "gå vidare",
      repsInput: 0,
      rirText: "",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason:
        "Vi har fått den tidskvalitet vi behöver här. Nästa övning nu.",
    } satisfies NextSetPlan;
  }

  return {
    weight: args.weight,
    repsText: getTimedTargetText(args.durationSeconds),
    repsInput: 0,
    rirText: "",
    rirInput: 2,
    restText,
    techniqueCue,
    strategy: "hold",
    reason: "Tiden är loggad. Vi håller nästa set enkelt och kontrollerat.",
  } satisfies NextSetPlan;
}

function getNextSetPlan(args: {
  weight: number;
  reps: number;
  rir: number;
  failNote?: string;
  setNumber: number;
  plannedSetCount?: number;
  targetReps?: number;
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
  const plannedSetCount = Math.max(1, args.plannedSetCount ?? 3);
  const targetReps = Math.max(1, args.targetReps ?? 10);
  const workingRepRange = getWorkingRepRange(exerciseName, targetReps);
  const plannedExtraSet =
    decisionProfile.type !== "technical-heavy" &&
    plannedSetCount > decisionProfile.maxHardSets &&
    setNumber >= decisionProfile.maxHardSets &&
    setNumber < plannedSetCount;
  const sameWeightRepsDropped =
    previousSet &&
    previousSet.weight === weight &&
    previousSet.reps - reps >= 2;
  const hardEnoughToSkipPlannedExtra =
    rir <= 0 ||
    (rir <= 1 && Boolean(sameWeightRepsDropped)) ||
    (rir <= 1 && setNumber >= decisionProfile.maxHardSets);
  const shouldSkipPlannedExtraSet =
    plannedExtraSet && hardEnoughToSkipPlannedExtra;
  const activePlannedExtraSet = plannedExtraSet && !shouldSkipPlannedExtraSet;
  const finalSetNeedsQualityExtra =
    setNumber >= plannedSetCount &&
    !fail &&
    rir >= 2 &&
    reps < workingRepRange.min &&
    decisionProfile.type !== "technical-heavy";
  const shouldCompleteExercise =
    (setNumber >= plannedSetCount && !finalSetNeedsQualityExtra) ||
    (setNumber >= decisionProfile.maxHardSets &&
      !activePlannedExtraSet &&
      !finalSetNeedsQualityExtra);
  const plannedExtraSetReason =
    "Schemat har ett extraset här. Vi sänker lite så avslutet blir rent och faktiskt ger något.";
  const sameWeightTrend = getSameWeightTrendSignal({
    weight,
    reps,
    rir,
    previousSets: args.previousSets,
    targetReps,
    exerciseName,
  });
  const belowWorkingRepRange =
    targetReps >= 8 &&
    reps < workingRepRange.min &&
    !shouldCompleteExercise;
  const belowWorkingRepRangeWithMargin = belowWorkingRepRange && rir >= 2;
  const closeToWorkingRepRangeWithLowMargin =
    belowWorkingRepRange && reps >= Math.max(1, workingRepRange.min - 1) && rir <= 1;
  const isIsolation =
    techniqueCue.toLowerCase().includes("curl") ||
    techniqueCue.toLowerCase().includes("triceps") ||
    techniqueCue.toLowerCase().includes("sidolyft") ||
    techniqueCue.toLowerCase().includes("kontakt");
  const range = (min: number, max: number) =>
    min === max ? `${min} reps` : `${min}â€“${max} reps`;
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

  const highRepExercise =
    getExerciseRestKind(exerciseName) === "isolation" ||
    isStableMachineOrCableExercise(exerciseName);
  const highRepCeiling = highRepExercise
    ? Math.max(workingRepRange.max + 3, 15)
    : Math.max(workingRepRange.max + 4, 16);
  const tooManyRepsDespiteLowMargin =
    !shouldCompleteExercise && rir <= 1 && reps >= highRepCeiling;
  const onePlannedSetLeft =
    setNumber + 1 >= plannedSetCount && setNumber < plannedSetCount;
  const optionalTestWeight = getNextAvailableWeight(weight, exerciseName, "up");
  const previousSameWeightSet =
    previousSet &&
    previousSet.weight === weight &&
    typeof previousSet.rir === "number"
      ? previousSet
      : undefined;
  const currentSetShowsUsefulLoad =
    reps >= workingRepRange.min && rir >= 1 && rir <= 2;
  const previousSetShowsUsefulLoad =
    Boolean(previousSameWeightSet) &&
    previousSameWeightSet!.reps >= workingRepRange.min &&
    previousSameWeightSet!.rir! >= 1 &&
    previousSameWeightSet!.rir! <= 2;
  const sameWeightStayedStable =
    Boolean(previousSameWeightSet) && reps >= previousSameWeightSet!.reps - 1;
  const enoughEvidenceForOptionalTest =
    currentSetShowsUsefulLoad &&
    previousSetShowsUsefulLoad &&
    sameWeightStayedStable;
  const canUseLastSetAsTest =
    onePlannedSetLeft &&
    !shouldCompleteExercise &&
    !fail &&
    !hasPainIssue &&
    !hasTechniqueIssue &&
    !tooManyRepsDespiteLowMargin &&
    !sameWeightTrend.tooEasy &&
    decisionProfile.type !== "technical-heavy" &&
    optionalTestWeight > weight &&
    enoughEvidenceForOptionalTest &&
    reps <= highRepCeiling;
  const optionalLastSetOpportunity: ProgressionOpportunity | undefined =
    canUseLastSetAsTest
      ? {
          type: "optional_last_set_test",
          confidence: "medium",
          suggestedWeight: formatWeightInput(optionalTestWeight),
          reason:
            "Vikten fungerar. Sista planerade setet kan anvandas som ett litet test for att lara oss var nivan ligger, men det ar inget maste.",
          tone: "offer",
        }
      : undefined;

  if (finalSetNeedsQualityExtra) {
    const min = workingRepRange.min;
    const max = Math.max(min, Math.min(workingRepRange.max, reps + Math.max(1, rir)));

    return {
      weight,
      repsText: range(min, max),
      repsInput: min,
      rirText: "RIR 0-1",
      rirInput: 1,
      restText,
      techniqueCue,
      strategy: "hold",
      reason:
        "Det fanns mer kvar, men repsen blev lite låga. Vi slänger in ett set till här och försöker nå repsspannet.",
    } satisfies NextSetPlan;
  }

  if (fail) {
    if (hasPainIssue) {
      return {
        weight,
        repsText: "gå vidare",
        repsInput: reps,
        rirText: "",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          "Smärta går före planen. Vi lämnar övningen eller väljer en helt smärtfri variant.",
      } satisfies NextSetPlan;
    }

    if (fail.includes("grepp") && shouldCompleteExercise) {
      return {
        weight,
        repsText: "gå vidare",
        repsInput: reps,
        rirText: "",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          "Greppet tog stopp, inte ryggen. Bra, då är övningen klar här. Om det händer igen byter vi grepp eller sänker ett steg nästa gång.",
      } satisfies NextSetPlan;
    }

    if (shouldCompleteExercise) {
      return {
        weight,
        repsText: "gå vidare",
        repsInput: reps,
        rirText: "",
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
        rirText: "RIR 1-2",
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
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "reduce",
      reason: activePlannedExtraSet
        ? plannedExtraSetReason
        : "Det tog stopp. Vi sänker lite och jagar inte fler maxreps här.",
    } satisfies NextSetPlan;
  }

  if (belowWorkingRepRangeWithMargin) {
    const min = workingRepRange.min;
    const max = Math.max(min, Math.min(workingRepRange.max, reps + Math.max(1, rir)));

    return {
      weight,
      repsText: range(min, max),
      repsInput: min,
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "hold",
      reason:
        "Det fanns mer kvar. Vi håller vikten och försöker ta oss upp i repsspannet innan vi ändrar belastningen.",
    } satisfies NextSetPlan;
  }

  if (closeToWorkingRepRangeWithLowMargin) {
    const min = Math.max(1, reps);
    const max = Math.max(min, Math.min(workingRepRange.max, reps + 1));

    return {
      weight,
      repsText: range(min, max),
      repsInput: min,
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "hold",
      reason:
        "Du var precis vid arbetsområdet och marginalen var låg. Vi håller vikten och försöker få ett likadant eller lite bättre set.",
    } satisfies NextSetPlan;
  }

  if (belowWorkingRepRange) {
    const nextWeight = getBackoffWeight({
      weight,
      exerciseName,
      reason: "hard-backoff",
    });

    return {
      weight: nextWeight,
      repsText: range(workingRepRange.min, workingRepRange.max),
      repsInput: workingRepRange.min,
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "backoff",
      reason: activePlannedExtraSet
        ? plannedExtraSetReason
        : "Repsen hamnade för lågt för målet. Vi backar vikten och bygger ett bättre arbetsset.",
    } satisfies NextSetPlan;
  }

  if (tooManyRepsDespiteLowMargin) {
    const nextWeight = getNextAvailableWeight(weight, exerciseName, "up");
    const min = workingRepRange.min;
    const max = Math.max(min, workingRepRange.max);

    return {
      weight: nextWeight,
      repsText: range(min, max),
      repsInput: min,
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "press",
      reason:
        "Repsen stack iväg trots låg marginal. Vikten gör jobbet, men nästa set får ligga ett steg tyngre så vi hamnar i ett bättre arbetsområde.",
    } satisfies NextSetPlan;
  }

  if (rir <= 0) {
    if (shouldCompleteExercise) {
      return {
        weight,
        repsText: "gå vidare",
        repsInput: reps,
        rirText: "",
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
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "reduce",
      reason:
        activePlannedExtraSet
          ? plannedExtraSetReason
          : decisionProfile.type === "technical-heavy"
          ? "Det var ett hårt set. Jag tycker vi sänker lite så nästa set också blir rent."
          : isIsolation
          ? "Det var ett hårt set. Jag tycker vi sänker lite så vi får ett bra set till."
          : "Det var ett hårt set. Jag tycker vi sänker lite så nästa set också blir bra.",
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
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "backoff",
      reason: activePlannedExtraSet
        ? plannedExtraSetReason
        : "Samma vikt och reps krävde mer nu. Jag tycker vi sänker lite så nästa set blir lika träffsäkert.",
    } satisfies NextSetPlan;
  }

  if (sameWeightTrend.tooEasy) {
    if (shouldCompleteExercise) {
      return {
        weight,
        repsText: "gå vidare",
        repsInput: reps,
        rirText: "",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          "Samma vikt gav fler reps med marginal kvar. Den var för lätt idag; nästa gång öppnar vi högre.",
      } satisfies NextSetPlan;
    }

    const nextWeight = getNextAvailableWeight(weight, exerciseName, "up");

    return {
      weight: nextWeight,
      repsText: range(workingRepRange.min, workingRepRange.max),
      repsInput: workingRepRange.min,
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "press",
      reason:
        "Samma vikt gav fler reps med marginal kvar. Vi höjer ett steg och gör jobbet på rätt nivå.",
    } satisfies NextSetPlan;
  }

  if (shouldCompleteExercise && rir <= 2) {
    return {
      weight,
      repsText: "gå vidare",
      repsInput: reps,
      rirText: "",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason: "Den här övningen är klar. Vi går vidare.",
    } satisfies NextSetPlan;
  }

  if (rir === 1) {
    const closeEnoughToHold = reps >= Math.max(1, workingRepRange.min - 1);
    const stableRepeat =
      previousSet &&
      previousSet.weight === weight &&
      previousSet.reps === reps &&
      previousRir !== null &&
      previousRir <= rir;
    const isBackoff = setNumber >= 2 && !stableRepeat && !closeEnoughToHold;
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
      rirText: isBackoff ? "RIR 1-2" : "RIR 1",
      rirInput: isBackoff ? 2 : 1,
      restText,
      techniqueCue,
      strategy: isBackoff ? "backoff" : "hold",
      opportunity: !isBackoff ? optionalLastSetOpportunity : undefined,
      reason: stableRepeat
        ? "Samma vikt, reps och marginal igen. Det är stabilt, så vi håller nivån."
        : activePlannedExtraSet
        ? plannedExtraSetReason
        : isBackoff
        ? "Nu tar vi ett lättare set och får mer bra arbete ur övningen."
        : "Vi håller vikten och låter nästa set bekräfta nivån.",
    } satisfies NextSetPlan;
  }

  if (rir === 2) {
    const min = Math.max(1, reps - 1);
    return {
      weight,
      repsText: range(min, reps),
      repsInput: min,
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "hold",
      opportunity: optionalLastSetOpportunity,
      reason: activePlannedExtraSet
        ? plannedExtraSetReason
        : "Den nivån sitter. Vi tar samma vikt en gång till.",
    } satisfies NextSetPlan;
  }

  const nextWeight = getNextAvailableWeight(weight, exerciseName, "up");
  const min = Math.max(1, reps - 2);
  return {
    weight: nextWeight,
    repsText: range(min, reps),
    repsInput: min,
    rirText: "RIR 1-2",
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
    if (rir === 1) return "90â€“120 sek.";
    return "60â€“90 sek.";
  }

  if (kind === "normal") {
    if (rir <= 0) return "3 minuter";
    if (rir === 1) return "2â€“3 minuter";
    return "2 minuter";
  }

  if (rir <= 0) return "3â€“4 minuter";
  if (rir === 1) return "3 minuter";
  return "2â€“3 minuter";
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
  plannedSetCount?: number;
  isLastExercise?: boolean;
  previousSets: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
  }[];
  personalRecordText?: string;
  lastCoachMessage?: string;
  memoryInsight?: string;
  warmupContext: WarmupContext | null;
  conditioningContext: ConditioningContext | null;
}): CoachSetContext {
  const previousSet = args.previousSets[args.previousSets.length - 1];
  const isTimedSet = args.metricType === "time" || isTimedExercise(args.exerciseName);
  const signals: string[] = [];
  const plannedSetCount = args.plannedSetCount;
  const setsRemaining =
    typeof plannedSetCount === "number"
      ? Math.max(plannedSetCount - args.setNumber, 0)
      : undefined;
  const isLastSet =
    args.nextSetPlan.strategy === "complete" ||
    (typeof plannedSetCount === "number" && args.setNumber >= plannedSetCount);
  const nextSetIsLast =
    !isLastSet &&
    typeof plannedSetCount === "number" &&
    args.setNumber + 1 >= plannedSetCount;
  const currentSetText = formatLoggedSetText({
    exerciseName: args.exerciseName,
    weight: args.weight,
    reps: args.reps,
    durationSeconds: args.durationSeconds,
    metricType: args.metricType,
    rir: isTimedSet ? undefined : args.rir,
  });
  const previousSetText = previousSet
    ? formatLoggedSetText({
        exerciseName: args.exerciseName,
        weight: previousSet.weight,
        reps: previousSet.reps,
        durationSeconds: previousSet.durationSeconds,
        metricType: previousSet.metricType,
        rir: isTimedSet ? undefined : previousSet.rir,
      })
    : undefined;
  const nextLoadText = formatNextLoadText(args.exerciseName, args.nextSetPlan.weight);
  const progressionOpportunity: ProgressionOpportunity | undefined =
    args.nextSetPlan.opportunity ??
    (!isTimedSet && args.nextSetPlan.strategy === "press"
      ? {
          type: "increase_now",
          confidence: "high",
          suggestedWeight: nextLoadText,
          reason:
            "Setet gav nog marginal för att appen ska föreslå ett steg upp.",
          tone: "clear",
        }
      : undefined);
  const failText = args.failNote.trim().toLowerCase();
  const hasUserReportedTechniqueOrPain =
    Boolean(failText) &&
    (failText.includes("teknik") ||
      failText.includes("slarv") ||
      failText.includes("kontakt") ||
      failText.includes("grepp") ||
      failText.includes("ont") ||
      failText.includes("smärta") ||
      failText.includes("känning"));
  const shouldMentionTechniqueCue =
    args.nextSetPlan.strategy !== "complete" &&
    (args.setNumber === 1 || hasUserReportedTechniqueOrPain);
  const repsChange = previousSet ? args.reps - previousSet.reps : undefined;
  const rirChange =
    !isTimedSet && previousSet && typeof previousSet.rir === "number"
      ? args.rir - previousSet.rir
      : undefined;
  const weightChangeKg = previousSet ? args.weight - previousSet.weight : undefined;
  const sameWeightTrend = getSameWeightTrendSignal({
    weight: args.weight,
    reps: args.reps,
    rir: args.rir,
    previousSets: args.previousSets,
    targetReps: 10,
    exerciseName: args.exerciseName,
  });
  const decisionReasonCode = (() => {
    if (args.nextSetPlan.reason.toLowerCase().includes("extraset")) {
      return "planned_extra_finish";
    }

    if (sameWeightTrend.tooEasy) {
      return args.nextSetPlan.strategy === "complete"
        ? "too_light_next_time"
        : "too_light_increase_now";
    }

    if (isTimedSet) {
      return args.nextSetPlan.strategy === "complete"
        ? "planned_sets_complete"
        : "routine_hold";
    }

    if (args.nextSetPlan.strategy === "complete") {
      if (failText.includes("ont") || failText.includes("smärta")) return "pain_stop";
      if (args.rir <= 0) return "hard_set_complete";
      return "planned_sets_complete";
    }

    if (args.nextSetPlan.strategy === "reduce") {
      if (hasUserReportedTechniqueOrPain) return "user_reported_issue";
      if (args.rir <= 0) return "hard_stimulus_reduce";
      return "reduce_for_more_good_work";
    }

    if (args.nextSetPlan.strategy === "backoff") {
      if (typeof rirChange === "number" && rirChange <= -2) return "margin_dropped";
      if (args.rir <= 0) return "hard_stimulus_backoff";
      return "backoff_after_hard_set";
    }

    if (args.nextSetPlan.strategy === "press") return "room_to_progress";

    if (
      args.nextSetPlan.strategy === "hold" &&
      args.nextSetPlan.reason.toLowerCase().includes("repsspannet")
    ) {
      return "under_target_with_margin";
    }

    if (previousSet && args.weight === previousSet.weight && args.reps === previousSet.reps) {
      if (typeof rirChange === "number" && rirChange > 0) return "same_work_more_margin";
      if (typeof rirChange === "number" && rirChange < 0) return "same_work_less_margin";
      return "same_work_repeated";
    }

    if (previousSet && args.weight === previousSet.weight && args.reps > previousSet.reps) {
      return "reps_up_same_weight";
    }

    return "routine_hold";
  })();

  if (args.personalRecordText) signals.push("personal_record");
  if (progressionOpportunity?.type === "optional_last_set_test") {
    signals.push("optional_last_set_test");
  }
  if (typeof plannedSetCount === "number") {
    signals.push(`set_status:${args.setNumber}/${plannedSetCount}`);
  }
  if (isTimedSet) {
    signals.push("timed_exercise");
  }
  if (shouldDisplayAsBodyweight(args.exerciseName, args.weight)) {
    signals.push("bodyweight_no_extra_load");
  }

  if (!isTimedSet && previousSet && args.weight === previousSet.weight && args.reps > previousSet.reps) {
    signals.push(`reps_up_same_weight:${args.reps - previousSet.reps}`);
  }

  if (sameWeightTrend.tooEasy) {
    signals.push(
      `too_light_same_weight_trend:${sameWeightTrend.firstReps}->${sameWeightTrend.currentReps}`
    );
  }

  if (
    args.nextSetPlan.strategy === "hold" &&
    args.nextSetPlan.reason.toLowerCase().includes("repsspannet")
  ) {
    signals.push("under_target_with_margin");
  }

  if (
    previousSet &&
    !isTimedSet &&
    typeof previousSet.rir === "number" &&
    args.weight === previousSet.weight &&
    args.reps === previousSet.reps &&
    args.rir > previousSet.rir
  ) {
    signals.push(`same_work_more_margin:${args.rir - previousSet.rir}`);
  }

  if (
    previousSet &&
    !isTimedSet &&
    typeof previousSet.rir === "number" &&
    args.weight === previousSet.weight &&
    args.reps === previousSet.reps &&
    previousSet.rir - args.rir >= 2
  ) {
    signals.push(`same_work_margin_drop:${previousSet.rir - args.rir}`);
  }

  if (previousSet && args.weight > previousSet.weight) {
    signals.push(`weight_up:${previousSet.weight}->${args.weight}`);
  }

  if (
    previousSet &&
    !isTimedSet &&
    typeof previousSet.rir === "number" &&
    args.weight === previousSet.weight &&
    args.reps < previousSet.reps &&
    args.reps >= Math.max(1, previousSet.reps - 2) &&
    args.rir >= 1
  ) {
    signals.push("planned_rep_drop_hit_with_margin");
  }

  if (args.failNote) signals.push("user_fail_note_present");
  if (args.nextSetPlan.strategy === "backoff" || args.nextSetPlan.strategy === "reduce") {
    signals.push(`auto_adjustment:${args.nextSetPlan.strategy}`);
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
    setPlan: {
      plannedSetCount,
      setsCompleted: args.setNumber,
      setsRemaining,
      isLastSet,
      nextSetIsLast,
      isLastExercise: args.isLastExercise,
    },
    currentSet: {
      weight: args.weight,
      reps: args.reps,
      durationSeconds: args.durationSeconds,
      metricType: args.metricType,
      rir: isTimedSet ? undefined : args.rir,
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
          rir: isTimedSet ? undefined : previousSet.rir,
          setText: previousSetText,
        }
      : undefined,
    personalRecordText: args.personalRecordText || undefined,
    progressionOpportunity: progressionOpportunity
      ? {
          type: progressionOpportunity.type,
          confidence: progressionOpportunity.confidence,
          suggestedLoadText: progressionOpportunity.suggestedWeight,
          reason: progressionOpportunity.reason,
          tone: progressionOpportunity.tone,
        }
      : undefined,
    decisionFacts: {
      strategy: args.nextSetPlan.strategy,
      reasonCode: decisionReasonCode,
      weightChangeKg,
      repsChange,
      rirChange,
      shouldMentionTechniqueCue,
    },
    uiHints: {
      nextSetCardShowsPlan: args.nextSetPlan.strategy !== "complete",
      avoidRepeatingFullPlan: args.nextSetPlan.strategy !== "complete",
      avoidRepeatingRest: true,
      avoidRepeatingTechniqueCue: !shouldMentionTechniqueCue,
    },
    nextTarget: {
      weight: args.nextWeight,
      loadText: nextLoadText,
      repsText: args.nextSetPlan.repsText,
      rirText: args.nextSetPlan.rirText,
      strategy: args.nextSetPlan.strategy,
      reason: decisionReasonCode,
      techniqueCue: shouldMentionTechniqueCue
        ? args.nextSetPlan.techniqueCue
        : undefined,
    },
    restText: args.nextSetPlan.restText,
    memoryInsight: args.memoryInsight?.trim() || undefined,
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
      if (exerciseCategory === "rygg") return "Okej, ryggen är med på riktigt idag! ðŸš€";
      if (exerciseCategory === "ben") return "Okej, benen är med på riktigt idag! ðŸš€";
      if (exerciseCategory === "bröst" || exerciseCategory === "axlar") {
        return "Okej, pressen sitter på riktigt idag! ðŸš€";
      }

      return "Okej, det här är en stark träningsdag! ðŸš€";
    }
    if (setNumber === 2) return "Vänta lite. Ännu ett personbästa! ðŸ”¥";
    return rir >= 2 ? "Oj. Nu snackar vi! ðŸ”¥" : "Nu snackar vi!";
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
    rir: isTimedSet ? undefined : rir,
  });

  if (isTimedSet) {
    const timedLines =
      nextSetPlan.strategy === "complete"
        ? [
            "Snyggt. Där har vi tidsjobbet.",
            `${currentText} är loggat.`,
            `${exerciseName} är klar för idag. Gå vidare när du är redo.`,
          ]
        : [
            setNumber === 1
              ? "Bra start. Nu har vi en tydlig tidsnivå."
              : "Snyggt. Tiden är inne och vi bygger vidare.",
            `${currentText} är loggat.`,
            `Nästa: ${nextSetPlan.repsText}. ${nextTechniqueCue}`,
            `Vila ${restTime}.`,
          ];

    return shortCoach(timedLines);
  }

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
  const sameWeightTrend = getSameWeightTrendSignal({
    weight,
    reps,
    rir,
    previousSets,
    targetReps: 10,
    exerciseName,
  });
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
    if (sameWeightTrend.tooEasy) {
      return coachResponse([
        "Okej.",
        "Den var för lätt idag.",
        "Nästa gång öppnar vi högre.",
      ]);
    }

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
      rir >= 4 ? "Bra jobbat! Det där var starkt ðŸ”¥" : "Bra jobbat. Det där satt fint.",
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
      "Bra. Det där var ett hårt set.",
      currentText,
      hasPreviousSet
        ? "Det är bra stimulans efter seten innan, inte ett tecken på slarv."
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

  return "";
}
export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [authGateCleared, setAuthGateCleared] = useState(false);
  const [started, setStarted] = useState(false);
  const [workoutReview, setWorkoutReview] = useState<WorkoutReview | null>(null);
  const [workoutReviewLoading, setWorkoutReviewLoading] = useState(false);
  const [latestCompletedReview, setLatestCompletedReview] =
  useState<WorkoutReview | null>(null);
  const exerciseInputKeyRef = useRef("");
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

  // â€œDatabasâ€
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
  const systemSuggestedWeightRef = useRef<number | undefined>(undefined);
  const [repsInput, setRepsInput] = useState<string>("");
  const systemSuggestedRepsRef = useRef<number | undefined>(undefined);
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
    source?: "engine" | "llm" | "fallback";
  }[]
>([]);
const [coachPendingReply, setCoachPendingReply] = useState(false);
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
const [programStartModeInput, setProgramStartModeInput] =
  useState<ProgramStartMode>("coach");

const [editingProfile, setEditingProfile] = useState(false);

const profileName = userProfile?.name?.trim() || "du";

const [customExercisesByPass, setCustomExercisesByPass] =
  useState<CustomExercisesByPass>(createEmptyPassStringMap());
const [todayExercisesByPass, setTodayExercisesByPass] =
  useState<CustomExercisesByPass>(createEmptyPassStringMap());
const [removedExercisesByPass, setRemovedExercisesByPass] =
  useState<RemovedExercisesByPass>(createEmptyPassStringMap());
const [exerciseOverridesByPass, setExerciseOverridesByPass] =
  useState<ExerciseOverridesByPass>(createEmptyPassOverrideMap());
const [swapFrom, setSwapFrom] = useState<string | null>(null);
const [swapToInput, setSwapToInput] = useState("");

const [customExerciseInput, setCustomExerciseInput] = useState("");
const [workoutExerciseInput, setWorkoutExerciseInput] = useState("");
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

    setAuthGateCleared(
      loadJSON<boolean>(AUTH_GATE_BYPASS_KEY, false)
    );

    const savedLastPass = localStorage.getItem("lastPass") as PassType | null;
    const savedGym = localStorage.getItem("lastGym");
if (savedLastPass && ALL_PASS_KEYS.includes(savedLastPass)) {
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
  {
    ...createEmptyPassStringMap(),
    ...loadJSON<Partial<CustomExercisesByPass>>("customExercisesByPass", {}),
  }
);

setExerciseOverridesByPass(
  {
    ...createEmptyPassOverrideMap(),
    ...loadJSON<Partial<ExerciseOverridesByPass>>("exerciseOverridesByPass", {}),
  }
);

const activeWorkoutDraft = loadJSON<ActiveWorkoutDraft | null>(
  ACTIVE_WORKOUT_DRAFT_KEY,
  null
);

if (activeWorkoutDraft?.workout) {
  setWorkout(activeWorkoutDraft.workout);
  setExerciseIndex(activeWorkoutDraft.exerciseIndex ?? 0);
  setSkippedExercise(activeWorkoutDraft.skippedExercise ?? null);
  setChatLog(activeWorkoutDraft.chatLog ?? []);
  setChatInput(activeWorkoutDraft.chatInput ?? "");
  setWeightInput(activeWorkoutDraft.weightInput ?? "");
  setRepsInput(activeWorkoutDraft.repsInput ?? "");
  setDurationSecondsInput(activeWorkoutDraft.durationSecondsInput ?? 0);
  setRirInput(activeWorkoutDraft.rirInput ?? 2);
  setDidFailInput(activeWorkoutDraft.didFailInput ?? false);
  setFailNoteInput(activeWorkoutDraft.failNoteInput ?? "");
  setDayForm(activeWorkoutDraft.dayForm ?? "normal");
  setActiveWarmupContext(activeWorkoutDraft.activeWarmupContext ?? null);
  setActiveConditioningContext(activeWorkoutDraft.activeConditioningContext ?? null);
  setStarted(true);
  setShowDailyPlan(false);
}

setHasLoadedLocalState(true);
  }, []);

useEffect(() => {
  if (!hasLoadedLocalState) return;

  if (!started || !workout) {
    localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);
    return;
  }

  const draft: ActiveWorkoutDraft = {
    workout,
    exerciseIndex,
    skippedExercise,
    chatLog,
    chatInput,
    weightInput,
    repsInput,
    durationSecondsInput,
    rirInput,
    didFailInput,
    failNoteInput,
    dayForm,
    activeWarmupContext,
    activeConditioningContext,
    savedAt: new Date().toISOString(),
  };

  saveJSON(ACTIVE_WORKOUT_DRAFT_KEY, draft);
}, [
  hasLoadedLocalState,
  started,
  workout,
  exerciseIndex,
  skippedExercise,
  chatLog,
  chatInput,
  weightInput,
  repsInput,
  durationSecondsInput,
  rirInput,
  didFailInput,
  failNoteInput,
  dayForm,
  activeWarmupContext,
  activeConditioningContext,
]);

useEffect(() => {
  const shouldWarn =
    Boolean(started && workout) ||
    editingProfile ||
    showProgramReview ||
    programBuildScreenVisible;

  if (!shouldWarn) return;

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [started, workout, editingProfile, showProgramReview, programBuildScreenVisible]);
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
    customExercisesByPass: createEmptyPassStringMap(),
    exerciseOverridesByPass: createEmptyPassOverrideMap(),
    removedExercisesByPass: createEmptyPassStringMap(),
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
      availableExercises: getAvailableProgramExercises(profile),
      existingPreferences: programPreferences,
    },
    fallbackPlan,
  });

  if (result.mode !== "ai") {
    console.warn(`Program build fallback: ${result.reason ?? "unknown"}`);
  }

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
        availableExercises: getAvailableProgramExercises(activeProfile),
        existingPreferences: programPreferences,
      },
      fallbackPlan,
    });

    if (cancelled) return;

    if (result.mode !== "ai") {
      console.warn(`Program build fallback: ${result.reason ?? "unknown"}`);
    }

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
      label: cleanPassDisplayLabel(pass.displayName ?? `Pass ${pass.key}`),
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

const currentPassLabel = cleanPassDisplayLabel(
  workout?.displayName ?? nextPlannedPass?.displayName ?? ""
);

const nextPassLabel = cleanPassDisplayLabel(
  nextPlannedPass?.displayName ?? `Pass ${nextPass}`
);

const lastPassLabel = cleanPassDisplayLabel(
  userProfile && lastPass
    ? getDefaultPassDisplayName(userProfile, lastPass)
    : lastPass
    ? `Pass ${lastPass}`
    : ""
);

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

const previousExerciseSets = useMemo(() => {
  if (!currentExerciseName) return [];

  return getPreviousExerciseSets(history, currentExerciseName);
}, [history, currentExerciseName]);

function getProgressionHistoryForExercise(
  exerciseName: string,
  baseHistory: Workout[],
  fallback?: { gym: string; pass: PassType; displayName: string }
) {
  const pr = personalRecords[exerciseKey(exerciseName)];
  if (!pr) return baseHistory;

  const alreadyHasPr = baseHistory.some((item) =>
    item.exercises.some(
      (exercise) =>
        exerciseKey(exercise.name) === exerciseKey(exerciseName) &&
        exercise.sets.some(
          (set) => set.weight === pr.weight && set.reps === pr.reps
        )
    )
  );

  if (alreadyHasPr) return baseHistory;

  const prWorkout: Workout = {
    id: `personal-record-${exerciseKey(exerciseName)}`,
    startedAt: pr.createdAt,
    gym: fallback?.gym ?? workout?.gym ?? "",
    pass: fallback?.pass ?? workout?.pass ?? nextPass,
    displayName: fallback?.displayName ?? workout?.displayName ?? "Personbästa",
    exercises: [
      {
        name: exerciseName,
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
}

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
      targetWeight: scaledProgressionJump(last.weight, currentExerciseName, last.reps, targetReps, last.rir),
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

const introBase = getWorkoutIntro(dayForm);

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

let insight = memoryInsight;
if (!insight && fatigue) insight = fatigue;
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
      ? `${targetWeight} kg - ${progressionPlan.repsText} - ${progressionPlan.rirText}`
      : `${progressionPlan.repsText} - ${progressionPlan.rirText}`,
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
  coachMemory,
]);

// När du byter övning: fyll i senaste vikt/reps om det finns
useEffect(() => {
  if (!started) return;
  if (!currentExerciseName) return;
  const nextExerciseKey = exerciseKey(currentExerciseName);

  if (exerciseInputKeyRef.current === nextExerciseKey) return;

  exerciseInputKeyRef.current = nextExerciseKey;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  const nextExerciseWeight = !isBodyweightExercise(currentExerciseName) ? adjustedSuggestion.weight : "";
  setWeightInput(nextExerciseWeight);
  systemSuggestedWeightRef.current = nextExerciseWeight ? parseFloat(nextExerciseWeight) || undefined : undefined;
  setRepsInput(adjustedSuggestion.reps);
  systemSuggestedRepsRef.current = adjustedSuggestion.reps ? parseInt(adjustedSuggestion.reps, 10) || undefined : undefined;
}, [currentExerciseName, started, adjustedSuggestion.weight, adjustedSuggestion.reps]);


function startWorkout() {
  if (!nextPlannedPass || !workoutPlan) return;
  const warmupContext = null;
  const conditioningContext = null;

  const startedAt = new Date();
const w: Workout = {
  id: crypto.randomUUID(),
  startedAt: startedAt.toISOString(),
  gym,
  pass: nextPass,
  displayName: cleanPassDisplayLabel(
    nextPlannedPass?.displayName ?? `Pass ${nextPass}`
  ),
  planTitle: workoutPlan?.title,
  exercises: plan.map((name: string) => {
    const plannedExercise = nextPlannedPass.exercises.find(
      (exercise) => exerciseKey(exercise.name) === exerciseKey(name)
    );

    return {
      name,
      plannedSets: parsePlannedSetCount(plannedExercise?.sets) ?? undefined,
      plannedReps: plannedExercise?.reps,
      plannedRir: plannedExercise?.rir,
      sets: [],
    };
  }),
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
    setDayForm("normal");
    setActiveWarmupContext(warmupContext);
    setActiveConditioningContext(conditioningContext);
    setNow(startedAt);
const firstExerciseName = plan[0] ?? "";
const firstExercisePlan = firstExerciseName
  ? buildProgressionPlan({
      history: getProgressionHistoryForExercise(firstExerciseName, history, {
        gym,
        pass: nextPass,
        displayName: nextPassLabel,
      }),
      exerciseName: firstExerciseName,
      targetReps: goalTargets.targetReps,
      dayForm: "normal",
    })
  : null;

setChatLog([]);
localStorage.setItem("lastGym", gym);

// Fyll direkt första övningens förslag
exerciseInputKeyRef.current = firstExerciseName ? exerciseKey(firstExerciseName) : "";
const firstExerciseWeight = firstExerciseName && !isBodyweightExercise(firstExerciseName)
  ? firstExercisePlan?.weight ?? ""
  : "";
setWeightInput(firstExerciseWeight);
systemSuggestedWeightRef.current = firstExerciseWeight ? parseFloat(firstExerciseWeight) || undefined : undefined;
const firstReps = firstExercisePlan?.reps ?? String(goalTargets.targetReps);
setRepsInput(firstReps);
systemSuggestedRepsRef.current = firstReps ? parseInt(firstReps, 10) || undefined : undefined;
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
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(text);
  });
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
    const impliedCurrentExercise =
      workoutExercises[exerciseIndex]?.name ?? "";
    const foundFrom = plan.find(
      (ex: string) =>
        exerciseKey(ex).includes(exerciseKey(fromPart)) ||
        exerciseKey(fromPart).includes(exerciseKey(ex))
    );

    return {
      ...base,
      topic: "swap",
      tense: "future",
      swapFrom: foundFrom ?? (fromPart || impliedCurrentExercise),
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
  setCoachPendingReply(true);

  const reply = (text: string, source: "engine" | "llm" | "fallback" = "engine") => {
    setCoachPendingReply(false);
    setChatLog((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "coach" && last.text === text) return prev;
      return [...prev, { role: "coach", text, source }];
    });
  };
  const replyFromAi = (response: {
    mode?: "ai" | "fallback";
    text: string;
  }) => {
    reply(response.text, response.mode === "ai" ? "llm" : "fallback");
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
        currentExerciseInfo: currentExerciseName
          ? buildExerciseLibraryInfo(currentExerciseName)
          : undefined,
        memoryInsight: currentExerciseName
          ? buildExerciseMemoryInsight({
              coachMemory,
              exerciseName: currentExerciseName,
            })
          : undefined,
        exerciseIndex: workout ? exerciseIndex + 1 : undefined,
        exerciseCount: workout?.exercises.length,
        currentExerciseCompleted: Boolean(currentWorkoutExercise?.completed),
        currentSets: currentWorkoutExercise?.sets.map((set) => ({
          weight: set.weight,
          reps: set.reps,
          durationSeconds: set.durationSeconds,
          metricType: set.metricType,
          rir: set.rir,
          failNote: set.failNote,
        })),
        currentCoachDecision:
          currentWorkoutExercise && currentWorkoutExercise.sets.length > 0
            ? (() => {
                if (currentWorkoutExercise.completed) {
                  return {
                    strategy: "complete" as const,
                    reason: "Övningen är klar. Prata om nästa gång eller nästa övning, inte nästa set.",
                  };
                }

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
                  plannedSetCount: currentWorkoutExercise.plannedSets,
                  targetReps: goalTargets.targetReps,
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
        progressionOpportunity: progressionPlan.opportunity
          ? {
              type: progressionPlan.opportunity.type,
              confidence: progressionPlan.opportunity.confidence,
              suggestedLoadText: `${progressionPlan.opportunity.suggestedWeight} kg`,
              reason: progressionPlan.opportunity.reason,
              tone: progressionPlan.opportunity.tone,
            }
          : undefined,
        uiHints:
          currentWorkoutExercise && currentWorkoutExercise.sets.length > 0
            ? {
                nextSetCardShowsPlan: true,
                avoidRepeatingFullPlan: true,
                avoidRepeatingRest: true,
                avoidRepeatingTechniqueCue: true,
              }
            : undefined,
        activePlan,
        activePlanExerciseInfo: buildExerciseLibraryInfoList(activePlan),
        warmupNote:
          overrides?.warmupContext?.note ?? activeWarmupContext?.note,
        conditioningNote:
          overrides?.conditioningContext?.note ?? activeConditioningContext?.note,
        previousCoachReply: lastCoachMessage,
        recentConversation: chatLog
          .slice(-10)
          .map((m) => `${m.role === "you" ? "Användaren" : "Coach"}: ${m.text}`)
          .filter(Boolean),
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
      "yes",
      "kor",
      "byt",
      "det blir bra",
      "stammer",
      "bekrafta",
    ]);

  const namedPendingSwapReplacement =
    workout && swapFrom ? resolveExerciseName(msg) : null;
  if (
    workout &&
    swapFrom &&
    namedPendingSwapReplacement?.status === "known" &&
    exerciseKey(namedPendingSwapReplacement.name) !== exerciseKey(swapFrom)
  ) {
    replaceExerciseInCurrentWorkout(swapFrom, namedPendingSwapReplacement.name);
    setCoachPendingReply(false);
    return;
  }

  if (confirmsPendingSwap) {
    replaceExerciseInCurrentWorkout(swapFrom, swapToInput);
    setCoachPendingReply(false);
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

      const targetIndex = routedIntent.targetIndex ?? exerciseIndex;
      const painExercise = workout.exercises[targetIndex];
      if (painExercise) {
        const shouldFinishExercise = shouldCompleteExerciseAfterPain(painExercise);

        if (shouldFinishExercise) {
          setWorkout((current) => {
            if (!current) return current;

            return addWorkoutEventToWorkout(
              {
                ...current,
                exercises: current.exercises.map((exercise, index) =>
                  index === targetIndex ? { ...exercise, completed: true } : exercise
                ),
              },
              {
                type: "exercise_completed_early",
                exerciseName: painExercise.name,
                note: `Avslutades efter smärta/känning: ${msg}`,
                setCount: painExercise.sets.length,
              }
            );
          });

          if (targetIndex === exerciseIndex) {
            resetWorkoutInputs();
          }

          reply(
            `Okej. Då stänger vi ${painExercise.name} här. Du har redan fått in jobbet, och smärta går före planen. Gå vidare när du är redo.`
          );
          return;
        }

        setWorkout((current) =>
          current
            ? addWorkoutEventToWorkout(current, {
                type: "pain",
                exerciseName: painExercise.name,
                note: msg,
                setCount: painExercise.sets.length,
              })
            : current
        );
      }
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

    if (swapFrom && exerciseKey(swapFrom) === exerciseKey(targetExercise.name)) {
      const chatReply = await askAiCoach(`${targetExercise.name} är inte tillgänglig.`);
      replyFromAi(chatReply);
      return;
    }

    const suggestion = suggestReplacementFor(targetExercise.name);
    if (suggestion) {
      setSwapFrom(targetExercise.name);
      setSwapToInput(suggestion);
      reply(
        `Okej. Då löser vi det.\n\n${targetExercise.name} funkar inte nu. Jag föreslår ${suggestion} istället. Skriv ja om du vill byta.`
      );
      return;
    }

    setSwapFrom(null);
    setSwapToInput("");
    reply(
      `Okej. Då lämnar vi ${targetExercise.name} just nu.\n\nJag hittar ingen självklar ersättare här. Skriv vilken övning du vill ta istället, eller gå vidare.`
    );
    return;
  }

  if (routedIntent.topic === "addExercise") {
    if (workout && routedIntent.addExerciseName) {
      addExerciseToCurrentWorkout(routedIntent.addExerciseName);
      setCoachPendingReply(false);
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
    return;
  }

  if (resolved.status === "needsCategory") {
    setCustomExerciseInput(`egen ben: ${resolved.name}`);
    return;
  }

  if (resolved.status === "unknown") {
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
    return;
  }

  if (resolved.status === "needsCategory") {
    setCustomExerciseInput(`egen ben: ${resolved.name}`);
    return;
  }

  if (resolved.status === "unknown") {
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

function getPlannedSetCountForLoggedExercise(exercise: LoggedExercise) {
  const plannedExercise = (workoutPlan?.passes
    .find((pass) => pass.key === workout?.pass)
    ?.exercises.find(
      (planned) => exerciseKey(planned.name) === exerciseKey(exercise.name)
    ) ?? null) as PlannedExercise | null;

  return (
    exercise.plannedSets ??
    parsePlannedSetCount(plannedExercise?.sets) ??
    goalTargets.targetSets
  );
}

function shouldCompleteExerciseAfterPain(exercise: LoggedExercise) {
  const setCount = exercise.sets.length;
  const plannedSetCount = getPlannedSetCountForLoggedExercise(exercise);

  return setCount >= Math.max(2, plannedSetCount - 1);
}

function addWorkoutEventToWorkout(
  current: Workout,
  event: Omit<WorkoutEvent, "createdAt">
): Workout {
  return {
    ...current,
    events: [
      ...(current.events ?? []),
      {
        ...event,
        createdAt: new Date().toISOString(),
      },
    ],
  };
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
  const replacementPlanExercise =
    (workoutPlan?.passes
      .find((pass) => pass.key === workout.pass)
      ?.exercises.find(
        (exercise) => exerciseKey(exercise.name) === exerciseKey(replacementName)
      ) ?? null) as PlannedExercise | null;
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

  let replacedCurrentExercise = false;
  let resetLoggedExercise = false;
  let insertedReplacementIndex: number | null = null;

  setWorkout({
    ...workout,
    exercises: workout.exercises.flatMap((exercise, index) => {
      if (exerciseKey(exercise.name) !== fromKey) return [exercise];

      replacedCurrentExercise = index === exerciseIndex;
      resetLoggedExercise = exercise.sets.length > 0 || Boolean(exercise.completed);

      const replacementExercise: LoggedExercise = {
        name: replacementName,
        plannedSets:
          parsePlannedSetCount(replacementPlanExercise?.sets) ??
          exercise.plannedSets,
        plannedReps: replacementPlanExercise?.reps ?? exercise.plannedReps,
        plannedRir: replacementPlanExercise?.rir ?? exercise.plannedRir,
        completed: false,
        sets: [],
      };

      if (resetLoggedExercise) {
        insertedReplacementIndex = index + 1;
        return [
          {
            ...exercise,
            completed: true,
          },
          replacementExercise,
        ];
      }

      return [replacementExercise];
    }),
    events: [
      ...(workout.events ?? []),
      {
        type: "exercise_replaced",
        exerciseName: fromName,
        replacementName,
        setCount:
          workout.exercises.find((exercise) => exerciseKey(exercise.name) === fromKey)
            ?.sets.length ?? 0,
        note: resetLoggedExercise
          ? "Övningen var påbörjad och ersattes under passet."
          : "Övningen byttes innan den loggades.",
        createdAt: new Date().toISOString(),
      },
    ],
  });
  if (replacedCurrentExercise) {
    resetWorkoutInputs();
    if (insertedReplacementIndex !== null) {
      setExerciseIndex(insertedReplacementIndex);
    }
  }
  setSwapFrom(null);
  setSwapToInput("");
  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      source: "engine" as const,
      text: resetLoggedExercise
        ? `Bra, vi kör ${replacementName} istället. Jag sparar ${fromName} som avslutad så loggen blir rätt.`
        : `Bra, vi kör ${replacementName} istället.`,
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
  const normalizedKey = normalizeExerciseSearchText(exName);
  const isDifferentExercise = (candidate: string) => {
    const trimmed = candidate.trim();
    return (
      trimmed.length > 0 &&
      exerciseKey(trimmed) !== key &&
      normalizeExerciseSearchText(trimmed) !== normalizedKey
    );
  };

  const definitionSuggestion = getExerciseDefinition(exName)?.substitutions.find(
    isDifferentExercise
  );
  if (definitionSuggestion) return definitionSuggestion;

  const fallbackCandidates: string[] = [];

  if (key.includes("marklyft")) fallbackCandidates.push("Hip thrust");
  if (key.includes("knäböj") || key.includes("knöböj")) {
    fallbackCandidates.push("Benpress");
  }
  if (key.includes("bänkpress")) fallbackCandidates.push("Hantelpress");
  if (key.includes("militärpress")) fallbackCandidates.push("Hantelpress (axlar)");
  if (key.includes("latsdrag")) fallbackCandidates.push("Chins (assisterade)");
  if (key.includes("benspark")) fallbackCandidates.push("Goblet squat");
  if (key.includes("vadpress")) fallbackCandidates.push("Tåhävningar med hantlar");
  if (key.includes("sidolyft")) fallbackCandidates.push("Kabellyft åt sidan");
  if (key.includes("rodd")) {
    fallbackCandidates.push("Hantelrodd", "Maskinrodd", "Skivstångsrodd", "Bandrodd");
  }
  if (key.includes("curl")) fallbackCandidates.push("Hantelcurl");
  if (key.includes("triceps")) fallbackCandidates.push("Triceps pushdown med rep");

  return fallbackCandidates.find(isDifferentExercise) ?? "";
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

  const nextCustom: CustomExercisesByPass =
    copyPassStringMap(customExercisesByPass);
  const nextRemoved: RemovedExercisesByPass =
    copyPassStringMap(removedExercisesByPass);
  const nextOverrides: ExerciseOverridesByPass =
    copyPassOverrideMap(exerciseOverridesByPass);
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

function getProgramExerciseNamesMatching(matcher: (exerciseName: string) => boolean) {
  if (!workoutPlan) return [];

  return Array.from(
    new Set(
      workoutPlan.passes
        .flatMap((pass) => pass.exercises.map((exercise) => exercise.name))
        .filter((name) => matcher(name))
    )
  );
}

function queueProgramSuggestion(
  summary: string,
  actions: CoachProgramSuggestionAction[],
  reply = ""
) {
  if (actions.length === 0) return "";

  setPendingProgramSuggestion({ summary, actions });
  return reply;
}

function queueRemoveProgramSuggestion(
  matcher: (exerciseName: string) => boolean,
  summary: string,
  emptyReply: string
) {
  const exerciseNames = getProgramExerciseNamesMatching(matcher);

  if (exerciseNames.length === 0) return emptyReply;

  return queueProgramSuggestion(
    summary,
    exerciseNames.map((exerciseName) => ({
      type: "remove_exercise",
      exerciseName,
      reason: summary,
    }))
  );
}

function queueAddProgramSuggestion(
  matchPass: (pass: WorkoutPass) => boolean,
  exercise: string,
  summary: string,
  emptyReply: string
) {
  if (!workoutPlan) return emptyReply;

  const resolved = resolveExerciseName(exercise);
  const exerciseName = resolved.status === "known" ? resolved.name : exercise;
  const targetPasses = workoutPlan.passes.filter(matchPass);

  if (targetPasses.length === 0) return emptyReply;

  return queueProgramSuggestion(
    summary,
    targetPasses.map((pass) => ({
      type: "add_exercise",
      exerciseName,
      passKey: pass.key,
      passName: pass.displayName,
      reason: summary,
    }))
  );
}

function getPreferredProgramReplacement(exerciseName: string) {
  const definition = getExerciseDefinition(exerciseName);
  const originalKey = normalizeExerciseSearchText(exerciseName);
  const substitutions = definition?.substitutions ?? [];
  const available = substitutions
    .map((name) => resolveExerciseName(name))
    .map((resolved) =>
      resolved.status === "known"
        ? resolved.name
        : resolved.status === "suggest"
        ? resolved.suggestion
        : ""
    )
    .filter(Boolean)
    .filter((name) => {
      const key = normalizeExerciseSearchText(name);
      return key !== originalKey && !key.includes(originalKey);
    });

  const scored = available
    .map((name) => {
      const replacement = getExerciseDefinition(name);
      const key = normalizeExerciseSearchText(name);
      let score = 0;

      if (replacement?.category === definition?.category) score += 3;
      if (replacement?.beginnerFit === "bra") score += 1;
      if (replacement?.difficulty === "enkel") score += 1;
      if (userProfile?.location === "gym") {
        if (replacement?.environment === "gym") score += 3;
        if (replacement?.equipmentTags.some((tag) => tag === "cables" || tag === "machines")) {
          score += 2;
        }
      }
      if (userProfile?.location === "hemma") {
        if (replacement?.environment === "hemma" || replacement?.environment === "båda") {
          score += 3;
        }
        if (replacement?.equipmentTags.includes("none") || replacement?.equipmentTags.includes("bodyweight")) {
          score += 1;
        }
      }
      if (key.includes("planka") && originalKey.includes("planka")) score -= 4;

      return { name, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.name ?? "";
}

function buildExerciseWhyText(exerciseName: string) {
  const info = getExerciseUserInfo(exerciseName);
  const trains = info.trains ? `Den tränar ${info.trains}.` : "";
  const why = info.whyChosen ? info.whyChosen : "";

  return [why, trains].filter(Boolean).join(" ");
}

function queueReplaceOrRemoveProgramSuggestion(
  exerciseNames: string[],
  fallbackSummary: string,
  emptyReply: string
) {
  if (exerciseNames.length === 0) return emptyReply;

  const actions = exerciseNames.map((exerciseName) => {
    const replacement = getPreferredProgramReplacement(exerciseName);

    return replacement
      ? ({
          type: "replace_exercise",
          fromExerciseName: exerciseName,
          toExerciseName: replacement,
          reason: buildExerciseWhyText(exerciseName),
        } satisfies CoachProgramSuggestionAction)
      : ({
          type: "remove_exercise",
          exerciseName,
          reason: buildExerciseWhyText(exerciseName),
        } satisfies CoachProgramSuggestionAction);
  });

  const firstExercise = exerciseNames[0];
  const firstReplacement =
    actions[0]?.type === "replace_exercise" ? actions[0].toExerciseName : "";
  const explanation = buildExerciseWhyText(firstExercise);
  const summary = firstReplacement
    ? `${firstExercise} låg där av en anledning. ${explanation} Om du inte gillar den föreslår jag att vi byter till ${firstReplacement}.`
    : `${firstExercise} låg där av en anledning. ${explanation} Om du inte vill ha den föreslår jag att vi tar bort den.`;

  return queueProgramSuggestion(summary || fallbackSummary, actions);
}

function buildReplaceOrRemoveSummary(action: CoachProgramSuggestionAction) {
  if (action.type === "replace_exercise") {
    const explanation = buildExerciseWhyText(action.fromExerciseName);
    return `${action.fromExerciseName} låg där av en anledning. ${explanation} Jag föreslår att vi byter till ${action.toExerciseName}.`;
  }

  if (action.type === "remove_exercise") {
    const explanation = buildExerciseWhyText(action.exerciseName);
    return `${action.exerciseName} låg där av en anledning. ${explanation} Jag föreslår att vi tar bort den.`;
  }

  return "";
}

function queueAiProgramSuggestion(suggestion?: CoachProgramSuggestion | null) {
  if (!suggestion?.actions.length) return false;

  const actions = suggestion.actions
    .map((action): CoachProgramSuggestionAction | null => {
      if (action.type === "remove_exercise") {
        const matchingName =
          getProgramExerciseNamesMatching(
            (name) => exerciseKey(name) === exerciseKey(action.exerciseName)
          )[0] ?? action.exerciseName;
        const replacement = getPreferredProgramReplacement(matchingName);
        const reason = action.reason || buildExerciseWhyText(matchingName);

        return replacement
          ? {
              type: "replace_exercise",
              fromExerciseName: matchingName,
              toExerciseName: replacement,
              reason,
            }
          : {
              ...action,
              exerciseName: matchingName,
              reason,
            };
      }

      if (action.type === "replace_exercise") {
        return {
          ...action,
          reason: action.reason || buildExerciseWhyText(action.fromExerciseName),
        };
      }

      return action;
    })
    .filter((action): action is CoachProgramSuggestionAction => Boolean(action));

  if (actions.length === 0) return false;

  setPendingProgramSuggestion({
    summary: buildReplaceOrRemoveSummary(actions[0]) || suggestion.summary,
    actions,
  });

  return true;
}

function isChestStressProgramExercise(name: string) {
  const key = exerciseKey(name);
  const profile = getExerciseProfile(name);

  return (
    profile.category === "bröst" ||
    key.includes("pec") ||
    key.includes("flyes") ||
    key.includes("brost") ||
    key.includes("bröst") ||
    key.includes("axelpress") ||
    key.includes("hantelpress") ||
    key.includes("bänkpress") ||
    key.includes("bankpress") ||
    key.includes("bröstpress") ||
    key.includes("brostpress") ||
    key.includes("militärpress") ||
    key.includes("militarpress") ||
    key.includes("dips") ||
    key.includes("armhav") ||
    key.includes("armhäv")
  );
}

async function applyProgramPreference(preferenceRaw: string) {
  const preference = preferenceRaw.trim();
  const lower = preference.toLowerCase();

  if (!preference || !workoutPlan) return "";

  const isAffirmativeReply =
    /^(ja|japp|yes|okej|ok|absolut|gör det|gor det|kör|kor|ta bort dem|ta bort)$/i.test(
      lower
    );

  if (isAffirmativeReply && pendingProgramSuggestion) {
    applyPendingProgramSuggestion();
    return "Klart. Jag har lagt in ändringen i upplägget.";
  }

  if (
    isAffirmativeReply &&
    programPreferenceReply &&
    /(?:ta bort|plocka bort|skippa|undvik|undvika)/i.test(programPreferenceReply) &&
    /(?:bröst|brost|pec|press|axelpress)/i.test(programPreferenceReply)
  ) {
    const removed = removeExercisesFromProgram(isChestStressProgramExercise);
    const removedNames = removed.flatMap((entry) => entry.removed);

    return removedNames.length > 0
      ? `Klart. Jag tar bort ${removedNames.join(", ")} ur upplägget. Bröstsmärta går före planen.`
      : "Jag hittar inga bröst- eller pressövningar kvar att ta bort. Bröstsmärta går före planen.";
  }

  setPendingProgramSuggestion(null);

  if (
    userProfile &&
    (/\b(dag|pass)\s*[1-7a-g]\s*:?\s*/i.test(preference) ||
      lower.includes("eget upplägg") ||
      lower.includes("eget schema"))
  ) {
    const manualPlan = parseManualWorkoutPlan(preference, userProfile);

    if (!manualPlan) {
      return 'Jag ser att du vill lägga in ett eget upplägg. Skriv gärna så här: "Dag 1: bänkpress, hantelpress. Dag 2: latsdrag, rodd."';
    }

    setCustomWorkoutPlan(manualPlan);
    saveJSON("customWorkoutPlan", manualPlan);
    setRemovedExercisesByPass(createEmptyPassStringMap());
    setExerciseOverridesByPass(createEmptyPassOverrideMap());
    setCustomExercisesByPass(createEmptyPassStringMap());
    saveJSON("removedExercisesByPass", createEmptyPassStringMap());
    saveJSON("exerciseOverridesByPass", createEmptyPassOverrideMap());
    saveJSON("customExercisesByPass", createEmptyPassStringMap());

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
    const matchingPasses = getProgramPassesWithExercise(swapRequest.fromName);

    return matchingPasses.length > 0
      ? queueProgramSuggestion(
          `Jag föreslår att vi byter ${swapRequest.fromName} mot ${swapRequest.toName}.`,
          [
            {
              type: "replace_exercise",
              fromExerciseName: swapRequest.fromName,
              toExerciseName: swapRequest.toName,
              reason: "Du bad coachen byta övning.",
            },
          ]
        )
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

  if (
    (lower.includes("bröst") || lower.includes("brost")) &&
    (lower.includes("ont") ||
      lower.includes("smärta") ||
      lower.includes("smarta") ||
      lower.includes("obehag") ||
      lower.includes("känns fel") ||
      lower.includes("kanns fel"))
  ) {
    return queueRemoveProgramSuggestion(
      isChestStressProgramExercise,
      "Bröstsmärta går före planen. Jag föreslår att vi pausar övningar som belastar bröst, press eller axelpress tills det känns tryggt igen.",
      "Bra att du säger det. Jag hittar inga tydliga bröst- eller pressövningar att ta bort, men bröstsmärta går före planen. Sänk belastningen eller avbryt om det känns fel."
    );
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
        exerciseLibrary: buildExerciseLibraryInfoList(
          workoutPlan.passes.flatMap((pass) =>
            pass.exercises.map((exercise) => exercise.name)
          )
        ),
        existingPreferences: programPreferences,
      },
      fallbackReply,
    });

    queueAiProgramSuggestion(aiReply.suggestion);

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
    return queueReplaceOrRemoveProgramSuggestion(
      getProgramExerciseNamesMatching((name) => exerciseKey(name).includes("marklyft")),
      "Jag föreslår att vi byter bort marklyft ur upplägget.",
      "Bra input. Jag sparar att marklyft inte ska prioriteras i upplägget."
    );
  }

  if (wantsLessOrAvoid && lower.includes("benpress")) {
    return queueReplaceOrRemoveProgramSuggestion(
      getProgramExerciseNamesMatching((name) => exerciseKey(name).includes("benpress")),
      "Jag föreslår att vi byter bort benpress ur upplägget.",
      "Jag sparar det. Benpress får inte vara en viktig del av upplägget."
    );
  }

  if (wantsLessOrAvoid && lower.includes("latsdrag")) {
    return queueReplaceOrRemoveProgramSuggestion(
      getProgramExerciseNamesMatching((name) => exerciseKey(name).includes("latsdrag")),
      "Jag föreslår att vi byter bort latsdrag ur upplägget.",
      "Jag sparar det. Vi bygger ryggen utan att latsdrag behöver vara med."
    );
  }

  if (wantsLessOrAvoid && lower.includes("vadpress")) {
    return queueReplaceOrRemoveProgramSuggestion(
      getProgramExerciseNamesMatching((name) => exerciseKey(name).includes("vadpress")),
      "Jag föreslår att vi byter bort vadpress ur upplägget.",
      "Bra att du säger det. Jag sparar att vadpress inte ska prioriteras."
    );
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
      const matchingNames = getProgramExerciseNamesMatching(
        (name) => exerciseKey(name) === exerciseKey(exerciseName)
      );

      if (matchingNames.length > 0) {
        return queueReplaceOrRemoveProgramSuggestion(
          matchingNames,
          `Jag föreslår att vi byter bort ${exerciseName} ur upplägget.`,
          `Jag hittar inte ${exerciseName} i upplägget.`
        );
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
      const targetPasses = workoutPlan.passes.filter((pass) => {
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
        });

      return targetPasses.length > 0
        ? queueProgramSuggestion(
            `Jag föreslår att vi lägger till ${requestedExerciseName} där den passar bäst.`,
            targetPasses.map((pass) => ({
              type: "add_exercise",
              exerciseName: requestedExerciseName,
              passKey: pass.key,
              passName: pass.displayName,
              reason: "Du bad coachen lägga till övningen.",
            }))
          )
        : `Bra. Jag sparar att ${requestedExerciseName} ska in i upplägget.`;
    }

    if (
      lower.includes("underkropp") ||
      lower.includes("benpass") ||
      lower.includes("ben")
    ) {
      const exercise = userProfile?.location === "hemma" ? "Utfall" : "Lårcurl";
      return queueAddProgramSuggestion(
        (pass) => {
          const key = exerciseKey(pass.displayName);
          return key.includes("underkropp") || key.includes("ben");
        },
        exercise,
        `Jag föreslår att vi lägger till ${exercise.toLowerCase()} i underkroppspasset.`,
        `Bra. Jag sparar att underkropp ska få en övning till.`
      );
    }

    if (lower.includes("överkropp") || lower.includes("overkropp")) {
      const exercise = userProfile?.location === "hemma" ? "Hantelrodd" : "Sittande kabelrodd";
      return queueAddProgramSuggestion(
        (pass) => {
          const key = exerciseKey(pass.displayName);
          return key.includes("överkropp") || key.includes("overkropp");
        },
        exercise,
        `Jag föreslår att vi lägger till ${exercise.toLowerCase()} i överkroppspasset.`,
        `Bra. Jag sparar att överkropp ska få en övning till.`
      );
    }

    const requestedExerciseFallback = extractExerciseNameAfterNormalized(preference, [
      "lägg till",
      "lägga till",
      "ta med",
      "vill ha",
    ]);
    const resolved = resolveExerciseName(requestedExerciseFallback);

    if (resolved.status === "known") {
      return queueAddProgramSuggestion(
        (pass) =>
          exerciseKey(pass.displayName).includes("överkropp") ||
          exerciseKey(pass.displayName).includes("helkropp"),
        resolved.name,
        `Jag föreslår att vi lägger till ${resolved.name} i upplägget.`,
        `Bra. Jag sparar ${resolved.name} till upplägget.`
      );
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
    return queueAddProgramSuggestion(
      (pass) => exerciseKey(pass.displayName).includes("överkropp"),
      userProfile?.location === "hemma" ? "Hantelpress" : "Bröstpress",
      "Jag föreslår att vi ger bröst lite mer plats i överkroppspasset.",
      "Bra. Jag sparar att bröst ska få mer fokus i upplägget."
    );
  }

  if (wantsMore && lower.includes("rygg")) {
    return queueAddProgramSuggestion(
      (pass) =>
        exerciseKey(pass.displayName).includes("överkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      userProfile?.location === "hemma" ? "Bandrodd" : "Sittande kabelrodd",
      "Jag föreslår att vi lägger in lite mer ryggarbete där det passar bäst.",
      "Bra. Jag sparar att ryggen ska få mer fokus."
    );
  }

  if (wantsMore && (lower.includes("ben") || lower.includes("baksida"))) {
    return queueAddProgramSuggestion(
      (pass) =>
        exerciseKey(pass.displayName).includes("underkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      lower.includes("baksida") ? "Lårcurl" : "Utfall",
      "Jag föreslår att vi ger benen lite mer utrymme i upplägget.",
      "Bra. Jag sparar att benen ska prioriteras mer."
    );
  }

  if (wantsMore && (lower.includes("axlar") || lower.includes("axel"))) {
    return queueAddProgramSuggestion(
      (pass) => exerciseKey(pass.displayName).includes("överkropp"),
      "Sidolyft",
      "Jag föreslår att vi lägger in mer axelarbete utan att göra passet rörigt.",
      "Bra. Jag sparar att axlar ska få mer fokus."
    );
  }

  if (wantsMore && (lower.includes("armar") || lower.includes("biceps") || lower.includes("triceps"))) {
    return queueAddProgramSuggestion(
      (pass) =>
        exerciseKey(pass.displayName).includes("överkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      lower.includes("triceps") ? "Triceps pushdown med rep" : "Hantelcurl",
      "Jag föreslår att vi ger armar lite mer plats utan att passet blir rörigt.",
      "Bra. Jag sparar att armar ska få mer fokus."
    );
  }

  if (wantsMore && (lower.includes("mage") || lower.includes("core") || lower.includes("bål") || lower.includes("bal"))) {
    return queueAddProgramSuggestion(
      (pass) =>
        exerciseKey(pass.displayName).includes("underkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      userProfile?.location === "hemma" ? "Planka" : "Cable crunch",
      "Jag föreslår att vi lägger in lite mage där det inte stör resten.",
      "Bra. Jag sparar att mage ska få mer plats."
    );
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
    const removeActions: CoachProgramSuggestionAction[] = workoutPlan.passes
      .flatMap<CoachProgramSuggestionAction>((pass) => {
        if (pass.exercises.length <= 4) return [];

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

        return accessory
          ? [{
              type: "remove_exercise",
              exerciseName: accessory.name,
              reason: "Du bad coachen korta ner passet.",
            } satisfies CoachProgramSuggestionAction]
          : [];
      });

    return removeActions.length > 0
      ? queueProgramSuggestion(
          "Jag föreslår att vi kortar ner passen och tar bort det som är minst viktigt just nu.",
          removeActions
        )
      : "Okej. Upplägget är redan ganska kompakt, men jag sparar att passen ska hållas korta.";
  }

  if (lower.includes("knä") || lower.includes("kna")) {
    const kneeExerciseNames = getProgramExerciseNamesMatching((name) => {
      const key = exerciseKey(name);
      return key.includes("benspark") || key.includes("utfall") || key.includes("knäböj");
    });

    return kneeExerciseNames.length > 0
      ? queueProgramSuggestion(
          "Jag föreslår att vi minskar knäbelastningen och lägger in lugnare benarbete.",
          [
            ...kneeExerciseNames.map((exerciseName) => ({
              type: "remove_exercise" as const,
              exerciseName,
              reason: "Du nämnde knäbesvär.",
            })),
            {
              type: "add_exercise",
              exerciseName: "Lårcurl",
              reason: "Lugnare benarbete med mindre knäkrav.",
            },
          ]
        )
      : "Bra att du säger det. Jag sparar knäet som något coachen ska ta hänsyn till.";
  }

  if (lower.includes("ländrygg") || lower.includes("ryggont")) {
    return queueRemoveProgramSuggestion(
      (name) => exerciseKey(name).includes("marklyft"),
      "Jag föreslår att vi tar bort marklyft och gör upplägget snällare mot ländryggen.",
      "Bra att du säger det. Jag sparar ländryggen som något coachen ska ha koll på."
    );
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
      exerciseLibrary: buildExerciseLibraryInfoList(
        workoutPlan.passes.flatMap((pass) =>
          pass.exercises.map((exercise) => exercise.name)
        )
      ),
      existingPreferences: programPreferences,
    },
    fallbackReply:
      'Jag är inte helt säker på vad du vill ändra. Skriv gärna lite tydligare, till exempel "ta bort marklyft", "lägg till knäböj", "färre övningar" eller "Dag 1: bänkpress, rodd".',
  });

  queueAiProgramSuggestion(aiReply.suggestion);

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

function formatWeightForCoach(weight: number) {
  return formatWeightInput(weight).replace(".", ",");
}

function roundToQuarterKg(weight: number) {
  return Number((Math.round(weight * 4) / 4).toFixed(2));
}

function suggestLikelyDecimalWeight({
  weight,
  referenceWeight,
}: {
  weight: number;
  referenceWeight?: number;
}) {
  const candidates = Array.from(
    new Set(
      [weight / 10, weight / 100, weight / 1000]
        .map((candidate) => roundToQuarterKg(candidate))
        .filter((candidate) => Number.isFinite(candidate) && candidate > 0)
    )
  );

  if (referenceWeight && referenceWeight > 0) {
    return candidates
      .filter(
        (candidate) =>
          candidate >= referenceWeight * 0.5 &&
          candidate <= referenceWeight * 1.5
      )
      .sort(
        (a, b) =>
          Math.abs(a - referenceWeight) - Math.abs(b - referenceWeight)
      )[0];
  }

  return candidates.find((candidate) => candidate >= 1 && candidate <= 300);
}

function isClearlyImpossibleWeight(weight: number) {
  return weight > 1000;
}

function isUnusuallyHighGymWeight(weight: number) {
  return weight > 500;
}

function hasSuspiciousJump(weight: number, referenceWeight?: number) {
  if (!referenceWeight || referenceWeight <= 0) return false;

  return (
    (weight >= referenceWeight * 3 && weight - referenceWeight >= 20) ||
    (weight >= referenceWeight * 1.5 && weight - referenceWeight >= 25)
  );
}

function getReasonableWeightReference(
  previousSets: LoggedSet[],
  existingPR?: PersonalRecord,
  historicalBestSets: ExerciseBestSet[] = []
) {
  const reasonableReferences = [
    [...previousSets]
      .reverse()
      .find((set) => set.metricType !== "time" && set.weight > 0)?.weight,
    existingPR?.metricType !== "time" ? existingPR?.weight : undefined,
    ...historicalBestSets
      .filter((set) => set.metricType !== "time" && set.weight > 0)
      .map((set) => set.weight),
  ].filter(
    (value): value is number =>
      typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0 &&
      value < 1000
  );

  return reasonableReferences[0] ?? reasonableReferences[1];
}

function buildWeightInputWarningMessage({
  weight,
  previousSets,
  existingPR,
  historicalBestSets,
}: {
  weight: number;
  previousSets: LoggedSet[];
  existingPR?: PersonalRecord;
  historicalBestSets?: ExerciseBestSet[];
}) {
  const referenceWeight = getReasonableWeightReference(
    previousSets,
    existingPR,
    historicalBestSets
  );
  const suggestedWeight = suggestLikelyDecimalWeight({
    weight,
    referenceWeight,
  });
  const suggestionText = suggestedWeight
    ? ` Menade du ${formatWeightForCoach(suggestedWeight)} kg?`
    : "";

  if (isClearlyImpossibleWeight(weight)) {
    return `Vänta.\n\n${formatWeightForCoach(
      weight
    )} kg ser ut som en felskrivning.${suggestionText}\nJag sparar inte setet förrän vikten är rätt.`;
  }

  if (isUnusuallyHighGymWeight(weight)) {
    return `Vänta.\n\n${formatWeightForCoach(
      weight
    )} kg är ovanligt högt för ett vanligt gymset.${suggestionText}\nJag sparar inte setet förrän vikten är rätt.`;
  }

  if (hasSuspiciousJump(weight, referenceWeight)) {
    return `Vänta.\n\n${formatWeightForCoach(
      weight
    )} kg är mycket högre än senaste nivån (${formatWeightForCoach(
      referenceWeight!
    )} kg).${suggestionText}\nJag sparar inte setet förrän du rättat vikten.`;
  }

  return null;
}

function checkWeightBeforeSavingSet({
  weight,
  previousSets,
  existingPR,
  historicalBestSets,
}: {
  weight: number;
  previousSets: LoggedSet[];
  existingPR?: PersonalRecord;
  historicalBestSets?: ExerciseBestSet[];
}):
  | { ok: true }
  | {
      ok: false;
      message: string;
    } {
  const message = buildWeightInputWarningMessage({
    weight,
    previousSets,
    existingPR,
    historicalBestSets,
  });

  if (message) {
    return { ok: false, message };
  }

  return { ok: true };
}

async function addSet() {
    if (!workout) return;

    const exerciseBeingLogged = workout.exercises[exerciseIndex];

    const rawWeight = parseNumberInput(weightInput);
    const reps = parseNumberInput(repsInput);
    const exerciseName = currentExerciseName;
    const prKey = exerciseKey(exerciseName);
    const bodyweightExercise = isBodyweightExercise(exerciseName);
    const timedExercise = isTimedExercise(exerciseName);
    const hasLoggedWeight =
      weightInput.trim() !== "" && Number.isFinite(rawWeight) && rawWeight > 0;
    const weight = bodyweightExercise && !hasLoggedWeight ? 0 : rawWeight;
    const existingPR = personalRecords[prKey];
    const durationSeconds = timedExercise ? Math.round(durationSecondsInput) : undefined;
    if (timedExercise && (!durationSeconds || durationSeconds <= 0)) {
      const missingInputMessage = "Jag behöver tiden först. Starta klockan eller fyll i tiden.";
      setChatLog((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === "coach" && lastMessage.text === missingInputMessage) return prev;
        return [...prev, { role: "coach", source: "engine" as const, text: missingInputMessage }];
      });
      return;
    }
    if (timedExercise && durationSeconds && durationSeconds > 7200) {
      const durationWarningMessage =
        "Vänta.\n\nTiden ser ut som en felskrivning. Jag sparar inte setet förrän tiden är rätt.";
      setChatLog((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === "coach" && lastMessage.text === durationWarningMessage) return prev;
        return [...prev, { role: "coach", source: "engine" as const, text: durationWarningMessage }];
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

if (!timedExercise && reps > 200) {
  const repsWarningMessage =
    "Vänta.\n\nRepsen ser ut som en felskrivning. Jag sparar inte setet förrän repsen är rätt.";
  setChatLog((prev) => {
    const lastMessage = prev[prev.length - 1];
    if (lastMessage?.role === "coach" && lastMessage.text === repsWarningMessage) {
      return prev;
    }

    return [
      ...prev,
      {
        role: "coach",
        source: "engine" as const,
        text: repsWarningMessage,
      },
    ];
  });
  return;
}

if (!bodyweightExercise && !timedExercise) {
  const weightCheck = checkWeightBeforeSavingSet({
    weight,
    previousSets: exerciseBeingLogged?.sets ?? [],
    existingPR,
    historicalBestSets: getExerciseBestSets(history, exerciseName, 6),
  });

  if (!weightCheck.ok) {
    setChatLog((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (
        lastMessage?.role === "coach" &&
        lastMessage.text === weightCheck.message
      ) {
        return prev;
      }

      return [
        ...prev,
        {
          role: "coach",
          text: weightCheck.message,
        },
      ];
    });
    return;
  }
}

const set: LoggedSet = {
  weight,
  reps: timedExercise ? 0 : reps,
  durationSeconds,
  metricType: timedExercise ? "time" : "reps",
  rir: timedExercise
    ? undefined
    : typeof rirInput === "number"
    ? Number(rirInput)
    : undefined,
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
   const currentLoggedExercise = updated.exercises[exerciseIndex];
   const plannedExerciseForCurrent = (workoutPlan?.passes
    .find((pass) => pass.key === updated.pass)
    ?.exercises.find(
      (exercise) =>
        exerciseKey(exercise.name) === exerciseKey(currentLoggedExercise.name)
    ) ?? null) as PlannedExercise | null;
   const plannedSetCount =
    currentLoggedExercise.plannedSets ??
    parsePlannedSetCount(plannedExerciseForCurrent?.sets) ??
    goalTargets.targetSets;
   currentLoggedExercise.plannedSets = plannedSetCount;
   currentLoggedExercise.plannedReps ??= plannedExerciseForCurrent?.reps;
   currentLoggedExercise.plannedRir ??= plannedExerciseForCurrent?.rir;
   const setNumber = currentLoggedExercise.sets.length;
   const rawNextSetPlan = timedExercise
    ? getNextTimedSetPlan({
        weight,
        durationSeconds: durationSeconds ?? 0,
        failNote: didFailInput ? failNoteInput : "",
        setNumber,
        plannedSetCount,
        exerciseName: currentExerciseName,
      })
    : getNextSetPlan({
        weight,
        reps,
        rir: rirInput,
        failNote: didFailInput ? failNoteInput : "",
        setNumber,
        plannedSetCount,
        targetReps: goalTargets.targetReps,
        exerciseName: currentExerciseName,
        previousSets: updated.exercises[exerciseIndex].sets.slice(0, -1),
      });
   const nextSetPlan =
    bodyweightExercise && !hasLoggedWeight
      ? { ...rawNextSetPlan, weight: 0 }
      : rawNextSetPlan;
   const effectivePlannedSetCount =
    nextSetPlan.strategy !== "complete" && setNumber >= plannedSetCount
      ? setNumber + 1
      : plannedSetCount;
   currentLoggedExercise.plannedSets = effectivePlannedSetCount;
   currentLoggedExercise.completed = nextSetPlan.strategy === "complete";
   if (painFailure) {
    currentLoggedExercise.completed = true;
    updated.events = [
      ...(updated.events ?? []),
      {
        type: "exercise_completed_early",
        exerciseName: currentLoggedExercise.name,
        note: `Avslutades efter smärta/känning: ${failNoteInput.trim()}`,
        setCount: setNumber,
        createdAt: new Date().toISOString(),
      },
    ];
   }
    setWorkout(updated);
   const suggestedNextWeight = nextSetPlan.weight;


    setFailNoteInput("");
    setDidFailInput(false);
 // âœ… Coach-reaktion + auto-förslag för nästa set (RIR)
const step = PROGRESSION_STEP;


    // Spara â€œsenaste per övningâ€ direkt när du loggar
const newLastByExercise: LastByExercise = {
  ...lastByExercise,
[exerciseKey(currentExerciseName)]: {
  weight,
  reps: timedExercise ? 0 : reps,
  durationSeconds,
  metricType: timedExercise ? "time" : "reps",
  rir: timedExercise ? null : rirInput ?? null,
  failNote: didFailInput ? failNoteInput.trim() || "failure" : null,
  updatedAt: new Date().toISOString(),
},
};

    setLastByExercise(newLastByExercise);
    saveJSON("lastByExercise", newLastByExercise);
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
  plannedSetCount: effectivePlannedSetCount,
  isLastExercise: exerciseIndex >= updated.exercises.length - 1,
  previousSets: updated.exercises[exerciseIndex].sets.slice(0, -1),
  personalRecordText,
  lastCoachMessage,
  memoryInsight: buildExerciseMemoryInsight({
    coachMemory,
    exerciseName: currentExerciseName,
  }),
  warmupContext: activeWarmupContext,
  conditioningContext: activeConditioningContext,
});
const recentConversation = chatLog
  .slice(-8)
  .map((m) => `${m.role === "you" ? "Användaren" : "Coach"}: ${m.text}`)
  .filter(Boolean);
if (recentConversation.length > 0) {
  coachSetContext.recentConversation = recentConversation;
}
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
    rir: timedExercise ? null : typeof rirInput === "number" ? rirInput : null,
    achievedAt: newPR.createdAt,
  });


}

setCoachPendingReply(true);
const coachReply = await requestAiCoachSetReply({
  context: coachSetContext,
  fallbackReply: coachMessage,
});
setCoachPendingReply(false);

if (coachReply.text) {
  const isWorkoutFinished =
    nextSetPlan.strategy === "complete" &&
    exerciseIndex >= updated.exercises.length - 1;
  const coachReplyText = isWorkoutFinished
    ? appendWorkoutFinishLine(
        coachReply.text,
        getRotatingWorkoutFinishLine(updated.id, setNumber)
      )
    : coachReply.text;

  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: coachReplyText,
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
  const nextW = bodyweightExercise && !hasLoggedWeight ? "" : formatWeightInput(suggestedNextWeight);
  setWeightInput(nextW);
  systemSuggestedWeightRef.current = nextW ? suggestedNextWeight : undefined;
  const completeReps = timedExercise ? "" : String(nextSetPlan.repsInput || reps);
  setRepsInput(completeReps);
  systemSuggestedRepsRef.current = completeReps ? parseInt(completeReps, 10) || undefined : undefined;
  setDurationSecondsInput(timedExercise ? durationSeconds ?? 0 : 0);
  setRirInput(nextSetPlan.rirInput ?? 2);
  setFailNoteInput("");
  setDidFailInput(false);
  return;
}

    // För nästa set behåll vikt, men nolla reps (valfritt)
const nextSetRepInput = nextSetPlan.repsInput;
const nextSetRirInput = nextSetPlan.rirInput;

setRepsInput(String(nextSetRepInput));
systemSuggestedRepsRef.current = nextSetRepInput ? Number(nextSetRepInput) || undefined : undefined;
setDurationSecondsInput(0);
const nextW = bodyweightExercise && !hasLoggedWeight ? "" : formatWeightInput(suggestedNextWeight);
setWeightInput(nextW);
systemSuggestedWeightRef.current = nextW ? suggestedNextWeight : undefined;
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
    updated.exercises[exerciseIndex].completed = false;
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

    setChatLog((prev) => {
      const undoText = "Såg det — stryker det setet.";
      if (prev.length > 0 && prev[prev.length - 1].role === "coach") {
        return [...prev.slice(0, -1), { role: "coach", source: "engine" as const, text: undoText }];
      }
      return [...prev, { role: "coach", source: "engine" as const, text: undoText }];
    });
  }

  function updateSet(setIdx: number, newWeight: number, newReps: number, newRir: number) {
    if (!workout) return;
    const updated = structuredClone(workout);
    const sets = updated.exercises[exerciseIndex].sets;
    if (setIdx < 0 || setIdx >= sets.length) return;
    const exerciseName = updated.exercises[exerciseIndex].name;
    const key = exerciseKey(exerciseName);
    sets[setIdx] = { ...sets[setIdx], weight: newWeight, reps: newReps, rir: newRir };
    setWorkout(updated);

    const workoutsForExercise = [updated, ...history];
    const latest = getLatestLoggedSetForExercise(workoutsForExercise, exerciseName);
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

    const bestRecord = getBestRecordForExercise(workoutsForExercise, exerciseName);
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

  for (const event of w.events ?? []) {
    if (event.type === "pain" || event.type === "exercise_completed_early") {
      notes.push({
        ...base,
        exerciseName: event.exerciseName,
        text: `${event.exerciseName}: smärta eller känning rapporterades senast. ${event.note ?? ""}`.trim(),
      });
    }

    if (event.type === "exercise_replaced" && event.replacementName) {
      notes.push({
        ...base,
        exerciseName: event.exerciseName,
        text: `${event.exerciseName} byttes mot ${event.replacementName} senast.`,
      });
    }
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
      text: `${ex.name}: bästa set senast var ${best.weight} kg Ã— ${best.reps}.`,
    });
  }
}


  return notes;
}

function takeawayMentionsExercise(takeaway: string, exerciseName: string) {
  const takeawayKey = exerciseKey(takeaway);
  const exerciseNameKey = exerciseKey(exerciseName);
  const exerciseTokens = exerciseNameKey
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  return (
    takeawayKey.includes(exerciseNameKey) ||
    exerciseTokens.some((token) => takeawayKey.includes(token))
  );
}

function makeCoachNotesFromReview(review: WorkoutReview, w: Workout): CoachNote[] {
  const base = {
    createdAt: new Date().toISOString(),
    pass: w.pass,
    gym: w.gym,
  };

  return [...new Set(review.coachMemoryTakeaway.map((item) => item.trim()).filter(Boolean))]
    .slice(0, 3)
    .map((takeaway) => {
      const matchingExercise = w.exercises.find((exercise) =>
        takeawayMentionsExercise(takeaway, exercise.name)
      );

      return {
        ...base,
        exerciseName: matchingExercise?.name,
        text: takeaway,
      };
    });
}

function saveCoachNotes(newNotes: CoachNote[]) {
  if (newNotes.length === 0) return;

  setCoachMemory((previousMemory) => {
    const nextMemory: CoachMemory = {
      notes: mergeCoachNotes(newNotes, previousMemory.notes),
    };

    saveJSON("coachMemory", nextMemory);
    void syncBetaCoachMemory(nextMemory.notes);
    return nextMemory;
  });
}

function mergeCoachNotes(newNotes: CoachNote[], existingNotes: CoachNote[]) {
  const seen = new Set<string>();
  const merged: CoachNote[] = [];

  for (const note of [...newNotes, ...existingNotes]) {
    const key = [
      note.pass,
      note.gym,
      note.exerciseName ? exerciseKey(note.exerciseName) : "workout",
      note.text.trim().toLowerCase(),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(note);
  }

  return merged.slice(0, 50);
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
  const workoutEvents = workout.events ?? [];
  const painOrStopEvents = workoutEvents.filter(
    (event) => event.type === "pain" || event.type === "exercise_completed_early"
  );
  const replacementEvents = workoutEvents.filter(
    (event) => event.type === "exercise_replaced"
  );

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
    coachHeadline = `Det här var en stark dag. ${improvedText} gick framåt ðŸ”¥`;
  } else if (progression.improved.length === 1) {
    coachHeadline = `${progression.improved[0]} tog ett tydligt steg idag ðŸ”¥`;
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

  if (painOrStopEvents.length > 0) {
    const firstPainEvent = painOrStopEvents[0];
    positives.push(
      `Du sa till när ${firstPainEvent.exerciseName} inte kändes bra. Det är exakt så vi håller passet smart.`
    );
  }

  if (replacementEvents.length > 0) {
    const firstReplacement = replacementEvents[0];
    if (firstReplacement.replacementName) {
      positives.push(
        `${firstReplacement.exerciseName} byttes mot ${firstReplacement.replacementName}. Bra justering mitt i passet.`
      );
    }
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

  if (painOrStopEvents.length > 0) {
    const affected = Array.from(
      new Set(painOrStopEvents.map((event) => event.exerciseName))
    ).join(", ");

    adjustments.push(
      `${affected}: vi tar med oss smärtan/känningen och väljer smärtfri variant eller kortare dos nästa gång.`
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

  if (painOrStopEvents.length > 0) {
    nextFocus.unshift(
      `Nästa gång startar vi lugnare i ${painOrStopEvents[0].exerciseName} eller byter till en variant som känns bra direkt.`
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

if (painOrStopEvents.length > 0) {
  const affected = Array.from(
    new Set(painOrStopEvents.map((event) => event.exerciseName))
  ).join(", ");

  coachMemoryTakeaway.push(
    `Jag sparar att ${affected} gav smärta/känning idag.`
  );
}

if (replacementEvents.length > 0) {
  const swaps = replacementEvents
    .filter((event) => event.replacementName)
    .map((event) => `${event.exerciseName} till ${event.replacementName}`);

  if (swaps.length > 0) {
    coachMemoryTakeaway.push(`Jag sparar bytet: ${swaps.join(", ")}.`);
  }
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
  loggedExercises: workout.exercises
    .filter((ex) => ex.sets.length > 0)
    .map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s, i) => ({
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        durationSeconds: s.durationSeconds,
        metricType: s.metricType,
        setIndex: i,
        exerciseKey: ex.name.toLowerCase().trim().replace(/\s+/g, "_"),
      })),
    })),
  workoutId: workout.id,
  passKey: workout.pass,
  startedAt: workout.startedAt,
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
    `Pass ${w.pass} sparat âœ…`,
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
saveCoachNotes(freshNotes);



    saveRawValue("lastPass", workout.pass);
    setLastPass(workout.pass);
    void syncBetaSnapshotNow({ reason: "workout-finished" });

const review = buildWorkoutReview({
  workout: workoutWithSummary,
  summary,
  progression: progressionComparison,
});

setWorkoutReview(null);
setWorkoutReviewLoading(true);
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
  events: workoutWithSummary.events ?? [],
  sets: workoutWithSummary.exercises.flatMap((exercise) =>
    exercise.sets.map((set, setIndex) => ({
      exerciseName: exercise.name,
      exerciseKey: normalizeExerciseSearchText(exercise.name),
      setIndex: setIndex + 1,
      weight: set.weight,
      reps: set.reps,
      durationSeconds: set.durationSeconds ?? null,
      metricType: set.metricType ?? (set.durationSeconds ? "time" : "reps"),
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
    events: workoutWithSummary.events?.map(
      ({ type, exerciseName, note, setCount, replacementName }) => ({
        type,
        exerciseName,
        note,
        setCount,
        replacementName,
      })
    ),
  },
  fallbackReview: getReviewCoachParts(review),
}).then((response) => {
  const finalReview =
    response.mode === "ai"
      ? applyReviewCoachParts(review, response.review)
      : review;

  saveCoachNotes(makeCoachNotesFromReview(finalReview, workoutWithSummary));
  setWorkoutReview(finalReview);
  setLatestCompletedReview(finalReview);
}).catch(() => {
  saveCoachNotes(makeCoachNotesFromReview(review, workoutWithSummary));
  setWorkoutReview(review);
  setLatestCompletedReview(review);
}).finally(() => {
  setWorkoutReviewLoading(false);
});
setWorkoutComplete(false);
localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);
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
    localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);
    localStorage.removeItem(AUTH_GATE_BYPASS_KEY);

    setLastPass(null);
    setSelectedStartPass(null);
    setGym("Sjöviksgymmet");
    setHistory([]);
    setLastByExercise({});
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
    setWorkoutReview(null);
    setWorkoutReviewLoading(false);
    setWorkoutComplete(false);
    setStarted(false);
    alert("Allt återställt âœ…");
    setCoachMemory({ notes: [] });
  setCustomExercisesByPass(createEmptyPassStringMap());
  setTodayExercisesByPass(createEmptyPassStringMap());
  setRemovedExercisesByPass(createEmptyPassStringMap());
  setExerciseOverridesByPass(createEmptyPassOverrideMap());
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
  !editingProfile &&
  (showDailyPlan || started || workoutComplete);

const settingsPanel = showSettings ? (
  <SettingsScreen
    theme={appTheme}
    onThemeChange={(theme) => {
      setAppTheme(theme);
      saveJSON("appTheme", theme);
    }}
    onBack={() => setShowSettings(false)}
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
            src={appTheme === "light" ? "/logo-light.png" : "/logo-dark.png"}
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

if (!authGateCleared) {
  return (
    <AuthStartScreen
      theme={appTheme}
      onAuthenticated={() => {
        localStorage.removeItem(AUTH_GATE_BYPASS_KEY);
        setAuthGateCleared(true);
      }}
      onContinueWithoutAccount={() => {
        saveJSON(AUTH_GATE_BYPASS_KEY, true);
        setAuthGateCleared(true);
      }}
    />
  );
}

if (!userProfile || editingProfile) {
  return (
    <>
    {globalAppControls}
    <SetupScreen
      theme={appTheme}
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
      programStartModeInput={programStartModeInput}
      setProgramStartModeInput={setProgramStartModeInput}
      isEditing={editingProfile}
      onSubmit={() => {
const parsedAge = Number(ageInput);
const requestedDays = Number(daysPerWeekInput);
const maxDays =
  programStartModeInput !== "coach"
    ? MANUAL_PROGRAM_MAX_DAYS
    : COACH_PROGRAM_MAX_DAYS;
const daysPerWeek = Math.min(
  Math.max(1, Number.isFinite(requestedDays) ? requestedDays : 3),
  maxDays
);
const profile: UserProfile = {
  name: nameInput.trim() || "Du",
  age: Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : null,
  gender: genderInput,
  trainingExperience: trainingExperienceInput,
  goalPrimary: goalInput,
  goalSecondary: secondaryGoalsInput.filter((goal) => goal !== goalInput),
  daysPerWeek,
  minutesPerSession: Number(minutesPerSessionInput),
  location: locationInput,
  equipment: locationInput === "hemma" ? equipmentInput : [],
  exercisePreferences: exercisePreferencesInput,
  limitations: limitationsInput,
};

        saveJSON("userProfile", profile);
        void syncStructuredBetaProfile(profile as unknown as Record<string, unknown>);
        setUserProfile(profile);
        const nextCustomPlan =
          programStartModeInput === "manual"
            ? buildEmptyManualWorkoutPlan(profile)
            : null;
        setCustomWorkoutPlan(nextCustomPlan);
        setCustomExercisesByPass(createEmptyPassStringMap());
        setRemovedExercisesByPass(createEmptyPassStringMap());
        setExerciseOverridesByPass(createEmptyPassOverrideMap());
        setPassDisplayNamesByPass({});
        if (nextCustomPlan) {
          saveJSON("customWorkoutPlan", nextCustomPlan);
        } else {
          localStorage.removeItem("customWorkoutPlan");
        }
        saveJSON("customExercisesByPass", createEmptyPassStringMap());
        saveJSON("removedExercisesByPass", createEmptyPassStringMap());
        saveJSON("exerciseOverridesByPass", createEmptyPassOverrideMap());
        saveJSON("passDisplayNamesByPass", {});
        setEditingProfile(false);
        setProgramBuildStatus(nextCustomPlan ? "idle" : "building");
        setProgramBuildScreenVisible(!nextCustomPlan);
        setShowProgramReview(true);
        saveJSON("approvedWorkoutPlan", false);
      }}
    />
    {settingsPanel}
    </>
  );
}

if (userProfile && showProgramReview && programBuildScreenVisible) {
  return <ProgramBuildLoadingScreen theme={appTheme} />;
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
      onAddExercise={(passKey, exerciseNameRaw) => {
        const resolved = resolveExerciseName(exerciseNameRaw);

        if (resolved.status === "empty") {
          return { clearInput: false, nextInput: exerciseNameRaw };
        }

        if (resolved.status === "suggest") {
          return {
            clearInput: false,
            nextInput: resolved.suggestion,
            suggestion: resolved.suggestion,
            tone: "suggestion",
            message: `Menar du ${resolved.suggestion}?`,
          };
        }

        if (resolved.status === "needsCategory") {
          return {
            clearInput: false,
            nextInput: resolved.name,
            tone: "question",
            message: "Vad tränar den främst? Välj en egen-kategori nedan.",
          };
        }

        if (resolved.status === "unknown") {
          return {
            clearInput: false,
            nextInput: exerciseNameRaw,
            tone: "question",
            message:
              "Jag hittar ingen säker matchning. Välj egen-kategori nedan om du vill lägga in den exakt.",
          };
        }

        const name = resolved.name;
        setCustomExercisesByPass((prev) => {
          const next: CustomExercisesByPass = {
            ...prev,
            [passKey]: mergePlan(prev[passKey] ?? [], [name]),
          };

          saveJSON("customExercisesByPass", next);
          return next;
        });
        return {
          clearInput: true,
          tone: "success",
          message: `${name} är tillagd i Pass ${passKey}.`,
        };
      }}
      onReplaceExercise={(passKey, fromExerciseName, toExerciseName) => {
        const fromKey = exerciseKey(fromExerciseName);
        const resolved = resolveExerciseName(toExerciseName);
        const toName = resolved.status === "known" ? resolved.name : toExerciseName;
        const isCustomExercise = customExercisesByPass[passKey]?.some(
          (name) => exerciseKey(name) === fromKey
        );

        if (isCustomExercise) {
          setCustomExercisesByPass((prev) => {
            const next: CustomExercisesByPass = {
              ...prev,
              [passKey]: mergePlan(
                (prev[passKey] ?? []).filter((name) => exerciseKey(name) !== fromKey),
                [toName]
              ),
            };

            saveJSON("customExercisesByPass", next);
            return next;
          });
        } else {
          setExerciseOverridesByPass((prev) => {
            const next: ExerciseOverridesByPass = {
              ...prev,
              [passKey]: {
                ...(prev[passKey] ?? {}),
                [fromKey]: toName,
              },
            };

            saveJSON("exerciseOverridesByPass", next);
            return next;
          });
        }

        setRemovedExercisesByPass((prev) => {
          const next: RemovedExercisesByPass = {
            ...prev,
            [passKey]: (prev[passKey] ?? []).filter(
              (name) => exerciseKey(name) !== exerciseKey(toName)
            ),
          };

          saveJSON("removedExercisesByPass", next);
          return next;
        });
        setProgramPreferenceReply(`${fromExerciseName} byttes mot ${toName}.`);
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
        void syncStructuredBetaProgram({
          profile: userProfile as unknown as Record<string, unknown>,
          plan: workoutPlan as unknown as Record<string, unknown>,
          source: workoutPlan.source ?? "ai",
        });
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
        currentExerciseCompleted={Boolean(workout?.exercises?.[exerciseIndex]?.completed)}
        chatLog={chatLog}
        chatInput={chatInput}
        setChatInput={setChatInput}
        sendChat={sendChat}
        isCoachThinking={coachPendingReply}
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
        source: "engine" as const,
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
        canSkipCurrentExercise={true}
        skippedExerciseName={skippedExercise?.exercise.name ?? null}
        undoSkipExercise={undoSkipExercise}
        prevExercise={prevExercise}
        nextExercise={nextExercise}
        finishWorkout={finishWorkout}
        personalRecords={personalRecords}
        progression={progression}
        previousExerciseSets={previousExerciseSets}
        progressionPlan={progressionPlan}
        plannedWeightKg={systemSuggestedWeightRef.current}
        plannedReps={systemSuggestedRepsRef.current}
        updateSet={updateSet}
        previousWorkoutSummary={getPreviousWorkoutSummaryLine(history) ?? undefined}
      />
      
) : workoutReviewLoading ? (
  <WorkoutReviewLoadingScreen theme={appTheme} />
) : workoutReview ? (
  <WorkoutReviewScreen
    review={workoutReview}
    onClose={() => {
      setWorkoutReview(null);
      setWorkoutComplete(false);
      setShowDailyPlan(false);
    }}
    onEditSet={(exerciseName, setIndex, _exerciseKey, updated) => {
      const wid = workoutReview.workoutId;
      const updatedHistory = history.map((w) => {
        if (w.id !== wid) return w;
        return {
          ...w,
          exercises: w.exercises.map((ex) => {
            if (ex.name !== exerciseName) return ex;
            return {
              ...ex,
              sets: ex.sets.map((s, i) =>
                i === setIndex
                  ? { ...s, weight: updated.weight, reps: updated.reps, rir: updated.rir }
                  : s
              ),
            };
          }),
        };
      });
      setHistory(updatedHistory);
      saveJSON("workoutHistory", updatedHistory);

      const updatedWorkout = updatedHistory.find((w) => w.id === wid);
      if (updatedWorkout) {
        void syncStructuredBetaWorkout({
          id: updatedWorkout.id,
          passKey: updatedWorkout.pass,
          passName: updatedWorkout.displayName,
          status: "completed",
          startedAt: updatedWorkout.startedAt,
          completedAt: updatedWorkout.startedAt,
          warmupNote: updatedWorkout.warmupContext?.note ?? null,
          conditioningNote: updatedWorkout.conditioningContext?.note ?? null,
          summary: (updatedWorkout as unknown as Record<string, unknown>).summary as Record<string, unknown>,
          review: workoutReview as unknown as Record<string, unknown>,
          events: updatedWorkout.events ?? [],
          sets: updatedWorkout.exercises.flatMap((exercise) =>
            exercise.sets.map((set, si) => ({
              exerciseName: exercise.name,
              exerciseKey: normalizeExerciseSearchText(exercise.name),
              setIndex: si + 1,
              weight: set.weight,
              reps: set.reps,
              durationSeconds: set.durationSeconds ?? null,
              metricType: set.metricType ?? (set.durationSeconds ? "time" : "reps"),
              rir: set.rir ?? null,
              failNote: set.failNote ?? null,
              createdAt: set.createdAt,
            }))
          ),
        });
      }

      setWorkoutReview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          loggedExercises: prev.loggedExercises.map((ex) => {
            if (ex.name !== exerciseName) return ex;
            return {
              ...ex,
              sets: ex.sets.map((s) =>
                s.setIndex === setIndex
                  ? { ...s, weight: updated.weight, reps: updated.reps, rir: updated.rir }
                  : s
              ),
            };
          }),
        };
      });
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
    now={now}
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
    onOpenSettings={() => setShowSettings(true)}
  />
)}
{settingsPanel}
</main>
);
}
