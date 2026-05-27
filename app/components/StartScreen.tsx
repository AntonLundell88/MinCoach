"use client";

import { useState } from "react";
import { getExerciseInfo } from "../lib/exercises";

type PassType = "A" | "B" | "C" | "D";

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

  checkInInput: string;
  setCheckInInput: (v: string) => void;
  checkInCoachReply: string;
  setCheckInCoachReply: (v: string) => void;

  startWorkout: () => void;
  hasAcceptedTrainingSafety: boolean;
  onAcceptTrainingSafety: () => void;

  setEditingProfile: (v: boolean) => void;

};

const cardClassName =
  "rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-xl";

const secondaryButtonClassName =
  "rounded-lg px-2.5 py-1 text-xs font-medium text-white/42 transition hover:bg-white/5 hover:text-white/78";

function TypewriterText({
  text,
}: {
  text: string;
}) {
  return <>{text}</>;
}

type CheckInIntent = {
  topic:
    | "warmup"
    | "conditioning"
    | "pain"
    | "fatigue"
    | "strong"
    | "mobility"
    | "exerciseChange"
    | "addExercise"
    | "general";
  tense: "past" | "present" | "future" | "unknown";
  intensity: "light" | "hard" | "unknown";
};

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function parseCheckInIntent(message: string): CheckInIntent {
  const lower = message.trim().toLowerCase();
  const pastWarmup = [
    "varmde upp",
    "har varmt upp",
    "varmt upp",
    "uppvarmd",
    "redan varm",
    "ar varm",
  ];
  const futureWarmup = [
    "ska varma",
    "kommer varma",
    "varmer upp",
    "varma upp",
    "uppvarmning",
  ];
  const cardio = [
    "lopband",
    "gangband",
    "cykl",
    "rodd",
    "crosstrainer",
    "spring",
    "loper",
    "kondition",
    "cardio",
    "intervall",
  ];

  const normalized = lower
    .replaceAll("\u00e5", "a")
    .replaceAll("\u00e4", "a")
    .replaceAll("\u00f6", "o");

  const hasPastWarmup = hasAny(normalized, pastWarmup);
  const hasFutureWarmup = hasAny(normalized, futureWarmup) && !hasPastWarmup;
  const mentionsCardio = hasAny(normalized, cardio);
  const hardCardio =
    normalized.includes("intervall") ||
    /(?:spring|loper|lopband|cykl|rodd).{0,24}(?:20|30|40|45|60)\s*(?:min|minuter)/.test(
      normalized
    );

  if (hasPastWarmup) {
    return {
      topic: mentionsCardio ? "conditioning" : "warmup",
      tense: "past",
      intensity: hardCardio ? "hard" : "light",
    };
  }

  if (hasFutureWarmup) {
    return {
      topic: mentionsCardio ? "conditioning" : "warmup",
      tense: "future",
      intensity: hardCardio ? "hard" : "light",
    };
  }

  if (mentionsCardio) {
    const tense =
      hasAny(normalized, ["ska", "kommer", "forst", "innan", "fore"])
        ? "future"
        : hasAny(normalized, ["sprang", "cyklade", "rodde", "gjorde"])
        ? "past"
        : "unknown";

    return {
      topic: "conditioning",
      tense,
      intensity: hardCardio ? "hard" : "unknown",
    };
  }

  if (hasAny(normalized, ["ont", "smart", "kanning", "knat", "landrygg", "rygg"])) {
    return { topic: "pain", tense: "present", intensity: "unknown" };
  }

  if (hasAny(normalized, ["trott", "sliten", "seg", "sovit daligt"])) {
    return { topic: "fatigue", tense: "present", intensity: "unknown" };
  }

  if (hasAny(normalized, ["stark", "pigga ben", "redo", "taggad"])) {
    return { topic: "strong", tense: "present", intensity: "unknown" };
  }

  if (hasAny(normalized, ["stel", "stel i ryggen", "stel i axeln"])) {
    return { topic: "mobility", tense: "present", intensity: "unknown" };
  }

  if (hasAny(normalized, ["byta", "byt", "vill inte kora"])) {
    return { topic: "exerciseChange", tense: "future", intensity: "unknown" };
  }

  if (hasAny(normalized, ["lagga till", "lagg till", "extra ovning"])) {
    return { topic: "addExercise", tense: "future", intensity: "unknown" };
  }

  return { topic: "general", tense: "unknown", intensity: "unknown" };
}

function buildIntentAwareCheckInReply(intent: CheckInIntent) {
  if (intent.topic === "warmup" && intent.tense === "past") {
    return "Bra. Starta passet n\u00e4r du \u00e4r redo.";
  }

  if (intent.topic === "warmup" && intent.tense === "future") {
    return "Bra. G\u00f6r den lugnt. Starta passet n\u00e4r du \u00e4r redo.";
  }

  if (intent.topic === "conditioning" && intent.tense === "past") {
    return intent.intensity === "hard"
      ? "Bra att du s\u00e4ger det. Jag har med mig att benen kan vara lite p\u00e5verkade idag. Starta passet n\u00e4r du \u00e4r redo."
      : "Bra. Starta passet n\u00e4r du \u00e4r redo.";
  }

  if (intent.topic === "conditioning" && intent.tense === "future") {
    return intent.intensity === "hard"
      ? "L\u00e4gg den helst efter styrkan idag. Vill du v\u00e4rma upp f\u00f6rst, h\u00e5ll det lugnt."
      : "Bra. H\u00e5ll den lugn och starta passet n\u00e4r du \u00e4r redo.";
  }

  if (intent.topic === "pain") {
    return "Okej. D\u00e5 startar vi lugnt idag. Avbryt direkt om n\u00e5got k\u00e4nns fel.";
  }

  if (intent.topic === "fatigue") {
    return "Okej. D\u00e5 b\u00f6rjar vi lite lugnare idag.";
  }

  if (intent.topic === "strong") {
    return "Bra. D\u00e5 kan vi vara lite mer offensiva idag.";
  }

  if (intent.topic === "mobility") {
    return "Bra att du s\u00e4ger till. D\u00e5 tar vi f\u00f6rsta delen lugnare.";
  }

  if (intent.topic === "exerciseChange") {
    return "Absolut. Vill du byta ut en \u00f6vning idag kan du g\u00f6ra det i listan under dagens pass.";
  }

  if (intent.topic === "addExercise") {
    return "Absolut. Vill du komplettera dagens pass kan du l\u00e4gga till en extra \u00f6vning under dagens pass.";
  }

  return "Okej. Starta passet n\u00e4r du \u00e4r redo.";
}


export default function StartScreen({
  nextPass,
  nextPassLabel,
  recommendedPass,
  availablePasses,
  onSelectPass,
  now,
  plan,
  exerciseKey,
  name,
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
  checkInInput,
  setCheckInInput,
  checkInCoachReply,
  setCheckInCoachReply,
  startWorkout,
  hasAcceptedTrainingSafety,
  onAcceptTrainingSafety,
  setEditingProfile,
}: Props) {
  const [localCheckInSubmittedText, setLocalCheckInSubmittedText] = useState("");
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [exerciseInfoName, setExerciseInfoName] = useState<string | null>(null);
  const exerciseInfo = exerciseInfoName ? getExerciseInfo(exerciseInfoName) : null;

  const cleanNextPassLabel = nextPassLabel.replace(" 1", "").replace(" 2", "");
  const todayExercises = todayExercisesByPass[nextPass] ?? [];
  const savedCustomExercises = customExercisesByPass[nextPass] ?? [];
  const addedExerciseCount = todayExercises.length + savedCustomExercises.length;



function getLobbyIntro() {
  return "Nu kör vi!";
}



  function getTimeGreeting(date: Date, personName: string) {
    const hour = date.getHours();

    if (hour < 10) return `God morgon ${personName}!`;
    if (hour < 18) return `Hej ${personName}!`;
    return `God kväll ${personName}!`;
  }

  function getCheckInQuestion() {
    return "Är det något jag ska ta hänsyn till innan vi drar igång?";
  }

  function buildCheckInCoachReply(message: string) {
    const lower = message.trim().toLowerCase();

    if (!lower) return "";

    const intent = parseCheckInIntent(message);

    if (intent.topic !== "general") {
      return buildIntentAwareCheckInReply(intent);
    }

    const hasFinishedWarmup =
      lower.includes("värmde") ||
      lower.includes("har värmt") ||
      lower.includes("värmt upp") ||
      lower.includes("uppvärmd") ||
      lower.includes("redan varm") ||
      lower.includes("är varm");

    if (hasFinishedWarmup) {
      return "Bra. Starta passet när du är redo.";
    }

    if (
      lower.includes("intervall") ||
      /(?:spring|löp|lop|cykl|rodd|gångband|gangband).{0,20}(?:20|30|40|45|60)\s*(?:min|minuter)/.test(lower)
    ) {
      return "Lägg den efter styrkan idag.";
    }

    if (
      lower.includes("ingen uppvärmning") ||
      lower.includes("ingen uppvarmning") ||
      lower.includes("hoppar uppvärm") ||
      lower.includes("hoppar uppvarm") ||
      lower.includes("skippar uppvärm") ||
      lower.includes("skippar uppvarm") ||
      lower.includes("utan uppvärm") ||
      lower.includes("utan uppvarm")
    ) {
      return "Okej. Då startar vi lugnt.";
    }

    if (
      lower.includes("cykl") ||
      lower.includes("löpband") ||
      lower.includes("gångband") ||
      lower.includes("rodd") ||
      lower.includes("crosstrainer")
    ) {
      return "Bra. Starta passet när du är redo.";
    }

    if (
      lower.includes("kondition") ||
      lower.includes("cardio") ||
      lower.includes("spring") ||
      lower.includes("löp") ||
      lower.includes("lop")
    ) {
      if (lower.includes("efter")) {
        return "Bra. Vi lägger den efter styrkan.";
      }

      if (
        lower.includes("innan") ||
        lower.includes("före") ||
        lower.includes("fore") ||
        lower.includes("först") ||
        lower.includes("forst")
      ) {
        return "Håll den lugn före styrkan. Vill du köra hårt lägger vi den efter.";
      }

      return "Bra. Jag räknar med det när vi startar.";
    }

    if (
      lower.includes("lätt set") ||
      lower.includes("lätta set") ||
      lower.includes("uppvärmningsset")
    ) {
      return "Bra. Starta passet när du är redo.";
    }

    if (
      lower.includes("redan varm") ||
      lower.includes("är varm") ||
      lower.includes("värmer") ||
      lower.includes("värma") ||
      lower.includes("värmt upp") ||
      lower.includes("uppvärmd")
    ) {
      return "Bra. Då tar vi första arbetssetet.";
    }

    if (
      lower.includes("rygg") ||
      lower.includes("ländrygg") ||
      lower.includes("ont")
    ) {
      return "Okej. Då startar vi lugnt idag. Avbryt direkt om något känns fel.";
    }

    if (
      lower.includes("trött") ||
      lower.includes("sliten") ||
      lower.includes("seg") ||
      lower.includes("sovit dåligt")
    ) {
      return "Okej. Då börjar vi lite lugnare idag.";
    }

    if (
      lower.includes("stark") ||
      lower.includes("pigga ben") ||
      lower.includes("redo") ||
      lower.includes("taggad")
    ) {
      return "Bra. Då kan vi vara lite mer offensiva idag.";
    }

    if (
      lower.includes("stel") ||
      lower.includes("stel i ryggen") ||
      lower.includes("stel i axeln")
    ) {
      return "Bra att du säger till. Då tar vi första delen lugnare.";
    }

    if (
      lower.includes("byta") ||
      lower.includes("byt") ||
      lower.includes("vill inte köra")
    ) {
      return "Absolut. Vill du byta ut en övning idag kan du göra det i listan under dagens pass med knappen 'Byt'.";
    }

    if (
      lower.includes("lägga till") ||
      lower.includes("lägg till") ||
      lower.includes("extra övning")
    ) {
      return "Absolut. Vill du komplettera dagens pass kan du lägga till en extra övning i rutan 'Lägg till övning' under dagens pass.";
    }

    return "Okej. Första setet visar oss var vi ligger.";
  }

  return (
    <div className="w-full max-w-lg space-y-5">
      <div className="rounded-[1.75rem] border border-white/[0.09] bg-white/[0.05] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.14)] backdrop-blur-xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.055] text-sm font-semibold text-blue-100">
              C
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/38">
                Coachen
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h1
              className="fade-up text-2xl font-semibold leading-tight text-white"
              style={{ animationDelay: "0s" }}
            >
              {getTimeGreeting(now, name)}
            </h1>

<p
  className="fade-up max-w-md whitespace-pre-line text-[15px] leading-6 text-white/82"
  style={{ animationDelay: "0.24s" }}
>
  {getLobbyIntro()}
</p>

    <p
  className="fade-up pt-1 text-sm font-medium text-white/78"
  style={{ animationDelay: "0.36s" }}
>
  {getCheckInQuestion()}
</p>

            <div
              className="fade-up flex items-center gap-2"
              style={{ animationDelay: "0.48s" }}
            >
              <input
                className="w-full rounded-xl border border-white/[0.09] bg-slate-950/18 p-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-400/30"
                value={checkInInput}
                onChange={(e) => setCheckInInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && checkInInput.trim()) {
                    setLocalCheckInSubmittedText(checkInInput);
                    setCheckInCoachReply(buildCheckInCoachReply(checkInInput));
                  }
                }}
                placeholder="Skriv till coachen..."
              />

              <button
                className="rounded-xl border border-blue-500/20 bg-[#2f6df6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4f83ff]"
                onClick={() => {
                  if (!checkInInput.trim()) return;
                  setLocalCheckInSubmittedText(checkInInput);
                  setCheckInCoachReply(buildCheckInCoachReply(checkInInput));
                }}
              >
                Skicka
              </button>
            </div>

            <p
              className="fade-up text-xs leading-5 text-white/38"
              style={{ animationDelay: "0.56s" }}
            >
              Skriv fritt, t.ex. “uppvärmning 5 min löpband”, “jag är trött” eller “jag springer 20 min först”.
            </p>

            {localCheckInSubmittedText ? (
              <div className="fade-up rounded-2xl border border-white/[0.09] bg-white/6 p-3 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                      Du
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/88">
                      {localCheckInSubmittedText}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {checkInCoachReply ? (
              <div
                className="fade-up rounded-2xl border border-white/[0.09] bg-slate-950/18 p-3 backdrop-blur-sm"
                style={{ animationDelay: "0.56s" }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.052] text-[11px] font-semibold text-blue-100">
                    C
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/38">
                      Coachen
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/86">
                      <TypewriterText text={checkInCoachReply} />
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
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
              <button
  className={secondaryButtonClassName}
  onClick={() => removePlannedExercise(ex)}
>
  Ta bort
</button>
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
              className="rounded-xl bg-white/88 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-white"
              onClick={() => {
                addTodayExercise(nextPass, customExerciseInput);
                setCustomExerciseInput("");
              }}
            >
              Bara idag
            </button>

            <button
              className="rounded-xl border border-white/[0.09] bg-white/5 px-3 py-2.5 text-sm font-medium text-white/62 transition hover:bg-white/10 hover:text-white"
              onClick={() => {
                addCustomExercise(nextPass, customExerciseInput);
                setCustomExerciseInput("");
              }}
            >
              I upplägget
            </button>
          </div>
        </div>

        {todayExercises.length === 0 ? null : (
          <ul className="mt-3 space-y-2">
            {todayExercises.map((ex) => (
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
                  <button
                    className={secondaryButtonClassName}
                    onClick={() => removeTodayExercise(nextPass, ex)}
                  >
                    Ta bort
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {savedCustomExercises.length === 0 ? null : (
          <ul className="mt-3 space-y-2">
            {savedCustomExercises.map((ex) => (
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
                  <button
                    className={secondaryButtonClassName}
                    onClick={() => removeCustomExercise(nextPass, ex)}
                  >
                    Ta bort
                  </button>
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
      {exerciseInfoName && exerciseInfo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                  Övningsinfo
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
                  {exerciseInfoName}
                </h2>
              </div>

              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-lg leading-none text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                onClick={() => setExerciseInfoName(null)}
                aria-label="Stäng"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/42">
                {exerciseInfo.equipment}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                {exerciseInfo.detail}
              </p>
            </div>
          </div>
        </div>
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
