import { NextResponse } from "next/server";
import {
  isSupabaseConfigured,
  replaceCoachMemories,
  upsertPersonalRecord,
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

    if (kind === "personal-record") {
      const record = body.record;

      if (
        !isRecord(record) ||
        typeof record.exerciseKey !== "string" ||
        typeof record.exerciseName !== "string" ||
        typeof record.weight !== "number" ||
        typeof record.reps !== "number"
      ) {
        return NextResponse.json(
          { ok: false, error: "Invalid personal record" },
          { status: 400 }
        );
      }

      const result = await upsertPersonalRecord({
        deviceId,
        record: {
          exerciseKey: record.exerciseKey,
          exerciseName: record.exerciseName,
          weight: record.weight,
          reps: record.reps,
          durationSeconds:
            typeof record.durationSeconds === "number"
              ? record.durationSeconds
              : null,
          metricType: record.metricType === "time" ? "time" : "reps",
          rir: typeof record.rir === "number" ? record.rir : null,
          achievedAt:
            typeof record.achievedAt === "string" ? record.achievedAt : undefined,
        },
      });

      return NextResponse.json({ ok: true, mode: result.mode });
    }

    if (kind === "coach-memory") {
      const notes = Array.isArray(body.notes) ? body.notes : [];
      const cleanNotes = notes
        .filter(isRecord)
        .map((note) => ({
          createdAt:
            typeof note.createdAt === "string"
              ? note.createdAt
              : new Date().toISOString(),
          pass: typeof note.pass === "string" ? note.pass : undefined,
          gym: typeof note.gym === "string" ? note.gym : undefined,
          exerciseName:
            typeof note.exerciseName === "string" ? note.exerciseName : undefined,
          text: typeof note.text === "string" ? note.text : "",
        }))
        .filter((note) => note.text.trim().length > 0);

      const result = await replaceCoachMemories({ deviceId, notes: cleanNotes });

      return NextResponse.json({ ok: true, mode: result.mode });
    }

    return NextResponse.json({ ok: false, error: "Invalid sync kind" }, { status: 400 });
  } catch (error) {
    console.error("Beta memory sync failed", error);
    return NextResponse.json(
      {
        ok: false,
        mode: "error",
        message:
          error instanceof Error ? error.message : "Unknown beta memory sync error",
      },
      { status: 500 }
    );
  }
}
