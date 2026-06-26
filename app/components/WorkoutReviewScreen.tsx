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

function uniqueItems(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/[0.07] bg-slate-950/18 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-semibold tracking-normal text-white">
        {value}
      </p>
    </div>
  );
}

function SimpleList({
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
          ? "rounded-[1.45rem] border border-blue-300/18 bg-blue-500/[0.055] p-4 shadow-[inset_3px_0_0_rgba(59,130,246,0.72),0_14px_34px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.045)]"
          : "rounded-[1.45rem] border border-white/[0.06] bg-white/[0.032] p-4"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-blue-100/50">
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
  const title = review.isPartial
    ? "Passet är sparat."
    : review.totalSets >= 10
    ? "Starkt jobbat idag."
    : "Bra jobbat idag.";

  const takeaways = uniqueItems([
    ...review.coachMemoryTakeaway,
    ...review.positives,
  ]).slice(0, 3);

  const nextTime = uniqueItems(
    review.nextFocus.length > 0 ? review.nextFocus : review.adjustments
  ).slice(0, 2);

  return (
    <div className="w-full max-w-none space-y-3 text-white sm:max-w-xl sm:space-y-4">
      <section className="rounded-[1.5rem] border border-white/[0.045] bg-white/[0.042] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/45">
          Pass klart
        </p>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-white/48">{review.passLabel}</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white">
            {title}
          </h1>
          <p className="max-w-lg text-base leading-7 text-white/76">
            {review.coachSummary}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Tid" value={`${review.durationMinutes} min`} />
        <StatCard label="Set" value={review.totalSets} />
        <StatCard label="Bästa set" value={review.bestSetText} />
        <StatCard label="Lyft totalt" value={review.totalVolumeText} />
      </section>

      <SimpleList title="Detta tar vi med oss" items={takeaways} accent />
      <SimpleList title="Nästa gång" items={nextTime} />

      <section className="rounded-[1.45rem] border border-white/[0.06] bg-white/[0.032] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/35">
          Till nästa pass
        </p>
        <p className="mt-3 text-sm leading-6 text-white/76">
          Mat, vatten och sömn nu. Det är där nästa pass börjar.
        </p>
      </section>

      <button
        className="w-full rounded-2xl bg-[#2f6df6] py-4 font-semibold text-white transition hover:bg-[#4f83ff]"
        onClick={onClose}
      >
        Till lobbyn
      </button>
    </div>
  );
}
