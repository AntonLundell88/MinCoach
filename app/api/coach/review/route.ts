import { NextResponse } from "next/server";
import {
  buildCoachWorkoutReviewPromptPayload,
  sanitizeCoachReply,
  type CoachWorkoutReviewContext,
  type CoachWorkoutReviewResult,
} from "../../../lib/coachAi";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";

type CoachReviewRequest = {
  context?: CoachWorkoutReviewContext;
  fallbackReview?: CoachWorkoutReviewResult;
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

function cleanText(value: unknown, fallback: string, maxCharacters = 260) {
  if (typeof value !== "string") return fallback;
  return sanitizeCoachReply(value, fallback, maxCharacters);
}

function cleanList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;

  const cleaned = value
    .map((item, index) => cleanText(item, fallback[index] ?? "", 240))
    .filter(Boolean)
    .slice(0, 3);

  return cleaned.length > 0 ? cleaned : fallback;
}

function parseReview(
  rawText: string,
  fallbackReview: CoachWorkoutReviewResult
): CoachWorkoutReviewResult | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const jsonText =
    trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? trimmed;

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    return {
      coachHeadline: cleanText(
        parsed.coachHeadline,
        fallbackReview.coachHeadline,
        160
      ),
      coachSummary: cleanText(
        parsed.coachSummary,
        fallbackReview.coachSummary,
        420
      ),
      positives: cleanList(parsed.positives, fallbackReview.positives),
      adjustments: cleanList(parsed.adjustments, fallbackReview.adjustments),
      nextFocus: cleanList(parsed.nextFocus, fallbackReview.nextFocus),
      coachMemoryTakeaway: cleanList(
        parsed.coachMemoryTakeaway,
        fallbackReview.coachMemoryTakeaway
      ),
    };
  } catch {
    return null;
  }
}

function fallbackResponse(
  fallbackReview: CoachWorkoutReviewResult | undefined,
  reason: string
) {
  return NextResponse.json({
    mode: "fallback",
    reason,
    review: fallbackReview ?? null,
  });
}

export async function POST(request: Request) {
  let body: CoachReviewRequest;

  try {
    body = (await request.json()) as CoachReviewRequest;
  } catch {
    return fallbackResponse(undefined, "invalid_json");
  }

  const context = body.context;
  const fallbackReview = body.fallbackReview;

  if (!context || context.kind !== "workout_review" || !fallbackReview) {
    return fallbackResponse(fallbackReview, "invalid_context");
  }

  const payload = buildCoachWorkoutReviewPromptPayload(context);
  const rateLimit = checkAiRateLimit(request, "chat");

  if (!rateLimit.allowed) {
    return fallbackResponse(fallbackReview, "rate_limited");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(fallbackReview, "missing_api_key");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 26000);

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
        reasoning: { effort: "minimal" },
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
                  maxCharacters: payload.maxCharacters,
                }),
              },
            ],
          },
        ],
        max_output_tokens: 1800,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackResponse(fallbackReview, `api_error_${response.status}`);
    }

    const data = await response.json();
    const review = parseReview(extractOutputText(data), fallbackReview);

    if (!review) {
      return fallbackResponse(fallbackReview, "invalid_ai_review");
    }

    return NextResponse.json({
      mode: "ai",
      review,
    });
  } catch {
    return fallbackResponse(fallbackReview, "api_error");
  } finally {
    clearTimeout(timeoutId);
  }
}
