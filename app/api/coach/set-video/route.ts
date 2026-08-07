import { NextResponse } from "next/server";
import {
  buildCoachSetVideoPromptPayload,
  composeSetVideoCoachText,
  sanitizeCoachReply,
  SET_VIDEO_FEEDBACK_JSON_SCHEMA,
  type CoachSetVideoContext,
} from "../../../lib/coachAi";
import { checkAiRateLimit } from "../../../lib/aiRateLimit";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

type CoachSetVideoRequest = {
  context?: CoachSetVideoContext;
  frames?: string[];
  fallbackReply?: string;
};

const MAX_FRAMES = 6;
const MAX_FRAME_LENGTH = 300_000;

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

function fallbackResponse(fallbackReply: string, reason: string) {
  return NextResponse.json({
    mode: "fallback",
    reason,
    text: sanitizeCoachReply(fallbackReply, fallbackReply),
    needsNewAngle: false,
  });
}

function isValidFrame(frame: unknown): frame is string {
  return (
    typeof frame === "string" &&
    frame.length > 0 &&
    frame.length <= MAX_FRAME_LENGTH &&
    frame.startsWith("data:image/")
  );
}

export async function POST(request: Request) {
  let body: CoachSetVideoRequest;

  try {
    body = (await request.json()) as CoachSetVideoRequest;
  } catch {
    return fallbackResponse("", "invalid_json");
  }

  const context = body.context;
  const fallbackReply = body.fallbackReply ?? "";
  const frames = Array.isArray(body.frames) ? body.frames : [];

  if (!context || context.kind !== "set_video_feedback") {
    return fallbackResponse(fallbackReply, "invalid_context");
  }

  if (frames.length === 0 || frames.length > MAX_FRAMES || !frames.every(isValidFrame)) {
    return fallbackResponse(fallbackReply, "invalid_frames");
  }

  const rateLimit = checkAiRateLimit(request, "set_video");

  if (!rateLimit.allowed) {
    return fallbackResponse(fallbackReply, "rate_limited");
  }

  let userId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return fallbackResponse(fallbackReply, "not_authenticated");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackResponse(fallbackReply, "missing_api_key");
  }

  const payload = buildCoachSetVideoPromptPayload(context);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

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
        text: {
          verbosity: "medium",
          format: {
            type: "json_schema",
            name: "mincoach_set_video_feedback",
            schema: SET_VIDEO_FEEDBACK_JSON_SCHEMA,
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
                  context: payload.context,
                  instruction: payload.instruction,
                  maxCharacters: payload.maxCharacters,
                }),
              },
              ...frames.map((frame) => ({
                type: "input_image" as const,
                image_url: frame,
              })),
            ],
          },
        ],
        max_output_tokens: 1200,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI set-video response failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });
      return fallbackResponse(fallbackReply, "api_error");
    }

    const data = await response.json();
    const aiText = extractOutputText(data);

    if (!aiText.trim()) {
      return fallbackResponse(fallbackReply, "empty_reply");
    }

    let parsed: {
      visibility?: "clear" | "partial" | "unclear";
      visibilityReason?: string;
      whatLooksGood?: string;
      mainAdjustment?: string;
      needsNewAngle?: boolean;
    };

    try {
      parsed = JSON.parse(aiText);
    } catch {
      return fallbackResponse(fallbackReply, "invalid_json_reply");
    }

    const visibility = parsed.visibility ?? "unclear";
    const visibilityReason = parsed.visibilityReason ?? "";
    const whatLooksGood = parsed.whatLooksGood ?? "";
    const mainAdjustment = parsed.mainAdjustment ?? "";
    const needsNewAngle = parsed.needsNewAngle ?? false;

    const composedText = composeSetVideoCoachText({
      visibility,
      visibilityReason,
      whatLooksGood,
      mainAdjustment,
    });
    const sanitizedText = sanitizeCoachReply(composedText, fallbackReply);

    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from("set_video_feedback").insert({
        user_id: userId,
        exercise_name: context.exerciseName,
        visibility,
        visibility_reason: visibilityReason,
        what_looks_good: whatLooksGood,
        main_adjustment: mainAdjustment,
        needs_new_angle: needsNewAngle,
        coach_text: sanitizedText,
      });
    } catch (dbError) {
      console.error("Failed to store set video feedback", dbError);
    }

    return NextResponse.json({
      mode: "ai",
      text: sanitizedText,
      needsNewAngle,
    });
  } catch {
    return fallbackResponse(fallbackReply, "api_error");
  } finally {
    clearTimeout(timeoutId);
  }
}
