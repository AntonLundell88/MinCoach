"use client";

import { useMemo, useState } from "react";
import { getExerciseProfile } from "../lib/exercises";

type LoggedSet = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
  failNote?: string;
  createdAt: string;
};

type LoggedExercise = {
  name: string;
  sets: LoggedSet[];
};

type Workout = {
  id: string;
  startedAt: string;
  displayName: string;
  exercises: LoggedExercise[];
};

type ExerciseSession = {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  sets: LoggedSet[];
};

type ExerciseProgress = {
  name: string;
  sessions: ExerciseSession[];
  sets: Array<LoggedSet & { workoutId: string; workoutName: string }>;
};

type ExerciseSortMode = "recent" | "most" | "az";
type ExercisePeriod = "month" | "halfYear" | "all";

type Props = {
  history: Workout[];
  initialExerciseName?: string | null;
  onBack: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function getSetScore(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    return (set.durationSeconds ?? 0) + set.weight * 0.1;
  }

  return set.weight * set.reps;
}

function getSetLabel(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    const base = formatDuration(set.durationSeconds ?? 0);
    return set.weight > 0 ? `${base} + ${set.weight.toLocaleString("sv-SE")} kg` : base;
  }

  return `${set.weight.toLocaleString("sv-SE")} × ${set.reps}`;
}

function getSetEffortLabel(set?: LoggedSet | null) {
  if (!set) return "";

  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    return "";
  }

  return `RIR ${set.rir ?? "-"}`;
}

function getBestSet(sets: LoggedSet[]) {
  return sets.reduce<LoggedSet | null>((best, set) => {
    if (!best) return set;

    if (getSetScore(set) > getSetScore(best)) return set;
    if (getSetScore(set) === getSetScore(best) && set.weight > best.weight) {
      return set;
    }

    return best;
  }, null);
}

function getLatestSetTime(exercise: ExerciseProgress) {
  return new Date(exercise.sets.at(-1)?.createdAt ?? 0).getTime();
}

function getExercisePeriodConfig(period: ExercisePeriod) {
  if (period === "month") {
    return {
      label: "30 dagar",
      helper: "Senaste 30 dagarna",
    };
  }

  if (period === "halfYear") {
    return {
      label: "6 mån",
      helper: "Senaste 6 månaderna",
    };
  }

  return {
    label: "Allt",
    helper: "All historik",
  };
}

function getExercisePeriodStart(period: ExercisePeriod) {
  if (period === "all") return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (period === "month") {
    now.setDate(now.getDate() - 29);
    return now.getTime();
  }

  return new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime();
}

function filterExerciseByPeriod(
  exercise: ExerciseProgress,
  period: ExercisePeriod
): ExerciseProgress {
  const start = getExercisePeriodStart(period);

  if (!start) return exercise;

  const sessions = exercise.sessions
    .map((session) => ({
      ...session,
      sets: session.sets.filter(
        (set) => new Date(set.createdAt).getTime() >= start
      ),
    }))
    .filter((session) => session.sets.length > 0);

  return {
    name: exercise.name,
    sessions,
    sets: sessions.flatMap((session) =>
      session.sets.map((set) => ({
        ...set,
        workoutId: session.workoutId,
        workoutName: session.workoutName,
      }))
    ),
  };
}

function getTrendLabel(
  sets: Array<LoggedSet & { workoutId?: string; workoutName?: string }>
) {
  if (sets.length < 2) {
    return {
      value: "-",
      helper: "Behöver fler set",
    };
  }

  const firstWorkoutId = sets[0].workoutId;
  const latestWorkoutId = sets[sets.length - 1].workoutId;
  const firstWorkoutSets = firstWorkoutId
    ? sets.filter((set) => set.workoutId === firstWorkoutId)
    : [sets[0]];
  const latestWorkoutSets = latestWorkoutId
    ? sets.filter((set) => set.workoutId === latestWorkoutId)
    : [sets[sets.length - 1]];
  const first = getBestSet(firstWorkoutSets) ?? sets[0];
  const latest = getBestSet(latestWorkoutSets) ?? sets[sets.length - 1];
  const firstScore = getSetScore(first);
  const latestScore = getSetScore(latest);
  const diff = latestScore - firstScore;

  if (diff > 0) {
    return {
      value: `+${diff}`,
      helper: "vikt x reps",
    };
  }

  if (diff < 0) {
    return {
      value: `${diff}`,
      helper: "vikt x reps",
    };
  }

  return {
    value: "Jämnt",
    helper: "samma nivå",
  };
}

function getExerciseProgress(history: Workout[]): ExerciseProgress[] {
  const byExercise = new Map<string, ExerciseProgress>();

  history
    .slice()
    .reverse()
    .forEach((workout) => {
      workout.exercises?.forEach((exercise) => {
        const loggedSets = exercise.sets ?? [];
        if (loggedSets.length === 0) return;

        const current =
          byExercise.get(exercise.name) ??
          {
            name: exercise.name,
            sessions: [],
            sets: [],
          };

        current.sessions.push({
          workoutId: workout.id,
          workoutName: workout.displayName,
          startedAt: workout.startedAt,
          sets: loggedSets,
        });

        loggedSets.forEach((set) => {
          current.sets.push({
            ...set,
            workoutId: workout.id,
            workoutName: workout.displayName,
          });
        });

        byExercise.set(exercise.name, current);
      });
    });

  return Array.from(byExercise.values()).sort((a, b) => {
    const latestA = new Date(a.sets.at(-1)?.createdAt ?? 0).getTime();
    const latestB = new Date(b.sets.at(-1)?.createdAt ?? 0).getTime();
    return latestB - latestA;
  });
}

function ProgressChart({ exercise }: { exercise: ExerciseProgress }) {
  const points = exercise.sessions
    .map((session) => {
      const best = getBestSet(session.sets);
      return best
        ? {
            set: best,
            date: session.startedAt,
          }
        : null;
    })
    .filter((point): point is { set: LoggedSet; date: string } =>
      Boolean(point)
    );
  const scores = points.map((point) => getSetScore(point.set));
  const max = Math.max(...scores, 1);
  const min = Math.min(...scores, max);
  const range = Math.max(max - min, 1);
  const width = 620;
  const height = 230;
  const paddingX = 34;
  const paddingY = 30;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const chartPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : paddingX + (index / (points.length - 1)) * usableWidth;
    const y =
      paddingY + (1 - (getSetScore(point.set) - min) / range) * usableHeight;
    return { x, y, point };
  });

  const line = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="relative h-44 overflow-hidden rounded-[1.25rem] border border-white/[0.09] bg-slate-950/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-52">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          <linearGradient id="progressGlow" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="rgba(96,165,250,0.12)" />
            <stop offset="1" stopColor="rgba(96,165,250,0.86)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((lineIndex) => {
          const y = paddingY + (lineIndex / 3) * usableHeight;
          return (
            <line
              key={lineIndex}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.075)"
              strokeWidth="1"
            />
          );
        })}

        {chartPoints.length > 1 ? (
          <>
            <path
              d={line}
              fill="none"
              stroke="rgba(96,165,250,0.10)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="9"
            />
            <path
              d={line}
              fill="none"
              stroke="url(#progressGlow)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          </>
        ) : null}

        {chartPoints.map((chartPoint, index) => (
          <g key={`${chartPoint.point.date}-${index}`}>
            <circle
              cx={chartPoint.x}
              cy={chartPoint.y}
              r="8"
              fill="rgba(96,165,250,0.20)"
            />
            <circle
              cx={chartPoint.x}
              cy={chartPoint.y}
              r="4"
              fill="#93c5fd"
            />
          </g>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-x-5 bottom-4 flex justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-white/32">
        <span>{points[0] ? formatDate(points[0].date) : ""}</span>
        <span>{points.at(-1) ? formatDate(points.at(-1)!.date) : ""}</span>
      </div>
    </div>
  );
}

export default function ExerciseProgressScreen({
  history,
  initialExerciseName = null,
  onBack,
}: Props) {
  const exercises = useMemo(() => getExerciseProgress(history), [history]);
  const [selectedName, setSelectedName] = useState<string | null>(
    initialExerciseName
  );
  const [showExerciseDetail, setShowExerciseDetail] = useState(
    Boolean(initialExerciseName)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<ExerciseSortMode>("recent");
  const [exercisePeriod, setExercisePeriod] =
    useState<ExercisePeriod>("halfYear");
  const [infoExerciseName, setInfoExerciseName] = useState<string | null>(null);
  const [showTrendInfo, setShowTrendInfo] = useState(false);
  const infoExercise = infoExerciseName
    ? getExerciseProfile(infoExerciseName)
    : null;
  const selected =
    exercises.find((exercise) => exercise.name === selectedName) ??
    exercises[0] ??
    null;
  const periodExercise = selected
    ? filterExerciseByPeriod(selected, exercisePeriod)
    : null;
  const latestSet = periodExercise?.sets.at(-1) ?? null;
  const bestSet = periodExercise ? getBestSet(periodExercise.sets) : null;
  const trend = periodExercise
    ? getTrendLabel(periodExercise.sets)
    : { value: "-", helper: "" };
  const periodConfig = getExercisePeriodConfig(exercisePeriod);
  const visibleExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return exercises
      .filter((exercise) => exercise.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sortMode === "most") return b.sets.length - a.sets.length;
        if (sortMode === "az") return a.name.localeCompare(b.name, "sv");
        return getLatestSetTime(b) - getLatestSetTime(a);
      });
  }, [exercises, searchQuery, sortMode]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.06),transparent_28%),linear-gradient(180deg,#0b1018_0%,#111a25_45%,#0b1018_100%)]" />

      <div className="flex items-center justify-between gap-3 pt-1 sm:pt-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Övningar
          </h1>
        </div>

        <button
          onClick={
            showExerciseDetail ? () => setShowExerciseDetail(false) : onBack
          }
          className="rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07]"
        >
          Tillbaka
        </button>
      </div>

      {selected ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.45fr]">
          <section
            className={`rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-3.5 backdrop-blur-xl sm:p-4 ${
              showExerciseDetail ? "hidden lg:block" : ""
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Övningslista
            </p>

            <div className="mt-3 space-y-2.5">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Sök övning"
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950/18 px-3.5 py-2.5 text-base text-white outline-none transition placeholder:text-white/32 focus:border-blue-400/30 focus:bg-white/[0.06] sm:text-sm"
              />

              <div className="grid grid-cols-3 gap-2">
                {[
                  ["recent", "Senaste"],
                  ["most", "Mest"],
                  ["az", "A-Ö"],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode as ExerciseSortMode)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      sortMode === mode
                        ? "border-blue-400/25 bg-blue-500/[0.14] text-blue-100"
                        : "border-white/[0.09] bg-white/[0.042] text-white/55 hover:border-blue-400/20 hover:text-white/78"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {visibleExercises.map((exercise) => {
                const best = getBestSet(exercise.sets);
                const isActive = exercise.name === selected.name;

                return (
                  <div
                    key={exercise.name}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                      isActive
                        ? "border-blue-400/25 bg-blue-500/[0.14]"
                        : "border-white/[0.09] bg-white/[0.048] hover:border-white/16 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedName(exercise.name);
                          setShowExerciseDetail(true);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-semibold text-white">
                          {exercise.name}
                        </span>
                        <span className="mt-1 block text-xs text-white/48">
                          {exercise.sessions.length} pass · {exercise.sets.length} set
                          {best ? ` · bäst ${getSetLabel(best)}` : ""}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInfoExerciseName(exercise.name)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-xs font-semibold text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                        aria-label={`Visa info om ${exercise.name}`}
                      >
                        i
                      </button>
                    </div>
                  </div>
                );
              })}

              {visibleExercises.length === 0 ? (
                <div className="rounded-xl border border-white/[0.09] bg-white/[0.032] px-3.5 py-3">
                  <p className="text-sm text-white/52">Ingen övning matchar.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section
            className={`space-y-4 ${
              showExerciseDetail ? "" : "hidden lg:block"
            }`}
          >
            <button
              onClick={() => setShowExerciseDetail(false)}
              className="w-full rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2.5 text-left text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07] lg:hidden"
            >
              Övningslista
            </button>

            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                {selected.sessions.length} pass
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                {selected.name}
              </h2>

              <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-white/[0.09] bg-slate-950/18 p-1">
                {(["month", "halfYear", "all"] as ExercisePeriod[]).map(
                  (period) => {
                    const config = getExercisePeriodConfig(period);

                    return (
                      <button
                        key={period}
                        onClick={() => setExercisePeriod(period)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          exercisePeriod === period
                            ? "bg-blue-500/[0.14] text-blue-100"
                            : "text-white/45 hover:text-white/75"
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  }
                )}
              </div>

              <p className="mt-2 text-sm text-white/45">
                {periodConfig.helper}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3">
                <div className="rounded-xl border border-white/[0.09] bg-slate-950/18 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/32">
                    Senast
                  </p>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-white sm:text-xl">
                    {latestSet ? getSetLabel(latestSet) : "-"}
                  </p>
                  {getSetEffortLabel(latestSet) ? (
                    <p className="mt-1 text-xs text-white/48">
                      {getSetEffortLabel(latestSet)}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-white/[0.09] bg-slate-950/18 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/32">
                    Bästa
                  </p>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-white sm:text-xl">
                    {bestSet ? getSetLabel(bestSet) : "-"}
                  </p>
                  {getSetEffortLabel(bestSet) ? (
                    <p className="mt-1 text-xs text-white/48">
                      {getSetEffortLabel(bestSet)}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-white/[0.09] bg-slate-950/18 p-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/32">
                      Trend
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowTrendInfo(!showTrendInfo)}
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/50 hover:bg-white/10"
                    >
                      i
                    </button>
                  </div>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-white sm:text-xl">
                    {trend.value}
                  </p>
                  <p className="mt-1 text-xs text-white/48">{trend.helper}</p>
                </div>
              </div>

              {showTrendInfo ? (
                <div className="mt-2.5 rounded-xl border border-white/[0.09] bg-slate-950/40 p-3 text-xs text-white/60">
                  Jämför ditt bästa set (vikt × reps) i det första passet med
                  bästa set i det senaste passet, inom vald period.
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl sm:p-5">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Graf
                </p>
                <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-white">
                  Bästa set per pass
                </h3>
              </div>

              {periodExercise && periodExercise.sessions.length > 0 ? (
                <ProgressChart exercise={periodExercise} />
              ) : (
                <div className="rounded-[1.25rem] border border-white/[0.09] bg-slate-950/18 px-4 py-8 text-sm text-white/48">
                  Inga set under vald period.
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-3.5 backdrop-blur-xl sm:p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    Sethistorik
                  </p>
                  <h3 className="mt-1 text-base font-semibold tracking-[-0.02em] text-white">
                    Siffrorna bakom grafen
                  </h3>
                </div>
              </div>

              <div className="mt-2.5 overflow-hidden rounded-2xl border border-white/[0.09]">
                {periodExercise && periodExercise.sessions.length > 0 ? (
                  periodExercise.sessions
                  .slice()
                  .reverse()
                  .map((session) => (
                    <div
                      key={session.workoutId}
                      className="border-b border-white/8 bg-slate-950/18 p-2.5 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white/88">
                          {session.workoutName}
                        </p>
                        <p className="text-xs text-white/42">
                          {formatDate(session.startedAt)}
                        </p>
                      </div>

                      <div className="mt-2 grid gap-1.5">
                        {session.sets.map((set, index) => {
                          const sessionBest = getBestSet(session.sets);
                          const isTopSet =
                            sessionBest?.createdAt === set.createdAt ||
                            (sessionBest &&
                              getSetScore(sessionBest) === getSetScore(set));

                          return (
                            <div
                              key={`${set.createdAt}-${index}`}
                              className={`grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-lg px-2.5 py-1.5 transition ${
                                isTopSet
                                  ? "border border-emerald-300/18 bg-emerald-300/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
                                  : "bg-white/[0.032]"
                              }`}
                            >
                              <span
                                className={`text-xs font-semibold ${
                                  isTopSet ? "text-white/70" : "text-white/35"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  isTopSet ? "text-white" : "text-white/88"
                                }`}
                              >
                                {getSetLabel(set)}
                                {isTopSet ? (
                                  <span className="ml-2 rounded-full border border-emerald-200/18 bg-emerald-200/[0.08] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                                    Topp
                                  </span>
                                ) : null}
                              </span>
                              {getSetEffortLabel(set) ? (
                                <span
                                  className={`text-xs font-medium ${
                                    isTopSet ? "text-white/76" : "text-blue-100/70"
                                  }`}
                                >
                                  {getSetEffortLabel(set)}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-950/18 p-4 text-sm text-white/48">
                    Inga set under vald period.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="mt-4 rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Inga set än
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
            När du har loggat en övning syns den här.
          </h2>
        </section>
      )}

      {infoExerciseName && infoExercise ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                  Övningsinfo
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
                  {infoExerciseName}
                </h2>
              </div>

              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-lg leading-none text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                onClick={() => setInfoExerciseName(null)}
                aria-label="Stäng"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/42">
                {infoExercise.equipment}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {infoExercise.detail}
              </p>
              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] p-2.5">
                <p className="text-xs leading-5 text-white/66">
                  {infoExercise.techniqueCue}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/44">
                  {infoExercise.progressionRule}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
