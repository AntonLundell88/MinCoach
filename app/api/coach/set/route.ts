import { logAiUsage } from "@/app/lib/aiUsageLog";
import { NextResponse } from "next/server";
import {
  sanitizeCoachReply,
  sanitizeCoachSetFallback,
  sanitizeCoachSetReply,
  type CoachSetContext,
} from "../../../lib/coachAi";
import { buildCoachPromptPayload } from "../../../lib/coachPrompts";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";
import { coachPromptInput, extractOutputText, requestErrorReason } from "../../../lib/openAi";

type CoachSetRequest = {
  context?: CoachSetContext;
  fallbackReply?: string;
};

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

  // Netlify hard-kills the function at 30s (confirmed 2026-08-12) — must
  // fire well before that so a real fallback reply is returned instead.
  // Instruktionen först, kontexten sist, med en cachegräns emellan. Se
  // coachPromptInput i openAi.ts.
  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const prompt = coachPromptInput({
    model,
    instruction: payload.instruction,
    maxCharacters: payload.maxCharacters,
    context: payload.context,
  });
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
        prompt_cache_key: "mincoach-set",
        reasoning: { effort: "medium" },
        text: { verbosity: "medium" },
        ...prompt.body,
        max_output_tokens: 2200,
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
        `api_error_${response.status}`,
        payload.maxCharacters,
        context
      );
    }

    const data = await response.json();

    logAiUsage({
      route: "set",
      model,
      data,
      startedAt: openAiStartedAt,
    });
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

    // Här jämfördes svaret med reservtexten för att se om saneringen kastat
    // det. Det kunde den när containsUnsafeCoachPhrase fanns. I dag rör
    // saneringen bara blanksteg, dubbletter och längd, så jämförelsen blev
    // aldrig sann — "sanitized_reply" kunde inte längre rapporteras.
    return NextResponse.json({
      mode: "ai",
      text: sanitizeCoachSetReply(context, aiText, fallbackReply, payload.maxCharacters),
    });
  } catch (error) {
    return fallbackResponse(
      fallbackReply,
      requestErrorReason(error),
      payload.maxCharacters,
      context
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
