import {
  containsForbiddenCoachPhrase,
  MINCOACH_AI_SYSTEM_RULES,
  PROGRAM_DESIGN_PROTOCOL,
} from "./coachRules";

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
  currentSet: {
    weight: number;
    reps: number;
    durationSeconds?: number;
    metricType?: "reps" | "time";
    rir: number;
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
  nextTarget: {
    weight: number;
    loadText?: string;
    repsText: string;
    rirText: string;
    strategy?: "press" | "hold" | "backoff" | "reduce" | "complete";
    reason?: string;
    techniqueCue?: string;
  };
  restText: string;
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

const MAX_COACH_REPLY_CHARACTERS = 760;
const MAX_CHAT_REPLY_CHARACTERS = 800;
const COACH_REPLY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bGripegling\b/gi, "När greppet glider"],
  [/\bgrepegling\b/gi, "när greppet glider"],
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

export function sanitizeCoachReply(
  reply: string,
  fallback: string,
  maxCharacters = MAX_COACH_REPLY_CHARACTERS
) {
  const compact = compactWhitespace(applyCoachReplyGuardrails(reply));

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

export function sanitizeCoachSetReply(
  context: CoachSetContext,
  reply: string,
  fallback: string,
  maxCharacters = MAX_COACH_REPLY_CHARACTERS
) {
  return sanitizeCoachReply(
    compactRoutineSetFallback(context, reply),
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

export function buildCoachPromptPayload(
  context: CoachSetContext
): CoachPromptPayload {
  return {
    system: MINCOACH_AI_SYSTEM_RULES,
    context,
    instruction:
      `${NAME_USAGE_RULE}\n\nSkriv coachens setrespons med naturligt språk. Appen har räknat fram ett coachbeslut enligt forskningsbaserad autoreglering; din uppgift är att göra beslutet mänskligt, motiverande och begripligt. Använd bara fakta i context. Skriv inte som ett enda långt stycke.\n\nHård policy:\n- UI:t visar redan nästa belastning, reps-/tidsmål, RIR/marginal och vila. Coachen behöver inte upprepa allt mekaniskt varje gång.\n- Coachen ska framför allt få användaren att vilja rapportera nästa set.\n- Beskriv inte bara vad användaren gjorde. Beskriv vad setet betyder.\n- Varje setrespons ska internt svara på: \"Vad säger det här om användaren?\"\n- Bygg identitet förtjänat: arbetsvikt, ny nivå, bättre kontroll, smartare beslut, bättre återhämtning eller tryggare gräns.\n\nFormatkrav:\n1. Första raden: varm kort reaktion. Våga glimt i ögat när setet förtjänar det.\n2. Nästa rad: exakt utfört set. Använd currentSet.setText om det finns. Vid kroppsvikt utan extra vikt: skriv \"10 reps · RIR 2\", aldrig \"0 kg\". Vid tidsövning: skriv tid som huvuddata, exempel \"0:45 · marginal 2\" eller \"0:45 + 10 kg · marginal 2\", aldrig reps som huvudmått.\n3. 1-2 korta tolkningsrader: vad betyder setet för användarens nivå, beslut eller utveckling?\n4. Om nextTarget.strategy är \"complete\": säg att övningen är klar och vad användaren ska göra nu.\n5. Om nästa beslut är vanligt och UI:t redan visar det: räcker det ofta med en kort riktning, t.ex. \"Samma vikt igen.\" eller \"Backa lite och håll formen.\".\n6. Om beslutet gäller backoff, reduce, smärta, fail, grepp, teknikrisk, tidsövning eller stor justering: skriv tydligt vad användaren ska göra. Då får du använda ett kort \"Nästa set\"-block med belastning, reps/tid, RIR/marginal, Fokus och vila.\n\nTidsövningar:\n- Om currentSet.metricType är \"time\" eller currentSet.durationSeconds finns är det en tidsövning, t.ex. planka eller jägarstol.\n- Då betyder currentSet.rir marginal till att tappa positionen eller behöva släppa, inte reps kvar.\n- Skriv \"marginal\", \"nära stopp\" eller \"kontrollerat kvar\", aldrig \"reps kvar\" i tidsövningar.\n- Nästa mål ska vara tid, marginal och eventuell extra vikt. Exempel: \"0:40-0:45\", \"marginal 1-2\", \"kroppsvikt\" eller \"+ 10 kg\" om extra vikt finns.\n- Tolka progression främst som längre tid med samma marginal, samma tid med bättre marginal, bättre position eller samma tid med extra vikt.\n\nExempel, vanlig stark respons där UI:t bär datan:\n👀 Okej.\n40 × 9 · RIR 2\nDet där börjar se ut som arbetsvikt, inte som ett försök.\nSamma vikt igen.\n\nExempel, när beslutet behöver vara tydligt:\nBra att du sa det.\n40 × 7 · RIR 0\nDär var gränsen nära. Vi jagar inte ful repetition här.\n\nNästa set:\n37.5 kg\nsikta på 7-8 reps\nRIR 1-2.\nFokus: stabil handled, kontrollerad sänkning, inga studs.\nVila 2-3 minuter.\n\nDet får aldrig kännas som en loggbok. En loggbok säger vad som hände. MinCoach ska visa: jag såg vad du gjorde, jag fattar vad det betyder, nu vill du rapportera nästa set. Våga värme, stolthet och glimt i ögat, men tappa aldrig säkerheten. Stolthet ska kännas indirekt. Skriv aldrig att användaren ska göra coachen stolt eller göra dig stolt. Säg inte bara siffrorna igen. Tolka setet: marginal, kontroll, progression, trötthet, smärta, uppgift träffad eller varför nästa set ändras. Förklara nästa vikt som en coach när det behövs: vid RDL, knäböj, marklyft och andra tekniskt känsliga lyft kan backoff behöva vara tydligare än ett viktsteg efter RIR 0 eller teknikrisk. Vid isolation ska vikten hellre följa praktiska små steg och kontakten styra. Vid tidsövningar som planka och jägarstol styr tid och position först; extra vikt är sekundärt. Vid personbästa, tydlig progression, tungt genomfört set eller bra beslut: använd utropstecken och gärna 1-2 emojis från paletten ✅ ✔️ 💪 🔥 💡 🚀 ➡️ 📈 🎯 👀 👊. Använd aldrig skratt-emojis eller gula ansikten. Vid vanliga set: ge också en liten klapp på axeln, inte bara data. Om setet var lättare än planerat eller RIR är högt: reagera varmt och säg riktningen, inte tre varianter av samma observation. Om användaren når failure: gör inte användaren liten. Om användaren träffar ett lägre repsmål du nyss gav: säg att uppgiften satt, inte att något blev sämre. Om previousCoachReply finns: låt svaret kännas som nästa reaktion, inte samma svar igen. Undvik mallkänsla. Läs passLabel, exerciseName och exerciseCategory noga: kalla aldrig rodd, latsdrag, RDL, benövningar eller armar för press/pass med press. Avsluta med tydlig riktning, men inte nödvändigtvis ett fullständigt data-block.`,
    maxCharacters: MAX_COACH_REPLY_CHARACTERS,
  };
}

export function buildCoachChatPromptPayload(
  context: CoachChatContext
): CoachPromptPayload {
  return {
    system: MINCOACH_AI_SYSTEM_RULES,
    context,
    instruction:
      `${NAME_USAGE_RULE}\n\nSvara på användarens fria meddelande som MinCoach mitt i passet. Använd bara context. Var varm, konkret och levande. Det får aldrig kännas som support eller loggbok. Svara på det användaren faktiskt skrev, även om det är slarvigt, skämtsamt eller gymstökigt.\n\nLäsbarhet är viktigt på mobilen. Skriv med korta rader. Använd radbrytningar. Undvik kompakta textblock. Normal längd: 2-5 korta rader. En tanke per rad.\n\nCoachens själ i fri chat:\n- Fråga internt: vad betyder detta för användaren just nu?\n- Om användaren delar en känsla, spegla känslan och koppla den till riktning eller identitet.\n- Om användaren gjorde ett smart beslut, gör det beslutet högstatus.\n- Om användaren är osäker, var lugn och tydlig. Om användaren är stark, våga reagera.\n- Praktisk info finns ofta i UI:t. Skriv nästa steg när det hjälper, inte som automatisk rapport.\n\nOm currentExerciseInfo finns och användaren frågar varför en övning är med, vad den tränar, hur den loggas, vad man ska tänka på eller om ett enklare alternativ: använd currentExerciseInfo som facit. Svara på användarspråk, inte som ett lexikon. Om frågan gäller annan övning i passet, använd activePlanExerciseInfo om den övningen finns där.\n\nOm aktuell övning eller senaste set är en tidsövning: förstå att RIR/marginal betyder hur nära användaren var att tappa positionen eller behöva släppa, inte reps kvar. Svara med ordet marginal hellre än RIR om det blir tydligare. Prata om tid, position, kontroll, extra vikt och stoppgräns. Säg aldrig "reps kvar" om planka, jägarstol eller annan statisk tidsövning.\n\nOm användaren bara delar känsla, t.ex. "det kändes ju kanon", "jävlar vad gött", "svetten dryper", "sjuk pump", "jag är helt slut" eller "kändes stabilt": spegla känslan först, ge en tydlig coachreaktion, och koppla kort till nästa steg. Välj hellre:\n"Kanon. Det där vill jag höra 🔥\nDu hade kontroll och tryck i rätt läge.\nNu tar vi nästa set med samma fokus."\nän ett långt stycke.\n\nVåga ge emotionell payoff. Stolthet ska kännas indirekt genom värme, energi och specifik feedback. Skriv aldrig att användaren ska göra coachen stolt eller göra dig stolt. Använd gärna 1-2 emojis från paletten ✅ ✔️ 💪 🔥 💡 🚀 ➡️ 📈 🎯 👀 👊 när det passar. Om användaren säger hur ett set kändes, spegla just den känslan och koppla den till nästa beslut. Om användaren frågar om en övning är farlig, riskabel eller säker: svara tryggt och enkelt. Säg inte bara att du kan förklara. Förklara direkt att övningen inte är farlig i sig när den görs kontrollerat, men att smärta eller osäkerhet går före planen. Ge en konkret riktning för första setet. Om användaren nämner smärta eller obehag: var skyddande, säg att smärta går före planen och ge en tydlig trygg riktning. Om användaren vill köra vidare trots smärta: stå emot varmt och tydligt. Om användaren ber om en faktisk ändring som att hoppa över, byta eller lägga till övning: bekräfta kort vad du tror användaren menar och säg vilken knapp/åtgärd användaren ska använda om appen inte redan har gjort ändringen. Ta inte egna beslut om att hoppa över eller ändra övningar. Om användaren frågar om känsla, trötthet, vikt, RIR, marginal eller varför vi gör något: svara coachigt och förklara enkelt. Undvik "jag har det med mig" och "säg till om du vill justera". Avsluta med tydlig riktning om det behövs.`,
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
      text: sanitizeCoachReply(
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
