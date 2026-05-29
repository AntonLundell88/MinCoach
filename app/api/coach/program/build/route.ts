import { NextResponse } from "next/server";
import { checkAiRateLimit } from "../../../../lib/aiRateLimit";
import {
  type BuiltProgramExercise,
  type BuiltProgramPass,
  type BuiltWorkoutPlan,
  type CoachProgramBuildContext,
} from "../../../../lib/coachAi";
import {
  getExerciseProfile,
  normalizeExerciseSearchText,
  resolveExerciseName,
} from "../../../../lib/exercises";

type CoachProgramBuildRequest = {
  context?: CoachProgramBuildContext;
  fallbackPlan?: BuiltWorkoutPlan;
};

const PASS_KEYS = ["A", "B", "C", "D"] as const;
const PROGRAM_BUILD_TIMEOUT_MS = 24000;
const PROGRAM_BUILD_ATTEMPTS = 1;

const PROGRAM_BUILD_SYSTEM_PROMPT = `
Du är MinCoach programcoach. Bygg träningsprogram som en erfaren coach.
Viktigast: användarens mål, ålder, kön, träningsvana, passlängd, antal dagar, plats, utrustning och begränsningar ska påverka upplägget.
Principer:
- Muskelbygge: jämn veckovolym, tydliga basövningar, kompletterande isolering, ofta 6-15 reps.
- Styrka: färre huvudövningar, mätbar progression, lägre till medelhöga reps och längre vila.
- Fettminskning: enkelt, repeterbart upplägg som bevarar/bygger muskler. Påstå inte att styrketräning ensam styr vikten.
- Nybörjare/äldre/oskra användare: färre övningar, stabila varianter, RIR 2-3 och trygg start.
- Vana/erfarna: mer specifik struktur och RIR 1-3 där det passar.
- Begränsningar väger tungt. Bygg runt smärta, tidigare skador och oro. Ge inga medicinska garantier.
- Vid armbåge/handled/axel: välj smärtfritt grepp, stabila varianter och undvik onödig stress från curls, pushdowns och pressar.
- Varje övning ska ha ett tydligt syfte. Hellre 4-6 bra övningar än ett stökigt pass.
Returnera endast giltig JSON enligt schemat.
`.trim();

function compactProgramBuildContext(context: CoachProgramBuildContext) {
  return {
    kind: context.kind,
    userName: context.userName,
    profile: context.profile,
    existingPreferences: context.existingPreferences.slice(0, 10),
    availableExercises: context.availableExercises.slice(0, 80).map((exercise) => ({
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment,
      caution: exercise.caution,
    })),
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
          key: { type: "string", enum: ["A", "B", "C", "D"] },
          displayName: { type: "string" },
          intent: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
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
  return typeof value === "string" ? value.trim() : "";
}

function cleanList(value: unknown) {
  return Array.isArray(value)
    ? value.map(cleanText).filter(Boolean).slice(0, 4)
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

function normalizeExerciseName(value: unknown) {
  const rawName = cleanText(value);
  if (isVagueExerciseName(rawName)) return "";

  const resolved = resolveExerciseName(rawName);

  if (resolved.status === "known") return resolved.name;
  if (resolved.status === "suggest") return resolved.suggestion;
  if (resolved.status === "unknown") return resolved.name;

  return "";
}

function normalizeExercise(value: unknown): BuiltProgramExercise | null {
  if (!value || typeof value !== "object") {
    const name = normalizeExerciseName(value);
    return name ? { name } : null;
  }

  const raw = value as Record<string, unknown>;
  const name = normalizeExerciseName(raw.name);
  if (!name) return null;

  const profile = getExerciseProfile(name);
  const purpose = cleanText(raw.purpose);
  const caution = cleanText(raw.caution);

  return {
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
  fallbackPass?: BuiltProgramPass
): BuiltProgramPass | null {
  if (!value || typeof value !== "object") return fallbackPass ?? null;

  const raw = value as Record<string, unknown>;
  const key = PASS_KEYS[index];
  const displayName = cleanText(raw.displayName) || fallbackPass?.displayName || `Pass ${key}`;
  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];
  const exercises = rawExercises
    .map(normalizeExercise)
    .filter((exercise): exercise is BuiltProgramExercise => Boolean(exercise))
    .slice(0, 8);

  if (exercises.length === 0) return fallbackPass ?? null;

  return {
    key,
    displayName,
    intent: cleanText(raw.intent) || fallbackPass?.intent,
    exercises,
  };
}

function parsePlan(rawText: string, fallbackPlan: BuiltWorkoutPlan): BuiltWorkoutPlan | null {
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
      4
    );
    const passes = Array.from({ length: passCount }, (_, index) =>
      normalizePass(rawPasses[index], index, fallbackPlan.passes[index])
    )
      .filter((pass): pass is BuiltProgramPass => Boolean(pass));

    if (passes.length === 0) return null;

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

function fallbackResponse(
  fallbackPlan: BuiltWorkoutPlan | undefined,
  reason: string
) {
  return NextResponse.json({
    mode: "fallback",
    reason,
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
  const rateLimit = checkAiRateLimit(request, "program");

  if (!rateLimit.allowed) {
    return fallbackResponse(fallbackPlan, "rate_limited");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(fallbackPlan, "missing_api_key");
  }

  let lastReason = "api_error";

  for (let attempt = 1; attempt <= PROGRAM_BUILD_ATTEMPTS; attempt += 1) {
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
            "gpt-5-nano",
          instructions: PROGRAM_BUILD_SYSTEM_PROMPT,
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
                    instruction:
                      attempt === 1
                        ? "Bygg ett komplett första program. Antal pass ska matcha daysPerWeek, max 4. Varje pass ska ha 4-6 övningar. Använd främst övningar från availableExercises. Skriv kort men specifikt: coachSummary, planReason, structureReason och safetyNotes ska visa att du har vägt in profilen. Om limitation finns ska den synas i övningsval, caution och safetyNotes."
                        : "Svara med komplett giltig JSON enligt schemat.",
                  }),
                },
              ],
            },
          ],
          max_output_tokens: 4200,
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
      const plan = parsePlan(aiText, fallbackPlan);

      if (plan) {
        return NextResponse.json({
          mode: "ai",
          plan,
        });
      }

      lastReason = "invalid_plan";
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

  return fallbackResponse(fallbackPlan, lastReason);
}
