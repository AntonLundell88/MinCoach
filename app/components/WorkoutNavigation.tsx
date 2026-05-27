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
    <div className="space-y-2 rounded-[1.25rem] border border-white/[0.065] bg-white/[0.026] p-2 backdrop-blur-2xl">
      <button
        className="w-full rounded-2xl border border-blue-300/20 bg-blue-500/[0.14] px-4 py-2 text-sm font-semibold text-blue-50 shadow-[0_8px_22px_rgba(37,99,235,0.10)] transition hover:bg-blue-500/[0.20] active:scale-[0.98] disabled:border-white/[0.07] disabled:bg-white/[0.04] disabled:text-white/36 disabled:shadow-none"
        onClick={nextExercise}
        disabled={isLastExercise}
      >
        {isLastExercise ? "Sista övningen" : "Nästa övning"}
      </button>

      <button
        type="button"
        onClick={() => setShowMore((value) => !value)}
        className="mx-auto block rounded-full border border-white/[0.07] bg-white/[0.028] px-4 py-1.5 text-xs font-semibold text-white/54 transition hover:bg-white/[0.065] hover:text-white"
      >
        Mer
      </button>

      {showMore ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            className="rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-35"
            onClick={prevExercise}
            disabled={isFirstExercise}
          >
            Föregående
          </button>

          <button
            className="rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white"
            onClick={toggleAddExercise}
          >
            {showAddExercise ? "Stäng +" : "+ övning"}
          </button>

          <button
            className="rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white"
            onClick={finishWorkout}
          >
            Avsluta
          </button>
        </div>
      ) : null}
    </div>
  );
}
