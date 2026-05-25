import {
  containsForbiddenCoachPhrase,
  MINCOACH_AI_SYSTEM_RULES,
} from "./coachRules";

export type CoachReplyMode = "fallback" | "ai-ready";

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
    rir: number;
    failNote?: string;
  };
  previousSet?: {
    weight: number;
    reps: number;
    rir?: number;
  };
  personalRecordText?: string;
  nextTarget: {
    weight: number;
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
  exerciseIndex?: number;
  exerciseCount?: number;
  currentSets?: Array<{
    weight: number;
    reps: number;
    rir?: number;
    failNote?: string;
  }>;
  activePlan?: string[];
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
  limitations?: string;
  workoutPlan: {
    title: string;
    passes: Array<{
      key: string;
      displayName: string;
      exercises: string[];
    }>;
  };
  existingPreferences: string[];
};

export type CoachProgramSuggestionAction =
  | {
      type: "add_exercise";
      exerciseName: string;
      passKey?: "A" | "B" | "C" | "D";
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
      passKey: "A" | "B" | "C" | "D";
      displayName: string;
      reason?: string;
    };

export type CoachProgramSuggestion = {
  summary: string;
  actions: CoachProgramSuggestionAction[];
};

export type CoachPromptPayload = {
  system: string;
  context: CoachSetContext | CoachChatContext | CoachProgramContext;
  instruction: string;
  maxCharacters: number;
};

const MAX_COACH_REPLY_CHARACTERS = 650;
const MAX_CHAT_REPLY_CHARACTERS = 520;

function compactWhitespace(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeCoachReply(
  reply: string,
  fallback: string,
  maxCharacters = MAX_COACH_REPLY_CHARACTERS
) {
  const compact = compactWhitespace(reply);

  if (!compact) return compactWhitespace(fallback);
  if (containsForbiddenCoachPhrase(compact)) return compactWhitespace(fallback);

  if (compact.length <= maxCharacters) return compact;

  const shortened = compact.slice(0, maxCharacters).replace(/\s+\S*$/, "").trim();
  return shortened || compactWhitespace(fallback);
}

export function buildCoachPromptPayload(
  context: CoachSetContext
): CoachPromptPayload {
  return {
    system: MINCOACH_AI_SYSTEM_RULES,
    context,
    instruction:
      "Skriv coachens setrespons med naturligt språk. Appen har redan räknat ut beslutet; din uppgift är att göra beslutet mänskligt, motiverande och begripligt. Använd bara fakta i context. Det får aldrig kännas som en loggbok. En loggbok säger vad som hände. MinCoach ska visa: jag såg vad du gjorde, jag fattar vad det betyder, nu vet du nästa steg. Säg inte bara siffrorna igen. Tolka setet kort: marginal, kontroll, progression, trötthet, smärta, uppgift träffad eller varför nästa set ändras. Var varm, hjärtlig och tydligt engagerad. Hellre lite mer känsla än för kallt. Vid verklig progression får du använda mer energi, ibland utropstecken och max en sparsam emoji från denna palett: ✅ ✔️ 💪 🔥 💡 🚀 ➡️ 📈 🎯. Använd aldrig skratt-emojis eller gula ansikten. Om setet var lättare än planerat eller RIR är högt: ge en varm klapp på axeln och säg riktningen, inte tre varianter av samma observation. Om användaren når failure: gör inte användaren liten. Säg mjukt att gränsen kom efter arbetet innan och förklara varför vi sänker, stannar eller går vidare. Om användaren får ont: var skyddande och varm, inte kall eller dömande. Om användaren träffar ett lägre repsmål du nyss gav: säg att uppgiften satt, inte att något blev sämre. Om previousCoachReply finns: låt svaret kännas som nästa reaktion, inte samma svar igen. Undvik mallkänsla, mekaniska block, upprepning och AI-ord som \"toppjobbet\", \"gör nästa set mer ärligt\", \"jag har det med mig\". Läs passLabel, exerciseName och exerciseCategory noga: kalla aldrig rodd, latsdrag, RDL, benövningar eller armar för press/pass med press. Låt övningen väga tyngst. Avsluta alltid med tydlig riktning.",
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
      "Svara på användarens fria meddelande som MinCoach mitt i passet. Använd bara context. Var varm, konkret och kort. Det får aldrig kännas som support eller loggbok. Svara på det användaren faktiskt skrev. Om användaren säger hur ett set kändes, spegla just den känslan och koppla den till nästa beslut. Om användaren skriver \"stabilt\", \"bra kontakt\" eller \"kändes bra\": gör det till något coachen värderar, t.ex. att planen sitter eller att vi kan hålla nivån. Om användaren nämner smärta eller obehag: var skyddande, säg att smärta går före planen och ge en tydlig trygg riktning. Om användaren vill köra vidare trots smärta: stå emot varmt och tydligt. Om användaren ber om en faktisk ändring som att hoppa över, byta eller lägga till övning: bekräfta kort vad du tror användaren menar och säg vilken knapp/åtgärd användaren ska använda om appen inte redan har gjort ändringen. Ta inte egna beslut om att hoppa över eller ändra övningar. Om användaren frågar om känsla, trötthet, vikt, RIR eller varför vi gör något: svara coachigt och förklara enkelt. Undvik \"jag har det med mig\" och \"säg till om du vill justera\". Avsluta med tydlig riktning. Max en sparsam emoji från paletten vid verklig värme.",
    maxCharacters: MAX_CHAT_REPLY_CHARACTERS,
  };
}

export function buildCoachProgramPromptPayload(
  context: CoachProgramContext
): CoachPromptPayload {
  const instruction =
    'Svara på användarens input om träningsupplägget. Returnera JSON, inte markdown. Format: {"text":"kort coachsvar","suggestion":null eller {"summary":"kort sammanfattning","actions":[...]}}. Tillåtna actions: add_exercise {type, exerciseName, passKey?, passName?, reason?}, remove_exercise {type, exerciseName, reason?}, replace_exercise {type, fromExerciseName, toExerciseName, reason?}, rename_pass {type, passKey, displayName, reason?}. Föreslå bara actions när användaren tydligt vill ändra upplägget. Påstå aldrig att ändringen redan är gjord; skriv att du föreslår den och att användaren kan godkänna. Om användaren ställer en fråga, uttrycker oro eller vill förstå upplägget: suggestion ska vara null. Svara tryggt, enkelt och coachigt utan att ändra schemat. Vid ålder, rädsla, farligt, skada, smärta eller osäkerhet: var extra försiktig, säg att smärta/obehag går före planen och att upplägget kan göras lugnare. Ge inte medicinska garantier. Vid frågor om fettminskning: förklara kort att styrketräning hjälper formen, musklerna och kroppen under viktnedgång, men att kosten också spelar stor roll. Om du behöver mer information, suggestion ska vara null och du frågar en enda kort följdfråga. Skriv som en coach, inte som support. Avsluta gärna med tydlig riktning, t.ex. "Vill du kan jag göra upplägget lugnare."';

  return {
    system: MINCOACH_AI_SYSTEM_RULES,
    context,
    instruction,
    maxCharacters: MAX_CHAT_REPLY_CHARACTERS,
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
    text: sanitizeCoachReply(fallbackReply, fallbackReply, payload.maxCharacters),
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
      text: sanitizeCoachReply(
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
