import { NextResponse } from "next/server";
import {
  buildCoachChatPromptPayload,
  sanitizeCoachReply,
  type CoachChatContext,
} from "../../../lib/coachAi";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";

type CoachChatRequest = {
  context?: CoachChatContext;
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

type DiagFields = {
  route: string;
  timestamp: string;
  durationMs: number;
  errorType: string;
  errorMessage?: string;
  model: string;
  effort: string;
  verbosity: string;
  promptSizeChars: number;
};

function logFallback(fields: DiagFields) {
  console.error("[MinCoach chat fallback]", JSON.stringify(fields));
}

function fallbackResponse(
  fallbackReply: string,
  reason: string,
  diag: { startMs: number; promptSize: number } | null,
  maxCharacters?: number,
  errorMessage?: string
) {
  if (diag) {
    logFallback({
      route: "chat",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - diag.startMs,
      errorType: reason,
      errorMessage: errorMessage?.slice(0, 200),
      model: process.env.OPENAI_MODEL ?? "gpt-5.5",
      effort: "medium",
      verbosity: "medium",
      promptSizeChars: diag.promptSize,
    });
  }

  return NextResponse.json({
    mode: "fallback",
    reason,
    text: sanitizeCoachReply(fallbackReply, fallbackReply, maxCharacters),
  });
}

export async function POST(request: Request) {
  const startMs = Date.now();
  let body: CoachChatRequest;

  try {
    body = (await request.json()) as CoachChatRequest;
  } catch {
    return fallbackResponse("", "invalid_json", null);
  }

  const context = body.context;
  const fallbackReply = body.fallbackReply ?? "";

  if (!context || context.kind !== "workout_chat") {
    return fallbackResponse(fallbackReply, "invalid_context", null);
  }

  const payload = buildCoachChatPromptPayload(context);
  const promptBody = JSON.stringify({
    context: payload.context,
    instruction: payload.instruction,
    maxCharacters: payload.maxCharacters,
  });
  const promptSize = promptBody.length;
  const diag = { startMs, promptSize };

  const rateLimit = checkAiRateLimit(request, "chat");

  if (!rateLimit.allowed) {
    return fallbackResponse(
      fallbackReply,
      "rate_limited",
      diag,
      payload.maxCharacters
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(
      fallbackReply,
      "missing_api_key",
      diag,
      payload.maxCharacters
    );
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
        model: process.env.OPENAI_MODEL ?? "gpt-5.5",
        instructions: payload.system,
        reasoning: { effort: "medium" },
        text: { verbosity: "medium" },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: promptBody,
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
      return fallbackResponse(
        fallbackReply,
        `api_error_${response.status}`,
        diag,
        payload.maxCharacters,
        errorText
      );
    }

    const data = await response.json();
    const aiText = extractOutputText(data);
    const fallbackText = sanitizeCoachReply(
      fallbackReply,
      fallbackReply,
      payload.maxCharacters
    );

    if (!aiText.trim()) {
      logFallback({
        route: "chat",
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        errorType: data?.status === "incomplete" ? "incomplete_empty_reply" : "empty_reply",
        model: process.env.OPENAI_MODEL ?? "gpt-5.5",
        effort: "medium",
        verbosity: "medium",
        promptSizeChars: promptSize,
      });
      return NextResponse.json({
        mode: "fallback",
        reason: data?.status === "incomplete" ? "incomplete_empty_reply" : "empty_reply",
        text: fallbackText,
      });
    }

    const sanitizedText = sanitizeCoachReply(
      aiText,
      fallbackReply,
      payload.maxCharacters
    );
    const usedSanitizedFallback =
      Boolean(aiText.trim()) && sanitizedText === fallbackText;

    if (usedSanitizedFallback) {
      logFallback({
        route: "chat",
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        errorType: "sanitized_reply",
        errorMessage: aiText.slice(0, 100),
        model: process.env.OPENAI_MODEL ?? "gpt-5.5",
        effort: "medium",
        verbosity: "medium",
        promptSizeChars: promptSize,
      });
    }

    return NextResponse.json({
      mode: usedSanitizedFallback ? "fallback" : "ai",
      reason: usedSanitizedFallback ? "sanitized_reply" : undefined,
      text: sanitizedText,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return fallbackResponse(
      fallbackReply,
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "network_error",
      diag,
      payload.maxCharacters,
      message
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
