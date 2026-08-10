"use client";
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CameraGlyph, PauseGlyph, PlayGlyph, RotateGlyph } from "./IconGlyphs";
import {
  getExerciseWeightStep,
  isBodyweightExercise,
  isTimedExercise,
} from "../lib/exercises";
import ExerciseInfoModal from "./ExerciseInfoModal";
import VideoFeedbackInfoModal from "./VideoFeedbackInfoModal";

type PersonalRecord = {
  exerciseName: string;
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  createdAt: string;
};

type PersonalRecords = Record<string, PersonalRecord>;

type Props = {
  currentExerciseName: string;
  exerciseKey: (name: string) => string;
  weightInput: string;
  setWeightInput: Dispatch<SetStateAction<string>>;
  repsInput: string;
  setRepsInput: Dispatch<SetStateAction<string>>;
  durationSecondsInput: number;
  setDurationSecondsInput: (v: number) => void;
  rirInput: number;
  setRirInput: React.Dispatch<React.SetStateAction<number>>;
  didFailInput: boolean;
  setDidFailInput: (v: boolean) => void;
  failNoteInput: string;
  setFailNoteInput: (v: string) => void;
  addSet: () => void;
  removeLastSet: () => void;
  onSkipExercise: () => void;
  canSkipExercise: boolean;
  skippedExerciseName: string | null;
  undoSkipExercise: () => void;
  personalRecords: PersonalRecords;
  plannedWeightKg?: number;
  plannedReps?: number;
  embedded?: boolean;
  nextExerciseButton?: React.ReactNode;
  onRecordLastSet?: () => void;
};

const CRAZY_WEIGHT_MESSAGES = [
  "You wish 😂",
  "I dina drömmar 🙃",
  "Nu blev det lite mycket va?",
  "Haha försök inte!",
  "Jag har inga ögon men kan ändå se att det blev fel där.",
];

const weightPlaceholders = ["kg"];

const addedWeightPlaceholders = [
  "t.ex. 2,5",
  "t.ex. 5",
  "t.ex. 7,5",
  "t.ex. 10",
  "t.ex. 15",
  "t.ex. 20",
];

function getStablePlaceholder(options: string[], key: string) {
  const hash = Array.from(key).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );

  return options[hash % options.length] ?? options[0];
}

export default function ExerciseCard({
  currentExerciseName,
  exerciseKey,
  weightInput,
  setWeightInput,
  repsInput,
  setRepsInput,
  durationSecondsInput,
  setDurationSecondsInput,
  rirInput,
  setRirInput,
  didFailInput,
  setDidFailInput,
  failNoteInput,
  setFailNoteInput,
  addSet,
  removeLastSet,
  onSkipExercise,
  canSkipExercise,
  skippedExerciseName,
  undoSkipExercise,
  personalRecords,
  plannedWeightKg,
  plannedReps,
  embedded = false,
  nextExerciseButton,
  onRecordLastSet,
}: Props) {
  const [showRirInfo, setShowRirInfo] = useState(false);
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  const [useAddedWeight, setUseAddedWeight] = useState(false);
  const [isDurationRunning, setIsDurationRunning] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [durationEditValue, setDurationEditValue] = useState("");
  const [awaitingWeightConfirm, setAwaitingWeightConfirm] = useState(false);
  const [awaitingRepsConfirm, setAwaitingRepsConfirm] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [crazyWeightMessageIndex] = useState(() => Math.floor(Math.random() * CRAZY_WEIGHT_MESSAGES.length));
  const [awaitingDecimalConfirm, setAwaitingDecimalConfirm] = useState(false);
  const [showVideoInfo, setShowVideoInfo] = useState(false);
  const [suggestedDecimalWeight, setSuggestedDecimalWeight] = useState<number | null>(null);
  const isBodyweight = isBodyweightExercise(currentExerciseName);
  const isTimed = isTimedExercise(currentExerciseName);
  const weightPlaceholder = getStablePlaceholder(
    isBodyweight ? addedWeightPlaceholders : weightPlaceholders,
    currentExerciseName
  );
  const hasAddedWeight =
    Number(weightInput.trim().replace(",", ".")) > 0 && isBodyweight;

  const showWeightInput = !isBodyweight || useAddedWeight || hasAddedWeight;

  const enteredReps = parseInt(repsInput.trim(), 10);
  const repsTooHigh =
    !isTimed &&
    plannedReps != null &&
    plannedReps > 0 &&
    Number.isFinite(enteredReps) &&
    enteredReps > 0 &&
    enteredReps > plannedReps + 10;

  const enteredWeight = parseFloat(weightInput.trim().replace(",", "."));
  const pbRecord = personalRecords[exerciseKey(currentExerciseName)];
  const pbWeight = pbRecord?.weight ?? 0;
  const hasPlan = plannedWeightKg != null && plannedWeightKg > 0;

  const weightWayTooHigh =
    showWeightInput &&
    Number.isFinite(enteredWeight) &&
    (
      (hasPlan && enteredWeight > (plannedWeightKg ?? 0) * 5) ||
      (!hasPlan && pbWeight > 0 && enteredWeight > pbWeight * 5) ||
      (!hasPlan && pbWeight <= 0 && enteredWeight > 300)
    );

  const decimalCandidate =
    showWeightInput &&
    !weightWayTooHigh &&
    Number.isFinite(enteredWeight) &&
    enteredWeight > 100 &&
    pbWeight > 0
      ? enteredWeight / 10
      : null;
  const decimalErrorSuggestion =
    decimalCandidate !== null &&
    Math.abs(decimalCandidate - pbWeight) / pbWeight < 0.1
      ? decimalCandidate
      : null;

  const weightDiffers =
    !weightWayTooHigh &&
    decimalErrorSuggestion === null &&
    showWeightInput &&
    Number.isFinite(enteredWeight) &&
    enteredWeight > 0 &&
    (
      (hasPlan &&
        Math.abs(enteredWeight - (plannedWeightKg ?? 0)) / (plannedWeightKg ?? 1) > 0.15) ||
      (!hasPlan && pbWeight > 0 && enteredWeight > pbWeight * 1.5)
    );
  const adjustReps = (delta: number) => {
    setRepsInput((prev) => {
      const current = Number(prev);
      const next = Number.isFinite(current)
        ? Math.max(0, current + delta)
        : delta > 0
        ? 1
        : 0;
      return String(next);
    });
  };
  const weightStep = getExerciseWeightStep(currentExerciseName);
  const adjustWeight = (delta: number) => {
    setWeightInput((prev) => {
      const current = Number(prev.trim().replace(",", "."));
      const base = Number.isFinite(current) ? current : 0;
      const next =
        delta > 0
          ? Math.ceil((base + 0.01) / weightStep) * weightStep
          : Math.max(0, Math.floor((base - 0.01) / weightStep) * weightStep);
      return next > 0 ? Number(next.toFixed(2)).toString() : "";
    });
  };

  const holdRef = useRef<{ timeout: ReturnType<typeof setTimeout> | null; interval: ReturnType<typeof setInterval> | null }>({ timeout: null, interval: null });
  const startHold = (fn: () => void) => {
    holdRef.current.timeout = setTimeout(() => {
      holdRef.current.interval = setInterval(fn, 80);
    }, 400);
  };
  const stopHold = () => {
    if (holdRef.current.timeout) clearTimeout(holdRef.current.timeout);
    if (holdRef.current.interval) clearInterval(holdRef.current.interval);
    holdRef.current.timeout = null;
    holdRef.current.interval = null;
  };

  const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const restSeconds = safeSeconds % 60;
    return `${minutes}:${restSeconds.toString().padStart(2, "0")}`;
  };
  const formatRecord = (record: PersonalRecord) => {
    if (record.metricType === "time" || isTimed) {
      const time = formatDuration(record.durationSeconds ?? 0);
      return record.weight > 0 ? `${time} + ${record.weight} kg` : time;
    }

    return isBodyweight && record.weight <= 0
      ? `${record.reps} reps`
      : `${record.weight.toLocaleString("sv-SE")} x ${record.reps}`;
};
/* eslint-disable react-hooks/set-state-in-effect */
useEffect(() => {
  setAwaitingWeightConfirm(false);
}, [weightInput]);
useEffect(() => {
  setAwaitingRepsConfirm(false);
}, [repsInput]);
/* eslint-enable react-hooks/set-state-in-effect */

useEffect(() => {
  if (rirInput > 1 && didFailInput) {
    setDidFailInput(false);
    setFailNoteInput("");
  }
}, [rirInput, didFailInput, setDidFailInput, setFailNoteInput]);
useEffect(() => {
  if (!didFailInput && failNoteInput) {
    setFailNoteInput("");
  }
}, [didFailInput, failNoteInput, setFailNoteInput]);
// Reset exercise-specific UI when the user moves to another exercise.
/* eslint-disable react-hooks/set-state-in-effect */
useEffect(() => {
  setUseAddedWeight(false);
  setIsDurationRunning(false);
  setDurationSecondsInput(0);
  setIsEditingDuration(false);
}, [currentExerciseName, setDurationSecondsInput]);
/* eslint-enable react-hooks/set-state-in-effect */
useEffect(() => {
  if (!isTimed || !isDurationRunning) return;

  const interval = window.setInterval(() => {
    setDurationSecondsInput(durationSecondsInput + 1);
  }, 1000);

  return () => window.clearInterval(interval);
}, [durationSecondsInput, isDurationRunning, isTimed, setDurationSecondsInput]);
  
 return (
  <div className={embedded ? "exercise-card-shell space-y-2.5 px-1" : "exercise-card-shell space-y-3 rounded-[1.6rem] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.032))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl"}>
    {skippedExerciseName ? (
      <div className="rounded-2xl border border-white/[0.07] bg-slate-950/14 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/45">
              Övning hoppad
            </p>
            <p className="mt-1 truncate text-sm text-white/82">
              {skippedExerciseName}
            </p>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-xl border border-white/[0.09] bg-white/6 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
            onClick={undoSkipExercise}
          >
            Ångra
          </button>
        </div>
      </div>
    ) : null}

    {!embedded && (
    <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-xl font-semibold tracking-tight">
              {currentExerciseName}
            </p>
            <button
              type="button"
              onClick={() => setShowExerciseInfo(true)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] text-xs font-semibold text-white/54 transition hover:bg-white/[0.07] hover:text-white"
              aria-label={`Visa info om ${currentExerciseName}`}
            >
              i
            </button>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-white/58 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => setConfirmSkip(true)}
            disabled={!canSkipExercise}
          >
            Hoppa över övning
          </button>
        </div>

      {showExerciseInfo ? (
        <ExerciseInfoModal
          exerciseName={currentExerciseName}
          onClose={() => setShowExerciseInfo(false)}
        />
      ) : null}

      {(() => {
        const prForUI = personalRecords[exerciseKey(currentExerciseName)];

        return (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {prForUI && (
              <div className="rounded-full border border-amber-200/18 bg-amber-200/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_0_18px_rgba(251,191,36,0.06)]">
                Personbästa {formatRecord(prForUI)}
              </div>
            )}
          </div>
        );
      })()}
      </div>
    )}

      <div className="grid grid-cols-2 items-end gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex h-5 items-center justify-between gap-2">
            <label className="text-xs text-gray-300">
              {isBodyweight ? "Belastning" : "Vikt (kg)"}
            </label>
            {isBodyweight ? (
              <button
                type="button"
                onClick={() => {
                  const next = !useAddedWeight;
                  setUseAddedWeight(next);
                  if (!next) setWeightInput("");
                }}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                  showWeightInput
                    ? "border-blue-300/24 bg-blue-500/[0.14] text-blue-50"
                    : "border-white/[0.075] bg-white/[0.035] text-white/46 hover:bg-white/[0.06] hover:text-white/72"
                }`}
              >
                + extra vikt
              </button>
            ) : null}
          </div>

          {showWeightInput ? (
            <div className="space-y-1.5">
              <div className="workout-input-stepper grid h-12 grid-cols-[2.55rem_minmax(0,1fr)_2.55rem] overflow-hidden rounded-2xl border border-white/[0.075] bg-slate-950/50 transition focus-within:border-blue-300/35">
                <button
                  type="button"
                  onClick={() => adjustWeight(-weightStep)}
                  onMouseDown={() => startHold(() => adjustWeight(-weightStep))}
                  onMouseUp={stopHold}
                  onMouseLeave={stopHold}
                  onTouchStart={() => startHold(() => adjustWeight(-weightStep))}
                  onTouchEnd={stopHold}
                  className="flex h-full items-center justify-center border-r border-white/[0.07] text-lg font-semibold text-white/62 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Sänk vikt"
                >
                  -
                </button>
                <input
                  className="h-full min-w-0 bg-transparent px-2 text-center text-lg font-semibold text-white outline-none placeholder:text-white/28"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder={weightPlaceholder}
                />
                <button
                  type="button"
                  onClick={() => adjustWeight(weightStep)}
                  onMouseDown={() => startHold(() => adjustWeight(weightStep))}
                  onMouseUp={stopHold}
                  onMouseLeave={stopHold}
                  onTouchStart={() => startHold(() => adjustWeight(weightStep))}
                  onTouchEnd={stopHold}
                  className="flex h-full items-center justify-center border-l border-white/[0.07] text-lg font-semibold text-white/62 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Höj vikt"
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-[47px] items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.026] px-3.5 text-sm font-semibold text-white/50">
              Kroppsvikt
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-1">
          {isTimed ? (
            <div className="space-y-1">
              <div className="flex h-5 items-center">
                <label className="text-xs text-gray-300">Tid</label>
              </div>
              <div className="workout-timer-card rounded-2xl border border-blue-300/15 bg-slate-950/50 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                {isEditingDuration ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      inputMode="numeric"
                      value={durationEditValue}
                      onChange={(e) => setDurationEditValue(e.target.value.replace(/[^0-9]/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setDurationSecondsInput(Number(durationEditValue) || 0);
                          setIsDurationRunning(false);
                          setIsEditingDuration(false);
                        }
                        if (e.key === "Escape") setIsEditingDuration(false);
                      }}
                      placeholder="sekunder"
                      className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-center text-xl font-semibold text-white outline-none focus:border-blue-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDurationSecondsInput(Number(durationEditValue) || 0);
                        setIsDurationRunning(false);
                        setIsEditingDuration(false);
                      }}
                      className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                    >
                      Klar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingDuration(false)}
                      className="shrink-0 rounded-xl border border-white/[0.07] px-2.5 py-2 text-xs font-semibold text-white/58 transition hover:text-white"
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-white">
                      {formatDuration(durationSecondsInput)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsDurationRunning((value) => !value)}
                        className="workout-ai-action inline-flex items-center gap-1.5 rounded-xl border border-blue-300/20 bg-blue-500/[0.12] px-3 py-1.5 text-xs font-semibold text-blue-50 transition hover:bg-blue-500/[0.18]"
                      >
                        {isDurationRunning ? <PauseGlyph className="h-3.5 w-3.5" /> : <PlayGlyph className="h-3.5 w-3.5" />}
                        {isDurationRunning ? "Stoppa" : "Starta"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDurationRunning(false);
                          setDurationSecondsInput(0);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-1.5 text-xs font-semibold text-white/58 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <RotateGlyph className="h-3.5 w-3.5" />
                        Nollställ
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!isEditingDuration && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDurationRunning(false);
                    setDurationEditValue(durationSecondsInput > 0 ? String(durationSecondsInput) : "");
                    setIsEditingDuration(true);
                  }}
                  className="text-[11px] font-medium text-white/40 underline decoration-white/25 underline-offset-2 transition hover:text-white/70"
                >
                  Skriv in tid själv
                </button>
              )}
            </div>
          ) : (
            <>
          <div className="flex h-5 items-center">
            <label className="text-xs text-gray-300">Reps</label>
          </div>
          <div className="workout-input-stepper grid h-12 grid-cols-[2.55rem_minmax(0,1fr)_2.55rem] overflow-hidden rounded-2xl border border-white/[0.075] bg-slate-950/50 transition focus-within:border-blue-300/35">
            <button
              type="button"
              onClick={() => adjustReps(-1)}
              onMouseDown={() => startHold(() => adjustReps(-1))}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={() => startHold(() => adjustReps(-1))}
              onTouchEnd={stopHold}
              className="flex h-full items-center justify-center border-r border-white/[0.07] text-lg font-semibold text-white/62 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Minska reps"
            >
              −
            </button>
            <input
              className="h-full min-w-0 bg-transparent px-2 text-center text-lg font-semibold text-white outline-none placeholder:text-white/28"
              inputMode="numeric"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="t.ex. 5"
            />
            <button
              type="button"
              onClick={() => adjustReps(1)}
              onMouseDown={() => startHold(() => adjustReps(1))}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={() => startHold(() => adjustReps(1))}
              onTouchEnd={stopHold}
              className="flex h-full items-center justify-center border-l border-white/[0.07] text-lg font-semibold text-white/62 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Öka reps"
            >
              +
            </button>
          </div>
          </>
          )}
        </div>
      </div>

      {isTimed ? (
        <p className="-mt-1 text-xs leading-5 text-white/42">
          Logga tid. Slå på extra vikt om du använder viktväst, kedja eller
          platta.
        </p>
      ) : isBodyweight ? (
        <p className="-mt-1 text-xs leading-5 text-white/42">
          Logga reps och RIR. Slå på extra vikt om du använder kedja, platta
          eller hantel.
        </p>
      ) : null}

      {!isTimed ? (
      <>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
  <label className="text-xs text-gray-300">
    RIR (reps kvar i tanken)
  </label>

  <button
    type="button"
    onClick={() => setShowRirInfo(!showRirInfo)}
    className="flex h-4 w-4 items-center justify-center rounded-full border border-zinc-600 text-[10px] text-gray-400 hover:bg-zinc-700"
  >
    i
  </button>
</div>

{showRirInfo && (
  <div className="text-xs text-gray-300 bg-slate-950/48 border border-zinc-700 rounded-xl p-3 mt-2">
    Hur många reps du hade kvar innan det tog stopp.
    <br />
    <br />
    0 = du nådde max
    <br />
    1 = du hade klarat 1 rep till
    <br />
    2 = du hade klarat 2 reps till
  </div>
)}

<div className="mt-1.5 grid grid-cols-6 gap-1.5 rounded-2xl bg-white/[0.035] p-1">
  {[0, 1, 2, 3, 4, 5].map((value) => {
    const isActive = rirInput === value;

    return (
      <button
        key={value}
        type="button"
        onClick={() => setRirInput(value)}
        className={`rounded-xl border px-2 py-1.5 text-sm font-semibold transition ${
          isActive
            ? "workout-rir-selected border-blue-400/25 bg-blue-500/[0.16] text-white shadow-[0_0_16px_rgba(59,130,246,0.10)]"
            : "border-transparent bg-transparent text-white/64 hover:bg-white/[0.045] hover:text-white"
        }`}
      >
        {value === 5 ? "5+" : value}
      </button>
    );
  })}
</div>
      </div>
{rirInput <= 1 ? (
  <label className="mt-1.5 flex items-center gap-3 text-sm text-white/85">
    <input
      type="checkbox"
      checked={didFailInput}
      onChange={(e) => setDidFailInput(e.target.checked)}
      className="h-4 w-4 rounded border border-white/20 bg-slate-950/38"
    />
    <span>Setet gick till failure</span>
  </label>
) : null}
{didFailInput ? (
  <div className="mt-1.5 space-y-2">
    <p className="text-sm text-white/75">Varför tog det stopp?</p>

    <div className="grid grid-cols-2 gap-2">
      {["grepp", "teknik", "ork", "smärta"].map((reason) => {
        const isActive = failNoteInput === reason;

        return (
          <button
            key={reason}
            type="button"
            onClick={() => setFailNoteInput(reason)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "workout-rir-selected border-blue-400/30 bg-blue-500/[0.10] text-white"
                : "border-white/[0.09] bg-slate-950/38 text-white/75 hover:bg-white/5 hover:text-white"
            }`}
          >
            {reason.charAt(0).toUpperCase() + reason.slice(1)}
          </button>
        );
      })}
    </div>
  </div>
) : null}

      {rirInput === 0 && (
        <div className="min-w-0 space-y-1">
          <label className="text-sm text-gray-300">Vad hände? (valfritt)</label>
          <input
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950/55 p-2.5 text-base text-white outline-none focus:border-blue-300/35 sm:text-sm"
            value={failNoteInput}
            onChange={(e) => setFailNoteInput(e.target.value)}
            placeholder='t.ex. "tappade greppet" eller "ont i handleden"'
          />
        </div>
      )}
      </>
      ) : null}

      {awaitingWeightConfirm && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[3px]" />
          <div className="relative mx-4 mb-10 w-full max-w-md space-y-5 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
            {weightWayTooHigh ? (
              <>
                <div className="space-y-1.5 text-center">
                  <p className="text-base font-semibold text-white">{CRAZY_WEIGHT_MESSAGES[crazyWeightMessageIndex]}</p>
                  <p className="text-sm text-white/50">
                    Du angav <span className="font-semibold text-white/80">{enteredWeight.toLocaleString("sv-SE")} kg</span>
                    {hasPlan
                      ? <> — planerat var <span className="font-semibold text-white/80">{plannedWeightKg?.toLocaleString("sv-SE")} kg</span></>
                      : pbWeight > 0
                      ? <> — ditt PB är <span className="font-semibold text-white/80">{pbWeight.toLocaleString("sv-SE")} kg</span></>
                      : null}
                  </p>
                </div>
                <button
                  className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/70 transition active:scale-[0.98]"
                  onClick={() => {
                    setWeightInput(String(hasPlan ? plannedWeightKg : pbWeight > 0 ? pbWeight : ""));
                    setAwaitingWeightConfirm(false);
                  }}
                >
                  Okej, ändra till {hasPlan ? plannedWeightKg?.toLocaleString("sv-SE") : pbWeight > 0 ? pbWeight.toLocaleString("sv-SE") : "?"} kg
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1.5 text-center">
                  <p className="text-base font-semibold text-white">Stämmer vikten?</p>
                  <p className="text-sm text-white/60">
                    Du angav{" "}
                    <span className="font-semibold text-white">{enteredWeight.toLocaleString("sv-SE")} kg</span>
                    {hasPlan
                      ? <> — planerat var <span className="font-semibold text-white">{plannedWeightKg?.toLocaleString("sv-SE")} kg</span></>
                      : pbWeight > 0
                      ? <> — ditt PB är <span className="font-semibold text-white">{pbWeight.toLocaleString("sv-SE")} kg</span></>
                      : null}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98]"
                    onClick={() => {
                      setAwaitingWeightConfirm(false);
                      addSet();
                    }}
                  >
                    Ja, {enteredWeight.toLocaleString("sv-SE")} kg stämmer
                  </button>
                  {(hasPlan || pbWeight > 0) && (
                    <button
                      className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/70 transition active:scale-[0.98]"
                      onClick={() => {
                        setWeightInput(String(hasPlan ? plannedWeightKg : pbWeight));
                        setAwaitingWeightConfirm(false);
                      }}
                    >
                      Ändra till {(hasPlan ? plannedWeightKg : pbWeight)?.toLocaleString("sv-SE")} kg
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
      {awaitingRepsConfirm && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[3px]" />
          <div className="relative mx-4 mb-10 w-full max-w-md space-y-5 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
            <div className="space-y-1.5 text-center">
              <p className="text-base font-semibold text-white">Stämmer reps?</p>
              <p className="text-sm text-white/60">
                Du angav{" "}
                <span className="font-semibold text-white">{enteredReps} reps</span>
                {" — "}planerat var{" "}
                <span className="font-semibold text-white">{plannedReps} reps</span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98]"
                onClick={() => {
                  setAwaitingRepsConfirm(false);
                  addSet();
                }}
              >
                Ja, {enteredReps} reps stämmer
              </button>
              <button
                className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/70 transition active:scale-[0.98]"
                onClick={() => {
                  setRepsInput(String(plannedReps));
                  setAwaitingRepsConfirm(false);
                }}
              >
                Ändra till {plannedReps} reps
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {awaitingDecimalConfirm && suggestedDecimalWeight !== null && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[3px]" />
          <div className="relative mx-4 mb-10 w-full max-w-md space-y-5 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
            <div className="space-y-1.5 text-center">
              <p className="text-base font-semibold text-white">Decimalfel?</p>
              <p className="text-sm text-white/60">
                Du angav <span className="font-semibold text-white">{enteredWeight} kg</span>
                {" — "}menade du <span className="font-semibold text-white">{suggestedDecimalWeight} kg</span>?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/70 transition active:scale-[0.98]"
                onClick={() => {
                  setWeightInput(String(suggestedDecimalWeight));
                  setAwaitingDecimalConfirm(false);
                  setSuggestedDecimalWeight(null);
                }}
              >
                Ja, ändra till {suggestedDecimalWeight} kg
              </button>
              <button
                className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98]"
                onClick={() => {
                  setAwaitingDecimalConfirm(false);
                  setSuggestedDecimalWeight(null);
                  addSet();
                }}
              >
                Nej, {enteredWeight} kg stämmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {confirmSkip && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[3px]" />
          <div className="relative mx-4 mb-10 w-full max-w-md space-y-5 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
            <div className="space-y-1.5 text-center">
              <p className="text-base font-semibold text-white">Hoppa över {currentExerciseName}?</p>
              <p className="text-sm text-white/50">Redan loggade set sparas.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/70 transition active:scale-[0.98]"
                onClick={() => { setConfirmSkip(false); onSkipExercise(); }}
              >
                Ja, hoppa över
              </button>
              <button
                className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98]"
                onClick={() => setConfirmSkip(false)}
              >
                Fortsätt övningen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {(
        <div className={`space-y-2 ${embedded ? "" : "flex gap-2 space-y-0"}`}>
          <button
            className="workout-primary-action w-full rounded-2xl border border-blue-300/16 bg-blue-600/58 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(37,99,235,0.07)] transition hover:bg-blue-500/72 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              if (weightWayTooHigh) {
                setAwaitingWeightConfirm(true);
              } else if (decimalErrorSuggestion !== null) {
                setSuggestedDecimalWeight(decimalErrorSuggestion);
                setAwaitingDecimalConfirm(true);
              } else if (weightDiffers) {
                setAwaitingWeightConfirm(true);
              } else if (repsTooHigh) {
                setAwaitingRepsConfirm(true);
              } else {
                addSet();
              }
            }}
          >
            Lägg till set
          </button>

          {embedded ? (
            <>
              {nextExerciseButton}
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-white/[0.04] bg-transparent px-4 py-2 text-sm font-medium text-white/36 transition hover:bg-white/[0.05] hover:text-white/58"
                  onClick={removeLastSet}
                  title="Ta bort senaste set"
                >
                  Ångra set
                </button>
                {onRecordLastSet ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="workout-ai-action flex h-11 w-11 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-500/[0.16] text-blue-50 transition hover:bg-blue-500/[0.24] hover:text-white"
                      onClick={onRecordLastSet}
                      title="Filma senaste setet"
                      aria-label="Filma senaste setet"
                    >
                      <CameraGlyph className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVideoInfo(true)}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] text-[10px] font-semibold text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                      aria-label="Vad gör filma-knappen?"
                    >
                      i
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="contents">
              <button
                className="flex-1 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-4 py-2 text-sm font-semibold text-white/64 transition hover:bg-white/[0.07] hover:text-white"
                onClick={removeLastSet}
                title="Ta bort senaste set"
              >
                Ångra set
              </button>
              {onRecordLastSet ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.075] bg-white/[0.035] text-white/54 transition hover:bg-white/[0.07] hover:text-white"
                    onClick={onRecordLastSet}
                    title="Filma senaste setet"
                    aria-label="Filma senaste setet"
                  >
                    <CameraGlyph className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVideoInfo(true)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] text-[10px] font-semibold text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                    aria-label="Vad gör filma-knappen?"
                  >
                    i
                  </button>
                </div>
              ) : null}
              {nextExerciseButton}
            </div>
          )}
          {showVideoInfo ? (
            <VideoFeedbackInfoModal onClose={() => setShowVideoInfo(false)} />
          ) : null}
        </div>
      )}
    </div>
  );
}
