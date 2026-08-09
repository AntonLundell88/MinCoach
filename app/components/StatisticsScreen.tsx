"use client";

import { useState } from "react";

type LoggedSet = {
  weight: number;
  reps: number;
  rir?: number;
  createdAt: string;
};

type LoggedExercise = {
  name: string;
  sets: LoggedSet[];
};

type WorkoutSummary = {
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
};

type Workout = {
  id: string;
  startedAt: string;
  displayName: string;
  exercises: LoggedExercise[];
  summary?: WorkoutSummary;
};

type WeekStats = {
  key: string;
  label: string;
  passCount: number;
  totalSets: number;
  totalMinutes: number;
};

type ChartMode = "days" | "weeks" | "year";

type Props = {
  history: Workout[];
  onBack: () => void;
  onOpenExercises: (exerciseName?: string) => void;
};

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "-";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

function getWeekStart(date: Date) {
  const next = new Date(date);
  const day = (next.getDay() + 6) % 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day);
  return next;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekKey(date: Date) {
  return toLocalDateKey(getWeekStart(date));
}

function getWeekLabel(date: Date) {
  const start = getWeekStart(date);
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
  }).format(start);
}

function getDayKey(date: Date) {
  return toLocalDateKey(date);
}

function getDayLabel(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
  }).format(date);
}

function makeEmptyStats(key: string, label: string): WeekStats {
  return {
    key,
    label,
    passCount: 0,
    totalSets: 0,
    totalMinutes: 0,
  };
}

function addWorkoutToStats(bucket: WeekStats, workout: Workout) {
  bucket.passCount += 1;
  bucket.totalSets += workout.summary?.totalSets ?? 0;
  bucket.totalMinutes += workout.summary?.durationMinutes ?? 0;
}

function getLastDays(history: Workout[], dayCount = 7): WeekStats[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (dayCount - index - 1));
    return makeEmptyStats(getDayKey(date), getDayLabel(date));
  });

  const byKey = new Map(days.map((day) => [day.key, day]));

  history.forEach((workout) => {
    const key = getDayKey(new Date(workout.startedAt));
    const day = byKey.get(key);
    if (!day) return;

    addWorkoutToStats(day, workout);
  });

  return days;
}

function getLastWeeks(history: Workout[], weekCount = 6): WeekStats[] {
  const now = new Date();
  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (weekCount - index - 1) * 7);
    const start = getWeekStart(date);

    return makeEmptyStats(getWeekKey(start), getWeekLabel(start));
  });

  const byKey = new Map(weeks.map((week) => [week.key, week]));

  history.forEach((workout) => {
    const key = getWeekKey(new Date(workout.startedAt));
    const week = byKey.get(key);
    if (!week) return;

    addWorkoutToStats(week, workout);
  });

  return weeks;
}

function getLastMonths(history: Workout[], monthCount = 12): WeekStats[] {
  const now = new Date();
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (monthCount - index - 1), 1);
    return makeEmptyStats(getMonthKey(date), getMonthLabel(date));
  });

  const byKey = new Map(months.map((month) => [month.key, month]));

  history.forEach((workout) => {
    const key = getMonthKey(new Date(workout.startedAt));
    const month = byKey.get(key);
    if (!month) return;

    addWorkoutToStats(month, workout);
  });

  return months;
}

function getChartConfig(mode: ChartMode) {
  if (mode === "days") {
    return {
      statLabel: "Senaste 7 dagar",
      eyebrow: "Senaste 7 dagar",
      title: "Set per dag",
      helper: "Antal loggade arbetsset.",
      activeLabel: "Mest aktiva dag",
    };
  }

  if (mode === "year") {
    return {
      statLabel: "Senaste 12 månader",
      eyebrow: "Senaste 12 månader",
      title: "Set per månad",
      helper: "Antal loggade arbetsset.",
      activeLabel: "Mest aktiva månad",
    };
  }

  return {
    statLabel: "Senaste 6 veckor",
    eyebrow: "Senaste 6 veckor",
    title: "Set per vecka",
    helper: "Antal loggade arbetsset.",
    activeLabel: "Mest aktiva vecka",
  };
}

function getPeriodStart(mode: ChartMode) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (mode === "days") {
    now.setDate(now.getDate() - 6);
    return now;
  }

  if (mode === "year") {
    return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }

  const start = getWeekStart(now);
  start.setDate(start.getDate() - 5 * 7);
  return start;
}

function getPeriodHistory(history: Workout[], mode: ChartMode) {
  const periodStart = getPeriodStart(mode).getTime();

  return history.filter(
    (workout) => new Date(workout.startedAt).getTime() >= periodStart
  );
}

function getAllSets(history: Workout[]) {
  return history.flatMap((workout) =>
    workout.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => ({
        ...set,
        exerciseName: exercise.name,
      }))
    )
  );
}

function getMostTrainedExercise(history: Workout[]) {
  const counts = new Map<string, number>();

  history.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const setCount = exercise.sets.length;
      if (setCount === 0) return;
      counts.set(exercise.name, (counts.get(exercise.name) ?? 0) + setCount);
    });
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
}

function SetChart({ items }: { items: WeekStats[] }) {
  const maxSets = Math.max(...items.map((item) => item.totalSets), 1);

  return (
    <div className="h-40 rounded-[1.25rem] border border-white/[0.09] bg-slate-950/18 p-3 sm:h-48">
      <div className="flex h-full items-end gap-2">
        {items.map((item) => {
          const height = Math.max((item.totalSets / maxSets) * 100, item.totalSets > 0 ? 12 : 4);

          return (
            <div key={item.key} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className="flex flex-1 items-end">
                <div
                  className="w-full rounded-t-xl border border-blue-300/15 bg-[linear-gradient(180deg,rgba(96,165,250,0.72),rgba(37,99,235,0.18))]"
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-white">
                  {item.totalSets}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/34">
                  {item.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StatisticsScreen({
  history,
  onBack,
  onOpenExercises,
}: Props) {
  const [chartMode, setChartMode] = useState<ChartMode>("weeks");
  const periodHistory = getPeriodHistory(history, chartMode);
  const allSets = getAllSets(periodHistory);
  const totalPasses = periodHistory.length;
  const totalSets = periodHistory.reduce(
    (sum, workout) => sum + (workout.summary?.totalSets ?? 0),
    0
  );
  const totalMinutes = periodHistory.reduce(
    (sum, workout) => sum + (workout.summary?.durationMinutes ?? 0),
    0
  );
  const rirValues = allSets
    .map((set) => set.rir)
    .filter((rir): rir is number => typeof rir === "number");
  const averageRir =
    rirValues.length > 0
      ? (rirValues.reduce((sum, rir) => sum + rir, 0) / rirValues.length).toFixed(1)
      : "-";
  const mostTrained = getMostTrainedExercise(periodHistory);
  const days = getLastDays(history);
  const weeks = getLastWeeks(history);
  const months = getLastMonths(history);
  const chartItems =
    chartMode === "days" ? days : chartMode === "year" ? months : weeks;
  const chartConfig = getChartConfig(chartMode);
  const mostActiveBucket = chartItems.reduce<WeekStats>((best, item) =>
    item.totalSets > best.totalSets ? item : best,
    chartItems[0]
  );
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-4 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.06),transparent_28%),linear-gradient(180deg,#0b1018_0%,#111a25_45%,#0b1018_100%)]" />

      <div className="flex items-center justify-between gap-3 pt-1 sm:pt-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/45">
            Statistik
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Min utveckling
          </h1>
        </div>

        <button
          onClick={onBack}
          className="rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07]"
        >
          Tillbaka
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-white/[0.09] bg-white/[0.052] p-1 backdrop-blur-xl">
        {[
          ["days", "Dagar"],
          ["weeks", "Veckor"],
          ["year", "År"],
        ].map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setChartMode(mode as ChartMode)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              chartMode === mode
                ? "bg-blue-500/[0.14] text-blue-100"
                : "text-white/45 hover:text-white/75"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-white/45">{chartConfig.statLabel}</p>

      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Pass", totalPasses.toString(), "totalt"],
          ["Set", totalSets.toString(), "loggade"],
          ["Tid", formatMinutes(totalMinutes), "träning"],
          ["RIR", averageRir, "snitt"],
        ].map(([label, value, helper]) => (
          <div
            key={label}
            className="rounded-[1.25rem] border border-white/[0.09] bg-white/[0.052] p-3.5 backdrop-blur-xl"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {label}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
              {value}
            </p>
            <p className="mt-1 text-sm text-white/50">{helper}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                {chartConfig.eyebrow}
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">
                {chartConfig.title}
              </h2>
              <p className="mt-1 text-sm text-white/48">
                {chartConfig.helper}
              </p>
            </div>

          </div>

          <SetChart items={chartItems} />
        </div>

        <div className="space-y-4">
          <button
            onClick={() => mostTrained && onOpenExercises(mostTrained[0])}
            className="w-full rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 text-left shadow-[0_14px_34px_rgba(0,0,0,0.14)] backdrop-blur-xl transition hover:border-white/16 hover:bg-white/[0.06] sm:p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Mest körda övning
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
              {mostTrained ? mostTrained[0] : "-"}
            </p>
            <p className="mt-1 text-sm text-white/55">
              {mostTrained ? `${mostTrained[1]} set · visa progression` : "Inga set än"}
            </p>
          </button>

          <div className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {chartConfig.activeLabel}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
              {mostActiveBucket.totalSets > 0 ? mostActiveBucket.label : "-"}
            </p>
            <p className="mt-1 text-sm text-white/55">
              {mostActiveBucket.totalSets > 0
                ? `${mostActiveBucket.passCount} pass · ${mostActiveBucket.totalSets} set`
                : "När pass sparas syns det här."}
            </p>
          </div>
        </div>
      </section>

      {history.length > 0 ? (
        <section className="mt-4 rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Övningar
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">
                Gå djupare per övning
              </h2>
            </div>

            <button
              onClick={() => onOpenExercises()}
              className="w-full rounded-xl bg-[#2f6df6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4f83ff] sm:w-auto"
            >
              Visa övningar
            </button>
          </div>
        </section>
      ) : null}

      {history.length === 0 ? (
        <section className="mt-4 rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Inga pass än
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
            När första passet är sparat börjar rytmen synas här.
          </h2>
        </section>
      ) : null}
    </div>
  );
}
