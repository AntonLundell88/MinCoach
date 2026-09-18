"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CoachThinkingDots, getRandomThinkingWord } from "./CoachThinking";
import { ChevronRightGlyph } from "./IconGlyphs";

type PassType = "A" | "B" | "C" | "D" | "E" | "F" | "G";
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

type StaleDraftInfo = {
  startedAt: string;
  displayName: string;
};

type Props = {
  name: string;
  nextPassLabel: string;
  history: Workout[];
  weeklyStats: {
    passCount: number;
    totalMinutes: number;
    totalSets: number;
  };
  daysPerWeek: number;
  now: Date;
  staleDraft?: StaleDraftInfo | null;
  onResumeStaleDraft?: () => void;
  onDiscardStaleDraft?: () => void;
  onStartWorkout: () => void;
  onOpenStatistics: () => void;
  onOpenHistory: () => void;
  onOpenExercises: () => void;
  onOpenPersonalRecords: () => void;
  onOpenSettings: () => void;
  theme: AppTheme;
  lobbyCoachText?: string;
  /** Coachen skriver en ny text just nu. */
  lobbyCoachLoading?: boolean;
  /** Kallas när lobbyn visas: är texten inaktuell skriver coachen en ny. */
  onShow?: () => void;
  wrapped?: { monthLabel: string; onOpen: () => void; isSpotlight: boolean } | null;
};

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "-";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatRecord(record: PersonalRecord) {
  if (record.metricType === "time" || typeof record.durationSeconds === "number") {
    const seconds = Math.max(0, Math.round(record.durationSeconds ?? 0));
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    return record.weight > 0 ? `${time} + ${record.weight} kg` : time;
  }

  return `${record.weight.toLocaleString("sv-SE")} × ${record.reps}`;
}

function getStaleDraftLabel(startedAt: string, now: Date): string {
  const d = new Date(startedAt);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "från igår";
  }
  return `från ${d.getDate()} ${d.toLocaleString("sv-SE", { month: "long" })}`;
}

function getTimeGreeting(date: Date, personName: string) {
  const hour = date.getHours();

  if (hour < 10) return `God morgon ${personName}.`;
  if (hour < 18) return `Hej ${personName}.`;
  return `God kväll ${personName}.`;
}

export default function LobbyScreen({
  name,
  nextPassLabel,
  history,
  weeklyStats,
  daysPerWeek,
  now,
  staleDraft,
  onResumeStaleDraft,
  onDiscardStaleDraft,
  onStartWorkout,
  onOpenStatistics,
  onOpenHistory,
  onOpenExercises,
  onOpenPersonalRecords,
  onOpenSettings,
  theme,
  lobbyCoachText,
  lobbyCoachLoading,
  onShow,
  wrapped,
}: Props) {
  const isLight = theme === "light";
  const pageClassName = isLight
    ? "mc-enter relative min-h-screen w-full py-0 text-[#2d251c] sm:py-4"
    : "mc-enter relative min-h-screen w-full py-0 text-white sm:py-4";
  const backgroundClassName = isLight
    ? "pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(47,109,246,0.13),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(125,96,64,0.08),transparent_26%),linear-gradient(180deg,#f3eee4_0%,#f8f4ec_48%,#efe7da_100%)]"
    : "pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.06),transparent_28%),linear-gradient(180deg,#0b1018_0%,#111a25_45%,#0b1018_100%)]";
  const cardClassName = isLight
    ? "border border-[#7a6548]/15 bg-white/56 shadow-[0_18px_46px_rgba(91,72,48,0.07)] backdrop-blur-xl"
    : "border border-white/[0.06] bg-white/[0.05] shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl";
  const labelClassName = isLight
    ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7661]"
    : "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50";
  const titleClassName = isLight ? "text-[#2d251c]" : "text-white";
  const bodyClassName = isLight ? "text-[#665b4f]" : "text-white/58";
  const buttonSubtleClassName = isLight
    ? "inline-flex items-center gap-2 rounded-full bg-white/58 px-3 py-2 text-xs font-semibold text-[#665b4f] shadow-[inset_0_0_0_1px_rgba(122,101,72,0.12)] transition hover:bg-white/78 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/45"
    : "inline-flex items-center gap-2 rounded-full bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/62 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)] transition hover:bg-[#4f83ff]/[0.07] hover:text-white/82 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/35";
  const hairlineClassName = isLight ? "h-px bg-[#d8cfc0]/50" : "h-px bg-white/[0.07]";
  const listRowClassName = `flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-1 py-3 text-left transition ${isLight ? "hover:bg-white/50" : "hover:bg-white/[0.035]"}`;
  const overviewButtonClassName = isLight
    ? "rounded-xl border border-[#7a6548]/14 bg-white/48 px-3 py-2.5 text-left text-sm text-[#2d251c] transition hover:bg-white/70"
    : "rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2.5 text-left text-sm text-white/78 transition hover:border-white/10 hover:bg-white/[0.05]";
  const latestWorkout = history[0];
  const totalMinutes = history.reduce(
    (sum, workout) => sum + (workout.summary?.durationMinutes ?? 0),
    0
  );
  const totalSets = history.reduce(
    (sum, workout) => sum + (workout.summary?.totalSets ?? 0),
    0
  );

  const coachReflection = lobbyCoachText
    ?? (latestWorkout
      ? `Välkommen tillbaka. Du har ${weeklyStats.passCount} pass registrerade den här veckan.`
      : "Välkommen! Kul att du är här. Första passen hjälper oss hitta rätt vikt, reps och marginal.");
  // Reservtexten ovan visas bara om coachen inte kunde skriva. Medan den
  // skriver står en laddningsrad i stället.
  const isWritingNote = !lobbyCoachText && Boolean(lobbyCoachLoading);
  const [thinkingWord] = useState(() => getRandomThinkingWord());

  useEffect(() => {
    onShow?.();
  }, [onShow]);
  const overviewActions = [
    { label: "Min utveckling", onClick: onOpenStatistics },
    { label: "Mina pass", onClick: onOpenHistory },
    { label: "Övningar", onClick: onOpenExercises },
    { label: "Personbästan", onClick: onOpenPersonalRecords },
  ];
  const cutoff28 = new Date(now);
  cutoff28.setDate(cutoff28.getDate() - 28);
  const history28 = history.filter((w) => new Date(w.startedAt) >= cutoff28);

  const passGoal = daysPerWeek * 4;
  const passCount28 = history28.length;
  const passProgress = Math.min(passCount28 / Math.max(passGoal, 1), 1);

  const hours28 = Math.round(
    (history28.reduce((sum, w) => sum + (w.summary?.durationMinutes ?? 0), 0) / 60) * 10
  ) / 10;

  const tons28 = Math.round(
    (history28.reduce(
      (sum, w) =>
        sum +
        (w.exercises?.reduce(
          (es, e) => es + e.sets.reduce((ss, s) => ss + s.weight * s.reps, 0),
          0
        ) ?? 0),
      0
    ) / 1000) * 10
  ) / 10;

  let streak = 0;
  for (let i = 0; i < 52; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const hasWorkout = history.some((w) => {
      const d = new Date(w.startedAt);
      return d >= weekStart && d < weekEnd;
    });
    if (hasWorkout) streak++;
    else break;
  }

  const ringCircumference = (r: number) => 2 * Math.PI * r;
  const ringOffset = (r: number, progress: number) =>
    ringCircumference(r) * (1 - Math.min(progress, 1));

  return (
    <div className={pageClassName}>
      <div className={backgroundClassName} />

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-4">
        <header className="flex items-start justify-between gap-3 pt-1 sm:pt-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] sm:h-20 sm:w-20 ${cardClassName}`}
            >
              <Image
                src={isLight ? "/logo-light.png" : "/logo-dark.png"}
                alt="MinCoach"
                width={88}
                height={88}
                className="h-12 w-12 object-contain sm:h-16 sm:w-16"
                priority
              />
            </div>

            <div>
              <h1
                className={`text-2xl font-semibold tracking-[-0.04em] sm:text-3xl ${titleClassName}`}
              >
                Lobbyn
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* En kugge säger "konfigurera verktyget". Övre högra hörnet
                tillhör den som använder appen — därför initialen, som senare
                blir en bild. Samma ingång som Apple, Spotify och Lifesum har
                på exakt den platsen. */}
            <button
              type="button"
              onClick={onOpenSettings}
              className={`${buttonSubtleClassName} h-11 w-11 justify-center px-0 text-sm font-semibold uppercase`}
              aria-label="Du"
              title="Du"
            >
              {name.trim().charAt(0) || "D"}
            </button>
          </div>
        </header>

        {staleDraft && onResumeStaleDraft && onDiscardStaleDraft && (
          <div className={`flex items-center justify-between gap-3 rounded-[1.5rem] px-4 py-3.5 ${isLight ? "border border-[#7a6548]/15 bg-white/56 shadow-[0_4px_16px_rgba(91,72,48,0.07)] backdrop-blur-xl" : "border border-white/[0.06] bg-white/[0.035] backdrop-blur-xl"}`}>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${titleClassName}`}>
                Du har ett pågående pass{" "}
                <span className={`font-normal ${bodyClassName}`}>
                  {getStaleDraftLabel(staleDraft.startedAt, now)}
                </span>
              </p>
              <p className={`mt-0.5 truncate text-xs ${bodyClassName}`}>
                {staleDraft.displayName}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onDiscardStaleDraft}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${isLight ? "text-[#665b4f] hover:bg-black/[0.05]" : "text-white/50 hover:text-white/70"}`}
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={onResumeStaleDraft}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition active:scale-[0.97]"
              >
                Fortsätt
              </button>
            </div>
          </div>
        )}

        {wrapped && wrapped.isSpotlight && (
          <div className="relative">
            <div
              className="wrapped-glow-blob-a pointer-events-none absolute -left-4 -top-8 h-32 w-32 rounded-full blur-xl"
              style={{ background: "radial-gradient(circle, rgba(79,131,255,0.85), transparent 70%)" }}
            />
            <div
              className="wrapped-glow-blob-b pointer-events-none absolute -bottom-8 -right-2 h-32 w-32 rounded-full blur-xl"
              style={{ background: "radial-gradient(circle, rgba(168,85,247,0.8), transparent 70%)" }}
            />
            <button
              type="button"
              onClick={wrapped.onOpen}
              className={`relative flex w-full items-center justify-between gap-3 rounded-[1.5rem] px-4 py-3.5 text-left transition active:scale-[0.99] ${
                isLight
                  ? "border border-amber-300/40 bg-[#fdf8f0]/95 shadow-[0_4px_16px_rgba(217,119,6,0.10)]"
                  : "border border-white/[0.09] bg-[#0d1520]/92 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                    isLight ? "text-amber-700/80" : "text-amber-200/60"
                  }`}
                >
                  Höjdpunkter
                </p>
                <p className={`mt-1 text-sm font-semibold ${titleClassName}`}>
                  Din {wrapped.monthLabel} är klar
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold ${
                  isLight ? "text-amber-700" : "text-amber-200"
                }`}
              >
                Visa →
              </span>
            </button>
          </div>
        )}

        {/* Coachen är lobbyns enda kort. Ligger allt i kort betyder kortet
            ingenting — nu betyder det: här talar coachen. */}
        <section
          className={`relative overflow-hidden rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}
        >
          <span
            className={`block h-1.5 w-1.5 rounded-full ${
              isLight ? "bg-[#2563eb]" : "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.45)]"
            }`}
          />

          <h2
            className={`mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-[28px] ${titleClassName}`}
          >
            {getTimeGreeting(now, name)}
          </h2>

          <p
            className={`mt-3 max-w-2xl text-[17px] leading-[1.55] ${
              isLight ? "text-[#584c40]" : "text-white/80"
            }`}
          >
            {isWritingNote ? (
              <span className="flex items-center gap-2">
                Coachen {thinkingWord}
                <CoachThinkingDots />
              </span>
            ) : (
              coachReflection
            )}
          </p>
        </section>

        {/* Det du ska göra härnäst ligger direkt under coachen, inte längst ned
            efter all statistik. */}
        <section className="pt-1">
          <h2 className={`text-2xl font-semibold tracking-[-0.03em] ${titleClassName}`}>
            {nextPassLabel}
          </h2>
          <p className={`mt-1.5 text-[15px] ${bodyClassName}`}>
            Starta när du är redo. Ingen stress.
          </p>
          <button
            onClick={onStartWorkout}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#2f6df6] px-5 text-[15px] font-semibold text-white transition hover:bg-[#4f83ff] active:scale-[0.99]"
          >
            Starta pass
          </button>
        </section>

        <section className="pt-2">
          <div className={hairlineClassName} />

          <h2 className={`mt-5 text-[17px] font-semibold tracking-[-0.02em] ${titleClassName}`}>
            Senaste 28 dagarna
          </h2>

          <div className="relative mx-auto mt-4 h-[132px] w-[132px]">
            <svg width="132" height="132" viewBox="0 0 220 220">
              <defs>
                <linearGradient id="lobbyProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2f6df6" />
                </linearGradient>
              </defs>
              <circle cx="110" cy="110" r="90" fill="none" stroke={isLight ? "rgba(122,101,72,0.12)" : "rgba(255,255,255,0.07)"} strokeWidth="12"/>
              <g transform="rotate(-90 110 110)">
                <circle className="mc-ring" cx="110" cy="110" r="90" fill="none"
                  stroke="url(#lobbyProgressGradient)" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={ringCircumference(90)}
                  strokeDashoffset={ringOffset(90, passProgress)}/>
              </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums ${titleClassName}`}>{passCount28}</span>
              <span className={`mt-1 text-[13px] ${bodyClassName}`}>av {passGoal} pass</span>
            </div>
          </div>

          {streak > 0 && (
            <div className={`mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full px-3 py-1 ${isLight ? "bg-[#eaf1ff] ring-1 ring-[#bed3ff]" : "bg-[#4f83ff]/[0.10] ring-1 ring-[#4f83ff]/[0.18]"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLight ? "bg-[#2563eb]" : "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.45)]"}`}/>
              <span className={`text-[13px] font-medium ${isLight ? "text-[#2f5fc4]" : "text-blue-100/90"}`}>
                {streak} {streak === 1 ? "vecka" : "veckor"} i rad
              </span>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#34d399" }}/>
              <span className={`text-[15px] ${bodyClassName}`}>
                <span className={`font-semibold tabular-nums ${titleClassName}`}>{hours28.toLocaleString("sv-SE")}</span> tim i gymmet
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-400"/>
              <span className={`text-[15px] ${bodyClassName}`}>
                <span className={`font-semibold tabular-nums ${titleClassName}`}>{tons28.toLocaleString("sv-SE")}</span> t lyft
              </span>
            </div>
          </div>
        </section>

        {/* Två fakta som inte behöver varsin låda. */}
        <section className="pt-2">
          <div className={hairlineClassName} />

          <div className="flex min-h-12 items-start justify-between gap-4 py-3.5">
            <span className={`pt-0.5 text-[15px] ${bodyClassName}`}>Senaste passet</span>
            <div className="min-w-0 text-right">
              <p className={`truncate text-[15px] font-semibold ${titleClassName}`}>
                {latestWorkout ? latestWorkout.displayName : "Inget än"}
              </p>
              <p className={`mt-0.5 text-[13px] ${bodyClassName}`}>
                {latestWorkout?.summary
                  ? `${latestWorkout.summary.durationMinutes} min · ${latestWorkout.summary.totalSets} set`
                  : "Visas när du kört ditt första"}
              </p>
            </div>
          </div>

          <div className={hairlineClassName} />

          <div className="flex min-h-12 items-start justify-between gap-4 py-3.5">
            <span className={`pt-0.5 text-[15px] ${bodyClassName}`}>Totalt</span>
            <div className="min-w-0 text-right">
              <p className={`text-[15px] font-semibold tabular-nums ${titleClassName}`}>{totalSets} set</p>
              <p className={`mt-0.5 text-[13px] ${bodyClassName}`}>
                {totalMinutes > 0 ? `${formatMinutes(totalMinutes)} loggad träning` : "Inget loggat än"}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-6 pt-2">
          <div className={hairlineClassName} />

          <div className="mt-1">
            {wrapped && !wrapped.isSpotlight && (
              <button type="button" onClick={wrapped.onOpen} className={listRowClassName}>
                <span className={`text-[15px] font-medium ${titleClassName}`}>
                  Höjdpunkter · din {wrapped.monthLabel}
                </span>
                <ChevronRightGlyph className={`h-4 w-4 shrink-0 ${isLight ? "text-[#a3927c]" : "text-white/30"}`} />
              </button>
            )}

            {overviewActions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={listRowClassName}
              >
                <span className={`text-[15px] font-medium ${titleClassName}`}>{item.label}</span>
                <ChevronRightGlyph className={`h-4 w-4 shrink-0 ${isLight ? "text-[#a3927c]" : "text-white/30"}`} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
