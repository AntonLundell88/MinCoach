import { NextResponse } from "next/server";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";
import {
  buildCoachProgramPromptPayload,
  sanitizeCoachReply,
  type CoachProgramContext,
  type CoachProgramSuggestion,
  type CoachProgramSuggestionAction,
} from "../../../lib/coachAi";

type CoachProgramRequest = {
  context?: CoachProgramContext;
  fallbackReply?: string;
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

function fallbackResponse(
  fallbackReply: string,
  reason: string,
  maxCharacters?: number
) {
  return NextResponse.json({
    mode: "fallback",
    reason,
    text: sanitizeCoachReply(fallbackReply, fallbackReply, maxCharacters),
    suggestion: null,
  });
}

function isPassKey(value: unknown): value is "A" | "B" | "C" | "D" {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSuggestionAction(value: unknown): CoachProgramSuggestionAction | null {
  if (!value || typeof value !== "object") return null;

  const action = value as Record<string, unknown>;
  const type = action.type;

  if (type === "add_exercise") {
    const exerciseName = cleanText(action.exerciseName);
    if (!exerciseName) return null;

    return {
      type,
      exerciseName,
      passKey: isPassKey(action.passKey) ? action.passKey : undefined,
      passName: cleanText(action.passName) || undefined,
      reason: cleanText(action.reason) || undefined,
    };
  }

  if (type === "remove_exercise") {
    const exerciseName = cleanText(action.exerciseName);
    if (!exerciseName) return null;

    return {
      type,
      exerciseName,
      reason: cleanText(action.reason) || undefined,
    };
  }

  if (type === "replace_exercise") {
    const fromExerciseName = cleanText(action.fromExerciseName);
    const toExerciseName = cleanText(action.toExerciseName);
    if (!fromExerciseName || !toExerciseName) return null;

    return {
      type,
      fromExerciseName,
      toExerciseName,
      reason: cleanText(action.reason) || undefined,
    };
  }

  if (type === "rename_pass") {
    const displayName = cleanText(action.displayName);
    if (!isPassKey(action.passKey) || !displayName) return null;

    return {
      type,
      passKey: action.passKey,
      displayName,
      reason: cleanText(action.reason) || undefined,
    };
  }

  return null;
}

function parseProgramAiResponse(rawText: string): {
  text: string;
  suggestion: CoachProgramSuggestion | null;
} {
  const compact = rawText.trim();
  if (!compact) return { text: "", suggestion: null };

  const jsonText =
    compact.startsWith("{") && compact.endsWith("}")
      ? compact
      : compact.match(/\{[\s\S]*\}/)?.[0] ?? "";

  if (!jsonText) return { text: compact, suggestion: null };

  try {
    const parsed = JSON.parse(jsonText) as {
      text?: unknown;
      suggestion?: unknown;
    };
    const actionsRaw =
      parsed.suggestion &&
      typeof parsed.suggestion === "object" &&
      Array.isArray((parsed.suggestion as { actions?: unknown }).actions)
        ? ((parsed.suggestion as { actions: unknown[] }).actions)
        : [];
    const actions = actionsRaw
      .map(normalizeSuggestionAction)
      .filter((action): action is CoachProgramSuggestionAction =>
        Boolean(action)
      )
      .slice(0, 4);
    const summary =
      parsed.suggestion && typeof parsed.suggestion === "object"
        ? cleanText((parsed.suggestion as { summary?: unknown }).summary)
        : "";

    return {
      text: cleanText(parsed.text) || compact,
      suggestion:
        actions.length > 0
          ? {
              summary: summary || "Jag har ett konkret förslag.",
              actions,
            }
          : null,
    };
  } catch {
    return { text: compact, suggestion: null };
  }
}

export async function POST(request: Request) {
  let body: CoachProgramRequest;

  try {
    body = (await request.json()) as CoachProgramRequest;
  } catch {
    return fallbackResponse("", "invalid_json");
  }

  const context = body.context;
  const fallbackReply = body.fallbackReply ?? "";

  if (!context || context.kind !== "program_input") {
    return fallbackResponse(fallbackReply, "invalid_context");
  }

  const payload = buildCoachProgramPromptPayload(context);
  const rateLimit = checkAiRateLimit(request, "program");

  if (!rateLimit.allowed) {
    return fallbackResponse(
      fallbackReply,
      "rate_limited",
      payload.maxCharacters
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(
      fallbackReply,
      "missing_api_key",
      payload.maxCharacters
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
        instructions: payload.system,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  context: payload.context,
                  instruction: payload.instruction,
                  maxCharacters: payload.maxCharacters,
                }),
              },
            ],
          },
        ],
        max_output_tokens: 320,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI coach program failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });

      return fallbackResponse(
        fallbackReply,
        "api_error",
        payload.maxCharacters
      );
    }

    const data = await response.json();
    const aiText = extractOutputText(data);
    const parsed = parseProgramAiResponse(aiText);

    return NextResponse.json({
      mode: "ai",
      text: sanitizeCoachReply(
        parsed.text,
        fallbackReply,
        payload.maxCharacters
      ),
      suggestion: parsed.suggestion,
    });
  } catch {
    return fallbackResponse(fallbackReply, "api_error", payload.maxCharacters);
  } finally {
    clearTimeout(timeoutId);
  }
}
