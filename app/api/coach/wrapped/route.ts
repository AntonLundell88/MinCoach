import { logAiUsage } from "@/app/lib/aiUsageLog";
import { NextResponse } from "next/server";
import {
  sanitizeCoachReply,
  type CoachWrappedContext,
  type CoachWrappedResult,
} from "../../../lib/coachAi";
import {
  buildCoachWrappedPromptPayload,
  WRAPPED_CAPTIONS_JSON_SCHEMA,
} from "../../../lib/coachPrompts";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

type CoachWrappedRequest = {
  month?: string;
  context?: CoachWrappedContext;
  stats?: unknown;
  fallbackCaptions?: CoachWrappedResult;
};

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;
const MAX_ACTIVITY_PB_CAPTION_CHARACTERS = 100;
const MAX_REFLECTION_CAPTION_CHARACTERS = 160;

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return "";

  const response = data as { output_text?: unknown; output?: unknown };

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

function fallbackResponse(fallbackCaptions: CoachWrappedResult | undefined, reason: string) {
  return NextResponse.json({
    mode: "fallback",
    reason,
    captions: fallbackCaptions ?? null,
  });
}

export async function POST(request: Request) {
  let body: CoachWrappedRequest;

  try {
    body = (await request.json()) as CoachWrappedRequest;
  } catch {
    return fallbackResponse(undefined, "invalid_json");
  }

  const { month, context, stats, fallbackCaptions } = body;

  if (
    !context ||
    context.kind !== "wrapped_recap" ||
    !month ||
    !MONTH_KEY_PATTERN.test(month) ||
    !stats ||
    !fallbackCaptions
  ) {
    return fallbackResponse(fallbackCaptions, "invalid_context");
  }

  const rateLimit = checkAiRateLimit(request, "wrapped");

  if (!rateLimit.allowed) {
    return fallbackResponse(fallbackCaptions, "rate_limited");
  }

  let userId: string | null = null;
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return fallbackResponse(fallbackCaptions, "not_authenticated");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(fallbackCaptions, "missing_api_key");
  }

  const payload = buildCoachWrappedPromptPayload(context);
  // Netlify hard-kills the function at 30s (confirmed 2026-08-12) — must
  // fire well before that so a real fallback reply is returned instead.
  const openAiStartedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  // Släpper klienten anropet ska OpenAI-anropet dö med det. Utan den här
  // raden lever förfrågan vidare på servern och faktureras fullt ut — och
  // intro-effekten avbryter sitt pågående anrop varje gång den kör om.
  request.signal.addEventListener("abort", () => controller.abort());

  let mode: "ai" | "fallback" = "fallback";
  let activityCaption = fallbackCaptions.activityCaption;
  let pbCaption = fallbackCaptions.pbCaption;
  let reflectionCaption = fallbackCaptions.reflectionCaption;

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
        // Stabil nyckel per coachröst: routar identiska prefix till samma cache.
        // Instruktion + systemprompt är oföränderliga per rutt, så allt utom
        // kontexten längst bak kan återanvändas mellan anrop.
        prompt_cache_key: "mincoach-wrapped",
        reasoning: { effort: "medium" },
        text: {
          verbosity: "medium",
          format: {
            type: "json_schema",
            name: "mincoach_wrapped_captions",
            schema: WRAPPED_CAPTIONS_JSON_SCHEMA,
            strict: true,
          },
        },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  // Instruktionen först, kontexten sist. Prompt-cache träffar bara på stabila
                  // PREFIX — med den varierande kontexten först cachas ingenting alls.
                  instruction: payload.instruction,
                  maxCharacters: payload.maxCharacters,
                  context: payload.context,
                }),
              },
            ],
          },
        ],
        max_output_tokens: 1200,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI wrapped response failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });
      return fallbackResponse(fallbackCaptions, "api_error");
    }

    const data = await response.json();

    logAiUsage({
      route: "wrapped",
      model: process.env.OPENAI_MODEL ?? "gpt-5.5",
      data,
      startedAt: openAiStartedAt,
    });
    const aiText = extractOutputText(data).trim();

    if (!aiText) {
      return fallbackResponse(
        fallbackCaptions,
        data?.status === "incomplete" ? "incomplete_empty_reply" : "empty_reply"
      );
    }

    let parsed: {
      activityCaption?: unknown;
      pbCaption?: unknown;
      reflectionCaption?: unknown;
    };

    try {
      parsed = JSON.parse(aiText);
    } catch {
      return fallbackResponse(fallbackCaptions, "invalid_json_reply");
    }

    // Varje fält saneras individuellt — ett trasigt/osäkert fält ska inte
    // tömma de andra två. OpenAIs strict:true garanterar INTE maxLength på
    // strängar, så teckengränsen verkställs här, inte antas från schemat.
    activityCaption = sanitizeCoachReply(
      typeof parsed.activityCaption === "string" ? parsed.activityCaption : "",
      fallbackCaptions.activityCaption,
      MAX_ACTIVITY_PB_CAPTION_CHARACTERS
    );
    pbCaption = sanitizeCoachReply(
      typeof parsed.pbCaption === "string" ? parsed.pbCaption : "",
      fallbackCaptions.pbCaption,
      MAX_ACTIVITY_PB_CAPTION_CHARACTERS
    );
    reflectionCaption = sanitizeCoachReply(
      typeof parsed.reflectionCaption === "string" ? parsed.reflectionCaption : "",
      fallbackCaptions.reflectionCaption,
      MAX_REFLECTION_CAPTION_CHARACTERS
    );
    mode = "ai";
  } catch {
    return fallbackResponse(fallbackCaptions, "api_error");
  } finally {
    clearTimeout(timeoutId);
  }

  // Race-hantering: appen har flerenhets-sync, så en samtidig dubbel-insert
  // för samma (user_id, month) är realistiskt — inte bara ett teoretiskt
  // hörnfall.
  const { error: insertError } = await supabase.from("wrapped_snapshots").insert({
    user_id: userId,
    month,
    stats,
    activity_caption: activityCaption,
    pb_caption: pbCaption,
    reflection_caption: reflectionCaption,
    caption_mode: mode,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing } = await supabase
        .from("wrapped_snapshots")
        .select("activity_caption, pb_caption, reflection_caption, caption_mode")
        .eq("user_id", userId)
        .eq("month", month)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          mode: existing.caption_mode === "ai" ? "ai" : "fallback",
          captions: {
            activityCaption: existing.activity_caption,
            pbCaption: existing.pb_caption,
            reflectionCaption: existing.reflection_caption,
          },
        });
      }
    } else {
      // Sparfel kraschar aldrig svaret — samma resiliens som set-video.
      console.error("Failed to store wrapped snapshot", insertError);
    }
  }

  return NextResponse.json({
    mode,
    captions: { activityCaption, pbCaption, reflectionCaption },
  });
}
