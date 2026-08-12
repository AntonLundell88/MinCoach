import { NextResponse } from "next/server";
import { checkAiRateLimit } from "../../../../lib/aiRateLimit";
import {
  type BuiltProgramExercise,
  type BuiltProgramPass,
  type BuiltWorkoutPlan,
  type CoachProgramBuildContext,
} from "../../../../lib/coachAi";
import { COACH_HARD_GUARDRAILS, COACH_LANGUAGE_NOTES } from "../../../../lib/coachVoice";
import { PROGRAM_DESIGN_PROTOCOL } from "../../../../lib/coachRules";
import {
  getExerciseDefinition,
  getExerciseDefinitionByKey,
  getExerciseKey,
  getExerciseProgramMeta,
  getExerciseProfile,
  normalizeExerciseSearchText,
  resolveExerciseName,
} from "../../../../lib/exercises";
import { repairMojibake } from "../../../../lib/textEncoding";

type CoachProgramBuildRequest = {
  context?: CoachProgramBuildContext;
  fallbackPlan?: BuiltWorkoutPlan;
};

const PASS_KEYS = ["A", "B", "C", "D", "E", "F"] as const;
// Netlify hard-kills the function at 30s (confirmed with support 2026-08-12,
// raised from the 10s default). Must fire well before that so the fallback
// response actually gets returned instead of an uncontrolled platform kill.
const PROGRAM_BUILD_TIMEOUT_MS = Number(
  process.env.OPENAI_PROGRAM_BUILD_TIMEOUT_MS ?? 25000
);
const PROGRAM_BUILD_ATTEMPTS = Number(
  process.env.OPENAI_PROGRAM_BUILD_ATTEMPTS ?? 1
);

const PROGRAM_BUILD_SYSTEM_PROMPT = `
${COACH_HARD_GUARDRAILS}

${COACH_LANGUAGE_NOTES}

${PROGRAM_DESIGN_PROTOCOL}

Passnamn ska vara rena och snygga utan parenteser eller volymtaggar. Skriv "Pass B — Ben och bål", inte "Pass B — Ben & Bål (Medelvolym)". Beskriv volym eller fokus i intent eller planReason istället.

Programbyggets övningssvårighet:
- Använd availableExercises.difficulty, beginnerFit och stability aktivt.
- Använd availableExercises.movementPattern för balans: kombinera press/drag, knäböjs- eller utfallsmönster, höftdominant arbete och bål efter mål och antal pass.
- För trainingExperience "nyborjare": prioritera beginnerFit "bra", difficulty "enkel" eller "medel" och stability "hog" eller "medel".
- Välj inte beginnerFit "undvik_som_standard" till en ny användare om det finns bra alternativ.
- Om du väljer en medel/avancerad övning för en ny användare ska den ha tydligt syfte, lugn start och ett enklare alternativ.
- Goblet squat är inte automatiskt en enkel standardövning. Den kan passa hemma/lätt laddad, men på gym är benpress, benspark eller annan stabil variant ofta tryggare för en helt ny eller osäker användare.

Varje övning ska ha ett tydligt syfte. Hellre 3-5 bra övningar än ett stökigt pass, särskilt hemma eller vid lite utrustning.
- Om availableExercises är begränsad får samma trygga övning återkomma i flera pass med olika syfte eller dosering. Fyll aldrig ut med otillåtna övningar.
- Lägg aldrig samma exerciseKey två gånger i samma pass. Välj hellre en annan kompletterande övning eller färre övningar.
- Välj ENDAST övningar från availableExercises. Använd exerciseKey exakt som den står i listan och matchande name.
- Saker som uppvärmning, skulderstabilitet, mobilitet eller rörlighet får vara råd i text, men aldrig loggbara övningar i passet.
- Om location är hemma gäller det hårt: inga maskiner, kablar, benpress, latsdrag eller cable crunch om de inte finns i availableExercises.
- Om availableExercises.logType är "time_rir" ska reps-fältet beskriva tid, t.ex. "30-45 sek", inte reps.

Textfältens roller:
- coachSummary: skriv 2-3 korta meningar direkt till användaren med "du" och "vi". Nämn träningsvana, plats, antal dagar, passlängd, primärt mål och viktiga begränsningar om de finns. Använd inte användarens namn och skriv aldrig om användaren i tredje person. Förklara inte veckans passuppdelning här.
- planReason: förklara kort varför övningsval, nivå, volym och progression passar just den här profilen. Upprepa inte hela användarprofilen.
- structureReason: förklara hur veckan är uppdelad med enkelt användarspråk. Undvik interna tränarord som rörelsemönster, horisontell press, dragfokus, knäböjsfokus, basövningar och isolationsövningar. Skriv hellre "bröst och triceps", "ben och bål", "rygg och axlar", "huvudövningar" och "extra övningar". Upprepa inte coachSummary.
- safetyNotes: skriv 2-4 korta, direkta råd till användaren. Anpassa till begränsningar/skador. Nämn smärta, att inte lägga på för mycket vikt för tidigt och att avbryta eller byta övning om kroppen känns fel. Ge inga medicinska garantier.
Returnera endast giltig JSON enligt schemat.
`.trim();

function compactProgramBuildContext(context: CoachProgramBuildContext) {
  return {
    kind: context.kind,
    userName: context.userName,
    profile: context.profile,
    existingPreferences: context.existingPreferences.slice(0, 10),
    availableExercises: context.availableExercises.slice(0, 32).map((exercise) => {
      const programMeta = getExerciseProgramMeta(exercise.name);

      return {
        exerciseKey:
          "exerciseKey" in exercise && typeof exercise.exerciseKey === "string"
            ? exercise.exerciseKey
            : getExerciseKey(exercise.name),
        name: exercise.name,
        category: exercise.category,
        equipment: exercise.equipment,
        environment: "environment" in exercise ? exercise.environment : undefined,
        equipmentTags: "equipmentTags" in exercise ? exercise.equipmentTags : undefined,
        primaryMuscle: "primaryMuscle" in exercise ? exercise.primaryMuscle : undefined,
        secondaryMuscles:
          "secondaryMuscles" in exercise ? exercise.secondaryMuscles : undefined,
        exerciseType: "exerciseType" in exercise ? exercise.exerciseType : undefined,
        movementPattern:
          "movementPattern" in exercise ? exercise.movementPattern : undefined,
        logType: "logType" in exercise ? exercise.logType : undefined,
        substitutions:
          "substitutions" in exercise
            ? exercise.substitutions?.slice(0, 3)
            : undefined,
        caution: exercise.caution,
        difficulty: programMeta.difficulty,
        beginnerFit: programMeta.beginnerFit,
        stability: programMeta.stability,
      };
    }),
  };
}

const PROGRAM_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    coachSummary: { type: "string" },
    planReason: { type: "string" },
    structureReason: { type: "string" },
    safetyNotes: {
      type: "array",
      items: { type: "string" },
    },
    passes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string", enum: ["A", "B", "C", "D", "E", "F"] },
          displayName: { type: "string" },
          intent: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                exerciseKey: { type: "string" },
                name: { type: "string" },
                purpose: { type: "string" },
                sets: { type: "string" },
                reps: { type: "string" },
                rir: { type: "string" },
                caution: { type: "string" },
                alternatives: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "exerciseKey",
                "name",
                "purpose",
                "sets",
                "reps",
                "rir",
                "caution",
                "alternatives",
              ],
            },
          },
        },
        required: ["key", "displayName", "intent", "exercises"],
      },
    },
  },
  required: [
    "title",
    "coachSummary",
    "planReason",
    "structureReason",
    "safetyNotes",
    "passes",
  ],
};

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const response = data as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (Array.isArray(response.output_text)) {
    return response.output_text
      .map((item) => (typeof item === "string" ? item : ""))
      .filter(Boolean)
      .join("\n");
  }

  if (!Array.isArray(response.output)) return "";

  return response.output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const maybeText = part as {
        text?: unknown;
        content?: unknown;
        parsed?: unknown;
      };
      if (typeof maybeText.text === "string") return maybeText.text;
      if (typeof maybeText.content === "string") return maybeText.content;
      if (maybeText.parsed && typeof maybeText.parsed === "object") {
        return JSON.stringify(maybeText.parsed);
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return repairMojibake(value).replace(/\s+/g, " ").trim();
}

function cleanList(value: unknown) {
  return Array.isArray(value)
    ? value.map(cleanText).filter(Boolean).slice(0, 6)
    : [];
}

function isVagueExerciseName(value: string) {
  const key = normalizeExerciseSearchText(value);
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

function normalizeExerciseKeyText(value: string) {
  return normalizeExerciseSearchText(value).replace(/\s+/g, "_");
}

type AllowedExerciseLookup = {
  keyToName: Map<string, string>;
  nameToKey: Map<string, string>;
  names: Set<string>;
};

type ProgramBuildIssue = {
  code: string;
  detail: string;
};

function issue(code: string, detail: string): ProgramBuildIssue {
  return { code, detail };
}

function issueText(issues: ProgramBuildIssue[]) {
  return issues.map((item) => repairMojibake(`${item.code}: ${item.detail}`));
}

function buildProgramBuildInstruction(args: {
  attempt: number;
  lastIssues: ProgramBuildIssue[];
  previousPlan: BuiltWorkoutPlan | null;
}) {
  if (args.attempt === 1) {
    return "Bygg ett komplett fÃ¶rsta program. Antal pass ska matcha daysPerWeek, max 6. Vid 5-6 pass ska passen vara smalare och mer Ã¥terhÃ¤mtningsvÃ¤nliga, sÃ¤rskilt fÃ¶r nybÃ¶rjare. Varje pass ska normalt ha 3-5 Ã¶vningar. Samma exerciseKey fÃ¥r inte ligga tvÃ¥ gÃ¥nger i samma pass. Om availableExercises Ã¤r begrÃ¤nsad, sÃ¤rskilt hemma med lite utrustning, hellre 3 bra Ã¶vningar per pass och upprepade trygga Ã¶vningar Ã¤n otillÃ¥tna utfyllnadsÃ¶vningar. AnvÃ¤nd endast Ã¶vningar frÃ¥n availableExercises och returnera bÃ¥de exerciseKey och name exakt frÃ¥n listan. Skriv coachSummary, planReason, structureReason och safetyNotes som fyra olika texter med olika syfte. coachSummary ska prata direkt till anvÃ¤ndaren med du/vi och vara unik fÃ¶r profilen. structureReason ska fÃ¶rklara passuppdelningen. safetyNotes ska vara direkta rÃ¥d om smÃ¤rta, vikt och begrÃ¤nsningar. Om limitation finns ska den synas i Ã¶vningsval, caution och safetyNotes.";
  }

  return [
    "Reparera programmet. Returnera ett helt nytt komplett JSON-svar enligt schemat.",
    "Du fÃ¥r inte fÃ¶rklara runt JSON och du fÃ¥r inte lÃ¤mna kvar nÃ¥got av felen nedan.",
    "BehÃ¥ll bara delar av previousPlan som fortfarande Ã¤r korrekta. Byt Ã¶vningar, text, passnamn, volym och struktur om det krÃ¤vs.",
    "Felen som mÃ¥ste lÃ¶sas:",
    ...issueText(args.lastIssues).map((item) => `- ${item}`),
    args.previousPlan
      ? "previousPlan innehÃ¥ller senaste underkÃ¤nda fÃ¶rsÃ¶ket."
      : "Det senaste svaret gick inte att anvÃ¤nda. Bygg om frÃ¥n grunden.",
  ].join("\n");
}

function normalizeExerciseName(value: unknown, allowedExerciseNames?: Set<string>) {
  const rawName = cleanText(value);
  if (isVagueExerciseName(rawName)) return "";

  const resolved = resolveExerciseName(rawName);
  const normalizeAllowed = (name: string) => {
    if (!allowedExerciseNames) return name;
    const normalized = normalizeExerciseSearchText(name);
    return allowedExerciseNames.has(normalized) ? name : "";
  };

  if (resolved.status === "known") return normalizeAllowed(resolved.name);
  if (resolved.status === "suggest") return normalizeAllowed(resolved.suggestion);
  if (resolved.status === "unknown") return normalizeAllowed(resolved.name);

  return "";
}

function resolveAllowedExercise(
  rawExerciseKey: unknown,
  rawExerciseName: unknown,
  allowedExercises: AllowedExerciseLookup
) {
  const exerciseKey = cleanText(rawExerciseKey);

  if (exerciseKey) {
    const normalizedKey = normalizeExerciseKeyText(exerciseKey);
    const directName = allowedExercises.keyToName.get(normalizedKey);

    if (directName) {
      return { exerciseKey: normalizedKey, name: directName };
    }

    const definition = getExerciseDefinitionByKey(exerciseKey);
    const definitionKey = definition ? getExerciseKey(definition.name) : "";
    const definitionName = definitionKey
      ? allowedExercises.keyToName.get(definitionKey)
      : "";

    if (definitionKey && definitionName) {
      return { exerciseKey: definitionKey, name: definitionName };
    }
  }

  const name = normalizeExerciseName(rawExerciseName, allowedExercises.names);
  if (!name) return null;

  const normalizedName = normalizeExerciseSearchText(name);
  const allowedKey = allowedExercises.nameToKey.get(normalizedName);
  if (!allowedKey) return null;

  return { exerciseKey: allowedKey, name };
}

function cleanPassDisplayName(value: unknown, fallback: string) {
  const rawName = cleanText(value) || cleanText(fallback);
  const cleaned = rawName
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(
      /\s*[–—-]\s*(?:medelvolym|högvolym|lågvolym|volym|standard|nybörjare|erfaren)\s*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || cleanText(fallback) || "Pass";
}

function normalizeExercise(
  value: unknown,
  allowedExercises: AllowedExerciseLookup
): BuiltProgramExercise | null {
  if (!value || typeof value !== "object") {
    const resolved = resolveAllowedExercise(undefined, value, allowedExercises);
    return resolved ? { exerciseKey: resolved.exerciseKey, name: resolved.name } : null;
  }

  const raw = value as Record<string, unknown>;
  const resolved = resolveAllowedExercise(
    raw.exerciseKey,
    raw.name,
    allowedExercises
  );
  if (!resolved) return null;

  const { exerciseKey, name } = resolved;
  const profile = getExerciseProfile(name);
  const purpose = cleanText(raw.purpose);
  const caution = cleanText(raw.caution);

  return {
    exerciseKey,
    name,
    purpose:
      purpose ||
      (profile.category !== "okänd"
        ? `Ger tydligt arbete för ${profile.category}.`
        : undefined),
    sets: cleanText(raw.sets) || undefined,
    reps: cleanText(raw.reps) || undefined,
    rir: cleanText(raw.rir) || undefined,
    caution: caution || profile.caution || undefined,
    alternatives: cleanList(raw.alternatives),
  };
}

function normalizePass(
  value: unknown,
  index: number,
  fallbackPass?: BuiltProgramPass,
  allowedExercises?: AllowedExerciseLookup
): BuiltProgramPass | null {
  if (!value || typeof value !== "object") return null;
  if (!allowedExercises) return null;

  const raw = value as Record<string, unknown>;
  const key = PASS_KEYS[index];
  const displayName = cleanPassDisplayName(
    raw.displayName,
    fallbackPass?.displayName || `Pass ${key}`
  );
  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];
  const exercises = rawExercises
    .map((exercise) => normalizeExercise(exercise, allowedExercises))
    .filter((exercise): exercise is BuiltProgramExercise => Boolean(exercise))
    .slice(0, 8);

  if (rawExercises.length !== exercises.length) return null;
  if (exercises.length === 0) return null;

  return {
    key,
    displayName,
    intent: cleanText(raw.intent) || fallbackPass?.intent,
    exercises,
  };
}

function parsePlan(
  rawText: string,
  fallbackPlan: BuiltWorkoutPlan,
  allowedExercises: AllowedExerciseLookup
): BuiltWorkoutPlan | null {
  const compact = rawText.trim();
  if (!compact) return null;

  const jsonText =
    compact.startsWith("{") && compact.endsWith("}")
      ? compact
      : compact.match(/\{[\s\S]*\}/)?.[0] ?? "";

  if (!jsonText) return null;

  try {
    const rawParsed = JSON.parse(jsonText) as unknown;
    const parsed =
      rawParsed && typeof rawParsed === "object" && !Array.isArray(rawParsed)
        ? ((rawParsed as { plan?: unknown; workoutPlan?: unknown }).plan ??
            (rawParsed as { workoutPlan?: unknown }).workoutPlan ??
            rawParsed)
        : null;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const parsedPlan = parsed as Record<string, unknown>;
    const rawPasses = Array.isArray(parsedPlan.passes) ? parsedPlan.passes : [];
    const passCount = Math.min(
      Math.max(1, Number(fallbackPlan.daysPerWeek) || rawPasses.length || 1),
      6
    );
    const passes = Array.from({ length: passCount }, (_, index) =>
      normalizePass(
        rawPasses[index],
        index,
        fallbackPlan.passes[index],
        allowedExercises
      )
    )
      .filter((pass): pass is BuiltProgramPass => Boolean(pass));

    if (passes.length === 0) return null;
    if (passes.length !== passCount) return null;

    return {
      ...fallbackPlan,
      title: cleanText(parsedPlan.title) || fallbackPlan.title,
      coachSummary:
        cleanText(parsedPlan.coachSummary) || fallbackPlan.coachSummary,
      planReason: cleanText(parsedPlan.planReason) || fallbackPlan.planReason,
      structureReason:
        cleanText(parsedPlan.structureReason) || fallbackPlan.structureReason,
      safetyNotes: cleanList(parsedPlan.safetyNotes),
      source: "ai",
      builtAt: new Date().toISOString(),
      passes,
    };
  } catch {
    return null;
  }
}

function getPassExerciseTarget(minutesPerSession: number, daysPerWeek: number) {
  const base =
    minutesPerSession <= 30
      ? { min: 2, max: 4 }
      : minutesPerSession <= 45
        ? { min: 3, max: 5 }
        : minutesPerSession <= 60
          ? { min: 3, max: 6 }
          : { min: 4, max: 7 };

  if (daysPerWeek >= 5) {
    return { min: 2, max: Math.min(base.max, 5) };
  }

  return base;
}

function hasAny(patterns: string[], source: Set<string>) {
  return patterns.some((pattern) => source.has(pattern));
}

function hasLimitationReference(notes: string[] | undefined, limitations?: string) {
  const limitationTokens = normalizeExerciseSearchText(limitations ?? "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  if (limitationTokens.length === 0) return true;

  const notesText = normalizeExerciseSearchText((notes ?? []).join(" "));
  return limitationTokens.some((token) => notesText.includes(token));
}

function getPlanValidationIssues(
  plan: BuiltWorkoutPlan,
  availableExercises: Array<{
    category?: string;
    exerciseKey?: string;
    name: string;
    movementPattern?: string;
  }>,
  profile: CoachProgramBuildContext["profile"],
  userName?: string
) {
  const issues: ProgramBuildIssue[] = [];
  const forbiddenExerciseTerms = [
    "uppvarmning",
    "skulderstabilitet",
    "mobilitet",
    "rorlighet",
    "stretch",
  ];
  const patternByKey = new Map<string, string>();
  const patternByName = new Map<string, string>();
  const categoryByKey = new Map<string, string>();
  const categoryByName = new Map<string, string>();

  availableExercises.forEach((exercise) => {
    if (!exercise.movementPattern) return;
    const exerciseKey =
      typeof exercise.exerciseKey === "string"
        ? normalizeExerciseKeyText(exercise.exerciseKey)
        : getExerciseKey(exercise.name);

    patternByKey.set(exerciseKey, exercise.movementPattern);
    patternByName.set(
      normalizeExerciseSearchText(exercise.name),
      exercise.movementPattern
    );
    if (exercise.category) {
      categoryByKey.set(exerciseKey, exercise.category);
      categoryByName.set(normalizeExerciseSearchText(exercise.name), exercise.category);
    }
  });

  const planPatterns = new Set<string>();
  const planCategories = new Set<string>();
  const expectedPassCount = Math.max(1, Math.min(6, profile.daysPerWeek));
  const passTarget = getPassExerciseTarget(
    profile.minutesPerSession,
    profile.daysPerWeek
  );

  if (plan.passes.length !== expectedPassCount) {
    issues.push(
      issue(
        "wrong_pass_count",
        `Planen har ${plan.passes.length} pass men profilen krÃ¤ver ${expectedPassCount}.`
      )
    );
  }

  void userName;

  plan.passes.forEach((pass) => {
    const passExerciseKeys = new Set<string>();

    if (pass.exercises.length < passTarget.min) {
      issues.push(
        issue(
          "pass_too_small",
          `${pass.key} har ${pass.exercises.length} Ã¶vningar men bÃ¶r ha minst ${passTarget.min}.`
        )
      );
    }

    if (pass.exercises.length > passTarget.max) {
      issues.push(
        issue(
          "pass_too_large",
          `${pass.key} har ${pass.exercises.length} Ã¶vningar men bÃ¶r ha max ${passTarget.max}.`
        )
      );
    }

    pass.exercises.forEach((exercise) => {
      const normalizedExerciseName = normalizeExerciseSearchText(exercise.name);
      const normalizedExerciseKey = exercise.exerciseKey
        ? normalizeExerciseKeyText(exercise.exerciseKey)
        : getExerciseKey(exercise.name);

      if (passExerciseKeys.has(normalizedExerciseKey)) {
        issues.push(
          issue(
            "duplicate_exercise_in_pass",
            `${pass.key}: ${exercise.name} ligger med mer än en gång i samma pass.`
          )
        );
      }

      passExerciseKeys.add(normalizedExerciseKey);

      if (
        forbiddenExerciseTerms.some((term) =>
          normalizedExerciseName.includes(term)
        )
      ) {
        issues.push(
          issue(
            "forbidden_exercise_text",
            `${pass.key}: ${exercise.name} Ã¤r rÃ¥d/uppvÃ¤rmning, inte en loggbar Ã¶vning.`
          )
        );
      }

      const definition =
        (exercise.exerciseKey
          ? getExerciseDefinitionByKey(exercise.exerciseKey)
          : undefined) ?? getExerciseDefinition(exercise.name);

      if (!definition) {
        issues.push(
          issue("missing_definition", `${pass.key}: ${exercise.name} finns inte i biblioteket.`)
        );
        return;
      }

      const movementPattern =
        (exercise.exerciseKey
          ? patternByKey.get(normalizeExerciseKeyText(exercise.exerciseKey))
          : undefined) ??
        patternByName.get(normalizeExerciseSearchText(exercise.name)) ??
        definition.movementPattern;

      if (movementPattern) {
        planPatterns.add(movementPattern);
      }

      const category =
        (exercise.exerciseKey
          ? categoryByKey.get(normalizeExerciseKeyText(exercise.exerciseKey))
          : undefined) ??
        categoryByName.get(normalizeExerciseSearchText(exercise.name)) ??
        definition.category;

      if (category) {
        planCategories.add(category);
      }

      if (!cleanText(exercise.purpose) || !cleanText(exercise.sets) || !cleanText(exercise.reps) || !cleanText(exercise.rir)) {
        issues.push(
          issue(
            "missing_exercise_dose",
            `${pass.key}: ${exercise.name} saknar purpose, sets, reps eller RIR.`
          )
        );
      }

      const repsText = normalizeExerciseSearchText(exercise.reps ?? "");
      const looksLikeTimeRange = /^\d+\s*(?:-|–|till)\s*\d+$/.test(
        (exercise.reps ?? "").trim()
      );

      if (
        definition.logType === "time_rir" &&
        (repsText.includes("rep") ||
          !(
            repsText.includes("sek") ||
            repsText.includes("min") ||
            repsText.includes("tid") ||
            looksLikeTimeRange ||
            /\d+\s*s\b/.test(repsText)
          ))
      ) {
        issues.push(
          issue(
            "timed_exercise_has_bad_metric",
            `${pass.key}: ${exercise.name} ska loggas med tid, inte vanliga reps.`
          )
        );
      }
    });
  });

  const availablePatterns = new Set([
    ...patternByKey.values(),
    ...patternByName.values(),
  ]);
  const requiresWeeklyBalance =
    plan.passes.length >= 2 &&
    plan.passes.reduce((count, pass) => count + pass.exercises.length, 0) >= 6;
  const balanceGroups = [
    {
      label: "missing_weekly_press",
      patterns: ["horisontell_press", "vertikal_press"],
    },
    {
      label: "missing_weekly_pull",
      patterns: ["horisontellt_drag", "vertikalt_drag"],
    },
    {
      label: "missing_weekly_lower_body",
      patterns: [
        "knaboj",
        "utfall_ett_ben",
        "hoftfallning",
        "hoftstrackning",
        "knadominant_isolering",
        "hamstring_isolering",
      ],
    },
  ];

  if (requiresWeeklyBalance) {
    balanceGroups.forEach((group) => {
      if (
        hasAny(group.patterns, availablePatterns) &&
        !hasAny(group.patterns, planPatterns)
      ) {
        issues.push(
          issue(group.label, `Veckan saknar ${group.label.replace("missing_weekly_", "")}.`)
        );
      }
    });
  }

  const hasLower =
    hasAny(
      [
        "knaboj",
        "utfall_ett_ben",
        "hoftfallning",
        "hoftstrackning",
        "knadominant_isolering",
        "hamstring_isolering",
      ],
      planPatterns
    ) || planCategories.has("ben");
  const hasQuad = hasAny(["knaboj", "utfall_ett_ben", "knadominant_isolering"], planPatterns);
  const hasPosterior = hasAny(
    ["hoftfallning", "hoftstrackning", "hamstring_isolering"],
    planPatterns
  );

  if (hasLower && hasQuad && !hasPosterior && hasAny(["hoftfallning", "hoftstrackning", "hamstring_isolering"], availablePatterns)) {
    issues.push(
      issue(
        "missing_posterior_chain",
        "Underkroppen har framsida lÃ¥r men saknar tydlig baksida lÃ¥r eller sÃ¤te."
      )
    );
  }

  if (!hasLimitationReference(plan.safetyNotes, profile.limitations)) {
    issues.push(
      issue(
        "limitations_not_reflected",
        "AnvÃ¤ndarens begrÃ¤nsningar mÃ¥ste synas i safetyNotes och pÃ¥verka upplÃ¤gget."
      )
    );
  }

  return issues;
}

function fallbackResponse(
  fallbackPlan: BuiltWorkoutPlan | undefined,
  reason: string,
  issues: ProgramBuildIssue[] = []
) {
  console.warn("Program build fallback response", {
    reason,
    issues: issueText(issues),
  });

  return NextResponse.json({
    mode: "fallback",
    reason,
    issues: issueText(issues),
    plan: fallbackPlan ?? null,
  });
}

export async function POST(request: Request) {
  let body: CoachProgramBuildRequest;

  try {
    body = (await request.json()) as CoachProgramBuildRequest;
  } catch {
    return fallbackResponse(undefined, "invalid_json");
  }

  const context = body.context;
  const fallbackPlan = body.fallbackPlan;

  if (!context || context.kind !== "program_build" || !fallbackPlan) {
    return fallbackResponse(fallbackPlan, "invalid_context");
  }

  const compactContext = compactProgramBuildContext(context);
  const allowedExercises = compactContext.availableExercises.reduce<AllowedExerciseLookup>(
    (lookup, exercise) => {
      const exerciseKey =
        typeof exercise.exerciseKey === "string"
          ? normalizeExerciseKeyText(exercise.exerciseKey)
          : getExerciseKey(exercise.name);
      const normalizedName = normalizeExerciseSearchText(exercise.name);

      lookup.keyToName.set(exerciseKey, exercise.name);
      lookup.nameToKey.set(normalizedName, exerciseKey);
      lookup.names.add(normalizedName);

      return lookup;
    },
    {
      keyToName: new Map<string, string>(),
      nameToKey: new Map<string, string>(),
      names: new Set<string>(),
    }
  );
  const rateLimit = checkAiRateLimit(request, "program");

  if (!rateLimit.allowed) {
    return fallbackResponse(fallbackPlan, "rate_limited");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(fallbackPlan, "missing_api_key");
  }

  let lastReason = "api_error";
  let lastIssues: ProgramBuildIssue[] = [];
  let previousInvalidPlan: BuiltWorkoutPlan | null = null;

  for (let attempt = 1; attempt <= PROGRAM_BUILD_ATTEMPTS; attempt += 1) {
    const buildInstruction = repairMojibake(
      buildProgramBuildInstruction({
        attempt,
        lastIssues,
        previousPlan: previousInvalidPlan,
      })
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      PROGRAM_BUILD_TIMEOUT_MS
    );

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_PROGRAM_MODEL ??
            "gpt-5-mini",
          instructions: repairMojibake(PROGRAM_BUILD_SYSTEM_PROMPT),
          reasoning: { effort: "minimal" },
          text: {
            verbosity: "low",
            format: {
              type: "json_schema",
              name: "mincoach_workout_plan",
              schema: PROGRAM_PLAN_JSON_SCHEMA,
              strict: true,
            },
          },
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify({
                    context: compactContext,
                    instruction: buildInstruction,
                    validationIssues: issueText(lastIssues),
                    previousPlan: previousInvalidPlan,
                  }),
                },
              ],
            },
          ],
          max_output_tokens: 4000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        lastReason = `api_error_${response.status}`;
        console.error("OpenAI program build failed", {
          attempt,
          status: response.status,
          body: errorText.slice(0, 500),
        });

        if (response.status === 401 || response.status === 403 || response.status === 429) {
          break;
        }

        continue;
      }

      const data = await response.json();
      const aiText = extractOutputText(data);
      const plan = parsePlan(aiText, fallbackPlan, allowedExercises);

      if (plan) {
        const validationIssues = getPlanValidationIssues(
          plan,
          compactContext.availableExercises,
          compactContext.profile,
          compactContext.userName
        );

        if (validationIssues.length > 0) {
          lastReason = "invalid_plan_validation";
          lastIssues = validationIssues;
          previousInvalidPlan = plan;
          console.error("OpenAI program build failed validation", {
            attempt,
            issues: issueText(validationIssues),
          });
          continue;
        }

        return NextResponse.json({
          mode: "ai",
          plan,
        });
      }

      lastReason = "invalid_plan";
      lastIssues = [
        issue(
          "invalid_plan",
          "Svaret gick inte att parsa till ett komplett program utan fallback."
        ),
      ];
      console.error("OpenAI program build returned invalid plan", {
        attempt,
        body: aiText.slice(0, 700),
      });
    } catch (error) {
      lastReason =
        (error as { name?: string })?.name === "AbortError"
          ? "timeout"
          : "api_error";
      console.error("OpenAI program build request failed", {
        attempt,
        reason: lastReason,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return fallbackResponse(fallbackPlan, lastReason, lastIssues);
}
