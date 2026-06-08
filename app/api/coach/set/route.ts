import { NextResponse } from "next/server";
import {
  buildCoachPromptPayload,
  sanitizeCoachReply,
  sanitizeCoachSetFallback,
  sanitizeCoachSetReply,
  type CoachSetContext,
} from "../../../lib/coachAi";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";

type CoachSetRequest = {
  context?: CoachSetContext;
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
  maxCharacters?: number,
  context?: CoachSetContext
) {
  return NextResponse.json({
    mode: "fallback",
    reason,
    text: context
      ? sanitizeCoachSetFallback(context, fallbackReply, maxCharacters)
      : sanitizeCoachReply(fallbackReply, fallbackReply, maxCharacters),
  });
}

export async function POST(request: Request) {
  let body: CoachSetRequest;

  try {
    body = (await request.json()) as CoachSetRequest;
  } catch {
    return fallbackResponse("", "invalid_json");
  }

  const context = body.context;
  const fallbackReply = body.fallbackReply ?? "";

  if (!context || context.kind !== "set_feedback") {
    return fallbackResponse(fallbackReply, "invalid_context");
  }

  const payload = buildCoachPromptPayload(context);
  const rateLimit = checkAiRateLimit(request, "set");

  if (!rateLimit.allowed) {
    return fallbackResponse(
      fallbackReply,
      "rate_limited",
      payload.maxCharacters,
      context
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(
      fallbackReply,
      "missing_api_key",
      payload.maxCharacters,
      context
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 22000);

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
        max_output_tokens: 1600,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI coach response failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });

      return fallbackResponse(
        fallbackReply,
        "api_error",
        payload.maxCharacters,
        context
      );
    }

    const data = await response.json();
    const aiText = extractOutputText(data);
    const fallbackText = sanitizeCoachSetFallback(
      context,
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

    return NextResponse.json({
      mode: "ai",
      text: sanitizeCoachSetReply(
        context,
        aiText,
        fallbackReply,
        payload.maxCharacters
      ),
    });
  } catch {
    return fallbackResponse(
      fallbackReply,
      "api_error",
      payload.maxCharacters,
      context
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
