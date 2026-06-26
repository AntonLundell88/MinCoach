import {
  containsForbiddenCoachPhrase,
  MINCOACH_AI_SYSTEM_RULES,
  PROGRAM_DESIGN_PROTOCOL,
  TRAINING_DECISION_PROTOCOL,
} from "./coachRules";
import {
  COACH_HARD_GUARDRAILS,
  COACH_LANGUAGE_NOTES,
  COACH_SOUL_RULES,
  COACH_VOICE_BRIEF,
  COACH_VOICE_EXAMPLES,
} from "./coachVoice";

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
    type: "offer_increase" | "increase_now";
    confidence: "medium" | "high";
    suggestedLoadText: string;
    reason: string;
    tone: "offer" | "clear";
  };
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
  warmupNote?: string;
  conditioningNote?: string;
  previousCoachReply?: string;
  computedSignals: string[];
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
    type: "offer_increase" | "increase_now";
    confidence: "medium" | "high";
    suggestedLoadText: string;
    reason: string;
    tone: "offer" | "clear";
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
  exercises: Array<{
    name: string;
    sets: Array<{
      weight: number;
      reps: number;
      rir?: number;
      failNote?: string;
    }>;
  }>;
  warmupNote?: string;
  conditioningNote?: string;
};

export type CoachWorkoutReviewResult = {
  coachHeadline: string;
  coachSummary: string;
  positives: string[];
  adjustments: string[];
  nextFocus: string[];
  coachMemoryTakeaway: string[];
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

export type CoachPromptPayload = {
  system: string;
  context:
    | CoachSetContext
    | CoachChatContext
    | CoachProgramContext
    | CoachProgramBuildContext
    | CoachWorkoutReviewContext;
  instruction: string;
  maxCharacters: number;
};

const MAX_COACH_REPLY_CHARACTERS = 620;
const MAX_CHAT_REPLY_CHARACTERS = 800;
const COACH_REPLY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/(\d+)\s*[–-]\s*(\d+)\s*@\s*RIR\s*([0-5]\+?)\s*[–-]\s*([0-5]\+?)/gi, "$1-$2 reps, RIR $3-$4"],
  [/(\d+)\s*@\s*RIR\s*([0-5]\+?)/gi, "$1 reps med RIR $2"],
  [
    /\bFokus till n[äa]sta:\s*tryck j[äa]mnt,\s*h[åa]ll skuldrorna stabila och v[äa]nd kontrollerat\.?/gi,
    "Tänk på att trycka jämnt, hålla skuldrorna stabila och utföra övningen kontrollerat.",
  ],
  [
    /\bFokus:\s*tryck j[äa]mnt,\s*h[åa]ll skuldrorna stabila och v[äa]nd kontrollerat\.?/gi,
    "Tänk på att trycka jämnt, hålla skuldrorna stabila och utföra övningen kontrollerat.",
  ],
  [/\bVi är klara med den här övningen\.\./gi, "Vi är klara med den här övningen."],
  [/\bVi är klara med den här övningen\.\s*✅/gi, "Vi är klara med den här övningen. ✅"],
  [/\bFint tryck där\s*[–—-]\s*håll vikten[^.?!]*[.?!]?/gi, "Vi kör samma igen."],
  [/\bSmart backoff\s*[–—-]\s*samma kontroll men lite mer marginal nu\.?/gi, "Jag tycker vi sänker lite."],
  [/\bSmart backoff:\s*samma kontroll,\s*lite mer marginal nu\.?/gi, "Jag tycker vi sänker lite."],
  [/\s*Klar\?\s*/gi, " "],
  [/\bKlar\?\s*$/gim, ""],
  [/\bKlar\.\s*$/gim, ""],
  [/\b\d+(?:[,.]\d+)?\s*kg,\s*g[åa] vidare\s*[–—-]\s*klar\b/gi, "övningen är klar"],
  [/\bg[åa] vidare\s*[–—-]\s*klar\b/gi, "övningen är klar"],
  [/\bAvsluta övningen\s*[–—-]\s*g[åa] vidare till nästa\.?/gi, "Vi är klara med den här övningen.\n\nVidare."],
  [/\bDen d[äa]r [äa]r f[äa]rdig\s*[–—-]?/gi, "Vi är klara med den här övningen."],
  [/~\s*(\d+)/g, "cirka $1"],
  [/\bGripegling\b/gi, "När greppet glider"],
  [/\bgrepegling\b/gi, "när greppet glider"],
  [/\bKettletown\b/gi, "curlen"],
  [/\bkettletown\b/gi, "curlen"],
  [/\btryggningen\b/gi, "tryggheten"],
  [/\btryggning\b/gi, "trygghet"],
  [/\bTeknikcue\s*:/gi, "Fokus:"],
  [/\bteknikcue\s*:/gi, "Fokus:"],
  [/\bteknikcue\b/gi, "fokus"],
];
const NAME_USAGE_RULE =
  "Använd användarens namn mycket sparsamt. Skriv inte namnet i vanliga svar som \"Bra fråga\" eller \"Okej\". Namnet får användas vid start, stora milstolpar eller när extra närvaro behövs, men högst undantagsvis. Om du är osäker: använd inte namnet.";

function compactWhitespace(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function applyCoachReplyGuardrails(text: string) {
  return COACH_REPLY_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    text
  );
}

function addPulseToVeryShortReply(text: string) {
  if (text === "Bra.") return "Bra!";
  if (text === "Där ja.") return "Där ja!";
  if (text === "Japp.") return "Japp 👊";
  if (text === "Exakt.") return "Exakt 👊";
  if (text === "Snyggt.") return "Snyggt 👊";
  return text;
}

function addPulseToShortOpening(text: string) {
  return text
    .replace(/^(Bra|Där ja|Exakt|Snyggt)\.\s*$/m, "$1!")
    .replace(/^(Bra|Där ja|Exakt|Snyggt)\.\n/m, "$1!\n")
    .replace(/^Japp\.\s*$/m, "Japp 👊")
    .replace(/^Japp\.\n/m, "Japp 👊\n");
}

function softenOverusedSurpriseEmoji(text: string) {
  return text.replace(/^😳\s*\n+(?=Där ja\.?\s*$|Där ja\.?\s*\n)/gim, "");
}

export function sanitizeCoachReply(
  reply: string,
  fallback: string,
  maxCharacters = MAX_COACH_REPLY_CHARACTERS
) {
  const compact = addPulseToVeryShortReply(
    addPulseToShortOpening(
      compactWhitespace(applyCoachReplyGuardrails(softenOverusedSurpriseEmoji(reply)))
    )
  );

  if (!compact) return compactWhitespace(fallback);
  if (containsForbiddenCoachPhrase(compact)) return compactWhitespace(fallback);

  if (compact.length <= maxCharacters) return compact;

  const shortened = compact.slice(0, maxCharacters).replace(/\s+\S*$/, "").trim();
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

function hasTooLightSameWeightTrend(context: CoachSetContext) {
  return context.computedSignals.some((signal) =>
    signal.startsWith("too_light_same_weight_trend")
  );
}

function ensureSetMilestoneReaction(context: CoachSetContext, reply: string) {
  const recordText = context.personalRecordText?.trim() ?? "";
  const isNewPersonalBest = recordText.toLowerCase().startsWith("nytt person");
  const alreadyMentionsRecord = /\b(pb|pr)\b|personbästa|personbasta/i.test(reply);

  if (!isNewPersonalBest || alreadyMentionsRecord || hasTooLightSameWeightTrend(context)) {
    return reply;
  }

  const setText = context.currentSet.setText?.trim() || recordText;
  const reactions = ["Där ja! 👊", "Oj! 👊", "Nu snackar vi!"];
  const reaction = reactions[Math.max(0, context.setNumber - 1) % reactions.length];

  return `${reaction}\n\nNytt PB: ${setText}.\n\n${reply}`;
}

function applyTrainingSignalOverrides(context: CoachSetContext, reply: string) {
  const tooLight = hasTooLightSameWeightTrend(context);

  if (tooLight) {
    if (context.nextTarget.strategy === "complete") {
      return "Okej.\n\nDen var för lätt idag.\n\nNästa gång öppnar vi högre.";
    }

    return "Okej.\n\nDen var lätt.\n\nUpp ett steg.";
  }

  return reply;
}

function reduceRepeatedPersonalRecordLanguage(context: CoachSetContext, reply: string) {
  const isNewPersonalBest = context.personalRecordText
    ?.trim()
    .toLowerCase()
    .startsWith("nytt person");
  const previousMentionedRecord = /\b(pb|pr)\b|personbästa|personbasta/i.test(
    context.previousCoachReply ?? ""
  );

  if (!isNewPersonalBest || !previousMentionedRecord) return reply;

  return reply
    .replace(/\bDär ja\s*[–—-]\s*personbästa!?[^\n]*/gi, "Haha okej.\n\nIgen?")
    .replace(/\bDär ja\s*[–—-]\s*nytt PB!?[^\n]*/gi, "Haha okej.\n\nIgen?")
    .replace(/\bpersonbästa!\s*Den satt\.?/gi, "den satt.")
    .replace(/\bnytt personbästa\b/gi, "nytt PB")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMeaningfulLine(text?: string) {
  if (!text) return "";
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function varyRepeatedOpening(context: CoachSetContext, reply: string) {
  const previousOpening = firstMeaningfulLine(context.previousCoachReply).toLowerCase();
  if (!previousOpening) return reply;

  const lines = reply.split("\n");
  const firstIndex = lines.findIndex((line) => line.trim());
  if (firstIndex < 0) return reply;

  const currentOpening = lines[firstIndex].trim();
  if (currentOpening.toLowerCase() !== previousOpening) return reply;

  const alternatives: Record<string, string[]> = {
    "bra.": ["Japp 👊", "Okej.", "Där ja!"],
    "okej.": ["Japp 👊", "Bra!", "Där ja!"],
    "japp.": ["Bra!", "Okej.", "Där ja!"],
  };

  const options = alternatives[previousOpening];
  if (!options) return reply;

  lines[firstIndex] = options[Math.max(0, context.setNumber - 1) % options.length];
  return lines.join("\n");
}

function emphasizeHardStopWhenObvious(context: CoachSetContext, reply: string) {
  const current = context.currentSet;
  const previous = context.previousSet;
  const sameLoad =
    typeof previous?.weight === "number" &&
    typeof current.weight === "number" &&
    Math.abs(previous.weight - current.weight) < 0.01;
  const repsDropped =
    typeof previous?.reps === "number" &&
    typeof current.reps === "number" &&
    previous.reps - current.reps >= 2;
  const failText = current.failNote?.trim().toLowerCase() ?? "";
  const hasReportedStop =
    Boolean(failText) &&
    (failText.includes("fail") ||
      failText.includes("failure") ||
      failText.includes("stopp") ||
      failText.includes("slut") ||
      failText.includes("ork") ||
      failText.includes("teknik") ||
      failText.includes("slarv") ||
      failText.includes("ont") ||
      failText.includes("smärta") ||
      failText.includes("känning"));

  if (!sameLoad || !repsDropped || !hasReportedStop) return reply;
  if (/tog det stopp|failure|fail/i.test(reply)) return reply;

  const lines = reply.split("\n");
  const firstIndex = lines.findIndex((line) => line.trim());
  if (firstIndex < 0) return reply;

  if (/^bra\.?$/i.test(lines[firstIndex].trim())) {
    lines[firstIndex] = "Okej.\n\nDär tog det stopp.";
    return lines.join("\n");
  }

  return `Okej.\n\nDär tog det stopp.\n\n${reply}`;
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

function removeVisiblePlanRepetition(context: CoachSetContext, reply: string) {
  const hints = context.uiHints;
  if (!hints?.nextSetCardShowsPlan) return reply;

  const lines = reply.split("\n");
  const cleaned: string[] = [];
  let skippingPlanBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (lower === "nästa set:" || lower === "nasta set:") {
      skippingPlanBlock = true;
      continue;
    }

    if (skippingPlanBlock) {
      if (!line) {
        skippingPlanBlock = false;
      }
      continue;
    }

    if (hints.avoidRepeatingTechniqueCue) {
      const focusIndex = rawLine.search(/Fokus(?:\s+till\s+n[äa]sta\s+set)?\s*:/i);
      if (focusIndex >= 0) {
        const beforeFocus = rawLine.slice(0, focusIndex).trim();
        const normalized = beforeFocus
          .replace(/\bSamma vikt(?:\s+igen)?\.?/gi, "Vi kör samma igen.")
          .replace(/\b(?:Samma igen|Vi kör samma igen)\.\s*(?:igen|Vi kör samma igen)\.?/gi, "Vi kör samma igen.")
          .replace(/\s{2,}/g, " ")
          .trim();
        if (normalized) {
          cleaned.push(normalized);
        }
        continue;
      }
    }

    if (
      hints.avoidRepeatingTechniqueCue &&
      /^fokus(?:\s+till\s+nästa\s+set)?\s*:/i.test(line)
    ) {
      continue;
    }

    if (hints.avoidRepeatingRest && /\bvila\b/i.test(line)) {
      continue;
    }

    if (
      hints.avoidRepeatingFullPlan &&
      /\b(?:nästa|nasta|sikta|håll vikten|hall vikten|kör nästa|kor nasta|kör samma|kor samma)\b/i.test(line) &&
      (/\bkg\b/i.test(line) || /\breps\b/i.test(line) || /\bRIR\b/i.test(line))
    ) {
      const isSameAgain = /\b(?:håll vikten|hall vikten|samma vikt|kör samma|kor samma)\b/i.test(line);
      if (isSameAgain) {
        cleaned.push("Vi kör samma igen.");
      }
      continue;
    }

    const nextLine = rawLine
      .replace(/\bnästa set enligt planen\s*:\s*/gi, "")
      .replace(/\bSamma vikt igen\s*[–—-]\s*sikta på[^.]*\.?/gi, "Vi kör samma igen.")
      .replace(/\bSamma vikt(?:\s+igen)?\.?/gi, "Vi kör samma igen.")
      .replace(/\bHåll vikten\s*[^.]*\.?/gi, "Vi kör samma igen.")
      .replace(/\bKör samma igen\s*[–—-]\s*[^.]*RIR[^.]*\.?/gi, "Vi kör samma igen.")
      .replace(/\bKör samma vikt\s*[–—-]\s*\.?$/gi, "Vi kör samma igen.")
      .replace(/\bKör samma vikt\s*[–—-]\s*[^.]*RIR[^.]*\.?/gi, "Vi kör samma igen.")
      .replace(/\bNästa set[^.?!]*(?:kg|reps|RIR)[^.?!]*[.?!]?/gi, "")
      .replace(/\bKör nästa set på\s*[^.]*RIR[^.]*\.?/gi, "Gör nästa rent.")
      .replace(/\bVi backar lite som planerat för ett avslut\.?/gi, "Jag tycker vi sänker lite.")
      .replace(/\bNu backar vi lite\s*[–—-]\s*[^.]*\.?/gi, "Jag tycker vi sänker lite.")
      .replace(/\bVi backar lite\s*[–—-]\s*[^.]*\.?/gi, "Jag tycker vi sänker lite.")
      .replace(/\bVi backar lite\.?/gi, "Jag tycker vi sänker lite.")
      .replace(/\bDär tog det stopp\.\s*Jag tycker vi sänker lite\.\s*Klar\.?/gi, "Där tog det stopp.\n\nJag tycker vi sänker lite.")
      .replace(/\s*\bKlar\.?\s*$/gi, "")
      .replace(/\s*,?\s*sikta på [^.]*RIR[^.]*\.?/gi, ".")
      .replace(/\b(?:Samma igen|Vi kör samma igen)\.\s*(?:igen|Vi kör samma igen)\.?/gi, "Vi kör samma igen.")
      .replace(/\s*[–—-]\s*\./g, ".")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!nextLine) continue;
    cleaned.push(nextLine);
  }

  return cleaned.join("\n");
}

function ensureAdjustmentMention(context: CoachSetContext, reply: string) {
  const strategy = context.nextTarget.strategy;
  if (strategy !== "reduce" && strategy !== "backoff") return reply;

  const currentWeight = context.currentSet.weight;
  const nextWeight = context.nextTarget.weight;
  const weightWasReduced =
    Number.isFinite(currentWeight) &&
    Number.isFinite(nextWeight) &&
    nextWeight < currentWeight;

  if (!weightWasReduced) return reply;
  if (/\bs[äa]nker\b|\bs[äa]nk\b|\bbackar\b|\bbackoff\b/i.test(reply)) {
    return reply;
  }

  const isRecordSet = /\bNytt PB:/i.test(reply);
  const line = isRecordSet
    ? "Riktigt bra. Jag tycker vi sänker lite nu så nästa set också blir snyggt."
    : typeof context.currentSet.rir === "number" && context.currentSet.rir <= 0
      ? "Jag tycker vi sänker lite så nästa set också blir rent."
      : "Jag tycker vi sänker lite här.";

  return reply.trim() ? `${reply.trim()}\n\n${line}` : line;
}

function ensureUnderTargetWithMarginMention(context: CoachSetContext, reply: string) {
  if (context.decisionFacts?.reasonCode !== "under_target_with_margin") return reply;

  const text = reply.trim();
  const saysMoreWasAvailable = /\b(fanns mer|mer kvar|lämnade .*kvar|hade mer|för snällt)\b/i.test(text);
  const pointsToSameWeight = /\b(samma igen|samma vikt|håller vikten|vi kör samma)\b/i.test(text);
  if (saysMoreWasAvailable && pointsToSameWeight) return reply;

  const line = "Bra! Men där fanns mer.\n\nVi kör samma igen och försöker nå repsspannet om tekniken känns bra.";
  if (!text || /^(bra|japp|okej|där ja)[.!]?\s*(?:👊|👍|✅)?$/i.test(text)) {
    return line;
  }

  return `${text}\n\nMen där fanns mer. Vi kör samma igen.`;
}

function removeCompleteStrategyContradictions(context: CoachSetContext, reply: string) {
  if (context.nextTarget.strategy !== "complete") return reply;

  const failText = context.currentSet.failNote?.trim().toLowerCase() ?? "";
  const hasReportedIssue = Boolean(failText);
  const isHardSetWithoutIssue =
    !hasReportedIssue && typeof context.currentSet.rir === "number" && context.currentSet.rir <= 0;
  const exerciseIsLastInWorkout = context.setPlan?.isLastExercise === true;
  const completionLine = exerciseIsLastInWorkout
    ? "Där är vi klara med dagens pass."
    : "Vi går vidare till nästa övning.";

  let cleaned = reply
    .replace(/\bN[aä]sta set[^.?!]*(?:kg|reps|RIR)[^.?!]*[.?!]?/gi, "")
    .replace(/\bN[aä]sta set [aä]r klart:\s*/gi, "")
    .replace(/\bK[oö]r n[aä]sta[^.?!]*(?:kg|reps|RIR)[^.?!]*[.?!]?/gi, "")
    .replace(/\bVi k[oö]r samma vikt igen[^.?!]*[.?!]?/gi, "")
    .replace(/\bVi k[oö]r samma igen[^.?!]*[.?!]?/gi, "")
    .replace(/\bK[oö]r samma vikt igen[^.?!]*[.?!]?/gi, "")
    .replace(/\bK[oö]r samma igen[^.?!]*[.?!]?/gi, "")
    .replace(/\bSamma vikt igen[^.?!]*[.?!]?/gi, "")
    .replace(/\bSamma igen[^.?!]*[.?!]?/gi, "")
    .replace(/\bK[oö]r ett set till[^.?!]*[.?!]?/gi, "")
    .replace(/\bK[oö]r ett till[^.?!]*[.?!]?/gi, "")
    .replace(/\bK[oö]r klart setet[^.?!]*[.?!]?/gi, "")
    .replace(/\b(?:extra|extra-)set(?:et)?[^.?!]*[.?!]?/gi, "")
    .replace(/\bg[aå] vidare med [^.?!]*(?:kg|reps|RIR)[^.?!]*[.?!]?/gi, "Vi är klara med den här övningen.")
    .replace(/\bAvsluta [oö]vningen\s*[–—-]\s*g[aå] vidare till n[aä]sta\.?/gi, "Vi är klara med den här övningen.\n\nVidare.")
    .replace(/\s*G[aå] vidare till n[aä]sta [oö]vning\.?/gi, "")
    .replace(/\s*G[aå] vidare n[aä]r du [aä]r redo\.?/gi, "")
    .replace(/\s*Tryck vidare[^.?!]*[.?!]?/gi, "")
    .replace(/\s*Klart f[öo]r idag[^.?!]*[.?!]?/gi, "")
    .replace(/\s*D[äa]r [aä]r vi klara med dagens pass\.?/gi, "")
    .replace(/\bVila\s+\d[^.?!]*minuter\.?/gi, "")
    .replace(/\s*Klar\.\s*(?=👊|$)/gim, "")
    .replace(/\bVi [aä]r klara med den h[äa]r [oö]vningen\.\./gi, "Vi är klara med den här övningen.")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (isHardSetWithoutIssue) {
    cleaned = cleaned
      .replace(/\bD[äa]r tog det stopp\.?/gi, "Bra kämpat.")
      .replace(/\bD[äa]r tog du setet hela v[aä]gen\.?/gi, "Bra kämpat.")
      .replace(/\bBra jobbat\.?\s*Vi l[äa]mnar den h[äa]r [oö]vningen h[äa]r\.?/gi, "Bra kämpat. Riktigt fint avslut på den här övningen.")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  if (cleaned) {
    const mentionsCompletion = /\b(f[äa]rdig|klar|vidare)\b/i.test(cleaned);
    const mentionsWorkoutDone = /\b(pass|dagens pass)\b/i.test(cleaned);
    const needsCompletionLine =
      exerciseIsLastInWorkout ? !mentionsWorkoutDone : !mentionsCompletion;

    return needsCompletionLine ? `${cleaned}\n\n${completionLine}` : cleaned;
  }

  return `Bra kämpat.\n\nRiktigt fint avslut på den här övningen.\n\n${completionLine}`;
}

export function sanitizeCoachSetReply(
  context: CoachSetContext,
  reply: string,
  fallback: string,
  maxCharacters = MAX_COACH_REPLY_CHARACTERS
) {
  const compacted = compactRoutineSetFallback(context, reply);
  const withoutVisiblePlan = removeVisiblePlanRepetition(context, compacted);
  const withAdjustmentMention = ensureAdjustmentMention(context, withoutVisiblePlan);
  const withoutCompleteContradiction = removeCompleteStrategyContradictions(
    context,
    withAdjustmentMention
  );
  const withUnderTargetMention = ensureUnderTargetWithMarginMention(
    context,
    withoutCompleteContradiction
  );
  const withHardStop = emphasizeHardStopWhenObvious(
    context,
    withUnderTargetMention
  );
  const withoutDuplicateReaction = removeDuplicateShortReactions(withHardStop);
  const variedOpening = varyRepeatedOpening(context, withoutDuplicateReaction);
  const withTrainingOverride = applyTrainingSignalOverrides(context, variedOpening);
  const withRecordVariation = reduceRepeatedPersonalRecordLanguage(
    context,
    withTrainingOverride
  );
  const withRecordPraiseDedupe = removeStackedRecordPraise(
    ensureSetMilestoneReaction(context, withRecordVariation)
  );

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
  return sanitizeCoachSetReply(
    context,
    fallbackReply,
    fallbackReply,
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

const WORKOUT_COACH_SYSTEM = [
  COACH_HARD_GUARDRAILS,
  "",
  TRAINING_DECISION_PROTOCOL,
].join("\n");

const SET_COACH_INSTRUCTION = [
  NAME_USAGE_RULE,
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  COACH_SOUL_RULES,
  "",
  "Appens och coachens ansvar:",
  "- Appen äger siffror, nästa vikt, reps, RIR och vila.",
  "- Regelmotorn äger säkerhet och progression.",
  "- Du äger känslan i stunden: reaktion, kort tolkning och enkel riktning.",
  "- UI visar fakta. Du ska inte narrera UI:t.",
  "- Coachen ska komplettera UI:t, inte upprepa det.",
  "- Om context.progressionOpportunity finns: använd den som coachbrief. offer_increase = erbjud test upp utan press. increase_now = prata tydligt om att vi höjer.",
  "- Säg aldrig att en maskin är +kg per sida om context inte uttryckligen säger det. Säg hellre ett steg upp eller använd suggestedLoadText.",
  "",
  "Setsvar:",
  "- Designa beteende, inte repliker.",
  "- Vanliga set ska få vanliga svar. Försök inte skapa ett minnesvärt ögonblick av ett normalt set.",
  "- Om setet är normalt och nästa steg är uppenbart: kort bekräftelse kan vara hela svaret.",
  "- När inget särskilt händer: håll rytmen och skicka användaren vidare.",
  "- Vid stort set, tydlig progression, PR eller smart beslut: reagera först och mer tydligt.",
  "- Om context.personalRecordText börjar med 'Nytt personbästa': det är en milstolpe. Reagera först, men upprepa inte samma PB-fras flera set i rad.",
  "- Vid första personbästat i övningen: låt användaren känna att du såg det. Kort, glad och specifik.",
  "- Vid andra personbästat i samma övning: reagera mer som 'igen?' än som samma firande en gång till.",
  "- Om computedSignals innehåller too_light_same_weight_trend: vikten var för lätt idag. Då ska den poängen vinna över PB-firande.",
  "- Om context.personalRecordText börjar med 'Första noteringen': lägre intensitet än PB. Bekräfta bara att ni har något att jobba från.",
  "- Om UI redan visar nästa set: repetera inte hela planen. Coachen ska komplettera UI:t.",
  "- Om UI redan visar nästa vikt, reps, RIR och vila: nämn bara riktningen om den behövs.",
  "- Teknikcue ska bara nämnas när den verkligen hjälper nästa set.",
  "- Om context.uiHints.avoidRepeatingFullPlan är true: upprepa inte vikt, reps, RIR och vila som full plan.",
  "- Om context.uiHints.avoidRepeatingRest är true: nämn bara vila om den är extra viktig.",
  "- Om context.uiHints.avoidRepeatingTechniqueCue är true: upprepa inte teknikcue.",
  "- Vid backoff/reduce: förklara kort varför, men gör det som coachens åsikt och riktning, inte som rapport.",
  "- Vid reduce/backoff efter RIR 0 utan rapporterad failure, smärta eller teknikproblem: låt det positivt. RIR 0 är ett hårt set och bra stimulans. Säg hellre att du tycker vi sänker lite för att nästa set också ska bli rent.",
  "- Om decisionFacts.reasonCode är under_target_with_margin: svara inte bara 'Bra'. Säg kort att det fanns mer kvar och att ni kör samma igen för att nå repsspannet.",
  "- Om previousCoachReply finns: upprepa inte samma öppning eller samma poäng.",
  "- Om decisionFacts.reasonCode är planned_extra_finish: säg alltid uttryckligen att ni kör ett set till eller ett extra set, och säg varför. Använd tydlig svenska, t.ex. \"Vi kör ett set till här. Jag vill ha ett rent avslut.\" eller \"Vi slänger in ett set till på den här övningen så vi får ett bättre avslut.\" Skriv inte bara varför utan att säga att det är ett set till.",
  "- Om computedSignals innehåller too_light_same_weight_trend: säg att vikten var för lätt idag och att vi höjer nu eller nästa gång. Gör det kort, inte som en varning.",
  "",
  "Fakta:",
  "- Säg bara sista setet om context.setPlan.isLastSet eller context.setPlan.nextSetIsLast är true.",
  "- Om setPlan visar att fler set återstår: kalla det nästa set, inte sista set.",
  "- Om nextTarget.strategy är complete: övningen är klar. Sista setet på en övning ska få lite extra kred, som en coach som klappar användaren på axeln.",
  "- Om nextTarget.strategy är complete och context.setPlan.isLastExercise inte är true: säg tydligt att ni går vidare till nästa övning.",
  "- Om nextTarget.strategy är complete och context.setPlan.isLastExercise är true: säg att dagens pass är klart, inte att ni går till nästa övning.",
  "- Om reasonCode är hard_set_complete utan smärta eller tekniknotis: låt positivt. Skriv hellre 'Bra kämpat', 'riktigt fint avslut' eller 'vi är klara med den här övningen' än 'Där tog det stopp'.",
  "- computedSignals är maskinfakta, inte text att citera.",
  "- decisionFacts.reasonCode är bara orsakskod, inte en formulering.",
  "",
  "Teknik och smärta:",
  "- Anta inte teknikproblem från reps, vikt eller RIR ensam.",
  "- Du får ge en kort teknikcue som hjälp, men inte som dom.",
  "- RIR 0-1 utan smärta eller tekniknotis är först ett hårt set, inte ett problem.",
  "- Skriv inte 'Där tog det stopp' bara för att RIR är 0. Använd den tonen när användaren rapporterar failure/stopp, tekniktapp, smärta eller när det är uppenbart att setet föll isär.",
  "- Vid smärta eller känning: bli lugnare, kortare och tydligare.",
  "",
  "Tonreferenser, inte manus:",
  COACH_VOICE_EXAMPLES,
].join("\n");

const CHAT_QUESTION_INSTRUCTION = [
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  COACH_SOUL_RULES,
  "",
  "Fri chat mitt i passet:",
  "- Svara först på det användaren faktiskt skrev.",
  "- Det är okej att reagera innan du är nyttig.",
  "- Om användaren skämtar: möt tonen kort, men bli inte clown.",
  "- Om användaren frågar något praktiskt: svara enkelt först, lägg bara till detaljer som behövs.",
  "- Om användaren delar känsla: spegla känslan och ge riktning.",
  "- Om användaren frågar om att höja och context.progressionOpportunity finns: använd den som facit.",
  "- Om context.currentExerciseCompleted är true: övningen är redan klar. Prata om nästa gång, inte nästa set. Be aldrig användaren köra ett set till om appen inte uttryckligen har ett nästa set.",
  "- Om context.uiHints.nextSetCardShowsPlan är true: appen visar redan nästa vikt, reps, RIR och vila.",
  "- Upprepa inte hela nästa set-planen om frågan inte kräver det.",
  "- Om currentExerciseInfo finns och användaren frågar om övningen: använd den som facit, men svara som coach, inte lexikon.",
  "- Om frågan gäller annan övning i passet: använd activePlanExerciseInfo om övningen finns där.",
  "- Om aktuell övning är en tidsövning: prata om tid och position, inte reps eller RIR.",
  "- Vid smärta eller obehag: var kort, lugn och skyddande.",
  "- Om användaren ber om att hoppa över, byta eller lägga till: bekräfta vad du tror användaren menar och säg nästa tydliga steg. Ändra inte något själv om appen inte gör det.",
  "",
  "Exempel:",
  "Användaren: sitsen är jättesvettig :P",
  "Bra svar:",
  "Haha. Klassiskt.",
  "Torka av, sätt dig bra och kör.",
  "Vi behöver inte göra lårcurl svårare än den redan är.",
  "",
  "Användaren: hur länge ska jag pausa i toppläget?",
  "Bra svar:",
  "1-2 sekunder räcker.",
  "Lås inte fast dig där.",
  "Kontroll upp, lugnt ner.",
].join("\n");

export function buildCoachPromptPayload(
  context: CoachSetContext
): CoachPromptPayload {
  return {
    system: WORKOUT_COACH_SYSTEM,
    context,
    instruction: SET_COACH_INSTRUCTION,
    maxCharacters: MAX_COACH_REPLY_CHARACTERS,
  };
}

export function buildCoachChatPromptPayload(
  context: CoachChatContext
): CoachPromptPayload {
  return {
    system: WORKOUT_COACH_SYSTEM,
    context,
    instruction: `${NAME_USAGE_RULE}\n\n${CHAT_QUESTION_INSTRUCTION}`,
    maxCharacters: MAX_CHAT_REPLY_CHARACTERS,
  };
}

export function buildCoachProgramPromptPayload(
  context: CoachProgramContext
): CoachPromptPayload {
  const instruction =
    'Svara på användarens input om träningsupplägget. Returnera JSON, inte markdown. Format: {"text":"kort coachsvar","suggestion":null eller {"summary":"kort sammanfattning","actions":[...]}}. Tillåtna actions: add_exercise {type, exerciseName, passKey?, passName?, reason?}, remove_exercise {type, exerciseName, reason?}, replace_exercise {type, fromExerciseName, toExerciseName, reason?}, rename_pass {type, passKey, displayName, reason?}. Föreslå bara actions när användaren tydligt vill ändra upplägget. Tolka naturligt språk brett: "hatar X", "X är sämst", "jag vill byta X", "X känns dålig", "får ont av X", "X funkar inte" och liknande betyder att användaren vill ändra övningen. Om användaren ogillar en övning, vill byta den eller får obehag av den: föreslå i första hand replace_exercise med ett konkret alternativ från exerciseLibrary/easierAlternative. Föreslå remove_exercise bara om användaren uttryckligen vill ta bort utan ersättning, om ingen rimlig ersättning finns, eller om säkerheten talar för paus. Föreslå aldrig vaga övningsnamn som "närmsta liknande övning", "liknande övning", "alternativ" eller "annan övning". Om övningen är oklar: suggestion ska vara null och du frågar vilken övning användaren menar. Påstå aldrig att ändringen redan är gjord; skriv att du föreslår den och att användaren kan godkänna. Om användaren bara ställer en fråga eller vill förstå upplägget utan att be om ändring: suggestion ska vara null. Svara tryggt, enkelt och coachigt utan att ändra schemat. Om exerciseLibrary finns och användaren frågar varför en övning ligger i upplägget, vad den tränar, hur den loggas, risker eller alternativ: använd exerciseLibrary som facit och svara användarvänligt. Vid ålder, rädsla, farligt, skada, smärta eller osäkerhet: var extra försiktig, säg att smärta/obehag går före planen och föreslå ändring om användaren kopplar obehaget till en specifik övning. Ge inte medicinska garantier. Vid frågor om fettminskning: förklara kort att styrketräning hjälper formen, musklerna och kroppen under viktnedgång, men att kosten också spelar stor roll. Om du behöver mer information, suggestion ska vara null och du frågar en enda kort följdfråga. Språkkrav: enkel svenska som en trött användare på gymmet fattar direkt. Använd inte slang eller oklara ord som "kötta", "köttade", "köttigt", "mangla" eller "brutal". Hitta inte på kroppsord; skriv "vid handledsbesvär" eller "om handlederna känns ömma". Om du föreslår passnamn ska de vara rena utan parenteser eller volymtaggar. Skriv som en coach, inte som support. Avsluta gärna med tydlig riktning, t.ex. "Vill du kan jag göra upplägget lugnare."';

  return {
    system: `${MINCOACH_AI_SYSTEM_RULES}\n\n${PROGRAM_DESIGN_PROTOCOL}`,
    context,
    instruction,
    maxCharacters: MAX_CHAT_REPLY_CHARACTERS,
  };
}

export function buildCoachProgramBuildPromptPayload(
  context: CoachProgramBuildContext
): CoachPromptPayload {
  const instruction =
    'Du är MinCoach programcoach. Bygg ett komplett träningsupplägg från användarens mål, tid, träningsvana, utrustning, övningspreferenser och begränsningar. Returnera ENDAST giltig JSON, inte markdown, inte kodblock, inte förklaring runt JSON. Format: {"title":"kort titel","coachSummary":"varm kort coachförklaring","planReason":"varför detta passar målet","structureReason":"varför passen är uppdelade så här","safetyNotes":["kort notis"],"passes":[{"key":"A","displayName":"Passnamn","intent":"vad passet ska göra","exercises":[{"name":"övningsnamn","purpose":"varför den finns med","sets":"2-4","reps":"6-12","rir":"1-3","caution":"kort vid behov","alternatives":["namn"]}]}]}. Alla fält ska vara strängar eller listor enligt formatet. Antal pass ska matcha daysPerWeek, max 6. Vid 5-6 pass ska passen vara smalare och mer återhämtningsvänliga, särskilt för nybörjare. Varje pass ska ha 3-5 övningar. Använd främst övningar från availableExercises och svenska tydliga namn. Välj inte övningar som kräver utrustning användaren saknar. Använd availableExercises.difficulty, beginnerFit, stability och beginnerNote aktivt. För trainingExperience nyborjare: prioritera beginnerFit bra, difficulty enkel/medel och stability hog/medel. Välj inte beginnerFit undvik_som_standard om det finns stabilare alternativ. Om du ändå väljer en tekniskt svårare övning till en ny användare ska syftet vara tydligt och alternatives innehålla en enklare variant. Goblet squat är inte automatiskt en enkel standardövning; på gym är benpress eller benspark ofta tryggare start för en helt ny eller osäker användare. Om location är hemma: håll dig till equipment. Respektera exercisePreferences som en stark mjuk preferens: prioritera valda typer när de passar mål, säkerhet och utrustning. Om användaren inte valt kroppsvikt ska du inte bygga runt armhävningar, planka eller liknande om bättre alternativ finns. Om användaren valt maskiner/kablar/hantlar/fria vikter ska det synas i övningsvalen. Om användaren har begränsningar, bygg runt dem och skriv safetyNotes. Detta kräver faktisk coachkompetens: välj övningar, volym och struktur som passar målet. För styrka: färre tydliga basövningar, mer vila och mätbar progression. För muskler: jämn volym, kontrollerade basövningar plus isolationsarbete. För fettförlust: håll passet enkelt, repeterbart och effektivt utan att låtsas att styrketräning ensam styr vikten. Undvik att trycka in för mycket. Hellre färre bra övningar än ett stökigt pass. Skriv som en trygg coach som förklarar enkelt. Använd enkel svenska. Undvik slang och oklara ord som "kötta", "köttade", "köttigt", "mangla" och "brutal". Hitta aldrig på sammansatta kroppsord; skriv "om handlederna känns ömma" eller "vid handledsbesvär". Passnamn ska vara rena och snygga utan parenteser eller volymtaggar: skriv "Pass B — Ben och bål", inte "Pass B — Ben & Bål (Medelvolym)". Om volym eller fokus behöver förklaras gör du det i intent, inte i passnamnet. Påstå inte medicinska garantier. Om något är osäkert, välj lugnare variant och säg varför.';

  const programInstruction = `${instruction}

Programprotokoll:
${PROGRAM_DESIGN_PROTOCOL}

Måste väga in varje gång:
- age: påverkar startnivå, övningsval, säkerhetsmarginal, uppvärmning och återhämtning.
- gender: använd utan stereotyper. Låt inte kön minska ambitionsnivån. Använd främst mål, vana och begränsningar.
- trainingExperience: styr komplexitet, volym, RIR och progressionsaggressivitet.
- goalPrimary och goalSecondary: primärmål styr strukturen, sekundärmål justerar detaljerna.
- daysPerWeek och minutesPerSession: styr split, antal övningar och total volym.
- location och equipment: välj bara övningar som användaren faktiskt kan göra.
- exercisePreferences: prioritera de övningstyper användaren gillar. Det är inte ett absolut förbud mot annat, men programmet ska kännas anpassat efter preferensen.
- limitations: ska väga tungt. Bygg runt smärta, skador och oro.
- existingPreferences: respektera användarens önskemål om de inte krockar med säkerhet eller upplägg.

Hårda krav:
- SafetyNotes ska vara specifika för användaren och upplägget, inte random tekniska notiser.
- Sets/reps/RIR ska passa övning, mål, ålder, träningsvana och begränsningar.
- Varje övning ska ha ett tydligt syfte. Lägg inte in övningar bara för att fylla passet.
- CoachSummary, planReason och structureReason ska kännas som att coachen faktiskt har tänkt.
- Om något är osäkert: välj tryggare variant och säg varför.`;

  return {
    system: `${MINCOACH_AI_SYSTEM_RULES}\n\n${PROGRAM_DESIGN_PROTOCOL}`,
    context,
    instruction: programInstruction,
    maxCharacters: 3200,
  };
}

export function buildCoachWorkoutReviewPromptPayload(
  context: CoachWorkoutReviewContext
): CoachPromptPayload {
  return {
    system: MINCOACH_AI_SYSTEM_RULES,
    context,
    instruction:
      `${NAME_USAGE_RULE}\n\nSkriv en varm passgenomgång för MinCoach. Returnera ENDAST giltig JSON, inte markdown. Format: {"coachHeadline":"kort emotionell rad","coachSummary":"2-3 korta meningar","positives":["1-3 korta punkter"],"adjustments":["0-2 korta punkter"],"nextFocus":["1-2 korta punkter"],"coachMemoryTakeaway":["1-2 korta punkter"]}.\n\nDet här är avslutet efter passet. Användaren ska känna: coachen såg mig, coachen fattar vad passet betydde, och jag vill komma tillbaka. Behåll datan korrekt. Hitta verkliga saker i context: bästa set, progression, tunga set, failure, genomförda övningar, uppvärmning/kondition om det påverkar. Var inte en loggbok. Skriv inte generiskt. Förklara vad passet säger om användarens utveckling eller beslut, inte bara vad som hände. Om användaren gjorde ett moget val, lyft det. Om en vikt börjar bli arbetsvikt, säg det. Om något var tungt men klokt hanterat, gör det till en styrka. Skriv aldrig "gör coachen stolt" eller "gör mig stolt". Använd namn högst undantagsvis. Använd gärna 0-2 emojis från paletten ✅ ✔️ 💪 🔥 💡 🚀 ➡️ 📈 🎯 👀 👊 om det finns riktig prestation. Vid smärta/failure: var trygg och skyddande, aldrig skuldbeläggande. Om passet är delvis sparat: bekräfta lugnt och utan skuld. Håll allt kort och lättläst.`,
    maxCharacters: 1400,
  };
}

export function createAiReadyCoachReply(args: {
  context: CoachSetContext;
  fallbackReply: string;
  mode?: CoachReplyMode;
}) {
  const { context, fallbackReply, mode = "fallback" } = args;
  const payload = buildCoachPromptPayload(context);

  return {
    mode,
    payload,
    text: sanitizeCoachSetReply(
      context,
      fallbackReply,
      fallbackReply,
      payload.maxCharacters
    ),
  };
}

export async function requestAiCoachSetReply(args: {
  context: CoachSetContext;
  fallbackReply: string;
  signal?: AbortSignal;
}) {
  const { context, fallbackReply, signal } = args;
  const fallback = createAiReadyCoachReply({
    context,
    fallbackReply,
  });

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
      text: sanitizeCoachSetReply(
        context,
        data.text ?? "",
        fallback.text,
        fallback.payload.maxCharacters
      ),
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
  const payload = buildCoachChatPromptPayload(context);
  const fallbackText = sanitizeCoachReply(
    fallbackReply,
    fallbackReply,
    payload.maxCharacters
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
      text: sanitizeCoachChatReply(
        context,
        data.text ?? "",
        fallbackText,
        payload.maxCharacters
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

export async function requestAiProgramReply(args: {
  context: CoachProgramContext;
  fallbackReply: string;
  signal?: AbortSignal;
}) {
  const { context, fallbackReply, signal } = args;
  const payload = buildCoachProgramPromptPayload(context);
  const fallbackText = sanitizeCoachReply(
    fallbackReply,
    fallbackReply,
    payload.maxCharacters
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
        suggestion: null,
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
      text: sanitizeCoachReply(
        data.text ?? "",
        fallbackText,
        payload.maxCharacters
      ),
      suggestion: data.suggestion ?? null,
    };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      text: fallbackText,
      suggestion: null,
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
