"use client";
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ExerciseCard from "./ExerciseCard";
import ExerciseInfoModal from "./ExerciseInfoModal";
import SetList from "./SetList";
import CoachPanel from "./CoachPanel";
import SetVideoReview from "./SetVideoReview";
import VideoFeedbackInfoModal from "./VideoFeedbackInfoModal";
import ToggleSwitch from "./ToggleSwitch";
import { CameraGlyph, CloseGlyph, DoubleChevronDownGlyph, PlayGlyph, RotateGlyph } from "./IconGlyphs";
import {
  formatRestClock,
  formatRestProse,
  getExerciseProfile,
  getRestTargetRange,
  formatSetDisplay,
  isBodyweightExercise,
  isTimedExercise,
  normalizeExerciseSearchText,
} from "../lib/exercises";
import {
  requestAiCoachExerciseIntro,
  type CoachExerciseIntroContext,
  type CoachHealthNote,
} from "../lib/coachAi";

import { LibraryBrowser, LIBRARY_CATEGORIES, type LibraryExercise } from "./LibraryBrowser";
import { triggerHaptic } from "../lib/haptics";

const CUSTOM_EXERCISE_CATEGORIES = [
  "ben",
  "rygg",
  "bröst",
  "axlar",
  "armar",
  "mage",
] as const;

type ExerciseActionResult = { handled: boolean; message?: string };

type Props = {
  progression: { weight: number; reps: number; rir?: number | null; failNote?: string | null }[];
  previousExerciseSets: {
    createdAt: string;
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
  }[];
  progressionPlan: {
    weight: string;
    repsText: string;
    rirText: string;
    note: string;
    opportunity?: {
      type: "offer_increase" | "increase_now" | "optional_last_set_test";
      confidence: "medium" | "high";
      suggestedWeight: string;
      reason: string;
      tone: "offer" | "clear";
    };
    calibrationTestCandidate?: { weight: string };
  };
  exerciseIndex: number;
  activePlan: string[];
  exerciseOrderList: { name: string; hasSets: boolean }[];
  onReorderExercises: (orderedRemainingNames: string[]) => void;
  /**
   * Rapporterar att övningsintrot föll tillbaka på motorns mall, med ruttens
   * egen orsak. Introt är den enda coachrösten som saknat det här — vi såg den
   * gula pricken men aldrig varför.
   */
  onAiFallback?: (reason: string, exerciseName: string) => void;
  passLabel: string;
  coachData: {
    intro: string;
    pass: string;
    gym: string;
    exercise: string;
    lastText: string;
    plan: string;
    target: string;
    insight: string;
  } | null;
  dayForm: "trött" | "normal" | "stark" | null;
  setDayForm: (v: "trött" | "normal" | "stark") => void;
  chatLog: {
    role: "you" | "coach";
    text: string;
    setNumber?: number;
    aiStatus?: "fallback";
    eventKey?: string;
  }[];
  chatInput: string;
  setChatInput: (v: string) => void;
  addCoachMessage: (text: string, eventKey?: string, source?: "engine" | "llm" | "video", exerciseName?: string) => void;
  sendChat: () => void;
  isCoachThinking?: boolean;
  workoutExerciseInput: string;
  setWorkoutExerciseInput: (v: string) => void;
  addExerciseDuringWorkout: () => ExerciseActionResult;
  swapExerciseInput: string;
  setSwapExerciseInput: (v: string) => void;
  swapCurrentExerciseDuringWorkout: () => ExerciseActionResult;
  libraryExercises: LibraryExercise[];
  pickExerciseForAdd: (name: string) => ExerciseActionResult;
  pickExerciseForSwap: (name: string) => ExerciseActionResult;
  pickCustomExerciseForAdd: (name: string, category: string) => ExerciseActionResult;
  pickCustomExerciseForSwap: (name: string, category: string) => ExerciseActionResult;
  currentExerciseName: string;
  lastByExercise: Record<
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
  exerciseKey: (name: string) => string;
  weightInput: string;
  setWeightInput: Dispatch<SetStateAction<string>>;
  repsInput: string;
  setRepsInput: Dispatch<SetStateAction<string>>;
  durationSecondsInput: number;
  setDurationSecondsInput: (v: number) => void;
  rirInput: number;
  setRirInput: React.Dispatch<React.SetStateAction<number>>;
  didFailInput: boolean;
  setDidFailInput: (v: boolean) => void;
  failNoteInput: string;
  setFailNoteInput: (v: string) => void;
  addSet: () => void;
  removeLastSet: () => void;
  skipCurrentExercise: () => void;
  canSkipCurrentExercise: boolean;
  skippedExerciseName: string | null;
  undoSkipExercise: () => void;
  currentSets: {
    createdAt: string;
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
  }[];
  currentExerciseCompleted?: boolean;
  prevExercise: () => void;
  nextExercise: () => void;
  finishWorkout: () => void;
  personalRecords: Record<
    string,
    {
      exerciseName: string;
      weight: number;
      reps: number;
      durationSeconds?: number;
      metricType?: "reps" | "time";
      createdAt: string;
    }
  >;
  plannedWeightKg?: number;
  plannedReps?: number;
  updateSet: (setIdx: number, weight: number, reps: number, rir: number, durationSeconds?: number) => void;
  validateSetWeight: (weight: number) => string | null;
  /** Övning som coachen redan presenterat i ett chattsvar — hoppa över introt. */
  exerciseAlreadyIntroduced?: string | null;
  /** Har användaren aldrig loggat ett set? Då visas uppvärmningshinten en gång. */
  showWarmupHint?: boolean;
  previousWorkoutSummary?: string;
  otherGymReference?: CoachExerciseIntroContext["otherGymReference"];
  recentHealthNotes?: CoachHealthNote[];
  limitations?: string;
};

function getTopSet(progression: { weight: number; reps: number }[]) {
  if (progression.length === 0) return null;

  return [...progression].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.reps - a.reps;
  })[0];
}
function getRestTime(exerciseName: string) {
  return formatRestProse(getRestTargetRange(exerciseName));
}

function formatRestTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatDurationLabel(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;

  if (minutes === 0) return `${rest} sek`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatWeightLabel(weight: number) {
  if (!Number.isFinite(weight)) return "";
  return Number(weight.toFixed(2)).toString().replace(".", ",");
}

function formatPreviousSetLabel(
  exerciseName: string,
  set: Props["previousExerciseSets"][number]
) {
  const isTimed = set.metricType === "time" || isTimedExercise(exerciseName);

  if (isTimed) {
    const time = formatDurationLabel(set.durationSeconds ?? 0);
    const load =
      Number.isFinite(set.weight) && set.weight > 0
        ? ` + ${formatWeightLabel(set.weight)} kg`
        : "";

    return `${time}${load}`;
  }

  const base =
    Number.isFinite(set.weight) && set.weight > 0
      ? `${formatWeightLabel(set.weight)} kg x ${set.reps}`
      : `${set.reps} reps`;

  return typeof set.rir === "number" ? `${base} · RIR ${set.rir}` : base;
}

// Intervallet kommer från biblioteket (exercises.ts) så att timern och texten
// coachen får alltid är samma siffror. Etiketten är bara klockformatering.
function getRestTargetWithLabel(exerciseName: string, rir?: number) {
  const range = getRestTargetRange(exerciseName, rir);
  return { ...range, label: formatRestClock(range) };
}

function getManualRestTarget(seconds: number) {
  return {
    min: seconds,
    max: seconds,
    label: formatRestTimer(seconds),
  };
}

function getIntroTarget(args: {
  last: { reps: number; rir: number | null } | undefined;
  topSet: { weight: number; reps: number } | null;
  baseWeight: number | null;
}) {
  const { last, topSet, baseWeight } = args;

  if (!last) {
    return {
      reps: "8–10 reps",
      rir: "RIR 2",
      note: "Första setet visar oss var vi ligger.",
    };
  }

  if (topSet && baseWeight === topSet.weight) {
    return {
      reps: `${Math.max(1, topSet.reps - 1)}–${topSet.reps} reps`,
      rir: "RIR 1–2",
      note: "Samma vikt som ditt bästa. Vi siktar lite lägre först.",
    };
  }

  if (last.rir === 0) {
    return {
      reps: `${Math.max(1, last.reps - 2)}–${Math.max(1, last.reps - 1)} reps`,
      rir: "RIR 1–2",
      note: "Vi börjar lite lägre här.",
    };
  }

  if (last.rir === 1) {
    return {
      reps: `${Math.max(1, last.reps - 1)}–${last.reps} reps`,
      rir: "RIR 1–2",
      note: "Vi börjar lugnt. Första setet visar oss var vi ligger.",
    };
  }

  if (typeof last.rir === "number" && last.rir >= 3) {
    return {
      reps: `${last.reps + 1} reps`,
      rir: "RIR 1–2",
      note: "Vi börjar lugnt och låter RIR styra.",
    };
  }

  return {
    reps: `${last.reps} reps`,
    rir: "RIR 2",
    note: "Första setet visar oss var vi ligger.",
  };
}

function buildExerciseIntroCoachText(args: {
  exerciseName: string;
  exerciseIndex: number;
  exerciseCount: number;
  progression: { weight: number; reps: number }[];
  progressionPlan: {
    weight: string;
    repsText: string;
    rirText: string;
    note: string;
    opportunity?: {
      type: "offer_increase" | "increase_now" | "optional_last_set_test";
      confidence: "medium" | "high";
      suggestedWeight: string;
      reason: string;
      tone: "offer" | "clear";
    };
    calibrationTestCandidate?: { weight: string };
  };
  lastByExercise: Props["lastByExercise"];
  exerciseKey: (name: string) => string;
  personalRecords: Props["personalRecords"];
  previousWorkoutSummary?: string;
}) {
  const {
    exerciseName,
    exerciseIndex,
    exerciseCount,
    progression,
    progressionPlan,
    lastByExercise,
    exerciseKey,
    personalRecords,
    previousWorkoutSummary,
  } = args;

  const key = exerciseKey(exerciseName);
  const last = lastByExercise[key];
  const pr = personalRecords[key];
  const introLine =
    exerciseIndex === 0
      ? `Nu kör vi.\n\nFörst: ${exerciseName}.`
      : exerciseIndex === exerciseCount - 1
      ? `Avslutar med ${exerciseName}.`
      : `Nu tar vi ${exerciseName}.`;
  const isTimed = isTimedExercise(exerciseName);
  if (isTimed) {
    const bestTime = pr?.durationSeconds ?? last?.durationSeconds ?? 0;
    const targetSeconds = bestTime > 0
      ? Math.max(15, Math.round(bestTime * 0.9))
      : 30;
    const bestLine = bestTime > 0
      ? `Ditt bästa här är ${formatDurationLabel(bestTime)}.`
      : "Det här är första gången vi kör den tillsammans.";

    return `${introLine}

${bestLine}
Starta lugnt och håll positionen så länge formen är bra.

Sikta på ${formatDurationLabel(targetSeconds)}.
Vila 60–90 sek.`;
  }
  // Inget pr-företräde: progression ÄR gymfiltrerad och lägger redan in PB:t
  // när det sattes här. Genvägen förbi den gjorde att ett rekord från ett annat
  // gym presenterades som "ditt bästa set" på en maskin du aldrig rört.
  const topSet = getTopSet(progression);
  const rest = getRestTime(exerciseName);
  const plannedWeight = Number(progressionPlan.weight);
  const baseWeight = Number.isFinite(plannedWeight) && plannedWeight > 0
    ? plannedWeight
    : topSet?.weight ?? last?.weight ?? null;
  const target = progressionPlan
    ? {
        reps: progressionPlan.repsText,
        rir: progressionPlan.rirText,
        note: progressionPlan.note,
      }
    : getIntroTarget({ last, topSet, baseWeight });

  if (!last && !topSet) {
    return `${introLine}

Vi börjar kontrollerat och låter första setet visa dagsformen.

Sikta på ${target.reps}, ${target.rir}.
Vila ${rest}.`;
  }

  const lines: string[] = [introLine, ""];

  if (last?.failNote) {
    lines.push("Senast tog det stopp här, så vi öppnar smart.");
    lines.push("");
  } else if (topSet) {
    lines.push(
      `Ditt bästa här är ${formatSetDisplay({
        exerciseName,
        weight: topSet.weight,
        reps: topSet.reps,
      })}.`
    );
  } else if (last) {
    lines.push(
      `Senast låg du på ${formatSetDisplay({
        exerciseName,
        weight: last.weight,
        reps: last.reps,
      })}.`
    );
  }

  if (baseWeight !== null) {
    lines.push(
      topSet && baseWeight === topSet.weight
        ? `Vi börjar på samma vikt och siktar på ${target.reps}, ${target.rir}.`
        : `Vi börjar på ${baseWeight.toLocaleString("sv-SE")} kg och siktar på ${target.reps}, ${target.rir}.`
    );

    if (
      progressionPlan.opportunity?.type === "offer_increase" &&
      progressionPlan.opportunity.suggestedWeight &&
      topSet &&
      baseWeight === topSet.weight
    ) {
      lines.push(
        `Vill du testa ${Number(progressionPlan.opportunity.suggestedWeight).toLocaleString("sv-SE")} kg idag så köper jag det. Då jagar vi färre, snygga reps - inte ego.`
      );
    }

    if (progressionPlan.note && !(topSet && baseWeight === topSet.weight)) {
      lines.push(progressionPlan.note);
    }
  } else {
    lines.push(`Sikta på ${target.reps}, ${target.rir}.`);
  }

  lines.push("");
  lines.push(`Vila ${rest}.`);

  return lines.join("\n");
}

function buildExerciseIntroAiContext(args: {
  exerciseName: string;
  exerciseIndex: number;
  exerciseCount: number;
  progression: { weight: number; reps: number }[];
  progressionPlan: {
    weight: string;
    repsText: string;
    rirText: string;
    note: string;
    opportunity?: {
      type: "offer_increase" | "increase_now" | "optional_last_set_test";
      confidence: "medium" | "high";
      suggestedWeight: string;
      reason: string;
      tone: "offer" | "clear";
    };
    sessionsAtTopWeight?: number;
    calibrationTestCandidate?: { weight: string };
  };
  lastByExercise: Props["lastByExercise"];
  exerciseKey: (name: string) => string;
  personalRecords: Props["personalRecords"];
  previousWorkoutSummary?: string;
  otherGymReference?: CoachExerciseIntroContext["otherGymReference"];
  recentHealthNotes?: CoachHealthNote[];
  limitations?: string;
  recentChatNotes?: CoachExerciseIntroContext["recentChatNotes"];
}): CoachExerciseIntroContext {
  const {
    exerciseName,
    exerciseIndex,
    exerciseCount,
    progression,
    progressionPlan,
    lastByExercise,
    exerciseKey,
    personalRecords,
    previousWorkoutSummary,
    otherGymReference,
    recentHealthNotes,
    limitations,
    recentChatNotes,
  } = args;

  const key = exerciseKey(exerciseName);
  const last = lastByExercise[key];
  const pr = personalRecords[key];
  const position: CoachExerciseIntroContext["position"] =
    exerciseIndex === 0 ? "first" : exerciseIndex === exerciseCount - 1 ? "last" : "middle";
  const rest = getRestTime(exerciseName);
  const summaryForFirst = exerciseIndex === 0 ? previousWorkoutSummary : undefined;

  if (isTimedExercise(exerciseName)) {
    const bestTime = pr?.durationSeconds ?? last?.durationSeconds ?? 0;
    const targetSeconds = bestTime > 0 ? Math.max(15, Math.round(bestTime * 0.9)) : 30;

    return {
      kind: "exercise_intro",
      exerciseName,
      position,
      isTimedExercise: true,
      target: {
        weight: null,
        restText: "60–90 sek",
        timedTargetText: formatDurationLabel(targetSeconds),
      },
      history: bestTime > 0 ? { bestTimeText: formatDurationLabel(bestTime) } : undefined,
      sessionsAtTopWeight: progressionPlan.sessionsAtTopWeight,
      previousWorkoutSummary: summaryForFirst,
      recentHealthNotes,
      limitations,
      recentChatNotes,
    };
  }

  // Se kommentaren vid samma rad i fallbacktexten ovan — samma skäl.
  const topSet = getTopSet(progression);
  const plannedWeight = Number(progressionPlan.weight);
  const baseWeight =
    Number.isFinite(plannedWeight) && plannedWeight > 0
      ? plannedWeight
      : topSet?.weight ?? last?.weight ?? null;
  const target = progressionPlan
    ? { reps: progressionPlan.repsText, rir: progressionPlan.rirText }
    : getIntroTarget({ last, topSet, baseWeight });

  return {
    kind: "exercise_intro",
    exerciseName,
    position,
    isTimedExercise: false,
    target: {
      repsText: target.reps,
      rirText: target.rir,
      weight: baseWeight,
      restText: rest,
    },
    history: {
      bestSet: topSet ?? undefined,
      lastSession: last
        ? { weight: last.weight, reps: last.reps, failNote: last.failNote }
        : undefined,
    },
    opportunity:
      progressionPlan.opportunity && topSet && baseWeight === topSet.weight
        ? {
            type: progressionPlan.opportunity.type,
            suggestedWeight: progressionPlan.opportunity.suggestedWeight,
          }
        : undefined,
    sessionsAtTopWeight: progressionPlan.sessionsAtTopWeight,
    heavierTestSet: progressionPlan.calibrationTestCandidate,
    otherGymReference,
    previousWorkoutSummary: summaryForFirst,
    recentHealthNotes,
    limitations,
    recentChatNotes,
  };
}
export default function WorkoutScreen({
  personalRecords,
  exerciseIndex,
  activePlan,
  exerciseOrderList,
  onReorderExercises,
  onAiFallback,
  passLabel,
  coachData,
  dayForm,
  setDayForm,
  chatLog,
  chatInput,
  setChatInput,
  sendChat,
  isCoachThinking = false,
  workoutExerciseInput,
  setWorkoutExerciseInput,
  addExerciseDuringWorkout,
  swapExerciseInput,
  setSwapExerciseInput,
  swapCurrentExerciseDuringWorkout,
  libraryExercises,
  pickExerciseForAdd,
  pickExerciseForSwap,
  pickCustomExerciseForAdd,
  pickCustomExerciseForSwap,
  currentExerciseName,
  lastByExercise,
  exerciseKey,
  weightInput,
  setWeightInput,
  repsInput,
  setRepsInput,
  durationSecondsInput,
  setDurationSecondsInput,
  rirInput,
  setRirInput,
  didFailInput,
  setDidFailInput,
  failNoteInput,
  setFailNoteInput,
  addSet,
  removeLastSet,
  skipCurrentExercise,
  canSkipCurrentExercise,
  skippedExerciseName,
  undoSkipExercise,
  currentSets,
  currentExerciseCompleted,
  prevExercise,
  nextExercise,
  finishWorkout,
  progression,
  previousExerciseSets,
  progressionPlan,
  addCoachMessage,
  plannedWeightKg,
  plannedReps,
  updateSet,
  validateSetWeight,
  exerciseAlreadyIntroduced,
  showWarmupHint = false,
  previousWorkoutSummary,
  otherGymReference,
  recentHealthNotes,
  limitations,
}: Props) {
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showSwapExercise, setShowSwapExercise] = useState(false);
  const [addManualMode, setAddManualMode] = useState(false);
  const [swapManualMode, setSwapManualMode] = useState(false);
  const [addShowCustomCategories, setAddShowCustomCategories] = useState(false);
  const [swapShowCustomCategories, setSwapShowCustomCategories] = useState(false);
  const [addExerciseFeedback, setAddExerciseFeedback] = useState<string | null>(null);
  const [swapExerciseFeedback, setSwapExerciseFeedback] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] =
    useState<(typeof LIBRARY_CATEGORIES)[number]>("alla");
  const [showOverflow, setShowOverflow] = useState(false);
  const [showReorderExercises, setShowReorderExercises] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<string[]>([]);
  const [confirmSkipExercise, setConfirmSkipExercise] = useState(false);
  const [confirmAdvanceEarly, setConfirmAdvanceEarly] = useState(false);
  // Fynd 21: ExerciseCard har egna bekräftelsedialoger (vikt/reps/decimal/
  // hoppa-över). Utan den här flaggan kunde "Gå vidare nu?" och en av de
  // dialogerna öppnas staplade om två åtgärder triggades tätt inpå
  // varandra — se project-priorities-minnet.
  const [exerciseCardHasPendingConfirm, setExerciseCardHasPendingConfirm] = useState(false);
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showForraGangen, setShowForraGangen] = useState(false);
  const [chatFocusMode, setChatFocusMode] = useState(false);
  const [showVideoReview, setShowVideoReview] = useState(false);
  const [showVideoInfo, setShowVideoInfo] = useState(false);
  const [isNormalChatHistoryOpen, setIsNormalChatHistoryOpen] = useState(false);
  const normalChatCardRef = useRef<HTMLDivElement | null>(null);
  const [autoStartRestTimer, setAutoStartRestTimer] = useState(true);
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [isInlineRestWidgetVisible, setIsInlineRestWidgetVisible] = useState(true);
  const inlineRestWidgetRef = useRef<HTMLButtonElement | null>(null);
  // Sant när användaren själv tryckt på den lilla "Vila"-rutan för att se
  // den stora timern, oavsett om rutan råkar synas i vyn just då.
  const [restDockForcedOpen, setRestDockForcedOpen] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [manualRestTarget, setManualRestTarget] = useState<{
    min: number;
    max: number;
    label: string;
  } | null>(null);
  const previousSetCountRef = useRef(currentSets.length);
  const latestSet = currentSets.at(-1);
  const coachRestTarget = getRestTargetWithLabel(currentExerciseName, latestSet?.rir);
  const restTarget = manualRestTarget ?? coachRestTarget;
  const restProgress = Math.min(restElapsed / restTarget.max, 1);
  const restTargetReached = restStartedAt !== null && restElapsed >= restTarget.min;
  const restOverMax =
    restStartedAt !== null &&
    restTarget.max > restTarget.min &&
    restElapsed >= restTarget.max;
  const restTimerState = restOverMax
    ? "over"
    : restTargetReached
    ? "ready"
    : "resting";
  const restSecondsUntilReady = Math.max(restTarget.min - restElapsed, 0);
  const restTargetLabel = manualRestTarget
    ? `mål ${restTarget.label}`
    : `coach ${restTarget.label}`;
  const restTimerHint =
    restStartedAt === null
      ? restTargetLabel
      : restTimerState === "over"
      ? `Lite lång vila · ${formatRestTimer(restElapsed)}`
      : restTimerState === "ready"
      ? `Redo · ${restTarget.label}`
      : `Redo om ${formatRestTimer(restSecondsUntilReady)}`;
  useEffect(() => {
    if (restTimerState === "ready") triggerHaptic([10, 60, 10]);
  }, [restTimerState]);
  const shouldShowRestDock =
    showRestTimer && !chatFocusMode && (!isInlineRestWidgetVisible || restDockForcedOpen);
  const isLastExercise = exerciseIndex === activePlan.length - 1;
  const currentExerciseReadyToFinish = Boolean(currentExerciseCompleted);
  const isTimedCurrentExercise = isTimedExercise(currentExerciseName);
  const isBodyweightCurrentExercise = isBodyweightExercise(currentExerciseName);
  const videoReviewContext = latestSet
    ? {
        weight: latestSet.weight,
        reps: latestSet.reps,
        durationSeconds: latestSet.durationSeconds,
        metricType: latestSet.metricType,
        rir: latestSet.rir,
      }
    : {
        weight: plannedWeightKg,
        reps: plannedReps,
        durationSeconds: undefined,
        metricType: isTimedCurrentExercise ? ("time" as const) : undefined,
        rir: undefined,
      };
  const shouldShowWeightInput =
    !isTimedCurrentExercise && !isBodyweightCurrentExercise;
  const currentMetricLabel = isTimedCurrentExercise
    ? progressionPlan.repsText || "tid"
    : repsInput.trim()
    ? // RIR 0 är ett ansträngningsmål, inte en exakt repsiffra — siffran är
      // ett resultat du inte kan veta i förväg. "+" gör det tydligt att det
      // är ett golv, inte ett tak.
      `${repsInput.trim()}${rirInput === 0 ? "+" : ""} ${
        repsInput.trim() === "1" && rirInput !== 0 ? "rep" : "reps"
      }`
    : // Ingen fallback till motorns plan. Kortet speglar dina fält — är de
      // tomma finns inget att spegla, och då visas "Logga första setet"
      // i stället. Föll det tillbaka på planen blev kortet en andra röst
      // igen, i just det läge användaren har minst sammanhang: en ny
      // övning. Det var därför coachen läste upp mål och vila där.
      "";
  const nextWeightLabel = weightInput.trim()
    ? `${weightInput.trim().replace(".", ",")} kg`
    : "";
  const nextRirLabel =
    typeof rirInput === "number"
      ? isTimedCurrentExercise
        ? ""
        : `RIR ${rirInput >= 5 ? "5+" : rirInput}`
      : progressionPlan.rirText;
  // RIR räknas inte in: den har alltid ett värde (state startar på 2), så
  // ensam skulle den hålla kortet "ifyllt" även när användaren inte angett
  // något. Vikt eller reps avgör om det finns ett set att förhandsvisa.
  const hasNextPrescription =
    !currentExerciseReadyToFinish &&
    (Boolean(nextWeightLabel) || Boolean(currentMetricLabel));

  const normalizedLibrarySearch = normalizeExerciseSearchText(librarySearch);
  const filteredLibraryExercises = libraryExercises.filter((exercise) => {
    const matchesCategory =
      libraryCategory === "alla" || exercise.category === libraryCategory;
    const matchesSearch =
      !normalizedLibrarySearch ||
      normalizeExerciseSearchText(
        `${exercise.name} ${exercise.primaryMuscle} ${exercise.equipment} ${(exercise.aliases ?? []).join(" ")}`
      ).includes(normalizedLibrarySearch);

    return matchesCategory && matchesSearch;
  });

  function closeAddModal() {
    setShowAddExercise(false);
    setAddManualMode(false);
    setAddShowCustomCategories(false);
    setLibrarySearch("");
    setLibraryCategory("alla");
    setAddExerciseFeedback(null);
  }

  function closeSwapModal() {
    setShowSwapExercise(false);
    setSwapManualMode(false);
    setSwapShowCustomCategories(false);
    setLibrarySearch("");
    setLibraryCategory("alla");
    setSwapExerciseFeedback(null);
  }

  useEffect(() => {
    if (currentSets.length > previousSetCountRef.current) {
      setRestElapsed(0);
      setManualRestTarget(null);
      setRestStartedAt(autoStartRestTimer ? Date.now() : null);
      if (autoStartRestTimer) {
        setShowRestTimer(true);
      }
    }

    previousSetCountRef.current = currentSets.length;
  }, [autoStartRestTimer, currentSets.length]);

  useEffect(() => {
    if (!restStartedAt) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }

    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((lock) => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }

    const interval = window.setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restStartedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(interval);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [restStartedAt]);

  useEffect(() => {
    const el = inlineRestWidgetRef.current;
    if (!el || !showRestTimer) return;

    let hideTimeout: number | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (hideTimeout !== null) {
            window.clearTimeout(hideTimeout);
            hideTimeout = null;
          }
          setIsInlineRestWidgetVisible(true);
        } else {
          // Kort scrollhopp (t.ex. när chatten växer vid ett nytt meddelande)
          // ska inte blinka fram den flytande timern — vänta och se om den
          // inbäddade widgeten kommer tillbaka i vy innan vi växlar.
          hideTimeout = window.setTimeout(() => {
            setIsInlineRestWidgetVisible(false);
          }, 250);
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);

    return () => {
      if (hideTimeout !== null) window.clearTimeout(hideTimeout);
      observer.disconnect();
    };
  }, [showRestTimer]);

  function startRestTimer() {
    setRestStartedAt(Date.now() - restElapsed * 1000);
  }

  function restartRestTimer() {
    setRestElapsed(0);
    setRestStartedAt(Date.now());
  }

  function startManualRestTimer(seconds: number) {
    setManualRestTarget(getManualRestTarget(seconds));
    setRestElapsed(0);
    setRestStartedAt(Date.now());
    setShowRestTimer(true);
  }

  function resetRestTimer() {
    setRestStartedAt(null);
    setRestElapsed(0);
    setManualRestTarget(null);
  }
  
const introSentForIndexRef = useRef<string | null>(null);
const healthContextMentionedRef = useRef(false);
const chatLogLengthAtLastIntroRef = useRef(0);
const previousExerciseNameRef = useRef<string | null>(null);
const [introLoading, setIntroLoading] = useState(false);

/* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
  if (!currentExerciseName) return;
  if (isCoachThinking) return;
  const introIdentity = exerciseKey(currentExerciseName);
  if (introSentForIndexRef.current === introIdentity) return;

  // Bytte coachen själv hit har den redan presenterat övningen i sitt svar
  // ("Bra, vi kör hantelpress istället"). Ett intro direkt efter blir en
  // andra presentation av samma övning. Vi hoppar över det och markerar
  // identiteten som avklarad, så nästa övningsbyte fungerar som vanligt.
  //
  // Gäller BARA byten där coachen faktiskt sagt något. Byter du via chatten
  // genom att namnge övningen, eller bekräftar ett föreslaget byte, säger
  // appen ingenting — då är introt den enda rösten och måste komma.
  if (
    exerciseAlreadyIntroduced &&
    exerciseKey(exerciseAlreadyIntroduced) === introIdentity
  ) {
    introSentForIndexRef.current = introIdentity;
    return;
  }

  // Profil-begränsningar och gamla pass-minnen: nämns max en gång per pass,
  // annars frågar coachen om samma sak på varje övnings-intro.
  //
  // Flaggan sätts INTE här. Effekten kan köra om innan svaret landat — den har
  // isCoachThinking i beroendelistan och avbryter det pågående anropet — och
  // flippade vi budgeten på försöket åt ett avbrutet anrop upp hela passets
  // hälsokontext. Anropet som faktiskt landade gick då utan noteringen, varje
  // gång. Sätts nu tillsammans med introSentForIndexRef, som redan gör rätt.
  const includeStaticHealthContext = !healthContextMentionedRef.current;
  const hasStaticHealthContext =
    (recentHealthNotes && recentHealthNotes.length > 0) || Boolean(limitations);

  // Chattkommentarer sen förra övnings-introt: taggas med vilken övning de
  // sas under, så de aldrig läcker in som fakta om en annan övning/maskin
  // (t.ex. viktsteg eller ett trasigt handtag hör bara till den övningen).
  const recentUserComments = chatLog
    .slice(chatLogLengthAtLastIntroRef.current)
    .filter((m) => m.role === "you" && m.text.trim().length > 0)
    .slice(-3)
    .map((m) => m.text.trim().slice(0, 200));
  const chatNotesSourceExercise = previousExerciseNameRef.current;
  chatLogLengthAtLastIntroRef.current = chatLog.length;
  previousExerciseNameRef.current = currentExerciseName;

  const recentChatNotes =
    recentUserComments.length > 0 && chatNotesSourceExercise
      ? { duringExercise: chatNotesSourceExercise, notes: recentUserComments }
      : undefined;

  // Föregående intro skickas medvetet INTE med. Det lades till för att minska
  // upprepning och gjorde tvärtom: ett komplett exempel på måltexten, utan ett
  // ord i instruktionen om vad det var, blev en mall modellen matchade — sista
  // meningen kom tillbaka ordagrant på nästa övning.
  const eventKey = `exercise_intro:${introIdentity}`;
  const introArgs = {
    exerciseName: currentExerciseName,
    exerciseIndex,
    exerciseCount: activePlan.length,
    progression,
    progressionPlan,
    lastByExercise,
    exerciseKey,
    personalRecords,
    previousWorkoutSummary: exerciseIndex === 0 ? previousWorkoutSummary : undefined,
    otherGymReference,
    recentHealthNotes: includeStaticHealthContext ? recentHealthNotes : undefined,
    limitations: includeStaticHealthContext ? limitations : undefined,
    recentChatNotes,
  };
  const fallbackText = buildExerciseIntroCoachText(introArgs);
  const controller = new AbortController();

  setIntroLoading(true);
  requestAiCoachExerciseIntro({
    context: buildExerciseIntroAiContext(introArgs),
    fallbackReply: fallbackText,
    signal: controller.signal,
  }).then((result) => {
    if (controller.signal.aborted) return;
    if (introSentForIndexRef.current === introIdentity) return;
    introSentForIndexRef.current = introIdentity;
    if (includeStaticHealthContext && hasStaticHealthContext) {
      healthContextMentionedRef.current = true;
    }
    // Rapporteras här, inte i katch-grenen: det är först nu vi vet att det
    // här svaret är det som faktiskt visas. Ett avbrutet anrop har redan
    // returnerat ovan och ska inte räknas som att coachen tystnade.
    if (result.mode !== "ai" && result.reason) {
      onAiFallback?.(result.reason, currentExerciseName);
    }
    setIntroLoading(false);
    addCoachMessage(result.text, eventKey, result.mode === "ai" ? "llm" : "engine");
  });

  return () => {
    controller.abort();
  };
}, [exerciseIndex, currentExerciseName, isCoachThinking]);
/* eslint-enable react-hooks/exhaustive-deps */

  return (
    <>
    <div
      className={`workout-screen-shell w-full max-w-none space-y-2 pt-[env(safe-area-inset-top)] sm:max-w-xl sm:space-y-2.5 ${
        shouldShowRestDock ? "pb-44" : "pb-[env(safe-area-inset-bottom)]"
      }`}
    >
{!chatFocusMode && (
<div ref={normalChatCardRef} className={isNormalChatHistoryOpen ? "" : "sticky top-2 z-30"}>
<CoachPanel
  coachData={coachData}
  dayForm={dayForm}
  setDayForm={setDayForm}
  chatLog={chatLog}
  chatInput={chatInput}
  setChatInput={setChatInput}
  sendChat={sendChat}
  isCoachThinking={isCoachThinking || introLoading}
  isExpanded={false}
  onHistoryOpenChange={(open) => {
    setIsNormalChatHistoryOpen(open);
    if (open) {
      requestAnimationFrame(() => {
        normalChatCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }}
/>

      <button
        type="button"
        onClick={() => setChatFocusMode(true)}
        className="workout-layout-toggle mx-auto -mt-1 flex h-9 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-white/72 shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition duration-200 hover:bg-white/[0.07] hover:text-white active:scale-[0.97]"
        aria-label="Fokusera chatten"
      >
        <DoubleChevronDownGlyph className="h-5 w-5 transition-transform duration-200 ease-out" />
      </button>
</div>
)}

      {chatFocusMode ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b1018]">
          <div className="flex min-h-0 flex-1 flex-col px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <CoachPanel
              variant="focus"
              coachData={coachData}
              dayForm={dayForm}
              setDayForm={setDayForm}
              chatLog={chatLog}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChat={sendChat}
              isCoachThinking={isCoachThinking || introLoading}
              isExpanded
            />
          </div>
        <section className="workout-focus-dock shrink-0 rounded-none border-t border-white/[0.08] bg-[#0d1520] px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-18px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5">
              <p className="truncate text-sm font-semibold text-white">{currentExerciseName}</p>
            </div>
            {currentExerciseName ? (
              <button
                type="button"
                onClick={() => setShowVideoReview(true)}
                className="workout-ai-action flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/[0.16] text-blue-50 transition hover:bg-blue-500/[0.24] hover:text-white active:scale-[0.97]"
                aria-label="Filma senaste setet"
                title="Filma senaste setet"
              >
                <CameraGlyph className="h-5 w-5" />
              </button>
            ) : null}
            {currentExerciseName ? (
              <button
                type="button"
                onClick={() => setShowVideoInfo(true)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-[9px] font-semibold text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                aria-label="Vad gör filma-knappen?"
              >
                i
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setChatFocusMode(false)}
              className="workout-layout-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-white/72 transition hover:bg-white/[0.07] hover:text-white active:scale-[0.97]"
              aria-label="Visa hela passet"
            >
              <DoubleChevronDownGlyph className="h-4 w-4 rotate-180" />
            </button>
          </div>

          <p className="mt-1.5 truncate text-lg font-bold text-white">
            {currentExerciseReadyToFinish
              ? "Klar"
              : hasNextPrescription
              ? [nextWeightLabel, currentMetricLabel, nextRirLabel].filter(Boolean).join(" · ")
              : "Första setet"}
          </p>

          <div className="mt-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-baseline">
              <span />
              <span
                className={`text-2xl font-bold tracking-tight tabular-nums transition-colors duration-500 ${
                  restStartedAt === null
                    ? "text-white"
                    : restTimerState === "over"
                    ? "text-orange-300"
                    : restTimerState === "ready"
                    ? "text-emerald-300"
                    : "text-white"
                }`}
              >
                {restStartedAt === null ? restTarget.label : formatRestTimer(restElapsed)}
              </span>
              <span className="justify-self-end text-[11px] font-semibold tabular-nums text-white/45">
                {restStartedAt === null
                  ? "vila"
                  : restTimerState === "over"
                  ? ""
                  : restTimerState === "ready"
                  ? "redo"
                  : formatRestTimer(restSecondsUntilReady)}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`workout-rest-progress-fill h-full rounded-full transition-all duration-500 ${
                  restStartedAt === null
                    ? "bg-white"
                    : restTimerState === "over"
                    ? "bg-orange-400"
                    : restTimerState === "ready"
                    ? "bg-emerald-400"
                    : "bg-white"
                }`}
                style={{ width: `${restStartedAt === null ? 0 : restProgress * 100}%` }}
              />
            </div>
          </div>

          {currentExerciseReadyToFinish ? (
            <button
              type="button"
              onClick={isLastExercise ? finishWorkout : nextExercise}
              className={`workout-primary-action mt-3 flex h-12 w-full items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition active:scale-[0.99] ${
                isLastExercise
                  ? "border-emerald-300/25 bg-emerald-400/[0.13] text-emerald-50"
                  : "border-blue-300/18 bg-blue-500/[0.13] text-blue-50"
              }`}
            >
              {isLastExercise ? "Passet är klart" : "Nästa övning"}
            </button>
          ) : (
            <>
              <div
                className={`mt-3 grid gap-2 ${
                  shouldShowWeightInput ? "grid-cols-[1fr_1fr]" : "grid-cols-1"
                }`}
              >
                {shouldShowWeightInput ? (
                  <div className="workout-mini-input rounded-2xl border border-white/[0.07] bg-slate-950/34 px-2 py-2">
                    <div className="workout-input-stepper grid grid-cols-[2.15rem_1fr_2.15rem] overflow-hidden rounded-xl border border-white/[0.065] bg-slate-950/36">
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(String(weightInput).replace(",", "."));
                          const next = Math.max(0, (Number.isFinite(current) ? current : 0) - 2.5);
                          setWeightInput(Number(next.toFixed(2)).toString());
                        }}
                        className="flex h-9 items-center justify-center border-r border-white/[0.055] text-lg font-semibold text-white/58 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Sänk vikt"
                      >
                        -
                      </button>
                      <input
                        className="h-9 min-w-0 bg-transparent px-2 text-center text-lg font-semibold text-white outline-none placeholder:text-white/28"
                        inputMode="decimal"
                        value={weightInput}
                        onChange={(event) => setWeightInput(event.target.value)}
                        placeholder="kg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(String(weightInput).replace(",", "."));
                          const next = (Number.isFinite(current) ? current : 0) + 2.5;
                          setWeightInput(Number(next.toFixed(2)).toString());
                        }}
                        className="flex h-9 items-center justify-center border-l border-white/[0.055] text-lg font-semibold text-white/58 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Höj vikt"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="workout-mini-input rounded-2xl border border-white/[0.07] bg-slate-950/34 px-2 py-2">
                  {isTimedCurrentExercise ? (
                    <div className="workout-input-stepper overflow-hidden rounded-xl border border-white/[0.065] bg-slate-950/36">
                      <input
                        className="h-9 min-w-0 bg-transparent px-2 text-center text-lg font-semibold text-white outline-none placeholder:text-white/28"
                        inputMode="numeric"
                        value={durationSecondsInput || ""}
                        onChange={(event) =>
                          setDurationSecondsInput(Number(event.target.value) || 0)
                        }
                        placeholder="sek"
                      />
                    </div>
                  ) : (
                    <div className="workout-input-stepper grid grid-cols-[2.15rem_1fr_2.15rem] overflow-hidden rounded-xl border border-white/[0.065] bg-slate-950/36">
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(repsInput);
                          const next = Math.max(0, (Number.isFinite(current) ? current : 0) - 1);
                          setRepsInput(next ? String(next) : "");
                        }}
                        className="flex h-9 items-center justify-center border-r border-white/[0.055] text-lg font-semibold text-white/58 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Sänk reps"
                      >
                        -
                      </button>
                      <input
                        className="h-9 min-w-0 bg-transparent px-2 text-center text-lg font-semibold text-white outline-none placeholder:text-white/28"
                        inputMode="numeric"
                        value={repsInput}
                        onChange={(event) => setRepsInput(event.target.value)}
                        placeholder="reps"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(repsInput);
                          const next = (Number.isFinite(current) ? current : 0) + 1;
                          setRepsInput(String(next));
                        }}
                        className="flex h-9 items-center justify-center border-l border-white/[0.055] text-lg font-semibold text-white/58 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Höj reps"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!isTimedCurrentExercise ? (
                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRirInput(value)}
                      className={`h-10 rounded-xl border text-sm font-semibold transition ${
                        rirInput === value
                          ? "workout-rir-selected border-blue-300/34 bg-blue-500/[0.22] text-blue-50 shadow-[0_0_20px_rgba(37,99,235,0.16)]"
                          : "border-white/[0.06] bg-white/[0.045] text-white/58 hover:bg-white/[0.075] hover:text-white"
                      }`}
                    >
                      {value === 5 ? "5+" : value}
                    </button>
                  ))}
                </div>
              ) : null}

              {!isTimedCurrentExercise && rirInput <= 1 ? (
                <label className="mt-2 flex items-center gap-3 text-sm text-white/85">
                  <input
                    type="checkbox"
                    checked={didFailInput}
                    onChange={(e) => setDidFailInput(e.target.checked)}
                    className="h-4 w-4 rounded border border-white/20 bg-slate-950/38"
                  />
                  <span>Setet gick till failure</span>
                </label>
              ) : null}
              {!isTimedCurrentExercise && rirInput <= 1 && didFailInput ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {["grepp", "teknik", "ork", "smärta"].map((reason) => {
                    const isActive = failNoteInput === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setFailNoteInput(reason)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                          isActive
                            ? "workout-rir-selected border-blue-400/30 bg-blue-500/[0.10] text-white"
                            : "border-white/[0.09] bg-slate-950/38 text-white/75 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {reason.charAt(0).toUpperCase() + reason.slice(1)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={addSet}
                  className="workout-primary-action h-12 min-w-0 flex-1 rounded-2xl border border-blue-400/20 bg-blue-600 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 active:scale-[0.99]"
                >
                  Lägg till set
                </button>
                {currentSets.length > 0 ? (
                  <button
                    type="button"
                    onClick={removeLastSet}
                    className="shrink-0 text-xs font-medium text-white/40 underline decoration-white/20 underline-offset-2 transition hover:text-white/70"
                  >
                    Ångra
                  </button>
                ) : null}
              </div>
            </>
          )}
        </section>
        </div>
      ) : (
        <>
      <section className="workout-status-panel rounded-[1.35rem] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.058),rgba(255,255,255,0.026))] p-3.5 shadow-[0_16px_44px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="workout-section-kicker text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/42">
              Nu
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight text-white">
                {currentExerciseName}
              </h2>
              <button
                type="button"
                onClick={() => setShowExerciseInfo(true)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] text-xs font-semibold text-white/54 transition hover:bg-white/[0.07] hover:text-white"
                aria-label={`Visa info om ${currentExerciseName}`}
              >
                i
              </button>
            </div>
            <p className="mt-1 text-xs font-medium text-white/42">
              {passLabel} · {exerciseIndex + 1} av {activePlan.length}
            </p>
          </div>

          {showExerciseInfo && createPortal(
            <ExerciseInfoModal
              exerciseName={currentExerciseName}
              onClose={() => setShowExerciseInfo(false)}
            />,
            document.body
          )}

          <div className="flex shrink-0 items-center gap-2">
            <div
              className={`workout-state-pill rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isLastExercise
                  ? "border-emerald-300/22 bg-emerald-400/[0.10] text-emerald-50"
                  : "border-blue-300/18 bg-white/[0.045] text-blue-50"
              }`}
            >
              {isLastExercise ? "Sista" : "Pågår"}
            </div>
            <button
              type="button"
              onClick={() => setShowOverflow((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.035] text-base font-semibold leading-none text-white/54 transition hover:bg-white/[0.07] hover:text-white"
              aria-label="Fler alternativ"
            >
              ···
            </button>
          </div>
        </div>

        {/* Overflow menu */}
        {showOverflow && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
            {exerciseIndex > 0 && (
              <button
                type="button"
                onClick={() => { prevExercise(); setShowOverflow(false); }}
                className="w-full px-3 py-2.5 text-left text-sm font-medium text-white/72 transition hover:bg-white/[0.05] hover:text-white"
              >
                ← Föregående övning
              </button>
            )}
            <button
              type="button"
              onClick={() => { setShowAddExercise((v) => !v); setShowOverflow(false); }}
              className="w-full px-3 py-2.5 text-left text-sm font-medium text-white/72 transition hover:bg-white/[0.05] hover:text-white"
            >
              {showAddExercise ? "Stäng lägg till" : "Lägg till övning"}
            </button>
            <button
              type="button"
              onClick={() => { setShowSwapExercise((v) => !v); setShowOverflow(false); }}
              className="w-full px-3 py-2.5 text-left text-sm font-medium text-white/72 transition hover:bg-white/[0.05] hover:text-white"
            >
              {showSwapExercise ? "Stäng byt övning" : "Byt övning"}
            </button>
            <button
              type="button"
              onClick={() => {
                setReorderDraft(exerciseOrderList.filter((e) => !e.hasSets).map((e) => e.name));
                setShowReorderExercises(true);
                setShowOverflow(false);
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-medium text-white/72 transition hover:bg-white/[0.05] hover:text-white"
            >
              Byt ordning på övningar
            </button>
            <button
              type="button"
              onClick={() => { setConfirmSkipExercise(true); setShowOverflow(false); }}
              disabled={!canSkipCurrentExercise}
              className="w-full px-3 py-2.5 text-left text-sm font-medium text-white/72 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Klar med övningen
            </button>
            <button
              type="button"
              onClick={() => { setShowOverflow(false); setShowSaveConfirm(true); }}
              className="w-full px-3 py-2.5 text-left text-sm font-medium text-white/72 transition hover:bg-white/[0.05] hover:text-white"
            >
              Spara och avsluta
            </button>
          </div>
        )}

        {/* Skip confirm */}
        {confirmSkipExercise && (
          <div className="mt-2 rounded-2xl border border-white/[0.07] bg-slate-950/40 px-3 py-3">
            <p className="text-sm font-semibold text-white">Klar med {currentExerciseName}?</p>
            <p className="mt-0.5 text-xs text-white/50">
              {currentSets.length > 0
                ? `De ${currentSets.length} set du loggat sparas — inget försvinner. Resten av övningen hoppar du över.`
                : "Inga set är loggade än på den här övningen. Du går vidare till nästa."}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => { skipCurrentExercise(); setConfirmSkipExercise(false); }}
                className="rounded-xl border border-white/[0.09] bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.09]"
              >
                Ja, klar
              </button>
              <button
                type="button"
                onClick={() => setConfirmSkipExercise(false)}
                className="workout-primary-action rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Fortsätt övningen
              </button>
            </div>
          </div>
        )}

        {/* Nästa set + Vila */}
        <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-2">
          <div className="workout-next-card rounded-2xl border border-white/[0.075] bg-white/[0.045] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-100/55">
              {currentExerciseReadyToFinish ? "Klar" : "Nästa set"}
            </p>
            {currentExerciseReadyToFinish ? (
              <p className="mt-1 text-sm font-semibold leading-5 text-white">
                {isLastExercise ? "Passet kan avslutas" : "Gå vidare när du är redo"}
              </p>
            ) : hasNextPrescription ? (
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                {nextWeightLabel && (
                  <span className="text-lg font-semibold leading-none text-white">
                    {nextWeightLabel}
                  </span>
                )}
                {currentMetricLabel && (
                  <span className="text-sm font-semibold leading-none text-white/86">
                    {currentMetricLabel}
                  </span>
                )}
                {nextRirLabel && (
                  <span className="text-sm font-semibold leading-none text-white/86">
                    {nextRirLabel}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm font-semibold leading-5 text-white">
                Logga första setet
              </p>
            )}
            {/* Visas tills användaren loggat sitt allra första set, oavsett om
                övningen har ett förslag eller inte — annars ser bara den som
                saknar historik den, och det är inte bara nya konton som
                loggar uppvärmningen av gammal vana. */}
            {showWarmupHint && !currentExerciseReadyToFinish && (
              <p className="mt-2 border-l-2 border-[#2f6df6] pl-2 text-xs font-semibold leading-4 text-white">
                Logga inte uppvärmningsseten — bara arbetsseten.
              </p>
            )}
          </div>
          <button
            type="button"
            ref={inlineRestWidgetRef}
            onClick={() => {
              setShowRestTimer(true);
              setRestDockForcedOpen(true);
            }}
            className="workout-rest-card min-w-[5.8rem] rounded-2xl border border-white/[0.06] bg-slate-950/18 px-3 py-2 text-right transition active:scale-[0.97]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/34">
              Vila
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {restTimerHint}
            </p>
          </button>
        </div>

        {/* Inputs (embedded — no card wrapper, no header) */}
        <ExerciseCard
          embedded
          currentExerciseName={currentExerciseName}
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
          onSkipExercise={skipCurrentExercise}
          canSkipExercise={canSkipCurrentExercise}
          skippedExerciseName={skippedExerciseName}
          undoSkipExercise={undoSkipExercise}
          personalRecords={personalRecords}
          plannedWeightKg={plannedWeightKg}
          plannedReps={plannedReps}
          onRecordLastSet={currentExerciseName ? () => setShowVideoReview(true) : undefined}
          blockNewConfirmations={confirmAdvanceEarly}
          onPendingConfirmChange={setExerciseCardHasPendingConfirm}
          nextExerciseButton={
            <button
              type="button"
              className={`workout-primary-action flex h-14 w-full items-center justify-center rounded-2xl border text-base font-semibold transition active:scale-[0.99] ${
                isLastExercise && currentExerciseReadyToFinish
                  ? "border-emerald-300/25 bg-emerald-400/[0.13] text-emerald-50 hover:bg-emerald-400/[0.18]"
                  : !currentExerciseReadyToFinish
                  ? "border-white/[0.09] bg-white/[0.04] text-white/55 hover:bg-white/[0.07]"
                  : "border-blue-300/20 bg-blue-500/[0.13] text-blue-50 hover:bg-blue-500/[0.20]"
              }`}
              onClick={() => {
                if (!currentExerciseReadyToFinish) {
                  if (exerciseCardHasPendingConfirm) return;
                  setConfirmAdvanceEarly(true);
                  return;
                }
                if (isLastExercise) finishWorkout();
                else nextExercise();
              }}
            >
              {isLastExercise && currentExerciseReadyToFinish
                ? "Passet klart"
                : "Nästa övning"}
            </button>
          }
        />

        {/* Divider */}
        <div className="my-2.5 h-px bg-white/[0.07]" />

        {/* Reference zone — PB, history, previous session */}
        {/* PB badge */}
        {(() => {
          const pr = personalRecords[exerciseKey(currentExerciseName)];
          // formatSetDisplay äger hur ett set skrivs ut — den hanterar både
          // kroppsvikt och tid. Den här brickan hade bara kroppsviktsgrenen,
          // så Planka blev "Personbästa 0 reps".
          const label = pr
            ? formatSetDisplay({
                exerciseName: currentExerciseName,
                weight: pr.weight,
                reps: pr.reps,
                durationSeconds: pr.durationSeconds,
                metricType: pr.metricType,
              })
            : null;
          return (
            <div className="flex">
              {label ? (
                <span className="rounded-full border border-amber-200/18 bg-amber-200/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_0_18px_rgba(251,191,36,0.06)]">
                  Personbästa {label}
                </span>
              ) : (
                <span className="rounded-full border border-white/[0.09] bg-white/[0.042] px-2.5 py-1 text-[11px] text-white/38">
                  Personbästa –
                </span>
              )}
            </div>
          );
        })()}

        {/* Förra gången — collapsible */}
        {previousExerciseSets.length > 0 ? (
          <div className="workout-history-card mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.04] px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShowForraGangen((v) => !v)}
              className="flex w-full items-center justify-between gap-2"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/55">
                Förra gången
              </p>
              <span className={`text-[10px] text-white/38 transition-transform duration-200 ${showForraGangen ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
            {showForraGangen && (
              <div className="mt-2 space-y-1.5">
                {previousExerciseSets.map((set, index) => (
                  <div
                    key={`${set.createdAt}-${index}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="shrink-0 text-xs font-semibold text-white/38">
                      Set {index + 1}
                    </span>
                    <span className="min-w-0 text-right font-semibold text-white/86">
                      {formatPreviousSetLabel(currentExerciseName, set)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Set history for this session */}
        <SetList currentSets={currentSets} exerciseName={currentExerciseName} onEditSet={updateSet} validateWeight={validateSetWeight} />

      </section>

      {showSaveConfirm && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowSaveConfirm(false)} />
          <div className="relative mx-4 mb-10 w-full max-w-md space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
            <div className="space-y-1.5 text-center">
              <p className="text-base font-semibold text-white">Avsluta passet?</p>
              <p className="text-sm text-white/55">
                Du är mitt i <span className="font-semibold text-white/80">{currentExerciseName}</span>. Redan loggade set sparas — resten av övningen hoppar vi över.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="workout-primary-action w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] hover:bg-blue-500"
                onClick={() => { setShowSaveConfirm(false); }}
              >
                Fortsätt övningen
              </button>
              <button
                className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/70 transition active:scale-[0.98] hover:bg-white/[0.08]"
                onClick={() => { setShowSaveConfirm(false); finishWorkout(); }}
              >
                Avsluta ändå — spara det som loggats
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirmAdvanceEarly && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end sm:justify-center">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" onClick={() => setConfirmAdvanceEarly(false)} />
          <div className="relative mx-4 mb-10 w-full max-w-md space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl sm:mb-0">
            <div className="space-y-1.5 text-center">
              <p className="text-base font-semibold text-white">
                {isLastExercise ? "Avsluta passet nu?" : "Gå vidare nu?"}
              </p>
              <p className="text-sm text-white/55">
                {currentSets.length > 0
                  ? <>Du har loggat {currentSets.length} set på <span className="font-semibold text-white/80">{currentExerciseName}</span>. Redan loggade set sparas — resten hoppar du över om du fortsätter.</>
                  : <>Inga set är loggade än på <span className="font-semibold text-white/80">{currentExerciseName}</span>. Du hoppar över den helt om du fortsätter.</>}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="workout-primary-action w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] hover:bg-blue-500"
                onClick={() => setConfirmAdvanceEarly(false)}
              >
                Fortsätt övningen
              </button>
              <button
                className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/70 transition active:scale-[0.98] hover:bg-white/[0.08]"
                onClick={() => {
                  setConfirmAdvanceEarly(false);
                  if (isLastExercise) finishWorkout();
                  else nextExercise();
                }}
              >
                {isLastExercise ? "Avsluta ändå" : "Ja, gå vidare ändå"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

        </>
      )}
    </div>

    {showReorderExercises && createPortal(
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end sm:justify-center">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[3px]" onClick={() => setShowReorderExercises(false)} />
        <div className="relative mx-4 mb-10 w-full max-w-lg space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-white">Byt ordning på övningar</p>
              <p className="mt-0.5 text-xs text-white/50">
                Redan klara övningar ligger fast. Flytta de återstående med pilarna.
              </p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
              onClick={() => setShowReorderExercises(false)}
              aria-label="Stäng"
            >
              <CloseGlyph className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {exerciseOrderList
              .filter((e) => e.hasSets)
              .map((exercise, i) => (
                <div
                  key={`done-${exercise.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.015] px-3 py-2.5 opacity-50"
                >
                  <span className="text-sm font-medium text-white/86">{exercise.name}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/32">
                    Klar
                  </span>
                </div>
              ))}
            {reorderDraft.map((name, position) => (
              <div
                key={`draft-${name}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2.5"
              >
                <span className="text-sm font-medium text-white/86">{name}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setReorderDraft((prev) => {
                        if (position === 0) return prev;
                        const next = [...prev];
                        [next[position - 1], next[position]] = [next[position], next[position - 1]];
                        return next;
                      })
                    }
                    disabled={position === 0}
                    aria-label={`Flytta ${name} uppåt`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReorderDraft((prev) => {
                        if (position === prev.length - 1) return prev;
                        const next = [...prev];
                        [next[position], next[position + 1]] = [next[position + 1], next[position]];
                        return next;
                      })
                    }
                    disabled={position === reorderDraft.length - 1}
                    aria-label={`Flytta ${name} nedåt`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              onReorderExercises(reorderDraft);
              setShowReorderExercises(false);
            }}
            className="workout-primary-action w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] hover:bg-blue-500"
          >
            Klar
          </button>
        </div>
      </div>,
      document.body
    )}

    {showAddExercise && createPortal(
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end sm:justify-center">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[3px]" onClick={closeAddModal} />
        <div className="relative mx-4 mb-10 w-full max-w-lg space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
          {addManualMode ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-semibold text-white">Lägg till övning</p>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  onClick={() => {
                    setAddManualMode(false);
                    setAddShowCustomCategories(false);
                  }}
                  aria-label="Tillbaka till biblioteket"
                >
                  <CloseGlyph className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                autoFocus
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950/50 px-3 py-3 text-base text-white outline-none placeholder:text-white/28 focus:border-blue-300/35 sm:text-sm"
                value={workoutExerciseInput}
                onChange={(e) => {
                  setWorkoutExerciseInput(e.target.value);
                  setAddExerciseFeedback(null);
                  setAddShowCustomCategories(false);
                }}
                placeholder='t.ex. "Chins"'
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const result = addExerciseDuringWorkout();
                    if (result.handled) {
                      closeAddModal();
                    } else {
                      setAddExerciseFeedback(result.message ?? null);
                    }
                  }
                }}
              />
              {addExerciseFeedback ? (
                <p className="text-sm leading-5 text-amber-200/85">{addExerciseFeedback}</p>
              ) : null}
              {workoutExerciseInput.trim() ? (
                addShowCustomCategories ? (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                    <p className="text-xs font-medium text-white/50">Vad tränar den främst?</p>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {CUSTOM_EXERCISE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            const result = pickCustomExerciseForAdd(workoutExerciseInput, cat);
                            if (result.handled) closeAddModal();
                          }}
                          className="rounded-lg border border-white/[0.07] bg-slate-950/22 px-2 py-2 text-[11px] font-semibold capitalize text-white/64 transition hover:border-blue-300/32 hover:bg-blue-500/[0.10] hover:text-white"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-300/85 transition hover:text-blue-200"
                    onClick={() => setAddShowCustomCategories(true)}
                  >
                    Lägg in som egen övning
                  </button>
                )
              ) : null}
              <div className="flex flex-col gap-2">
                <button
                  className="workout-primary-action w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] hover:bg-blue-500"
                  onClick={() => {
                    const result = addExerciseDuringWorkout();
                    if (result.handled) {
                      closeAddModal();
                    } else {
                      setAddExerciseFeedback(result.message ?? null);
                    }
                  }}
                >
                  Lägg till
                </button>
                <button
                  className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-sm font-semibold text-white/70 transition active:scale-[0.98] hover:bg-white/[0.08]"
                  onClick={closeAddModal}
                >
                  Avbryt
                </button>
              </div>
            </>
          ) : (
            <LibraryBrowser
              title="Lägg till övning"
              search={librarySearch}
              setSearch={setLibrarySearch}
              category={libraryCategory}
              setCategory={setLibraryCategory}
              exercises={filteredLibraryExercises}
              onClose={closeAddModal}
              onPick={(name) => {
                const result = pickExerciseForAdd(name);
                if (result.handled) {
                  closeAddModal();
                } else {
                  setWorkoutExerciseInput(name);
                  setAddExerciseFeedback(result.message ?? null);
                  setAddShowCustomCategories(false);
                  setAddManualMode(true);
                }
              }}
              onUseManual={() => {
                setWorkoutExerciseInput(librarySearch);
                setAddExerciseFeedback(null);
                setAddShowCustomCategories(false);
                setAddManualMode(true);
              }}
            />
          )}
        </div>
      </div>,
      document.body
    )}

    {showSwapExercise && createPortal(
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end sm:justify-center">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[3px]" onClick={closeSwapModal} />
        <div className="relative mx-4 mb-10 w-full max-w-lg space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
          {swapManualMode ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-semibold text-white">Byt {currentExerciseName} mot</p>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  onClick={() => {
                    setSwapManualMode(false);
                    setSwapShowCustomCategories(false);
                  }}
                  aria-label="Tillbaka till biblioteket"
                >
                  <CloseGlyph className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                autoFocus
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950/50 px-3 py-3 text-base text-white outline-none placeholder:text-white/28 focus:border-blue-300/35 sm:text-sm"
                value={swapExerciseInput}
                onChange={(e) => {
                  setSwapExerciseInput(e.target.value);
                  setSwapExerciseFeedback(null);
                  setSwapShowCustomCategories(false);
                }}
                placeholder='t.ex. "Hantelrodd"'
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const result = swapCurrentExerciseDuringWorkout();
                    if (result.handled) {
                      closeSwapModal();
                    } else {
                      setSwapExerciseFeedback(result.message ?? null);
                    }
                  }
                }}
              />
              {swapExerciseFeedback ? (
                <p className="text-sm leading-5 text-amber-200/85">{swapExerciseFeedback}</p>
              ) : null}
              {swapExerciseInput.trim() ? (
                swapShowCustomCategories ? (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                    <p className="text-xs font-medium text-white/50">Vad tränar den främst?</p>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {CUSTOM_EXERCISE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            const result = pickCustomExerciseForSwap(swapExerciseInput, cat);
                            if (result.handled) closeSwapModal();
                          }}
                          className="rounded-lg border border-white/[0.07] bg-slate-950/22 px-2 py-2 text-[11px] font-semibold capitalize text-white/64 transition hover:border-blue-300/32 hover:bg-blue-500/[0.10] hover:text-white"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-300/85 transition hover:text-blue-200"
                    onClick={() => setSwapShowCustomCategories(true)}
                  >
                    Lägg in som egen övning
                  </button>
                )
              ) : null}
              <div className="flex flex-col gap-2">
                <button
                  className="workout-primary-action w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] hover:bg-blue-500"
                  onClick={() => {
                    const result = swapCurrentExerciseDuringWorkout();
                    if (result.handled) {
                      closeSwapModal();
                    } else {
                      setSwapExerciseFeedback(result.message ?? null);
                    }
                  }}
                >
                  Byt
                </button>
                <button
                  className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-sm font-semibold text-white/70 transition active:scale-[0.98] hover:bg-white/[0.08]"
                  onClick={closeSwapModal}
                >
                  Avbryt
                </button>
              </div>
            </>
          ) : (
            <LibraryBrowser
              title={`Byt ${currentExerciseName} mot`}
              search={librarySearch}
              setSearch={setLibrarySearch}
              category={libraryCategory}
              setCategory={setLibraryCategory}
              exercises={filteredLibraryExercises}
              onClose={closeSwapModal}
              onPick={(name) => {
                const result = pickExerciseForSwap(name);
                if (result.handled) {
                  closeSwapModal();
                } else {
                  setSwapExerciseInput(name);
                  setSwapExerciseFeedback(result.message ?? null);
                  setSwapShowCustomCategories(false);
                  setSwapManualMode(true);
                }
              }}
              onUseManual={() => {
                setSwapExerciseInput(librarySearch);
                setSwapExerciseFeedback(null);
                setSwapShowCustomCategories(false);
                setSwapManualMode(true);
              }}
            />
          )}
        </div>
      </div>,
      document.body
    )}
    {shouldShowRestDock ? (
      <div className="fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-5">
        <div
          className={`mx-auto w-full max-w-[345px] rounded-[1.35rem] border p-3 backdrop-blur-2xl transition ${
            restTimerState === "over"
              ? "border-orange-300/30 bg-[#2a1d12]/70 shadow-[0_8px_24px_rgba(0,0,0,0.22),0_0_18px_rgba(251,146,60,0.12)]"
              : restTimerState === "ready"
              ? "border-emerald-300/25 bg-[#10251d]/70 shadow-[0_8px_24px_rgba(0,0,0,0.22),0_0_18px_rgba(52,211,153,0.10)]"
              : "border-blue-400/20 bg-[#162032]/70 shadow-[0_8px_24px_rgba(0,0,0,0.22),0_0_16px_rgba(96,165,250,0.07)]"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
                Vila
              </p>
              <p
                className={`mt-0.5 text-2xl font-semibold tracking-tight ${
                  restTimerState === "over"
                    ? "text-orange-100"
                    : restTimerState === "ready"
                    ? "text-emerald-100"
                    : "text-white"
                }`}
              >
                {formatRestTimer(restElapsed)}
              </p>
              <p
                className={`mt-0.5 text-xs font-semibold ${
                  restTimerState === "over"
                    ? "text-orange-100/72"
                    : restTimerState === "ready"
                    ? "text-emerald-100/72"
                    : "text-white/48"
                }`}
              >
                {restTimerHint || (restTimerState === "over"
                  ? "över målet"
                  : restTimerState === "ready"
                  ? "vilan är klar"
                  : manualRestTarget
                  ? `mål ${restTarget.label}`
                  : `coach ${restTarget.label}`)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={restStartedAt ? restartRestTimer : startRestTimer}
                className="workout-ai-action inline-flex items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/[0.14] px-3 py-2 text-xs font-semibold text-blue-100 transition hover:bg-[#4f83ff]/[0.18]"
              >
                {restStartedAt ? <RotateGlyph className="h-5 w-5" /> : <><PlayGlyph className="h-5 w-5" /><span>Starta</span></>}
              </button>
              <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.055] bg-white/[0.026] px-2 py-1.5 text-[10px] font-semibold text-white/50">
                <span>Autostart</span>
                <ToggleSwitch
                  checked={autoStartRestTimer}
                  onChange={setAutoStartRestTimer}
                  size="sm"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRestTimer(false);
                  setRestDockForcedOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.06] text-sm font-semibold text-white/52 transition hover:bg-white/[0.09] hover:text-white"
                aria-label="Dölj vilotimer"
              >
                <CloseGlyph className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={`workout-rest-progress-fill h-full rounded-full transition-all duration-500 ${
                restTimerState === "over"
                  ? "bg-orange-300 shadow-[0_0_18px_rgba(251,146,60,0.35)]"
                  : restTimerState === "ready"
                  ? "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.35)]"
                  : "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.35)]"
              }`}
              style={{ width: `${restProgress * 100}%` }}
            />
          </div>

        </div>
      </div>
    ) : null}
    {showVideoReview && currentExerciseName ? (
      <SetVideoReview
        exerciseName={currentExerciseName}
        weight={videoReviewContext.weight}
        reps={videoReviewContext.reps}
        durationSeconds={videoReviewContext.durationSeconds}
        metricType={videoReviewContext.metricType}
        rir={videoReviewContext.rir}
        onClose={() => setShowVideoReview(false)}
        onFeedbackReceived={(text) => addCoachMessage(text, undefined, "video", currentExerciseName)}
      />
    ) : null}
    {showVideoInfo ? (
      <VideoFeedbackInfoModal onClose={() => setShowVideoInfo(false)} />
    ) : null}
    </>
  );
}

