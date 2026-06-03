"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const BUILD_STEPS = [
  "Läser profil och mål",
  "Väger mål mot tid",
  "Analyserar träningsvana",
  "Matchar övningar mot utrustning",
  "Räknar veckovolym",
  "Balanserar push, pull och ben",
  "Söker efter onödiga krockar",
  "Säkerhetskollar begränsningar",
  "Justerar set och reps",
  "Väljer rimlig progression",
  "Kontrollerar återhämtning",
  "Bygger passordning",
  "Skriver coachens motivering",
  "Gör sista rimlighetskollen",
];

export default function ProgramBuildLoadingScreen() {
  const [activeStep, setActiveStep] = useState(0);
  const [showReassurance, setShowReassurance] = useState(false);
  const [showStillWorking, setShowStillWorking] = useState(false);
  const isFinalStep = activeStep >= BUILD_STEPS.length - 1;

  useEffect(() => {
    if (isFinalStep) return undefined;

    const timer = window.setTimeout(() => {
      setActiveStep((current) =>
        Math.min(current + 1, BUILD_STEPS.length - 1)
      );
    }, 900);

    return () => window.clearTimeout(timer);
  }, [activeStep, isFinalStep]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isFinalStep) {
      setShowReassurance(false);
      setShowStillWorking(false);
      return undefined;
    }

    const reassuranceTimer = window.setTimeout(() => {
      setShowReassurance(true);
    }, 1500);
    const stillWorkingTimer = window.setTimeout(() => {
      setShowStillWorking(true);
    }, 7000);

    return () => {
      window.clearTimeout(reassuranceTimer);
      window.clearTimeout(stillWorkingTimer);
    };
  }, [isFinalStep]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1018] px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_24%,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_18%_76%,rgba(125,96,64,0.08),transparent_26%),linear-gradient(180deg,#0b1018_0%,#111a25_52%,#0b1018_100%)]" />

      <section className="flex w-full max-w-[440px] flex-col items-center text-center">
        <div className="program-build-logo flex h-28 w-28 items-center justify-center rounded-[2rem] border border-blue-300/18 bg-blue-500/[0.07] shadow-[0_0_80px_rgba(59,130,246,0.14)] backdrop-blur-2xl">
          <Image
            src="/logo-dark.png"
            alt="MinCoach"
            width={112}
            height={112}
            className="h-20 w-20 object-contain"
            priority
          />
        </div>

        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-100/45">
          MinCoach
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Coachen bygger ditt upplägg
        </h1>

        <div className="mt-9 min-h-[92px]">
          <p
            key={activeStep}
            className={`text-lg font-semibold text-blue-100 ${
              isFinalStep ? "animate-pulse" : "program-build-step"
            }`}
          >
            {isFinalStep ? "Sätter ihop passet" : BUILD_STEPS[activeStep]}
          </p>
          <p
            className={`mt-3 text-sm font-medium text-blue-100/55 transition-all duration-700 ${
              showReassurance
                ? "translate-y-0 opacity-100"
                : "translate-y-1 opacity-0"
            }`}
          >
            Jag är strax klar.
          </p>
          <p
            className={`mt-2 text-xs font-medium text-blue-100/38 transition-all duration-700 ${
              showStillWorking
                ? "translate-y-0 opacity-100"
                : "translate-y-1 opacity-0"
            }`}
          >
            Nej, appen har inte hängt sig.
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          {BUILD_STEPS.map((step, index) => (
            <span
              key={step}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === activeStep
                  ? "w-8 bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.65)]"
                  : "w-2 bg-white/18"
              }`}
            />
          ))}
        </div>

        <p className="mt-8 max-w-[320px] text-sm leading-6 text-blue-100/52">
          Mål, tid och utrustning vägs ihop innan du får se passet.
        </p>
      </section>
    </main>
  );
}
