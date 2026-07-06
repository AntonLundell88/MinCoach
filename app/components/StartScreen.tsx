"use client";

import { useState } from "react";
import ExerciseInfoModal from "./ExerciseInfoModal";

type PassType = "A" | "B" | "C" | "D" | "E" | "F" | "G";

type CustomExercisesByPass = Record<PassType, string[]>;

type PassChoice = {
  key: PassType;
  label: string;
  exerciseCount: number;
};

type Props = {
  name: string;
  nextPass: PassType;
  nextPassLabel: string;
  recommendedPass: PassType;
  availablePasses: PassChoice[];
  onSelectPass: (pass: PassType) => void;
  now: Date;

  plan: string[];
  exerciseKey: (name: string) => string;

  swapFrom: string | null;
  setSwapFrom: (v: string | null) => void;
  swapToInput: string;
  setSwapToInput: (v: string) => void;

  setExerciseOverride: (
    pass: PassType,
    fromName: string,
    toName: string
  ) => void;
  clearExerciseOverride: (pass: PassType, fromName: string) => void;

  customExerciseInput: string;
  setCustomExerciseInput: (v: string) => void;
  addCustomExercise: (pass: PassType, name: string) => void;
  addTodayExercise: (pass: PassType, name: string) => void;
  removeTodayExercise: (pass: PassType, name: string) => void;
  removeCustomExercise: (pass: PassType, name: string) => void;
  removePlannedExercise: (name: string) => void;
  customExercisesByPass: CustomExercisesByPass;
  todayExercisesByPass: CustomExercisesByPass;

  startWorkout: () => void;
  hasAcceptedTrainingSafety: boolean;
  onAcceptTrainingSafety: () => void;

  setEditingProfile: (v: boolean) => void;

};

const cardClassName =
  "rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl";

const secondaryButtonClassName =
  "rounded-lg px-2.5 py-1 text-xs font-medium text-white/42 transition hover:bg-white/5 hover:text-white/78";

export default function StartScreen({
  nextPass,
  nextPassLabel,
  recommendedPass,
  availablePasses,
  onSelectPass,
  plan,
  exerciseKey,
  swapFrom,
  setSwapFrom,
  swapToInput,
  setSwapToInput,
  setExerciseOverride,
  clearExerciseOverride,
  customExerciseInput,
  setCustomExerciseInput,
  addCustomExercise,
  addTodayExercise,
  removeTodayExercise,
  removeCustomExercise,
  removePlannedExercise,
  customExercisesByPass,
  todayExercisesByPass,
  startWorkout,
  hasAcceptedTrainingSafety,
  onAcceptTrainingSafety,
  setEditingProfile,
}: Props) {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [exerciseInfoName, setExerciseInfoName] = useState<string | null>(null);
  const [isEditingExercises, setIsEditingExercises] = useState(false);

  const cleanNextPassLabel = nextPassLabel.replace(" 1", "").replace(" 2", "");
  const todayExercises = todayExercisesByPass[nextPass] ?? [];
  const savedCustomExercises = customExercisesByPass[nextPass] ?? [];
  const plannedExerciseKeys = new Set(plan.map((ex) => exerciseKey(ex)));
  const visibleTodayExercises = todayExercises.filter(
    (ex) => !plannedExerciseKeys.has(exerciseKey(ex))
  );
  const visibleSavedCustomExercises = savedCustomExercises.filter(
    (ex) => !plannedExerciseKeys.has(exerciseKey(ex))
  );
  const addedExerciseCount =
    visibleTodayExercises.length + visibleSavedCustomExercises.length;



  return (
    <div className="w-full max-w-lg space-y-5">
      <div className="rounded-[1.75rem] border border-white/[0.09] bg-white/[0.05] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.14)] backdrop-blur-xl">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1
              className="fade-up text-2xl font-semibold leading-tight text-white"
              style={{ animationDelay: "0s" }}
            >
              Dagens pass är redo.
            </h1>

          </div>
          
          <div className="rounded-2xl border border-white/[0.09] bg-slate-950/18 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                  Dagens pass
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {cleanNextPassLabel}
                </p>
                <p className="mt-1 text-sm text-white/50">
                  {plan.length + todayExercises.length} övningar idag
                </p>
              </div>

              {nextPass === recommendedPass ? (
                <span className="rounded-full border border-blue-300/18 bg-blue-500/[0.10] px-2.5 py-1 text-[11px] font-semibold text-blue-100/80">
                  Coachens val
                </span>
              ) : (
                <span className="rounded-full border border-white/[0.09] bg-white/[0.045] px-2.5 py-1 text-[11px] font-semibold text-white/55">
                  Bytt idag
                </span>
              )}
            </div>

            {availablePasses.length > 1 ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {availablePasses.map((pass) => {
                  const isActive = pass.key === nextPass;

                  return (
                    <button
                      key={pass.key}
                      type="button"
                      onClick={() => onSelectPass(pass.key)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        isActive
                          ? "border-blue-300/28 bg-blue-500/[0.14] text-white"
                          : "border-white/[0.08] bg-white/[0.035] text-white/58 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span className="block text-sm font-semibold">
                        {pass.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-white/42">
                        {pass.exerciseCount} övningar
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button
            className="w-full rounded-2xl bg-[#2f6df6] py-4 font-semibold text-white transition hover:bg-[#4f83ff]"
            onClick={() => {
              if (!hasAcceptedTrainingSafety) {
                setShowSafetyModal(true);
                return;
              }

              startWorkout();
            }}
          >
            Starta passet
          </button>

          <p className="px-1 text-center text-[12px] leading-5 text-white/42">
            Coachen kan ha fel. Avbryt eller justera om något gör ont, känns
            fel eller gör dig osäker.
          </p>
        </div>
      </div>

      <div className={cardClassName}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/30">Övningar</p>
          <button
            type="button"
            onClick={() => setIsEditingExercises((v) => !v)}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-white/42 transition hover:bg-white/5 hover:text-white/78"
          >
            {isEditingExercises ? "Klar" : "Redigera"}
          </button>
        </div>
        <div className="space-y-2">
          {plan.map((ex, index) => (
            <div
              key={exerciseKey(ex)}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-slate-950/20 px-3 py-3 transition hover:border-white/14 hover:bg-white/[0.042]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xs font-semibold text-white/35">
                  {index + 1}
                </span>
                <span className="truncate text-sm font-medium text-white/88">
                  {ex}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-xs font-semibold text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                  onClick={() => setExerciseInfoName(ex)}
                  aria-label={`Visa info om ${ex}`}
                >
                  i
                </button>
              {isEditingExercises && (
                <button
                  className={secondaryButtonClassName}
                  onClick={() => removePlannedExercise(ex)}
                >
                  Ta bort
                </button>
              )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/18 p-3 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/30">
              Lägg till övning
            </p>
          </div>

          {addedExerciseCount > 0 ? (
            <p className="text-xs text-white/40">
              {addedExerciseCount} tillagd
              {addedExerciseCount > 1 ? "a" : ""}
            </p>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          <input
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950/18 p-2.5 text-sm text-white placeholder:text-white/25 outline-none"
            value={customExerciseInput}
            onChange={(e) => setCustomExerciseInput(e.target.value)}
            placeholder='t.ex. "Chins"'
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTodayExercise(nextPass, customExerciseInput);
                setCustomExerciseInput("");
              }
            }}
          />

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              className="start-add-mode-button rounded-xl border border-white/[0.09] bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/62 transition hover:bg-white/10 hover:text-white"
              style={{ color: "rgba(255, 255, 255, 0.72)" }}
              onClick={() => {
                addTodayExercise(nextPass, customExerciseInput);
                setCustomExerciseInput("");
              }}
            >
              Bara idag
            </button>

            <button
              type="button"
              className="start-add-mode-button rounded-xl border border-white/[0.09] bg-white/5 px-3 py-2.5 text-sm font-medium text-white/62 transition hover:bg-white/10 hover:text-white"
              onClick={() => {
                addCustomExercise(nextPass, customExerciseInput);
                setCustomExerciseInput("");
              }}
            >
              I upplägget
            </button>
          </div>
        </div>

        {visibleTodayExercises.length === 0 ? null : (
          <ul className="mt-3 space-y-2">
            {visibleTodayExercises.map((ex) => (
              <li
                key={`today-${exerciseKey(ex)}`}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-slate-950/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm text-white/88">{ex}</span>
                  <span className="text-[11px] text-white/35">Bara idag</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-xs font-semibold text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                    onClick={() => setExerciseInfoName(ex)}
                    aria-label={`Visa info om ${ex}`}
                  >
                    i
                  </button>
                  {isEditingExercises && (
                    <button
                      className={secondaryButtonClassName}
                      onClick={() => removeTodayExercise(nextPass, ex)}
                    >
                      Ta bort
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {visibleSavedCustomExercises.length === 0 ? null : (
          <ul className="mt-3 space-y-2">
            {visibleSavedCustomExercises.map((ex) => (
              <li
                key={`saved-${exerciseKey(ex)}`}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-slate-950/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm text-white/88">{ex}</span>
                  <span className="text-[11px] text-white/35">I upplägget</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-xs font-semibold text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                    onClick={() => setExerciseInfoName(ex)}
                    aria-label={`Visa info om ${ex}`}
                  >
                    i
                  </button>
                  {isEditingExercises && (
                    <button
                      className={secondaryButtonClassName}
                      onClick={() => removeCustomExercise(nextPass, ex)}
                    >
                      Ta bort
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {swapFrom && (
        <div className={cardClassName}>
          <p className="text-sm text-white/75">
            Byt ut: <span className="font-semibold text-white">{swapFrom}</span>{" "}
            i <span className="font-semibold text-white">{cleanNextPassLabel}</span>
          </p>

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950/18 p-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-400/30"
              value={swapToInput}
              onChange={(e) => setSwapToInput(e.target.value)}
              placeholder='t.ex. "Hip thrust"'
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (swapFrom) {
                    setExerciseOverride(nextPass, swapFrom, swapToInput);
                  }
                  setSwapFrom(null);
                  setSwapToInput("");
                }
              }}
            />
            <button
              className="rounded-xl border border-blue-500/20 bg-[#2f6df6] px-5 font-semibold text-white transition hover:bg-[#4f83ff]"
              onClick={() => {
                if (swapFrom) {
                  setExerciseOverride(nextPass, swapFrom, swapToInput);
                }
                setSwapFrom(null);
                setSwapToInput("");
              }}
            >
              Spara
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl border border-white/[0.09] bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              onClick={() => {
                if (swapFrom) {
                  clearExerciseOverride(nextPass, swapFrom);
                }
                setSwapFrom(null);
                setSwapToInput("");
              }}
            >
              Ångra byte
            </button>

            <button
              className="flex-1 rounded-xl border border-white/[0.09] bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              onClick={() => {
                setSwapFrom(null);
                setSwapToInput("");
              }}
            >
              Stäng
            </button>
          </div>
        </div>
      )}

      <button
        className="w-full rounded-xl px-4 py-2 text-sm font-medium text-white/35 transition hover:bg-white/5 hover:text-white/65"
        onClick={() => setEditingProfile(true)}
      >
        Ändra upplägg
      </button>
      {exerciseInfoName ? (
        <ExerciseInfoModal
          exerciseName={exerciseInfoName}
          onClose={() => setExerciseInfoName(null)}
        />
      ) : null}
      {showSafetyModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
          <div className="max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
              Innan du startar
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-normal text-white sm:text-2xl">
              Du bestämmer alltid över passet.
            </h2>

            <div className="mt-4 space-y-2.5 text-sm leading-6 text-white/72">
              <p>
                MinCoach är en AI-coach. Den kan ge fel råd, missa information
                eller föreslå något som inte passar dig just idag.
              </p>
              <p>
                Gör inte en övning, vikt eller progression bara för att coachen
                föreslår det. Avbryt, sänk vikten eller hoppa över om något gör
                ont, känns fel eller gör dig osäker.
              </p>
              <p>
                Vid skada, sjukdom eller medicinska frågor ska du rådgöra med
                vårdpersonal.
              </p>
              <p>
                Vid bröstsmärta, yrsel, illamående, andfåddhet som känns fel
                eller andra tydliga varningssignaler ska du avbryta. Ring 112
                vid akuta symtom och 1177 om du är osäker i Sverige.
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              <button
                className="w-full rounded-2xl bg-[#2f6df6] py-3.5 text-sm font-semibold text-white transition hover:bg-[#4f83ff]"
                onClick={() => {
                  onAcceptTrainingSafety();
                  setShowSafetyModal(false);
                  startWorkout();
                }}
              >
                Jag förstår och vill starta
              </button>
              <button
                className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.048] py-3 text-sm font-medium text-white/62 transition hover:bg-white/[0.07] hover:text-white"
                onClick={() => setShowSafetyModal(false)}
              >
                Tillbaka
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
