import {
  containsUnsafeCoachPhrase,
  PROGRAM_DESIGN_PROTOCOL,
  TRAINING_DECISION_PROTOCOL,
} from "./coachRules";
import {
  COACH_HARD_GUARDRAILS,
  COACH_LANGUAGE_NOTES,
  COACH_VOICE_BRIEF,
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
  recoveryContext?: {
    exerciseLastTrainedDays: number | null;
    previousSession?: {
      daysAgo: number;
      exercises: string[];
      wasHard: boolean;
    };
  };
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
  recentConversation?: string[];
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
  events?: Array<{
    type: "pain" | "exercise_replaced" | "exercise_completed_early";
    exerciseName: string;
    note?: string;
    setCount?: number;
    replacementName?: string;
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
  lobbyText?: string;
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

export type CoachChatAction = {
  type: "replace_exercise";
  fromExerciseName: string;
  toExerciseName: string;
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
const MAX_CHAT_REPLY_CHARACTERS = 500;
const NAME_USAGE_RULE =
  "Använd användarens namn mycket sparsamt. Skriv inte namnet i vanliga svar som \"Bra fråga\" eller \"Okej\". Namnet får användas vid start, stora milstolpar eller när extra närvaro behövs, men högst undantagsvis. Om du är osäker: använd inte namnet.";

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
  if (containsUnsafeCoachPhrase(compact)) return compactWhitespace(fallback);

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

const WORKOUT_COACH_SYSTEM = [
  COACH_HARD_GUARDRAILS,
  "",
  TRAINING_DECISION_PROTOCOL,
].join("\n");

const PROGRAM_COACH_SYSTEM = [
  COACH_HARD_GUARDRAILS,
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  TRAINING_DECISION_PROTOCOL,
].join("\n");

const REVIEW_COACH_SYSTEM = [
  "Du är MinCoach: en erfaren träningscoach med perfekt minne om din elev.",
  "",
  TRAINING_DECISION_PROTOCOL,
].join("\n");

const MEMORY_PRECEDENCE_RULE =
  "Om recentConversation motsäger memoryInsight eller en tidigare notering — t.ex. användaren säger att något som var ett problem förra gången inte längre är det: lita på recentConversation. Färsk information från den här sessionen vinner alltid över äldre minnesnoteringar.";

const SET_COACH_INSTRUCTION = [
  "Ditt uppdrag: förstå vad användaren faktiskt försöker uppnå. Hitta den minsta förändringen som löser situationen.",
  "",
  "Resonera internt innan du svarar:",
  "- Vad har vi pratat om i recentConversation? Det är ditt korttidsminne — läs det INNAN du agerar på senaste setet.",
  "- Vad förändrades jämfört med previousSet? Inte bara siffrorna — vad betyder det?",
  "- Är detta en begränsning (maxvikt, maskin, kroppssignal) eller ett avbrott? Begränsning: anpassa inom övningen. Avbrott: hantera avbrottet.",
  "- Vad är den minsta förändringen som löser situationen?",
  "",
  "Coachprinciper:",
  "- Om träningsmålet kan nås trots en begränsning: anpassa reps, RIR eller teknik. Byt övning bara om målet verkligen inte kan nås.",
  "- Samma reps + bättre RIR = användaren blir starkare. Det är progression. Höj inte vikten automatiskt.",
  "- Byt aldrig plan utan tydlig anledning. Samla evidens innan du ändrar.",
  "",
  NAME_USAGE_RULE,
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  "Data:",
  "- currentSet / previousSet: vikt, reps, RIR — fakta",
  "- nextTarget: systemets förslag på nästa steg",
  "- personalRecordText: PB — reagera",
  "- computedSignals / decisionFacts: maskintolkade mönster — underlag, inte sanning",
  "- memoryInsight: din historia med användaren",
  "- gymComparison är intern signal. Om hasHistoryAtCurrentGym är false kan vikterna behöva kalibreras på detta gym. Nämn det bara om det hjälper användaren förstå dagens startvikt. Om differentFromLastSession är true: resonera tyst om att viktreferenser kan skilja sig mellan gym.",
  "- recoveryContext är intern träningskontext. Använd den bara när den rimligen förklarar dagens prestation eller påverkar nästa beslut. Nämn den inte rutinmässigt.",
  "- progressionOpportunity: om användaren har mer att ge",
  "- recentConversation: de senaste meddelandena från BÅDA sidor — ditt korttidsminne. Läs innan du agerar.",
  "- " + MEMORY_PRECEDENCE_RULE,
  "",
  "Utöver hårda gränser (systeminstruktion), specifikt för set-svar:",
  "- Säg bara 'sista setet' om setPlan.isLastSet är true.",
  "- Om nextTarget.strategy är 'complete': övningen är klar. Reagera på setet och avsluta naturligt — nämn inga fler set-vikter, reps eller vilotider för den här övningen. Undantag: om progressionOpportunity finns kan du erbjuda ett extraset. Om setPlan.isLastExercise är true: passet är klart.",
  "- Om personalRecordText börjar med 'Nytt person': det är ett PB. Reagera tydligt, men låt det kännas genom precision — inte genom mer text. En träffsäker mening räcker ofta.",
  "- Om currentSet.failNote finns: användaren har sagt vad som stoppade setet. Bekräfta det direkt i svaret — det väger tyngre än setnumret.",
].join("\n");

const CHAT_QUESTION_INSTRUCTION = [
  "Innan du svarar: fråga dig vad användaren försöker uppnå med sitt senaste meddelande. Anpassa sedan hur du coachar utifrån det, inte utifrån vad du förväntade dig skulle hända härnäst.",
  "",
  "Användaren kan när som helst byta från set-coaching till diskussion, planering, problemlösning eller frågor. Följ användaren in i det samtalet istället för att försöka föra tillbaka konversationen till nästa set.",
  "",
  "När användaren ställer en fråga under ett träningspass är ditt mål inte att göra användaren expert på ämnet. Ditt mål är att ge tillräckligt med information för att användaren tryggt ska kunna fortsätta träna. Sluta svara så fort användaren sannolikt kan fortsätta passet. Utgå från att användaren kan ställa en följdfråga. Du behöver inte få med allt i första svaret. Svara bara med det användaren behöver just nu.",
  "",
  "När användaren frågar vad något betyder:",
  "Bra: \"RIR betyder hur många reps du tror att du hade kvar när setet tog slut.\" Klart.",
  "Om användaren vill veta mer kommer de fråga vidare.",
  "Undvik att direkt lägga till: flera exempel, undantag, praktisk användning eller längre förklaringar — om användaren inte efterfrågat dem.",
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  "Fri chat mitt i passet:",
  "- Svara bara på det som faktiskt frågades. Lägg inte till angränsande tips, alternativ eller \"bra att veta\" om användaren inte bad om det eller det är säkerhetskritiskt. En fråga, en sak.",
  "- Läs recentConversation INNAN du svarar — det är ditt korttidsminne. Vad har du redan föreslagit? Vad avvisade användaren?",
  "- " + MEMORY_PRECEDENCE_RULE,
  "- Det är okej att reagera innan du är nyttig.",
  "- Om användaren skämtar: möt tonen kort, men bli inte clown.",
  "- Om användaren delar känsla: spegla känslan och ge riktning.",
  "- Om användaren frågar om att höja och context.progressionOpportunity finns: använd den som facit.",
  "- Om context.currentExerciseCompleted är true: övningen är redan klar. Prata om nästa gång, inte nästa set. Be aldrig användaren köra ett set till om appen inte uttryckligen har ett nästa set.",
  "- Om currentExerciseInfo finns och användaren frågar om övningen: använd den som facit, men svara som coach, inte lexikon.",
  "- Om frågan gäller en annan övning än currentExerciseName — t.ex. ett nyss nämnt alternativ eller en jämförelse — håll tydligt isär vilket namn som är den aktuella övningen och vilket som diskuteras. Svara om det namn användaren senast syftade på, inte om currentExerciseName av vana. Använd activePlanExerciseInfo om övningen finns där.",
  "- Om användaren ber om att hoppa över, byta eller lägga till: bekräfta vad du tror användaren menar och säg nästa tydliga steg. Ändra inte något själv om appen inte gör det.",
  "- När en övning inte fungerar: tänk på träningsmålet, inte övningsnamnet. Ersätt syftet, inte etiketten. currentExerciseInfo.category, primaryMuscle och movementPattern är ditt facit för vad övningen försöker uppnå.",
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
  "",
  "Användaren: vad är krokgrepp?",
  "Bra svar:",
  "Det är ett grepp där du lägger tummen runt stången och sedan låser den med fingrarna.",
  "Greppet blir mycket starkare, men tummen brukar protestera i början.",
  "Jag tycker faktiskt du kan vänta med det tills greppet börjar begränsa dig. 👊",
  "(Inte: en lista med varför det är bättre än mixat grepp, plus separata punkter om att tummen kan göra ont, plus råd för en annan övning. En fråga, ett svar.)",
].join("\n");

const CHAT_ACTION_INSTRUCTION = [
  'Returnera JSON, inte markdown. Format: {"text":"ditt vanliga coachsvar","action":null eller {"type":"replace_exercise","fromExerciseName":"...","toExerciseName":"..."}}.',
  "text-fältet är exakt samma fria, naturliga svar du annars skulle skriva enligt allt ovan — JSON-formatet ska inte göra svaret kortare, längre, mer formellt eller mindre naturligt.",
  "Sätt action bara när användaren just nu tydligt bytt eller vill byta den aktuella övningen mot en annan — oavsett hur de uttrycker det: \"jag kör X istället\", \"byter till X\", \"X funkar bättre för mig\", \"kan inte göra det, provar X\" och liknande. Använd currentExerciseInfo för att bedöma om X är en rimlig övning för samma syfte.",
  "Sätt inte action vid frågor, skämt, funderingar eller om användaren bara beskriver ett problem utan att säga vad de gör istället. Då svarar du bara i text, som vanligt — inget action.",
  "fromExerciseName ska vara currentExerciseName. toExerciseName ska vara övningen användaren namngav eller tydligt syftade på.",
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
    instruction: `${NAME_USAGE_RULE}\n\n${CHAT_QUESTION_INSTRUCTION}\n\n${CHAT_ACTION_INSTRUCTION}`,
    maxCharacters: MAX_CHAT_REPLY_CHARACTERS,
  };
}

export function buildCoachProgramPromptPayload(
  context: CoachProgramContext
): CoachPromptPayload {
  const instruction =
    'Svara på användarens input om träningsupplägget. Returnera JSON, inte markdown. Format: {"text":"kort coachsvar","suggestion":null eller {"summary":"kort sammanfattning","actions":[...]}}. Tillåtna actions: add_exercise {type, exerciseName, passKey?, passName?, reason?}, remove_exercise {type, exerciseName, reason?}, replace_exercise {type, fromExerciseName, toExerciseName, reason?}, rename_pass {type, passKey, displayName, reason?}. Föreslå bara actions när användaren tydligt vill ändra upplägget. Tolka naturligt språk brett: "hatar X", "X är sämst", "jag vill byta X", "X känns dålig", "får ont av X", "X funkar inte" och liknande betyder att användaren vill ändra övningen. Om användaren ogillar en övning, vill byta den eller får obehag av den: föreslå i första hand replace_exercise med ett konkret alternativ från exerciseLibrary/easierAlternative. Föreslå remove_exercise bara om användaren uttryckligen vill ta bort utan ersättning, om ingen rimlig ersättning finns, eller om säkerheten talar för paus. Föreslå aldrig vaga övningsnamn som "närmsta liknande övning", "liknande övning", "alternativ" eller "annan övning". Om övningen är oklar: suggestion ska vara null och du frågar vilken övning användaren menar. Påstå aldrig att ändringen redan är gjord; skriv att du föreslår den och att användaren kan godkänna. Om användaren bara ställer en fråga eller vill förstå upplägget utan att be om ändring: suggestion ska vara null. Svara tryggt, enkelt och coachigt utan att ändra schemat. Om exerciseLibrary finns och användaren frågar varför en övning ligger i upplägget, vad den tränar, hur den loggas, risker eller alternativ: använd exerciseLibrary som facit och svara användarvänligt. Vid ålder, rädsla, farligt, skada, smärta eller osäkerhet: var extra försiktig, säg att smärta/obehag går före planen och föreslå ändring om användaren kopplar obehaget till en specifik övning. Ge inte medicinska garantier. Vid frågor om fettminskning: förklara kort att styrketräning hjälper formen, musklerna och kroppen under viktnedgång, men att kosten också spelar stor roll. Om du behöver mer information, suggestion ska vara null och du frågar en enda kort följdfråga. Språkkrav: enkel svenska som en trött användare på gymmet fattar direkt. Använd inte slang eller oklara ord som "kötta", "köttade", "köttigt", "mangla" eller "brutal". Hitta inte på kroppsord; skriv "vid handledsbesvär" eller "om handlederna känns ömma". Om du föreslår passnamn ska de vara rena utan parenteser eller volymtaggar. Skriv som en coach, inte som support. Avsluta gärna med tydlig riktning, t.ex. "Vill du kan jag göra upplägget lugnare."';

  return {
    system: `${PROGRAM_COACH_SYSTEM}\n\n${PROGRAM_DESIGN_PROTOCOL}`,
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
    system: `${PROGRAM_COACH_SYSTEM}\n\n${PROGRAM_DESIGN_PROTOCOL}`,
    context,
    instruction: programInstruction,
    maxCharacters: 3200,
  };
}

export function buildCoachWorkoutReviewPromptPayload(
  context: CoachWorkoutReviewContext
): CoachPromptPayload {
  return {
    system: REVIEW_COACH_SYSTEM,
    context,
    instruction:
      `${NAME_USAGE_RULE}\n\nDu är en coach som just sett din elev avsluta sitt pass. Du minns deras historia. Du är genuint stolt och investerad i deras resa. Det ska synas i varje rad.\n\nReturnera ENDAST giltig JSON, inte markdown. Format: {"coachHeadline":"kort rad — det du säger direkt till dem nu","coachSummary":"1-3 meningar — vad det här passet betyder för deras resa, inte vad som hände","positives":["1-3 specifika saker du noterade och är stolt över"],"adjustments":["0-2 saker — bara om det verkligen behövs, annars tomt"],"nextFocus":["1-2 saker att bära med sig"],"coachMemoryTakeaway":["1-2 saker att minnas inför nästa pass"],"lobbyText":"1-2 meningar — vad du säger nästa gång de öppnar appen. Referera något konkret från det här passet. Ska väcka nyfikenhet, inte sammanfatta. Inga emojis. Exempel: 'Funderade lite på din bänkpress. Tror vi kan ta den vidare.' eller 'Det där sista setet på ryggen sitter kvar. Vi pratar mer nästa gång.' Max 160 tecken."}\n\ncoachHeadline är det du säger rakt till dem nu. Inte en rapport. Exempel: "Det här var ditt bästa A-pass hittills.", "Starkt jobbat idag. 👊", "Nu börjar det hända.", "Imponerande dag på bänken."\n\ncoachSummary svarar på: vad betyder det här passet för den här personen? Inte "du körde 14 set" utan "du etablerar en ny nivå på hantelpressen" eller "du hanterade tröttheten och körde ändå igenom — det är karaktär."\n\npositives ska vara specifika och äkta. Inte "bra jobbat". Utan "37.5 × 12 på hantelpress — ny topp. 🚀" eller "tre starka set på ryggen, stabil uppgång." Täck de övningar där något faktiskt hände. Om passet var starkt rakt igenom: fira det. Var inte balanserad för balansens skull.\n\nOm smärta, failure eller avbrott: lyft det som ett klokt beslut, aldrig som ett misslyckande.\n\nAnvänd 0-2 emojis (👊 🔥 💪 🚀 ✅ 📈) — bara vid riktig prestation, inte som dekoration.\n\nHitta inte på data. Allt ska komma från context.`,
    maxCharacters: 1600,
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
        payload.maxCharacters
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
