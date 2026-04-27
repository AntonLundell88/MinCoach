"use client";

type WorkoutHeaderData = {
  pass: string;
  gym: string;
  startedAt: string;
} | null;

type Props = {
  workout: WorkoutHeaderData;
  exerciseIndex: number;
  activePlan: string[];
  passLabel: string;
  formatTime: (d: Date) => string;
};

export default function WorkoutHeader({
  workout,
  exerciseIndex,
  activePlan,
  passLabel,
}: Props) {
  const displayLabel =
    passLabel && passLabel.trim().length > 0
      ? passLabel
      : workout
      ? `Pass ${workout.pass}`
      : "Pass";

  return (
    <div className="px-1">
      <p className="text-sm text-white/50">
        {displayLabel} · Övning {exerciseIndex + 1} av {activePlan.length}
      </p>
    </div>
  );
}