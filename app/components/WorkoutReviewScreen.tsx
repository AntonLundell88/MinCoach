"use client";
import { useState } from "react";

type ReviewSet = {
  weight: number;
  reps: number;
  rir?: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  setIndex: number;
  exerciseKey: string;
};

type ReviewExercise = {
  name: string;
  sets: ReviewSet[];
};

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
  loggedExercises: ReviewExercise[];
  workoutId: string;
  passKey: string;
  startedAt: string;
};

type EditedSet = {
  weight: string;
  reps: string;
  rir: string;
};

type Props = {
  review: WorkoutReviewData;
  onClose: () => void;
  onEditSet?: (
    exerciseName: string,
    setIndex: number,
    exerciseKey: string,
    updated: { weight: number; reps: number; rir?: number }
  ) => void;
};

function uniqueItems(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function formatSet(set: ReviewSet): string {
  if (set.metricType === "time" && set.durationSeconds != null) {
    const mins = Math.floor(set.durationSeconds / 60);
    const secs = set.durationSeconds % 60;
    const time = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs} s`;
    return set.weight > 0 ? `${time} · ${set.weight} kg` : time;
  }
  const weightStr = set.weight > 0 ? `${set.weight} kg × ` : "× ";
  const rirStr = set.rir != null ? ` · RIR ${set.rir}` : "";
  return `${weightStr}${set.reps}${rirStr}`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
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

function SetRow({
  set,
  exerciseName,
  onEdit,
}: {
  set: ReviewSet;
  exerciseName: string;
  onEdit?: Props["onEditSet"];
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<EditedSet>({
    weight: String(set.weight),
    reps: String(set.reps),
    rir: set.rir != null ? String(set.rir) : "",
  });

  if (editing) {
    const handleSave = () => {
      const weight = parseFloat(values.weight.replace(",", "."));
      const reps = parseInt(values.reps, 10);
      const rir = values.rir.trim() !== "" ? parseInt(values.rir, 10) : undefined;
      if (!Number.isFinite(weight) || !Number.isFinite(reps)) return;
      onEdit?.(exerciseName, set.setIndex, set.exerciseKey, { weight, reps, rir });
      setEditing(false);
    };

    return (
      <div className="relative space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5">
        <button
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white/40 transition hover:text-white/80"
          onClick={() => setEditing(false)}
          aria-label="Stäng"
        >
          ✕
        </button>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="mb-1 text-[10px] text-white/40">Vikt (kg)</p>
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/40 px-2 py-1.5 text-center text-sm font-semibold text-white outline-none focus:border-blue-400/40"
              inputMode="decimal"
              value={values.weight}
              onChange={(e) => setValues((v) => ({ ...v, weight: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] text-white/40">Reps</p>
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/40 px-2 py-1.5 text-center text-sm font-semibold text-white outline-none focus:border-blue-400/40"
              inputMode="numeric"
              value={values.reps}
              onChange={(e) => setValues((v) => ({ ...v, reps: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] text-white/40">RIR</p>
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-slate-950/40 px-2 py-1.5 text-center text-sm font-semibold text-white outline-none focus:border-blue-400/40"
              inputMode="numeric"
              value={values.rir}
              onChange={(e) => setValues((v) => ({ ...v, rir: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg border border-white/[0.07] bg-white/[0.04] py-1.5 text-xs font-semibold text-white/60 transition hover:text-white"
            onClick={() => setEditing(false)}
          >
            Avbryt
          </button>
          <button
            className="flex-1 rounded-lg bg-blue-600/70 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            onClick={handleSave}
          >
            Spara
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="w-full rounded-lg px-1 py-0.5 text-left text-sm text-white/80 transition hover:bg-white/[0.04] hover:text-white"
      onClick={() => onEdit && setEditing(true)}
    >
      {formatSet(set)}
    </button>
  );
}

export default function WorkoutReviewScreen({ review, onClose, onEditSet }: Props) {
  const title = review.isPartial
    ? "Passet är sparat."
    : review.totalSets >= 10
    ? "Starkt jobbat idag."
    : "Bra jobbat idag.";

  const takeaways = uniqueItems(review.positives).slice(0, 3);
  const memoryItems = uniqueItems(review.coachMemoryTakeaway).slice(0, 2);
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

      {(review.loggedExercises ?? []).length > 0 && (
        <section className="rounded-[1.45rem] border border-white/[0.06] bg-white/[0.032] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/35">
            Dagens set
          </p>
          <div className="mt-3 space-y-4">
            {(review.loggedExercises ?? []).map((ex) => (
              <div key={ex.name}>
                <p className="text-xs font-semibold text-white/55">{ex.name}</p>
                <div className="mt-1 space-y-1">
                  {ex.sets.map((set) => (
                    <SetRow
                      key={set.setIndex}
                      set={set}
                      exerciseName={ex.name}
                      onEdit={onEditSet}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {onEditSet && (
            <p className="mt-3 text-[10px] text-white/25">Tryck på ett set för att redigera</p>
          )}
        </section>
      )}

      <SimpleList title="Sparat till coachen" items={memoryItems} />

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
