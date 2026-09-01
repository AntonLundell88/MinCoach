export type CoachReplyMode = "fallback" | "ai-ready";

/**
 * Strategin som modellen ser den. Svenska med flit: modellen ekar värden den
 * får, och det engelska "backoff" kom tillbaka mitt i en svensk mening.
 * Internt heter strategierna fortfarande press/hold/backoff/reduce/complete —
 * toWireStrategy i page.tsx är enda stället som översätter.
 */
export type CoachWireStrategy =
  | "höj"
  | "behåll"
  | "lättare igen"
  | "sänk"
  | "övningen klar";

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

/**
 * En skada eller ett besvär som nämnts tidigare. daysAgo och exerciseName
 * fanns hela tiden på CoachNote men kastades bort på vägen hit — coachen fick
 * odaterade strängar och kunde inte skilja ett hugg i knät igår från en axel i
 * mars, eller se vilken övning det gällde. Utan det kan den bara nämna allt
 * eller inget. Datumet ligger i ett eget fält med flit: bakas det in i texten
 * blir det en färdig mening som kommer tillbaka ordagrant i svaret.
 */
export type CoachHealthNote = {
  text: string;
  daysAgo: number;
  exerciseName?: string;
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
    // Ingen prosa här. Ett reason-fält bar tidigare färdiga meningar ("...ett
    // försiktigt test upp kan vara rimligt") som modellen gjorde mall av — två
    // olika övningar fick samma skelett. type, confidence och tone bär redan
    // hela nyansen, strukturerat.
    tone: "offer" | "clear";
  };
  // Hur många kvalificerande pass i rad toppvikten hållit (se
  // ExerciseProgressionPlan.sessionsAtTopWeight i page.tsx). 0/undefined om
  // ingen historik finns än.
  sessionsAtTopWeight?: number;
  decisionFacts?: {
    // Svenska med flit — se toWireStrategy i page.tsx.
    strategy?: CoachWireStrategy;
    reasonCode?: string;
    weightChangeKg?: number;
    repsChange?: number;
    rirChange?: number;
    shouldMentionTechniqueCue: boolean;
  };
  nextTarget: {
    weight: number;
    loadText?: string;
    repsText: string;
    rirText: string;
    // Svenska med flit — se toWireStrategy i page.tsx.
    strategy?: CoachWireStrategy;
    reason?: string;
    techniqueCue?: string;
  };
  restText?: string;
  memoryInsight?: string;
  /**
   * Närmaste vikt upp och ner som utrustningen faktiskt har. Inget däremellan.
   *
   * Coachen fick "nästa steg: 15 kg" utan sätt att veta hur stort det steget
   * var. På 100 kg är 2,5 kg ingenting; på ett sidolyft är samma 2,5 kg en
   * femtedel, och nästa hantel är den enda som finns. Utan den fakta går det
   * inte att avgöra om ett steg upp är litet eller stort.
   *
   * Bara siffror, ingen tolkning: vad det betyder för just den övningen vet
   * modellen redan bättre än vi kan skriva i en regel. Det här ska göra
   * coachen friare, inte styra den.
   */
  nearestWeights?: { up: number; down: number };
  limitations?: string;
  recentHealthNotes?: CoachHealthNote[];
  recentWorkingWeights?: string[];
  warmupNote?: string;
  conditioningNote?: string;
  // OBS: lägg inte tillbaka previousCoachReply här. Den lades till för att
  // MINSKA upprepning, men nämndes i noll instruktioner — modellen fick sitt
  // eget förra svar utan förklaring och behandlade det som en mall att matcha.
  // Borttagen ur intro-rutten först, sen härifrån och ur chatten. Behovet av
  // "säg inte samma sak igen" täcks av recentConversation, som ÄR dokumenterad.
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
  recentHealthNotes?: CoachHealthNote[];
  recentWorkingWeights?: string[];
  exerciseIndex?: number;
  exerciseCount?: number;
  currentExerciseCompleted?: boolean;
  /**
   * Hela dagens pass, en rad per övning: "Bröstpress: 45 kg × 10, 2 reps kvar".
   * Heter dagensPass och inte todaysWorkout med flit — modellen ekar fältnamn,
   * och ett svenskt namn blir korrekt även då. Se [[project-coach-echoes-input]].
   */
  dagensPass?: string[];
  currentSets?: Array<{
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir?: number;
    failNote?: string;
  }>;
  currentCoachDecision?: {
    // Svenska med flit — se toWireStrategy i page.tsx.
    strategy: CoachWireStrategy;
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
    // Ingen prosa här. Ett reason-fält bar tidigare färdiga meningar ("...ett
    // försiktigt test upp kan vara rimligt") som modellen gjorde mall av — två
    // olika övningar fick samma skelett. type, confidence och tone bär redan
    // hela nyansen, strukturerat.
    tone: "offer" | "clear";
  };
  /**
   * Det stående personbästat i den aktuella övningen, ur samma personalRecords
   * som driver PB-ramen i chatten och Personbästan-skärmen.
   *
   * Utan det här fältet fick chatten en faktafråga ("var det pb?") helt utan
   * facit och svarade från det närmaste den hade — senaste passet. Den kallade
   * 37,5 × 10 ett PB för att det slog förra gångens 35 × 10, medan systemet
   * inte hade registrerat något PB alls. Två röster, två svar, och chatten var
   * den som hade fel.
   *
   * Siffror, ingen färdig mening: personalRecordText på setkontexten är en hel
   * mening och kommer tillbaka ordagrant i svaret. Skickas medvetet INTE till
   * setrutten — den reagerar på varje set, och ett PB-tal där riskerar att bli
   * en uppläsning av avstånd till PB på löpande band.
   */
  personalRecord?: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
  };
  // Säkert tak för ett tyngre testset, om den aktuella övningen kvalificerar.
  // Facit för VAD som är säkert att föreslå om användaren själv efterfrågar
  // att testa hårdare — inte en instruktion att ta upp det proaktivt här.
  //
  // Heter heavierTestSet och inte calibrationTestCandidate med flit: modellen
  // ekar fältnamn den ser, och den sa "ett medvetet kalibreringsset på 35 kg"
  // — app-jargong ingen tränare använder. "Ett tyngre testset" låter rätt.
  // Internt heter det fortfarande calibrationTestCandidate; bara namnet på
  // tråden till modellen är utbytt.
  // Bara vikten — ingen färdig mening. Se CalibrationTestCandidate i page.tsx.
  heavierTestSet?: {
    weight: string;
  };
  activePlan?: string[];
  activePlanExerciseInfo?: CoachExerciseLibraryInfo[];
  warmupNote?: string;
  conditioningNote?: string;
  // Se kommentaren vid recentConversation i CoachSetContext ovan — samma skäl.
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
    // Heter bestSet och inte topSet med flit: modellen ekar fältnamn den ser,
    // och "toppsetet" är app-jargong som låter fel i en coachs mun. Ekar den
    // det här blir det "bästa setet", vilket är precis vad en människa
    // hade sagt. Fixa jargong i datan, inte med ett förbud i prompten.
    bestSet?: { weight: number; reps: number };
    lastSession?: { weight: number; reps: number; failNote?: string | null };
    bestTimeText?: string;
  };
  opportunity?: {
    type: "offer_increase" | "increase_now" | "optional_last_set_test";
    suggestedWeight: string;
  };
  // Hur många kvalificerande pass i rad toppvikten hållit (se
  // ExerciseProgressionPlan.sessionsAtTopWeight i page.tsx). 0/undefined om
  // ingen historik finns än.
  sessionsAtTopWeight?: number;
  // Skild från opportunity med avsikt: det här är inte bevisad progression,
  // det är ett medvetet erbjudande om att testa UTANFÖR det bevisade.
  // Namnvalet: se heavierTestSet i CoachChatContext ovan.
  // Bara vikten — ingen färdig mening. Se CalibrationTestCandidate i page.tsx.
  heavierTestSet?: {
    weight: string;
  };
  otherGymReference?: {
    gymName: string;
    weightText: string;
    repsText: string;
    rirText?: string;
    daysAgo: number;
  };
  previousWorkoutSummary?: string;
  recentHealthNotes?: CoachHealthNote[];
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
  recentHealthNotes?: CoachHealthNote[];
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
  recentHealthNotes?: CoachHealthNote[];
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
  /**
   * Skickas BARA när jämförelsen är smickrande — samma tröskel som kortet
   * använder. Modellen jämförde annars rakt av ("9 av 13 planerade pass",
   * "lite ojämnt mot planen"), alltså exakt den tillrättavisning kortet är
   * byggt för att undvika. Enklare att inte lägga fakta på bordet än att
   * förbjuda den när den redan ligger där.
   */
  plannedPassCount: number | null;
  /**
   * Antal VECKOR i rad med minst ett pass. Hette longestWeekStreak och lästes
   * då som "3 pass samma vecka" — modellen ekar fältnamn, så namnet måste
   * bära betydelsen självt.
   */
  weeksInARow: number;
  /** "9 timmar". Rå totalMinutes gav "540 minuter", vilket ingen säger. */
  totalTimeLabel: string;
  /** "48,3 ton". Rå kg gav "48 250 kg totalt" mitt i en mening. */
  totalVolumeLabel: string;
  /** "22 juli". Redan formaterat — modellen ska inte tolka ISO-datum. */
  heaviestDayLabel: string | null;
  pbCount: number;
  pbExerciseNames: string[];
  biggestPb: {
    exerciseName: string;
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    improvementPercent: number;
    /** Rekordet det slog, och månaden det sattes. Banan, inte tillståndet. */
    previousWeight: number | null;
    previousMonthLabel: string | null;
  } | null;
  // topMuscleCategory är borttagen med flit: muskelfördelningen avgörs av
  // splitten, inte av användaren, och kortet som visade den finns inte kvar.
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
    context.nextTarget.strategy === "behåll" ||
    context.nextTarget.strategy === "höj";
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

function postProgramStage(body: unknown, signal?: AbortSignal) {
  return fetch("/api/coach/program/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

/**
 * Bygger programmet i fyra vågor i stället för ett anrop.
 *
 * Tidsgränsen är per HTTP-anrop, och det som tar tid är resonemanget: att
 * välja ett tjugotal övningar över sex pass med balans och begränsningar
 * sprängde 25 sekunder. Uppdelat blir varje anrop litet nog att köras på
 * den starkare modellen i stället för den snabba men språksvagare.
 *
 *   1. struktur      — hur veckan delas, inga övningar
 *   2. övningar      — ett anrop per pass, parallellt
 *   3. prosa/summary — parallellt, best-effort
 *
 * Passen i steg 2 behöver inte känna till varandra: samma övning får
 * återkomma i flera pass, och dubbletter förbjuds bara inom ett pass.
 */
async function buildProgramInStages(
  context: CoachProgramBuildContext,
  fallbackPlan: BuiltWorkoutPlan,
  signal?: AbortSignal
): Promise<BuiltWorkoutPlan | null> {
  const structureResponse = await postProgramStage(
    { stage: "structure", context },
    signal
  );

  if (!structureResponse.ok) return null;

  const structure = (await structureResponse.json()) as {
    mode?: string;
    title?: string;
    passes?: { key: string; displayName: string; intent?: string }[];
  };

  if (structure.mode !== "ai" || !structure.passes?.length) return null;

  const passes = await Promise.all(
    structure.passes.map(async (pass) => {
      try {
        const response = await postProgramStage(
          { stage: "exercises", context, exercisePass: pass },
          signal
        );

        if (!response.ok) return null;

        const data = (await response.json()) as {
          mode?: string;
          exercises?: BuiltWorkoutPlan["passes"][number]["exercises"];
        };

        if (data.mode !== "ai" || !data.exercises?.length) return null;

        return { ...pass, exercises: data.exercises } as BuiltWorkoutPlan["passes"][number];
      } catch {
        return null;
      }
    })
  );

  // Ett pass utan övningar gör programmet ofullständigt. Hellre ärligt fel
  // och en försök igen-knapp än ett halvt schema.
  if (passes.some((pass) => !pass)) return null;

  return {
    ...fallbackPlan,
    title: structure.title || fallbackPlan.title,
    passes: passes as BuiltWorkoutPlan["passes"],
  };
}

export async function requestAiProgramBuild(args: {
  context: CoachProgramBuildContext;
  fallbackPlan: BuiltWorkoutPlan;
  signal?: AbortSignal;
}) {
  const { context, fallbackPlan, signal } = args;

  try {
    const staged = await buildProgramInStages(context, fallbackPlan, signal);

    if (staged) {
      const plan = await addProseToPlan(staged, context, signal);
      return { mode: "ai" as const, reason: undefined, plan };
    }

    const response = await postProgramStage({ context, fallbackPlan }, signal);

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

    if (data.mode !== "ai" || !data.plan) {
      return {
        mode: "fallback" as const,
        reason: data.reason,
        plan: data.plan ?? fallbackPlan,
      };
    }

    const plan = await addProseToPlan(data.plan, context, signal);

    return { mode: "ai" as const, reason: data.reason, plan };
  } catch {
    return {
      mode: "fallback" as const,
      reason: "network_error",
      plan: fallbackPlan,
    };
  }
}

/**
 * Hämtar syftes- och varningstext för varje pass i EGNA parallella anrop.
 *
 * Tidsgränsen är per HTTP-anrop, så hela planen i ett svar sprängde 25
 * sekunder vid 5-6 dagar. Prosan är den stora delen och den enda som inte
 * kräver överblick — texten om en övning behöver inte veta vad andra pass
 * innehåller — så den kan delas upp och köras samtidigt.
 *
 * Best-effort med flit: ett pass vars anrop misslyckas får helt enkelt
 * ingen AI-text, och granskningsskärmen visar bibliotekets beskrivning i
 * stället. Programmet blir aldrig fel, bara mindre personligt i den delen.
 */
async function addProseToPlan(
  plan: BuiltWorkoutPlan,
  context: CoachProgramBuildContext,
  signal?: AbortSignal
): Promise<BuiltWorkoutPlan> {
  // Plantexterna (coachSummary m.fl.) beskriver det färdiga programmet och
  // hämtas därför parallellt med övningsprosan — de beror bara på stommen,
  // inte på varandra. Misslyckas den behåller planen de deterministiska
  // standardtexterna, precis som prosan faller tillbaka på biblioteket.
  const summaryRequest = (async () => {
    try {
      const response = await fetch("/api/coach/program/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "summary", context, summaryPlan: plan }),
        signal,
      });

      if (!response.ok) return null;

      const data = (await response.json()) as {
        summary?: {
          coachSummary?: string;
          planReason?: string;
          structureReason?: string;
          safetyNotes?: string[];
        };
      };

      return data.summary ?? null;
    } catch {
      return null;
    }
  })();

  const proseRequests = Promise.all(
    plan.passes.map(async (pass) => {
      try {
        const response = await fetch("/api/coach/program/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: "prose",
            context,
            prosePass: {
              displayName: pass.displayName,
              intent: pass.intent,
              exercises: pass.exercises.map((exercise) => ({
                exerciseKey: exercise.exerciseKey,
                name: exercise.name,
              })),
            },
          }),
          signal,
        });

        if (!response.ok) return null;

        const data = (await response.json()) as {
          exercises?: { exerciseKey?: string; purpose?: string; caution?: string }[];
        };

        return Array.isArray(data.exercises) ? data.exercises : null;
      } catch {
        return null;
      }
    })
  );

  const [summary, results] = await Promise.all([summaryRequest, proseRequests]);

  return {
    ...plan,
    coachSummary: summary?.coachSummary?.trim() || plan.coachSummary,
    planReason: summary?.planReason?.trim() || plan.planReason,
    structureReason: summary?.structureReason?.trim() || plan.structureReason,
    safetyNotes: summary?.safetyNotes?.length ? summary.safetyNotes : plan.safetyNotes,
    passes: plan.passes.map((pass, index) => {
      const prose = results[index];
      if (!prose) return pass;

      return {
        ...pass,
        exercises: pass.exercises.map((exercise) => {
          const match = prose.find((item) => item.exerciseKey === exercise.exerciseKey);
          if (!match) return exercise;

          return {
            ...exercise,
            purpose: match.purpose?.trim() || exercise.purpose,
            caution: match.caution?.trim() || exercise.caution,
          };
        }),
      };
    }),
  };
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
