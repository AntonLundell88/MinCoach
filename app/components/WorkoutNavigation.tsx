"use client";

import { useState } from "react";

type Props = {
  exerciseIndex: number;
  activePlan: string[];
  showAddExercise: boolean;
  toggleAddExercise: () => void;
  prevExercise: () => void;
  nextExercise: () => void;
  finishWorkout: () => void;
};

export default function WorkoutNavigation({
  exerciseIndex,
  activePlan,
  showAddExercise,
  toggleAddExercise,
  prevExercise,
  nextExercise,
  finishWorkout,
}: Props) {
  const [showMore, setShowMore] = useState(false);
  const isFirstExercise = exerciseIndex === 0;
  const isLastExercise = exerciseIndex === activePlan.length - 1;

  return (
    <div className="rounded-[1.25rem] border border-white/[0.065] bg-white/[0.022] p-2 backdrop-blur-2xl">
      <div className="grid grid-cols-[2.8rem_1fr_2.8rem] gap-2">
        <button
          className="rounded-2xl border border-white/[0.075] bg-white/[0.035] text-lg font-semibold text-white/44 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-25"
          onClick={prevExercise}
          disabled={isFirstExercise}
          aria-label="Föregående övning"
        >
          ‹
        </button>

        <button
          className={`rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-[0_8px_22px_rgba(37,99,235,0.10)] transition active:scale-[0.985] ${
            isLastExercise
              ? "border border-emerald-300/24 bg-emerald-400/[0.15] text-emerald-50 hover:bg-emerald-400/[0.20]"
              : "border border-blue-300/20 bg-blue-500/[0.14] text-blue-50 hover:bg-blue-500/[0.20]"
          }`}
          onClick={isLastExercise ? finishWorkout : nextExercise}
        >
          {isLastExercise ? "Avsluta passet" : "Nästa övning"}
        </button>

        <button
          type="button"
          onClick={() => setShowMore((value) => !value)}
          className="rounded-2xl border border-white/[0.075] bg-white/[0.035] text-xs font-semibold text-white/54 transition hover:bg-white/[0.07] hover:text-white"
          aria-label="Visa fler val"
        >
          Mer
        </button>
      </div>

      {showMore ? (
        <div className={`mt-2 grid gap-2 ${isLastExercise ? "grid-cols-1" : "grid-cols-2"}`}>
          <button
            className="rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white"
            onClick={toggleAddExercise}
          >
            {showAddExercise ? "Stäng lägg till" : "Lägg till övning"}
          </button>

          {!isLastExercise ? (
            <button
              className="rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white"
              onClick={finishWorkout}
            >
              Spara och avsluta
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
