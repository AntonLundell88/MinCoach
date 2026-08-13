"use client";

import { useState } from "react";
import { exerciseKey, getExerciseProfile } from "../lib/exercises";

type LoggedSet = {
  weight: number;
  reps: number;
  rir?: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
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

export type WeekStats = {
  key: string;
  label: string;
  passCount: number;
  totalSets: number;
  totalMinutes: number;
  totalVolume: number;
};

type ChartMode = "days" | "weeks" | "year";
type ChartMetric = "sets" | "volume";

type Props = {
  history: Workout[];
  onBack: () => void;
  onOpenExercises: (exerciseName?: string) => void;
  onOpenHistory: () => void;
};

export function formatMinutes(minutes: number) {
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

export function getMonthKey(date: Date) {
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
    totalVolume: 0,
  };
}

function getSetVolume(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") return 0;
  return set.weight * set.reps;
}

function addWorkoutToStats(bucket: WeekStats, workout: Workout) {
  bucket.passCount += 1;
  bucket.totalSets += workout.summary?.totalSets ?? 0;
  bucket.totalMinutes += workout.summary?.durationMinutes ?? 0;
  bucket.totalVolume += workout.exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.reduce((setSum, set) => setSum + getSetVolume(set), 0),
    0
  );
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

// Rör inte getLastMonths ovan (den "year"-chartläget bygger på) — filtrerar
// historiken direkt på månadsnyckel istället, för en godtycklig enskild
// månad (t.ex. MinCoach Wrapped) snarare än trailing-12.
export function getMonthStats(history: Workout[], monthKey: string): WeekStats {
  const bucket = makeEmptyStats(monthKey, monthKey);

  history.forEach((workout) => {
    if (getMonthKey(new Date(workout.startedAt)) !== monthKey) return;
    addWorkoutToStats(bucket, workout);
  });

  return bucket;
}

export type MonthPersonalBest = {
  exerciseName: string;
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  createdAt: string;
  improvementPercent: number;
};

type PersonalBestAttempt = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
};

// Speglar isNewPR() i app/page.tsx — duplicerad, inte importerad (page.tsx
// importerar redan den här filen, så en runtime-import tillbaka skulle bli
// en cirkelimport). Håll i synk om isNewPR:s jämförelseregel ändras.
function isBetterAttempt(existing: PersonalBestAttempt, attempt: PersonalBestAttempt) {
  if (attempt.metricType === "time") {
    const attemptDuration = attempt.durationSeconds ?? 0;
    const existingDuration = existing.durationSeconds ?? 0;
    if (attemptDuration > existingDuration) return true;
    if (attemptDuration === existingDuration && attempt.weight > existing.weight) return true;
    return false;
  }

  if (attempt.weight > existing.weight) return true;
  if (attempt.weight === existing.weight && attempt.reps > existing.reps) return true;
  return false;
}

function getComparisonValue(attempt: PersonalBestAttempt) {
  return attempt.metricType === "time" ? attempt.durationSeconds ?? 0 : attempt.weight;
}

// Går igenom ALL historik (måste veta vad föregående bästa var innan
// målmånaden), kronologiskt per övning. En övnings allra första loggade
// set sätter bara baslinjen — räknas INTE som ett PB-event, annars ser
// varje nyloggad övning den månaden ut som ett PB, vilket känns falskt i
// en höjdpunkts-kontext. Bara set med numeriskt weight/reps (eller
// durationSeconds för tidsövningar) beaktas.
export function getMonthPersonalBests(history: Workout[], monthKey: string): MonthPersonalBest[] {
  const byExercise = new Map<string, { name: string; sets: (LoggedSet & { exerciseName: string })[] }>();

  history.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const key = exerciseKey(exercise.name);
      const entry = byExercise.get(key) ?? { name: exercise.name, sets: [] };
      exercise.sets.forEach((set) => {
        if (typeof set.weight !== "number" || typeof set.reps !== "number") return;
        entry.sets.push({ ...set, exerciseName: exercise.name });
      });
      byExercise.set(key, entry);
    });
  });

  const events: MonthPersonalBest[] = [];

  byExercise.forEach(({ name, sets }) => {
    const sorted = [...sets].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let best: (LoggedSet & { exerciseName: string }) | null = null;

    sorted.forEach((set) => {
      if (!best) {
        best = set;
        return;
      }

      if (isBetterAttempt(best, set)) {
        if (getMonthKey(new Date(set.createdAt)) === monthKey) {
          const previousValue = getComparisonValue(best);
          const newValue = getComparisonValue(set);
          const improvementPercent =
            previousValue > 0 ? Math.round(((newValue - previousValue) / previousValue) * 100) : 0;

          events.push({
            exerciseName: name,
            weight: set.weight,
            reps: set.reps,
            durationSeconds: set.durationSeconds,
            metricType: set.metricType,
            createdAt: set.createdAt,
            improvementPercent,
          });
        }
        best = set;
      }
    });
  });

  return events.sort((a, b) => b.improvementPercent - a.improvementPercent);
}

function getChartConfig(mode: ChartMode) {
  if (mode === "days") {
    return {
      statLabel: "Senaste 7 dagar",
      eyebrow: "Senaste 7 dagar",
      unit: "dag",
      activeLabel: "Mest aktiva dag",
    };
  }

  if (mode === "year") {
    return {
      statLabel: "Senaste 12 månader",
      eyebrow: "Senaste 12 månader",
      unit: "månad",
      activeLabel: "Mest aktiva månad",
    };
  }

  return {
    statLabel: "Senaste 6 veckor",
    eyebrow: "Senaste 6 veckor",
    unit: "vecka",
    activeLabel: "Mest aktiva vecka",
  };
}

function getMetricConfig(metric: ChartMetric) {
  if (metric === "volume") {
    return {
      label: "Volym",
      title: "Volym per",
      helper: "Vikt × reps, summerat.",
      formatValue: (value: number) =>
        value >= 1000
          ? `${(value / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}k`
          : value.toLocaleString("sv-SE"),
    };
  }

  return {
    label: "Set",
    title: "Set per",
    helper: "Antal loggade arbetsset.",
    formatValue: (value: number) => value.toLocaleString("sv-SE"),
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

function getPreviousPeriodStart(mode: ChartMode) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (mode === "days") {
    now.setDate(now.getDate() - 13);
    return now;
  }

  if (mode === "year") {
    return new Date(now.getFullYear(), now.getMonth() - 23, 1);
  }

  const start = getWeekStart(now);
  start.setDate(start.getDate() - 11 * 7);
  return start;
}

function getPeriodHistory(history: Workout[], mode: ChartMode) {
  const periodStart = getPeriodStart(mode).getTime();

  return history.filter(
    (workout) => new Date(workout.startedAt).getTime() >= periodStart
  );
}

function getPreviousPeriodHistory(history: Workout[], mode: ChartMode) {
  const previousStart = getPreviousPeriodStart(mode).getTime();
  const currentStart = getPeriodStart(mode).getTime();

  return history.filter((workout) => {
    const time = new Date(workout.startedAt).getTime();
    return time >= previousStart && time < currentStart;
  });
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

function getAverageRir(sets: { rir?: number }[]) {
  const values = sets
    .map((set) => set.rir)
    .filter((rir): rir is number => typeof rir === "number");

  return values.length > 0
    ? values.reduce((sum, rir) => sum + rir, 0) / values.length
    : null;
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

export function getMuscleGroupBreakdown(history: Workout[]) {
  const counts = new Map<string, number>();
  let total = 0;

  history.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const setCount = exercise.sets.length;
      if (setCount === 0) return;
      const category = getExerciseProfile(exercise.name).category;
      counts.set(category, (counts.get(category) ?? 0) + setCount);
      total += setCount;
    });
  });

  return Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function formatPercentDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? "Nytt mot förra perioden" : null;

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return "Oförändrat mot förra perioden";
  return `${pct > 0 ? "+" : ""}${pct}% mot förra perioden`;
}

function formatRirDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;

  const diff = Number((current - previous).toFixed(1));
  if (diff === 0) return "Oförändrat mot förra perioden";
  return `${diff > 0 ? "+" : ""}${diff.toLocaleString("sv-SE")} mot förra perioden`;
}

function TrendChart({
  items,
  formatValue,
}: {
  items: { key: string; label: string; value: number }[];
  formatValue: (value: number) => string;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="h-40 rounded-[1.25rem] border border-white/[0.09] bg-slate-950/18 p-3 sm:h-48">
      <div className="flex h-full items-end gap-2">
        {items.map((item) => {
          const height = Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 4);
          const isSelected = item.key === selectedKey;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedKey(isSelected ? null : item.key)}
              className="flex h-full flex-1 flex-col justify-end gap-2"
            >
              <div className="flex flex-1 items-end">
                <div
                  className={`w-full rounded-t-xl border transition ${
                    isSelected
                      ? "border-blue-200/45 bg-[linear-gradient(180deg,rgba(147,197,253,0.95),rgba(37,99,235,0.34))]"
                      : "border-blue-300/15 bg-[linear-gradient(180deg,rgba(96,165,250,0.72),rgba(37,99,235,0.18))]"
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="text-center">
                <p
                  className={`text-xs font-semibold transition ${
                    isSelected ? "text-blue-100" : "text-white"
                  }`}
                >
                  {formatValue(item.value)}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/34">
                  {item.label}
                </p>
              </div>
            </button>
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
  onOpenHistory,
}: Props) {
  const [chartMode, setChartMode] = useState<ChartMode>("weeks");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("sets");
  const periodHistory = getPeriodHistory(history, chartMode);
  const previousPeriodHistory = getPreviousPeriodHistory(history, chartMode);
  const allSets = getAllSets(periodHistory);
  const previousAllSets = getAllSets(previousPeriodHistory);

  const totalPasses = periodHistory.length;
  const totalSets = periodHistory.reduce(
    (sum, workout) => sum + (workout.summary?.totalSets ?? 0),
    0
  );
  const totalMinutes = periodHistory.reduce(
    (sum, workout) => sum + (workout.summary?.durationMinutes ?? 0),
    0
  );
  const averageRirValue = getAverageRir(allSets);
  const averageRir =
    averageRirValue !== null
      ? Number(averageRirValue.toFixed(1)).toLocaleString("sv-SE")
      : "-";

  const previousTotalPasses = previousPeriodHistory.length;
  const previousTotalSets = previousPeriodHistory.reduce(
    (sum, workout) => sum + (workout.summary?.totalSets ?? 0),
    0
  );
  const previousTotalMinutes = previousPeriodHistory.reduce(
    (sum, workout) => sum + (workout.summary?.durationMinutes ?? 0),
    0
  );
  const previousAverageRirValue = getAverageRir(previousAllSets);

  const mostTrained = getMostTrainedExercise(periodHistory);
  const muscleBreakdown = getMuscleGroupBreakdown(history);
  const days = getLastDays(history);
  const weeks = getLastWeeks(history);
  const months = getLastMonths(history);
  const chartBuckets =
    chartMode === "days" ? days : chartMode === "year" ? months : weeks;
  const chartConfig = getChartConfig(chartMode);
  const metricConfig = getMetricConfig(chartMetric);
  const chartItems = chartBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: chartMetric === "volume" ? bucket.totalVolume : bucket.totalSets,
  }));
  const mostActiveBucket = chartBuckets.reduce<WeekStats>((best, item) =>
    item.totalSets > best.totalSets ? item : best,
    chartBuckets[0]
  );

  const statTiles = [
    {
      label: "Pass",
      value: totalPasses.toString(),
      helper: "totalt",
      delta: formatPercentDelta(totalPasses, previousTotalPasses),
    },
    {
      label: "Set",
      value: totalSets.toString(),
      helper: "loggade",
      delta: formatPercentDelta(totalSets, previousTotalSets),
    },
    {
      label: "Tid",
      value: formatMinutes(totalMinutes),
      helper: "träning",
      delta: formatPercentDelta(totalMinutes, previousTotalMinutes),
    },
    {
      label: "RIR",
      value: averageRir,
      helper: "snitt",
      delta: formatRirDelta(averageRirValue, previousAverageRirValue),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6 lg:px-8">
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
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-[1.25rem] border border-white/[0.09] bg-white/[0.052] p-3.5 backdrop-blur-xl"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {tile.label}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
              {tile.value}
            </p>
            <p className="mt-1 text-sm text-white/50">{tile.helper}</p>
            {tile.delta ? (
              <p className="mt-1.5 text-xs text-white/40">{tile.delta}</p>
            ) : null}
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
                {metricConfig.title} {chartConfig.unit}
              </h2>
              <p className="mt-1 text-sm text-white/48">{metricConfig.helper}</p>
            </div>

            <div className="flex gap-1 rounded-xl border border-white/[0.09] bg-white/[0.042] p-1">
              {(["sets", "volume"] as ChartMetric[]).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setChartMetric(metric)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    chartMetric === metric
                      ? "bg-blue-500/[0.14] text-blue-100"
                      : "text-white/45 hover:text-white/75"
                  }`}
                >
                  {getMetricConfig(metric).label}
                </button>
              ))}
            </div>
          </div>

          <TrendChart items={chartItems} formatValue={metricConfig.formatValue} />
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

          <button
            onClick={onOpenHistory}
            className="w-full rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 text-left backdrop-blur-xl transition hover:border-white/16 hover:bg-white/[0.06] sm:p-5"
          >
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
          </button>
        </div>
      </section>

      {muscleBreakdown.length > 0 ? (
        <section className="mt-4 rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Hela historiken
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white">
            Fördelning per muskelgrupp
          </h2>

          <div className="mt-4 space-y-2.5">
            {muscleBreakdown.map((item) => (
              <div key={item.category} className="flex items-center gap-3">
                <p className="w-20 shrink-0 text-sm font-medium text-white/70 sm:w-24">
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </p>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(37,99,235,0.55),rgba(96,165,250,0.85))]"
                    style={{ width: `${Math.max(item.percent, 3)}%` }}
                  />
                </div>
                <p className="w-10 shrink-0 text-right text-xs font-semibold text-white/55">
                  {item.percent}%
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
