export type CoachReplyMode = "fallback" | "ai-ready";

export type CoachExerciseLibraryInfo = {
  exerciseKey?: string;
  name: string;
  trains: string;
  equipment: string;
  whyChosen: string;
  logTypeText: string;
  keepInMind: string;
  easierAlternative?: string;
  techniqueCue: string;
  progressionRule: string;
  category?: string;
  primaryMuscle?: string;
  movementPattern?: string;
  techniqueFocus?: string[];
};

export type CoachSetContext = {
  kind: "set_feedback";
  userName?: string;
  goalPrimary: "muskel" | "styrka" | "fett";
  passLabel?: string;
  exerciseName: string;
  exerciseCategory?: string;
  setNumber: number;
  setPlan?: {
    plannedSetCount?: number;
    setsCompleted: number;
    setsRemaining?: number;
    isLastSet: boolean;
    nextSetIsLast: boolean;
    isLastExercise?: boolean;
  };
  currentSet: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
    loadText?: string;
    setText?: string;
    failNote?: string;
  };
  previousSet?: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
    setText?: string;
  };
  personalRecordText?: string;
  progressionOpportunity?: {
    type: "offer_increase" | "increase_now" | "optional_last_set_test";
    confidence: "medium" | "high";
    suggestedLoadText: string;
    reason: string;
    tone: "offer" | "clear";
  };
  // Hur många kvalificerande pass i rad toppvikten hållit (se
  // ExerciseProgressionPlan.sessionsAtTopWeight i page.tsx). 0/undefined om
  // ingen historik finns än.
  sessionsAtTopWeight?: number;
  decisionFacts?: {
    strategy?: "press" | "hold" | "backoff" | "reduce" | "complete";
    reasonCode?: string;
    weightChangeKg?: number;
    repsChange?: number;
    rirChange?: number;
    shouldMentionTechniqueCue: boolean;
  };
  uiHints?: {
    nextSetCardShowsPlan: boolean;
    avoidRepeatingFullPlan: boolean;
    avoidRepeatingRest: boolean;
    avoidRepeatingTechniqueCue: boolean;
  };
  nextTarget: {
    weight: number;
    loadText?: string;
    repsText: string;
    rirText: string;
    strategy?: "press" | "hold" | "backoff" | "reduce" | "complete";
    reason?: string;
    techniqueCue?: string;
  };
  restText?: string;
  memoryInsight?: string;
  limitations?: string;
  recentHealthNotes?: string[];
  recentWorkingWeights?: string[];
  warmupNote?: string;
  conditioningNote?: string;
  previousCoachReply?: string;
  recentConversation?: string[];
  computedSignals: string[];
  gymComparison?: {
    currentGymName: string;
    hasHistoryAtCurrentGym: boolean;
    differentFromLastSession: boolean;
  };
  otherGymReference?: {
    gymName: string;
    weightText: string;
    repsText: string;
    rirText?: string;
    daysAgo: number;
  };
  recoveryContext?: {
    exerciseLastTrainedDays: number | null;
    previousSession?: {
      daysAgo: number;
      exercises: string[];
      wasHard: boolean;
    };
  };
};

export type CoachSetVideoContext = {
  kind: "set_video_feedback";
  exerciseName: string;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
};

export type CoachChatContext = {
  kind: "workout_chat";
  userName?: string;
  userMessage: string;
  goalPrimary: "muskel" | "styrka" | "fett";
  passLabel?: string;
  dayForm?: "trött" | "normal" | "stark" | null;
  currentExerciseName?: string;
  currentExerciseCategory?: string;
  currentExerciseInfo?: CoachExerciseLibraryInfo;
  memoryInsight?: string;
  limitations?: string;
  recentHealthNotes?: string[];
  recentWorkingWeights?: string[];
  exerciseIndex?: number;
  exerciseCount?: number;
  currentExerciseCompleted?: boolean;
  currentSets?: Array<{
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
    failNote?: string;
  }>;
  currentCoachDecision?: {
    strategy: "press" | "hold" | "backoff" | "reduce" | "complete";
    reason: string;
    nextWeight?: string;
    targetReps?: string;
    targetRir?: string;
    restText?: string;
    techniqueCue?: string;
  };
  progressionOpportunity?: {
    type: "offer_increase" | "increase_now" | "optional_last_set_test";
    confidence: "medium" | "high";
    suggestedLoadText: string;
    reason: string;
    tone: "offer" | "clear";
  };
  // Säkert kalibreringstest-tak, om den aktuella övningen kvalificerar.
  // Facit för VAD som är säkert att föreslå om användaren själv efterfrågar
  // att testa hårdare — inte en instruktion att ta upp det proaktivt här.
  calibrationTestCandidate?: {
    weight: string;
    reason: string;
  };
  uiHints?: {
    nextSetCardShowsPlan: boolean;
    avoidRepeatingFullPlan: boolean;
    avoidRepeatingRest: boolean;
    avoidRepeatingTechniqueCue: boolean;
  };
  activePlan?: string[];
  activePlanExerciseInfo?: CoachExerciseLibraryInfo[];
  warmupNote?: string;
  conditioningNote?: string;
  previousCoachReply?: string;
  lastCoachMessageWasVideoFeedback?: boolean;
  recentConversation?: string[];
};

export type CoachExerciseIntroContext = {
  kind: "exercise_intro";
  userName?: string;
  exerciseName: string;
  position: "first" | "last" | "middle";
  isTimedExercise: boolean;
  target: {
    repsText?: string;
    rirText?: string;
    weight: number | null;
    restText: string;
    timedTargetText?: string;
  };
  history?: {
    topSet?: { weight: number; reps: number };
    lastSession?: { weight: number; reps: number; failNote?: string | null };
    bestTimeText?: string;
  };
  opportunity?: {
    type: "offer_increase" | "increase_now" | "optional_last_set_test";
    suggestedWeight: string;
    reason: string;
  };
  // Hur många kvalificerande pass i rad toppvikten hållit (se
  // ExerciseProgressionPlan.sessionsAtTopWeight i page.tsx). 0/undefined om
  // ingen historik finns än.
  sessionsAtTopWeight?: number;
  // Skild från opportunity med avsikt: det här är inte bevisad progression,
  // det är ett medvetet erbjudande om att testa UTANFÖR det bevisade.
  // Appen fyller ALDRIG i det här i viktfältet automatiskt — bara en synlig
  // knapp användaren själv väljer att trycka på.
  calibrationTestCandidate?: {
    weight: string;
    reason: string;
  };
  otherGymReference?: {
    gymName: string;
    weightText: string;
    repsText: string;
    rirText?: string;
    daysAgo: number;
  };
  previousWorkoutSummary?: string;
  recentHealthNotes?: string[];
  limitations?: string;
  recentChatNotes?: { duringExercise: string; notes: string[] };
};

export type CoachProgramContext = {
  kind: "program_input";
  userName?: string;
  userMessage: string;
  goalPrimary: "muskel" | "styrka" | "fett";
  goalSecondary?: ("muskel" | "styrka" | "fett")[];
  daysPerWeek: number;
  minutesPerSession: number;
  location: "gym" | "hemma";
  equipment: string[];
  exercisePreferences?: string[];
  limitations?: string;
  recentHealthNotes?: string[];
  workoutPlan: {
    title: string;
    passes: Array<{
      key: string;
      displayName: string;
      exercises: string[];
    }>;
  };
  exerciseLibrary?: CoachExerciseLibraryInfo[];
  existingPreferences: string[];
};

export type CoachProgramBuildContext = {
  kind: "program_build";
  userName?: string;
  profile: {
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
    limitations?: string;
  };
  availableExercises: Array<{
    exerciseKey?: string;
    name: string;
    category: string;
    equipment: string;
    environment?: "gym" | "hemma" | "båda";
    equipmentTags?: string[];
    primaryMuscle?: string;
    secondaryMuscles?: string[];
    exerciseType?: string;
    movementPattern?: string;
    logType?: string;
    techniqueCue: string;
    progressionRule: string;
    caution: string;
    difficulty?: "enkel" | "medel" | "avancerad";
    beginnerFit?: "bra" | "okej" | "undvik_som_standard";
    stability?: "hog" | "medel" | "lag";
    beginnerNote?: string;
    substitutions?: string[];
    coachReason?: string;
  }>;
  existingPreferences: string[];
  recentHealthNotes?: string[];
};

export type CoachWorkoutReviewContext = {
  kind: "workout_review";
  userName?: string;
  passLabel: string;
  summary: {
    durationMinutes: number;
    totalSets: number;
    completedExerciseCount: number;
    exerciseCount: number;
    totalVolumeText: string;
    bestSetText: string;
    isPartial: boolean;
  };
  progression: {
    improved: string[];
    same: string[];
    worse: string[];
  };
  gymCalibrationNote?: string;
  exercises: Array<{
    name: string;
    sets: Array<{
      weight: number;
      reps: number;
      rir?: number;
      failNote?: string;
    }>;
  }>;
  events?: Array<{
    type: "pain" | "exercise_replaced" | "exercise_completed_early";
    exerciseName: string;
    note?: string;
    setCount?: number;
    replacementName?: string;
  }>;
  userNotes?: Array<{ exerciseName?: string; text: string }>;
  warmupNote?: string;
  conditioningNote?: string;
  dayForm?: "trött" | "normal" | "stark" | null;
  recentSessions?: Array<{
    passLabel: string;
    daysAgo: number;
    totalSets: number;
    hadPainOrEarlyStop: boolean;
  }>;
};

export type CoachWorkoutReviewResult = {
  coachHeadline: string;
  coachSummary: string;
  positives: string[];
  adjustments: string[];
  nextFocus: string[];
  coachMemoryTakeaway: string[];
  lobbyText?: string;
};

export type CoachWrappedContext = {
  kind: "wrapped_recap";
  userName?: string;
  monthLabel: string;
  passCount: number;
  totalMinutes: number;
  totalVolumeKg: number;
  topMuscleCategory: string | null;
  topMuscleCategoryPercent: number | null;
  biggestPb: {
    exerciseName: string;
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    improvementPercent: number;
  } | null;
};

export type CoachWrappedResult = {
  activityCaption: string;
  pbCaption: string;
  reflectionCaption: string;
};

export type BuiltProgramExercise = {
  exerciseKey?: string;
  name: string;
  purpose?: string;
  sets?: string;
  reps?: string;
  rir?: string;
  caution?: string;
  alternatives?: string[];
};

export type BuiltProgramPass = {
  key: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  displayName: string;
  intent?: string;
  exercises: BuiltProgramExercise[];
};

export type BuiltWorkoutPlan = {
  title: string;
  goalPrimary: "muskel" | "styrka" | "fett";
  daysPerWeek: number;
  coachSummary?: string;
  planReason?: string;
  structureReason?: string;
  safetyNotes?: string[];
  source?: "ai" | "fallback" | "manual";
  builtAt?: string;
  profileSignature?: string;
  passes: BuiltProgramPass[];
};

export type CoachProgramSuggestionAction =
  | {
      type: "add_exercise";
      exerciseName: string;
      passKey?: "A" | "B" | "C" | "D" | "E" | "F" | "G";
      passName?: string;
      reason?: string;
    }
  | {
      type: "remove_exercise";
      exerciseName: string;
      reason?: string;
    }
  | {
      type: "replace_exercise";
      fromExerciseName: string;
      toExerciseName: string;
      reason?: string;
    }
  | {
      type: "rename_pass";
      passKey: "A" | "B" | "C" | "D" | "E" | "F" | "G";
      displayName: string;
      reason?: string;
    };

export type CoachProgramSuggestion = {
  summary: string;
  actions: CoachProgramSuggestionAction[];
};

export type CoachChatAction =
  | {
      type: "replace_exercise";
      fromExerciseName: string;
      toExerciseName: string;
    }
  | {
      type: "note_limitation";
      text: string;
    };

export type CoachPromptPayload = {
  system: string;
  context:
    | CoachSetContext
    | CoachChatContext
    | CoachProgramContext
    | CoachProgramBuildContext
    | CoachWorkoutReviewContext
    | CoachExerciseIntroContext
    | CoachSetVideoContext
    | CoachWrappedContext;
  instruction: string;
  maxCharacters: number;
};

export const MAX_COACH_REPLY_CHARACTERS = 620;
export const MAX_CHAT_REPLY_CHARACTERS = 500;
export const MAX_EXERCISE_INTRO_CHARACTERS = 500;
export const MAX_WRAPPED_ACTIVITY_CAPTION_CHARACTERS = 100;
export const MAX_WRAPPED_PB_CAPTION_CHARACTERS = 100;
export const MAX_WRAPPED_REFLECTION_CAPTION_CHARACTERS = 160;

function compactWhitespace(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/([.!?])(?=[A-ZÅÄÖ])/g, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function softenOverusedSurpriseEmoji(text: string) {
  return text.replace(/^😳\s*\n+(?=Där ja\.?\s*$|Där ja\.?\s*\n)/gim, "");
}

export function sanitizeCoachReply(
  reply: string,
  fallback: string,
  maxCharacters = MAX_COACH_REPLY_CHARACTERS
) {
  const compact = compactWhitespace(softenOverusedSurpriseEmoji(reply));

  if (!compact) return compactWhitespace(fallback);

  if (compact.length <= maxCharacters) return compact;

  const truncated = compact.slice(0, maxCharacters);
  const lastEnd = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?")
  );
  const shortened =
    lastEnd > truncated.length / 2
      ? truncated.slice(0, lastEnd + 1).trim()
      : truncated.replace(/\s+\S*$/, "").trim();
  return shortened || compactWhitespace(fallback);
}

function compactRoutineSetFallback(context: CoachSetContext, fallbackReply: string) {
  const isRoutineDecision =
    context.nextTarget.strategy === "hold" ||
    context.nextTarget.strategy === "press";
  const hasFailNote = Boolean(context.currentSet.failNote?.trim());
  const isTimed =
    context.currentSet.metricType === "time" ||
    typeof context.currentSet.durationSeconds === "number";

  if (!isRoutineDecision || hasFailNote || isTimed) {
    return fallbackReply;
  }

  const lines = fallbackReply.split("\n");
  const nextBlockIndex = lines.findIndex(
    (line) => line.trim().toLowerCase() === "nästa set:"
  );

  if (nextBlockIndex < 0) {
    return fallbackReply;
  }

  const keptLines = lines.slice(0, nextBlockIndex);

  while (keptLines.length > 0 && !keptLines[keptLines.length - 1].trim()) {
    keptLines.pop();
  }

  const keptText = keptLines.join("\n").trim();
  if (!keptText) return fallbackReply;

  return `${keptText}\n\nNästa steg syns i rutan.`;
}


function removeDuplicateShortReactions(reply: string) {
  return reply
    .replace(
      /\b(Okej|Bra|Japp)\.\s*\n\s*\n\s*D[äa]r tog det stopp\.\s*\n\s*\n\s*\1\./gi,
      "$1.\n\nDär tog det stopp."
    )
    .replace(
      /\bD[äa]r tog det stopp\.\s*\n\s*\n\s*(Okej|Bra|Japp)\.\s*$/gi,
      "Där tog det stopp."
    )
    .replace(
      /\b(D[äa]r ja|Bra|Okej|Japp|Nu snackar vi)([.!])?\s*(?:👊|🔥|✅)?\s*\n\s*\n\s*\1[.!]?\s*(?:👊|🔥|✅)?/gi,
      "$1$2"
    );
}

function removeStackedRecordPraise(reply: string) {
  if (!/\bNytt PB:/i.test(reply)) return reply;

  return reply
    .replace(
      /\b(D[äa]r ja|Bra|Snyggt|Nu snackar vi|Oj)([.!])?\s*(👊|🔥|✅|😳)?\s*\r?\n\s*\r?\n\s*(Nytt PB:[^\r\n]+)\s*\r?\n\s*\r?\n\s*\1[.!]?\s*(?:👊|🔥|✅|😳)?/gi,
      (_, reaction: string, punctuation = "", emoji = "", record: string) =>
        `${reaction}${punctuation}${emoji ? ` ${emoji}` : ""}\n\n${record}`
    )
    .replace(
      /\b(Nytt PB:[^\r\n]+)\s*\r?\n\s*\r?\n\s*(?:D[äa]r ja[.!]?|Bra[.!]?|Snyggt[.!]?|Okej\. Nu snackar vi\.?|Nu snackar vi[.!]?|Oj[.!]?)\s*(?:👊|🔥|✅|😳)?\s*(?=\r?\n\s*\r?\n)/gi,
      "$1"
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeDuplicateAdjacentLines(reply: string) {
  const lines = reply.split("\n");
  const deduped: string[] = [];

  for (const line of lines) {
    const current = line.trim();
    const previous = deduped[deduped.length - 1]?.trim();

    if (current && previous && current.toLowerCase() === previous.toLowerCase()) {
      continue;
    }

    deduped.push(line);
  }

  return deduped.join("\n");
}

export function sanitizeCoachSetReply(
  context: CoachSetContext,
  reply: string,
  fallback: string,
  maxCharacters = MAX_COACH_REPLY_CHARACTERS
) {
  const deduped = removeDuplicateAdjacentLines(reply);
  const withoutDuplicateReaction = removeDuplicateShortReactions(deduped);
  const withRecordPraiseDedupe = removeStackedRecordPraise(withoutDuplicateReaction);

  return sanitizeCoachReply(
    withRecordPraiseDedupe,
    fallback,
    maxCharacters
  );
}

export function sanitizeCoachSetFallback(
  context: CoachSetContext,
  fallbackReply: string,
  maxCharacters = MAX_COACH_REPLY_CHARACTERS
) {
  const compactFallback = compactRoutineSetFallback(context, fallbackReply);

  return sanitizeCoachSetReply(
    context,
    compactFallback,
    compactFallback,
    maxCharacters
  );
}

export function sanitizeCoachChatReply(
  context: CoachChatContext,
  reply: string,
  fallback: string,
  maxCharacters = MAX_CHAT_REPLY_CHARACTERS
) {
  let text = reply;

  if (context.currentExerciseCompleted) {
    text = text
      .replace(/\bTesta ([^.\n]+?) p[åa] n[aä]sta set\b/gi, "Vi testar $1 nästa gång")
      .replace(/\bK[öo]r ([^.\n]+?) p[åa] n[aä]sta set\b/gi, "Vi tar $1 nästa gång")
      .replace(/\bp[åa] n[aä]sta set\b/gi, "nästa gång")
      .replace(/\bn[aä]sta set\b/gi, "nästa gång")
      .replace(/\boch s[aä]g RIR direkt efter\.?/gi, "")
      .replace(/\bk[öo]r n[aä]r du [aä]r redo\.?/gi, "");
  }

  return sanitizeCoachReply(text, fallback, maxCharacters);
}


export async function requestAiCoachSetVideoReply(args: {
  context: CoachSetVideoContext;
  frames: string[];
  fallbackReply: string;
  signal?: AbortSignal;
}) {
  const { context, frames, fallbackReply, signal } = args;

  try {
    const response = await fetch("/api/coach/set-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, frames, fallbackReply }),
      signal,
    });

    if (!response.ok) {
      return {
        mode: "fallback" as const,
        reason: "request_failed",
        text: fallbackReply,
      };
    }

    const data = (await response.json()) as {
      mode?: "ai" | "fallback";
      reason?: string;
      text?: string;
      needsNewAngle?: boolean;
    };

    return {
      mode: data.mode ?? "fallback",
      reason: data.reason,
      text: data.text ?? fallbackReply,
      needsNewAngle: data.needsNewAngle ?? false,
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      text: fallbackReply,
      needsNewAngle: false,
    };
  }
}

export async function requestAiCoachSetReply(args: {
  context: CoachSetContext;
  fallbackReply: string;
  signal?: AbortSignal;
}) {
  const { context, fallbackReply, signal } = args;
  const fallback = {
    text: sanitizeCoachSetReply(
      context,
      fallbackReply,
      fallbackReply,
      MAX_COACH_REPLY_CHARACTERS
    ),
  };

  try {
    const response = await fetch("/api/coach/set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context,
        fallbackReply,
      }),
      signal,
    });

    if (!response.ok) {
      return {
        mode: "fallback" as const,
        reason: "request_failed",
        text: fallback.text,
      };
    }

    const data = (await response.json()) as {
      mode?: "ai" | "fallback";
      reason?: string;
      text?: string;
      suggestion?: CoachProgramSuggestion | null;
    };

    return {
      mode: data.mode ?? "fallback",
      reason: data.reason,
      text: data.text ?? fallback.text,
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      text: fallback.text,
    };
  }
}

export async function requestAiCoachChatReply(args: {
  context: CoachChatContext;
  fallbackReply: string;
  signal?: AbortSignal;
}) {
  const { context, fallbackReply, signal } = args;
  const fallbackText = sanitizeCoachReply(
    fallbackReply,
    fallbackReply,
    MAX_CHAT_REPLY_CHARACTERS
  );

  try {
    const response = await fetch("/api/coach/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context,
        fallbackReply,
      }),
      signal,
    });

    if (!response.ok) {
      return {
        mode: "fallback" as const,
        reason: "request_failed",
        text: fallbackText,
        action: null,
      };
    }

    const data = (await response.json()) as {
      mode?: "ai" | "fallback";
      reason?: string;
      text?: string;
      action?: CoachChatAction | null;
    };

    return {
      mode: data.mode ?? "fallback",
      reason: data.reason,
      text: sanitizeCoachChatReply(
        context,
        data.text ?? "",
        fallbackText,
        MAX_CHAT_REPLY_CHARACTERS
      ),
      action: data.action ?? null,
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      text: fallbackText,
      action: null,
    };
  }
}

export async function requestAiCoachExerciseIntro(args: {
  context: CoachExerciseIntroContext;
  fallbackReply: string;
  signal?: AbortSignal;
}) {
  const { context, fallbackReply, signal } = args;
  const fallbackText = sanitizeCoachReply(
    fallbackReply,
    fallbackReply,
    MAX_EXERCISE_INTRO_CHARACTERS
  );

  try {
    const response = await fetch("/api/coach/exercise-intro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context,
        fallbackReply,
      }),
      signal,
    });

    if (!response.ok) {
      return {
        mode: "fallback" as const,
        reason: "request_failed",
        text: fallbackText,
      };
    }

    const data = (await response.json()) as {
      mode?: "ai" | "fallback";
      reason?: string;
      text?: string;
    };

    return {
      mode: data.mode ?? "fallback",
      reason: data.reason,
      text: sanitizeCoachReply(data.text ?? "", fallbackText, MAX_EXERCISE_INTRO_CHARACTERS),
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      text: fallbackText,
    };
  }
}

export async function requestAiProgramReply(args: {
  context: CoachProgramContext;
  fallbackReply: string;
  signal?: AbortSignal;
}) {
  const { context, fallbackReply, signal } = args;
  const fallbackText = sanitizeCoachReply(
    fallbackReply,
    fallbackReply,
    MAX_CHAT_REPLY_CHARACTERS
  );

  try {
    const response = await fetch("/api/coach/program", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context,
        fallbackReply,
      }),
      signal,
    });

    if (!response.ok) {
      return {
        mode: "fallback" as const,
        reason: "request_failed",
        text: fallbackText,
      };
    }

    const data = (await response.json()) as {
      mode?: "ai" | "fallback";
      reason?: string;
      text?: string;
    };

    return {
      mode: data.mode ?? "fallback",
      reason: data.reason,
      text: sanitizeCoachReply(
        data.text ?? "",
        fallbackText,
        MAX_CHAT_REPLY_CHARACTERS
      ),
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      text: fallbackText,
    };
  }
}

export async function requestAiProgramBuild(args: {
  context: CoachProgramBuildContext;
  fallbackPlan: BuiltWorkoutPlan;
  signal?: AbortSignal;
}) {
  const { context, fallbackPlan, signal } = args;

  try {
    const response = await fetch("/api/coach/program/build", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context,
        fallbackPlan,
      }),
      signal,
    });

    if (!response.ok) {
      return {
        mode: "fallback" as const,
        reason: "request_failed",
        plan: fallbackPlan,
      };
    }

    const data = (await response.json()) as {
      mode?: "ai" | "fallback";
      reason?: string;
      plan?: BuiltWorkoutPlan | null;
    };

    return {
      mode: data.mode ?? "fallback",
      reason: data.reason,
      plan: data.plan ?? fallbackPlan,
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      plan: fallbackPlan,
    };
  }
}

export async function requestAiWorkoutReview(args: {
  context: CoachWorkoutReviewContext;
  fallbackReview: CoachWorkoutReviewResult;
  signal?: AbortSignal;
}) {
  const { context, fallbackReview, signal } = args;

  try {
    const response = await fetch("/api/coach/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context,
        fallbackReview,
      }),
      signal,
    });

    if (!response.ok) {
      return {
        mode: "fallback" as const,
        reason: "request_failed",
        review: fallbackReview,
      };
    }

    const data = (await response.json()) as {
      mode?: "ai" | "fallback";
      reason?: string;
      review?: CoachWorkoutReviewResult | null;
    };

    return {
      mode: data.mode ?? "fallback",
      reason: data.reason,
      review: data.review ?? fallbackReview,
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      review: fallbackReview,
    };
  }
}

export async function requestAiWrapped(args: {
  month: string;
  context: CoachWrappedContext;
  stats: unknown;
  fallbackCaptions: CoachWrappedResult;
  signal?: AbortSignal;
}) {
  const { month, context, stats, fallbackCaptions, signal } = args;

  try {
    const response = await fetch("/api/coach/wrapped", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        month,
        context,
        stats,
        fallbackCaptions,
      }),
      signal,
    });

    if (!response.ok) {
      return {
        mode: "fallback" as const,
        reason: "request_failed",
        captions: fallbackCaptions,
      };
    }

    const data = (await response.json()) as {
      mode?: "ai" | "fallback";
      reason?: string;
      captions?: CoachWrappedResult | null;
    };

    return {
      mode: data.mode ?? "fallback",
      reason: data.reason,
      captions: data.captions ?? fallbackCaptions,
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      captions: fallbackCaptions,
    };
  }
}
