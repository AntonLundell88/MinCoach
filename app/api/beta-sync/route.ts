import { NextResponse } from "next/server";
import {
  isSupabaseConfigured,
  upsertBetaDeviceSnapshot,
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
    const snapshot = body.snapshot;

    if (
      typeof deviceId !== "string" ||
      deviceId.length < 12 ||
      deviceId.length > 120 ||
      !isRecord(snapshot)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid snapshot" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, mode: "disabled" });
    }

    const result = await upsertBetaDeviceSnapshot({
      deviceId,
      snapshot,
      appVersion:
        typeof body.appVersion === "string"
          ? body.appVersion
          : "beta-localstorage-v1",
    });

    return NextResponse.json({ ok: true, mode: result.mode });
  } catch (error) {
    console.error("Beta sync failed", error);
    return NextResponse.json({ ok: false, mode: "error" }, { status: 500 });
  }
}
