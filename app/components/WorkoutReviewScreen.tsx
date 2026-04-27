"use client";

type WorkoutReviewData = {
  passLabel: string;
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  bestSetText: string;
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
  "rounded-3xl border border-white/10 bg-black/30 p-4 space-y-3 backdrop-blur-sm";

export default function WorkoutReviewScreen({
  review,
  onClose,
}: Props) {
  return (
    <div className="w-full max-w-md space-y-4">
      <div className="rounded-3xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),rgba(24,24,27,0.92)_38%,rgba(10,10,15,0.98)_100%)] p-5 space-y-4 shadow-[0_0_80px_rgba(59,130,246,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-sm font-semibold text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.18)]">
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

        <div className="space-y-2">
          <p className="text-sm text-white/50">{review.passLabel}</p>
          <h1 className="text-2xl font-semibold text-white">
            Bra jobbat. Här är min genomgång.
          </h1>
          <p className="text-base leading-relaxed text-white/85">
            {review.coachSummary}
          </p>
        </div>
      </div>

      <div className={cardClassName}>
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">
          Snabb överblick
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p className="text-white/45">Tid</p>
            <p className="text-white">{review.durationMinutes} min</p>
          </div>

          <div>
            <p className="text-white/45">Totala set</p>
            <p className="text-white">{review.totalSets}</p>
          </div>

          <div>
            <p className="text-white/45">Övningar</p>
            <p className="text-white">{review.exerciseCount}</p>
          </div>

          <div>
            <p className="text-white/45">Bästa set</p>
            <p className="truncate text-white">{review.bestSetText}</p>
          </div>
        </div>
      </div>

      <div className={cardClassName}>
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">
          Det som gick bra
        </p>

        <ul className="space-y-2 text-sm text-white/80">
          {review.positives.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
<div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
    Progression från förra passet
  </p>

  <div className="mt-3 space-y-3 text-sm text-white/85">
    {review.progression.improved.length > 0 ? (
      <div>
        <p className="text-white/45">Ökade</p>
        <p className="mt-1">
          {review.progression.improved.join(", ")}
        </p>
      </div>
    ) : null}

    {review.progression.same.length > 0 ? (
      <div>
        <p className="text-white/45">Oförändrat</p>
        <p className="mt-1">
          {review.progression.same.join(", ")}
        </p>
      </div>
    ) : null}

    {review.progression.worse.length > 0 ? (
      <div>
        <p className="text-white/45">Backade</p>
        <p className="mt-1">
          {review.progression.worse.join(", ")}
        </p>
      </div>
    ) : null}

    {review.progression.improved.length === 0 &&
    review.progression.same.length === 0 &&
    review.progression.worse.length === 0 ? (
      <p className="text-white/70">
        Inte tillräckligt med historik ännu för att jämföra passet.
      </p>
    ) : null}
  </div>
</div>

      <div className={cardClassName}>
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">
          Det vi justerar
        </p>

        <ul className="space-y-2 text-sm text-white/80">
          {review.adjustments.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>

      <div className={cardClassName}>
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">
          Till nästa gång
        </p>

        <ul className="space-y-2 text-sm text-white/80">
          {review.nextFocus.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
    Coachen tar med sig
  </p>

  <div className="mt-3 space-y-2">
    {review.coachMemoryTakeaway.map((item, index) => (
      <p key={index} className="text-sm leading-relaxed text-white/82">
        {item}
      </p>
    ))}
  </div>
</div>

      <button
        className="w-full rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,1),rgba(37,99,235,0.9))] py-4 font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] transition hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)]"
        onClick={onClose}
      >
        Gå vidare
      </button>
    </div>
  );
}