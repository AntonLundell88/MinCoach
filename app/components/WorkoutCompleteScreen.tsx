"use client";

type WorkoutCompleteReview = {
  passLabel: string;
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  completedExerciseCount: number;
  totalVolumeKg: number;
  totalVolumeText: string;
  bestSetText: string;
  coachSummary: string;
  progression: {
    improved: string[];
  };
};

type Props = {
  onDone: () => void;
  isPartial: boolean;
  review?: WorkoutCompleteReview | null;
};

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.045] bg-slate-950/14 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-semibold tracking-[-0.03em] text-white">
        {value}
      </p>
    </div>
  );
}

export default function WorkoutCompleteScreen({
  onDone,
  isPartial,
  review,
}: Props) {
  const improved = review?.progression.improved ?? [];

  return (
    <div className="w-full max-w-none space-y-3 text-white sm:max-w-xl sm:space-y-4">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/[0.045] bg-white/[0.04] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/45">
          Pass klart
        </p>

        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] text-white">
          {isPartial ? "Passet sparat." : "Bra jobbat idag."}
        </h1>

        <p className="mt-4 text-base leading-7 text-white/78">
          {review?.coachSummary ??
            (isPartial
              ? "Nästa pass tar vi från början."
              : "Passet är sparat. Bra jobb idag.")}
        </p>
      </section>

      {review ? (
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Tid" value={`${review.durationMinutes} min`} />
          <StatCard label="Set" value={review.totalSets} />
          <StatCard
            label="Övningar"
            value={`${review.completedExerciseCount} / ${review.exerciseCount}`}
          />
          <StatCard label="Flyttat" value={review.totalVolumeText} />
          <StatCard label="Bästa set" value={review.bestSetText} />
        </section>
      ) : null}

      {improved.length > 0 ? (
        <section className="rounded-[1.6rem] border border-white/[0.045] bg-slate-950/14 p-4 backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Ökade idag
          </p>
          <p className="mt-3 text-lg font-semibold leading-6 text-white">
            {improved.join(", ")}
          </p>
        </section>
      ) : null}

      <button
        className="w-full rounded-2xl bg-[#2f6df6] py-4 font-semibold text-white transition hover:bg-[#4f83ff]"
        onClick={onDone}
      >
        Till lobbyn
      </button>
    </div>
  );
}
