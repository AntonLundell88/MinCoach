"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
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
import { WrappedStory } from "./components/WrappedStory";
import { SettingsGlyph } from "./components/IconGlyphs";
import { useWrappedRecap } from "./hooks/useWrappedRecap";
import { useAutoAccountBackup } from "./hooks/useAutoAccountBackup";
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
  type CoachChatAction,
  type CoachChatContext,
  type CoachExerciseLibraryInfo,
  type CoachHealthNote,
  type CoachSetContext,
  type CoachWireStrategy,
  type CoachWorkoutReviewResult,
} from "./lib/coachAi";
import {
  exerciseKey,
  formatRestProse,
  getExerciseDefinition,
  getExerciseWeightStep,
  getExerciseProfile,
  getExerciseRestKind,
  getRestTargetRange,
  getExerciseUserInfo,
  getProgramExercisePool,
  shouldDisplayAsBodyweight,
  isBodyweightExercise,
  isTimedExercise,
  normalizeExerciseSearchText,
  parsePlannedSetCount,
  resolveExerciseName,
} from "./lib/exercises";
import { useExerciseSwapActions } from "./hooks/useExerciseSwapActions";
import { repairMojibake } from "./lib/textEncoding";
import { triggerHaptic } from "./lib/haptics";
type PassType = "A" | "B" | "C" | "D" | "E" | "F" | "G";
type ProgramStartMode = "coach" | "manual";
type AppTheme = "dark" | "light";

const PROGRAM_BUILD_MIN_MS = 4500;
const ALL_PASS_KEYS: PassType[] = ["A", "B", "C", "D", "E", "F", "G"];
const ACTIVE_WORKOUT_DRAFT_KEY = "activeWorkoutDraft";
const AUTH_GATE_BYPASS_KEY = "mincoachContinueWithoutAccount";
const COACH_PROGRAM_MAX_DAYS = 6;
const MANUAL_PROGRAM_MAX_DAYS = 7;

const UNDO_SET_MESSAGES = [
  "Såg det — stryker det setet.",
  "Vi stryker det setet.",
  "Det setet hände aldrig. 🙈",
  "Det setet tar vi bort.",
];

const MISSING_TIME_MESSAGES = [
  "Jag behöver tiden först. Starta klockan för att logga tiden.",
  "Starta klockan så vi får en tid att jobba med.",
  "Tryck på Starta, så loggar vi tiden.",
];

const IMPLAUSIBLE_TIME_MESSAGES = [
  "Vänta.\n\nTiden ser ut som en felskrivning. Jag sparar inte setet förrän tiden är rätt.",
  "Vänta.\n\nDet där kan inte stämma va? Jag sparar inte setet förrän tiden är rätt.",
  "Vänta.\n\nNja, den tiden låter rätt orimlig. Jag sparar inte setet förrän den är rätt.",
];

const IMPLAUSIBLE_REPS_MESSAGES = [
  "Vänta.\n\nRepsen ser ut som en felskrivning. Jag sparar inte setet förrän repsen är rätt.",
  "Vänta.\n\nDet där kan inte stämma va? Jag sparar inte setet förrän repsen är rätt.",
  "Vänta.\n\nNja, den repsiffran låter rätt orimlig. Jag sparar inte setet förrän den är rätt.",
];

const MISSING_WEIGHT_AND_REPS_MESSAGES = [
  "Jag behöver vikt och reps först.",
  "Fyll i vikt och reps så kör vi.",
  "Vikt och reps saknas än.",
];

const MISSING_REPS_ONLY_MESSAGES = [
  "Jag behöver reps först.",
  "Fyll i reps så kör vi.",
  "Reps saknas än.",
];

const EXTREME_REPS_EASTER_EGG =
  "Om det stämmer skriver vi kontrakt med Guinness rekordbok istället. Skriv in det riktiga antalet.";
const EXTREME_TIME_EASTER_EGG =
  "Om det stämmer skriver vi kontrakt med Guinness rekordbok istället. Skriv in den riktiga tiden.";

function pickRandomLine(options: string[]) {
  return options[Math.floor(Math.random() * options.length)];
}

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
    <div className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center gap-1.5 sm:right-6 sm:top-[max(1.25rem,env(safe-area-inset-top))]">
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
          Jag sammanfattar passet.
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

export type WorkoutPlan = {
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
  type: "pain" | "exercise_replaced" | "exercise_completed_early" | "ai_fallback";
  exerciseName?: string;
  note?: string;
  setCount?: number;
  replacementName?: string;
  route?: string;
  reason?: string;
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
  videoNotes: Array<{ exerciseName: string; text: string }>;
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

type Gym = {
  id: string;
  name: string;
  createdAt: string;
  exerciseOverrides?: Record<string, string>;
};

export type Workout = {
  id: string;
  startedAt: string;
  gym: string;
  gymId?: string;
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
    source?: "engine" | "llm" | "fallback" | "video";
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
  /**
   * Internt spårningsvärde — går INTE till modellen. Fältet skickades förut
   * på tråden och dess färdiga meningar ("...ett försiktigt test upp kan vara
   * rimligt") blev en mall som två olika övningar fick samma skelett av.
   * type, confidence och tone bär nyansen till modellen. Koppla inte in det
   * här fältet i någon context igen.
   */
  reason: string;
  tone: "offer" | "clear";
};

// Skild från ProgressionOpportunity med avsikt: en vanlig höjning är
// bevisad progression och får förifyllas tyst. Det här är ett medvetet
// risktagande utanför det bevisade — ska ALDRIG förifylla viktfältet,
// bara visas som ett aktivt val (se "Testa X kg"-chippen i UI:t).
/**
 * Bara vikten. Fältet bar tidigare en färdigskriven mening ("Vikten har
 * suttit stabilt flera pass i rad...") som modellen byggde en mall av — två
 * olika övningar fick nästan identiska svar. Instruktionen i coachPrompts.ts
 * förklarar redan vad ett tyngre testset är och hur det ska presenteras, så
 * meningen tillförde ingenting utom en formulering att kopiera.
 */
type CalibrationTestCandidate = {
  weight: string;
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
  // Hur många av de senaste kvalificerande passen som legat på samma
  // toppvikt med tillräcklig marginal (se topWeightStableSets nedan). 0 när
  // ingen historik/toppset finns än (start-grenarna).
  sessionsAtTopWeight: number;
  calibrationTestCandidate?: CalibrationTestCandidate;
};

function formatWeightInput(weight: number) {
  if (!Number.isFinite(weight)) return "";
  return Number(weight.toFixed(2)).toString();
}

function formatRepRange(min: number, max: number) {
  if (min === max) return `${min} ${min === 1 ? "rep" : "reps"}`;
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

function formatRecentWorkingWeights(bestSets: ExerciseBestSet[]): string[] {
  return [...bestSets]
    .reverse()
    .map((set) => {
      if (set.metricType === "time" && set.durationSeconds != null) {
        const mins = Math.floor(set.durationSeconds / 60);
        const secs = set.durationSeconds % 60;
        const time = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs} s`;
        return set.weight > 0 ? `${time} · ${set.weight} kg` : time;
      }

      return `${set.weight} kg × ${set.reps}`;
    });
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
  // Gäller HELA det pågående passet, inte bara den här övningen — ett
  // kalibreringstest ska aldrig föreslås om något annat i passet redan
  // gjort ont eller avbrutits, oavsett hur säker just den här övningen är.
  sessionHasPainFlag?: boolean;
}) {
  const { history, exerciseName, targetReps, dayForm, sessionHasPainFlag } = args;
  const recentBestSets = getExerciseBestSets(history, exerciseName, 6);

  if (isTimedExercise(exerciseName)) {
    const lastDuration = recentBestSets[0]?.durationSeconds;

    return {
      action: "start",
      weight: "",
      reps: "0",
      repsText:
        typeof lastDuration === "number" && lastDuration > 0
          ? getTimedTargetText(lastDuration)
          : "",
      rirText: "",
      note:
        recentBestSets.length === 0
          ? "Första setet visar oss var vi ligger."
          : "",
      reason:
        recentBestSets.length === 0
          ? "Ingen historik än."
          : "Senaste bästa tid.",
      sessionsAtTopWeight: 0,
    } satisfies ExerciseProgressionPlan;
  }

  if (recentBestSets.length === 0) {
    return {
      action: "start",
      weight: "",
      reps: String(targetReps),
      repsText: `${targetReps} reps`,
      rirText: "RIR 2",
      note: "Första setet visar oss var vi ligger.",
      reason: "Ingen historik än.",
      sessionsAtTopWeight: 0,
    } satisfies ExerciseProgressionPlan;
  }

  const topSet = [...recentBestSets].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.reps - a.reps;
  })[0];
  const latestSet = recentBestSets[0];
  const latestHard = isHardOrFailedSet(latestSet);
  const topWeightSets = recentBestSets.filter((set) => set.weight === topSet.weight);
  // Stabil = konsekvent nära målet, inte nära ditt livstidsbästa på den
  // vikten. Ett enstaka starkt pass (t.ex. 13 reps mot mål 10) ska inte
  // sätta en ribba som normala, fullt godkända pass sen aldrig når.
  const topWeightStableSets = topWeightSets.filter(
    (set) => set.reps >= targetReps && hasUsefulMargin(set)
  );
  const sessionsAtTopWeight = topWeightStableSets.length;
  // Medvetet bredare än isHardOrFailedSet (RIR<=0): deload ska fånga ett
  // mönster av slitsamma pass över tid, inte kräva total failure varje gång.
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
            "Det tyngsta setet har nått målet med marginal nog för att ett försiktigt test upp kan vara rimligt.",
          tone: "offer",
        }
      : undefined;
  // Medvetet skild från canIncrease/offerIncreaseOpportunity: de belönar
  // bevisad marginal med ett litet, säkert steg. Det här är motsatsen —
  // ett större, avsiktligt hopp UTANFÖR det bevisade, för att se var
  // gränsen faktiskt går.
  //
  // Villkoren nedan är en strikt DELMÄNGD av canIncrease (samma
  // !shouldDeload/!latestHard/dayForm/stable>=2). Increase-grenen ligger
  // före hold i kedjan, så ett kalibreringstest följer alltid med en
  // automatisk höjning — det kan aldrig stå ensamt vid oförändrad vikt.
  // Därför ankras testvikten på PLANVIKTEN (den som faktiskt fylls i),
  // inte på topSet: annars kan testet landa på exakt samma vikt som redan
  // står i rutan, och "skriv in den själv" blir en tom uppmaning.
  const decisionProfile = getExerciseDecisionProfile(exerciseName);
  const calibrationTestEligible =
    decisionProfile.type !== "technical-heavy" &&
    !sessionHasPainFlag &&
    !shouldDeload &&
    !latestHard &&
    dayForm !== "trött" &&
    topWeightStableSets.length >= 2;
  const buildCalibrationTestCandidate = (
    planWeight: number
  ): CalibrationTestCandidate | undefined => {
    if (!calibrationTestEligible) return undefined;

    const testWeight = Math.max(
      normalizeSuggestedWeight(planWeight * 1.125, exerciseName, "nearest"),
      getNextAvailableWeight(planWeight, exerciseName, "up")
    );

    // Säkring: erbjud aldrig ett "test" som inte är tyngre än vikten
    // användaren redan har ifylld — då är det inget test att skriva in.
    if (testWeight <= planWeight) return undefined;

    return { weight: formatWeightInput(testWeight) };
  };

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
      sessionsAtTopWeight,
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
      sessionsAtTopWeight,
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
      sessionsAtTopWeight,
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
      sessionsAtTopWeight,
    } satisfies ExerciseProgressionPlan;
  }

  if (canIncrease) {
    const nextWeight = scaledProgressionJump(topSet.weight, exerciseName, topSet.reps, targetReps, topSet.rir);
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
      sessionsAtTopWeight,
      calibrationTestCandidate: buildCalibrationTestCandidate(nextWeight),
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
      sessionsAtTopWeight,
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
    sessionsAtTopWeight,
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
    ? formatLoggedSetText({
        exerciseName,
        weight: latestSet.weight,
        reps: latestSet.reps,
        durationSeconds: latestSet.durationSeconds,
        metricType: latestSet.metricType,
        rir: latestSet.rir ?? undefined,
      })
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

  return shortCoach(["Hörde dig. Känns det okej, kör vidare — annars ta det säkra."]);
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

          if (!overrideName) return exercise;

          // purpose/caution/alternatives beskrev den GAMLA övningen och blir
          // direkt felaktiga vid byte — "stabil maskinlösning" stod kvar när
          // Bröstpress byttes mot Bänkpress. De tas bort i stället för att
          // skrivas om: granskningsskärmen har redan en fallback som hämtar
          // rätt text för den nya övningen ur biblioteket.
          // sets/reps/rir behålls — de beskriver platsens dos, inte övningen.
          const {
            purpose: _purpose,
            caution: _caution,
            alternatives: _alternatives,
            ...slot
          } = exercise;

          return { ...slot, exerciseKey: undefined, name: overrideName };
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

function getAvailableProgramExercises(profile: UserProfile, browseAll?: boolean) {
  return getProgramExercisePool({
    location: profile.location,
    equipment: profile.location === "hemma" ? profile.equipment : [],
    exercisePreferences: profile.exercisePreferences ?? [],
    trainingExperience: profile.trainingExperience,
    browseAll,
  }).map((exercise) => {
    const profile = getExerciseProfile(exercise.name);

    return {
      exerciseKey: exercise.exerciseKey,
      name: exercise.name,
      aliases: exercise.aliases,
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
  const restKind = getExerciseRestKind(exerciseName);
  // Uttryckligt fält i biblioteket, inte substrängar i namnet. Den gamla
  // matchningen på "squat" och "marklyft" gav Goblet squat och Bulgarian
  // split squat samma spärrar som ett marklyft: inga testset, inga bonusset,
  // inget extraset utöver planen. Se technicalLift i exercises.ts.
  if (getExerciseDefinition(exerciseName)?.technicalLift) {
    return {
      type: "technical-heavy" as const,
      backoffAfterFailure: 0.92,
      backoffAfterHardSecondSet: 0.94,
      techniqueDrop: 0.88,
      painDrop: 0.8,
      // Taket låg på 2 och stängde övningen efter två set oavsett vad coachen
      // eller användaren tyckte. Det var ingen bedömning av övningen — profilen
      // väljs på substrängar i namnet, så Goblet squat och Bulgarian split
      // squat fick marklyftets tak för att de heter "squat". Anton: ingen
      // övning ska ha det. Backoff-faktorerna ovan är kvar; de justerar, de
      // avbryter inte.
      maxHardSets: 3,
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

function getMuscleGroupingKey(exerciseName: string) {
  const primaryMuscle = getExerciseDefinition(exerciseName)?.primaryMuscle;
  if (primaryMuscle) return primaryMuscle;

  const category = getExerciseProfile(exerciseName).category;
  return category === "okänd" ? null : category;
}

function isSoleExerciseForMuscleGroup(
  workoutExercises: { name: string }[],
  exerciseName: string
) {
  const groupKey = getMuscleGroupingKey(exerciseName);
  if (!groupKey) return false;

  const sameGroupCount = workoutExercises.filter(
    (exercise) => getMuscleGroupingKey(exercise.name) === groupKey
  ).length;

  return sameGroupCount === 1;
}

function tightenRirForSoloMuscleGroup(plan: NextSetPlan, exerciseName: string) {
  if (plan.strategy !== "hold" && plan.strategy !== "press") return plan;
  if (typeof plan.rirInput !== "number" || plan.rirInput <= 0) return plan;

  const tightenedRirInput = plan.rirInput - 1;
  const tightenedRirText = tightenedRirInput <= 0 ? "RIR 0" : "RIR 0-1";
  const muscleGroupLabel = getMuscleGroupingKey(exerciseName) ?? "den här muskelgruppen";

  return {
    ...plan,
    rirInput: tightenedRirInput,
    rirText: tightenedRirText,
    reason: `${exerciseName} är din enda övning för ${muscleGroupLabel} idag — inget skäl att spara marginal till en till övning. Sista setet får gå närmare failure.`,
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
  kind?: "limitation"; // skada/besvär nämnt i chatten, ovärderat mot annan minnesanteckning
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
  return Number(weight.toFixed(2)).toLocaleString("sv-SE");
}

function formatDurationText(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;

  if (minutes <= 0) return `${restSeconds} sek`;
  return `${minutes}:${String(restSeconds).padStart(2, "0")}`;
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
    : `${formatCoachWeight(args.weight)} kg × ${args.reps}`;

  if (typeof args.rir !== "number") return base;

  // Skrivet så att det går att citera rakt av mitt i en mening. Formatet var
  // "35 kg x 15 - RIR 2" — en display-sträng med tankstreck som ingen vill ha
  // i prosa, så modellen formulerade om den. I omskrivningen blev "15 reps,
  // RIR 2" till "15 × 2", vilket läses som 15 kg för 2 reps. Rätt siffror,
  // fel skiljetecken, och en användare kan inte se skillnaden.
  const effort =
    args.rir === 0 ? "till stopp" : args.rir === 1 ? "1 rep kvar" : `${args.rir} reps kvar`;

  return `${base}, ${effort}`;
}

function formatNextLoadText(exerciseName: string, weight: number) {
  return shouldDisplayAsBodyweight(exerciseName, weight)
    ? "kroppsvikt"
    : `${formatCoachWeight(weight)} kg`;
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
  dayForm?: DayForm | null;
}) {
  const { weight, reps, rir, setNumber, dayForm } = args;
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
  // Spegelbild av finalSetNeedsQualityExtra: planen är ett standardförslag,
  // inte ett tak. Om marginalen hållit i sig genom alla planerade set (inte
  // bara det sista) är det coachen och användaren som avgör om det finns
  // ett set till att hämta — inte det förutbestämda antalet i schemat.
  // Kapas ändå av decisionProfile.maxHardSets, så det aldrig blir öppet slut.
  const priorSetsAllHadMargin =
    (args.previousSets ?? []).every(
      (set) => typeof set.rir !== "number" || set.rir >= 2
    );
  const hasMarginForExtraSet =
    setNumber >= plannedSetCount &&
    setNumber < decisionProfile.maxHardSets &&
    !fail &&
    rir >= 2 &&
    reps >= workingRepRange.min &&
    priorSetsAllHadMargin &&
    decisionProfile.type !== "technical-heavy";
  const shouldCompleteExercise =
    (setNumber >= plannedSetCount &&
      !finalSetNeedsQualityExtra &&
      !hasMarginForExtraSet) ||
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
    dayForm !== "trött" &&
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

  if (hasMarginForExtraSet) {
    return {
      weight,
      repsText: range(workingRepRange.min, workingRepRange.max),
      repsInput: reps,
      rirText: "RIR 1-2",
      rirInput: 1,
      restText,
      techniqueCue,
      strategy: "hold",
      reason:
        "Marginalen har hållit i sig genom alla planerade set. Ett set till kan vara värt det.",
      opportunity: {
        type: "optional_last_set_test",
        confidence: "medium",
        suggestedWeight: formatWeightInput(weight),
        reason:
          "Marginalen har hållit i sig genom alla planerade set — ett extra set kan vara värt det om det känns bra.",
        tone: "offer",
      },
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
    const min = workingRepRange.min;
    const max = Math.max(min, workingRepRange.max);

    if (dayForm === "trött") {
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
          "Repsen stack iväg trots låg marginal, men du körde in som trött. Vi håller vikten och sparar höjningen till nästa gång du är pigg.",
      } satisfies NextSetPlan;
    }

    const nextWeight = getNextAvailableWeight(weight, exerciseName, "up");

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

    if (dayForm === "trött") {
      return {
        weight,
        repsText: range(workingRepRange.min, workingRepRange.max),
        repsInput: workingRepRange.min,
        rirText: "RIR 1-2",
        rirInput: 2,
        restText,
        techniqueCue,
        strategy: "hold",
        reason:
          "Samma vikt gav fler reps med marginal kvar, men du körde in som trött idag. Vi håller vikten och sparar höjningen till nästa pass.",
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
    // Håll-grenen föreslår samma vikt som precis lyftes — den är per
    // definition redan en riktig, tillgänglig vikt och ska inte rundas om
    // mot en schablonskala (kunde tidigare tysta byta t.ex. 11 kg mot 10 kg).
    const nextWeight = isBackoff
      ? getBackoffWeight({
          weight,
          exerciseName,
          reason: "hard-backoff",
        })
      : weight;
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

  const min = Math.max(1, reps - 2);

  if (dayForm === "trött") {
    return {
      weight,
      repsText: range(min, reps),
      repsInput: min,
      rirText: "RIR 1-2",
      rirInput: 2,
      restText,
      techniqueCue,
      strategy: "hold",
      reason: "Du har mer att ge här, men det är en trött dag. Vi håller vikten och sparar höjningen till nästa gång.",
    } satisfies NextSetPlan;
  }

  const nextWeight = getNextAvailableWeight(weight, exerciseName, "up");
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

// Samma intervall som vilotimern visar — formaterat som tal i stället för
// klocka. Två separata tabeller gav tidigare olika besked till skärmen och
// till coachen.
function getRestTextForRir(rir: number, exerciseName = "") {
  return formatRestProse(getRestTargetRange(exerciseName, rir));
}

function buildGymComparison(args: {
  history: Workout[];
  currentGymId: string | null;
  currentGymName: string;
  gyms: Gym[];
}): CoachSetContext["gymComparison"] {
  const { history: hist, currentGymId, currentGymName, gyms } = args;
  if (!currentGymId || gyms.length <= 1) return undefined;

  const hasHistoryAtCurrentGym = hist.some((w) => w.gymId === currentGymId);
  const mostRecent = [...hist].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const differentFromLastSession = mostRecent ? mostRecent.gymId !== currentGymId : false;

  return { currentGymName, hasHistoryAtCurrentGym, differentFromLastSession };
}

const ESTABLISHED_GYM_SESSION_COUNT = 3;
const STALE_GYM_REFERENCE_DAYS = 30;

function getOtherGymReference(args: {
  history: Workout[];
  exerciseName: string;
  currentGymId: string | null;
  gyms: Gym[];
}): CoachSetContext["otherGymReference"] {
  const { history: hist, exerciseName, currentGymId, gyms } = args;
  if (!currentGymId || gyms.length <= 1) return undefined;

  const key = exerciseKey(exerciseName);
  const sorted = [...hist].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const sessionsAtCurrentGym = sorted.filter(
    (w) =>
      w.gymId === currentGymId &&
      w.exercises.some((e) => exerciseKey(e.name) === key && e.sets.length > 0)
  );

  const isEstablishedAtCurrentGym =
    sessionsAtCurrentGym.length >= ESTABLISHED_GYM_SESSION_COUNT;
  const daysSinceLastHere =
    sessionsAtCurrentGym.length > 0
      ? Math.round(
          (Date.now() - new Date(sessionsAtCurrentGym[0].startedAt).getTime()) / 86400000
        )
      : null;
  const isStale = daysSinceLastHere !== null && daysSinceLastHere > STALE_GYM_REFERENCE_DAYS;

  if (isEstablishedAtCurrentGym && !isStale) return undefined;

  for (const w of sorted) {
    if (!w.gymId || w.gymId === currentGymId) continue;
    const ex = w.exercises.find((e) => exerciseKey(e.name) === key);
    if (!ex || ex.sets.length === 0) continue;

    const lastSet = ex.sets[ex.sets.length - 1];
    const gymName = gyms.find((g) => g.id === w.gymId)?.name ?? w.gym;
    const daysAgo = Math.round(
      (Date.now() - new Date(w.startedAt).getTime()) / 86400000
    );

    return {
      gymName,
      weightText: `${lastSet.weight} kg`,
      repsText: `${lastSet.reps} reps`,
      rirText: typeof lastSet.rir === "number" ? `RIR ${lastSet.rir}` : undefined,
      daysAgo,
    };
  }

  return undefined;
}

function getGymCalibrationNote(args: {
  history: Workout[];
  exerciseNames: string[];
  currentGymId: string | null;
  currentGymName: string;
  gyms: Gym[];
}): string | undefined {
  const { history: hist, exerciseNames, currentGymId, currentGymName, gyms } = args;
  if (!currentGymId || gyms.length <= 1 || exerciseNames.length === 0) return undefined;

  const uncalibrated = exerciseNames.filter((name) => {
    const key = exerciseKey(name);
    const sessionsAtCurrentGym = hist.filter(
      (w) =>
        w.gymId === currentGymId &&
        w.exercises.some((e) => exerciseKey(e.name) === key && e.sets.length > 0)
    );
    return sessionsAtCurrentGym.length < ESTABLISHED_GYM_SESSION_COUNT;
  });

  if (uncalibrated.length === 0) return undefined;

  return `Tränar just nu på ${currentGymName}. Ännu inte kalibrerad här (färre än ${ESTABLISHED_GYM_SESSION_COUNT} pass): ${uncalibrated.join(", ")}.`;
}

function buildRecoveryContext(args: {
  exerciseName: string;
  history: Workout[];
}): CoachSetContext["recoveryContext"] {
  const { exerciseName, history } = args;
  if (history.length === 0) return undefined;

  const key = exerciseKey(exerciseName);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sorted = [...history].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const daysDiff = (isoStr: string) =>
    Math.round((now.getTime() - new Date(isoStr).getTime()) / 86400000);

  let exerciseLastTrainedDays: number | null = null;
  for (const w of sorted) {
    if (w.startedAt.slice(0, 10) === todayStr) continue;
    if (w.exercises.some((e) => exerciseKey(e.name) === key)) {
      exerciseLastTrainedDays = daysDiff(w.startedAt);
      break;
    }
  }

  const prevSession = sorted.find((w) => w.startedAt.slice(0, 10) !== todayStr);
  if (!prevSession && exerciseLastTrainedDays === null) return undefined;

  let previousSession: NonNullable<CoachSetContext["recoveryContext"]>["previousSession"];
  if (prevSession) {
    const totalSets = prevSession.exercises.reduce((s, e) => s + e.sets.length, 0);
    const anyRirZero = prevSession.exercises.some((e) =>
      e.sets.some((s) => typeof s.rir === "number" && s.rir <= 0)
    );
    const anyFail = prevSession.exercises.some((e) => e.sets.some((s) => s.failNote));
    previousSession = {
      daysAgo: daysDiff(prevSession.startedAt),
      exercises: prevSession.exercises.map((e) => e.name).slice(0, 4),
      wasHard: totalSets >= 12 || anyRirZero || anyFail,
    };
  }

  return { exerciseLastTrainedDays, previousSession };
}

/**
 * Strategin heter samma sak internt, men går ut till modellen på svenska.
 * Modellen ekar värden den ser: "backoff" kom tillbaka som "precis rätt
 * backoff" mitt i en svensk mening. Samma sak som fick oss att döpa om
 * topSet till bestSet — bara namnet på tråden byts, logiken är orörd.
 */
function toWireStrategy(strategy: NextSetPlan["strategy"]): CoachWireStrategy {
  if (strategy === "press") return "höj";
  if (strategy === "hold") return "behåll";
  if (strategy === "backoff") return "lättare igen";
  if (strategy === "reduce") return "sänk";
  return "övningen klar";
}

/**
 * Korttidsminnet av SAMTALET. Har användaren inte sagt något finns inget
 * samtal — då är fältet tomt.
 *
 * Tidigare skickades de senaste 8 raderna oavsett vem som sagt dem. I ett
 * tyst pass, där man loggar set utan att skriva, var alla åtta coachens
 * egna svar — och eftersom varje svar öppnade med setets siffror läste
 * modellen sex exempel på "så här börjar jag" och fortsatte. Instruktionen
 * kallade det dessutom "meddelanden från BÅDA sidor", vilket var osant.
 *
 * Fältets syfte är att veta vad ni pratat om (att axeln krånglar, att
 * maskinen var upptagen). Det syftet bärs av användarens repliker. Coachens
 * egna behövs bara som svar på dem — alltså när det faktiskt finns en dialog.
 */
function buildRecentConversation(
  chatLog: { role: string; text: string; source?: string }[],
  windowSize = 8
) {
  const window = chatLog
    .slice(-windowSize)
    .filter((m, i, arr) =>
      !(m.role === "coach" && m.source === "fallback") &&
      !(m.role === "you" && arr[i + 1]?.role === "coach" && arr[i + 1]?.source === "fallback")
    );

  if (!window.some((m) => m.role === "you")) return [];

  return window
    .map((m) => `${m.role === "you" ? "Användaren" : "Coach"}: ${m.text}`)
    .filter(Boolean);
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
  sessionsAtTopWeight?: number;
  lastCoachMessage?: string;
  memoryInsight?: string;
  limitations?: string;
  nearestWeights?: { up: number; down: number };
  recentHealthNotes?: CoachHealthNote[];
  recentWorkingWeights?: string[];
  warmupContext: WarmupContext | null;
  conditioningContext: ConditioningContext | null;
  gymComparison?: CoachSetContext["gymComparison"];
  otherGymReference?: CoachSetContext["otherGymReference"];
  recoveryContext?: CoachSetContext["recoveryContext"];
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
  // Koderna gick tidigare ut på engelska snake_case och ekade tillbaka:
  // "backoff_after_hard_set" kom ut som "precis den kontrollerade backoff".
  // Läses bara av modellen, aldrig av klienten — alltså skrivs de som en
  // tränare hade sagt dem. Samma skäl som toWireStrategy.
  const decisionReasonCode = (() => {
    if (args.nextSetPlan.reason.toLowerCase().includes("extraset")) {
      return "extraset som avslut";
    }

    if (sameWeightTrend.tooEasy) {
      return args.nextSetPlan.strategy === "complete"
        ? "för lätt — höj till nästa gång"
        : "för lätt — höj nu";
    }

    if (isTimedSet) {
      return args.nextSetPlan.strategy === "complete"
        ? "planerade set klara"
        : "behåller vikten";
    }

    if (args.nextSetPlan.strategy === "complete") {
      if (failText.includes("ont") || failText.includes("smärta")) return "stopp på grund av smärta";
      if (args.rir <= 0) return "tungt sista set, övningen klar";

      // Motorn stryker planens sista set när de föregående gått hårt nog —
      // ett fjärde set då ger trötthet, inte stimulans. Utan den här raden
      // fick coachen "planerade set klara", vilket var OSANT (3 av 4) och
      // dessutom det enda den visste. Den kunde alltså inte förklara varför
      // ett set försvann, och användaren såg schemat lova fyra och få tre.
      if (
        typeof plannedSetCount === "number" &&
        args.setNumber < plannedSetCount
      ) {
        return `${args.setNumber} hårda set räckte, sista i planen stryks`;
      }

      return "planerade set klara";
    }

    if (args.nextSetPlan.strategy === "reduce") {
      if (hasUserReportedTechniqueOrPain) return "användaren sa att något kändes fel";
      if (args.rir <= 0) return "gick till stopp, sänker vikten";
      return "sänker för fler bra reps";
    }

    if (args.nextSetPlan.strategy === "backoff") {
      if (typeof rirChange === "number" && rirChange <= -2) return "tydligt mindre kvar i tanken";
      if (args.rir <= 0) return "gick till stopp, lättare nu";
      return "lättare efter ett tungt set";
    }

    if (args.nextSetPlan.strategy === "press") return "utrymme att höja";

    if (
      args.nextSetPlan.strategy === "hold" &&
      args.nextSetPlan.reason.toLowerCase().includes("repsspannet")
    ) {
      return "under repsmålet men med reps kvar";
    }

    if (previousSet && args.weight === previousSet.weight && args.reps === previousSet.reps) {
      if (typeof rirChange === "number" && rirChange > 0) return "samma jobb, mer kvar i tanken";
      if (typeof rirChange === "number" && rirChange < 0) return "samma jobb, mindre kvar i tanken";
      return "samma jobb igen";
    }

    if (previousSet && args.weight === previousSet.weight && args.reps > previousSet.reps) {
      return "fler reps på samma vikt";
    }

    return "behåller vikten";
  })();

  if (args.personalRecordText) signals.push("personal_record");
  if (args.nextSetPlan.reason.toLowerCase().includes("enda övning")) {
    signals.push("solo_muscle_group_final_set");
  }
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
    // Betydelsen först, siffrorna sen. Tidigare låg currentSet/previousSet
    // överst med samma fakta i tre representationer (tal, loadText, setText)
    // medan PB, utveckling och minne låg längst ner — payloaden var framtung
    // på siffror och baktung på mening, och svaren speglade den. loadText är
    // borta helt: den sa exakt vad setText redan säger, och lästes ingenstans.
    personalRecordText: args.personalRecordText || undefined,
    sessionsAtTopWeight: args.sessionsAtTopWeight,
    currentSet: {
      weight: args.weight,
      reps: args.reps,
      durationSeconds: args.durationSeconds,
      metricType: args.metricType,
      rir: isTimedSet ? undefined : args.rir,
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
    progressionOpportunity: progressionOpportunity
      ? {
          type: progressionOpportunity.type,
          confidence: progressionOpportunity.confidence,
          suggestedLoadText: progressionOpportunity.suggestedWeight,
          tone: progressionOpportunity.tone,
        }
      : undefined,
    decisionFacts: {
      strategy: toWireStrategy(args.nextSetPlan.strategy),
      reasonCode: decisionReasonCode,
      weightChangeKg,
      repsChange,
      rirChange,
      shouldMentionTechniqueCue,
    },
    nextTarget: {
      weight: args.nextWeight,
      loadText: nextLoadText,
      repsText: args.nextSetPlan.repsText,
      rirText: args.nextSetPlan.rirText,
      strategy: toWireStrategy(args.nextSetPlan.strategy),
      reason: decisionReasonCode,
      techniqueCue: shouldMentionTechniqueCue
        ? args.nextSetPlan.techniqueCue
        : undefined,
    },
    restText: args.nextSetPlan.restText,
    memoryInsight: args.memoryInsight?.trim() || undefined,
    limitations: args.limitations?.trim() || undefined,
    nearestWeights: args.nearestWeights,
    recentHealthNotes: args.recentHealthNotes?.length ? args.recentHealthNotes : undefined,
    recentWorkingWeights: args.recentWorkingWeights?.length ? args.recentWorkingWeights : undefined,
    warmupNote: args.warmupContext?.note,
    conditioningNote: args.conditioningContext?.note,
    computedSignals: signals,
    gymComparison: args.gymComparison,
    otherGymReference: args.otherGymReference,
    recoveryContext: args.recoveryContext,
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
  const result: {
    improved: string[];
    same: string[];
    worse: string[];
  } = {
    improved: [],
    same: [],
    worse: [],
  };

  if (history.length === 0) return result;

  const [latest, ...rest] = history;

  for (const ex of latest.exercises) {
    if (ex.sets.length === 0) continue;

    const bestLatest = getBestSetFromSets(ex.sets);
    if (!bestLatest) continue;

    const [bestPrev] = getExerciseBestSets(rest, ex.name, 1);
    if (!bestPrev) continue;

    const latestScore = getLoggedSetScore(bestLatest);
    const prevScore = getLoggedSetScore(bestPrev);

    if (latestScore > prevScore) {
      result.improved.push(ex.name);
    } else if (latestScore === prevScore) {
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

function getRecentHealthNotes(
  coachMemory: CoachMemory,
  limit = 5
): CoachHealthNote[] {
  return coachMemory.notes
    .filter((note) => note.kind === "limitation")
    .slice(0, limit)
    .reverse()
    .map((note) => ({
      text: note.text,
      daysAgo: Math.max(
        0,
        Math.round((Date.now() - new Date(note.createdAt).getTime()) / 86400000)
      ),
      exerciseName: note.exerciseName,
    }));
}
export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [authGateCleared, setAuthGateCleared] = useState(false);
  const [started, setStarted] = useState(false);
  const [staleDraft, setStaleDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [workoutReview, setWorkoutReview] = useState<WorkoutReview | null>(null);
  const [workoutReviewLoading, setWorkoutReviewLoading] = useState(false);
  const [latestCompletedReview, setLatestCompletedReview] =
  useState<WorkoutReview | null>(null);
  const exerciseInputKeyRef = useRef("");
  const exerciseIndexRef = useRef(0);
  const [now, setNow] = useState<Date>(new Date());
  const [gym, setGym] = useState<string>("");
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [lastGymConfirmedDate, setLastGymConfirmedDate] = useState<string | null>(null);
  const [lastPass, setLastPass] = useState<PassType | null>(null);
  const [lobbyCoachText, setLobbyCoachText] = useState<string>(() => loadJSON<string>("lobbyCoachText", ""));
  const [coachMemory, setCoachMemory] = useState<CoachMemory>({ notes: [] });
const [workoutComplete, setWorkoutComplete] = useState(false);
const [showDailyPlan, setShowDailyPlan] = useState(false);
const [hasAcceptedTrainingSafety, setHasAcceptedTrainingSafety] = useState(false);
// Sant så fort användaren loggat sitt allra första set. Enda syftet är att
// visa uppvärmningshinten en gång — inte varje pass i all framtid.
const [hasLoggedFirstSetEver, setHasLoggedFirstSetEver] = useState(true);
// Har användaren själv rört vikt, reps eller RIR sedan siffrorna hamnade där?
// Avgör om kortet säger SENAST (siffrorna kommer från något du redan gjort)
// eller DITT SET (du har valt dem). Nollställs vid ny övning och efter varje
// loggat set — då står fälten kvar med det du just gjorde, vilket är historik
// igen, inte ett val.
const [inputsTouched, setInputsTouched] = useState(false);
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
  const [exerciseProgressOrigin, setExerciseProgressOrigin] = useState<
    "statistics" | "history" | "personalRecords" | null
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
    exerciseName?: string;
    source?: "engine" | "llm" | "fallback" | "video";
    highlight?: boolean;
    eventKey?: string;
  }[]
>([]);
const [coachPendingReply, setCoachPendingReply] = useState(false);
// Övning som coachen presenterat i ett eget chattsvar vid ett byte. Hindrar
// att passvyn lägger ett intro ovanpå — se replyFromAi.
const [exerciseAlreadyIntroduced, setExerciseAlreadyIntroduced] = useState<
  string | null
>(null);
const [nameInput, setNameInput] = useState("");
const [ageInput, setAgeInput] = useState("");
const [genderInput, setGenderInput] =
  useState<UserProfile["gender"]>("vill-inte-saga");
const [trainingExperienceInput, setTrainingExperienceInput] =
  useState<NonNullable<UserProfile["trainingExperience"]> | null>(null);
const [daysPerWeekInput, setDaysPerWeekInput] = useState("3");
const [minutesPerSessionInput, setMinutesPerSessionInput] = useState("");
const [locationInput, setLocationInput] = useState<UserProfile["location"] | null>(null);
const [equipmentInput, setEquipmentInput] = useState<string[]>([]);
const [exercisePreferencesInput, setExercisePreferencesInput] = useState<string[]>([]);
const [limitationsInput, setLimitationsInput] = useState("");
const [goalInput, setGoalInput] = useState<
  "muskel" | "styrka" | "fett" | null
>(null);
const [secondaryGoalsInput, setSecondaryGoalsInput] = useState<
  ("muskel" | "styrka" | "fett")[]
>([]);
const [programStartModeInput, setProgramStartModeInput] =
  useState<ProgramStartMode>("coach");

const [editingProfile, setEditingProfile] = useState(false);
const [pendingProfileChange, setPendingProfileChange] = useState<UserProfile | null>(null);

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
const [showProgramReview, setShowProgramReview] = useState(false);
const [programPreferences, setProgramPreferences] = useState<string[]>([]);
const [programChatInput, setProgramChatInput] = useState("");
const [programChatLog, setProgramChatLog] = useState<
  { role: "you" | "coach"; text: string }[]
>([]);
// "failed": bygget gick inte igenom. Vi sparar då INGET program — tidigare
// skrevs ett hårdkodat reservprogram in och presenterades som om coachen
// byggt det ("Jag har byggt ett tryggt grundupplägg"). Det är att hitta på
// ett författarskap: coachen har inte gjort någonting, anropet dog. Hellre
// ett ärligt besked och en knapp som försöker igen.
const [programBuildStatus, setProgramBuildStatus] = useState<
  "idle" | "building" | "ready" | "fallback" | "failed"
>("idle");
const [programBuildScreenVisible, setProgramBuildScreenVisible] =
  useState(false);
const [customWorkoutPlan, setCustomWorkoutPlan] =
  useState<StoredWorkoutPlan | null>(null);
const [passDisplayNamesByPass, setPassDisplayNamesByPass] =
  useState<PassDisplayNamesByPass>({});
const renamePass = (passKey: PassType, displayName: string) => {
  const nextNames = {
    ...passDisplayNamesByPass,
    [passKey]: displayName.trim(),
  };
  setPassDisplayNamesByPass(nextNames);
  saveJSON("passDisplayNamesByPass", nextNames);
};
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

    if (savedGym) setGym(repairMojibake(savedGym));
    setLastGymConfirmedDate(localStorage.getItem("lastGymConfirmedDate"));

    const savedGyms = loadJSON<Gym[]>("gyms", []);
    if (savedGyms.length > 0) {
      const repairedGyms = savedGyms.map((g) => ({ ...g, name: repairMojibake(g.name) }));
      setGyms(repairedGyms);
      if (repairedGyms.some((g, i) => g.name !== savedGyms[i].name)) {
        localStorage.setItem("gyms", JSON.stringify(repairedGyms));
      }
      const savedActiveGymId = localStorage.getItem("lastGymId");
      setActiveGymId(savedActiveGymId ?? repairedGyms[0].id);
    } else if (savedGym) {
      const repairedGym = repairMojibake(savedGym);
      const migratedGym: Gym = { id: crypto.randomUUID(), name: repairedGym, createdAt: new Date().toISOString() };
      setGyms([migratedGym]);
      setActiveGymId(migratedGym.id);
      localStorage.setItem("gyms", JSON.stringify([migratedGym]));
      localStorage.setItem("lastGymId", migratedGym.id);
    }

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
    setHasLoggedFirstSetEver(loadJSON<boolean>("loggedFirstSetEver", false));
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
  const draftDate = new Date(activeWorkoutDraft.workout.startedAt);
  const today = new Date();
  const isStale =
    draftDate.getFullYear() !== today.getFullYear() ||
    draftDate.getMonth() !== today.getMonth() ||
    draftDate.getDate() !== today.getDate();

  if (isStale) {
    setStaleDraft(activeWorkoutDraft);
  } else {
    setWorkout(activeWorkoutDraft.workout);
    setExerciseIndex(activeWorkoutDraft.exerciseIndex ?? 0);
    setSkippedExercise(activeWorkoutDraft.skippedExercise ?? null);
    setChatLog((activeWorkoutDraft.chatLog ?? []).filter((m) => m.source !== "fallback"));
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

async function requestAiWorkoutPlanWithRetry(
  profile: UserProfile,
  fallbackPlan: BuiltWorkoutPlan
) {
  const context = {
    kind: "program_build" as const,
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
    recentHealthNotes: getRecentHealthNotes(coachMemory),
  };

  let result = await requestAiProgramBuild({ context, fallbackPlan });

  if (result.mode !== "ai") {
    console.warn(`Program build fallback, retrying once: ${result.reason ?? "unknown"}`);
    result = await requestAiProgramBuild({ context, fallbackPlan });
  }

  if (result.mode !== "ai") {
    console.warn(`Program build fallback after retry: ${result.reason ?? "unknown"}`);
  }

  return result;
}

async function buildAiWorkoutPlanForProfile(profile: UserProfile) {
  const fallbackPlan = buildProgramFallbackPlan(profile);
  const signature = getProgramProfileSignature(profile);
  const buildStartedAt = Date.now();

  setProgramBuildScreenVisible(true);
  setProgramBuildStatus("building");

  const result = await requestAiWorkoutPlanWithRetry(profile, fallbackPlan);

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
    if (result.mode !== "ai") {
      // Se kommentaren vid programBuildStatus: inget program sparas när
      // bygget misslyckas. Byggskärmen stannar kvar med felet.
      setProgramBuildStatus("failed");
      return;
    }

    setCustomWorkoutPlan(nextPlan);
    saveJSON("customWorkoutPlan", nextPlan);
    setProgramBuildStatus("ready");
    setProgramBuildScreenVisible(false);
  }, waitTime);
}

async function askProgramCoach(message: string) {
  const cleanMessage = message.trim();
  if (!cleanMessage || !workoutPlan) return;

  setProgramChatLog((prev) => [...prev, { role: "you", text: cleanMessage }]);

  const nextPreferences = [cleanMessage, ...programPreferences].slice(0, 12);
  setProgramPreferences(nextPreferences);
  saveJSON("programPreferences", nextPreferences);

  const reply = await requestAiProgramReply({
    context: {
      kind: "program_input",
      userName: profileName,
      userMessage: cleanMessage,
      goalPrimary: userProfile?.goalPrimary ?? "styrka",
      goalSecondary: userProfile?.goalSecondary,
      daysPerWeek: userProfile?.daysPerWeek ?? workoutPlan.daysPerWeek,
      minutesPerSession: userProfile?.minutesPerSession ?? 60,
      location: userProfile?.location ?? "gym",
      equipment: userProfile?.equipment ?? [],
      exercisePreferences: userProfile?.exercisePreferences ?? [],
      limitations: userProfile?.limitations,
      recentHealthNotes: getRecentHealthNotes(coachMemory),
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
      existingPreferences: nextPreferences,
    },
    fallbackReply:
      'Jag är inte helt säker på vad du menar. Skriv gärna lite tydligare, till exempel "varför ligger knäböj i upplägget?" eller "jag har ont i knät".',
  });

  setProgramChatLog((prev) => [...prev, { role: "coach", text: reply.text }]);
}

const PROGRAM_CHECKIN_OPENER =
  "Redo att köra igång tillsammans, eller något du undrar över först?";

useEffect(() => {
  if (!userProfile || !showProgramReview || !workoutPlan) return;
  if (programChatLog.length > 0) return;
  setProgramChatLog([{ role: "coach", text: PROGRAM_CHECKIN_OPENER }]);
}, [userProfile, showProgramReview, workoutPlan, programChatLog.length]);

function applyProfileAndRebuild(profile: UserProfile) {
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
  setPendingProfileChange(null);
  setProgramBuildStatus(nextCustomPlan ? "idle" : "building");
  setProgramBuildScreenVisible(!nextCustomPlan);
  setShowProgramReview(true);
  saveJSON("approvedWorkoutPlan", false);
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
      setCustomExercisesByPass(createEmptyPassStringMap());
      setRemovedExercisesByPass(createEmptyPassStringMap());
      setExerciseOverridesByPass(createEmptyPassOverrideMap());
      setPassDisplayNamesByPass({});
      saveJSON("customExercisesByPass", createEmptyPassStringMap());
      saveJSON("removedExercisesByPass", createEmptyPassStringMap());
      saveJSON("exerciseOverridesByPass", createEmptyPassOverrideMap());
      saveJSON("passDisplayNamesByPass", {});
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

    const result = await requestAiWorkoutPlanWithRetry(activeProfile, fallbackPlan);

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

      if (result.mode !== "ai") {
        // Spara ingenting och lämna byggskärmen uppe — den visar felet och
        // en försök igen-knapp i stället för ett program coachen inte byggt.
        setProgramBuildStatus("failed");
        return;
      }

      setCustomWorkoutPlan(nextPlan);
      saveJSON("customWorkoutPlan", nextPlan);
      setProgramBuildStatus("ready");
      setProgramBuildScreenVisible(false);
    }, waitTime);
  }

  run();

  return () => {
    cancelled = true;
    if (finishTimer) window.clearTimeout(finishTimer);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

// Första passet på ett nytt gym ska ge TOM historik, inte hela historiken.
// Raden här föll tidigare tillbaka på allt när gymmet saknade pass, så
// motorn planerade från en annan maskins vikter: 52,5 kg föreslogs på ett
// gym där ingenting loggats. Utan fallbacken behandlas övningen som ny och
// kalibreras — och otherGymReference, som finns för precis det läget, får
// göra sitt jobb och berätta vad som togs på det andra gymmet.
const gymFilteredHistory = useMemo(() => {
  if (!activeGymId) return history;
  return history.filter((w) => w.gymId === activeGymId);
}, [history, activeGymId]);

const otherGymReference = useMemo(() => {
  if (!currentExerciseName) return undefined;
  return getOtherGymReference({
    history,
    exerciseName: currentExerciseName,
    currentGymId: activeGymId,
    gyms,
  });
}, [history, currentExerciseName, activeGymId, gyms]);

const progressionHistory = useMemo(() => {
  const baseHistory = workout ? [workout, ...gymFilteredHistory] : gymFilteredHistory;
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

  // personalRecords är globalt, inte per gym. gymFilteredHistory är HELA det
  // aktuella gymmets historik — inget fönster — så saknas PB:t där sattes det
  // någon annanstans, och då hör det inte hemma i planeringen för den här
  // maskinen. Utan kontrollen stoppades PB:t tillbaka in nedan, dessutom
  // stämplat med dagens gym, och coachen fortsatte föreslå den andra maskinens
  // vikt även efter att en riktig nivå loggats här.
  //
  // Hittas PB:t inte i den fulla historiken heller är det föräldralöst (t.ex.
  // importerat) — då är injektionen fortfarande rätt.
  const prBelongsToAnotherGym =
    Boolean(activeGymId) &&
    history.some((item) =>
      item.exercises.some(
        (exercise) =>
          exerciseKey(exercise.name) === exerciseKey(currentExerciseName) &&
          exercise.sets.some(
            (set) => set.weight === pr.weight && set.reps === pr.reps
          )
      )
    );

  if (prBelongsToAnotherGym) return baseHistory;

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
}, [
  activeGymId,
  currentExerciseName,
  gymFilteredHistory,
  history,
  nextPass,
  personalRecords,
  workout,
]);

const progression = useMemo(() => {
  if (!currentExerciseName) return [];

  // progressionHistory, inte history. Den här listan blir coachens "ditt bästa
  // set", och byggd på hela historiken berättade den om en annan maskin på ett
  // annat gym: "52,5 — samma som ditt bästa" på ett gym där ingenting loggats.
  // Vikten appen föreslår har varit gymmedveten sedan 02aa866; det var bara
  // coachens minne av den som inte var det. Samma historik nu, inte två.
  //
  // PB:t läggs inte till separat längre — progressionHistory injicerar det
  // redan när det hör hemma här, och låter bli när det sattes på ett annat
  // gym. Faktumet går inte förlorat: otherGymReference bär det, med gymnamnet.
  const savedProgression = getExerciseProgression(
    progressionHistory,
    currentExerciseName
  );
  const currentWorkoutExercise = workout?.exercises.find(
    (exercise) => exerciseKey(exercise.name) === exerciseKey(currentExerciseName)
  );
  const currentWorkoutBest = currentWorkoutExercise
    ? getBestSetFromSets(currentWorkoutExercise.sets)
    : null;

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
}, [progressionHistory, currentExerciseName, workout]);

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
 
// Skannar hela det pågående passet (inte bara historik) — ett
// kalibreringstest ska aldrig föreslås om något redan gjort ont eller
// avbrutits idag, oavsett vilken övning det gällde.
const sessionHasPainFlag = useMemo(() => {
  if (!workout) return false;
  return workout.exercises.some((exercise) =>
    exercise.sets.some((set) => {
      if (!set.failNote) return false;
      const text = set.failNote.toLowerCase();
      return (
        text.includes("ont") ||
        text.includes("smärta") ||
        text.includes("känning")
      );
    })
  );
}, [workout]);

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
      sessionsAtTopWeight: 0,
    } satisfies ExerciseProgressionPlan;
  }

  return buildProgressionPlan({
    history: progressionHistory,
    exerciseName: currentExerciseName,
    targetReps: goalTargets.targetReps,
    dayForm,
    sessionHasPainFlag,
  });
}, [currentExerciseName, progressionHistory, goalTargets.targetReps, dayForm, sessionHasPainFlag]);


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

exerciseIndexRef.current = exerciseIndex;

// När du byter övning: fyll i vad du FAKTISKT körde senast på den övningen.
//
// Fälten är historik, inte ordination. Coachen säger vad du ska köra, du
// knappar in det. Tidigare skrev motorn in sitt eget förslag här, vilket
// gjorde UI:t till en andra röst som kunde säga emot coachen — coachen bad
// dig sänka medan fältet visade en höjning, eller visade RIR 0 efter att du
// nämnt smärta. Motorns förslag finns kvar, men bara som underlag TILL
// coachen (progressionPlan -> coachData), aldrig som en siffra på skärmen.
useEffect(() => {
  if (!started) return;
  if (!currentExerciseName) return;
  const nextExerciseKey = exerciseKey(currentExerciseName);

  if (exerciseInputKeyRef.current === nextExerciseKey) return;

  exerciseInputKeyRef.current = nextExerciseKey;

  const last = lastByExercise[nextExerciseKey];
  const lastWeight =
    last && !isBodyweightExercise(currentExerciseName) && last.weight > 0
      ? formatWeightInput(last.weight)
      : "";
  // Bara vikten ärvs. Vikt är ett VAL du gör före setet, och "samma som sist"
  // är en rimlig utgångspunkt. Reps och RIR är UTFALL — de går inte att veta
  // i förväg, och förifyllda med förra veckans resultat läste de som ett mål:
  // kortet visade "6+ reps · RIR 0" medan coachen bad om ett kontrollerat
  // test på tyngre vikt. Plustecknet kom dessutom av en nolla som ärvts från
  // ett set en vecka tillbaka, på ett annat gym.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setWeightInput(lastWeight);
  systemSuggestedWeightRef.current = lastWeight ? parseFloat(lastWeight) || undefined : undefined;
  setRepsInput("");
  systemSuggestedRepsRef.current = undefined;
  setRirInput(2);
  setInputsTouched(false);
}, [currentExerciseName, started, lastByExercise]);


function confirmGymForToday() {
    const todayStr = new Date().toISOString().slice(0, 10);
    setLastGymConfirmedDate(todayStr);
    localStorage.setItem("lastGymConfirmedDate", todayStr);
  }

  /**
   * Enda vägen in för ai_fallback-händelser.
   *
   * Chatten och setrutten hade var sin nästan identiska kopia av det här
   * blocket, och övningsintrot hade ingen alls — rutten returnerade en orsak
   * som klienten kastade i sista steget. Resultatet: en gul prick i chatten
   * utan att någon kunde se varför coachen tystnade.
   *
   * En väg in, så nästa röst vi lägger till inte faller tillbaka osynligt.
   */
  function recordAiFallback(
    route: "set" | "chat" | "exercise_intro",
    reason?: string,
    exerciseName?: string
  ) {
    if (!reason) return;

    setWorkout((prev) =>
      prev
        ? addWorkoutEventToWorkout(prev, {
            type: "ai_fallback",
            route,
            reason,
            exerciseName: exerciseName || currentExerciseName || undefined,
          })
        : prev
    );
  }

  /**
   * Lindar en fältsättare så att varje ändring användaren gör själv räknas som
   * "rörd". Läggs på när propsen skickas ner, inte i varje knapp i
   * ExerciseCard — annars hade det blivit ett dussin ställen att glömma.
   * Appens egna skrivningar (förifyllning, nollställning) går förbi den här.
   */
  function markTouched<T>(
    setter: Dispatch<SetStateAction<T>>
  ): Dispatch<SetStateAction<T>> {
    return (value) => {
      setInputsTouched(true);
      setter(value);
    };
  }

  function addGym(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newGym: Gym = { id: crypto.randomUUID(), name: trimmed, createdAt: new Date().toISOString() };
    const updated = [...gyms, newGym];
    setGyms(updated);
    setActiveGymId(newGym.id);
    setGym(newGym.name);
    localStorage.setItem("gyms", JSON.stringify(updated));
    localStorage.setItem("lastGymId", newGym.id);
    confirmGymForToday();
  }

  function selectGym(id: string) {
    const found = gyms.find((g) => g.id === id);
    if (!found) return;
    setActiveGymId(id);
    setGym(found.name);
    localStorage.setItem("lastGymId", id);
    confirmGymForToday();
  }

  function renameGym(id: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = gyms.map((g) => g.id === id ? { ...g, name: trimmed } : g);
    setGyms(updated);
    localStorage.setItem("gyms", JSON.stringify(updated));
    if (id === activeGymId) setGym(trimmed);
  }

  function updateGymOverride(gymId: string, originalName: string, overrideName: string) {
    const updated = gyms.map((g) => {
      if (g.id !== gymId) return g;
      const overrides = { ...(g.exerciseOverrides ?? {}) };
      if (overrideName.trim()) {
        overrides[originalName] = overrideName.trim();
      } else {
        delete overrides[originalName];
      }
      return { ...g, exerciseOverrides: overrides };
    });
    setGyms(updated);
    localStorage.setItem("gyms", JSON.stringify(updated));
  }

  // Ett gym: auto-valt, ingen anledning att fråga. Två eller fler: bekräftelse
  // krävs en gång per kalenderdag — bara ett tryck om rätt gym redan är valt,
  // inte ett nytt val varje gång. Noll gym hanteras inte här längre —
  // startWorkout skapar då tyst ett förvalt gym istället för att blockera
  // (namngivning ska bara krävas när det faktiskt finns fler än ett att
  // skilja på).
  //
  // Tröskeln gick tidigare vid fler än TVÅ gym. Men redan vid två är det
  // sällan självklart vilket man står i, och vikterna skiljer sig mellan dem —
  // startar man på fel gym planeras hela passet från fel maskin.
  const gymConfirmationRequired =
    gyms.length > 1 && lastGymConfirmedDate !== new Date().toISOString().slice(0, 10);

  function startWorkout() {
  if (!nextPlannedPass || !workoutPlan) return;

  let startGyms = gyms;
  let startGymName = gym;
  let startGymId = activeGymId;

  if (gyms.length === 0) {
    // Inget gym finns än. Istället för att kräva att användaren döper ett
    // manuellt innan hen ens kommit igång (bekräftat i stresstest: blockerade
    // en förstagångsanvändare) skapar vi ett enda, ärligt namngivet gym
    // automatiskt utifrån platsen från onboardingen — inte en hittepå-specifik
    // plats som den borttagna Sjöviksgymmet-defaulten, bara en generisk
    // etikett användaren när som helst kan döpa om via "Byt namn".
    const defaultGymName = userProfile?.location === "hemma" ? "Hemma" : "Mitt gym";
    const newGym: Gym = { id: crypto.randomUUID(), name: defaultGymName, createdAt: new Date().toISOString() };
    startGyms = [...gyms, newGym];
    startGymName = newGym.name;
    startGymId = newGym.id;
    setGyms(startGyms);
    setActiveGymId(newGym.id);
    setGym(newGym.name);
    localStorage.setItem("gyms", JSON.stringify(startGyms));
    localStorage.setItem("lastGymId", newGym.id);
    confirmGymForToday();
  } else if (gymConfirmationRequired) {
    return;
  }

  const warmupContext = null;
  const conditioningContext = null;

  const startedAt = new Date();
const w: Workout = {
  id: crypto.randomUUID(),
  startedAt: startedAt.toISOString(),
  gym: startGymName,
  gymId: startGymId ?? undefined,
  pass: nextPass,
  displayName: cleanPassDisplayLabel(
    nextPlannedPass?.displayName ?? `Pass ${nextPass}`
  ),
  planTitle: workoutPlan?.title,
  exercises: plan.map((name: string) => {
    const activeGym = startGyms.find((g) => g.id === startGymId);
    const resolvedName = activeGym?.exerciseOverrides?.[name] ?? name;
    const plannedExercise = nextPlannedPass.exercises.find(
      (exercise) => exerciseKey(exercise.name) === exerciseKey(name)
    );

    return {
      name: resolvedName,
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
    setSwapFrom(null);
    setSwapToInput("");
    setDayForm("normal");
    setActiveWarmupContext(warmupContext);
    setActiveConditioningContext(conditioningContext);
    setNow(startedAt);
const firstExerciseName = plan[0] ?? "";
const firstExercisePlan = firstExerciseName
  ? buildProgressionPlan({
      history: getProgressionHistoryForExercise(firstExerciseName, gymFilteredHistory, {
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

// Fyll i vad du faktiskt körde senast på första övningen — se effekten för
// övningsbyte ovan: fälten är historik, coachen ordinerar.
exerciseInputKeyRef.current = firstExerciseName ? exerciseKey(firstExerciseName) : "";
const firstLast = firstExerciseName ? lastByExercise[exerciseKey(firstExerciseName)] : undefined;
const firstExerciseWeight =
  firstLast && firstExerciseName && !isBodyweightExercise(firstExerciseName) && firstLast.weight > 0
    ? formatWeightInput(firstLast.weight)
    : "";
setWeightInput(firstExerciseWeight);
systemSuggestedWeightRef.current = firstExerciseWeight ? parseFloat(firstExerciseWeight) || undefined : undefined;
// Bara vikten, samma skäl som i effekten ovan: reps och RIR är utfall, inte
// val, och förifyllda i förväg läses de som ett mål.
setRepsInput("");
systemSuggestedRepsRef.current = undefined;
setRirInput(2);
setInputsTouched(false);
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
    action?: CoachChatAction | null;
  }) => {
    if (
      response.mode === "ai" &&
      response.action?.type === "replace_exercise" &&
      exerciseKey(response.action.fromExerciseName) === exerciseKey(currentExerciseName) &&
      exerciseKey(response.action.toExerciseName) !== exerciseKey(currentExerciseName)
    ) {
      // silent: coachens egen replik nedan ÄR bekräftelsen. Utan det postar
      // motorn "Bra, vi kör X istället" och coachen säger samma sak direkt
      // efter — de två systemmeddelanden Codex reagerade på.
      const result = replaceExerciseInCurrentWorkout(
        response.action.fromExerciseName,
        response.action.toExerciseName,
        { silent: true }
      );
      if (result.handled) {
        // Coachens svar ÄR presentationen av den nya övningen. Utan det här
        // kom först "Bra, vi kör hantelpress istället" och direkt efter ett
        // fullt intro av samma övning — två systemmeddelanden i rad.
        // Sätts bara här: de två andra bytesvägarna säger ingenting alls, och
        // där är introt den enda rösten.
        // Det UPPLÖSTA namnet, inte AI:ns råa. Sa den "rumänsk marklyft" heter
        // övningen "Rumänska marklyft" i passet — jämför man mot råtexten
        // matchar nyckeln inte och introt slipper igenom ändå.
        setExerciseAlreadyIntroduced(
          result.replacedWith ?? response.action.toExerciseName
        );
        reply(response.text, "llm");
      } else {
        // Bytet gick INTE igenom — namnet behövde förtydligas, övningen låg
        // redan i passet, eller biblioteket kände inte igen den. Motorn är
        // tystad här för att coachen ska äga rösten, så säger vi ingenting
        // blir det en tom bubbla och en snurra som aldrig slutar (reply() är
        // det enda som nollställer coachPendingReply). Coachens egen text
        // duger inte: den utgår från att bytet skedde.
        reply(result.message ?? response.text, "llm");
      }
    } else {
      reply(response.text, response.mode === "ai" ? "llm" : "fallback");
    }

    if (response.mode === "ai" && response.action?.type === "note_limitation" && workout) {
      saveCoachNotes([
        {
          createdAt: new Date().toISOString(),
          pass: workout.pass,
          gym,
          exerciseName: currentExerciseName,
          text: response.action.text,
          kind: "limitation",
        },
      ]);
    }
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
  const lastCoachMessageEntry = [...chatLog]
    .reverse()
    .find((message) => message.role === "coach");
  const lastCoachMessage = lastCoachMessageEntry?.text || "";
  const lastCoachMessageWasVideoFeedback = lastCoachMessageEntry?.source === "video";
  const currentWorkoutExercise = workout?.exercises?.[exerciseIndex];
  const aiUnavailableReply = buildLocalWorkoutChatFallback({
    message: msg,
    userName: profileName,
    exerciseName: currentExerciseName,
    dayForm,
    currentSets: currentWorkoutExercise?.sets ?? [],
  });
  // Slimmad kontext för fria chattfrågor — set-coachen får sin egna fullständiga kontext separat.
  // Borttaget: activePlan, activePlanExerciseInfo, uiHints.
  // Slimmat: currentExerciseInfo (5 fält), currentCoachDecision (strategy + reason).
  const buildSlimChatContext = (overrides?: {
    dayForm?: DayForm | null;
    warmupContext?: WarmupContext | null;
    conditioningContext?: ConditioningContext | null;
  }): CoachChatContext => {
    const slimExerciseInfo = currentExerciseName
      ? (() => {
          const full = buildExerciseLibraryInfo(currentExerciseName);
          return {
            name: full.name,
            trains: full.trains,
            techniqueCue: full.techniqueCue,
            keepInMind: full.keepInMind,
            easierAlternative: full.easierAlternative,
          } as CoachExerciseLibraryInfo;
        })()
      : undefined;

    const slimDecision =
      currentWorkoutExercise && currentWorkoutExercise.sets.length > 0
        ? (() => {
            if (currentWorkoutExercise.completed) {
              return {
                strategy: toWireStrategy("complete"),
                reason: "Övningen är klar. Prata om nästa gång eller nästa övning, inte nästa set.",
              };
            }
            const latestSet =
              currentWorkoutExercise.sets[currentWorkoutExercise.sets.length - 1];
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
              dayForm: overrides?.dayForm ?? dayForm,
            });
            return { strategy: toWireStrategy(decision.strategy), reason: decision.reason };
          })()
        : undefined;

    return {
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
      currentExerciseInfo: slimExerciseInfo,
      memoryInsight: currentExerciseName
        ? buildExerciseMemoryInsight({ coachMemory, exerciseName: currentExerciseName })
        : undefined,
      limitations: userProfile?.limitations,
      recentHealthNotes: getRecentHealthNotes(coachMemory),
      recentWorkingWeights: currentExerciseName
        ? formatRecentWorkingWeights(getExerciseBestSets(gymFilteredHistory, currentExerciseName, 5))
        : undefined,
      exerciseIndex: workout ? exerciseIndex + 1 : undefined,
      exerciseCount: workout?.exercises.length,
      currentExerciseCompleted: Boolean(currentWorkoutExercise?.completed),
      // Hela dagens pass, en rad per övning. Utan det såg coachen bara den
      // aktuella övningen: den kunde ge en djup analys av bänkpressen, du gick
      // vidare, och två minuter senare visste den inte att bänkpressen ens
      // hänt. Övningar utan set står som "—", så "vad är kvar" syns i samma
      // rader. ~220 tecken för ett fullt pass, mot 3674 för chattinstruktionen.
      dagensPass: workout
        ? workout.exercises.map((exercise) => {
            const sets = exercise.sets.map((set) =>
              formatLoggedSetText({
                exerciseName: exercise.name,
                weight: set.weight,
                reps: set.reps,
                durationSeconds: set.durationSeconds,
                metricType: set.metricType,
                rir: set.rir,
              })
            );

            return `${exercise.name}: ${sets.length ? sets.join(", ") : "—"}`;
          })
        : undefined,
      currentSets: currentWorkoutExercise?.sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
        durationSeconds: set.durationSeconds,
        metricType: set.metricType,
        rir: set.rir,
        failNote: set.failNote,
      })),
      currentCoachDecision: slimDecision,
      progressionOpportunity: progressionPlan.opportunity
        ? {
            type: progressionPlan.opportunity.type,
            confidence: progressionPlan.opportunity.confidence,
            suggestedLoadText: `${progressionPlan.opportunity.suggestedWeight} kg`,
            tone: progressionPlan.opportunity.tone,
          }
        : undefined,
      heavierTestSet: progressionPlan.calibrationTestCandidate,
      // Samma personalRecords som avgör den blå PB-ramen på setsvaret. Läser
      // båda rösterna ur samma lagring kan de inte längre säga emot varandra.
      personalRecord: currentExerciseName
        ? (() => {
            const record = personalRecords[exerciseKey(currentExerciseName)];
            if (!record) return undefined;
            return {
              weight: record.weight,
              reps: record.reps,
              durationSeconds: record.durationSeconds,
              metricType: record.metricType,
            };
          })()
        : undefined,
      warmupNote: overrides?.warmupContext?.note ?? activeWarmupContext?.note,
      conditioningNote: overrides?.conditioningContext?.note ?? activeConditioningContext?.note,
      lastCoachMessageWasVideoFeedback,
      recentConversation: buildRecentConversation(chatLog, 10),
    };
  };

  const askAiCoach = async (fallbackReply: string, overrides?: {
    dayForm?: DayForm | null;
    warmupContext?: WarmupContext | null;
    conditioningContext?: ConditioningContext | null;
  }) => {
    const response = await requestAiCoachChatReply({
      context: buildSlimChatContext(overrides),
      fallbackReply,
    });

    if (response.mode !== "ai" && response.reason) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("MinCoach chat fallback", {
          reason: response.reason,
          message: msg,
          fallbackReply,
        });
      }
      recordAiFallback("chat", response.reason);
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


  if (routedIntent.topic === "equipment") {
    if (!workout || routedIntent.targetIndex === null) {
      reply("Okej. Vilken övning gäller det?");
      return;
    }

    const targetExercise = workout.exercises[routedIntent.targetIndex];

    const suggestion = suggestReplacementFor(targetExercise.name);
    if (suggestion) {
      const chatReply = await askAiCoach(
        `Okej. Då löser vi det.\n\n${targetExercise.name} funkar inte nu. Jag föreslår ${suggestion} istället. Säg till om du vill köra det, eller något annat.`
      );
      replyFromAi(chatReply);
      return;
    }

    const chatReply = await askAiCoach(
      `Okej. Då lämnar vi ${targetExercise.name} just nu.\n\nJag hittar ingen självklar ersättare här. Skriv vilken övning du vill ta istället, eller gå vidare.`
    );
    replyFromAi(chatReply);
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
      const chatReply = await askAiCoach(
        `Jag kan byta ${routedIntent.swapFrom} mot ${routedIntent.swapTo}. Bekräfta om du vill göra bytet.`
      );
      replyFromAi(chatReply);
      return;
    }

    const chatReply = await askAiCoach("Vilken övning vill du byta ut?");
    replyFromAi(chatReply);
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
  setCustomExerciseInput("");
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
  setCustomExerciseInput("");
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

const {
  workoutExerciseInput,
  setWorkoutExerciseInput,
  swapExerciseInput,
  setSwapExerciseInput,
  addExerciseToCurrentWorkout,
  replaceExerciseInCurrentWorkout,
  addExerciseDuringWorkout,
  swapCurrentExerciseDuringWorkout,
  pickExerciseForAdd,
  pickExerciseForSwap,
  pickCustomExerciseForAdd,
  pickCustomExerciseForSwap,
} = useExerciseSwapActions({
  workout,
  setWorkout,
  workoutPlan,
  exerciseIndex,
  setExerciseIndex,
  currentExerciseName,
  setChatLog,
  resetWorkoutInputs,
  setSwapFrom,
  setSwapToInput,
  skippedExercise,
  setSkippedExercise,
});

const { wrapped, story: wrappedStory, isOpen: isWrappedOpen, onClose: closeWrapped } =
  useWrappedRecap(
    history,
    userProfile?.name?.trim() || undefined,
    userProfile?.daysPerWeek ?? null
  );

useAutoAccountBackup(history, appTheme);

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
    if (targetIndex >= workout.exercises.length - 1) {
      setChatLog((prev) => [
        ...prev,
        {
          role: "coach",
          text: "Det här är sista övningen. Redan loggade set är sparade — du kan avsluta passet när du är redo.",
        },
      ]);
      return;
    }

    setExerciseIndex(targetIndex + 1);
    resetWorkoutInputs();
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text:
          coachText ??
          `Okej, vi lämnar ${exercise.name} här. De ${exercise.sets.length} set du loggat sparas.`,
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

function commitExerciseReorder(orderedRemainingNames: string[]) {
  if (!workout) return;

  const doneExercises = workout.exercises.filter((e) => e.sets.length > 0);
  const remainingByKey = new Map(
    workout.exercises
      .filter((e) => e.sets.length === 0)
      .map((e) => [exerciseKey(e.name), e])
  );
  const reorderedRemaining = orderedRemainingNames
    .map((name) => remainingByKey.get(exerciseKey(name)))
    .filter((e): e is Workout["exercises"][number] => Boolean(e));

  if (reorderedRemaining.length !== remainingByKey.size) return;

  const nextExercises = [...doneExercises, ...reorderedRemaining];

  setWorkout({ ...workout, exercises: nextExercises });

  // exerciseIndex lämnas medvetet orört: användaren stannar på samma PLATS
  // i kön, den följer inte med övningen som flyttades. Tidigare letade vi
  // upp var den aktuella övningen hamnade och hoppade dit — vilket gav två
  // fel samtidigt. Flyttade du bort övningen du stod på såg det ut som att
  // inget hände (du stod kvar på den), och övningen som tog dess plats
  // hamnade bakom dig och hoppades över vid nästa tryck.
}

function undoSkipExercise() {
  if (!workout || !skippedExercise) return;

  const alreadyReAdded = workout.exercises.some(
    (exercise) => exerciseKey(exercise.name) === exerciseKey(skippedExercise.exercise.name)
  );

  if (alreadyReAdded) {
    setSkippedExercise(null);
    return;
  }

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
  if (key.includes("latsdrag")) fallbackCandidates.push("Assisterade chins");
  if (key.includes("benspark")) fallbackCandidates.push("Goblet squat");
  if (key.includes("vadpress")) fallbackCandidates.push("Sittande vadpress");
  if (key.includes("sidolyft")) fallbackCandidates.push("Axelpress");
  if (key.includes("rodd")) {
    fallbackCandidates.push("Hantelrodd", "Maskinrodd", "Skivstångsrodd", "Bandrodd");
  }
  if (key.includes("curl")) fallbackCandidates.push("Bicepscurl");
  if (key.includes("triceps")) fallbackCandidates.push("Triceps pushdown");

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
}): { text: string; overridable: boolean } | null {
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
    return {
      overridable: false,
      text: `Vänta.\n\n${formatWeightForCoach(
        weight
      )} kg ser ut som en felskrivning.${suggestionText}\nJag sparar inte setet förrän vikten är rätt.`,
    };
  }

  if (isUnusuallyHighGymWeight(weight)) {
    return {
      overridable: false,
      text: `Vänta.\n\n${formatWeightForCoach(
        weight
      )} kg är ovanligt högt för ett vanligt gymset.${suggestionText}\nJag sparar inte setet förrän vikten är rätt.`,
    };
  }

  if (hasSuspiciousJump(weight, referenceWeight)) {
    return {
      overridable: true,
      text: `Vänta.\n\n${formatWeightForCoach(
        weight
      )} kg är mycket högre än senaste nivån (${formatWeightForCoach(
        referenceWeight!
      )} kg).${suggestionText}\nStämmer det, tryck Lägg till set igen så sparar jag det.`,
    };
  }

  return null;
}

function checkWeightBeforeSavingSet({
  weight,
  previousSets,
  existingPR,
  historicalBestSets,
  alreadyWarnedMessage,
}: {
  weight: number;
  previousSets: LoggedSet[];
  existingPR?: PersonalRecord;
  historicalBestSets?: ExerciseBestSet[];
  alreadyWarnedMessage?: string;
}):
  | { ok: true }
  | {
      ok: false;
      message: string;
    } {
  const warning = buildWeightInputWarningMessage({
    weight,
    previousSets,
    existingPR,
    historicalBestSets,
  });

  if (!warning) return { ok: true };
  if (warning.overridable && warning.text === alreadyWarnedMessage) {
    return { ok: true };
  }

  return { ok: false, message: warning.text };
}

// isBodyweightExercise() ser bara på övningens loggType ("bodyweight_reps_rir"),
// inte på om den faktiskt kan köras utan vikt. Höftlyft har t.ex. logType
// "weight_reps_rir" (den progredieras ofta med tillägg) men equipmentTags
// inkluderar både "none" och "bodyweight" — den fungerar precis lika bra
// obelastad. Ändrar inte isBodyweightExercise självt eftersom det styr
// vikt-förslag/prefyllning på många andra ställen (skulle tysta bort
// viktförslag för alla som faktiskt belastar Höftlyft). Det här avgör bara
// om ett tomt viktfält är ett giltigt "0 kg", inte ett fel, vid loggning.
function allowsUnloadedSet(name: string) {
  const definition = getExerciseDefinition(name);
  if (!definition) return false;
  return definition.equipmentTags.some((tag) => tag === "none" || tag === "bodyweight");
}

async function addSet() {
    if (!workout) return;
    triggerHaptic();

    const capturedExerciseIndex = exerciseIndex;
    // Läs övningsindex från refen, inte closure-state: om addSet() kördes
    // från en knapp som hann bli inaktuell (t.ex. Nästa övning hann
    // committa innan detta klick registrerades) pekar exerciseIndex här
    // fortfarande på övningen som gällde när DENNA addSet-instans skapades.
    // exerciseIndexRef uppdateras synkront och är alltid den övning som
    // faktiskt visas nu — annars kan setet sparas på fel övning.
    const targetExerciseIndex = exerciseIndexRef.current;
    const exerciseBeingLogged = workout.exercises[targetExerciseIndex];

    const rawWeight = parseNumberInput(weightInput);
    const reps = parseNumberInput(repsInput);
    const exerciseName = currentExerciseName;
    const prKey = exerciseKey(exerciseName);
    const bodyweightExercise = isBodyweightExercise(exerciseName);
    const timedExercise = isTimedExercise(exerciseName);
    const hasLoggedWeight =
      weightInput.trim() !== "" && Number.isFinite(rawWeight) && rawWeight > 0;
    // Höftlyft m.fl. har logType "weight_reps_rir" (progredieras ofta med
    // tillägg) men klarar sig lika bra obelastad — equipmentTags säger
    // "none"/"bodyweight". weightOptional avgör bara att ett tomt viktfält
    // är giltigt "0 kg" här, inte att övningen ALLTID ska behandlas som
    // bodyweight (en riktig vikt ska fortfarande rimlighetskollas nedan).
    const weightOptional = bodyweightExercise || allowsUnloadedSet(exerciseName);
    const weight = weightOptional && !hasLoggedWeight ? 0 : rawWeight;
    const existingPR = personalRecords[prKey];
    const durationSeconds = timedExercise ? Math.round(durationSecondsInput) : undefined;
    if (timedExercise && (!durationSeconds || durationSeconds <= 0)) {
      setChatLog((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === "coach" && MISSING_TIME_MESSAGES.includes(lastMessage.text)) return prev;
        return [...prev, { role: "coach", source: "engine" as const, text: pickRandomLine(MISSING_TIME_MESSAGES) }];
      });
      return;
    }
    if (timedExercise && durationSeconds && durationSeconds > 7200) {
      const isExtreme = durationSeconds > 21600;
      const pool = isExtreme ? [EXTREME_TIME_EASTER_EGG] : IMPLAUSIBLE_TIME_MESSAGES;
      setChatLog((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (
          lastMessage?.role === "coach" &&
          (IMPLAUSIBLE_TIME_MESSAGES.includes(lastMessage.text) || lastMessage.text === EXTREME_TIME_EASTER_EGG)
        ) {
          return prev;
        }
        return [...prev, { role: "coach", source: "engine" as const, text: pickRandomLine(pool) }];
      });
      return;
    }
    const missingRequiredInput =
      (!timedExercise && (!Number.isFinite(reps) || reps <= 0)) ||
      (!weightOptional && (!Number.isFinite(weight) || weight <= 0));
    const missingInputMessagePool = weightOptional
      ? MISSING_REPS_ONLY_MESSAGES
      : MISSING_WEIGHT_AND_REPS_MESSAGES;

if (missingRequiredInput) {
  setChatLog((prev) => {
    const lastMessage = prev[prev.length - 1];
    if (
      lastMessage?.role === "coach" &&
      missingInputMessagePool.includes(lastMessage.text)
    ) {
      return prev;
    }

    return [
      ...prev,
      {
        role: "coach",
        source: "engine" as const,
        text: pickRandomLine(missingInputMessagePool),
      },
    ];
  });
  return;
}

if (!timedExercise && reps > 200) {
  const isExtreme = reps > 1000;
  const pool = isExtreme ? [EXTREME_REPS_EASTER_EGG] : IMPLAUSIBLE_REPS_MESSAGES;
  setChatLog((prev) => {
    const lastMessage = prev[prev.length - 1];
    if (
      lastMessage?.role === "coach" &&
      (IMPLAUSIBLE_REPS_MESSAGES.includes(lastMessage.text) || lastMessage.text === EXTREME_REPS_EASTER_EGG)
    ) {
      return prev;
    }

    return [
      ...prev,
      {
        role: "coach",
        source: "engine" as const,
        text: pickRandomLine(pool),
      },
    ];
  });
  return;
}

if (!timedExercise && weight > 0) {
  // Rimlighetskollen är till för siffror användaren faktiskt skrev in — kör
  // den alltid när en riktig vikt angetts, oavsett om övningen normalt är
  // obelastad. En felskriven "200" på ett belastat Höftlyft ska fångas
  // precis som på vilken annan vägd övning som helst.
  const lastChatMessage = chatLog[chatLog.length - 1];
  const weightCheck = checkWeightBeforeSavingSet({
    weight,
    previousSets: exerciseBeingLogged?.sets ?? [],
    existingPR,
    historicalBestSets: getExerciseBestSets(gymFilteredHistory, exerciseName, 6),
    alreadyWarnedMessage:
      lastChatMessage?.role === "coach" ? lastChatMessage.text : undefined,
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
    updated.exercises[targetExerciseIndex].sets.push(set);
   const currentLoggedExercise = updated.exercises[targetExerciseIndex];
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
        previousSets: updated.exercises[targetExerciseIndex].sets.slice(0, -1),
        dayForm,
      });
   const bodyweightAdjustedPlan =
    weightOptional && !hasLoggedWeight
      ? { ...rawNextSetPlan, weight: 0 }
      : rawNextSetPlan;
   const isNextSetLast = setNumber + 1 >= plannedSetCount;
   const nextSetPlan =
    !timedExercise &&
    isNextSetLast &&
    isSoleExerciseForMuscleGroup(updated.exercises, currentExerciseName)
      ? tightenRirForSoloMuscleGroup(bodyweightAdjustedPlan, currentExerciseName)
      : bodyweightAdjustedPlan;
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
    if (!hasLoggedFirstSetEver) {
      setHasLoggedFirstSetEver(true);
      saveJSON("loggedFirstSetEver", true);
    }
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
        // "Notering" är kanslispråk — och coachen ekar texten vi skickar,
        // så den sa "Första noteringen" rakt av. Skriv det som en människa.
        : `Första setet i ${currentExerciseName}: ${formatLoggedSetText({
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
  previousSets: updated.exercises[targetExerciseIndex].sets.slice(0, -1),
  completedExercises: updated.exercises.slice(0, targetExerciseIndex + 1),
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
  isLastExercise: targetExerciseIndex >= updated.exercises.length - 1,
  previousSets: updated.exercises[targetExerciseIndex].sets.slice(0, -1),
  personalRecordText,
  sessionsAtTopWeight: progressionPlan.sessionsAtTopWeight,
  lastCoachMessage,
  memoryInsight: buildExerciseMemoryInsight({
    coachMemory,
    exerciseName: currentExerciseName,
  }),
  // Vad utrustningen faktiskt erbjuder närmast upp och ner. Coachen såg
  // "nästa steg: 15 kg" utan att kunna veta att det inte finns något mellan
  // 12,5 och 15 — på ett sidolyft är det en femtedel mer, på en benpress är
  // samma 2,5 kg försumbart. Bara siffrorna: vad de betyder för just den här
  // övningen vet coachen redan bättre än vi kan skriva i en regel.
  nearestWeights:
    weight > 0
      ? {
          up: getNextAvailableWeight(weight, currentExerciseName, "up"),
          down: getNextAvailableWeight(weight, currentExerciseName, "down"),
        }
      : undefined,
  limitations: userProfile?.limitations,
  recentHealthNotes: getRecentHealthNotes(coachMemory),
  recentWorkingWeights: formatRecentWorkingWeights(
    getExerciseBestSets(gymFilteredHistory, currentExerciseName, 5)
  ),
  warmupContext: activeWarmupContext,
  conditioningContext: activeConditioningContext,
  gymComparison: buildGymComparison({
    history,
    currentGymId: activeGymId,
    currentGymName: gym,
    gyms,
  }),
  otherGymReference,
  recoveryContext: buildRecoveryContext({
    exerciseName: currentExerciseName,
    history,
  }),
});
const recentConversation = buildRecentConversation(chatLog);
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

if (coachReply.mode !== "ai" && coachReply.reason) {
  recordAiFallback("set", coachReply.reason);
}

if (coachReply.text) {
  const isWorkoutFinished =
    nextSetPlan.strategy === "complete" &&
    targetExerciseIndex >= updated.exercises.length - 1;

  const isRealPersonalRecord = personalRecordText.startsWith("Nytt personbästa");

  setChatLog((prev) => [
    ...prev,
    {
      role: "coach",
      text: coachReply.text,
      setNumber,
      exerciseName: currentExerciseName || undefined,
      aiStatus: coachReply.mode === "ai" ? undefined : "fallback",
      highlight: isRealPersonalRecord || undefined,
      emphasis: isWorkoutFinished || undefined,
    },
  ]);
}

void syncBetaSnapshotNow({
  reason: "set-logged",
  exerciseName: currentExerciseName,
  setNumber,
});

if (painFailure) {
  setWeightInput("");
  setRepsInput("");
  setFailNoteInput("");
  setRirInput(2);
  setDidFailInput(false);
  return;
}

// Vikt, reps och RIR lämnas medvetet orörda efter ett loggat set — de
// innehåller redan exakt det du just gjorde, vilket är den referens nästa
// set ska utgå från. Motorns förslag skrivs inte in i fälten; det går till
// coachen, som säger med ord om något ska ändras.
// Refarna uppdateras till det loggade värdet så viktspärren jämför mot det
// du senast körde, inte mot en gammal förifyllning.
systemSuggestedWeightRef.current = weight > 0 ? weight : undefined;
systemSuggestedRepsRef.current = reps > 0 ? reps : undefined;
// Fälten står kvar med det du just gjorde. Det är historik igen, inte ett
// val för nästa set — så kortet ska säga SENAST tills du rör något.
setInputsTouched(false);

if (nextSetPlan.strategy === "complete") {
  setFailNoteInput("");
  setDidFailInput(false);
  if (exerciseIndexRef.current === capturedExerciseIndex) {
    setDurationSecondsInput(timedExercise ? durationSeconds ?? 0 : 0);
  }
  return;
}

setDurationSecondsInput(0);

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
      const undoText = pickRandomLine(UNDO_SET_MESSAGES);
      if (prev.length > 0 && prev[prev.length - 1].role === "coach") {
        return [...prev.slice(0, -1), { role: "coach", source: "engine" as const, text: undoText }];
      }
      return [...prev, { role: "coach", source: "engine" as const, text: undoText }];
    });
  }

  function updateSet(setIdx: number, newWeight: number, newReps: number, newRir: number, newDurationSeconds?: number) {
    if (!workout) return;
    const updated = structuredClone(workout);
    const sets = updated.exercises[exerciseIndex].sets;
    if (setIdx < 0 || setIdx >= sets.length) return;
    const exerciseName = updated.exercises[exerciseIndex].name;
    const key = exerciseKey(exerciseName);
    sets[setIdx] = {
      ...sets[setIdx],
      weight: newWeight,
      reps: newReps,
      rir: newRir,
      ...(newDurationSeconds !== undefined ? { durationSeconds: newDurationSeconds } : {}),
    };
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

  function updateHistorySet(
    workoutId: string,
    exerciseName: string,
    setIdx: number,
    newWeight: number,
    newReps: number,
    newRir: number,
    newDurationSeconds?: number
  ) {
    const updatedHistory = history.map((w) => {
      if (w.id !== workoutId) return w;
      const updated = structuredClone(w);
      const ex = updated.exercises.find((e) => e.name === exerciseName);
      if (!ex || setIdx < 0 || setIdx >= ex.sets.length) return w;
      ex.sets[setIdx] = {
        ...ex.sets[setIdx],
        weight: newWeight,
        reps: newReps,
        rir: newRir,
        ...(newDurationSeconds !== undefined ? { durationSeconds: newDurationSeconds } : {}),
      };
      return updated;
    });

    setHistory(updatedHistory);
    saveJSON("workoutHistory", updatedHistory);

    const allWorkouts = workout ? [workout, ...updatedHistory] : updatedHistory;
    const key = exerciseKey(exerciseName);

    const bestRecord = getBestRecordForExercise(allWorkouts, exerciseName);
    const nextPersonalRecords = { ...personalRecords };
    if (bestRecord) nextPersonalRecords[key] = bestRecord;
    else delete nextPersonalRecords[key];
    setPersonalRecords(nextPersonalRecords);
    saveJSON("personalRecords", nextPersonalRecords);

    const latest = getLatestLoggedSetForExercise(allWorkouts, exerciseName);
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

  // De här tre säger något om hur träningen gick — de kräver att träning
  // faktiskt skedde. Utan ett enda loggat set blir "höll det kontrollerat"
  // och "kan ha påverkat vikterna" påståenden om ingenting. Event-
  // noteringarna nedan är sanna oavsett: rapporterad smärta är ofta just
  // anledningen till att passet slutade utan set, och det ska coachen minnas.
  const loggedAnySet = w.exercises.some((exercise) => exercise.sets.length > 0);

  if (loggedAnySet && dayForm === "trött") {
    notes.push({ ...base, text: "Du kom in trött och höll det kontrollerat." });
  }
  if (loggedAnySet && dayForm === "stark") {
    notes.push({ ...base, text: "Du kände dig stark idag." });
  }

  if (
    loggedAnySet &&
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
      text: `${ex.name}: bästa set senast var ${best.weight} kg × ${best.reps}.`,
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
  videoNotes?: Array<{ exerciseName: string; text: string }>;
}): WorkoutReview {
  const { workout, summary, progression, videoNotes = [] } = args;
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
    // Raden når i praktiken bara pass utan loggade set (finns set får
    // positives alltid "Starkaste träffen idag"). Och de passen sparas inte
    // — så säg inte att de gjort det.
    positives.push("Du dök upp. Det räknas.");
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
  videoNotes,
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
  // Om passet stått öppet långt efter senaste loggade set (avbrott,
  // appen glömd i bakgrunden, återupptagen nästa dag) ska "avsluta"-
  // klicket inte räknas som passets faktiska sluttid — det ger orimliga
  // TID-värden i sammanfattningen och Statistik. Byggd med hänsyn till
  // ett riktigt fynd: ett pass som låg öppet under en lång paus visade
  // "203 min" för 9 set. Över tröskeln används istället senaste loggade
  // setets tid + en kort, rimlig marginal för nedvarvning/packning.
  const STALE_SESSION_GAP_MS = 30 * 60 * 1000;
  const SESSION_END_BUFFER_MS = 3 * 60 * 1000;
  const lastSetAtMs =
    allSets.length > 0
      ? Math.max(...allSets.map((set) => new Date(set.createdAt).getTime()))
      : startedAtMs;
  const rawFinishedAtMs = Date.now();
  const finishedAtMs =
    rawFinishedAtMs - lastSetAtMs > STALE_SESSION_GAP_MS
      ? lastSetAtMs + SESSION_END_BUFFER_MS
      : rawFinishedAtMs;
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
    // Inget loggat -> passet sparas inte till historiken, så säg inte att det gjorts.
    coachSummary = "Inget loggat den här gången. Nästa pass tar vi från början.";
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


    // Ett pass utan ett enda loggat set är inget pass — det ska inte räknas
    // i passantal, tid i gymmet eller streaks. Sammanfattningen visar redan
    // "Inget set loggat.", så det finns ingenting att spara.
    const hasLoggedSets = workout.exercises.some((exercise) => exercise.sets.length > 0);
    const newHistory = hasLoggedSets
      ? [workoutWithSummary, ...history].slice(0, 50) // spara senaste 50 pass
      : history;
    const progressionComparison = getWorkoutComparison(newHistory);

    if (hasLoggedSets) {
      setHistory(newHistory);
      saveJSON("workoutHistory", newHistory);
    }
// COACH MEMORY: spara en kort sammanfattning (per övning)
const freshNotes = makeCoachNotesFromWorkout(workout);
saveCoachNotes(freshNotes);



    // lastPass driver ENBART rotationen (getNextPass) och etiketten som visar
    // vad du körde sist. Ett pass utan loggade set är inget pass — då ska
    // Pass C fortfarande stå på tur, inte Pass A. Med spärren här hålls
    // lastPass också i takt med history[0].pass, som skrivs på samma villkor.
    if (hasLoggedSets) {
      saveRawValue("lastPass", workout.pass);
      setLastPass(workout.pass);
    }
    void syncBetaSnapshotNow({ reason: "workout-finished" });

const videoNotes = chatLog
  .filter((m) => m.role === "coach" && m.source === "video")
  .map((m) => ({ exerciseName: m.exerciseName ?? "", text: m.text }));

const userNotes = chatLog
  .filter((m) => m.role === "you" && m.text.trim().length > 0)
  .slice(-8)
  .map((m) => ({ exerciseName: m.exerciseName, text: m.text.trim().slice(0, 200) }));

const gymCalibrationNote = getGymCalibrationNote({
  history,
  exerciseNames: progressionComparison.worse,
  currentGymId: workoutWithSummary.gymId ?? null,
  currentGymName: workoutWithSummary.gym,
  gyms,
});

const review = buildWorkoutReview({
  workout: workoutWithSummary,
  summary,
  progression: progressionComparison,
  videoNotes,
});

setWorkoutReview(null);
setWorkoutReviewLoading(hasLoggedSets);
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
// Samma hasLoggedSets som avgjorde att passet inte sparas i historiken.
// Utan ett enda set finns ingenting att sammanfatta: den deterministiska
// recensionen säger redan "Ingen stress. Vi börjar rent nästa gång.", och
// lobbyhälsningen ska inte skrivas om ett pass som aldrig hände.
if (!hasLoggedSets) {
  setWorkoutReview(review);
} else {
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
    gymCalibrationNote,
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
    events: workoutWithSummary.events
      ?.filter(
        (
          event
        ): event is typeof event & {
          type: "pain" | "exercise_replaced" | "exercise_completed_early";
          exerciseName: string;
        } =>
          event.type !== "ai_fallback" && typeof event.exerciseName === "string"
      )
      .map(({ type, exerciseName, note, setCount, replacementName }) => ({
        type,
        exerciseName,
        note,
        setCount,
        replacementName,
      })),
    userNotes,
    dayForm,
    recentSessions: history.slice(0, 4).map((w) => ({
      passLabel: w.displayName,
      daysAgo: Math.max(
        0,
        Math.round((Date.now() - new Date(w.startedAt).getTime()) / (1000 * 60 * 60 * 24))
      ),
      totalSets: w.summary?.totalSets ?? 0,
      hadPainOrEarlyStop: (w.events ?? []).some(
        (event) => event.type === "pain" || event.type === "exercise_completed_early"
      ),
    })),
  },
  fallbackReview: getReviewCoachParts(review),
}).then((response) => {
  const finalReview =
    response.mode === "ai"
      ? applyReviewCoachParts(review, response.review)
      : review;

  if (response.mode === "ai" && response.review.lobbyText) {
    const text = response.review.lobbyText;
    saveJSON("lobbyCoachText", text);
    setLobbyCoachText(text);
  }

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
}
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
    localStorage.removeItem("lastGymId");
    localStorage.removeItem("gyms");
    localStorage.removeItem("workoutHistory");
    localStorage.removeItem("lastByExercise");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("coachMemory");
    localStorage.removeItem("customExercisesByPass");
    localStorage.removeItem("removedExercisesByPass");
    localStorage.removeItem("exerciseOverridesByPass");
    localStorage.removeItem("personalRecords");
    localStorage.removeItem("acceptedTrainingSafety");
    localStorage.removeItem("loggedFirstSetEver");
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
    setProgramPreferences([]);
    setCustomWorkoutPlan(null);
    setPassDisplayNamesByPass({});
    setWorkout(null);
    setSkippedExercise(null);
    setWorkoutReview(null);
    setWorkoutReviewLoading(false);
    setWorkoutComplete(false);
    setStarted(false);
    setHasLoggedFirstSetEver(false);
    alert("Allt återställt ✅");
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
    onOpenProfileSetup={
      userProfile
        ? () => {
            setShowSettings(false);
            setShowExerciseProgress(false);
            setShowStatistics(false);
            setShowHistory(false);
            setShowPersonalRecords(false);
            setSelectedProgressExercise(null);
            setEditingProfile(true);
          }
        : undefined
    }
    onResetAll={resetAll}
  />
) : null;

const wrappedStoryPanel =
  isWrappedOpen && wrappedStory ? (
    <WrappedStory
      monthLabel={wrappedStory.monthLabel}
      stats={wrappedStory.stats}
      captions={wrappedStory.captions}
      onClose={closeWrapped}
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
      key={pendingProfileChange ? "confirming" : "idle"}
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
      onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
      onSubmit={() => {
if (
  !trainingExperienceInput ||
  !goalInput ||
  !minutesPerSessionInput ||
  (programStartModeInput === "coach" && !locationInput)
) {
  return;
}
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
  location: locationInput ?? "gym",
  equipment: locationInput === "hemma" ? equipmentInput : [],
  exercisePreferences: exercisePreferencesInput,
  limitations: limitationsInput,
};

        if (!userProfile) {
          applyProfileAndRebuild(profile);
          return;
        }

        const scheduleRelevantChange =
          getProgramProfileSignature(userProfile) !== getProgramProfileSignature(profile);

        if (!scheduleRelevantChange) {
          saveJSON("userProfile", profile);
          void syncStructuredBetaProfile(profile as unknown as Record<string, unknown>);
          setUserProfile(profile);
          setEditingProfile(false);
          return;
        }

        setPendingProfileChange(profile);
      }}
    />
    {settingsPanel}
    {pendingProfileChange && createPortal(
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-end sm:justify-center">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setPendingProfileChange(null)}
        />
        <div className="relative mx-4 mb-10 w-full max-w-md space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl sm:mb-0">
          <div className="space-y-1.5 text-center">
            <p className="text-base font-semibold text-white">Bygga om schemat?</p>
            <p className="text-sm text-white/55">
              Det du ändrade påverkar upplägget. Dina egna tillägg, borttagningar eller byten i det nuvarande schemat ersätts av ett nytt bygge.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] hover:bg-blue-500"
              onClick={() => applyProfileAndRebuild(pendingProfileChange)}
            >
              Ja, bygg om schemat
            </button>
            <button
              className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/70 transition active:scale-[0.98] hover:bg-white/[0.08]"
              onClick={() => setPendingProfileChange(null)}
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

if (userProfile && showProgramReview && programBuildScreenVisible) {
  return (
    <ProgramBuildLoadingScreen
      theme={appTheme}
      failed={programBuildStatus === "failed"}
      onRetry={() => buildAiWorkoutPlanForProfile(userProfile)}
      onBuildManually={() => {
        setProgramStartModeInput("manual");
        setProgramBuildStatus("idle");
        setProgramBuildScreenVisible(false);
        setEditingProfile(true);
      }}
    />
  );
}

if (userProfile && workoutPlan && showProgramReview) {
  return (
    <>
    {globalAppControls}
    <ProgramReviewScreen
      theme={appTheme}
      profile={userProfile}
      workoutPlan={workoutPlan}
      programBuildStatus={programBuildStatus}
      chatInput={programChatInput}
      setChatInput={setProgramChatInput}
      chatLog={programChatLog}
      onSendChat={askProgramCoach}
      onRebuildProgram={() => {
        if (!userProfile) return;
        buildAiWorkoutPlanForProfile(userProfile);
      }}
      onRenamePass={renamePass}
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
      }}
      onRemoveExercise={(passKey, exerciseName) => {
        const currentPass = workoutPlan.passes.find((pass) => pass.key === passKey);
        const isCustomExercise = customExercisesByPass[passKey]?.some(
          (name) => exerciseKey(name) === exerciseKey(exerciseName)
        );

        if (isCustomExercise) {
          removeCustomExercise(passKey, exerciseName);
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
      onClose={
        loadJSON<boolean>("approvedWorkoutPlan", false)
          ? () => setShowProgramReview(false)
          : undefined
      }
    />
    {settingsPanel}
    </>
  );
}


return (
  <main
    data-theme={appTheme}
    className="flex min-h-screen flex-col items-center justify-start gap-6 bg-[#0b1018] px-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white"
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
        exerciseOrderList={workout.exercises.map((e) => ({
          name: e.name,
          hasSets: e.sets.length > 0,
        }))}
        onReorderExercises={commitExerciseReorder}
        onAiFallback={(reason, exerciseName) =>
          recordAiFallback("exercise_intro", reason, exerciseName)
        }
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
        swapExerciseInput={swapExerciseInput}
        setSwapExerciseInput={setSwapExerciseInput}
        swapCurrentExerciseDuringWorkout={swapCurrentExerciseDuringWorkout}
        libraryExercises={userProfile ? getAvailableProgramExercises(userProfile, true) : []}
        pickExerciseForAdd={pickExerciseForAdd}
        pickExerciseForSwap={pickExerciseForSwap}
        pickCustomExerciseForAdd={pickCustomExerciseForAdd}
        pickCustomExerciseForSwap={pickCustomExerciseForSwap}
addCoachMessage={(text, eventKey, source = "engine", exerciseName) =>
  setChatLog((prev) => {
    if (eventKey && prev.some((m) => m.eventKey === eventKey)) {
      return prev;
    }

    return [
      ...prev,
      {
        role: "coach",
        source,
        text,
        eventKey,
        exerciseName,
      },
    ];
  })
}
        currentExerciseName={currentExerciseName}
        lastByExercise={lastByExercise}
        exerciseKey={exerciseKey}
        weightInput={weightInput}
        setWeightInput={markTouched(setWeightInput)}
        repsInput={repsInput}
        setRepsInput={markTouched(setRepsInput)}
        durationSecondsInput={durationSecondsInput}
        setDurationSecondsInput={setDurationSecondsInput}
        rirInput={rirInput}
        setRirInput={markTouched(setRirInput)}
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
        exerciseAlreadyIntroduced={exerciseAlreadyIntroduced}
        showWarmupHint={!hasLoggedFirstSetEver}
        inputsTouched={inputsTouched}
        validateSetWeight={(weight) => {
          if (isBodyweightExercise(currentExerciseName) || isTimedExercise(currentExerciseName)) return null;
          const warning = buildWeightInputWarningMessage({
            weight,
            previousSets: workout?.exercises[exerciseIndex]?.sets ?? [],
            existingPR: personalRecords[exerciseKey(currentExerciseName)],
            historicalBestSets: getExerciseBestSets(gymFilteredHistory, currentExerciseName, 6),
          });
          return warning?.text ?? null;
        }}
        previousWorkoutSummary={getPreviousWorkoutSummaryLine(history) ?? undefined}
        otherGymReference={otherGymReference}
        recentHealthNotes={getRecentHealthNotes(coachMemory)}
        limitations={userProfile?.limitations}
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
                  ? {
                      ...s,
                      weight: updated.weight,
                      reps: updated.reps,
                      rir: updated.rir,
                      ...(updated.durationSeconds !== undefined
                        ? { durationSeconds: updated.durationSeconds }
                        : {}),
                    }
                  : s
              ),
            };
          }),
        };
      });
      setHistory(updatedHistory);
      saveJSON("workoutHistory", updatedHistory);

      const allWorkoutsForPr = workout ? [workout, ...updatedHistory] : updatedHistory;
      const editedExerciseKey = exerciseKey(exerciseName);

      const bestRecord = getBestRecordForExercise(allWorkoutsForPr, exerciseName);
      const nextPersonalRecords = { ...personalRecords };
      if (bestRecord) nextPersonalRecords[editedExerciseKey] = bestRecord;
      else delete nextPersonalRecords[editedExerciseKey];
      setPersonalRecords(nextPersonalRecords);
      saveJSON("personalRecords", nextPersonalRecords);

      const latestForExercise = getLatestLoggedSetForExercise(allWorkoutsForPr, exerciseName);
      const nextLastByExercise = { ...lastByExercise };
      if (latestForExercise) {
        nextLastByExercise[editedExerciseKey] = {
          weight: latestForExercise.set.weight,
          reps: latestForExercise.set.reps,
          rir: latestForExercise.set.rir ?? null,
          failNote: latestForExercise.set.failNote ?? null,
          updatedAt: latestForExercise.set.createdAt,
        };
      } else {
        delete nextLastByExercise[editedExerciseKey];
      }
      setLastByExercise(nextLastByExercise);
      saveJSON("lastByExercise", nextLastByExercise);

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
                  ? {
                      ...s,
                      weight: updated.weight,
                      reps: updated.reps,
                      rir: updated.rir,
                      ...(updated.durationSeconds !== undefined
                        ? { durationSeconds: updated.durationSeconds }
                        : {}),
                    }
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
    gyms={gyms}
    activeGymId={activeGymId}
    gymConfirmationRequired={gymConfirmationRequired}
    onSelectGym={selectGym}
    onAddGym={addGym}
    onRenameGym={renameGym}
    onBack={() => setShowDailyPlan(false)}
    onRenamePass={renamePass}
  />
) : showStatistics ? (
  <StatisticsScreen
    history={history}
    onBack={() => setShowStatistics(false)}
    onOpenExercises={(exerciseName) => {
      setSelectedProgressExercise(exerciseName ?? null);
      setExerciseProgressOrigin("statistics");
      setShowStatistics(false);
      setShowExerciseProgress(true);
    }}
    onOpenHistory={() => {
      setShowStatistics(false);
      setShowHistory(true);
    }}
  />
) : showHistory ? (
  <HistoryScreen
    history={history}
    onBack={() => setShowHistory(false)}
    onOpenExercise={(exerciseName) => {
      setSelectedProgressExercise(exerciseName);
      setExerciseProgressOrigin("history");
      setShowHistory(false);
      setShowExerciseProgress(true);
    }}
    onEditSet={updateHistorySet}
  />
) : showPersonalRecords ? (
  <PersonalRecordsScreen
    personalRecords={personalRecords}
    onBack={() => setShowPersonalRecords(false)}
    onOpenExercise={(exerciseName) => {
      setSelectedProgressExercise(exerciseName);
      setExerciseProgressOrigin("personalRecords");
      setShowPersonalRecords(false);
      setShowExerciseProgress(true);
    }}
  />
) : showExerciseProgress ? (
  <ExerciseProgressScreen
    history={history}
    initialExerciseName={selectedProgressExercise}
    libraryExercises={userProfile ? getAvailableProgramExercises(userProfile, true) : []}
    onBack={() => {
      setSelectedProgressExercise(null);
      setShowExerciseProgress(false);
      if (exerciseProgressOrigin === "statistics") setShowStatistics(true);
      else if (exerciseProgressOrigin === "history") setShowHistory(true);
      else if (exerciseProgressOrigin === "personalRecords") setShowPersonalRecords(true);
      setExerciseProgressOrigin(null);
    }}
  />
) : (
  <LobbyScreen
    name={profileName}
    nextPassLabel={nextPassLabel}
    history={history}
    personalRecords={personalRecords}
    lobbyCoachText={lobbyCoachText || undefined}
    weeklyStats={weeklyStats}
    daysPerWeek={userProfile.daysPerWeek}
    now={now}
    theme={appTheme}
    wrapped={wrapped}
    staleDraft={staleDraft ? { startedAt: staleDraft.workout.startedAt, displayName: staleDraft.workout.displayName } : null}
    onResumeStaleDraft={() => {
      if (!staleDraft) return;
      setWorkout({ ...staleDraft.workout, startedAt: new Date().toISOString() });
      setExerciseIndex(staleDraft.exerciseIndex ?? 0);
      setSkippedExercise(staleDraft.skippedExercise ?? null);
      setChatLog((staleDraft.chatLog ?? []).filter((m) => m.source !== "fallback"));
      setChatInput(staleDraft.chatInput ?? "");
      setWeightInput(staleDraft.weightInput ?? "");
      setRepsInput(staleDraft.repsInput ?? "");
      setDurationSecondsInput(staleDraft.durationSecondsInput ?? 0);
      setRirInput(staleDraft.rirInput ?? 2);
      setDidFailInput(staleDraft.didFailInput ?? false);
      setFailNoteInput(staleDraft.failNoteInput ?? "");
      setDayForm(staleDraft.dayForm ?? "normal");
      setActiveWarmupContext(staleDraft.activeWarmupContext ?? null);
      setActiveConditioningContext(staleDraft.activeConditioningContext ?? null);
      setStaleDraft(null);
      setStarted(true);
      setShowDailyPlan(false);
    }}
    onDiscardStaleDraft={() => {
      setStaleDraft(null);
      localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);
    }}
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
    onOpenSettings={() => setShowSettings(true)}
  />
)}
{settingsPanel}
{wrappedStoryPanel}
</main>
);
}
