import { logAiUsage } from "@/app/lib/aiUsageLog";
import { NextResponse } from "next/server";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";
import { sanitizeCoachReply, type CoachProgramContext } from "../../../lib/coachAi";
import { buildCoachProgramPromptPayload } from "../../../lib/coachPrompts";
import { coachPromptInput, extractOutputText, requestErrorReason } from "../../../lib/openAi";

type CoachProgramRequest = {
  context?: CoachProgramContext;
  fallbackReply?: string;
};

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

  // Netlify hard-kills the function at 30s (confirmed 2026-08-12) — must
  // fire well before that so a real fallback reply is returned instead.
  // Reservvärdet ska vara samma modell som drift kör. Stod "gpt-5.5" här, och
  // försvann OPENAI_MODEL ur miljön bytte hela coachen röst utan att något
  // gick sönder eller syntes i loggen.
  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-terra";
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
        prompt_cache_key: "mincoach-program-question",
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
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI coach program failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });

      return fallbackResponse(
        fallbackReply,
        `api_error_${response.status}`,
        payload.maxCharacters
      );
    }

    const data = await response.json();

    logAiUsage({
      route: "program_question",
      model,
      data,
      startedAt: openAiStartedAt,
    });
    const aiText = extractOutputText(data).trim();

    if (!aiText) {
      return fallbackResponse(
        fallbackReply,
        data?.status === "incomplete" ? "incomplete_empty_reply" : "empty_reply",
        payload.maxCharacters
      );
    }

    const fallbackText = sanitizeCoachReply(
      fallbackReply,
      fallbackReply,
      payload.maxCharacters
    );
    const sanitizedText = sanitizeCoachReply(
      aiText,
      fallbackReply,
      payload.maxCharacters
    );
    const usedSanitizedFallback = sanitizedText === fallbackText;

    return NextResponse.json({
      mode: usedSanitizedFallback ? "fallback" : "ai",
      reason: usedSanitizedFallback ? "sanitized_reply" : undefined,
      text: sanitizedText,
    });
  } catch (error) {
    return fallbackResponse(fallbackReply, requestErrorReason(error), payload.maxCharacters);
  } finally {
    clearTimeout(timeoutId);
  }
}
