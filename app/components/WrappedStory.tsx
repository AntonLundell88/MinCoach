"use client";

import { useEffect, useState } from "react";
import { formatRecord } from "./LobbyScreen";
import { formatMinutes } from "./StatisticsScreen";
import { isPlannedComparisonFlattering, type WrappedStoredStats } from "../lib/wrapped";
import type { CoachWrappedResult } from "../lib/coachAi";
import { shareWrappedCard } from "../lib/wrappedShare";

type Props = {
  monthLabel: string;
  stats: WrappedStoredStats;
  captions: CoachWrappedResult;
  onClose: () => void;
};

/**
 * Korten byggs per månad i stället för att vara sju fasta index.
 *
 * En månad med tre pass har ingen svit, ingen utstickande veckodag och
 * kanske noll rekord — då stod korten där tomma eller ursäktande. Wrapped
 * ska man se fram emot, inte få smisk av. Ett kort utan något att säga
 * hoppas därför över helt; färre kort är ett bättre svar än ett tomt.
 */
type WrappedCardId =
  | "opening"
  | "activity"
  | "volume"
  | "pb"
  | "records"
  | "reflection"
  | "closing";

type WrappedCard = { id: WrappedCardId; gold?: boolean };

// OBS: Wrapped-prompten i coachPrompts.ts räknar upp vad korten visar, så
// modellen vet vad den INTE ska upprepa. Ändrar du vad ett kort visar i stor
// text — uppdatera den meningen också, annars skriver bildtexterna om
// siffror användaren redan ser.
function buildWrappedCards(stats: WrappedStoredStats): WrappedCard[] {
  const cards: WrappedCard[] = [{ id: "opening" }, { id: "activity" }];

  if (stats.totalVolumeKg > 0) cards.push({ id: "volume" });
  if (stats.biggestPb) cards.push({ id: "pb", gold: true });
  // Bara när det finns FLER rekord än det kortet ovanför redan visat —
  // annars säger de två korten samma sak med olika typsnitt.
  if (stats.pbCount >= 2) cards.push({ id: "records" });

  cards.push({ id: "reflection" }, { id: "closing", gold: true });

  return cards;
}

/**
 * Jämförelsen mot planen visas bara när den är smickrande.
 *
 * "12 av 13 planerade" är ett kvitto. "6 av 13" är en anklagelse, och det
 * är inte vad man öppnar sin Wrapped för att få höra. Under tröskeln visar
 * kortet bara antalet — lika sant, utan domen.
 */
function getPlannedComparison(stats: WrappedStoredStats) {
  if (!isPlannedComparisonFlattering(stats)) return null;

  return `av ${stats.consistency.plannedPassCount} planerade`;
}

/**
 * Den starkaste sanna raden om närvaron, i fallande ordning. Sviten först —
 * den är svårast att få till och därför mest värd att säga.
 */
function getActivitySubline(stats: WrappedStoredStats) {
  const { longestWeekStreak, topWeekday } = stats.consistency;

  if (longestWeekStreak >= 2) {
    return `${longestWeekStreak} veckor i rad utan lucka`;
  }

  if (topWeekday) {
    return `${topWeekday.count} av dem på en ${topWeekday.name}`;
  }

  return `${formatMinutes(stats.totalMinutes)} totalt`;
}

/** "juni" — utan år, för banan gäller nästan alltid samma säsong. */
function formatMonthLabel(isoDate: string) {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("sv-SE", { month: "long" }).format(parsed);
}

/** Det slagna rekordet. Egen formatering — formatRecord kräver ett
 *  PersonalRecord med exerciseName, och här är övningen redan känd. */
function formatBeatenRecord(
  previous: NonNullable<NonNullable<WrappedStoredStats["biggestPb"]>["previous"]>
) {
  if (typeof previous.durationSeconds === "number" && previous.durationSeconds > 0) {
    return `${previous.durationSeconds}s`;
  }

  return `${previous.weight.toLocaleString("sv-SE")} kg × ${previous.reps}`;
}

function formatDayLabel(isoDate: string) {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
  }).format(parsed);
}

function toTons(kg: number) {
  return Math.round((kg / 1000) * 10) / 10;
}

type SparkleParticle = { left: number; delay: number; duration: number; size: number };

// Slumpen får inte köras under render (React purity-regel) — genereras i en
// effekt istället, så partiklarna dyker upp en bråkdel av en sekund efter
// mount snarare än att finnas med i första målningen. Omärkbart för ett
// dekorativt sparkle-lager.
function useSparkleField(count: number): SparkleParticle[] {
  const [particles, setParticles] = useState<SparkleParticle[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 4,
        size: 3 + Math.random() * 3,
      }))
    );
  }, [count]);

  return particles;
}

function SparkleLayer({ particles, opacity }: { particles: SparkleParticle[]; opacity: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle, i) => (
        <span
          key={i}
          className="wrapped-sparkle absolute rounded-full bg-amber-200"
          style={{
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            opacity,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            boxShadow: "0 0 6px rgba(252,211,77,0.65)",
          }}
        />
      ))}
    </div>
  );
}

type ShareOutcome = { method: "share" | "download" } | undefined;
type ShareButtonState = "idle" | "sharing" | "shared" | "downloaded";

// Utan en tydlig "klart"-status ser knappen död ut även när delningen (eller
// nedladdningen, dess fallback) faktiskt lyckades — särskilt nedladdning
// syns lätt inte alls om man inte råkar titta i webbläsarens nedladdningar.
function ShareButton({ onShare }: { onShare: () => Promise<ShareOutcome> }) {
  const [state, setState] = useState<ShareButtonState>("idle");

  useEffect(() => {
    if (state !== "shared" && state !== "downloaded") return;
    const timeout = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(timeout);
  }, [state]);

  const label =
    state === "sharing"
      ? "Delar…"
      : state === "shared"
        ? "Delad ✓"
        : state === "downloaded"
          ? "Nedladdad ✓"
          : "Dela";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (state === "sharing") return;
        setState("sharing");
        onShare()
          .then((result) => setState(result?.method === "share" ? "shared" : "downloaded"))
          .catch(() => setState("idle"));
      }}
      className="mt-6 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-5 py-2.5 text-sm font-semibold text-amber-200 shadow-[0_0_28px_rgba(251,191,36,0.12)] transition active:scale-[0.97]"
    >
      {label}
    </button>
  );
}

export function WrappedStory({ monthLabel, stats, captions, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const ambientSparkles = useSparkleField(6);
  const burstSparkles = useSparkleField(14);
  const cards = buildWrappedCards(stats);
  const card = cards[Math.min(index, cards.length - 1)];
  const isGoldCard = Boolean(card.gold);

  const goNext = () => {
    if (index >= cards.length - 1) {
      onClose();
      return;
    }
    setIndex((current) => current + 1);
  };

  const handleShare = () =>
    // Delning avbröts eller misslyckades tyst — inget att visa, kortet finns
    // kvar precis som innan. undefined (inte void) håller typen i linje med
    // vad ShareButton kan hantera.
    shareWrappedCard("summary", { monthLabel, stats, captions }).catch(() => undefined);


  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black">
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-gradient-to-b from-[#0b1420] to-[#050810] text-white"
        onClick={goNext}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,131,255,0.14),transparent_45%)]" />
        <SparkleLayer particles={ambientSparkles} opacity={0.3} />
        {isGoldCard && <SparkleLayer particles={burstSparkles} opacity={0.75} />}

        <div className="relative z-10 flex gap-1.5 px-4 pt-[calc(env(safe-area-inset-top)+14px)]">
          {cards.map((_, segmentIndex) => (
            <div
              key={segmentIndex}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/15"
            >
              <div
                className={`h-full rounded-full bg-white/85 transition-all ${
                  segmentIndex < index
                    ? "w-full"
                    : segmentIndex === index
                      ? "w-full"
                      : "w-0"
                }`}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+8px)] z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15"
          aria-label="Stäng"
        >
          ✕
        </button>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center">
          {card.id === "opening" && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Höjdpunkter
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight">
                Din {monthLabel} är klar
              </h1>
            </>
          )}

          {card.id === "activity" && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Aktivitet
              </p>
              <p className="mt-5 text-7xl font-bold tabular-nums">{stats.passCount}</p>
              <p className="mt-2 text-xl text-white/70">
                {getPlannedComparison(stats) ?? "pass loggade"}
              </p>
              <p className="mt-1 text-sm text-white/50">{getActivitySubline(stats)}</p>
              <p className="mt-6 max-w-xs text-lg text-white/85">{captions.activityCaption}</p>
            </>
          )}

          {card.id === "volume" && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Volym
              </p>
              <p className="mt-5 text-7xl font-bold tabular-nums">
                {toTons(stats.totalVolumeKg).toLocaleString("sv-SE")}
              </p>
              <p className="mt-2 text-xl text-white/70">ton lyft den här månaden</p>
              {/* Ett totaltal är abstrakt. Ett datum är en minnesbild — du
                  minns vilket pass det var. */}
              {stats.heaviestDay && formatDayLabel(stats.heaviestDay.date) && (
                <p className="mt-6 text-sm text-white/50">
                  Tyngsta dagen: {formatDayLabel(stats.heaviestDay.date)}
                </p>
              )}
            </>
          )}

          {card.id === "pb" && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/70">
                Störst PB
              </p>
              {stats.biggestPb && (
                <>
                  <p className="mt-5 text-2xl font-semibold text-white">
                    {stats.biggestPb.exerciseName}
                  </p>
                  <p className="mt-2 text-6xl font-bold tabular-nums text-amber-200">
                    {formatRecord(stats.biggestPb)}
                  </p>
                  {/* Banan, inte tillståndet. "30 × 12" är var du står;
                      "slog 20 × 12 från juni" är vad du gjort. Det är den
                      raden som gör siffran till något att vara stolt över. */}
                  {stats.biggestPb.previous && (
                    <p className="mt-4 text-sm text-white/55">
                      slog {formatBeatenRecord(stats.biggestPb.previous)} från{" "}
                      {formatMonthLabel(stats.biggestPb.previous.createdAt)}
                    </p>
                  )}
                </>
              )}
              <p className="mt-8 max-w-xs text-lg text-white/85">{captions.pbCaption}</p>
            </>
          )}

          {card.id === "records" && (
            <>
              {/* Ersatte muskelfokus-kortet. Vilken muskelgrupp som fick
                  mest bestäms av splitten — har du bendag vinner ben, varje
                  månad, för alltid. Antalet rekord bestäms av dig. */}
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Rekord
              </p>
              <p className="mt-5 text-7xl font-bold tabular-nums">{stats.pbCount}</p>
              <p className="mt-2 text-xl text-white/70">övningar fick nya rekord</p>
              {stats.pbExerciseNames.length > 0 && (
                <p className="mt-6 max-w-xs text-lg leading-relaxed text-white/85">
                  {stats.pbExerciseNames.join(" · ")}
                </p>
              )}
            </>
          )}

          {card.id === "reflection" && (
            <p className="max-w-xs text-3xl font-semibold leading-snug">{captions.reflectionCaption}</p>
          )}

          {card.id === "closing" && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/70">
                Avslutning
              </p>
              {/* Sa förut antalet rekord igen — samma siffra som rekordkortet
                  två steg tidigare. En avslutning ska avsluta, inte
                  sammanfatta det man just sett. */}
              <h2 className="mt-5 max-w-xs text-3xl font-semibold">Vi ses nästa månad</h2>
              <ShareButton onShare={() => handleShare()} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
