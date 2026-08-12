"use client";

import { useEffect, useState } from "react";
import { formatRecord } from "./LobbyScreen";
import { formatMinutes } from "./StatisticsScreen";
import type { WrappedStoredStats } from "../lib/wrapped";
import type { CoachWrappedResult } from "../lib/coachAi";
import { shareWrappedCard } from "../lib/wrappedShare";

type Props = {
  monthLabel: string;
  stats: WrappedStoredStats;
  captions: CoachWrappedResult;
  onClose: () => void;
};

const CARD_COUNT = 7;
const GOLD_CARD_INDEXES = [3, 6];

function toTons(kg: number) {
  return Math.round((kg / 1000) * 10) / 10;
}

// Måste kännas uppmuntrande även vid 0 — annars blir sista kortet en
// besvikelse istället för en avslutning. Skiljer sig medvetet från
// PB-kortets egen null-text (kort 4) så det inte känns upprepat.
function getPbCountLine(pbCount: number) {
  if (pbCount === 0) {
    return "Inga nya personbästan den här månaden — men varje pass bygger mot nästa";
  }
  if (pbCount === 1) {
    return "1 nytt personbästa den här månaden";
  }
  return `${pbCount} nya personbästan den här månaden`;
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
  const isGoldCard = GOLD_CARD_INDEXES.includes(index);

  const goNext = () => {
    if (index >= CARD_COUNT - 1) {
      onClose();
      return;
    }
    setIndex((current) => current + 1);
  };

  const handleShare = (cardType: "pb" | "closing") =>
    // Delning avbröts eller misslyckades tyst — inget att visa, kortet finns
    // kvar precis som innan. undefined (inte void) håller typen i linje med
    // vad ShareButton kan hantera.
    shareWrappedCard(cardType, { monthLabel, stats, captions }).catch(() => undefined);

  const topMuscle = stats.muscleBreakdown[0] ?? null;

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
          {Array.from({ length: CARD_COUNT }, (_, segmentIndex) => (
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
          {index === 0 && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Höjdpunkter
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight">
                Din {monthLabel} är klar
              </h1>
            </>
          )}

          {index === 1 && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Aktivitet
              </p>
              <p className="mt-5 text-7xl font-bold tabular-nums">{stats.passCount}</p>
              <p className="mt-2 text-xl text-white/70">pass loggade</p>
              <p className="mt-1 text-sm text-white/50">{formatMinutes(stats.totalMinutes)} totalt</p>
              <p className="mt-6 max-w-xs text-lg text-white/85">{captions.activityCaption}</p>
            </>
          )}

          {index === 2 && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Volym
              </p>
              <p className="mt-5 text-7xl font-bold tabular-nums">
                {toTons(stats.totalVolumeKg).toLocaleString("sv-SE")}
              </p>
              <p className="mt-2 text-xl text-white/70">ton lyft den här månaden</p>
            </>
          )}

          {index === 3 && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/70">
                Störst PB
              </p>
              {stats.biggestPb ? (
                <>
                  <p className="mt-5 text-2xl font-semibold text-white">
                    {stats.biggestPb.exerciseName}
                  </p>
                  <p className="mt-2 text-6xl font-bold tabular-nums text-amber-200">
                    {formatRecord(stats.biggestPb)}
                  </p>
                </>
              ) : (
                <p className="mt-5 text-3xl font-semibold text-white">Konsekvens den här månaden</p>
              )}
              <p className="mt-8 max-w-xs text-lg text-white/85">{captions.pbCaption}</p>
              <ShareButton onShare={() => handleShare("pb")} />
            </>
          )}

          {index === 4 && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Muskelfokus
              </p>
              {topMuscle ? (
                <>
                  <p className="mt-5 text-4xl font-semibold capitalize">{topMuscle.category}</p>
                  <p className="mt-2 text-xl text-white/70">{topMuscle.percent}% av dina set</p>
                  <p className="mt-6 max-w-xs text-lg text-white/85">
                    Tog störst plats i din träning den här månaden
                  </p>
                </>
              ) : (
                <p className="mt-5 text-2xl text-white/70">Bred spridning den här månaden</p>
              )}
            </>
          )}

          {index === 5 && (
            <p className="max-w-xs text-3xl font-semibold leading-snug">{captions.reflectionCaption}</p>
          )}

          {index === 6 && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/70">
                Avslutning
              </p>
              <h2 className="mt-5 max-w-xs text-3xl font-semibold">{getPbCountLine(stats.pbCount)}</h2>
              <p className="mt-4 max-w-xs text-lg text-white/85">Vi ses nästa månad</p>
              <ShareButton onShare={() => handleShare("closing")} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
