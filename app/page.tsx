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
  "DÃ¤r Ã¤r vi klara med dagens pass. GÃ¥ vidare sÃ¥ kollar vi igenom det.",
  "DÃ¤r stÃ¤nger vi passet. GÃ¥ vidare sÃ¥ tar vi genomgÃ¥ngen.",
  "Klart fÃ¶r idag. Tryck vidare sÃ¥ gÃ¥r vi igenom vad vi tar med oss.",
  "DÃ¤r har vi dagens jobb. GÃ¥ vidare sÃ¥ summerar vi passet.",
  "Passet Ã¤r klart. GÃ¥ vidare sÃ¥ tittar vi pÃ¥ helheten.",
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
        aria-label="InstÃ¤llningar"
        title="InstÃ¤llningar"
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
    aiStatus?: "fallback";
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
    return "Du verkar pigg idag. FÃ¶rsta setet visar hur offensiva vi kan vara.";
  }

 const options = [
  "FÃ¶rsta setet visar oss var vi ligger.",
  "Vi Ã¶ppnar lugnt och hÃ¶jer om det sitter.",
  "FÃ¶rsta setet fÃ¶rst. Lugnt och tydligt.",
];

return options[Math.floor(Math.random() * options.length)];
}

function buildWarmupContext(input: string): WarmupContext | null {
  const note = input.trim();
  const lower = note.toLowerCase();

  if (!note) return null;

  const mentionsWarmup =
    lower.includes("uppvÃ¤rm") ||
    lower.includes("uppvarm") ||
    lower.includes("vÃ¤rmer") ||
    lower.includes("vÃ¤rma") ||
    lower.includes("vÃ¤rmt") ||
    lower.includes("varm") ||
    lower.includes("cykl") ||
    lower.includes("lÃ¶pband") ||
    lower.includes("gÃ¥ngband") ||
    lower.includes("rodd") ||
    lower.includes("crosstrainer") ||
    lower.includes("lÃ¤tt set") ||
    lower.includes("lÃ¤tta set") ||
    lower.includes("uppvÃ¤rmningsset");

  if (!mentionsWarmup) return null;

  let status: WarmupStatus = "unknown";

  if (
    lower.includes("ingen uppvÃ¤rmning") ||
    lower.includes("ingen uppvarmning") ||
    lower.includes("hoppar uppvÃ¤rm") ||
    lower.includes("hoppar uppvarm") ||
    lower.includes("skippar uppvÃ¤rm") ||
    lower.includes("skippar uppvarm") ||
    lower.includes("utan uppvÃ¤rm") ||
    lower.includes("utan uppvarm")
  ) {
    status = "skipped";
  } else if (
    lower.includes("cykl") ||
    lower.includes("lÃ¶pband") ||
    lower.includes("gÃ¥ngband") ||
    lower.includes("rodd") ||
    lower.includes("crosstrainer")
  ) {
    status = "cardio";
  } else if (
    lower.includes("lÃ¤tt set") ||
    lower.includes("lÃ¤tta set") ||
    lower.includes("uppvÃ¤rmningsset")
  ) {
    status = "light";
  } else if (
    lower.includes("redan varm") ||
    lower.includes("Ã¤r varm") ||
    lower.includes("vÃ¤rmt upp") ||
    lower.includes("uppvÃ¤rmd")
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
    return "Bra att du sÃ¤ger till. Vi tar ingen risk hÃ¤r. LÃ¤mna den Ã¶vningen eller byt till nÃ¥got som kÃ¤nns helt smÃ¤rtfritt.";
  }

  if (warmup.status === "skipped") {
    return "Bra att du sÃ¤ger till. Vi stoppar den Ã¶vningen hÃ¤r. NÃ¤sta gÃ¥ng vÃ¤rmer vi upp lÃ¤ttare innan fÃ¶rsta arbetssetet.";
  }

  return "Bra att du sÃ¤ger till. Du vÃ¤rmde upp, sÃ¥ vi chansar inte vidare. LÃ¤mna den Ã¶vningen eller byt till nÃ¥got som kÃ¤nns helt smÃ¤rtfritt.";
}

function getPainCoachActionText(warmup: WarmupContext | null) {
  return `${getPainCoachReply(warmup)} Tryck Hoppa Ã¶ver om du vill lÃ¤mna den.`;
}

function getPainCoachContextText(warmup: WarmupContext | null) {
  if (!warmup || warmup.status === "unknown") {
    return "VÃ¤rm upp lÃ¤tt nÃ¤sta gÃ¥ng innan fÃ¶rsta arbetssetet.";
  }

  if (warmup.status === "skipped") {
    return "NÃ¤sta gÃ¥ng vill jag att du vÃ¤rmer upp lÃ¤tt fÃ¶rst.";
  }

  return "Du vÃ¤rmde upp, sÃ¥ vi tar ingen mer risk hÃ¤r.";
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
    lower.includes("lÃ¶p") ||
    lower.includes("lop") ||
    lower.includes("cykl") ||
    lower.includes("rodd") ||
    lower.includes("gÃ¥ngband") ||
    lower.includes("gangband") ||
    lower.includes("intervall");

  if (!mentionsConditioning) return null;

  const minuteMatch = lower.match(/(\d+)\s*(min|minuter)/);
  const minutes = minuteMatch ? Number(minuteMatch[1]) : null;

  const timing =
    lower.includes("efter") || lower.includes("avslut")
      ? "after"
      : lower.includes("innan") ||
        lower.includes("fÃ¶re") ||
        lower.includes("fore") ||
        lower.includes("fÃ¶rst") ||
        lower.includes("forst")
      ? "before"
      : "unknown";

  const activity = lower.includes("cykl")
    ? "cykel"
    : lower.includes("rodd")
    ? "rodd"
    : lower.includes("gÃ¥ngband") || lower.includes("gangband")
    ? "gÃ¥ngband"
    : lower.includes("lÃ¶p") || lower.includes("lop") || lower.includes("spring")
    ? "lÃ¶pning"
    : "kondition";

  const hardByWords =
    lower.includes("intervall") ||
    lower.includes("hÃ¥rt") ||
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
    normalized.includes("gÃ¥ vidare");

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
      note: "FÃ¶rsta setet visar oss var vi ligger.",
      reason: "Ingen historik Ã¤n.",
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
            "Toppsetet har nÃ¥tt mÃ¥let med marginal nog fÃ¶r att ett fÃ¶rsiktigt test upp kan vara rimligt.",
          tone: "offer",
        }
      : undefined;

  if (topSetTooLight && dayForm !== "trött") {
    const nextWeight = getNextAvailableWeight(topSet.weight, exerciseName, "up");
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
      note: "FÃ¶rra nivÃ¥n blev fÃ¶r lÃ¤tt. Vi gÃ¥r upp ett steg och hittar rÃ¤tt belastning.",
      reason: "Senaste bÃ¤sta setet hade hÃ¶ga reps med marginal kvar.",
      opportunity: {
        type: "increase_now",
        confidence: "high",
        suggestedWeight: formatWeightInput(nextWeight),
        reason: "Repsen blev fÃ¶r hÃ¶ga med marginal kvar.",
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
      note: "Du har haft flera tunga set. Idag hÃ¥ller vi igen lite.",
      reason: "Flera senaste set har varit nÃ¤ra failure.",
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
      note: "Senaste nivÃ¥n hamnade fÃ¶r lÃ¥gt i reps fÃ¶r mÃ¥let. Jag tycker vi sÃ¤nker lite och bygger bÃ¤ttre arbetsset.",
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
      note: "Senast tog det stopp. Vi bÃ¶rjar lite lÃ¤gre hÃ¤r.",
      reason: "Senaste bÃ¤sta setet var fÃ¶r tungt.",
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
      reason: "Samma toppvikt har suttit flera pass med tillrÃ¤ckligt mÃ¥nga reps.",
      opportunity: {
        type: "increase_now",
        confidence: "high",
        suggestedWeight: formatWeightInput(nextWeight),
        reason:
          "Samma toppvikt har suttit flera pass med tillrÃ¤ckligt mÃ¥nga reps.",
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
      note: "Du har mer hÃ¤r, men idag bÃ¶rjar vi kontrollerat.",
      reason: "Dagsformen Ã¤r trÃ¶tt.",
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
    note: "Samma vikt som ditt bÃ¤sta. Vi siktar lite lÃ¤gre fÃ¶rst.",
    reason: `Jag vill se att ${formatWeightInput(topSet.weight)} kg sitter nÃ¤ra ${topSet.reps} reps minst ett pass till innan vi hÃ¶jer.`,
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
    return `Ja. I ${exerciseName} har samma vikt suttit flera pass, sÃ¥ nu testar vi upp lite.\n\nIdag: ${target}.`;
  }

  if (plan.action === "hold") {
    return `Inte Ã¤n: ${plan.reason}\n\nIdag vill jag se ${target}.`;
  }

  if (plan.action === "decrease") {
    return `Inte idag. ${plan.reason}\n\nVi bÃ¶rjar pÃ¥ ${target} och ser hur fÃ¶rsta setet kÃ¤nns.`;
  }

  if (plan.action === "deload") {
    return `Idag hÃ¥ller vi igen. ${plan.reason}\n\nMÃ¥let Ã¤r ${target}.`;
  }

  return `Jag saknar historik hÃ¤r Ã¤n. FÃ¶rsta setet visar oss var vi ligger: ${target}.`;
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
    lower.includes("Ã¤r det") ||
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
    `Bra frÃ¥ga. ${exerciseName} Ã¤r inte â€œfarligâ€ i sig, men den ska kÃ¤nnas trygg.`,
    caution || "Om nÃ¥got gÃ¶r ont eller kÃ¤nns fel sÃ¥ justerar vi direkt.",
    cue ? `Idag vill jag att du tÃ¤nker: ${cue}` : "",
    "BÃ¶rja kontrollerat. KÃ¤nns nÃ¥got fel stoppar vi direkt.",
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
  const exerciseName = args.exerciseName || "Ã¶vningen";
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
      "Bra att du sÃ¤ger till.",
      "SmÃ¤rta gÃ¥r fÃ¶re planen hÃ¤r.",
      hasCoachFreeText(normalized, ["knappte", "small till"])
        ? "Om det knÃ¤ppte till: stoppa den rÃ¶relsen nu."
        : "KÃ¤nns det mer Ã¤n lÃ¤tt obehag: lÃ¤mna Ã¶vningen.",
      `Vi tar ${exerciseName} lugnt eller byter till nÃ¥got som kÃ¤nns helt tryggt.`,
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
      "Ã¤r det bra",
    ])
  ) {
    return shortCoach([
      `Ja. ${askedSetText || setText || "Det dÃ¤r"} Ã¤r starkt i din nivÃ¥.`,
      latestSet?.rir !== undefined && latestSet.rir >= 2
        ? "Extra bra: du hade fortfarande marginal kvar."
        : "Det viktiga Ã¤r att det sitter med kontroll.",
      "NÃ¤sta steg Ã¤r att bygga vidare utan att tappa formen.",
    ]);
  }

  if (
    hasCoachFreeText(normalized, [
      "svett",
      "flas",
      "flÃ¥s",
      "puls",
      "dryper",
      "rinner",
      "helt slut",
    ])
  ) {
    return shortCoach([
      "Haha ja, nu Ã¤r du inne i passet ðŸ”¥",
      "Bra. HÃ¥ll huvudet kallt Ã¤ndÃ¥.",
      setText ? `NÃ¤sta set bygger vi vidare frÃ¥n ${setText}.` : "",
      "Fokus pÃ¥ kontroll, inte stress.",
    ]);
  }

  if (
    hasCoachFreeText(normalized, [
      "kul",
      "skoj",
      "kanon",
      "gott",
      "gÃ¶tt",
      "nice",
      "riktigt bra",
      "kandes bra",
      "kÃ¤ndes bra",
      "stabilt",
    ])
  ) {
    return shortCoach([
      "Kanon. Det dÃ¤r vill jag hÃ¶ra ðŸ”¥",
      setText
        ? `${setText} med den kÃ¤nslan Ã¤r ett vÃ¤ldigt bra tecken.`
        : "NÃ¤r kÃ¤nslan Ã¤r sÃ¥ dÃ¤r har vi nÃ¥got att bygga pÃ¥.",
      "Ta nÃ¤sta set med samma kontroll.",
    ]);
  }

  if (
    hasCoachFreeText(normalized, [
      "hoja",
      "hÃ¶ja",
      "mer vikt",
      "oka",
      "Ã¶ka",
      "tyngre",
    ])
  ) {
    return shortCoach([
      "Ja, men bara om kontrollen fÃ¶ljer med.",
      "Liten hÃ¶jning Ã¤r okej om du fortfarande kan hÃ¥lla RIR 1-2.",
      "Hellre en smart hÃ¶jning Ã¤n ett slarvigt maxfÃ¶rsÃ¶k.",
    ]);
  }

  if (args.dayForm === "stark") {
    return shortCoach([
      "Bra. DÃ¥ kan vi vara lite mer offensiva idag ðŸ’ª",
      "FÃ¶rsta setet visar hur mycket vi vÃ¥gar hÃ¶ja.",
    ]);
  }

  if (args.dayForm === "trött") {
    return shortCoach([
      "Okej. DÃ¥ Ã¶ppnar vi lite smartare idag.",
      "Vi jagar kvalitet fÃ¶rst, vikten efter det.",
    ]);
  }

  return shortCoach([
    "Jag hÃ¶r dig.",
    "Jag tar med det i nÃ¤sta beslut.",
    "FortsÃ¤tt skriva sÃ¥ dÃ¤r under passet, det hjÃ¤lper coachningen.",
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

  return `Du har legat pÃ¥ ${latestThree[0].weight} kg i 3 pass. Om tekniken kÃ¤nns bra kan vi testa +${formatWeightInput(
    getExerciseWeightStep(exerciseName)
  )} kg nÃ¤sta gÃ¥ng.`;
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

  return "Du har haft flera tunga set senaste passen. Det kan vara lÃ¤ge att hÃ¥lla igen lite idag.";
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

  return `Du har haft flera vÃ¤ldigt tunga set senaste passen. Det kan vara smart att kÃ¶ra en lÃ¤ttare dag runt ${formatWeightInput(deloadWeight)} kg eller ungefÃ¤r 5â€“10 % lÃ¤ttare.`;
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
  A: ["Hantelpress", "SkivstÃ¥ngsrodd", "Sidolyft"],
  B: ["RumÃ¤nska marklyft", "Benpress", "Benspark"],
  C: ["Lutande hantelpress", "Latsdrag", "Cable cross"],
  D: ["Benpress", "Utfall", "Vadpress"],
  E: ["BrÃ¶stpress", "Maskinrodd", "Sidolyft"],
  F: ["Benpress", "LÃ¥rcurl", "Machine crunch"],
  G: ["Planka", "HÃ¶ftlyft", "UpphÃ¶jda armhÃ¤vningar"],
};
function hasHomeEquipment(profile: UserProfile, equipment: string) {
  return profile.equipment?.includes(equipment) ?? false;
}

function buildBodyweightPlan(pass: PassType, daysPerWeek: number) {
  if (daysPerWeek <= 1) {
    return ["KnÃ¤bÃ¶j", "ArmhÃ¤vningar", "HÃ¶ftlyft", "Ryggresningar", "Planka"];
  }

  if (daysPerWeek === 2) {
    return pass === "A"
      ? ["KnÃ¤bÃ¶j", "ArmhÃ¤vningar", "Utfall", "Planka"]
      : ["HÃ¶ftlyft", "Pike push-up", "Step-up", "Sidoplanka"];
  }

  if (pass === "A") return ["ArmhÃ¤vningar", "Pike push-up", "Planka"];
  if (pass === "B") return ["KnÃ¤bÃ¶j", "Utfall", "HÃ¶ftlyft", "Vadpress"];
  if (pass === "C") return ["ArmhÃ¤vningar", "Ryggresningar", "Sidoplanka"];
  return ["KnÃ¤bÃ¶j", "Step-up", "HÃ¶ftlyft", "Planka"];
}

function buildBandsOnlyPlan(pass: PassType, daysPerWeek: number) {
  if (daysPerWeek <= 1) {
    return ["KnÃ¤bÃ¶j", "Bandrodd", "ArmhÃ¤vningar", "Band pull-apart", "Planka"];
  }

  if (pass === "A") return ["ArmhÃ¤vningar", "Bandrodd", "Band pull-apart", "Bicepscurl med band"];
  if (pass === "B") return ["KnÃ¤bÃ¶j", "Utfall", "HÃ¶ftlyft", "Vadpress"];
  if (pass === "C") return ["Bandpress", "Bandrodd", "Sidolyft med band", "Tricepspress med band"];
  return ["KnÃ¤bÃ¶j", "Step-up", "HÃ¶ftlyft", "Planka"];
}

function getDefaultPassDisplayName(
  profile: UserProfile,
  pass: PassType
): string {
  if (profile.daysPerWeek <= 2) {
    return pass === "A" ? "Helkropp 1" : "Helkropp 2";
  }

  if (profile.daysPerWeek === 3) {
    if (pass === "A") return "Ã–verkropp";
    if (pass === "B") return "Underkropp";
    return "Helkropp";
  }

  if (profile.daysPerWeek === 4) {
    if (pass === "A") return "Ã–verkropp 1";
    if (pass === "B") return "Underkropp 1";
    if (pass === "C") return "Ã–verkropp 2";
    return "Underkropp 2";
  }

  return `Pass ${pass}`;
}
function buildPlan(profile: UserProfile, pass: PassType): string[] {
  const hasLowBackIssue = profile.limitations
    .toLowerCase()
    .includes("lÃ¤ndrygg");
  const isBeginner = profile.trainingExperience === "nyborjare";

  if (profile.location === "gym") {
    if (isBeginner) {
      if (profile.daysPerWeek === 1) {
        return [
          "Benpress",
          "BrÃ¶stpress",
          "Latsdrag",
          "Benspark",
          "Cable crunch",
        ];
      }

      if (profile.daysPerWeek === 2) {
        return pass === "A"
          ? ["BrÃ¶stpress", "Sittande kabelrodd", "Latsdrag", "Sidolyft"]
          : ["Benpress", "Benspark", "LÃ¥rcurl", "Vadpress"];
      }

      if (profile.daysPerWeek === 3) {
        if (pass === "A") {
          return [
            "BrÃ¶stpress",
            "Sittande kabelrodd",
            "Latsdrag",
            "Sidolyft",
            "Triceps pushdown",
          ];
        }

        if (pass === "B") {
          return ["Benpress", "Benspark", "LÃ¥rcurl", "Vadpress"];
        }

        return [
          "BrÃ¶stpress",
          "Latsdrag",
          "Benpress",
          "Cable crunch",
        ];
      }

      if (profile.daysPerWeek === 4) {
        if (pass === "A") {
          return ["BrÃ¶stpress", "Sittande kabelrodd", "Sidolyft", "Triceps pushdown"];
        }

        if (pass === "B") {
          return ["Benpress", "Benspark", "LÃ¥rcurl", "Vadpress"];
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
        : ["Benpress", "Hantelpress", "SkivstÃ¥ngsrodd", "RumÃ¤nska marklyft", "Cable crunch"];
    }

    if (profile.daysPerWeek === 2) {
      if (hasLowBackIssue) {
        return pass === "A"
          ? ["Benpress", "Hantelpress", "Latsdrag"]
          : ["Hip thrust", "SkivstÃ¥ngsrodd", "Sidolyft"];
      }

      return pass === "A"
        ? ["Benpress", "Hantelpress", "SkivstÃ¥ngsrodd"]
        : ["RumÃ¤nska marklyft", "Latsdrag", "Sidolyft"];
    }

    if (profile.daysPerWeek === 3) {
      if (pass === "A") {
        return [
          "Hantelpress",
          "SkivstÃ¥ngsrodd",
          "Sidolyft",
          "Cable cross",
          "StÃ¥ngcurl",
          "Triceps pushdown",
        ];
      }

      if (pass === "B") {
        return hasLowBackIssue
          ? ["Benpress", "Benspark", "LÃ¥rcurl", "Vadpress"]
          : ["RumÃ¤nska marklyft", "Benpress", "Benspark", "Vadpress"];
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
          "SkivstÃ¥ngsrodd",
          "Sidolyft",
          "Cable cross",
          "StÃ¥ngcurl",
          "Triceps pushdown",
        ];
      }

      if (pass === "B") {
        return hasLowBackIssue
          ? ["Benpress", "Benspark", "LÃ¥rcurl", "Vadpress"]
          : ["RumÃ¤nska marklyft", "Benpress", "Benspark", "Vadpress"];
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
        ? ["Benpress", "Benspark", "LÃ¥rcurl", "Vadpress", "Cable crunch"]
        : ["Benpress", "Utfall", "Benspark", "Vadpress", "Cable crunch"];
    }

    if (hasLowBackIssue) {
      if (pass === "A") return ["Hantelpress", "SkivstÃ¥ngsrodd", "Sidolyft"];
      if (pass === "B") return ["Benpress", "Benspark", "Vadpress"];
      if (pass === "C") return ["Lutande hantelpress", "Latsdrag", "Cable crunch"];
      return ["Benpress", "LÃ¥rcurl", "Cable crunch"];
    }

    if (pass === "A") return ["Hantelpress", "SkivstÃ¥ngsrodd", "Sidolyft"];
    if (pass === "B") return ["RumÃ¤nska marklyft", "Benpress", "Benspark"];
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
      "ArmhÃ¤vningar",
      "Hantelrodd",
      "Goblet squat",
      "RumÃ¤nska marklyft (lÃ¤tt)",
      "Crunches",
    ];
  }

  if (profile.daysPerWeek === 2) {
    return pass === "A"
      ? ["ArmhÃ¤vningar", "Hantelrodd", "Goblet squat"]
      : ["RumÃ¤nska marklyft (lÃ¤tt)", "Hantelpress", "Bandrodd"];
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
        "RumÃ¤nska marklyft (lÃ¤tt)",
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
        "RumÃ¤nska marklyft (lÃ¤tt)",
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
  if (pass === "B") return ["RumÃ¤nska marklyft (lÃ¤tt)", "Goblet squat", "Vadpress"];
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
    return `Jag prioriterar Ã¶vningar dÃ¤r vi kan fÃ¶lja vikterna tydligt vecka fÃ¶r vecka. ${profile.daysPerWeek} dagar passar bra nÃ¤r vi vill bli starkare utan att varje pass blir fÃ¶r lÃ¥ngt.`;
  }

  if (profile.goalPrimary === "fett") {
    return `Jag bygger pass som ger mycket gjort utan att bli stÃ¶kiga. ${profile.daysPerWeek} dagar och ${profile.minutesPerSession} minuter ger oss trÃ¤ning som gÃ¥r att komma tillbaka till.`;
  }

  return `Jag lÃ¤gger fokus pÃ¥ tillrÃ¤ckligt mÃ¥nga bra set varje vecka. ${profile.daysPerWeek} dagar ger oss utrymme att bygga muskler utan att varje pass blir fÃ¶r lÃ¥ngt.`;
}

function buildProgramStructureReason(profile: UserProfile) {
  if (profile.daysPerWeek <= 2) {
    return "Med fÃ¥ pass behÃ¶ver varje pass tÃ¤cka mycket av kroppen, sÃ¥ upplÃ¤gget bÃ¶rjar brett och enkelt.";
  }

  if (profile.daysPerWeek === 3) {
    return "Tre dagar ger plats fÃ¶r tydligare fokus per pass utan att veckan blir svÃ¥r att fÃ¶lja.";
  }

  return "Fyra dagar ger mer utrymme att dela upp kroppen och hÃ¥lla passen mer fokuserade.";
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
    title: "Ditt upplÃ¤gg",
    goalPrimary: profile.goalPrimary,
    daysPerWeek: profile.daysPerWeek,
    coachSummary:
      "Jag bygger ett fÃ¶rsta upplÃ¤gg utifrÃ¥n dina svar. Vi kan justera det innan du startar.",
    planReason: buildProgramGoalReason(profile),
    structureReason: buildProgramStructureReason(profile),
    safetyNotes: profile.limitations?.trim()
      ? [`Jag tar hÃ¤nsyn till: ${profile.limitations.trim()}.`]
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
    title: "Eget upplÃ¤gg",
    goalPrimary: profile.goalPrimary,
    daysPerWeek: usablePasses.length,
    coachSummary:
      "Du har lagt in ett eget schema. Jag coachar progressionen ovanpÃ¥ det och sÃ¤ger till om nÃ¥got ser riskabelt ut.",
    planReason:
      "HÃ¤r fÃ¶ljer vi ditt upplÃ¤gg fÃ¶rst, men coachen hÃ¥ller koll pÃ¥ volym, progression och begrÃ¤nsningar.",
    structureReason:
      "Passen fÃ¶ljer den struktur du skrev in, sÃ¥ det blir lÃ¤tt att kÃ¤nna igen och fortsÃ¤tta med.",
    safetyNotes: profile.limitations?.trim()
      ? [`Jag tar hÃ¤nsyn till: ${profile.limitations.trim()}.`]
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
      intent: "Du bygger detta pass sjÃ¤lv. Coachen kan granska och hjÃ¤lpa till nÃ¤r Ã¶vningarna Ã¤r pÃ¥ plats.",
      exercises: [],
    })
  );

  return {
    title: "Eget upplÃ¤gg",
    goalPrimary: profile.goalPrimary,
    daysPerWeek: passes.length,
    coachSummary:
      "Du startar med tomma pass. LÃ¤gg in Ã¶vningar sjÃ¤lv, sÃ¥ hjÃ¤lper coachen dig att hÃ¥lla upplÃ¤gget rimligt.",
    planReason:
      "HÃ¤r styr du Ã¶vningsvalen. Coachen finns kvar som kvalitetskontroll.",
    structureReason:
      "Passen Ã¤r tomma tills du lÃ¤gger in Ã¶vningar. Det hÃ¤r Ã¤r rÃ¤tt start om du redan vet hur du vill trÃ¤na.",
    safetyNotes: profile.limitations?.trim()
      ? [`Jag tar hÃ¤nsyn till: ${profile.limitations.trim()}.`]
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
    .slice(0, 24);
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
    lowerName.includes("stÃ¥ng") ||
    lowerName.includes("stang") ||
    lowerName.includes("skivstÃ¥ng") ||
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
    equipment === "skivstÃ¥ng" ||
    equipment === "skivstang"
  );
}

function getExerciseWeightStep(exerciseName: string) {
  if (isBarbellWeightExercise(exerciseName)) return BARBELL_WEIGHT_STEP;
  return PROGRESSION_STEP;
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
    lower.includes("rumÃ¤nska") ||
    lower.includes("rumanska") ||
    lower.includes("deadlift");
  const isTechnicalSquat =
    lower.includes("knÃ¤bÃ¶j") ||
    lower.includes("knÃ¶bÃ¶j") ||
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
        "Tekniskt kÃ¤nslig basÃ¶vning: hellre kvalitet och rygg/ledsÃ¤kerhet Ã¤n fler maxreps.",
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
      riskNote: "Tung basÃ¶vning: backoff ska hÃ¥lla teknik och fart kvar.",
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
      riskNote: `${profile.category} / isolation: kontakt och kontroll gÃ¥r fÃ¶re last.`,
    };
  }

  return {
    type: "normal" as const,
    backoffAfterFailure: 0.94,
    backoffAfterHardSecondSet: 0.95,
    techniqueDrop: 0.9,
    painDrop: 0.82,
    maxHardSets: 3,
    riskNote: "Normal Ã¶vning: justera efter marginal och kvalitet.",
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
  exerciseName?: string; // ny (valfri sÃ¥ gammalt funkar)
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
    return "Fokus: stabil handled, kontrollerad sÃ¤nkning, inga studs.";
  }

  if (name.includes("rumÃ¤nska") || name.includes("rdl")) {
    return "Fokus: hÃ¶ften bak, ryggen lÃ¥st och ingen ful failure.";
  }

  if (name.includes("benspark")) {
    return "Fokus: paus i toppen och kontakt innan vi hÃ¶jer.";
  }

  if (name.includes("vad")) {
    return "Fokus: stretch i botten och paus i toppen.";
  }

  if (name.includes("biceps") || name.includes("curl")) {
    return "Fokus: ren curl, stilla armbÃ¥gar och ingen sving.";
  }

  if (name.includes("triceps") || name.includes("pushdown")) {
    return "Fokus: kontakt i triceps och smÃ¤rtfritt grepp.";
  }

  if (name.includes("knÃ¤bÃ¶j") || name.includes("squat")) {
    return "Fokus pÃ¥ kontroll hela vÃ¤gen och stabilitet i botten.";
  }

  if (name.includes("marklyft") || name.includes("deadlift")) {
    return "HÃ¥ll ryggen lÃ¥st och lyftet jÃ¤mnt frÃ¥n golvet.";
  }

  if (name.includes("bÃ¤nk") || name.includes("bench")) {
    return "TÃ¤nk kontroll genom hela pressen och hÃ¥ll banan jÃ¤mn.";
  }

  if (name.includes("rodd") || name.includes("row")) {
    return "HÃ¥ll tempot kontrollerat och fÃ¥ med ryggen i varje rep.";
  }

  if (name.includes("latsdrag") || name.includes("pulldown")) {
    return "Dra med kontroll och hÃ¥ll kontakt hela vÃ¤gen ner.";
  }

  if (name.includes("militÃ¤rpress") || name.includes("axelpress") || name.includes("overhead")) {
    return "HÃ¥ll kroppen stabil och pressa rakt genom hela rÃ¶relsen.";
  }

  return "Fokus pÃ¥ ren teknik och jÃ¤mn kontroll.";
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
      return "Du hÃ¶ll lÃ¤ngre Ã¤n fÃ¶rra setet.";
    }

    if (currentDuration < previousDuration && previousDuration > 0) {
      return "Tiden sjÃ¶nk lite efter jobbet innan.";
    }

    return "Samma tid som fÃ¶rra setet.";
  }

  if (weight === previousSet.weight && reps === previousSet.reps) {
    if (previousRir !== null) {
      if (rir > previousRir) {
        return "Det hÃ¤r sÃ¥g lÃ¤ttare ut Ã¤n fÃ¶rra setet.";
      }

      if (rir < previousRir) {
        return "Nu blev det tyngre Ã¤n fÃ¶rra setet.";
      }

      return "Samma nivÃ¥ som fÃ¶rra setet.";
    }

    return "Samma nivÃ¥ som fÃ¶rra setet.";
  }

  if (weight > previousSet.weight) {
    return "Du har gÃ¥tt upp i vikt jÃ¤mfÃ¶rt med fÃ¶rra setet.";
  }

  if (weight < previousSet.weight) {
    return "Du har backat lite i vikt jÃ¤mfÃ¶rt med fÃ¶rra setet.";
  }

  if (reps > previousSet.reps) {
    return "Fler reps Ã¤n i fÃ¶rra setet. Bra.";
  }

  if (reps < previousSet.reps) {
    return "Lite fÃ¤rre reps Ã¤n i fÃ¶rra setet.";
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
    return "Nu bÃ¶rjar det bli tungt genom Ã¶vningen.";
  }

  if (averagePreviousRir <= 1.5 && rir >= 2) {
    return "Bra Ã¥terhÃ¤mtat set. Du hÃ¥ller ihop det fint.";
  }

  if (averagePreviousRir >= 2 && rir >= 2) {
    return "Seten ser jÃ¤mna ut.";
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
    return "Du bÃ¶rjar bli rÃ¤tt sliten genom passet nu.";
  }

  if (averageRir <= 1.75) {
    return "AnstrÃ¤ngningen bÃ¶rjar mÃ¤rkas nu, sÃ¥ hÃ¥ll tekniken ren.";
  }

  if (averageRir >= 2.5) {
    return "Du hÃ¥ller energin bra genom passet.";
  }

  return "";
}
function getGoalTone(goalPrimary: UserProfile["goalPrimary"]) {
  if (goalPrimary === "styrka") {
    return {
      rir2: "Bra kvalitet. HÃ¥ll det rent.",
      cueStyle: "Fokus pÃ¥ stark och ren teknik.",
    };
  }

  if (goalPrimary === "muskel") {
    return {
      rir2: "Bra stimulans. HÃ¥ll kontrollen hÃ¶g.",
      cueStyle: "Fokus pÃ¥ kontakt och jÃ¤mn kontroll.",
    };
  }

  return {
    rir2: "Bra arbete. HÃ¥ll jÃ¤mn nivÃ¥ och ren teknik.",
    cueStyle: "Fokus pÃ¥ tempo, kontroll och disciplin.",
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
    lower.includes("lÃ¥rcurl") ||
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
    lower.includes("knÃ¤bÃ¶j") ||
    lower.includes("knÃ¶bÃ¶j") ||
    lower.includes("squat") ||
    lower.includes("benpress") ||
    lower.includes("bÃ¤nk") ||
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
    fail.includes("smÃ¤rta") ||
    fail.includes("kÃ¤nning") ||
    fail.includes("skarp") ||
    fail.includes("axel") ||
    fail.includes("rygg") ||
    fail.includes("hÃ¶ft") ||
    fail.includes("knÃ¤");
  const restText = "60-90 sek.";
  const techniqueCue = getExerciseCue(exerciseName);
  const plannedSetCount = Math.max(1, args.plannedSetCount ?? 3);

  if (hasPainIssue) {
    return {
      weight: args.weight,
      repsText: "gÃ¥ vidare",
      repsInput: 0,
      rirText: "",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason:
        "SmÃ¤rta gÃ¥r fÃ¶re tiden. Vi lÃ¤mnar Ã¶vningen eller vÃ¤ljer en smÃ¤rtfri variant.",
    } satisfies NextSetPlan;
  }

  if (args.setNumber >= plannedSetCount) {
    return {
      weight: args.weight,
      repsText: "gÃ¥ vidare",
      repsInput: 0,
      rirText: "",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason:
        "Vi har fÃ¥tt den tidskvalitet vi behÃ¶ver hÃ¤r. NÃ¤sta Ã¶vning nu.",
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
    reason: "Tiden Ã¤r loggad. Vi hÃ¥ller nÃ¤sta set enkelt och kontrollerat.",
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
    "Schemat har ett extraset hÃ¤r. Vi sÃ¤nker lite sÃ¥ avslutet blir rent och faktiskt ger nÃ¥got.";
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
    fail.includes("smÃ¤rta") ||
    fail.includes("kÃ¤nning") ||
    fail.includes("skarp") ||
    fail.includes("axel") ||
    fail.includes("armbÃ¥ge") ||
    fail.includes("handled") ||
    fail.includes("rygg") ||
    fail.includes("knÃ¤");

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
        "Det fanns mer kvar, men repsen blev lite lÃ¥ga. Vi slÃ¤nger in ett set till hÃ¤r och fÃ¶rsÃ¶ker nÃ¥ repsspannet.",
    } satisfies NextSetPlan;
  }

  if (fail) {
    if (hasPainIssue) {
      return {
        weight,
        repsText: "gÃ¥ vidare",
        repsInput: reps,
        rirText: "",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          "SmÃ¤rta gÃ¥r fÃ¶re planen. Vi lÃ¤mnar Ã¶vningen eller vÃ¤ljer en helt smÃ¤rtfri variant.",
      } satisfies NextSetPlan;
    }

    if (fail.includes("grepp") && shouldCompleteExercise) {
      return {
        weight,
        repsText: "gÃ¥ vidare",
        repsInput: reps,
        rirText: "",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          "Greppet tog stopp, inte ryggen. Bra, dÃ¥ Ã¤r Ã¶vningen klar hÃ¤r. Om det hÃ¤nder igen byter vi grepp eller sÃ¤nker ett steg nÃ¤sta gÃ¥ng.",
      } satisfies NextSetPlan;
    }

    if (shouldCompleteExercise) {
      return {
        weight,
        repsText: "gÃ¥ vidare",
        repsInput: reps,
        rirText: "",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason: "Ã–vningen Ã¤r klar hÃ¤r. Vi tar nÃ¤sta nÃ¤r du Ã¤r redo.",
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
        reason: "Tekniken var inte dÃ¤r. Vi sÃ¤nker lite sÃ¥ nÃ¤sta set blir renare.",
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
        reason: "Greppet gav upp, inte hela lyftet. Vi hÃ¥ller vikten men jagar inte extra reps.",
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
        : "Det tog stopp. Vi sÃ¤nker lite och jagar inte fler maxreps hÃ¤r.",
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
        "Det fanns mer kvar. Vi hÃ¥ller vikten och fÃ¶rsÃ¶ker ta oss upp i repsspannet innan vi Ã¤ndrar belastningen.",
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
        "Du var precis vid arbetsomrÃ¥det och marginalen var lÃ¥g. Vi hÃ¥ller vikten och fÃ¶rsÃ¶ker fÃ¥ ett likadant eller lite bÃ¤ttre set.",
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
        : "Repsen hamnade fÃ¶r lÃ¥gt fÃ¶r mÃ¥let. Vi backar vikten och bygger ett bÃ¤ttre arbetsset.",
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
        "Repsen stack ivÃ¤g trots lÃ¥g marginal. Vikten gÃ¶r jobbet, men nÃ¤sta set fÃ¥r ligga ett steg tyngre sÃ¥ vi hamnar i ett bÃ¤ttre arbetsomrÃ¥de.",
    } satisfies NextSetPlan;
  }

  if (rir <= 0) {
    if (shouldCompleteExercise) {
      return {
        weight,
        repsText: "gÃ¥ vidare",
        repsInput: reps,
        rirText: "",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          decisionProfile.type === "technical-heavy"
            ? "Det rÃ¤cker fÃ¶r den hÃ¤r Ã¶vningen idag. Vi skyddar tekniken och gÃ¥r vidare."
            : "Det rÃ¤cker fÃ¶r den hÃ¤r Ã¶vningen idag. Vi gÃ¥r vidare.",
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
          ? "Det var ett hÃ¥rt set. Jag tycker vi sÃ¤nker lite sÃ¥ nÃ¤sta set ocksÃ¥ blir rent."
          : isIsolation
          ? "Det var ett hÃ¥rt set. Jag tycker vi sÃ¤nker lite sÃ¥ vi fÃ¥r ett bra set till."
          : "Det var ett hÃ¥rt set. Jag tycker vi sÃ¤nker lite sÃ¥ nÃ¤sta set ocksÃ¥ blir bra.",
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
        : "Samma vikt och reps krÃ¤vde mer nu. Jag tycker vi sÃ¤nker lite sÃ¥ nÃ¤sta set blir lika trÃ¤ffsÃ¤kert.",
    } satisfies NextSetPlan;
  }

  if (sameWeightTrend.tooEasy) {
    if (shouldCompleteExercise) {
      return {
        weight,
        repsText: "gÃ¥ vidare",
        repsInput: reps,
        rirText: "",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "complete",
        reason:
          "Samma vikt gav fler reps med marginal kvar. Den var fÃ¶r lÃ¤tt idag; nÃ¤sta gÃ¥ng Ã¶ppnar vi hÃ¶gre.",
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
        "Samma vikt gav fler reps med marginal kvar. Vi hÃ¶jer ett steg och gÃ¶r jobbet pÃ¥ rÃ¤tt nivÃ¥.",
    } satisfies NextSetPlan;
  }

  if (shouldCompleteExercise && rir <= 2) {
    return {
      weight,
      repsText: "gÃ¥ vidare",
      repsInput: reps,
      rirText: "",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "complete",
      reason: "Den hÃ¤r Ã¶vningen Ã¤r klar. Vi gÃ¥r vidare.",
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
        ? "Samma vikt, reps och marginal igen. Det Ã¤r stabilt, sÃ¥ vi hÃ¥ller nivÃ¥n."
        : activePlannedExtraSet
        ? plannedExtraSetReason
        : isBackoff
        ? "Nu tar vi ett lÃ¤ttare set och fÃ¥r mer bra arbete ur Ã¶vningen."
        : "Vi hÃ¥ller vikten och lÃ¥ter nÃ¤sta set bekrÃ¤fta nivÃ¥n.",
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
        : "Den nivÃ¥n sitter. Vi tar samma vikt en gÃ¥ng till.",
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
    reason: "Vi hÃ¶jer lite. Du har mer att ge hÃ¤r.",
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
            "Setet gav nog marginal fÃ¶r att appen ska fÃ¶reslÃ¥ ett steg upp.",
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
      failText.includes("smÃ¤rta") ||
      failText.includes("kÃ¤nning"));
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
      if (failText.includes("ont") || failText.includes("smÃ¤rta")) return "pain_stop";
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
      if (exerciseCategory === "rygg") return "Okej, ryggen Ã¤r med pÃ¥ riktigt idag! ðŸš€";
      if (exerciseCategory === "ben") return "Okej, benen Ã¤r med pÃ¥ riktigt idag! ðŸš€";
      if (exerciseCategory === "bröst" || exerciseCategory === "axlar") {
        return "Okej, pressen sitter pÃ¥ riktigt idag! ðŸš€";
      }

      return "Okej, det hÃ¤r Ã¤r en stark trÃ¤ningsdag! ðŸš€";
    }
    if (setNumber === 2) return "VÃ¤nta lite. Ã„nnu ett personbÃ¤sta! ðŸ”¥";
    return rir >= 2 ? "Oj. Nu snackar vi! ðŸ”¥" : "Nu snackar vi!";
  }

  if (repsUpSameWeight) return setNumber <= 2 ? "DÃ¤r satt den!" : "Snyggt. Den repen ville vi ha.";
  if (sameRepsMoreMargin) return "Den dÃ¤r gillar jag.";
  if (clearProgression) return "Bra. Riktigt bra.";
  return setNumber === 1 ? "Bra start." : "Bra jobbat dÃ¤r.";
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
      ? `Ã„nnu ett personbÃ¤sta i samma Ã¶vning, och fortfarande ${marginText}.`
      : "Ã„nnu ett tungt personbÃ¤sta i samma Ã¶vning. Nu rÃ¤cker det hÃ¤r.";
  }

  if (priorHardSets >= 1 || setNumber === 2) {
    return rir > 0
      ? `Och du hade fortfarande ${marginText}. Den gamla nivÃ¥n var fÃ¶r lÃ¥g idag.`
      : "Den gamla nivÃ¥n var fÃ¶r lÃ¥g idag. Nu har vi hittat taket.";
  }

  return rir > 0 ? `Och du hade ${marginText}.` : "";
}

function getPersonalBestPayoff(
  setNumber: number,
  previousSets: { weight: number; reps: number; rir?: number }[]
) {
  if (previousSets.length >= 2 || setNumber >= 3) {
    return "Vi stÃ¤nger den hÃ¤r Ã¶vningen med stil.";
  }

  if (setNumber === 2) return "Det dÃ¤r Ã¤r riktig progression.";
  return "Det dÃ¤r Ã¤r exakt sÃ¥nt jag vill se.";
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
            "Snyggt. DÃ¤r har vi tidsjobbet.",
            `${currentText} Ã¤r loggat.`,
            `${exerciseName} Ã¤r klar fÃ¶r idag. GÃ¥ vidare nÃ¤r du Ã¤r redo.`,
          ]
        : [
            setNumber === 1
              ? "Bra start. Nu har vi en tydlig tidsnivÃ¥."
              : "Snyggt. Tiden Ã¤r inne och vi bygger vidare.",
            `${currentText} Ã¤r loggat.`,
            `NÃ¤sta: ${nextSetPlan.repsText}. ${nextTechniqueCue}`,
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
  const isNewPersonalBest = personalRecordText?.startsWith("Nytt personbÃ¤sta");
  const specificObservation = (() => {
    if (!hasPreviousSet) {
      if (rir >= 3) return "Du hade mycket kvar. Det sÃ¤ger att nivÃ¥n Ã¤r fÃ¶r lÃ¥g idag.";
      if (rir === 2) return "Du Ã¶ppnade kontrollerat och gav oss bra marginal.";
      if (rir === 1) return "En rep kvar pÃ¥ fÃ¶rsta setet.";
      return "Ingen rep kvar pÃ¥ fÃ¶rsta setet. DÃ¥ backar vi lite.";
    }

    if (repsUpSameWeight) {
      return `Du tog ${reps - previousSet!.reps} rep mer pÃ¥ samma vikt.`;
    }

    if (sameRepsMoreMargin) {
      return "Samma reps som fÃ¶rra setet, men med mer kvar.";
    }

    if (weightUpFromPrevious) {
      return `Du gick upp till ${weight} kg och fick ${reps} reps.`;
    }

    if (heldWeightUnderFatigue) {
      return `Du hÃ¶ll nÃ¤stan samma reps trots mindre marginal.`;
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
      return "Det dÃ¤r var nÃ¤ra grÃ¤nsen efter jobbet innan.";
    }

    if (hasPreviousSet && weight === previousSet.weight && reps === previousSet.reps) {
      if (previousRir !== null && rir < previousRir) {
        return "Samma reps, men med mindre kvar.";
      }

      return "Du lÃ¥g kvar pÃ¥ samma nivÃ¥ som fÃ¶rra setet.";
    }

    if (hasPreviousSet && weight < previousSet.weight) {
      if (reps >= previousSet.reps) {
        return "Du sÃ¤nkte vikten och hÃ¶ll repsen.";
      }

      return "Bra. Du tog ner vikten och hÃ¶ll kvaliteten efter det tunga jobbet.";
    }

    if (hasPreviousSet && reps < previousSet.reps) {
      if (plannedRepDropHit) {
        return "Du trÃ¤ffade repsmÃ¥let med marginal kvar. Bra utfÃ¶rt.";
      }

      return "Repsen sjÃ¶nk lite efter tidigare arbete.";
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
            ? `${formatLoggedSetText({ exerciseName, weight, reps, durationSeconds, metricType })} Ã¤r nytt personbÃ¤sta i ${exerciseName}.`
            : "",
          isNewPersonalBest
            ? getPersonalBestMeaning({ setNumber, rir, marginText, previousSets })
            : "",
          clearProgression ? specificObservation : "",
          clearProgression || isNewPersonalBest
            ? rir <= 1
              ? "Det dÃ¤r var starkt gjort."
              : isNewPersonalBest
              ? getPersonalBestPayoff(setNumber, previousSets)
              : "Det dÃ¤r Ã¤r exakt sÃ¥nt jag vill se."
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
      ? "Konditionen innan kan pÃ¥verka trycket idag."
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
        "Den var fÃ¶r lÃ¤tt idag.",
        "NÃ¤sta gÃ¥ng Ã¶ppnar vi hÃ¶gre.",
      ]);
    }

    if (hasPayoff) {
      return coachResponse([
        `${exerciseName} Ã¤r klar fÃ¶r idag.`,
        "Tryck NÃ¤sta Ã¶vning nÃ¤r du Ã¤r redo.",
      ]);
    }

    if (fail || rir <= 0) {
      return coachResponse([
        "Bra jobbat. Vi lÃ¤mnar den hÃ¤r Ã¶vningen hÃ¤r.",
        currentText,
        hasPreviousSet
          ? "Du fick ut det vi behÃ¶vde utan att pressa vidare i onÃ¶dan."
          : "Det rÃ¤cker fÃ¶r idag.",
        `${exerciseName} Ã¤r klar fÃ¶r idag.`,
        "Tryck NÃ¤sta Ã¶vning nÃ¤r du Ã¤r redo.",
      ]);
    }

    return coachResponse([
      "Snyggt. Den hÃ¤r Ã¶vningen Ã¤r klar fÃ¶r idag.",
      currentText,
      nextSetPlan.reason,
      "Tryck NÃ¤sta Ã¶vning nÃ¤r du Ã¤r redo.",
    ]);
  }

  if (fail) {
    if (fail.includes("grepp")) {
      return coachResponse([
        `DÃ¤r bÃ¶rjade greppet ge upp: ${currentText}.`,
        "",
        nextSetPlan.reason,
        "",
        "NÃ¤sta set:",
        nextSetWeightText,
        `sikta pÃ¥ ${nextSetRepRange}`,
        `${nextSetRirText}.`,
        nextTechniqueCue,
        `Vila ${restTime}.`,
      ]);
    }

    if (fail.includes("ont") || fail.includes("smÃ¤rta")) {
      return coachResponse([
        "Okej, vi avbryter den Ã¶vningen.",
        "",
        "Nu:",
        currentText,
        "",
        getPainCoachContextText(warmupContext),
      ]);
    }

    return coachResponse([
      `DÃ¤r tog det stopp: ${currentText}.`,
      "",
      hasPreviousSet
        ? "Det Ã¤r trÃ¶tthet frÃ¥n arbetet innan. Vi jagar inte igenom det."
        : "DÃ¥ har vi dagens tak hÃ¤r.",
      nextSetPlan.reason,
      "",
      "NÃ¤sta set:",
      nextSetWeightText,
      `sikta pÃ¥ ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  if (rir >= 3) {
    if (isNewPersonalBest) {
      return coachResponse([
        `PersonbÃ¤sta med ${marginText}. Det Ã¤r starkt.`,
        "",
        nextSetPlan.reason,
        "",
        "NÃ¤sta set:",
        nextSetWeightText,
        `sikta pÃ¥ ${nextSetRepRange}`,
        `${nextSetRirText}.`,
        nextTechniqueCue,
        "",
        `Vila ${restTime}.`,
      ]);
    }

    return coachResponse([
      rir >= 4 ? "Bra jobbat! Det dÃ¤r var starkt ðŸ”¥" : "Bra jobbat. Det dÃ¤r satt fint.",
      currentText,
      nextSetPlan.reason,
      "",
      "NÃ¤sta set:",
      nextSetWeightText,
      `sikta pÃ¥ ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  if (rir === 2) {
    if (hasPayoff) {
      return coachResponse([
        "",
        "NÃ¤sta set:",
        nextSetWeightText,
        `sikta pÃ¥ ${nextSetRepRange}`,
        `${nextSetRirText}.`,
        nextTechniqueCue,
        `Vila ${restTime}.`,
      ]);
    }

    return coachResponse([
      setNumber === 1
        ? rir === 2
          ? "Bra start. Det dÃ¤r var en trygg Ã¶ppning."
          : "Bra Ã¶ppning."
        : hasPreviousSet && reps < previousSet!.reps
        ? "Bra. Det dÃ¤r var precis uppgiften."
        : "Bra jobbat dÃ¤r.",
      currentText,
      hasPreviousSet && reps < previousSet!.reps
        ? "Du hÃ¶ll kvaliteten Ã¤ven nÃ¤r repsen sjÃ¶nk lite."
        : bodyObservation,
      hasPreviousSet && reps < previousSet!.reps
        ? `${nextSetWeightText} igen. Samma fokus.`
        : nextSetPlan.reason,
      "",
      "NÃ¤sta set:",
      nextSetWeightText,
      `sikta pÃ¥ ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  if (rir === 1) {
    if (hasPayoff) {
      return coachResponse([
        "",
        "NÃ¤sta set:",
        nextSetWeightText,
        `sikta pÃ¥ ${nextSetRepRange}`,
        `${nextSetRirText}.`,
        nextTechniqueCue,
        `Vila ${restTime}.`,
      ]);
    }

    return coachResponse([
      payoffLines.length > 0
        ? ""
        : setNumber === 1
        ? "Starkt fÃ¶rsta set."
        : nextSetPlan.strategy === "backoff"
        ? "Snyggt. Du hÃ¶ll ihop det efter det tunga jobbet."
        : "Bra tryck dÃ¤r!",
      "",
      currentText,
      bodyObservation,
      nextSetPlan.reason,
      "",
      "NÃ¤sta set:",
      nextSetWeightText,
      `sikta pÃ¥ ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  if (rir === 0) {
    return coachResponse([
      "Bra. Det dÃ¤r var ett hÃ¥rt set.",
      currentText,
      hasPreviousSet
        ? "Det Ã¤r bra stimulans efter seten innan, inte ett tecken pÃ¥ slarv."
        : bodyObservation,
      nextSetPlan.reason,
      "",
      "NÃ¤sta set:",
      nextSetWeightText,
      `sikta pÃ¥ ${nextSetRepRange}`,
      `${nextSetRirText}.`,
      nextTechniqueCue,
      `Vila ${restTime}.`,
    ]);
  }

  return coachResponse([
    "Bra jobbat dÃ¤r.",
    currentText,
    bodyObservation,
    nextSetPlan.reason,
    "",
    "NÃ¤sta set:",
    nextSetWeightText,
    `sikta pÃ¥ ${nextSetRepRange}`,
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
    return `Vi hoppar Ã¶ver ${removedExercises[0]} idag.`;
  }

  if (removedExercises.length === 2) {
    return `Vi hoppar Ã¶ver ${removedExercises[0]} och ${removedExercises[1]} idag.`;
  }

  return `Vi hoppar Ã¶ver nÃ¥gra Ã¶vningar idag.`;
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
    return "Jag minns att greppet begrÃ¤nsade dig hÃ¤r sist. Vi bÃ¶rjar pÃ¥ samma vikt och ser om det hÃ¥ller lÃ¤ngre.";
  }

  if (text.includes("tekniken")) {
    return "Jag minns att tekniken brast hÃ¤r sist. Om det kÃ¤nns likadant vill jag att du sÃ¤ger till direkt.";
  }

  if (text.includes("smÃ¤rta") || text.includes("kÃ¤nning")) {
    return "Jag minns att du kÃ¤nde av den hÃ¤r Ã¶vningen sist. SÃ¤g till direkt om det kommer tillbaka.";
  }

  if (text.includes("grÃ¤nsen i muskeln")) {
    return "Jag minns att du nÃ¥dde grÃ¤nsen hÃ¤r sist. FÃ¶rsta setet visar hur nÃ¤ra vi ska gÃ¥ idag.";
  }

  return "Jag minns att det blev tufft hÃ¤r sist. FÃ¶rsta setet visar oss var vi ligger idag.";
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
  const [gym, setGym] = useState<string>("SjÃ¶viksgymmet");
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


  // PÃ¥gÃ¥ende pass
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [skippedExercise, setSkippedExercise] = useState<SkippedExercise | null>(null);


const [dayForm, setDayForm] = useState<DayForm | null>(null);


  // Inputs fÃ¶r set
  const [weightInput, setWeightInput] = useState<string>("");
  const systemSuggestedWeightRef = useRef<number | undefined>(undefined);
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
  // FYLL FORMULÃ„R FRÃ…N PROFIL
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
    displayName: fallback?.displayName ?? workout?.displayName ?? "PersonbÃ¤sta",
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
    displayName: workout?.displayName ?? "PersonbÃ¤sta",
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
  const diff = day === 0 ? 6 : day - 1; // mÃ¥ndag som start
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
      note: "FÃ¶rsta setet visar oss var vi ligger.",
      reason: "Ingen Ã¶vning vald.",
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
      reason: "Ingen historik Ã¤n. FÃ¶rsta setet visar nivÃ¥n.",
    };
  }

  if (last.rir === 0) {
    return {
      targetWeight: Math.max(0, last.weight - 2.5),
      reason: "Senast nÃ¥dde du failure. Vi bÃ¶rjar lite lÃ¤ttare.",
    };
  }

    if (typeof last.rir === "number" && last.rir >= 3 && last.reps >= targetReps) {
    return {
      targetWeight: getNextAvailableWeight(last.weight, currentExerciseName, "up"),
      reason: "Senast hade du marginal kvar. Du kan testa att hÃ¶ja.",
    };
  }

    if ((last.rir === 1 || last.rir === 2) && last.reps >= targetReps) {
    return {
      targetWeight: last.weight,
      reason: "Senast lÃ¥g du nÃ¤ra rÃ¤tt marginal. Vi hÃ¥ller vikten.",
    };
  }

  return {
    targetWeight: last.weight,
    reason: "UtgÃ¥ frÃ¥n samma vikt som senast.",
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
    : "ingen data Ã¤n";

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

// NÃ¤r du byter Ã¶vning: fyll i senaste vikt/reps om det finns
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

// Fyll direkt fÃ¶rsta Ã¶vningens fÃ¶rslag
exerciseInputKeyRef.current = firstExerciseName ? exerciseKey(firstExerciseName) : "";
const firstExerciseWeight = firstExerciseName && !isBodyweightExercise(firstExerciseName)
  ? firstExercisePlan?.weight ?? ""
  : "";
setWeightInput(firstExerciseWeight);
systemSuggestedWeightRef.current = firstExerciseWeight ? parseFloat(firstExerciseWeight) || undefined : undefined;
setRepsInput(firstExercisePlan?.reps ?? String(goalTargets.targetReps));
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
    "Jag hÃ¶r dig.",
    "Okej.",
    "Jag fattar.",
  ]);
}

function coachDealText() {
  return pickOne([
    "FÃ¶rsta setet visar nivÃ¥n.",
    "FÃ¶rsta setet visar nivÃ¥n.",
    "Vi lÃ¥ter fÃ¶rsta setet bestÃ¤mma.",
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
        "lÃ¤gg till",
        "lÃ¤gg in",
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

  // LÃ¤gg in ditt meddelande
  setChatLog((prev) => [...prev, { role: "you", text: msg }]);
  setChatInput("");
  setCoachPendingReply(true);

  const reply = (text: string, aiStatus?: "fallback") => {
    setCoachPendingReply(false);
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
                    reason: "Ã–vningen Ã¤r klar. Prata om nÃ¤sta gÃ¥ng eller nÃ¤sta Ã¶vning, inte nÃ¤sta set.",
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
      "kÃ¶r en till",
      "en till",
      "fortsatt",
      "fortsÃ¤tt",
      "testar igen",
    ])
  ) {
    reply(
      "Jag vill inte att du pressar den hÃ¤r vidare om det gÃ¶r ont. Det Ã¤r inte fegt att lÃ¤mna en Ã¶vning. Tryck Hoppa Ã¶ver, sÃ¥ fortsÃ¤tter vi med nÃ¥got som kÃ¤nns bÃ¤ttre."
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
                note: `Avslutades efter smÃ¤rta/kÃ¤nning: ${msg}`,
                setCount: painExercise.sets.length,
              }
            );
          });

          if (targetIndex === exerciseIndex) {
            resetWorkoutInputs();
          }

          reply(
            `Okej. DÃ¥ stÃ¤nger vi ${painExercise.name} hÃ¤r. Du har redan fÃ¥tt in jobbet, och smÃ¤rta gÃ¥r fÃ¶re planen. GÃ¥ vidare nÃ¤r du Ã¤r redo.`
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
      reply("Okej. Vilken Ã¶vning gÃ¤ller det?");
      return;
    }

    const targetExercise = workout.exercises[routedIntent.targetIndex];
    const suggestion = suggestReplacementFor(targetExercise.name);
    if (suggestion) {
      setSwapFrom(targetExercise.name);
      setSwapToInput(suggestion);
      reply(
        `Okej. DÃ¥ lÃ¶ser vi det.\n\n${targetExercise.name} funkar inte nu. Jag fÃ¶reslÃ¥r ${suggestion} istÃ¤llet. Skriv ja om du vill byta.`
      );
      return;
    }

    setSwapFrom(null);
    setSwapToInput("");
    reply(
      `Okej. DÃ¥ lÃ¤mnar vi ${targetExercise.name} just nu.\n\nJag hittar ingen sjÃ¤lvklar ersÃ¤ttare hÃ¤r. Skriv vilken Ã¶vning du vill ta istÃ¤llet, eller gÃ¥ vidare.`
    );
    return;
  }

  if (routedIntent.topic === "addExercise") {
    if (workout && routedIntent.addExerciseName) {
      addExerciseToCurrentWorkout(routedIntent.addExerciseName);
      setCoachPendingReply(false);
      return;
    }

    reply("Vilken Ã¶vning vill du lÃ¤gga till?");
    return;
  }

  if (routedIntent.topic === "swap") {
    if (routedIntent.swapFrom && routedIntent.swapTo) {
      setSwapFrom(routedIntent.swapFrom);
      setSwapToInput(routedIntent.swapTo);
      reply(
        `Jag kan byta ${routedIntent.swapFrom} mot ${routedIntent.swapTo}. BekrÃ¤fta om du vill gÃ¶ra bytet.`
      );
      return;
    }

    reply("Vilken Ã¶vning vill du byta ut?");
    return;
  }

  if (routedIntent.topic === "skip") {
    if (workout && routedIntent.targetIndex !== null) {
      const targetExercise = workout.exercises[routedIntent.targetIndex];
      reply(
        `${targetExercise.name} kan vi lÃ¤mna idag. Tryck Hoppa Ã¶ver om du vill gÃ¶ra det.`
      );
      return;
    }

    reply("Vilken Ã¶vning vill du hoppa Ã¶ver?");
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
        text: `Menar du ${resolved.suggestion}? Jag har fyllt i det namnet. Tryck plus igen om det stÃ¤mmer.`,
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
        text: "Vad trÃ¤nar den frÃ¤mst? Skriv till exempel egen ben:, egen rygg: eller egen armar:. Jag fyllde i ben som exempel.",
      },
    ]);
    return;
  }

  if (resolved.status === "unknown") {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: "Jag Ã¤r osÃ¤ker pÃ¥ vilken Ã¶vning du menar. Skriv gÃ¤rna det vanligaste namnet, eller bÃ¶rja med egen: om du vill lÃ¤gga in den exakt sÃ¥.",
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
      text: `Bra, vi lÃ¤gger till ${name}.`,
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
          ? "Ã–vningen var pÃ¥bÃ¶rjad och ersattes under passet."
          : "Ã–vningen byttes innan den loggades.",
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
      text: resetLoggedExercise
        ? `Bra, vi kÃ¶r ${replacementName} istÃ¤llet. Jag sparar ${fromName} som avslutad sÃ¥ loggen blir rÃ¤tt.`
        : `Bra, vi kÃ¶r ${replacementName} istÃ¤llet.`,
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
        text: "Du har redan loggat set hÃ¤r. Vi lÃ¤mnar den kvar.",
      },
    ]);
    return;
  }

  if (workout.exercises.length <= 1) {
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: "Det hÃ¤r Ã¤r sista Ã¶vningen. LÃ¤gg till en ersÃ¤ttning fÃ¶rst.",
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
        text: coachText ?? `Okej, vi hoppar Ã¶ver ${exercise.name}.`,
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
      text: `${skippedExercise.exercise.name} Ã¤r tillbaka.`,
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
    text: `${exerciseName}: anvÃ¤ndaren kÃ¤nde smÃ¤rta/kÃ¤nning. ${note}`,
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
// Om passet redan pÃ¥gÃ¥r: uppdatera workout.exercises ocksÃ¥
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
  if (key.includes("knÃ¤bÃ¶j") || key.includes("knÃ¶bÃ¶j")) {
    fallbackCandidates.push("Benpress");
  }
  if (key.includes("bÃ¤nkpress")) fallbackCandidates.push("Hantelpress");
  if (key.includes("militÃ¤rpress")) fallbackCandidates.push("Hantelpress (axlar)");
  if (key.includes("latsdrag")) fallbackCandidates.push("Chins (assisterade)");
  if (key.includes("benspark")) fallbackCandidates.push("Goblet squat");
  if (key.includes("vadpress")) fallbackCandidates.push("TÃ¥hÃ¤vningar med hantlar");
  if (key.includes("sidolyft")) fallbackCandidates.push("Kabellyft Ã¥t sidan");
  if (key.includes("rodd")) {
    fallbackCandidates.push("Hantelrodd", "Maskinrodd", "SkivstÃ¥ngsrodd", "Bandrodd");
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
    /(?:byt|byta ut|ersatt|ersatta|ersÃ¤tt|ersÃ¤tta)\s+(.+?)\s+(?:mot|till|med)\s+(.+)/
  );
  const preferMatch = normalized.match(/hellre\s+(.+?)\s+(?:an|Ã¤n)\s+(.+)/);
  const match = swapMatch
    ? { fromRaw: swapMatch[1], toRaw: swapMatch[2] }
    : preferMatch
    ? { fromRaw: preferMatch[2], toRaw: preferMatch[1] }
    : null;

  if (!match) return null;

  const clean = (value: string) =>
    cleanProgramExerciseRequest(
      value.split(/\b(?:tack|snÃ¤lla|snalla|istallet|istÃ¤llet|i stallet|i stÃ¤llet)\b/i)[0]
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
      /\b(?:frÃ¥n|fran|i|ur|pÃ¥|pa)\s+(?:helkropp|Ã¶verkropp|overkropp|underkropp|ben|armar|passet|pass|upplÃ¤gget|upplagget|schemat)\b/i
    )[0]
    .split(/\b(?:tack|snÃ¤lla|snalla)\b/i)[0]
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
      ? "Klart. Jag har lagt in Ã¤ndringen i upplÃ¤gget."
      : "Jag kunde inte lÃ¤gga in det automatiskt. Skriv gÃ¤rna lite mer exakt vad du vill Ã¤ndra."
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
  const trains = info.trains ? `Den trÃ¤nar ${info.trains}.` : "";
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
    ? `${firstExercise} lÃ¥g dÃ¤r av en anledning. ${explanation} Om du inte gillar den fÃ¶reslÃ¥r jag att vi byter till ${firstReplacement}.`
    : `${firstExercise} lÃ¥g dÃ¤r av en anledning. ${explanation} Om du inte vill ha den fÃ¶reslÃ¥r jag att vi tar bort den.`;

  return queueProgramSuggestion(summary || fallbackSummary, actions);
}

function buildReplaceOrRemoveSummary(action: CoachProgramSuggestionAction) {
  if (action.type === "replace_exercise") {
    const explanation = buildExerciseWhyText(action.fromExerciseName);
    return `${action.fromExerciseName} lÃ¥g dÃ¤r av en anledning. ${explanation} Jag fÃ¶reslÃ¥r att vi byter till ${action.toExerciseName}.`;
  }

  if (action.type === "remove_exercise") {
    const explanation = buildExerciseWhyText(action.exerciseName);
    return `${action.exerciseName} lÃ¥g dÃ¤r av en anledning. ${explanation} Jag fÃ¶reslÃ¥r att vi tar bort den.`;
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
    key.includes("brÃ¶st") ||
    key.includes("axelpress") ||
    key.includes("hantelpress") ||
    key.includes("bÃ¤nkpress") ||
    key.includes("bankpress") ||
    key.includes("brÃ¶stpress") ||
    key.includes("brostpress") ||
    key.includes("militÃ¤rpress") ||
    key.includes("militarpress") ||
    key.includes("dips") ||
    key.includes("armhav") ||
    key.includes("armhÃ¤v")
  );
}

async function applyProgramPreference(preferenceRaw: string) {
  const preference = preferenceRaw.trim();
  const lower = preference.toLowerCase();

  if (!preference || !workoutPlan) return "";

  const isAffirmativeReply =
    /^(ja|japp|yes|okej|ok|absolut|gÃ¶r det|gor det|kÃ¶r|kor|ta bort dem|ta bort)$/i.test(
      lower
    );

  if (isAffirmativeReply && pendingProgramSuggestion) {
    applyPendingProgramSuggestion();
    return "Klart. Jag har lagt in Ã¤ndringen i upplÃ¤gget.";
  }

  if (
    isAffirmativeReply &&
    programPreferenceReply &&
    /(?:ta bort|plocka bort|skippa|undvik|undvika)/i.test(programPreferenceReply) &&
    /(?:brÃ¶st|brost|pec|press|axelpress)/i.test(programPreferenceReply)
  ) {
    const removed = removeExercisesFromProgram(isChestStressProgramExercise);
    const removedNames = removed.flatMap((entry) => entry.removed);

    return removedNames.length > 0
      ? `Klart. Jag tar bort ${removedNames.join(", ")} ur upplÃ¤gget. BrÃ¶stsmÃ¤rta gÃ¥r fÃ¶re planen.`
      : "Jag hittar inga brÃ¶st- eller pressÃ¶vningar kvar att ta bort. BrÃ¶stsmÃ¤rta gÃ¥r fÃ¶re planen.";
  }

  setPendingProgramSuggestion(null);

  if (
    userProfile &&
    (/\b(dag|pass)\s*[1-7a-g]\s*:?\s*/i.test(preference) ||
      lower.includes("eget upplÃ¤gg") ||
      lower.includes("eget schema"))
  ) {
    const manualPlan = parseManualWorkoutPlan(preference, userProfile);

    if (!manualPlan) {
      return 'Jag ser att du vill lÃ¤gga in ett eget upplÃ¤gg. Skriv gÃ¤rna sÃ¥ hÃ¤r: "Dag 1: bÃ¤nkpress, hantelpress. Dag 2: latsdrag, rodd."';
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

    return `Absolut. Jag har lagt in ditt eget upplÃ¤gg: ${manualPlan.passes.length} pass och ${exerciseCount} Ã¶vningar. Jag hÃ¥ller koll pÃ¥ progressionen ovanpÃ¥ det.`;
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
    lower.includes("vill inte kÃ¶ra") ||
    lower.includes("ta bort") ||
    lower.includes("plocka bort") ||
    lower.includes("radera") ||
    lower.includes("skippa");
  const wantsAddExercise =
    lower.includes("lÃ¤gg till") ||
    lower.includes("lÃ¤gga till") ||
    lower.includes("ta med") ||
    lower.includes("vill ha");
  const asksAboutSafetyOrFit =
    lower.includes("?") ||
    lower.includes("Ã¤r detta bra") ||
    lower.includes("ar detta bra") ||
    lower.includes("orolig") ||
    lower.includes("rÃ¤dd") ||
    lower.includes("radd") ||
    lower.includes("fÃ¶rklara") ||
    lower.includes("forklara") ||
    lower.includes("varfÃ¶r") ||
    lower.includes("varfor") ||
    lower.includes("resultat") ||
    lower.includes("funkar") ||
    lower.includes("kommer funka") ||
    lower.includes("hjÃ¤lpa") ||
    lower.includes("hjalpa") ||
    lower.includes("farligt") ||
    lower.includes("sÃ¤ker") ||
    lower.includes("saker") ||
    lower.includes("ont") ||
    lower.includes("smÃ¤rta") ||
    lower.includes("smarta") ||
    lower.includes("kÃ¤nns fel") ||
    lower.includes("kanns fel") ||
    lower.includes("obehag") ||
    lower.includes("70 Ã¥r") ||
    lower.includes("70 ar") ||
    lower.includes("Ã¤ldre") ||
    lower.includes("aldre") ||
    lower.includes("smalare") ||
    lower.includes("gÃ¥ ner") ||
    lower.includes("ga ner") ||
    lower.includes("fett") ||
    lower.includes("viktnedgÃ¥ng") ||
    lower.includes("viktnedgang");

  const swapRequest = parseProgramSwap(preference);
  if (swapRequest) {
    const matchingPasses = getProgramPassesWithExercise(swapRequest.fromName);

    return matchingPasses.length > 0
      ? queueProgramSuggestion(
          `Jag fÃ¶reslÃ¥r att vi byter ${swapRequest.fromName} mot ${swapRequest.toName}.`,
          [
            {
              type: "replace_exercise",
              fromExerciseName: swapRequest.fromName,
              toExerciseName: swapRequest.toName,
              reason: "Du bad coachen byta Ã¶vning.",
            },
          ]
        )
      : `Jag hittar inte ${swapRequest.fromName} i upplÃ¤gget. Skriv gÃ¤rna vilken Ã¶vning du vill byta bort.`;
  }

  if (
    lower.includes("trÃ¤nar hemma") ||
    lower.includes("tranar hemma") ||
    lower.includes("hemma") ||
    lower.includes("bara hantlar") ||
    lower.includes("har hantlar") ||
    lower.includes("inga maskiner") ||
    lower.includes("ingen maskin") ||
    lower.includes("saknar kabel") ||
    lower.includes("utan kabel")
  ) {
    return 'Bra att du sÃ¤ger det. Utrustningen styr hela upplÃ¤gget. Tryck "Ã„ndra mina svar" och vÃ¤lj plats/utrustning, eller skriv exakt vad du vill byta, till exempel "byt latsdrag mot hantelrodd".';
  }

  if (
    lower.includes("fÃ¶r svÃ¥rt") ||
    lower.includes("for svart") ||
    lower.includes("fÃ¶r tungt") ||
    lower.includes("for tungt") ||
    lower.includes("fÃ¶r avancerat") ||
    lower.includes("for avancerat") ||
    lower.includes("nybÃ¶rjare") ||
    lower.includes("nyborjare") ||
    lower.includes("ovan")
  ) {
    const count = shortenProgramPasses();

    return count > 0
      ? "Bra att du sÃ¤ger det. Jag gÃ¶r passen lite lugnare och tar bort sÃ¥nt som inte behÃ¶vs just nu."
      : "Bra att du sÃ¤ger det. DÃ¥ bÃ¶rjar vi lugnare: kontrollerade set, ingen maxning och tydlig marginal i bÃ¶rjan.";
  }

  if (
    (lower.includes("brÃ¶st") || lower.includes("brost")) &&
    (lower.includes("ont") ||
      lower.includes("smÃ¤rta") ||
      lower.includes("smarta") ||
      lower.includes("obehag") ||
      lower.includes("kÃ¤nns fel") ||
      lower.includes("kanns fel"))
  ) {
    return queueRemoveProgramSuggestion(
      isChestStressProgramExercise,
      "BrÃ¶stsmÃ¤rta gÃ¥r fÃ¶re planen. Jag fÃ¶reslÃ¥r att vi pausar Ã¶vningar som belastar brÃ¶st, press eller axelpress tills det kÃ¤nns tryggt igen.",
      "Bra att du sÃ¤ger det. Jag hittar inga tydliga brÃ¶st- eller pressÃ¶vningar att ta bort, men brÃ¶stsmÃ¤rta gÃ¥r fÃ¶re planen. SÃ¤nk belastningen eller avbryt om det kÃ¤nns fel."
    );
  }

  if (asksAboutSafetyOrFit && !wantsAddExercise && !wantsLessOrAvoid) {
    const mentionsResults =
      lower.includes("resultat") ||
      lower.includes("funkar") ||
      lower.includes("kommer funka") ||
      lower.includes("hjÃ¤lpa") ||
      lower.includes("hjalpa") ||
      lower.includes("utveckling") ||
      lower.includes("starkare") ||
      lower.includes("bygga muskler") ||
      lower.includes("muskler");
    const mentionsExplanation =
      lower.includes("fÃ¶rklara") ||
      lower.includes("forklara") ||
      lower.includes("varfÃ¶r") ||
      lower.includes("varfor") ||
      lower.includes("valt upplÃ¤gget") ||
      lower.includes("valt upplagget");
    const mentionsKnee =
      lower.includes("knÃ¤") ||
      lower.includes("kna") ||
      lower.includes("knÃ¤na") ||
      lower.includes("knana");
    const mentionsAgeOrRisk =
      lower.includes("70") ||
      lower.includes("Ã¤ldre") ||
      lower.includes("aldre") ||
      lower.includes("orolig") ||
      lower.includes("rÃ¤dd") ||
      lower.includes("radd") ||
      mentionsKnee ||
      lower.includes("ont") ||
      lower.includes("smÃ¤rta") ||
      lower.includes("smarta") ||
      lower.includes("kÃ¤nns fel") ||
      lower.includes("kanns fel") ||
      lower.includes("obehag") ||
      lower.includes("farligt") ||
      lower.includes("sÃ¤ker") ||
      lower.includes("saker");

    const fallbackReply = mentionsKnee
      ? "Bra att du sÃ¤ger det. DÃ¥ ska upplÃ¤gget kÃ¤nnas tryggt fÃ¶r knÃ¤na. Vi bÃ¶rjar med kontrollerade set, ingen maxning och Ã¶vningar som gÃ¥r att justera direkt om nÃ¥got kÃ¤nns fel. GÃ¶r det ont gÃ¥r smÃ¤rta fÃ¶re planen. Vill du kan jag gÃ¶ra benpassen Ã¤nnu lugnare."
      : lower.includes("smalare") || lower.includes("fett") || lower.includes("gÃ¥ ner") || lower.includes("ga ner")
      ? "Ja, styrketrÃ¤ning passar Ã¤ven nÃ¤r mÃ¥let Ã¤r att bli smalare. Den hjÃ¤lper kroppen behÃ¥lla muskler och form medan kosten styr viktnedgÃ¥ngen mest. Vill du kan jag gÃ¶ra upplÃ¤gget mer fettminskningsvÃ¤nligt."
      : mentionsResults
      ? "Jag fattar. Resultat kommer inte av ett perfekt pass, utan av att vi kan upprepa bra pass vecka efter vecka. Det hÃ¤r upplÃ¤gget ger oss nÃ¥got att fÃ¶lja, hÃ¶ja och justera. Vill du kan jag fÃ¶rklara exakt hur progressionen ska ske."
      : mentionsExplanation
      ? "Jag valde upplÃ¤gget fÃ¶r att ge dig tydliga pass som gÃ¥r att upprepa och fÃ¶lja. MÃ¥let Ã¤r att vi ska kunna se vad som blir starkare, vad som kÃ¤nns bra och vad vi behÃ¶ver justera. Om nÃ¥got kÃ¤nns osÃ¤kert Ã¤ndrar vi hellre upplÃ¤gget Ã¤n chansar."
      : mentionsAgeOrRisk
      ? "Bra att du sÃ¤ger det. Du ska inte behÃ¶va kÃ¤nna dig osÃ¤ker hÃ¤r. Vi bÃ¶rjar med marginal, undviker max och justerar direkt om nÃ¥got gÃ¶r ont eller kÃ¤nns fel. Vill du kan jag gÃ¶ra upplÃ¤gget lugnare."
      : "Bra frÃ¥ga. Jag kan fÃ¶rklara varfÃ¶r jag valt upplÃ¤gget eller justera det om nÃ¥got kÃ¤nns fel.";

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
      "lÃ¤gg till",
      "lÃ¤gga till",
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
        addedCount > 0 && additionName ? `lÃ¤gger in ${additionName}` : "";
      const joiner = removedText && addedText ? " och " : "";

      return `Bra. Jag ${removedText}${joiner}${addedText} i upplÃ¤gget.`;
    }
  }

  if (wantsLessOrAvoid && lower.includes("marklyft")) {
    return queueReplaceOrRemoveProgramSuggestion(
      getProgramExerciseNamesMatching((name) => exerciseKey(name).includes("marklyft")),
      "Jag fÃ¶reslÃ¥r att vi byter bort marklyft ur upplÃ¤gget.",
      "Bra input. Jag sparar att marklyft inte ska prioriteras i upplÃ¤gget."
    );
  }

  if (wantsLessOrAvoid && lower.includes("benpress")) {
    return queueReplaceOrRemoveProgramSuggestion(
      getProgramExerciseNamesMatching((name) => exerciseKey(name).includes("benpress")),
      "Jag fÃ¶reslÃ¥r att vi byter bort benpress ur upplÃ¤gget.",
      "Jag sparar det. Benpress fÃ¥r inte vara en viktig del av upplÃ¤gget."
    );
  }

  if (wantsLessOrAvoid && lower.includes("latsdrag")) {
    return queueReplaceOrRemoveProgramSuggestion(
      getProgramExerciseNamesMatching((name) => exerciseKey(name).includes("latsdrag")),
      "Jag fÃ¶reslÃ¥r att vi byter bort latsdrag ur upplÃ¤gget.",
      "Jag sparar det. Vi bygger ryggen utan att latsdrag behÃ¶ver vara med."
    );
  }

  if (wantsLessOrAvoid && lower.includes("vadpress")) {
    return queueReplaceOrRemoveProgramSuggestion(
      getProgramExerciseNamesMatching((name) => exerciseKey(name).includes("vadpress")),
      "Jag fÃ¶reslÃ¥r att vi byter bort vadpress ur upplÃ¤gget.",
      "Bra att du sÃ¤ger det. Jag sparar att vadpress inte ska prioriteras."
    );
  }

  if (wantsLessOrAvoid) {
    const requestedExercise =
      extractExerciseNameAfterNormalized(preference, [
        "gillar inte",
        "tycker inte om",
        "vill inte kÃ¶ra",
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
          `Jag fÃ¶reslÃ¥r att vi byter bort ${exerciseName} ur upplÃ¤gget.`,
          `Jag hittar inte ${exerciseName} i upplÃ¤gget.`
        );
      }
    }
  }

  if (
    lower.includes("lÃ¤gg till") ||
    lower.includes("lÃ¤gga till") ||
    lower.includes("ta med") ||
    lower.includes("vill ha")
  ) {
    const requestedExercise = cleanProgramExerciseRequest(
      extractExerciseNameAfterNormalized(preference, [
        "lÃ¤gg till",
        "lÃ¤gga till",
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
          if (lower.includes("Ã¶verkropp") || lower.includes("overkropp")) {
            return key.includes("Ã¶verkropp") || key.includes("overkropp");
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
            key.includes("Ã¶verkropp") ||
            key.includes("overkropp") ||
            key.includes("helkropp")
          );
        });

      return targetPasses.length > 0
        ? queueProgramSuggestion(
            `Jag fÃ¶reslÃ¥r att vi lÃ¤gger till ${requestedExerciseName} dÃ¤r den passar bÃ¤st.`,
            targetPasses.map((pass) => ({
              type: "add_exercise",
              exerciseName: requestedExerciseName,
              passKey: pass.key,
              passName: pass.displayName,
              reason: "Du bad coachen lÃ¤gga till Ã¶vningen.",
            }))
          )
        : `Bra. Jag sparar att ${requestedExerciseName} ska in i upplÃ¤gget.`;
    }

    if (
      lower.includes("underkropp") ||
      lower.includes("benpass") ||
      lower.includes("ben")
    ) {
      const exercise = userProfile?.location === "hemma" ? "Utfall" : "LÃ¥rcurl";
      return queueAddProgramSuggestion(
        (pass) => {
          const key = exerciseKey(pass.displayName);
          return key.includes("underkropp") || key.includes("ben");
        },
        exercise,
        `Jag fÃ¶reslÃ¥r att vi lÃ¤gger till ${exercise.toLowerCase()} i underkroppspasset.`,
        `Bra. Jag sparar att underkropp ska fÃ¥ en Ã¶vning till.`
      );
    }

    if (lower.includes("Ã¶verkropp") || lower.includes("overkropp")) {
      const exercise = userProfile?.location === "hemma" ? "Hantelrodd" : "Sittande kabelrodd";
      return queueAddProgramSuggestion(
        (pass) => {
          const key = exerciseKey(pass.displayName);
          return key.includes("Ã¶verkropp") || key.includes("overkropp");
        },
        exercise,
        `Jag fÃ¶reslÃ¥r att vi lÃ¤gger till ${exercise.toLowerCase()} i Ã¶verkroppspasset.`,
        `Bra. Jag sparar att Ã¶verkropp ska fÃ¥ en Ã¶vning till.`
      );
    }

    const requestedExerciseFallback = extractExerciseNameAfterNormalized(preference, [
      "lÃ¤gg till",
      "lÃ¤gga till",
      "ta med",
      "vill ha",
    ]);
    const resolved = resolveExerciseName(requestedExerciseFallback);

    if (resolved.status === "known") {
      return queueAddProgramSuggestion(
        (pass) =>
          exerciseKey(pass.displayName).includes("Ã¶verkropp") ||
          exerciseKey(pass.displayName).includes("helkropp"),
        resolved.name,
        `Jag fÃ¶reslÃ¥r att vi lÃ¤gger till ${resolved.name} i upplÃ¤gget.`,
        `Bra. Jag sparar ${resolved.name} till upplÃ¤gget.`
      );
    }

    if (resolved.status === "suggest") {
      setProgramPreferenceInput(`lÃ¤gg till ${resolved.suggestion}`);
      return `Menar du ${resolved.suggestion}? Jag har fyllt i det namnet. Skicka igen om det stÃ¤mmer.`;
    }

    if (resolved.status === "needsCategory") {
      setProgramPreferenceInput(`lÃ¤gg till egen ben: ${resolved.name}`);
      return "Vad trÃ¤nar den frÃ¤mst? Skriv till exempel egen ben:, egen rygg: eller egen armar:. Jag fyllde i ben som exempel.";
    }

    if (requestedExerciseFallback) {
      return "Jag Ã¤r osÃ¤ker pÃ¥ vilken Ã¶vning du menar. Skriv gÃ¤rna det vanligaste namnet, eller bÃ¶rja med egen: om du vill lÃ¤gga in den exakt sÃ¥.";
    }
  }

  if (wantsMore && lower.includes("brÃ¶st")) {
    return queueAddProgramSuggestion(
      (pass) => exerciseKey(pass.displayName).includes("Ã¶verkropp"),
      userProfile?.location === "hemma" ? "Hantelpress" : "BrÃ¶stpress",
      "Jag fÃ¶reslÃ¥r att vi ger brÃ¶st lite mer plats i Ã¶verkroppspasset.",
      "Bra. Jag sparar att brÃ¶st ska fÃ¥ mer fokus i upplÃ¤gget."
    );
  }

  if (wantsMore && lower.includes("rygg")) {
    return queueAddProgramSuggestion(
      (pass) =>
        exerciseKey(pass.displayName).includes("Ã¶verkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      userProfile?.location === "hemma" ? "Bandrodd" : "Sittande kabelrodd",
      "Jag fÃ¶reslÃ¥r att vi lÃ¤gger in lite mer ryggarbete dÃ¤r det passar bÃ¤st.",
      "Bra. Jag sparar att ryggen ska fÃ¥ mer fokus."
    );
  }

  if (wantsMore && (lower.includes("ben") || lower.includes("baksida"))) {
    return queueAddProgramSuggestion(
      (pass) =>
        exerciseKey(pass.displayName).includes("underkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      lower.includes("baksida") ? "LÃ¥rcurl" : "Utfall",
      "Jag fÃ¶reslÃ¥r att vi ger benen lite mer utrymme i upplÃ¤gget.",
      "Bra. Jag sparar att benen ska prioriteras mer."
    );
  }

  if (wantsMore && (lower.includes("axlar") || lower.includes("axel"))) {
    return queueAddProgramSuggestion(
      (pass) => exerciseKey(pass.displayName).includes("Ã¶verkropp"),
      "Sidolyft",
      "Jag fÃ¶reslÃ¥r att vi lÃ¤gger in mer axelarbete utan att gÃ¶ra passet rÃ¶rigt.",
      "Bra. Jag sparar att axlar ska fÃ¥ mer fokus."
    );
  }

  if (wantsMore && (lower.includes("armar") || lower.includes("biceps") || lower.includes("triceps"))) {
    return queueAddProgramSuggestion(
      (pass) =>
        exerciseKey(pass.displayName).includes("Ã¶verkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      lower.includes("triceps") ? "Triceps pushdown med rep" : "Hantelcurl",
      "Jag fÃ¶reslÃ¥r att vi ger armar lite mer plats utan att passet blir rÃ¶rigt.",
      "Bra. Jag sparar att armar ska fÃ¥ mer fokus."
    );
  }

  if (wantsMore && (lower.includes("mage") || lower.includes("core") || lower.includes("bÃ¥l") || lower.includes("bal"))) {
    return queueAddProgramSuggestion(
      (pass) =>
        exerciseKey(pass.displayName).includes("underkropp") ||
        exerciseKey(pass.displayName).includes("helkropp"),
      userProfile?.location === "hemma" ? "Planka" : "Cable crunch",
      "Jag fÃ¶reslÃ¥r att vi lÃ¤gger in lite mage dÃ¤r det inte stÃ¶r resten.",
      "Bra. Jag sparar att mage ska fÃ¥ mer plats."
    );
  }

  if (
    lower.includes("kortare") ||
    lower.includes("kort pass") ||
    lower.includes("mindre tid") ||
    lower.includes("ont om tid") ||
    lower.includes("fÃ¶r mÃ¥nga Ã¶vningar") ||
    lower.includes("for manga ovningar") ||
    lower.includes("fÃ¤rre Ã¶vningar") ||
    lower.includes("farre ovningar") ||
    lower.includes("fÃ¶r mycket Ã¶vningar") ||
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
          "Jag fÃ¶reslÃ¥r att vi kortar ner passen och tar bort det som Ã¤r minst viktigt just nu.",
          removeActions
        )
      : "Okej. UpplÃ¤gget Ã¤r redan ganska kompakt, men jag sparar att passen ska hÃ¥llas korta.";
  }

  if (lower.includes("knÃ¤") || lower.includes("kna")) {
    const kneeExerciseNames = getProgramExerciseNamesMatching((name) => {
      const key = exerciseKey(name);
      return key.includes("benspark") || key.includes("utfall") || key.includes("knÃ¤bÃ¶j");
    });

    return kneeExerciseNames.length > 0
      ? queueProgramSuggestion(
          "Jag fÃ¶reslÃ¥r att vi minskar knÃ¤belastningen och lÃ¤gger in lugnare benarbete.",
          [
            ...kneeExerciseNames.map((exerciseName) => ({
              type: "remove_exercise" as const,
              exerciseName,
              reason: "Du nÃ¤mnde knÃ¤besvÃ¤r.",
            })),
            {
              type: "add_exercise",
              exerciseName: "LÃ¥rcurl",
              reason: "Lugnare benarbete med mindre knÃ¤krav.",
            },
          ]
        )
      : "Bra att du sÃ¤ger det. Jag sparar knÃ¤et som nÃ¥got coachen ska ta hÃ¤nsyn till.";
  }

  if (lower.includes("lÃ¤ndrygg") || lower.includes("ryggont")) {
    return queueRemoveProgramSuggestion(
      (name) => exerciseKey(name).includes("marklyft"),
      "Jag fÃ¶reslÃ¥r att vi tar bort marklyft och gÃ¶r upplÃ¤gget snÃ¤llare mot lÃ¤ndryggen.",
      "Bra att du sÃ¤ger det. Jag sparar lÃ¤ndryggen som nÃ¥got coachen ska ha koll pÃ¥."
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
      'Jag Ã¤r inte helt sÃ¤ker pÃ¥ vad du vill Ã¤ndra. Skriv gÃ¤rna lite tydligare, till exempel "ta bort marklyft", "lÃ¤gg till knÃ¤bÃ¶j", "fÃ¤rre Ã¶vningar" eller "Dag 1: bÃ¤nkpress, rodd".',
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
      return weight; // kroppen hade mer, behÃ¥ll vikten
    }

    if (fail.includes("teknik") || fail.includes("formen")) {
      return getBackoffWeight({ weight, exerciseName: args.exerciseName ?? "", reason: "technique" });
    }

    if (fail.includes("ont") || fail.includes("smÃ¤rta")) {
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
      const missingInputMessage = "Jag behÃ¶ver tiden fÃ¶rst. Starta klockan eller fyll i tiden.";
      setChatLog((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === "coach" && lastMessage.text === missingInputMessage) return prev;
        return [...prev, { role: "coach", text: missingInputMessage }];
      });
      return;
    }
    if (timedExercise && durationSeconds && durationSeconds > 7200) {
      const durationWarningMessage =
        "Vänta.\n\nTiden ser ut som en felskrivning. Jag sparar inte setet förrän tiden är rätt.";
      setChatLog((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === "coach" && lastMessage.text === durationWarningMessage) return prev;
        return [...prev, { role: "coach", text: durationWarningMessage }];
      });
      return;
    }
    const missingRequiredInput =
      (!timedExercise && (!Number.isFinite(reps) || reps <= 0)) ||
      (!bodyweightExercise && (!Number.isFinite(weight) || weight <= 0));
    const missingInputMessage = bodyweightExercise
      ? "Jag behÃ¶ver reps fÃ¶rst."
      : "Jag behÃ¶ver vikt och reps fÃ¶rst.";

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
    failNoteInput.toLowerCase().includes("smÃ¤rta") ||
    failNoteInput.toLowerCase().includes("kÃ¤nning"));


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
        note: `Avslutades efter smÃ¤rta/kÃ¤nning: ${failNoteInput.trim()}`,
        setCount: setNumber,
        createdAt: new Date().toISOString(),
      },
    ];
   }
    setWorkout(updated);
   const suggestedNextWeight = nextSetPlan.weight;


    setFailNoteInput("");
    setDidFailInput(false);
 // âœ… Coach-reaktion + auto-fÃ¶rslag fÃ¶r nÃ¤sta set (RIR)
const step = PROGRESSION_STEP;


    // Spara â€œsenaste per Ã¶vningâ€ direkt nÃ¤r du loggar
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
        ? `Nytt personbÃ¤sta i ${currentExerciseName}: ${formatLoggedSetText({
            exerciseName,
            weight,
            reps: timedExercise ? 0 : reps,
            durationSeconds,
            metricType: prAttempt.metricType,
          })}.`
        : `FÃ¶rsta noteringen i ${currentExerciseName}: ${formatLoggedSetText({
            exerciseName,
            weight,
            reps: timedExercise ? 0 : reps,
            durationSeconds,
            metricType: prAttempt.metricType,
          })}. Nu har vi en nivÃ¥ att slÃ¥.`
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
  setRepsInput(timedExercise ? "" : String(nextSetPlan.repsInput || reps));
  setDurationSecondsInput(timedExercise ? durationSeconds ?? 0 : 0);
  setRirInput(nextSetPlan.rirInput ?? 2);
  setFailNoteInput("");
  setDidFailInput(false);
  return;
}

    // FÃ¶r nÃ¤sta set behÃ¥ll vikt, men nolla reps (valfritt)
const nextSetRepInput = nextSetPlan.repsInput;
const nextSetRirInput = nextSetPlan.rirInput;

setRepsInput(String(nextSetRepInput));
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
        return [...prev.slice(0, -1), { role: "coach", text: undoText }];
      }
      return [...prev, { role: "coach", text: undoText }];
    });
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
    notes.push({ ...base, text: "Du kom in trÃ¶tt och hÃ¶ll det kontrollerat." });
  }
  if (dayForm === "stark") {
    notes.push({ ...base, text: "Du kÃ¤nde dig stark idag." });
  }

  if (
    w.conditioningContext?.timing === "before" &&
    w.conditioningContext.intensity === "hard"
  ) {
    notes.push({
      ...base,
      text: `Du kÃ¶rde ${w.conditioningContext.note} fÃ¶re styrkan. Det kan ha pÃ¥verkat vikterna.`,
    });
  }

  for (const event of w.events ?? []) {
    if (event.type === "pain" || event.type === "exercise_completed_early") {
      notes.push({
        ...base,
        exerciseName: event.exerciseName,
        text: `${event.exerciseName}: smÃ¤rta eller kÃ¤nning rapporterades senast. ${event.note ?? ""}`.trim(),
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

    let memoryText = `${ex.name}: dÃ¤r tog det stopp senast.`;

    if (reasons.includes("grepp")) {
      memoryText = `${ex.name}: senast var det greppet som gav upp.`;
    } else if (reasons.includes("teknik") || reasons.includes("formen")) {
      memoryText = `${ex.name}: senast var det tekniken som brast.`;
    } else if (reasons.includes("ont") || reasons.includes("smÃ¤rta")) {
      memoryText = `${ex.name}: senast avbrÃ¶t du pÃ¥ grund av kÃ¤nning eller smÃ¤rta.`;
    } else if (
      reasons.includes("ork") ||
      reasons.includes("muskel") ||
      reasons.includes("slut")
    ) {
      memoryText = `${ex.name}: senast nÃ¥dde du grÃ¤nsen i muskeln dÃ¤r.`;
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
      text: `${ex.name}: bÃ¤sta set senast var ${best.weight} kg Ã— ${best.reps}.`,
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
  let coachHeadline = "Bra pass. Det hÃ¤r Ã¤r sparat.";

  if (summary.totalSets === 0) {
    coachHeadline = "Ingen stress. Vi bÃ¶rjar rent nÃ¤sta gÃ¥ng.";
  } else if (summary.isPartial) {
    coachHeadline = "Bra att du sparade dÃ¤r du var.";
  } else if (progression.improved.length >= 2) {
    coachHeadline = `Det hÃ¤r var en stark dag. ${improvedText} gick framÃ¥t ðŸ”¥`;
  } else if (progression.improved.length === 1) {
    coachHeadline = `${progression.improved[0]} tog ett tydligt steg idag ðŸ”¥`;
  } else if (hardSetCount >= 3 && failedSetCount === 0) {
    coachHeadline = "Tungt jobb, men du hÃ¶ll kontrollen hela vÃ¤gen.";
  } else if (hardSetCount >= 3) {
    coachHeadline = "Du gjorde jobbet Ã¤ven nÃ¤r det blev tungt.";
  }

  if (progression.improved.length > 0) {
    positives.push(
      `Du tog steg framÃ¥t i ${progression.improved.slice(0, 3).join(", ")}. Det Ã¤r precis sÃ¥ hÃ¤r vi vill att det ska rÃ¶ra sig.`
    );
  }

  if (summary.bestSetText && summary.bestSetText !== "Inget set loggat.") {
    positives.push(`Starkaste trÃ¤ffen idag: ${summary.bestSetText}. Den sticker ut.`);
  }

  if (painOrStopEvents.length > 0) {
    const firstPainEvent = painOrStopEvents[0];
    positives.push(
      `Du sa till nÃ¤r ${firstPainEvent.exerciseName} inte kÃ¤ndes bra. Det Ã¤r exakt sÃ¥ vi hÃ¥ller passet smart.`
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
    positives.push("Du jobbade nÃ¤ra grÃ¤nsen flera gÃ¥nger och hÃ¶ll ihop passet. Starkt gjort.");
  } else if (summary.totalSets > 0) {
    positives.push(`Du fick in ${summary.totalSets} set. Det ger bra nivÃ¥er att styra nÃ¤sta pass frÃ¥n.`);
  }

  if (failedSets.length === 0 && summary.totalSets > 0) {
    positives.push("Du hÃ¶ll marginal hela vÃ¤gen. Det Ã¤r snyggt, sÃ¤rskilt nÃ¤r mÃ¥let Ã¤r att kunna komma tillbaka stark nÃ¤sta gÃ¥ng.");
  } else if (failedSets.length > 0) {
    adjustments.push(
      failedSets.length >= 3
        ? "Du var vid grÃ¤nsen mÃ¥nga gÃ¥nger idag. NÃ¤sta pass sparar vi lite mer tidigt, sÃ¥ kvaliteten hÃ¥ller lÃ¤ngre."
        : "Du var vid grÃ¤nsen i nÃ¥gra set. NÃ¤sta gÃ¥ng hÃ¥ller vi lite mer kontroll dÃ¤r."
    );
  }

  if (hardSets.length >= 3 && failedSets.length === 0) {
    adjustments.push(
      "Det blev flera tunga set idag. NÃ¤sta pass Ã¶ppnar vi kontrollerat och hÃ¶jer om det kÃ¤nns rÃ¤tt."
    );
  }

  if (summary.totalSets === 0) {
    adjustments.push(
      "Inget att justera Ã¤n. Vi bÃ¶rjar om lugnt nÃ¤sta gÃ¥ng."
    );
  }

  if (painOrStopEvents.length > 0) {
    const affected = Array.from(
      new Set(painOrStopEvents.map((event) => event.exerciseName))
    ).join(", ");

    adjustments.push(
      `${affected}: vi tar med oss smÃ¤rtan/kÃ¤nningen och vÃ¤ljer smÃ¤rtfri variant eller kortare dos nÃ¤sta gÃ¥ng.`
    );
  }

  const lastExercise = workout.exercises[workout.exercises.length - 1];
  if (progression.improved.length > 0) {
    nextFocus.push(`NÃ¤sta gÃ¥ng testar vi om ${progression.improved[0]} hÃ¥ller den hÃ¤r nivÃ¥n igen.`);
  } else if (summary.totalSets > 0 && lastExercise && lastExercise.sets.length > 0) {
    nextFocus.push(
      `NÃ¤sta gÃ¥ng bÃ¶rjar vi rent i ${lastExercise.name} och lÃ¥ter fÃ¶rsta setet sÃ¤tta nivÃ¥n.`
    );
  }

  if (painOrStopEvents.length > 0) {
    nextFocus.unshift(
      `NÃ¤sta gÃ¥ng startar vi lugnare i ${painOrStopEvents[0].exerciseName} eller byter till en variant som kÃ¤nns bra direkt.`
    );
  }

  if (positives.length === 0) {
    positives.push(
      "Du dÃ¶k upp och passet Ã¤r sparat. Det rÃ¤knas."
    );
  }

  if (adjustments.length === 0) {
    adjustments.push("Inget stort att Ã¤ndra just nu. NÃ¤sta pass bygger vi frÃ¥n dagens nivÃ¥er.");
  }
if (progression.improved.length > 0) {
  coachMemoryTakeaway.push(
    `Jag sparar att ${progression.improved.join(", ")} gick framÃ¥t idag.`
  );
}

if (progression.worse.length > 0) {
  coachMemoryTakeaway.push(
    `Jag sparar att ${progression.worse.join(", ")} tappade lite. DÃ¤r Ã¶ppnar vi smartare nÃ¤sta gÃ¥ng.`
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
    `Jag sparar att ${affected} gav smÃ¤rta/kÃ¤nning idag.`
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
    `Du kÃ¶rde ${workout.conditioningContext.note} fÃ¶re styrkan. Det kan ha pÃ¥verkat vikterna.`
  );
}

if (coachMemoryTakeaway.length === 0) {
  coachMemoryTakeaway.push(
    summary.isPartial
      ? "Jag sparar passet precis som det blev."
      : "Jag sparar dagens nivÃ¥er till nÃ¤sta pass."
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

  let coachSummary = "Passet Ã¤r sparat. Bra jobbat idag.";

  if (totalSets === 0) {
    coachSummary = "Passet sparat. NÃ¤sta pass tar vi frÃ¥n bÃ¶rjan.";
  } else if (isPartial) {
    coachSummary = `Passet sparat. ${totalSets} set Ã¤r gjort, och vi fortsÃ¤tter klokt nÃ¤sta gÃ¥ng.`;
  } else if (allSets.filter((set) => typeof set.rir === "number" && set.rir <= 1).length >= 3) {
    coachSummary = "Det dÃ¤r var ett tungt pass. Du jobbade nÃ¤ra grÃ¤nsen och fick jobbet gjort.";
  } else if (dayForm === "stark") {
    coachSummary = "Du kom in stark idag och anvÃ¤nde det bra. Det dÃ¤r var ett bra pass.";
  } else if (dayForm === "trött") {
    coachSummary =
      "Du tog dig igenom passet smart trots trÃ¶tt kÃ¤nsla. Det Ã¤r ett bra kvitto.";
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
    `Ã–vningar: ${exerciseCount}`,
    `Totala set: ${totalSets}`,
    `Flyttad vikt: ${totalVolumeText}`,
    `BÃ¤sta set: ${bestSetText}`,
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
// COACH MEMORY: spara en kort sammanfattning (per Ã¶vning)
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
    setGym("SjÃ¶viksgymmet");
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
    alert("Allt Ã¥terstÃ¤llt âœ…");
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
        setProgramPreferenceReply("Inga problem. Jag lÃ¤mnar upplÃ¤gget som det Ã¤r.");
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
            message: "Vad trÃ¤nar den frÃ¤mst? VÃ¤lj en egen-kategori nedan.",
          };
        }

        if (resolved.status === "unknown") {
          return {
            clearInput: false,
            nextInput: exerciseNameRaw,
            tone: "question",
            message:
              "Jag hittar ingen sÃ¤ker matchning. VÃ¤lj egen-kategori nedan om du vill lÃ¤gga in den exakt.",
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
          message: `${name} Ã¤r tillagd i Pass ${passKey}.`,
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
          setProgramPreferenceReply(`${exerciseName} Ã¤r borttagen frÃ¥n upplÃ¤gget.`);
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
          setProgramPreferenceReply(`${exerciseName} Ã¤r borttagen frÃ¥n upplÃ¤gget.`);
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
        previousExerciseSets={previousExerciseSets}
        progressionPlan={progressionPlan}
        plannedWeightKg={systemSuggestedWeightRef.current}
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
