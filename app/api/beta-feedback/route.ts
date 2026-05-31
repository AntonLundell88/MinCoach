import { NextResponse } from "next/server";
import {
  insertBetaFeedback,
  isSupabaseConfigured,
} from "@/app/lib/supabaseRest";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const deviceId = body.deviceId;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const metadata = isRecord(body.metadata) ? body.metadata : {};

    if (
      typeof deviceId !== "string" ||
      deviceId.length < 12 ||
      deviceId.length > 120 ||
      message.length < 1 ||
      message.length > 4000
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid feedback" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, mode: "disabled" });
    }

    const result = await insertBetaFeedback({ deviceId, message, metadata });

    return NextResponse.json({ ok: true, mode: result.mode });
  } catch (error) {
    console.error("Beta feedback failed", error);
    return NextResponse.json(
      {
        ok: false,
        mode: "error",
        message:
          error instanceof Error ? error.message : "Unknown beta feedback error",
      },
      { status: 500 }
    );
  }
}
