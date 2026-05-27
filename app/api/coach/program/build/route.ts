import { NextResponse } from "next/server";
import { checkAiRateLimit } from "../../../../lib/aiRateLimit";
import {
  buildCoachProgramBuildPromptPayload,
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

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const response = data as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
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
      const maybeText = part as { text?: unknown; content?: unknown };
      if (typeof maybeText.text === "string") return maybeText.text;
      if (typeof maybeText.content === "string") return maybeText.content;
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
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const rawPasses = Array.isArray(parsed.passes) ? parsed.passes : [];
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
      title: cleanText(parsed.title) || fallbackPlan.title,
      coachSummary:
        cleanText(parsed.coachSummary) || fallbackPlan.coachSummary,
      planReason: cleanText(parsed.planReason) || fallbackPlan.planReason,
      structureReason:
        cleanText(parsed.structureReason) || fallbackPlan.structureReason,
      safetyNotes: cleanList(parsed.safetyNotes),
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

  const payload = buildCoachProgramBuildPromptPayload(context);
  const rateLimit = checkAiRateLimit(request, "program");

  if (!rateLimit.allowed) {
    return fallbackResponse(fallbackPlan, "rate_limited");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(fallbackPlan, "missing_api_key");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          process.env.OPENAI_MODEL ??
          "gpt-5-mini",
        instructions: payload.system,
        reasoning: { effort: "medium" },
        text: { verbosity: "low" },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  context: payload.context,
                  instruction: payload.instruction,
                }),
              },
            ],
          },
        ],
        max_output_tokens: 2600,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI program build failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });

      return fallbackResponse(fallbackPlan, "api_error");
    }

    const data = await response.json();
    const aiText = extractOutputText(data);
    const plan = parsePlan(aiText, fallbackPlan);

    if (!plan) {
      return fallbackResponse(fallbackPlan, "invalid_plan");
    }

    return NextResponse.json({
      mode: "ai",
      plan,
    });
  } catch {
    return fallbackResponse(fallbackPlan, "api_error");
  } finally {
    clearTimeout(timeoutId);
  }
}
