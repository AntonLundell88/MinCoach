"use client";

import Image from "next/image";

type PassType = "A" | "B" | "C" | "D";
type AppTheme = "dark" | "light";

type WorkoutSummary = {
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  bestSetText: string;
  coachSummary: string;
};

type Workout = {
  id: string;
  startedAt: string;
  gym: string;
  pass: PassType;
  displayName: string;
  exercises?: {
    sets: {
      weight: number;
      reps: number;
      durationSeconds?: number;
      metricType?: "reps" | "time";
    }[];
  }[];
  summary?: WorkoutSummary;
};

type PersonalRecord = {
  exerciseName: string;
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  createdAt: string;
};

type Props = {
  name: string;
  nextPassLabel: string;
  history: Workout[];
  personalRecords: Record<string, PersonalRecord>;
  weeklyStats: {
    passCount: number;
    totalMinutes: number;
    totalSets: number;
  };
  daysPerWeek: number;
  onStartWorkout: () => void;
  onOpenStatistics: () => void;
  onOpenHistory: () => void;
  onOpenExercises: () => void;
  onOpenPersonalRecords: () => void;
  onOpenSetup: () => void;
  theme: AppTheme;
};

function getLatestPR(personalRecords: Record<string, PersonalRecord>) {
  const records = Object.values(personalRecords);

  if (records.length === 0) return null;

  return records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "-";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatRecord(record: PersonalRecord) {
  if (record.metricType === "time" || typeof record.durationSeconds === "number") {
    const seconds = Math.max(0, Math.round(record.durationSeconds ?? 0));
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    return record.weight > 0 ? `${time} + ${record.weight} kg` : time;
  }

  return `${record.weight} × ${record.reps}`;
}

export default function LobbyScreen({
  name,
  nextPassLabel,
  history,
  personalRecords,
  weeklyStats,
  daysPerWeek,
  onStartWorkout,
  onOpenStatistics,
  onOpenHistory,
  onOpenExercises,
  onOpenPersonalRecords,
  onOpenSetup,
  theme,
}: Props) {
  const isLight = theme === "light";
  const pageClassName = isLight
    ? "relative min-h-screen w-full px-0 py-0 text-[#2d251c] sm:px-6 sm:py-4 lg:px-8"
    : "relative min-h-screen w-full px-0 py-0 text-white sm:px-6 sm:py-4 lg:px-8";
  const backgroundClassName = isLight
    ? "pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(47,109,246,0.13),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(125,96,64,0.08),transparent_26%),linear-gradient(180deg,#f3eee4_0%,#f8f4ec_48%,#efe7da_100%)]"
    : "pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.06),transparent_28%),linear-gradient(180deg,#0b1018_0%,#111a25_45%,#0b1018_100%)]";
  const cardClassName = isLight
    ? "border border-[#7a6548]/15 bg-white/56 shadow-[0_18px_46px_rgba(91,72,48,0.07)] backdrop-blur-xl"
    : "border border-white/[0.045] bg-white/[0.045] shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl";
  const smallCardClassName = isLight
    ? "border border-[#7a6548]/14 bg-white/50 backdrop-blur-xl"
    : "border border-white/[0.045] bg-white/[0.036] backdrop-blur-xl";
  const labelClassName = isLight
    ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7661]"
    : "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35";
  const titleClassName = isLight ? "text-[#2d251c]" : "text-white";
  const bodyClassName = isLight ? "text-[#665b4f]" : "text-white/58";
  const buttonSubtleClassName = isLight
    ? "rounded-xl border border-[#7a6548]/15 bg-white/48 px-3 py-2 text-xs font-medium text-[#665b4f] transition hover:border-blue-300/35 hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/45"
    : "rounded-xl border border-white/[0.045] bg-white/[0.036] px-3 py-2 text-xs font-medium text-white/55 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.06] hover:text-white/78 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/35";
  const overviewButtonClassName = isLight
    ? "rounded-xl border border-[#7a6548]/14 bg-white/48 px-3 py-2.5 text-left text-sm text-[#2d251c] transition hover:bg-white/70"
    : "rounded-xl border border-white/[0.045] bg-white/[0.036] px-3 py-2.5 text-left text-sm text-white/78 transition hover:border-white/10 hover:bg-white/[0.05]";
  const passPillClassName = isLight
    ? "rounded-xl border border-blue-200/70 bg-blue-50/80 px-3 py-1.5 text-xs font-medium text-blue-700"
    : "rounded-xl border border-blue-400/20 bg-blue-500/[0.07] px-3 py-1.5 text-xs font-medium text-blue-100";
  const latestWorkout = history[0];
  const latestPR = getLatestPR(personalRecords);
  const totalMinutes = history.reduce(
    (sum, workout) => sum + (workout.summary?.durationMinutes ?? 0),
    0
  );
  const totalSets = history.reduce(
    (sum, workout) => sum + (workout.summary?.totalSets ?? 0),
    0
  );

  const progressTitle =
    weeklyStats.passCount >= daysPerWeek
      ? "Veckan är klar"
      : weeklyStats.passCount > 0
      ? "Du är igång"
      : "Redo för första steget";

  const coachReflection = latestWorkout
    ? `Välkommen tillbaka. Du har ${weeklyStats.passCount} pass registrerade den här veckan.`
    : "Välkommen! Kul att du är här. Första passen hjälper oss hitta rätt vikt, reps och marginal.";
  const overviewActions = [
    { label: "Min utveckling", onClick: onOpenStatistics },
    { label: "Mina pass", onClick: onOpenHistory },
    { label: "Övningar", onClick: onOpenExercises },
    { label: "Personbästan", onClick: onOpenPersonalRecords },
  ];
  const chartWorkouts = history.slice(0, 12).reverse();
  const chartValues = chartWorkouts.map((workout) => {
    const volume =
      workout.exercises?.reduce(
        (exerciseSum, exercise) =>
          exerciseSum +
          exercise.sets.reduce(
            (setSum, set) => setSum + set.weight * set.reps,
            0
          ),
        0
      ) ?? 0;

    return volume > 0 ? volume : workout.summary?.totalSets ?? 0;
  });
  const chartMax = Math.max(...chartValues, 1);
  const chartMin = Math.min(...chartValues, chartMax);
  const chartRange = Math.max(chartMax - chartMin, 1);
  const chartPoints =
    chartValues.length > 0
      ? chartValues.map((value, index) => {
          const x =
            chartValues.length === 1
              ? 300
              : 24 + (index / (chartValues.length - 1)) * 552;
          const y = 124 - ((value - chartMin) / chartRange) * 88;
          return { x, y, value };
        })
      : [
          { x: 24, y: 124, value: 0 },
          { x: 150, y: 112, value: 0 },
          { x: 300, y: 82, value: 0 },
          { x: 448, y: 70, value: 0 },
          { x: 576, y: 42, value: 0 },
        ];
  const chartPath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const latestChartValue = chartValues.at(-1) ?? 0;
  const previousChartValue = chartValues.at(-2) ?? null;
  const chartTrend =
    previousChartValue === null
      ? "Första passet ger startpunkten."
      : latestChartValue > previousChartValue
      ? "Senaste passet ökade."
      : latestChartValue === previousChartValue
      ? "Senaste passet låg jämnt."
      : "Senaste passet var lättare.";

  return (
    <div className={pageClassName}>
      <div className={backgroundClassName} />

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-4">
        <header className="flex items-start justify-between gap-3 pt-1 sm:pt-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] sm:h-20 sm:w-20 ${cardClassName}`}
            >
              <Image
                src="/logo-dark.png"
                alt="MinCoach"
                width={88}
                height={88}
                className="h-12 w-12 object-contain sm:h-16 sm:w-16"
                priority
              />
            </div>

            <div>
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                  isLight ? "text-blue-700/55" : "text-blue-100/45"
                }`}
              >
                MinCoach
              </p>
              <h1
                className={`text-2xl font-semibold tracking-[-0.04em] sm:text-3xl ${titleClassName}`}
              >
                Lobbyn
              </h1>
            </div>
          </div>

          <button onClick={onOpenSetup} className={buttonSubtleClassName}>
            Profil
          </button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.55fr_0.9fr]">
          <div
            className={`relative overflow-hidden rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}
          >
            <p className={labelClassName}>
              Coachen
            </p>

            <h2
              className={`mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl ${titleClassName}`}
            >
              Hej {name}.
            </h2>

            <p
              className={`mt-3 max-w-2xl text-sm leading-6 sm:text-[15px] ${
                isLight ? "text-[#665b4f]" : "text-white/72"
              }`}
            >
              {coachReflection}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className={`rounded-[1.25rem] p-3.5 ${smallCardClassName}`}>
              <p className={labelClassName}>
                Senaste PR
              </p>
              <p
                className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}
              >
                {latestPR ? formatRecord(latestPR) : "-"}
              </p>
              <p className={`mt-1 text-sm ${bodyClassName}`}>
                {latestPR ? latestPR.exerciseName : "Inget PR än"}
              </p>
            </div>

            <div className={`rounded-[1.25rem] p-3.5 ${smallCardClassName}`}>
              <p className={labelClassName}>
                Veckan
              </p>
              <p
                className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}
              >
                {weeklyStats.passCount} / {daysPerWeek}
              </p>
              <p className={`mt-1 text-sm ${bodyClassName}`}>pass klara</p>
            </div>
          </div>
        </section>

        <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className={labelClassName}>
                Progression
              </p>
              <h2
                className={`mt-1.5 text-lg font-semibold tracking-[-0.03em] sm:text-xl ${titleClassName}`}
              >
                {progressTitle}
              </h2>
            </div>

            <div className={passPillClassName}>
              {history.length} pass
            </div>
          </div>

          <div
            className={`relative h-28 overflow-hidden rounded-[1.25rem] sm:h-32 ${
              isLight
                ? "border border-[#d8cfc0]/70 bg-white/48"
                : "border border-white/8 bg-slate-950/20"
            }`}
          >
            <svg viewBox="0 0 600 160" className="absolute inset-0 h-full w-full">
              {[36, 66, 96, 126].map((y) => (
                <line
                  key={y}
                  x1="22"
                  x2="578"
                  y1={y}
                  y2={y}
                  stroke={
                    isLight ? "rgba(23,32,51,0.08)" : "rgba(255,255,255,0.06)"
                  }
                  strokeWidth="1"
                />
              ))}
              <path
                d={chartPath}
                fill="none"
                stroke="rgba(96,165,250,0.12)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="9"
              />
              <path
                d={chartPath}
                fill="none"
                stroke="rgba(96,165,250,0.92)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
              {chartPoints.map((point, index) => (
                <circle
                  key={`${point.x}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="rgba(191,219,254,0.94)"
                />
              ))}
            </svg>
          </div>
          <p className={`mt-3 text-sm ${bodyClassName}`}>{chartTrend}</p>
        </section>

        <section className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
              <p className={labelClassName}>
                Senaste pass
              </p>
              <p
                className={`mt-3 text-2xl font-semibold tracking-[-0.04em] ${titleClassName}`}
              >
                {latestWorkout ? latestWorkout.displayName : "Inget än"}
              </p>
              <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
                {latestWorkout?.summary
                  ? `${latestWorkout.summary.durationMinutes} min · ${latestWorkout.summary.totalSets} set`
                  : "När du kört första passet visas det här."}
              </p>
            </div>

            <div className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
              <p className={labelClassName}>
                Totalt
              </p>
              <p
                className={`mt-3 text-2xl font-semibold tracking-[-0.04em] ${titleClassName}`}
              >
                {totalSets} set
              </p>
              <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
                {formatMinutes(totalMinutes)} loggad träning
              </p>
            </div>
          </div>

          <div className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
            <p className={labelClassName}>
              Översikt
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {overviewActions.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={overviewButtonClassName}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        </section>

        <section className="pb-5 pt-1">
          <div className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={labelClassName}>
                  Nästa pass
                </p>
                <h2
                  className={`mt-1.5 text-2xl font-semibold tracking-[-0.04em] ${titleClassName}`}
                >
                  {nextPassLabel}
                </h2>
                <p className={`mt-2 text-sm ${bodyClassName}`}>
                  Starta när du är redo. Ingen stress.
                </p>
              </div>

              <button
                className="w-full rounded-xl bg-[#2f6df6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4f83ff] sm:w-auto"
                onClick={onStartWorkout}
              >
                Starta pass
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
