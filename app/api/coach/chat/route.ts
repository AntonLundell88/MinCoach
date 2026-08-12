import { NextResponse } from "next/server";
import {
  sanitizeCoachReply,
  type CoachChatAction,
  type CoachChatContext,
} from "../../../lib/coachAi";
import { buildCoachChatPromptPayload } from "../../../lib/coachPrompts";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";

type CoachChatRequest = {
  context?: CoachChatContext;
  fallbackReply?: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeChatAction(value: unknown): CoachChatAction | null {
  if (!value || typeof value !== "object") return null;

  const action = value as Record<string, unknown>;

  if (action.type === "replace_exercise") {
    const fromExerciseName = cleanText(action.fromExerciseName);
    const toExerciseName = cleanText(action.toExerciseName);
    if (!fromExerciseName || !toExerciseName) return null;

    return { type: "replace_exercise", fromExerciseName, toExerciseName };
  }

  if (action.type === "note_limitation") {
    const text = cleanText(action.text);
    if (!text) return null;

    return { type: "note_limitation", text };
  }

  return null;
}

function parseChatAiResponse(rawText: string): {
  text: string;
  action: CoachChatAction | null;
} {
  const compact = rawText.trim();
  if (!compact) return { text: "", action: null };

  const jsonText =
    compact.startsWith("{") && compact.endsWith("}")
      ? compact
      : compact.match(/\{[\s\S]*\}/)?.[0] ?? "";

  if (!jsonText) return { text: compact, action: null };

  try {
    const parsed = JSON.parse(jsonText) as { text?: unknown; action?: unknown };
    return {
      text: cleanText(parsed.text) || compact,
      action: normalizeChatAction(parsed.action),
    };
  } catch {
    return { text: compact, action: null };
  }
}

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

type TimingFields = {
  route: string;
  timestamp: string;
  promptBuildMs: number;
  openAiRequestMs: number;
  totalMs: number;
  promptSizeChars: number;
  errorType?: string;
  errorMessage?: string;
};

function logTiming(fields: TimingFields) {
  if (fields.errorType) {
    console.error("[MinCoach chat fallback]", JSON.stringify(fields));
  } else {
    console.log("[MinCoach chat timing]", JSON.stringify(fields));
  }
}

function fallbackResponse(
  fallbackReply: string,
  errorType: string,
  diag: { startMs: number; promptBuildMs: number; openAiRequestMs: number; promptSize: number } | null,
  maxCharacters?: number,
  errorMessage?: string
) {
  if (diag) {
    logTiming({
      route: "chat",
      timestamp: new Date().toISOString(),
      promptBuildMs: diag.promptBuildMs,
      openAiRequestMs: diag.openAiRequestMs,
      totalMs: Date.now() - diag.startMs,
      promptSizeChars: diag.promptSize,
      errorType,
      errorMessage: errorMessage?.slice(0, 200),
    });
  }

  return NextResponse.json({
    mode: "fallback",
    reason: errorType,
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

  const promptBuildStart = Date.now();
  const payload = buildCoachChatPromptPayload(context);
  const promptBody = JSON.stringify({
    context: payload.context,
    instruction: payload.instruction,
    maxCharacters: payload.maxCharacters,
  });
  const promptBuildMs = Date.now() - promptBuildStart;
  const promptSize = promptBody.length;

  const rateLimit = checkAiRateLimit(request, "chat");

  if (!rateLimit.allowed) {
    return fallbackResponse(
      fallbackReply,
      "rate_limited",
      { startMs, promptBuildMs, openAiRequestMs: 0, promptSize },
      payload.maxCharacters
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(
      fallbackReply,
      "missing_api_key",
      { startMs, promptBuildMs, openAiRequestMs: 0, promptSize },
      payload.maxCharacters
    );
  }

  // Netlify hard-kills the function at 30s (confirmed 2026-08-12) — must
  // fire well before that so a real fallback reply is returned instead.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  const apiCallStart = Date.now();

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
        reasoning: { effort: "high" },
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

    const openAiRequestMs = Date.now() - apiCallStart;
    const diag = { startMs, promptBuildMs, openAiRequestMs, promptSize };

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
      const errorType = data?.status === "incomplete" ? "incomplete_empty_reply" : "empty_reply";
      logTiming({
        route: "chat",
        timestamp: new Date().toISOString(),
        promptBuildMs,
        openAiRequestMs,
        totalMs: Date.now() - startMs,
        promptSizeChars: promptSize,
        errorType,
      });
      return NextResponse.json({
        mode: "fallback",
        reason: errorType,
        text: fallbackText,
      });
    }

    const parsed = parseChatAiResponse(aiText);
    const sanitizedText = sanitizeCoachReply(
      parsed.text,
      fallbackReply,
      payload.maxCharacters
    );
    const usedSanitizedFallback =
      Boolean(aiText.trim()) && sanitizedText === fallbackText;

    logTiming({
      route: "chat",
      timestamp: new Date().toISOString(),
      promptBuildMs,
      openAiRequestMs,
      totalMs: Date.now() - startMs,
      promptSizeChars: promptSize,
      errorType: usedSanitizedFallback ? "sanitized_reply" : undefined,
      errorMessage: usedSanitizedFallback ? aiText.slice(0, 100) : undefined,
    });

    return NextResponse.json({
      mode: usedSanitizedFallback ? "fallback" : "ai",
      reason: usedSanitizedFallback ? "sanitized_reply" : undefined,
      text: sanitizedText,
      action: usedSanitizedFallback ? null : parsed.action,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return fallbackResponse(
      fallbackReply,
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "network_error",
      { startMs, promptBuildMs, openAiRequestMs: Date.now() - apiCallStart, promptSize },
      payload.maxCharacters,
      message
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
