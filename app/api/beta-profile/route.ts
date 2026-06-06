import { NextResponse } from "next/server";
import {
  insertStructuredProgram,
  isSupabaseConfigured,
  upsertStructuredProfile,
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
    const kind = body.kind;

    if (typeof deviceId !== "string" || deviceId.length < 12 || deviceId.length > 120) {
      return NextResponse.json({ ok: false, error: "Invalid device" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, mode: "disabled" });
    }

    if (kind === "profile") {
      if (!isRecord(body.profile)) {
        return NextResponse.json({ ok: false, error: "Invalid profile" }, { status: 400 });
      }

      const result = await upsertStructuredProfile({
        deviceId,
        profile: body.profile,
      });

      return NextResponse.json({ ok: true, mode: result.mode });
    }

    if (kind === "program") {
      if (!isRecord(body.profile) || !isRecord(body.plan)) {
        return NextResponse.json({ ok: false, error: "Invalid program" }, { status: 400 });
      }

      await upsertStructuredProfile({
        deviceId,
        profile: body.profile,
      });

      const result = await insertStructuredProgram({
        deviceId,
        profile: body.profile,
        plan: body.plan,
        source: typeof body.source === "string" ? body.source : "ai",
      });

      return NextResponse.json({
        ok: true,
        mode: result.mode,
        programId: result.programId,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid sync kind" }, { status: 400 });
  } catch (error) {
    console.error("Beta profile sync failed", error);
    return NextResponse.json(
      {
        ok: false,
        mode: "error",
        message:
          error instanceof Error ? error.message : "Unknown beta profile sync error",
      },
      { status: 500 }
    );
  }
}
