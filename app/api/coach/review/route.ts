import { logAiUsage } from "@/app/lib/aiUsageLog";
import { NextResponse } from "next/server";
import {
  sanitizeCoachReply,
  type CoachWorkoutReviewContext,
  type CoachWorkoutReviewResult,
} from "../../../lib/coachAi";
import { buildCoachWorkoutReviewPromptPayload } from "../../../lib/coachPrompts";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";
import { coachPromptInput, extractOutputText } from "../../../lib/openAi";

type CoachReviewRequest = {
  context?: CoachWorkoutReviewContext;
  fallbackReview?: CoachWorkoutReviewResult;
};

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

  // Was 35000 — above Netlify's confirmed 30s hard kill, so this timeout
  // could never actually fire before the platform killed the function first.
  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const openAiStartedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  // Släpper klienten anropet ska OpenAI-anropet dö med det. Utan den här
  // raden lever förfrågan vidare på servern och faktureras fullt ut — och
  // intro-effekten avbryter sitt pågående anrop varje gång den kör om.
  request.signal.addEventListener("abort", () => controller.abort());

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: payload.system,
        // Stabil nyckel per coachröst: routar identiska prefix till samma cache.
        // Instruktion + systemprompt är oföränderliga per rutt, så allt utom
        // kontexten längst bak kan återanvändas mellan anrop.
        prompt_cache_key: "mincoach-review",
        reasoning: { effort: "medium" },
        text: { verbosity: "medium" },
        ...coachPromptInput({
          model,
          instruction: payload.instruction,
          maxCharacters: payload.maxCharacters,
          context: payload.context,
        }).body,
        max_output_tokens: 1800,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackResponse(fallbackReview, `api_error_${response.status}`);
    }

    const data = await response.json();

    logAiUsage({
      route: "review",
      model,
      data,
      startedAt: openAiStartedAt,
    });
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
