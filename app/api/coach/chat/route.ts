import { logAiUsage } from "@/app/lib/aiUsageLog";
import { NextResponse } from "next/server";
import {
  sanitizeCoachReply,
  type CoachChatAction,
  type CoachChatContext,
} from "../../../lib/coachAi";
import { buildCoachChatPromptPayload } from "../../../lib/coachPrompts";
import { CUSTOM_EXERCISE_CATEGORIES } from "../../../lib/exercises";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";
import { coachPromptInput, extractOutputText, requestErrorReason } from "../../../lib/openAi";

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

    // En kategori utanför listan tappas, men bytet står kvar. Utan kategori
    // gör appen som innan fältet fanns: frågar när namnet är okänt.
    const category = CUSTOM_EXERCISE_CATEGORIES.find(
      (value) => value === cleanText(action.category).toLowerCase()
    );

    return { type: "replace_exercise", fromExerciseName, toExerciseName, category };
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
  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const prompt = coachPromptInput({
    model,
    instruction: payload.instruction,
    maxCharacters: payload.maxCharacters,
    context: payload.context,
  });
  const promptBuildMs = Date.now() - promptBuildStart;
  const promptSize = prompt.size;

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
  const openAiStartedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  // Släpper klienten anropet ska OpenAI-anropet dö med det. Utan den här
  // raden lever förfrågan vidare på servern och faktureras fullt ut — och
  // intro-effekten avbryter sitt pågående anrop varje gång den kör om.
  request.signal.addEventListener("abort", () => controller.abort());

  const apiCallStart = Date.now();

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
        prompt_cache_key: "mincoach-chat",
        reasoning: { effort: "high" },
        text: { verbosity: "medium" },
        ...prompt.body,
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

    logAiUsage({
      route: "chat",
      model,
      data,
      startedAt: openAiStartedAt,
    });
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

    logTiming({
      route: "chat",
      timestamp: new Date().toISOString(),
      promptBuildMs,
      openAiRequestMs,
      totalMs: Date.now() - startMs,
      promptSizeChars: promptSize,
    });

    // Se samma kommentar i set-rutten: jämförelsen med reservtexten kunde bara
    // slå till när saneringen kastade svar, och det gör den inte längre.
    // parseChatAiResponse faller dessutom tillbaka på den råa texten, så
    // parsed.text är aldrig tom här.
    return NextResponse.json({
      mode: "ai",
      text: sanitizeCoachReply(parsed.text, fallbackReply, payload.maxCharacters),
      action: parsed.action,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return fallbackResponse(
      fallbackReply,
      requestErrorReason(error),
      { startMs, promptBuildMs, openAiRequestMs: Date.now() - apiCallStart, promptSize },
      payload.maxCharacters,
      message
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
