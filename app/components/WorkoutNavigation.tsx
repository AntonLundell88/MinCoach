"use client";

type Props = {
  exerciseIndex: number;
  activePlan: string[];
  prevExercise: () => void;
  nextExercise: () => void;
  finishWorkout: () => void;
};

export default function WorkoutNavigation({
  exerciseIndex,
  activePlan,
  prevExercise,
  nextExercise,
  finishWorkout,
}: Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-2xl border border-white/[0.09] bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:opacity-40"
          onClick={prevExercise}
          disabled={exerciseIndex === 0}
        >
          Föregående
        </button>

        <button
          className="flex-1 rounded-2xl border border-white/[0.09] bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:opacity-40"
          onClick={nextExercise}
          disabled={exerciseIndex === activePlan.length - 1}
        >
          Nästa övning
        </button>
      </div>

      <button
        className="w-full rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
        onClick={finishWorkout}
      >
        Spara och avsluta
      </button>
    </div>
  );
}
