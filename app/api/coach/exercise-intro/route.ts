import { NextResponse } from "next/server";
import { sanitizeCoachReply, type CoachExerciseIntroContext } from "../../../lib/coachAi";
import { buildCoachExerciseIntroPromptPayload } from "../../../lib/coachPrompts";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";

type CoachExerciseIntroRequest = {
  context?: CoachExerciseIntroContext;
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
  });
}

export async function POST(request: Request) {
  let body: CoachExerciseIntroRequest;

  try {
    body = (await request.json()) as CoachExerciseIntroRequest;
  } catch {
    return fallbackResponse("", "invalid_json");
  }

  const context = body.context;
  const fallbackReply = body.fallbackReply ?? "";

  if (!context || context.kind !== "exercise_intro") {
    return fallbackResponse(fallbackReply, "invalid_context");
  }

  const payload = buildCoachExerciseIntroPromptPayload(context);
  const rateLimit = checkAiRateLimit(request, "exercise_intro");

  if (!rateLimit.allowed) {
    return fallbackResponse(fallbackReply, "rate_limited", payload.maxCharacters);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(fallbackReply, "missing_api_key", payload.maxCharacters);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_INTRO_MODEL ?? "gpt-5-mini",
        instructions: payload.system,
        reasoning: { effort: "low" },
        text: { verbosity: "medium" },
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
        max_output_tokens: 1400,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI exercise-intro response failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });

      return fallbackResponse(fallbackReply, "api_error", payload.maxCharacters);
    }

    const data = await response.json();
    const aiText = extractOutputText(data);
    const fallbackText = sanitizeCoachReply(
      fallbackReply,
      fallbackReply,
      payload.maxCharacters
    );

    if (!aiText.trim()) {
      return NextResponse.json({
        mode: "fallback",
        reason: data?.status === "incomplete" ? "incomplete_empty_reply" : "empty_reply",
        text: fallbackText,
      });
    }

    const sanitizedText = sanitizeCoachReply(aiText, fallbackReply, payload.maxCharacters);
    const usedSanitizedFallback = sanitizedText === fallbackText;

    return NextResponse.json({
      mode: usedSanitizedFallback ? "fallback" : "ai",
      reason: usedSanitizedFallback ? "sanitized_reply" : undefined,
      text: sanitizedText,
    });
  } catch {
    return fallbackResponse(fallbackReply, "api_error", payload.maxCharacters);
  } finally {
    clearTimeout(timeoutId);
  }
}
