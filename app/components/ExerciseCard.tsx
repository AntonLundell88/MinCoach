"use client";
import { useEffect, useState } from "react";

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
  personalRecords: PersonalRecords;
  progression: { weight: number; reps: number }[];
  
};

export default function ExerciseCard({
  currentExerciseName,
  lastByExercise,
  exerciseKey,
  weightInput,
  setWeightInput,
  repsInput,
  progression,
  setRepsInput,
  rirInput,
  setRirInput,
  didFailInput,
  setDidFailInput,
  failNoteInput,
  setFailNoteInput,
  addSet,
  removeLastSet,
  personalRecords,
}: Props) {
  const [showRirInfo, setShowRirInfo] = useState(false);
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
  <div className="rounded-3xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),rgba(24,24,27,0.88)_38%,rgba(10,10,15,0.94)_100%)] p-4 space-y-3 shadow-[0_0_50px_rgba(59,130,246,0.14),inset_0_1px_0_rgba(255,255,255,0.04)]">
    <div>
      <p className="text-2xl font-semibold tracking-tight">{currentExerciseName}</p>

      {(() => {
        const lastForUI = lastByExercise[exerciseKey(currentExerciseName)];
        const prForUI = personalRecords[exerciseKey(currentExerciseName)];

        return (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {lastForUI ? (
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                Senast {lastForUI.weight} × {lastForUI.reps}
              </div>
            ) : (
              <div className="rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-xs text-gray-400">
                Senast –
              </div>
            )}

            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
              RIR {lastForUI?.rir ?? "—"}
            </div>

            {prForUI ? (
              <div className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.18)]">
                PR {prForUI.weight} × {prForUI.reps}
              </div>
            ) : (
              <div className="rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-xs text-gray-400">
                PR –
              </div>
            )}

         {lastForUI?.rir === 0 && lastForUI.failNote && (
  <div className="mt-1 rounded-2xl border border-orange-400/20 bg-[radial-gradient(circle_at_left,rgba(251,146,60,0.12),rgba(10,10,15,0.6))] px-3 py-2 text-sm text-orange-100/90 shadow-[0_0_20px_rgba(251,146,60,0.08)]">
    <span className="font-medium text-orange-200">Senaste fail:</span>{" "}
    {lastForUI.failNote}
  </div>
)}
          </div>
        );
      })()}
{progression.length > 0 && (
  <div className="mt-3">
    <p className="text-xs uppercase tracking-wide text-gray-500">Progression</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {progression.map((p, i) => (
        <span
          key={`${p.weight}-${p.reps}-${i}`}
          className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-gray-300"
        >
          {p.weight} × {p.reps}
        </span>
      ))}
    </div>
  </div>
)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm text-gray-300">Vikt (kg)</label>
          <input
            className="w-full rounded-xl bg-black border border-zinc-700 p-3"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="t.ex. 80"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-300">Reps</label>
          <input
            className="w-full rounded-xl bg-black border border-zinc-700 p-3"
            inputMode="numeric"
            value={repsInput}
            onChange={(e) => setRepsInput(e.target.value)}
            placeholder="t.ex. 5"
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
  <label className="text-sm text-gray-300">
    RIR (reps kvar i tanken)
  </label>

  <button
    type="button"
    onClick={() => setShowRirInfo(!showRirInfo)}
    className="text-xs text-gray-400 border border-zinc-600 rounded-full w-5 h-5 flex items-center justify-center hover:bg-zinc-700"
  >
    i
  </button>
</div>

{showRirInfo && (
  <div className="text-xs text-gray-300 bg-black/40 border border-zinc-700 rounded-xl p-3 mt-2">
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

<div className="mt-2 grid grid-cols-6 gap-2">
  {[0, 1, 2, 3, 4, 5].map((value) => {
    const isActive = rirInput === value;

    return (
      <button
        key={value}
        type="button"
        onClick={() => setRirInput(value)}
        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
          isActive
            ? "border-blue-400/30 bg-blue-500/15 text-white shadow-[0_0_18px_rgba(59,130,246,0.14)]"
            : "border-white/10 bg-black/30 text-white/75 hover:bg-white/5 hover:text-white"
        }`}
      >
        {value === 5 ? "5+" : value}
      </button>
    );
  })}
</div>
      </div>
{rirInput <= 1 ? (
  <label className="mt-3 flex items-center gap-3 text-sm text-white/85">
    <input
      type="checkbox"
      checked={didFailInput}
      onChange={(e) => setDidFailInput(e.target.checked)}
      className="h-4 w-4 rounded border border-white/20 bg-black/30"
    />
    <span>Setet gick till failure</span>
  </label>
) : null}
{didFailInput ? (
  <div className="mt-2 space-y-2">a
    <p className="text-sm text-white/75">Varför tog det stopp?</p>

    <div className="grid grid-cols-2 gap-2">
      {["grepp", "teknik", "ork", "smärta"].map((reason) => {
        const isActive = failNoteInput === reason;

        return (
          <button
            key={reason}
            type="button"
            onClick={() => setFailNoteInput(reason)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "border-blue-400/30 bg-blue-500/15 text-white"
                : "border-white/10 bg-black/30 text-white/75 hover:bg-white/5 hover:text-white"
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
            className="w-full rounded-xl bg-black border border-zinc-700 p-3"
            value={failNoteInput}
            onChange={(e) => setFailNoteInput(e.target.value)}
            placeholder='t.ex. "tappade greppet" eller "ont i handleden"'
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
       className="flex-1 rounded-2xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),rgba(37,99,235,0.9))] px-6 py-3 text-base font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.25)] hover:shadow-[0_0_40px_rgba(59,130,246,0.35)] hover:brightness-110 active:scale-[0.98] transition"
          onClick={addSet}
        >
          Lägg till set
        </button>

        <button
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-5 py-3 text-base font-semibold text-white/80 hover:bg-white/10 hover:text-white hover:shadow-[0_0_18px_rgba(59,130,246,0.12)] transition"
          onClick={removeLastSet}
          title="Ta bort senaste set"
        >
          Ångra
        </button>
      </div>
    </div>
  );
}