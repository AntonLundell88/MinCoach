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
    <div className="space-y-3">
      <div className="flex gap-2.5">
        <button
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white hover:shadow-[0_0_16px_rgba(59,130,246,0.12)] active:scale-[0.98] disabled:opacity-40"
          onClick={prevExercise}
          disabled={exerciseIndex === 0}
        >
          Föregående
        </button>

        <button
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white hover:shadow-[0_0_16px_rgba(59,130,246,0.12)] active:scale-[0.98] disabled:opacity-40"
          onClick={nextExercise}
          disabled={exerciseIndex === activePlan.length - 1}
        >
          Nästa övning
        </button>
      </div>

      <button
        className="w-full rounded-2xl bg-blue-500/90 px-6 py-3.5 text-base font-semibold text-white shadow-[0_0_22px_rgba(59,130,246,0.35)] transition hover:bg-blue-400"
        onClick={finishWorkout}
      >
        Avsluta pass
      </button>
    </div>
  );
}