"use client";
import { useEffect, useState } from "react";
import { CloseGlyph, PauseGlyph, PlayGlyph, RotateGlyph } from "./IconGlyphs";
import {
  getExerciseProfile,
  getExerciseUserInfo,
  isBodyweightExercise,
  isTimedExercise,
} from "../lib/exercises";

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
  setWeightInput: (v: string) => void;
  repsInput: string;
  setRepsInput: (v: string) => void;
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
};

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
}: Props) {
  const [showRirInfo, setShowRirInfo] = useState(false);
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  const [useAddedWeight, setUseAddedWeight] = useState(false);
  const [isDurationRunning, setIsDurationRunning] = useState(false);
  const exerciseInfo = getExerciseProfile(currentExerciseName);
  const exerciseUserInfo = getExerciseUserInfo(currentExerciseName);
  const isBodyweight = isBodyweightExercise(currentExerciseName);
  const isTimed = isTimedExercise(currentExerciseName);
  const hasAddedWeight =
    Number(weightInput.trim().replace(",", ".")) > 0 && isBodyweight;
  const showWeightInput = !isBodyweight || useAddedWeight || hasAddedWeight;
  const adjustReps = (delta: number) => {
    const current = Number(repsInput);
    const next = Number.isFinite(current)
      ? Math.max(0, current + delta)
      : delta > 0
      ? 1
      : 0;

    setRepsInput(String(next));
  };
  const adjustDuration = (delta: number) => {
    setDurationSecondsInput(Math.max(0, durationSecondsInput + delta));
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
      : `${record.weight} x ${record.reps}`;
  };
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
  <div className="exercise-card-shell space-y-3 rounded-[1.6rem] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.032))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl">
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
          onClick={onSkipExercise}
          disabled={!canSkipExercise}
        >
          Hoppa över övning
        </button>
      </div>

      {showExerciseInfo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                  Övningsinfo
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
                  {currentExerciseName}
                </h2>
              </div>

              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                onClick={() => setShowExerciseInfo(false)}
                aria-label="Stäng"
              >
                <CloseGlyph className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/42">
                {exerciseInfo.equipment}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {exerciseUserInfo.whyChosen || exerciseInfo.detail}
              </p>
              <p className="mt-2 text-xs leading-5 text-white/52">
                Tränar: {exerciseUserInfo.trains}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/44">
                {exerciseUserInfo.logTypeText}
              </p>
              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] p-2.5">
                <p className="text-xs leading-5 text-white/66">
                  {exerciseInfo.techniqueCue}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/44">
                  {exerciseUserInfo.keepInMind || exerciseInfo.progressionRule}
                </p>
                {exerciseUserInfo.easierAlternative ? (
                  <p className="mt-1 text-xs leading-5 text-white/44">
                    Lättare variant: {exerciseUserInfo.easierAlternative}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {(() => {
        const prForUI = personalRecords[exerciseKey(currentExerciseName)];

        return (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {prForUI ? (
              <div className="rounded-full border border-amber-200/18 bg-amber-200/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_0_18px_rgba(251,191,36,0.06)]">
                Personbästa {formatRecord(prForUI)}
              </div>
            ) : (
              <div className="rounded-full border border-white/[0.09] bg-white/[0.042] px-2.5 py-1 text-[11px] text-white/38">
                Personbästa –
              </div>
            )}

          </div>
        );
      })()}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
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
            <input
              className="w-full rounded-2xl border border-white/[0.075] bg-slate-950/50 px-3.5 py-2.5 text-center text-lg font-semibold text-white outline-none transition focus:border-blue-300/35"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={isBodyweight ? "t.ex. 5" : "t.ex. 80"}
            />
          ) : (
            <div className="flex h-[47px] items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.026] px-3.5 text-sm font-semibold text-white/50">
              Kroppsvikt
            </div>
          )}
        </div>

        <div className="space-y-1">
          {isTimed ? (
            <div className="space-y-1">
              <label className="text-xs text-gray-300">Tid</label>
              <div className="rounded-2xl border border-blue-300/15 bg-slate-950/50 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-2xl font-semibold tracking-[-0.03em] text-white">
                    {formatDuration(durationSecondsInput)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsDurationRunning((value) => !value)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300/20 bg-blue-500/[0.12] px-3 py-1.5 text-xs font-semibold text-blue-50 transition hover:bg-blue-500/[0.18]"
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
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {[15, 30, 45, 60].map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => adjustDuration(seconds)}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.035] py-1.5 text-xs font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      +{seconds}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
          <label className="text-xs text-gray-300">Reps</label>
          <div className="grid grid-cols-[2.55rem_1fr_2.55rem] overflow-hidden rounded-2xl border border-white/[0.075] bg-slate-950/50 transition focus-within:border-blue-300/35">
            <button
              type="button"
              onClick={() => adjustReps(-1)}
              className="border-r border-white/[0.07] text-lg font-semibold text-white/62 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Minska reps"
            >
              −
            </button>
            <input
              className="min-w-0 bg-transparent px-3 py-2.5 text-center text-lg font-semibold text-white outline-none"
              inputMode="numeric"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
              placeholder="t.ex. 5"
            />
            <button
              type="button"
              onClick={() => adjustReps(1)}
              className="border-l border-white/[0.07] text-lg font-semibold text-white/62 transition hover:bg-white/[0.06] hover:text-white"
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

<div className="mt-1.5 grid grid-cols-6 gap-1.5 rounded-2xl bg-slate-950/22 p-1">
  {[0, 1, 2, 3, 4, 5].map((value) => {
    const isActive = rirInput === value;

    return (
      <button
        key={value}
        type="button"
        onClick={() => setRirInput(value)}
        className={`rounded-xl border px-2 py-1.5 text-sm font-semibold transition ${
          isActive
            ? "border-blue-400/25 bg-blue-500/[0.16] text-white shadow-[0_0_16px_rgba(59,130,246,0.10)]"
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
                ? "border-blue-400/30 bg-blue-500/[0.10] text-white"
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
        <div className="space-y-1">
          <label className="text-sm text-gray-300">Vad hände? (valfritt)</label>
          <input
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950/55 p-2.5 text-sm text-white outline-none focus:border-blue-300/35"
            value={failNoteInput}
            onChange={(e) => setFailNoteInput(e.target.value)}
            placeholder='t.ex. "tappade greppet" eller "ont i handleden"'
          />
        </div>
      )}
      </>
      ) : null}

      <div className="flex gap-2 pt-0.5">
        <button
       className="flex-1 rounded-2xl border border-blue-300/16 bg-blue-600/58 px-5 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(37,99,235,0.07)] transition hover:bg-blue-500/72 active:scale-[0.98]"
          onClick={addSet}
        >
          Lägg till set
        </button>

        <button
          className="rounded-2xl border border-white/[0.075] bg-white/[0.035] px-4 py-2 text-sm font-semibold text-white/64 transition hover:bg-white/[0.07] hover:text-white"
          onClick={removeLastSet}
          title="Ta bort senaste set"
        >
          Ångra set
        </button>
      </div>
    </div>
  );
}
