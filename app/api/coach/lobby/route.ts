import { logAiUsage } from "@/app/lib/aiUsageLog";
import { NextResponse } from "next/server";
import {
  MAX_LOBBY_NOTE_CHARACTERS,
  sanitizeCoachReply,
  type CoachLobbyContext,
} from "../../../lib/coachAi";
import { buildCoachLobbyPromptPayload } from "../../../lib/coachPrompts";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";
import { coachPromptInput, extractOutputText } from "../../../lib/openAi";

type CoachLobbyRequest = {
  context?: CoachLobbyContext;
};

function fallbackResponse(reason: string) {
  return NextResponse.json({
    mode: "fallback",
    reason,
    text: null,
  });
}

export async function POST(request: Request) {
  let body: CoachLobbyRequest;

  try {
    body = (await request.json()) as CoachLobbyRequest;
  } catch {
    return fallbackResponse("invalid_json");
  }

  const context = body.context;

  if (!context || context.kind !== "lobby_note") {
    return fallbackResponse("invalid_context");
  }

  const rateLimit = checkAiRateLimit(request, "lobby");

  if (!rateLimit.allowed) {
    return fallbackResponse("rate_limited");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse("missing_api_key");
  }

  const payload = buildCoachLobbyPromptPayload(context);
  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const openAiStartedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
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
        prompt_cache_key: "mincoach-lobby",
        // Låg effort: en kort rad som ska komma snabbt när appen öppnas.
        // Medium testades 2026-09-15: modellen resonerade i 5 av 18 anrop,
        // och texterna blev inte annorlunda.
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
        ...coachPromptInput({
          model,
          instruction: payload.instruction,
          maxCharacters: payload.maxCharacters,
          context: payload.context,
        }).body,
        max_output_tokens: 800,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackResponse(`api_error_${response.status}`);
    }

    const data = await response.json();

    logAiUsage({
      route: "lobby",
      model,
      data,
      startedAt: openAiStartedAt,
    });

    // Lite marginal över instruktionens gräns: hellre en hel mening än en
    // avhuggen.
    const text = sanitizeCoachReply(
      extractOutputText(data),
      "",
      MAX_LOBBY_NOTE_CHARACTERS + 40
    );

    if (!text) {
      return fallbackResponse("empty_ai_note");
    }

    return NextResponse.json({
      mode: "ai",
      text,
    });
  } catch {
    return fallbackResponse("api_error");
  } finally {
    clearTimeout(timeoutId);
  }
}
