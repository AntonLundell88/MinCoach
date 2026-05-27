"use client";
import { useEffect, useRef, useState } from "react";
import ExerciseCard from "./ExerciseCard";
import SetList from "./SetList";
import CoachPanel from "./CoachPanel";
import WorkoutHeader from "./WorkoutHeader";
import WorkoutNavigation from "./WorkoutNavigation";
import { getExerciseProfile } from "../lib/exercises";

type WorkoutHeaderData = {
  pass: string;
  gym: string;
  startedAt: string;
} | null;

type Props = {
  workout: WorkoutHeaderData;
  progression: { weight: number; reps: number; rir?: number | null; failNote?: string | null }[];
  progressionPlan: {
    weight: string;
    repsText: string;
    rirText: string;
    note: string;
  };
  exerciseIndex: number;
  activePlan: string[];
  passLabel: string;
  coachData: {
    intro: string;
    pass: string;
    gym: string;
    exercise: string;
    lastText: string;
    plan: string;
    target: string;
    insight: string;
  } | null;
  dayForm: "trött" | "normal" | "stark" | null;
  setDayForm: (v: "trött" | "normal" | "stark") => void;
  formatTime: (d: Date) => string;
  chatLog: { role: "you" | "coach"; text: string; setNumber?: number }[];
  chatInput: string;
  setChatInput: (v: string) => void;
  addCoachMessage: (text: string) => void;
  sendChat: () => void;
  workoutExerciseInput: string;
  setWorkoutExerciseInput: (v: string) => void;
  addExerciseDuringWorkout: () => void;
  currentExerciseName: string;
  lastByExercise: Record<
    string,
    {
      weight: number;
      reps: number;
      rir: number | null;
      failNote: string | null;
      updatedAt: string;
    }
  >;
  exerciseKey: (name: string) => string;
  weightInput: string;
  setWeightInput: (v: string) => void;
  repsInput: string;
  setRepsInput: (v: string) => void;
  rirInput: number;
  setRirInput: React.Dispatch<React.SetStateAction<number>>;
  didFailInput: boolean;
  setDidFailInput: (v: boolean) => void;
  failNoteInput: string;
  setFailNoteInput: (v: string) => void;
  addSet: () => void;
  removeLastSet: () => void;
  skipCurrentExercise: () => void;
  canSkipCurrentExercise: boolean;
  skippedExerciseName: string | null;
  undoSkipExercise: () => void;
  currentSets: { createdAt: string; weight: number; reps: number; rir?: number }[];
  prevExercise: () => void;
  nextExercise: () => void;
  finishWorkout: () => void;
  personalRecords: Record<
    string,
    {
      exerciseName: string;
      weight: number;
      reps: number;
      createdAt: string;
    }
  >;
};

function getTopSet(progression: { weight: number; reps: number }[]) {
  if (progression.length === 0) return null;

  return [...progression].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.reps - a.reps;
  })[0];
}
function getRestTime(exerciseName: string) {
  if (getExerciseRestKind(exerciseName) === "heavy") return "2–3 min";
  return "60–90 sek";
}

function getExerciseRestKind(exerciseName: string) {
  const profile = getExerciseProfile(exerciseName);
  const lower = exerciseName.toLowerCase();
  const cue = profile.techniqueCue.toLowerCase();

  if (
    profile.category === "armar" ||
    profile.category === "axlar" ||
    profile.category === "mage" ||
    lower.includes("vad") ||
    lower.includes("benspark") ||
    lower.includes("lårcurl") ||
    lower.includes("larcurl") ||
    lower.includes("curl") ||
    lower.includes("pushdown") ||
    lower.includes("sidolyft") ||
    cue.includes("kontakt")
  ) {
    return "isolation" as const;
  }

  if (
    lower.includes("mark") ||
    lower.includes("knäböj") ||
    lower.includes("knöböj") ||
    lower.includes("squat") ||
    lower.includes("benpress") ||
    lower.includes("bänk") ||
    lower.includes("bank") ||
    lower.includes("rodd") ||
    lower.includes("latsdrag") ||
    lower.includes("press")
  ) {
    return "heavy" as const;
  }

  return "normal" as const;
}

function formatRestTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getRestTargetRange(exerciseName: string, rir?: number) {
  const kind = getExerciseRestKind(exerciseName);

  if (typeof rir === "number") {
    if (kind === "isolation") {
      if (rir === 0) return { min: 120, max: 120, label: "2:00" };
      if (rir === 1) return { min: 90, max: 120, label: "1:30–2:00" };
      return { min: 60, max: 90, label: "1:00–1:30" };
    }

    if (kind === "normal") {
      if (rir === 0) return { min: 180, max: 180, label: "3:00" };
      if (rir === 1) return { min: 120, max: 180, label: "2:00–3:00" };
      return { min: 120, max: 120, label: "2:00" };
    }

    if (rir === 0) return { min: 180, max: 240, label: "3:00–4:00" };
    if (rir === 1) return { min: 180, max: 180, label: "3:00" };
    return { min: 120, max: 180, label: "2:00–3:00" };
  }

  const recommendation = getRestTime(exerciseName);

  if (recommendation.includes("2") && recommendation.includes("3")) {
    return { min: 120, max: 180, label: "2:00–3:00" };
  }

  return { min: 60, max: 90, label: "1:00–1:30" };
}

function getManualRestTarget(seconds: number) {
  return {
    min: seconds,
    max: seconds,
    label: formatRestTimer(seconds),
  };
}

function getIntroTarget(args: {
  last: { reps: number; rir: number | null } | undefined;
  topSet: { weight: number; reps: number } | null;
  baseWeight: number | null;
}) {
  const { last, topSet, baseWeight } = args;

  if (!last) {
    return {
      reps: "8–10 reps",
      rir: "RIR 2",
      note: "Första setet visar oss var vi ligger.",
    };
  }

  if (topSet && baseWeight === topSet.weight) {
    return {
      reps: `${Math.max(1, topSet.reps - 1)}–${topSet.reps} reps`,
      rir: "RIR 1–2",
      note: "Samma vikt som ditt bästa. Vi siktar lite lägre först.",
    };
  }

  if (last.rir === 0) {
    return {
      reps: `${Math.max(1, last.reps - 2)}–${Math.max(1, last.reps - 1)} reps`,
      rir: "RIR 1–2",
      note: "Vi börjar lite lägre här.",
    };
  }

  if (last.rir === 1) {
    return {
      reps: `${Math.max(1, last.reps - 1)}–${last.reps} reps`,
      rir: "RIR 1–2",
      note: "Vi börjar lugnt. Första setet visar oss var vi ligger.",
    };
  }

  if (typeof last.rir === "number" && last.rir >= 3) {
    return {
      reps: `${last.reps + 1} reps`,
      rir: "RIR 1–2",
      note: "Vi börjar lugnt och låter RIR styra.",
    };
  }

  return {
    reps: `${last.reps} reps`,
    rir: "RIR 2",
    note: "Första setet visar oss var vi ligger.",
  };
}

function buildExerciseIntroCoachText(args: {
  exerciseName: string;
  progression: { weight: number; reps: number }[];
  progressionPlan: {
    weight: string;
    repsText: string;
    rirText: string;
    note: string;
  };
  lastByExercise: Props["lastByExercise"];
  exerciseKey: (name: string) => string;
  personalRecords: Props["personalRecords"];
}) {
  const {
    exerciseName,
    progression,
    progressionPlan,
    lastByExercise,
    exerciseKey,
    personalRecords,
  } = args;

  const key = exerciseKey(exerciseName);
  const last = lastByExercise[key];
  const pr = personalRecords[key];
  const topSet = pr
    ? { weight: pr.weight, reps: pr.reps }
    : getTopSet(progression);
  const rest = getRestTime(exerciseName);
  const plannedWeight = Number(progressionPlan.weight);
  const baseWeight = topSet?.weight ?? (Number.isFinite(plannedWeight) && plannedWeight > 0
    ? plannedWeight
    : last?.weight ?? null);
  const target = progressionPlan
    ? {
        reps: progressionPlan.repsText,
        rir: progressionPlan.rirText,
        note: progressionPlan.note,
      }
    : getIntroTarget({ last, topSet, baseWeight });

  if (!last && !topSet) {
    return `Då tar vi ${exerciseName}.

Det här är första gången vi kör den tillsammans.
Första setet visar oss var vi ligger.

Sikta på:
${target.reps}
${target.rir}

Vila ${rest}.`;
  }

  const lines: string[] = [`Då tar vi ${exerciseName}.`, ""];

  if (last?.failNote) {
    lines.push("Senast tog det stopp här, så vi öppnar smart.");
    lines.push("");
  } else if (topSet) {
    lines.push(`Ditt bästa här är ${topSet.weight} × ${topSet.reps}.`);
  } else if (last) {
    lines.push(`Senast låg du på ${last.weight} × ${last.reps}.`);
  }

  if (baseWeight !== null) {
    lines.push(
      topSet && baseWeight === topSet.weight
        ? `Vi börjar på samma vikt och siktar på ${target.reps}, ${target.rir}.`
        : `Vi börjar på ${baseWeight} kg och siktar på ${target.reps}, ${target.rir}.`
    );

    if (progressionPlan.note && !(topSet && baseWeight === topSet.weight)) {
      lines.push(progressionPlan.note);
    }
  } else {
    lines.push("Sikta på:");
    lines.push(target.reps);
    lines.push(target.rir);
    lines.push("");
    lines.push("Första setet visar oss var vi ligger.");
  }

  lines.push("");
  lines.push(`Vila ${rest}.`);

  return lines.join("\n");
}
export default function WorkoutScreen({
  personalRecords,
  workout,
  exerciseIndex,
  activePlan,
  passLabel,
  coachData,
  dayForm,
  setDayForm,
  chatLog,
  chatInput,
  setChatInput,
  sendChat,
  workoutExerciseInput,
  setWorkoutExerciseInput,
  addExerciseDuringWorkout,
  formatTime,
  currentExerciseName,
  lastByExercise,
  exerciseKey,
  weightInput,
  setWeightInput,
  repsInput,
  setRepsInput,
  rirInput,
  setRirInput,
  didFailInput,
  setDidFailInput,
  failNoteInput,
  setFailNoteInput,
  addSet,
  removeLastSet,
  skipCurrentExercise,
  canSkipCurrentExercise,
  skippedExerciseName,
  undoSkipExercise,
  currentSets,
  prevExercise,
  nextExercise,
  finishWorkout,
  progression,
  progressionPlan,
  addCoachMessage,
}: Props) {
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [autoStartRestTimer, setAutoStartRestTimer] = useState(false);
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [manualRestTarget, setManualRestTarget] = useState<{
    min: number;
    max: number;
    label: string;
  } | null>(null);
  const previousSetCountRef = useRef(currentSets.length);
  const latestSet = currentSets.at(-1);
  const coachRestTarget = getRestTargetRange(currentExerciseName, latestSet?.rir);
  const restTarget = manualRestTarget ?? coachRestTarget;
  const restProgress = Math.min(restElapsed / restTarget.max, 1);
  const restTargetReached = restStartedAt !== null && restElapsed >= restTarget.min;
  const restOverMax =
    restStartedAt !== null &&
    restTarget.max > restTarget.min &&
    restElapsed >= restTarget.max;
  const restTimerState = restOverMax
    ? "over"
    : restTargetReached
    ? "ready"
    : "resting";
  const shouldShowRestDock = showRestTimer;

  useEffect(() => {
    if (currentSets.length > previousSetCountRef.current) {
      setRestElapsed(0);
      setManualRestTarget(null);
      setRestStartedAt(autoStartRestTimer ? Date.now() : null);
      if (autoStartRestTimer) {
        setShowRestTimer(true);
      }
    }

    previousSetCountRef.current = currentSets.length;
  }, [autoStartRestTimer, currentSets.length]);

  useEffect(() => {
    if (!restStartedAt) return;

    const interval = window.setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [restStartedAt]);

  function startRestTimer() {
    setRestStartedAt(Date.now());
    setRestElapsed(0);
    setShowRestTimer(true);
  }

  function startManualRestTimer(seconds: number) {
    setManualRestTarget(getManualRestTarget(seconds));
    setRestStartedAt(Date.now());
    setRestElapsed(0);
    setShowRestTimer(true);
  }

  function resetRestTimer() {
    setRestStartedAt(null);
    setRestElapsed(0);
    setManualRestTarget(null);
  }
  
// eslint-disable-next-line react-hooks/exhaustive-deps
// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => {
  if (!currentExerciseName) return;

  addCoachMessage(
    buildExerciseIntroCoachText({
      exerciseName: currentExerciseName,
      progression,
      progressionPlan,
      lastByExercise,
      exerciseKey,
      personalRecords,
    })
  );
}, [exerciseIndex]);

  return (
    <>
    <div className={`w-full max-w-xl space-y-2.5 sm:space-y-3 ${shouldShowRestDock ? "pb-44" : ""}`}>
<CoachPanel
  coachData={coachData}
  dayForm={dayForm}
  setDayForm={setDayForm}
  chatLog={chatLog}
  chatInput={chatInput}
  setChatInput={setChatInput}
  sendChat={sendChat}
/>

      <WorkoutHeader
        workout={workout}
        exerciseIndex={exerciseIndex}
        activePlan={activePlan}
        passLabel={passLabel}
        formatTime={formatTime}
      />

      <ExerciseCard
        currentExerciseName={currentExerciseName}
        lastByExercise={lastByExercise}
        exerciseKey={exerciseKey}
        weightInput={weightInput}
        setWeightInput={setWeightInput}
        repsInput={repsInput}
        setRepsInput={setRepsInput}
        rirInput={rirInput}
        setRirInput={setRirInput}
        didFailInput={didFailInput}
        setDidFailInput={setDidFailInput}
        failNoteInput={failNoteInput}
        setFailNoteInput={setFailNoteInput}
        addSet={addSet}
        removeLastSet={removeLastSet}
        onSkipExercise={skipCurrentExercise}
        canSkipExercise={canSkipCurrentExercise}
        skippedExerciseName={skippedExerciseName}
        undoSkipExercise={undoSkipExercise}
        personalRecords={personalRecords}
      />

      <WorkoutNavigation
        exerciseIndex={exerciseIndex}
        activePlan={activePlan}
        showAddExercise={showAddExercise}
        toggleAddExercise={() => setShowAddExercise((value) => !value)}
        prevExercise={prevExercise}
        nextExercise={nextExercise}
        finishWorkout={finishWorkout}
      />

      <div
        className={`rounded-[1.15rem] border border-white/[0.06] bg-white/[0.022] px-3 py-2 backdrop-blur-2xl ${
          showRestTimer ? "hidden" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowRestTimer((value) => !value)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/32">
              Vila
            </span>
            <span className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-white/82">
              {formatRestTimer(restElapsed)}
              <span className="text-xs font-medium text-white/42">
                coach {restTarget.label}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={startRestTimer}
            className="shrink-0 rounded-xl border border-blue-400/18 bg-blue-500/[0.075] px-3 py-2 text-xs font-semibold text-blue-100 transition hover:bg-[#4f83ff]/[0.13]"
          >
            {restStartedAt ? "Om" : "Starta"}
          </button>

          <label className="flex shrink-0 items-center gap-1 rounded-xl border border-white/[0.065] bg-white/[0.032] px-2.5 py-2 text-xs font-semibold text-white/52">
            <input
              type="checkbox"
              checked={autoStartRestTimer}
              onChange={(event) => setAutoStartRestTimer(event.target.checked)}
              className="h-3 w-3 rounded border-white/20 bg-slate-950/38"
            />
            Auto
          </label>

          <button
            type="button"
            onClick={() => setShowRestTimer((value) => !value)}
            className="shrink-0 rounded-xl border border-white/[0.065] bg-white/[0.032] px-2.5 py-2 text-xs font-semibold text-white/52 transition hover:bg-white/[0.07] hover:text-white"
          >
            {showRestTimer ? "Dölj" : "Visa"}
          </button>
        </div>

        {showRestTimer ? (
          <div
            className={`hidden mt-2 rounded-[1.1rem] border p-2.5 transition ${
              restTimerState === "over"
                ? "border-red-300/45 bg-[#2a1417] shadow-[0_0_30px_rgba(248,113,113,0.22)]"
                : restTimerState === "ready"
                ? "border-orange-300/45 bg-[#2a1d12] shadow-[0_0_28px_rgba(251,146,60,0.22)]"
                : "border-blue-400/15 bg-slate-950/22"
            }`}
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Vila
                </p>
                <p
                  className={`mt-0.5 text-2xl font-semibold tracking-[-0.04em] ${
                    restTimerState === "over"
                      ? "text-red-100"
                      : restTimerState === "ready"
                      ? "text-orange-100"
                      : "text-white"
                  }`}
                >
                  {formatRestTimer(restElapsed)}
                </p>
              </div>

              <p
                className={`pb-0.5 text-xs font-medium ${
                  restTimerState === "over"
                    ? "text-red-100/72"
                    : restTimerState === "ready"
                    ? "text-orange-100/72"
                    : "text-white/50"
                }`}
              >
                {restTimerState === "over"
                  ? "klart. Kör när du vill."
                  : restTimerState === "ready"
                  ? "vilan är klar"
                  : manualRestTarget
                  ? `mål ${restTarget.label}`
                  : `coach ${restTarget.label}`}
              </p>
            </div>

            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className={`h-full rounded-full shadow-[0_0_18px_rgba(96,165,250,0.35)] transition-all duration-500 ${
                  restTimerState === "over"
                    ? "bg-red-400"
                    : restTimerState === "ready"
                    ? "bg-orange-300"
                    : "bg-blue-400"
                }`}
                style={{ width: `${restProgress * 100}%` }}
              />
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={startRestTimer}
                className="rounded-lg border border-blue-400/20 bg-blue-500/[0.10] px-3 py-2 text-xs font-semibold text-blue-100 transition hover:bg-[#4f83ff]/[0.16]"
              >
                {restStartedAt ? "Starta om" : "Starta"}
              </button>

              <button
                type="button"
                onClick={resetRestTimer}
                className="rounded-lg border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-xs font-semibold text-white/72 transition hover:bg-white/[0.08] hover:text-white"
              >
                {restStartedAt ? "Stoppa" : "Nollställ"}
              </button>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[
                [60, "1:00"],
                [120, "2:00"],
                [180, "3:00"],
                [240, "4:00"],
              ].map(([seconds, label]) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => startManualRestTimer(Number(seconds))}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                    manualRestTarget?.min === seconds
                      ? "border-blue-400/30 bg-blue-500/[0.14] text-blue-100"
                      : "border-white/[0.09] bg-white/[0.042] text-white/58 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <SetList currentSets={currentSets} />

      {showAddExercise ? (
        <div className="rounded-[1.15rem] border border-white/[0.06] bg-white/[0.018] px-3 py-2 backdrop-blur-2xl">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-white/[0.075] bg-slate-950/38 px-3 py-2 text-sm text-white outline-none placeholder:text-white/28 focus:border-blue-300/35"
              value={workoutExerciseInput}
              onChange={(e) => setWorkoutExerciseInput(e.target.value)}
              placeholder='t.ex. "Chins"'
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addExerciseDuringWorkout();
                  setShowAddExercise(false);
                }
              }}
            />

            <button
              className="rounded-xl border border-blue-400/18 bg-blue-500/[0.09] px-4 text-sm font-semibold text-white transition hover:bg-[#4f83ff]/[0.14]"
              onClick={() => {
                addExerciseDuringWorkout();
                setShowAddExercise(false);
              }}
            >
              Lägg till
            </button>
          </div>
        </div>
      ) : null}
    </div>
    {shouldShowRestDock ? (
      <div className="fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-5">
        <div
          className={`mx-auto w-full max-w-[430px] rounded-[1.35rem] border p-3 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition ${
            restTimerState === "over"
              ? "border-red-300/45 bg-[#2a1417] shadow-[0_0_34px_rgba(248,113,113,0.28)]"
              : restTimerState === "ready"
              ? "border-orange-300/45 bg-[#2a1d12] shadow-[0_0_32px_rgba(251,146,60,0.26)]"
              : "border-white/[0.11] bg-[#111a25]"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
                Vila
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <p
                  className={`text-2xl font-semibold tracking-tight ${
                    restTimerState === "over"
                      ? "text-red-100"
                      : restTimerState === "ready"
                      ? "text-orange-100"
                      : "text-white"
                  }`}
                >
                  {formatRestTimer(restElapsed)}
                </p>
                <p
                  className={`truncate text-xs font-semibold ${
                    restTimerState === "over"
                      ? "text-red-100/72"
                      : restTimerState === "ready"
                      ? "text-orange-100/72"
                      : "text-white/48"
                  }`}
                >
                  {restTimerState === "over"
                    ? "över målet"
                    : restTimerState === "ready"
                    ? "vilan är klar"
                    : manualRestTarget
                    ? `mål ${restTarget.label}`
                    : `coach ${restTarget.label}`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={startRestTimer}
                className="rounded-xl border border-blue-400/20 bg-blue-500/[0.14] px-3 py-2 text-xs font-semibold text-blue-100 transition hover:bg-[#4f83ff]/[0.18]"
              >
                {restStartedAt ? "Om" : "Starta"}
              </button>
              <button
                type="button"
                onClick={resetRestTimer}
                className="rounded-xl border border-white/[0.09] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/72 transition hover:bg-white/[0.09] hover:text-white"
              >
                {restStartedAt ? "Stoppa" : "Nollställ"}
              </button>
              <button
                type="button"
                onClick={() => setShowRestTimer(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.06] text-sm font-semibold text-white/52 transition hover:bg-white/[0.09] hover:text-white"
                aria-label="Dölj vilotimer"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full shadow-[0_0_18px_rgba(96,165,250,0.35)] transition-all duration-500 ${
                restTimerState === "over"
                  ? "bg-red-400"
                  : restTimerState === "ready"
                  ? "bg-orange-300"
                  : "bg-blue-400"
              }`}
              style={{ width: `${restProgress * 100}%` }}
            />
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[
              [60, "1:00"],
              [120, "2:00"],
              [180, "3:00"],
              [240, "4:00"],
            ].map(([seconds, label]) => (
              <button
                key={seconds}
                type="button"
                onClick={() => startManualRestTimer(Number(seconds))}
                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                  manualRestTarget?.min === seconds
                    ? "border-blue-400/30 bg-blue-500/[0.16] text-blue-100"
                    : "border-white/[0.09] bg-white/[0.052] text-white/62 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
