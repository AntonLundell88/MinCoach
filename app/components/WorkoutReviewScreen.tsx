"use client";

type WorkoutReviewData = {
  passLabel: string;
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  completedExerciseCount: number;
  isPartial: boolean;
  totalVolumeKg: number;
  totalVolumeText: string;
  bestSetText: string;
  coachHeadline: string;
  coachSummary: string;
  positives: string[];
  adjustments: string[];
  nextFocus: string[];
  progression: {
    improved: string[];
    same: string[];
    worse: string[];
  };
  coachMemoryTakeaway: string[];
};

type Props = {
  review: WorkoutReviewData;
  onClose: () => void;
};

const cardClassName =
  "rounded-[1.6rem] border border-white/[0.045] bg-white/[0.036] p-4 backdrop-blur-2xl";

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/[0.09] bg-slate-950/20 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-normal text-white">
        {value}
      </p>
    </div>
  );
}

function ReviewList({
  title,
  items,
  accent = false,
}: {
  title: string;
  items: string[];
  accent?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section
      className={
        accent
          ? "rounded-[1.6rem] border border-blue-300/18 bg-blue-500/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
          : cardClassName
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-white/82">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function WorkoutReviewScreen({ review, onClose }: Props) {
  const hasProgression =
    review.progression.improved.length > 0 ||
    review.progression.same.length > 0 ||
    review.progression.worse.length > 0;

  const reviewTitle = review.isPartial
    ? "Passet är sparat."
    : review.totalSets >= 10
    ? "Starkt jobb idag."
    : "Bra jobbat idag.";

  return (
    <div className="w-full max-w-none space-y-3 text-white sm:max-w-xl sm:space-y-4">
      <section className="rounded-[1.5rem] border border-white/[0.045] bg-white/[0.042] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/[0.07] text-sm font-semibold text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.11)]">
            C
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">
              Coachen
            </p>
            <p className="text-sm font-medium text-white/85">
              Passgenomgång
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm text-white/50">{review.passLabel}</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white">
            {reviewTitle}
          </h1>
          <p className="max-w-lg text-lg font-semibold leading-7 text-white">
            {review.coachHeadline}
          </p>
          <p className="max-w-lg text-base leading-7 text-white/76">
            {review.coachSummary}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Tid" value={`${review.durationMinutes} min`} />
        <StatCard label="Set" value={review.totalSets} />
        <StatCard
          label="Övningar"
          value={`${review.completedExerciseCount} / ${review.exerciseCount}`}
        />
        <StatCard label="Lyft totalt" value={review.totalVolumeText} />
        <StatCard label="Bästa set" value={review.bestSetText} />
      </section>

      <ReviewList title="Det coachen såg" items={review.positives} accent />

      {hasProgression ? (
        <section className={cardClassName}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Så rörde det sig
          </p>

          <div className="mt-3 space-y-3 text-sm leading-6 text-white/84">
            {review.progression.improved.length > 0 ? (
              <p>Ökade: {review.progression.improved.join(", ")}</p>
            ) : null}

            {review.progression.same.length > 0 ? (
              <p>Oförändrat: {review.progression.same.join(", ")}</p>
            ) : null}

            {review.progression.worse.length > 0 ? (
              <p>Backade: {review.progression.worse.join(", ")}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <ReviewList title="Nästa justering" items={review.adjustments} />
      <ReviewList title="Nästa pass" items={review.nextFocus} />
      <ReviewList title="Coachminne" items={review.coachMemoryTakeaway} />

      <button
        className="w-full rounded-2xl bg-[#2f6df6] py-4 font-semibold text-white transition hover:bg-[#4f83ff]"
        onClick={onClose}
      >
        Gå vidare
      </button>
    </div>
  );
}
