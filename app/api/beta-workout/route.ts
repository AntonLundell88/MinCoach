import { NextResponse } from "next/server";
import {
  insertStructuredWorkout,
  isSupabaseConfigured,
} from "@/app/lib/supabaseRest";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isWorkoutSet(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.exerciseName === "string";
}

function isReasonableWorkoutSet(set: Record<string, unknown>) {
  const weight = typeof set.weight === "number" ? set.weight : 0;
  const reps = typeof set.reps === "number" ? set.reps : 0;
  const durationSeconds =
    typeof set.durationSeconds === "number" ? set.durationSeconds : null;

  return (
    Number.isFinite(weight) &&
    weight >= 0 &&
    weight <= 1000 &&
    Number.isFinite(reps) &&
    reps >= 0 &&
    reps <= 200 &&
    (durationSeconds === null ||
      (Number.isFinite(durationSeconds) &&
        durationSeconds >= 0 &&
        durationSeconds <= 7200))
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const deviceId = body.deviceId;
    const workout = body.workout;

    if (
      typeof deviceId !== "string" ||
      deviceId.length < 12 ||
      deviceId.length > 120 ||
      !isRecord(workout) ||
      typeof workout.id !== "string" ||
      !Array.isArray(workout.sets) ||
      !workout.sets.every(isWorkoutSet) ||
      !workout.sets.every(isReasonableWorkoutSet)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid workout" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, mode: "disabled" });
    }

    const result = await insertStructuredWorkout({
      deviceId,
      workout: {
        id: workout.id,
        passKey: typeof workout.passKey === "string" ? workout.passKey : null,
        passName: typeof workout.passName === "string" ? workout.passName : null,
        status: typeof workout.status === "string" ? workout.status : "completed",
        startedAt:
          typeof workout.startedAt === "string" ? workout.startedAt : null,
        completedAt:
          typeof workout.completedAt === "string" ? workout.completedAt : null,
        warmupNote:
          typeof workout.warmupNote === "string" ? workout.warmupNote : null,
        conditioningNote:
          typeof workout.conditioningNote === "string"
            ? workout.conditioningNote
            : null,
        review: isRecord(workout.review) ? workout.review : {},
        summary: isRecord(workout.summary) ? workout.summary : {},
        events: Array.isArray(workout.events) ? workout.events : [],
        sets: workout.sets.map((set) => ({
          exerciseName:
            typeof set.exerciseName === "string" ? set.exerciseName : "",
          exerciseKey: typeof set.exerciseKey === "string" ? set.exerciseKey : "",
          setIndex: typeof set.setIndex === "number" ? set.setIndex : 0,
          weight: typeof set.weight === "number" ? set.weight : 0,
          reps: typeof set.reps === "number" ? set.reps : 0,
          durationSeconds:
            typeof set.durationSeconds === "number" ? set.durationSeconds : null,
          metricType: set.metricType === "time" ? "time" : "reps",
          rir: typeof set.rir === "number" ? set.rir : null,
          failNote: typeof set.failNote === "string" ? set.failNote : null,
          notes: typeof set.notes === "string" ? set.notes : null,
          createdAt: typeof set.createdAt === "string" ? set.createdAt : undefined,
        })),
      },
    });

    return NextResponse.json({
      ok: true,
      mode: result.mode,
      workoutId: "workoutId" in result ? result.workoutId : null,
    });
  } catch (error) {
    console.error("Beta workout sync failed", error);
    return NextResponse.json(
      {
        ok: false,
        mode: "error",
        message:
          error instanceof Error ? error.message : "Unknown beta workout sync error",
      },
      { status: 500 }
    );
  }
}
