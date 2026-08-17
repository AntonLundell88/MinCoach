"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import ToggleSwitch from "./ToggleSwitch";

type Goal = "muskel" | "styrka" | "fett";
type Location = "gym" | "hemma";
type Gender = "kvinna" | "man" | "annat" | "vill-inte-saga";
type TrainingExperience = "nyborjare" | "van" | "erfaren";
type ProgramStartMode = "coach" | "manual";

type Props = {
  nameInput: string;
  setNameInput: (v: string) => void;
  ageInput: string;
  setAgeInput: (v: string) => void;
  genderInput: Gender;
  setGenderInput: (v: Gender) => void;
  trainingExperienceInput: TrainingExperience | null;
  setTrainingExperienceInput: (v: TrainingExperience) => void;
  daysPerWeekInput: string;
  setDaysPerWeekInput: (v: string) => void;
  minutesPerSessionInput: string;
  setMinutesPerSessionInput: (v: string) => void;
  locationInput: Location | null;
  setLocationInput: (v: Location) => void;
  equipmentInput: string[];
  setEquipmentInput: (v: string[]) => void;
  exercisePreferencesInput: string[];
  setExercisePreferencesInput: (v: string[]) => void;
  limitationsInput: string;
  setLimitationsInput: (v: string) => void;
  goalInput: Goal | null;
  setGoalInput: (v: Goal) => void;
  secondaryGoalsInput: Goal[];
  setSecondaryGoalsInput: (v: Goal[]) => void;
  programStartModeInput: ProgramStartMode;
  setProgramStartModeInput: (v: ProgramStartMode) => void;
  isEditing: boolean;
  onCancel?: () => void;
  onSubmit: () => void;
  theme: "dark" | "light";
};

const fieldClassName =
  "w-full rounded-2xl border border-white/[0.045] bg-slate-950/35 px-3.5 py-3 text-base text-white outline-none transition focus:border-blue-300/35 focus:bg-slate-950/50 focus:ring-2 focus:ring-blue-500/20 sm:text-[15px]";

const labelClassName = "block text-[13px] font-medium text-white/76";

const goalOptions: { value: Goal; label: string; helper: string }[] = [
  { value: "muskel", label: "Muskler", helper: "bygga" },
  { value: "styrka", label: "Styrka", helper: "lyfta mer" },
  { value: "fett", label: "Fettförlust", helper: "gå ner" },
];

const equipmentOptions = [
  { value: "none", label: "Ingen", helper: "kroppsvikt" },
  { value: "dumbbells", label: "Hantlar", helper: "vikt" },
  { value: "adjustable_dumbbells", label: "Justerbara hantlar", helper: "mer vikt" },
  { value: "bench", label: "Bänk", helper: "press" },
  { value: "bands", label: "Band", helper: "drag" },
  { value: "kettlebell", label: "Kettlebell", helper: "sving" },
  { value: "barbell", label: "Skivstång", helper: "baslyft" },
  { value: "pullup_bar", label: "Pull-up bar", helper: "häng" },
  { value: "cables", label: "Kabel hemma", helper: "drag" },
  { value: "machines", label: "Maskin hemma", helper: "stabilt" },
];

const exercisePreferenceOptions = [
  {
    value: "free_weights",
    label: "Fria vikter",
    helper: "skivstång",
  },
  {
    value: "dumbbells",
    label: "Hantlar",
    helper: "enkelt att justera",
  },
  {
    value: "machines",
    label: "Maskiner",
    helper: "stabilt",
  },
  {
    value: "cables",
    label: "Kablar",
    helper: "bra kontakt",
  },
  {
    value: "bodyweight",
    label: "Kroppsvikt",
    helper: "utan redskap",
  },
  {
    value: "bands",
    label: "Band",
    helper: "lätt och flexibelt",
  },
];

const experienceOptions: {
  value: TrainingExperience;
  label: string;
  helper: string;
}[] = [
  { value: "nyborjare", label: "Ny", helper: "bygger vana" },
  { value: "van", label: "Van", helper: "tränat förr" },
  { value: "erfaren", label: "Erfaren", helper: "god koll" },
];

const experienceDescriptions: Record<TrainingExperience, string> = {
  nyborjare:
    "Coachen väljer enklare övningar, mer marginal och ett upplägg som bygger vana först.",
  van:
    "Coachen kör normal progression, lagom volym och justerar när passen visar att nivån är rätt.",
  erfaren:
    "Coachen kan ge mer frihet, tuffare progression och fler avancerade justeringar när datan stödjer det.",
};

const genderOptions: { value: Gender; label: string }[] = [
  { value: "kvinna", label: "Kvinna" },
  { value: "man", label: "Man" },
  { value: "annat", label: "Annat" },
  { value: "vill-inte-saga", label: "Hoppa över" },
];

const programStartOptions: {
  value: "coach" | "manual";
  label: string;
}[] = [
  { value: "coach", label: "Coachen bygger" },
  { value: "manual", label: "Jag styr själv" },
];

export default function SetupScreen({
  nameInput,
  setNameInput,
  ageInput,
  setAgeInput,
  genderInput,
  setGenderInput,
  trainingExperienceInput,
  setTrainingExperienceInput,
  daysPerWeekInput,
  setDaysPerWeekInput,
  minutesPerSessionInput,
  setMinutesPerSessionInput,
  locationInput,
  setLocationInput,
  equipmentInput,
  setEquipmentInput,
  exercisePreferencesInput,
  setExercisePreferencesInput,
  limitationsInput,
  setLimitationsInput,
  goalInput,
  setGoalInput,
  secondaryGoalsInput,
  setSecondaryGoalsInput,
  programStartModeInput,
  setProgramStartModeInput,
  isEditing,
  onCancel,
  onSubmit,
  theme,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedAiNotice, setAcceptedAiNotice] = useState(isEditing);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(!isEditing);
  const selectedExperienceDescription = trainingExperienceInput
    ? experienceDescriptions[trainingExperienceInput]
    : "Välj ett alternativ ovan så vet coachen var du står.";
  const missingRequiredChoice =
    !trainingExperienceInput ||
    !goalInput ||
    !minutesPerSessionInput ||
    (programStartModeInput === "coach" && !locationInput);

  function toggleEquipment(value: string) {
    if (value === "none") {
      setEquipmentInput(["none"]);
      return;
    }

    const withoutNone = equipmentInput.filter((item) => item !== "none");
    const next = withoutNone.includes(value)
      ? withoutNone.filter((item) => item !== value)
      : [...withoutNone, value];

    setEquipmentInput(next.length > 0 ? next : ["none"]);
  }

  function toggleExercisePreference(value: string) {
    setExercisePreferencesInput(
      exercisePreferencesInput.includes(value)
        ? exercisePreferencesInput.filter((item) => item !== value)
        : [...exercisePreferencesInput, value]
    );
  }

  function toggleSecondaryGoal(value: Goal) {
    if (value === goalInput) return;

    setSecondaryGoalsInput(
      secondaryGoalsInput.includes(value)
        ? secondaryGoalsInput.filter((goal) => goal !== value)
        : [...secondaryGoalsInput, value]
    );
  }

  return (
    <>
    {showWelcomeOverlay && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end sm:justify-center">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[3px]" />
        <div className="relative mx-4 mb-10 w-full max-w-lg space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/42">
              Coachen
            </p>
            <h1 className="text-xl font-semibold text-white">Hej!</h1>
          </div>
          <p className="text-sm leading-6 text-white/70">
            Välkommen till MinCoach.
          </p>
          <p className="text-sm leading-6 text-white/70">
            Nu ska vi sätta ihop ett upplägg som passar dig och dina mål.
          </p>
          <p className="text-sm leading-6 text-white/70">
            Först behöver jag lära känna dig lite bättre – var du står idag, vad du vill uppnå och vilka förutsättningar du har.
          </p>
          <p className="text-sm leading-6 text-white/70">
            Utifrån det bygger jag ett träningsupplägg som vi sedan utvecklar tillsammans. Vill du hellre skapa schemat själv går det förstås också bra.
          </p>
          <button
            type="button"
            onClick={() => setShowWelcomeOverlay(false)}
            className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] hover:bg-blue-500"
          >
            Bygg mitt schema
          </button>
        </div>
      </div>,
      document.body
    )}
    <main data-theme={theme} className="flex min-h-screen flex-col items-stretch justify-start overflow-y-auto bg-[#080d14] px-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white sm:items-center sm:justify-center sm:px-6 sm:py-4">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_34%),linear-gradient(180deg,#080d14_0%,#0d1420_48%,#080d14_100%)]" />

      <div className="w-full max-w-none space-y-0 sm:max-w-md sm:space-y-3">
        <div className="relative flex items-center justify-center py-3 sm:py-0">
          {isEditing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute left-4 rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07] sm:left-0"
            >
              Tillbaka
            </button>
          )}
          <Image
            src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
            alt="MinCoach"
            width={128}
            height={128}
            className="h-20 w-auto opacity-95 drop-shadow-[0_0_20px_rgba(59,130,246,0.26)] sm:h-24"
            priority
          />
        </div>

        <section className="rounded-none border-0 bg-white/[0.045] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-xl animate-[fadeUp_.45s_ease-out] sm:rounded-[1.6rem] sm:border sm:border-white/[0.045]">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-400/18 bg-blue-500/[0.075] text-sm font-semibold text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.10)]">
                C
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/42">
                  Coachen
                </p>
                <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-normal text-white">
                  {isEditing ? "Justera upplägget" : "Hej. Vi börjar enkelt."}
                </h1>
                <p className="mt-1.5 text-[13px] leading-5 text-white/62">
                  {isEditing
                    ? "Ändra bara det som inte stämmer längre."
                    : "Några val räcker för att jag ska kunna ge dig ett första pass."}
                </p>
              </div>
            </div>

            <form
              className="space-y-3.5"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                await new Promise((resolve) => setTimeout(resolve, 500));
                onSubmit();
              }}
            >
              <div className="rounded-2xl border border-white/[0.045] bg-slate-950/16 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/42">
                  Du
                </p>

                <div className="mt-3 space-y-3">
                  <label className={labelClassName}>
                    Vad ska jag kalla dig?
                    <input
                      className={`${fieldClassName} mt-1.5 placeholder:text-white/28`}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Ditt namn"
                    />
                  </label>

                  <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
                    <label className={labelClassName}>
                      Ålder
                      <input
                        className={`${fieldClassName} mt-1.5 placeholder:text-white/28`}
                        value={ageInput}
                        onChange={(e) => setAgeInput(e.target.value)}
                        inputMode="numeric"
                        placeholder="Valfritt"
                      />
                    </label>

                    <label className={labelClassName}>
                      Kön
                      <div className="relative mt-1.5">
                        <select
                          className={`${fieldClassName} appearance-none pr-10`}
                          value={genderInput}
                          onChange={(e) => setGenderInput(e.target.value as Gender)}
                        >
                          {genderOptions.map((gender) => (
                            <option key={gender.value} value={gender.value}>
                              {gender.label}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/42">
                          ▼
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className={labelClassName}>
                    <p>Träningsvana</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {experienceOptions.map((experience) => (
                        <button
                          key={experience.value}
                          type="button"
                          aria-pressed={trainingExperienceInput === experience.value}
                          onClick={() => setTrainingExperienceInput(experience.value)}
                          className={`min-h-12 rounded-2xl border px-2 py-2 text-center transition ${
                            trainingExperienceInput === experience.value
                              ? "setup-blue-selected border-blue-300/45 bg-blue-500/[0.18] shadow-[0_0_22px_rgba(59,130,246,0.14)]"
                              : "border-white/[0.09] bg-slate-950/36 hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="block text-[13px] font-semibold text-white">
                            {experience.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="setup-blue-selected mt-2 rounded-xl border border-blue-300/10 bg-blue-500/[0.055] px-3 py-2 text-[12px] leading-5 text-white/62">
                      {selectedExperienceDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.09] bg-slate-950/18 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/42">
                  Din träning
                </p>

                <div className="mt-3 space-y-3.5">
              <div className={labelClassName}>
                <p>Hur vill du bygga schemat?</p>
                <div className="mt-1.5 grid grid-cols-2 rounded-2xl border border-white/[0.07] bg-slate-950/36 p-1">
                  {programStartOptions.map((option) => {
                    const active =
                      option.value === "coach"
                        ? programStartModeInput === "coach"
                        : programStartModeInput !== "coach";

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setProgramStartModeInput(option.value);
                          if (
                            option.value === "coach" &&
                            Number(daysPerWeekInput) > 6
                          ) {
                            setDaysPerWeekInput("6");
                          }
                        }}
                        className={`min-h-11 rounded-xl px-3 text-center text-[13px] font-semibold transition ${
                          active
                            ? "setup-blue-selected bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.22)]"
                            : "text-white/48 hover:bg-white/[0.04] hover:text-white/70"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {programStartModeInput !== "coach" ? (
                  <p className="mt-2 text-[12px] leading-4 text-white/48">
                    Du bygger schemat i nästa steg. Här väljer du bara ramarna.
                  </p>
                ) : null}
              </div>

              <label className={labelClassName}>
                Dagar per vecka
                <div className="relative mt-1.5">
                  <select
                    className={`${fieldClassName} appearance-none pr-10`}
                    value={daysPerWeekInput}
                    onChange={(e) => setDaysPerWeekInput(e.target.value)}
                  >
                    <option value="1">1 dag</option>
                    <option value="2">2 dagar</option>
                    <option value="3">3 dagar</option>
                    <option value="4">4 dagar</option>
                    <option value="5">5 dagar</option>
                    <option value="6">6 dagar</option>
                    {programStartModeInput !== "coach" ? (
                      <option value="7">7 dagar</option>
                    ) : null}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/42">
                    ▼
                  </span>
                </div>
              </label>

              <label className={labelClassName}>
                Tid per pass
                <div className="relative mt-1.5">
                  <select
                    className={`${fieldClassName} appearance-none pr-10`}
                    value={minutesPerSessionInput}
                    onChange={(e) => setMinutesPerSessionInput(e.target.value)}
                  >
                    <option value="" disabled>
                      Välj tid
                    </option>
                    <option value="30">30 minuter</option>
                    <option value="45">45 minuter</option>
                    <option value="60">60 minuter</option>
                    <option value="75">75 minuter</option>
                    <option value="90">90 minuter</option>
                    <option value="120">120 minuter</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/42">
                    ▼
                  </span>
                </div>
              </label>

              {programStartModeInput === "coach" ? (
                <>
              <div className={labelClassName}>
                <p>Plats</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(["gym", "hemma"] as const).map((location) => (
                    <button
                      key={location}
                      type="button"
                      aria-pressed={locationInput === location}
                      onClick={() => {
                        setLocationInput(location);
                        if (location === "gym") setEquipmentInput([]);
                        if (location === "hemma" && equipmentInput.length === 0) {
                          setEquipmentInput(["none"]);
                        }
                      }}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                        locationInput === location
                          ? "setup-blue-selected border-blue-300/45 bg-blue-500/[0.18] text-white shadow-[0_0_22px_rgba(59,130,246,0.14)]"
                          : "border-white/[0.09] bg-slate-950/36 text-white/62 hover:bg-white/[0.06]"
                      }`}
                    >
                      {location === "gym" ? "Gym" : "Hemma"}
                    </button>
                  ))}
                </div>
              </div>

              {locationInput === "hemma" ? (
                <div className={labelClassName}>
                  <p>Utrustning hemma</p>
                  <p className="mt-1 text-[12px] leading-4 text-white/44">
                    Välj det du faktiskt har tillgång till.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {equipmentOptions.map((equipment) => {
                      const active = equipmentInput.includes(equipment.value);

                      return (
                        <button
                          key={equipment.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleEquipment(equipment.value)}
                          className={`min-h-12 rounded-2xl border px-3 py-2 text-center transition ${
                            active
                              ? "setup-blue-selected border-blue-300/45 bg-blue-500/[0.18] shadow-[0_0_22px_rgba(59,130,246,0.14)]"
                              : "border-white/[0.09] bg-slate-950/36 hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="block text-[13px] font-semibold text-white">
                            {equipment.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className={labelClassName}>
                <p>Vilka övningstyper gillar du?</p>
                <p className="mt-1 text-[12px] leading-4 text-white/44">
                  Valfritt. Coachen prioriterar detta när upplägget byggs.
                </p>
                <p className="mt-1 text-[12px] leading-4 text-blue-100/54">
                  Tryck på en eller flera. Blå betyder vald.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {exercisePreferenceOptions.map((preference) => {
                    const active = exercisePreferencesInput.includes(
                      preference.value
                    );

                    return (
                      <button
                        key={preference.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleExercisePreference(preference.value)}
                        className={`min-h-12 rounded-2xl border px-3 py-2 text-center transition ${
                          active
                            ? "setup-blue-selected border-blue-300/45 bg-blue-500/[0.18] text-white shadow-[0_0_22px_rgba(59,130,246,0.14)]"
                            : "border-white/[0.16] bg-white/[0.035] text-white/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:border-white/[0.24] hover:bg-white/[0.065] hover:text-white"
                        }`}
                      >
                        <span className="block text-[13px] font-semibold">
                          {preference.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
                </>
              ) : null}

              <div className={labelClassName}>
                <p>Viktigast just nu</p>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {goalOptions.map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      aria-pressed={goalInput === goal.value}
                      onClick={() => {
                        setGoalInput(goal.value);
                        setSecondaryGoalsInput(
                          secondaryGoalsInput.filter((item) => item !== goal.value)
                        );
                      }}
                      className={`min-h-12 rounded-2xl border px-2 py-2 text-center transition ${
                        goalInput === goal.value
                          ? "setup-blue-selected border-blue-300/45 bg-blue-500/[0.18] shadow-[0_0_22px_rgba(59,130,246,0.14)]"
                          : "border-white/[0.09] bg-slate-950/36 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="block text-[13px] font-semibold text-white">
                        {goal.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={labelClassName}>
                <p>Också viktigt</p>
                <p className="mt-1 text-[12px] leading-4 text-white/44">
                  Valfritt. Välj fler om de också spelar roll.
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {goalOptions.map((goal) => {
                    const isPrimary = goalInput === goal.value;
                    const active = secondaryGoalsInput.includes(goal.value);

                    return (
                      <button
                        key={goal.value}
                        type="button"
                        disabled={isPrimary}
                        aria-pressed={active}
                        onClick={() => toggleSecondaryGoal(goal.value)}
                        className={`min-h-11 rounded-2xl border px-2 py-2 text-center transition ${
                          active
                            ? "setup-blue-selected border-blue-300/35 bg-blue-500/[0.12] text-white"
                            : isPrimary
                            ? "border-white/5 bg-slate-950/22 text-white/28"
                            : "border-white/[0.09] bg-slate-950/22 text-white/62 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="block text-[12px] font-semibold">
                          {goal.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className={labelClassName}>
                Skador eller begränsningar
                <input
                  className={`${fieldClassName} mt-1.5 placeholder:text-white/28`}
                  value={limitationsInput}
                  onChange={(e) => setLimitationsInput(e.target.value)}
                  placeholder='Valfritt, t.ex. "axel" eller "ländrygg"'
                />
              </label>
                </div>
              </div>

              {!isEditing ? (
                <label className="block rounded-2xl border border-white/[0.09] bg-slate-950/22 p-3.5 text-[12px] leading-5 text-white/68">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/42">
                    AI-coach
                  </p>
                  <p className="mt-1.5">
                    MinCoach kan göra misstag. Lyssna på kroppen och avbryt om
                    något gör ont eller känns fel. Vid skada, sjukdom eller
                    medicinska frågor ska du prata med vårdpersonal.
                  </p>

                  <ToggleSwitch
                    checked={acceptedAiNotice}
                    onChange={setAcceptedAiNotice}
                    label="Jag förstår"
                    description="Coachen guidar, men kroppen bestämmer."
                    size="sm"
                    className="mt-3 rounded-2xl bg-white/[0.035] px-3 py-2.5"
                  />
                </label>
              ) : null}

              <p className="px-1 text-center text-[12px] leading-5 text-white/46">
                Du får granska upplägget innan det används.
              </p>

              {!isSubmitting && nameInput.trim().length === 0 ? (
                <p className="px-1 text-center text-[12px] leading-5 text-amber-200/72">
                  Skriv ditt namn högre upp för att fortsätta.
                </p>
              ) : !isSubmitting && !isEditing && !acceptedAiNotice ? (
                <p className="px-1 text-center text-[12px] leading-5 text-amber-200/72">
                  Bekräfta “Jag förstår” ovan för att fortsätta.
                </p>
              ) : !isSubmitting && missingRequiredChoice ? (
                <p className="px-1 text-center text-[12px] leading-5 text-amber-200/72">
                  Välj träningsvana, {programStartModeInput === "coach" ? "plats, " : ""}
                  mål och tid per pass ovan för att fortsätta.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  nameInput.trim().length === 0 ||
                  (!isEditing && !acceptedAiNotice) ||
                  missingRequiredChoice
                }
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white shadow-[0_0_26px_rgba(37,99,235,0.28)] transition hover:bg-blue-500 disabled:opacity-55"
              >
                {isSubmitting ? "Sparar..." : isEditing ? "Spara ändringar" : "Fortsätt"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
