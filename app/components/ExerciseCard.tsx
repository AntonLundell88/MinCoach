"use client";
import { useEffect, useState } from "react";
import { getExerciseProfile } from "../lib/exercises";

type LastByExercise = Record<
  string,
  {
    weight: number;
    reps: number;
    rir: number | null;
    failNote: string | null;
    updatedAt: string;
  }
>;

type PersonalRecord = {
  exerciseName: string;
  weight: number;
  reps: number;
  createdAt: string;
};

type PersonalRecords = Record<string, PersonalRecord>;

type Props = {
  currentExerciseName: string;
  lastByExercise: LastByExercise;
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
  onSkipExercise: () => void;
  canSkipExercise: boolean;
  skippedExerciseName: string | null;
  undoSkipExercise: () => void;
  personalRecords: PersonalRecords;
};

export default function ExerciseCard({
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
  onSkipExercise,
  canSkipExercise,
  skippedExerciseName,
  undoSkipExercise,
  personalRecords,
}: Props) {
  const [showRirInfo, setShowRirInfo] = useState(false);
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  const exerciseInfo = getExerciseProfile(currentExerciseName);
  const adjustReps = (delta: number) => {
    const current = Number(repsInput);
    const next = Number.isFinite(current)
      ? Math.max(0, current + delta)
      : delta > 0
      ? 1
      : 0;

    setRepsInput(String(next));
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
  
 return (
  <div className="space-y-2 rounded-[1.35rem] border border-white/[0.09] bg-white/[0.052] p-3 shadow-[0_14px_36px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
    {skippedExerciseName ? (
      <div className="rounded-2xl border border-white/[0.09] bg-slate-950/18 px-3 py-3">
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
          <p className="min-w-0 truncate text-lg font-semibold tracking-tight">
            {currentExerciseName}
          </p>
          <button
            type="button"
            onClick={() => setShowExerciseInfo(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-xs font-semibold text-white/58 transition hover:bg-white/[0.08] hover:text-white"
            aria-label={`Visa info om ${currentExerciseName}`}
          >
            i
          </button>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-lg border border-white/[0.09] bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/72 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          onClick={onSkipExercise}
          disabled={!canSkipExercise}
        >
          Hoppa över
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-lg leading-none text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                onClick={() => setShowExerciseInfo(false)}
                aria-label="Stäng"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/42">
                {exerciseInfo.equipment}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {exerciseInfo.detail}
              </p>
              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] p-2.5">
                <p className="text-xs leading-5 text-white/66">
                  {exerciseInfo.techniqueCue}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/44">
                  {exerciseInfo.progressionRule}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {(() => {
        const lastForUI = lastByExercise[exerciseKey(currentExerciseName)];
        const prForUI = personalRecords[exerciseKey(currentExerciseName)];

        return (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {prForUI ? (
              <div className="rounded-full border border-amber-200/18 bg-amber-200/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_0_18px_rgba(251,191,36,0.06)]">
                Personbästa {prForUI.weight} × {prForUI.reps}
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

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-300">Vikt (kg)</label>
          <input
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950/55 px-3 py-2 text-base font-semibold text-white outline-none focus:border-blue-300/35"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="t.ex. 80"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-300">Reps</label>
          <div className="grid grid-cols-[2.35rem_1fr_2.35rem] overflow-hidden rounded-xl border border-white/[0.09] bg-slate-950/55 focus-within:border-blue-300/35">
            <button
              type="button"
              onClick={() => adjustReps(-1)}
              className="border-r border-white/[0.08] text-lg font-semibold text-white/68 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Minska reps"
            >
              −
            </button>
            <input
              className="min-w-0 bg-transparent px-3 py-2 text-center text-base font-semibold text-white outline-none"
              inputMode="numeric"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
              placeholder="t.ex. 5"
            />
            <button
              type="button"
              onClick={() => adjustReps(1)}
              className="border-l border-white/[0.08] text-lg font-semibold text-white/68 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Öka reps"
            >
              +
            </button>
          </div>
        </div>
      </div>

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

<div className="mt-1.5 grid grid-cols-6 gap-1">
  {[0, 1, 2, 3, 4, 5].map((value) => {
    const isActive = rirInput === value;

    return (
      <button
        key={value}
        type="button"
        onClick={() => setRirInput(value)}
        className={`rounded-lg border px-2 py-1.5 text-sm font-semibold transition ${
          isActive
            ? "border-blue-400/25 bg-blue-500/[0.14] text-white"
            : "border-white/[0.09] bg-slate-950/38 text-white/75 hover:bg-white/5 hover:text-white"
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

      <div className="flex gap-2">
        <button
       className="flex-1 rounded-xl border border-blue-500/20 bg-[#2f6df6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4f83ff] active:scale-[0.98]"
          onClick={addSet}
        >
          Lägg till set
        </button>

        <button
          className="rounded-xl border border-white/[0.09] bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          onClick={removeLastSet}
          title="Ta bort senaste set"
        >
          Ångra
        </button>
      </div>
    </div>
  );
}
