"use client";

import { useEffect, useState } from "react";

type PassType = "A" | "B" | "C" | "D";

type CoachNote = {
  createdAt: string;
  pass: PassType;
  gym: string;
  exerciseName?: string;
  text: string;
};

type CoachMemory = {
  notes: CoachNote[];
};

type CustomExercisesByPass = Record<PassType, string[]>;

type WorkoutSummary = {
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  bestSetText: string;
  coachSummary: string;
};

type WorkoutReview = {
  passLabel: string;
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  bestSetText: string;
  coachSummary: string;
  positives: string[];
  adjustments: string[];
  nextFocus: string[];
  progression: {
  improved: string[];
  same: string[];
  worse: string[];
};
coachMemoryTakeaway: string[];
};

type LoggedSet = {
  weight: number;
  reps: number;
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
  gym: string;
  pass: PassType;
  exercises: LoggedExercise[];
  summary?: WorkoutSummary;
};

type Props = {
  name: string;
  userProfile: {
    daysPerWeek: number;
  };
  lastPass: PassType | null;
  nextPass: PassType;
  nextPassLabel: string;
  lastPassLabel: string;
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
  removeCustomExercise: (pass: PassType, name: string) => void;
  removePlannedExercise: (name: string) => void;
  customExercisesByPass: CustomExercisesByPass;

  checkInInput: string;
  setCheckInInput: (v: string) => void;
  checkInCoachReply: string;
  setCheckInCoachReply: (v: string) => void;

  startWorkout: () => void;

  history: Workout[];
  coachMemory: CoachMemory;
  latestReview: WorkoutReview | null;
  weeklyStats: {
    passCount: number;
    totalMinutes: number;
    totalSets: number;
  };

  setEditingProfile: (v: boolean) => void;

  formatTime: (d: Date) => string;
};

const cardClassName =
  "rounded-2xl border border-white/8 bg-black/20 p-4 backdrop-blur-sm";

const secondaryButtonClassName =
  "rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white";

function TypewriterText({
  text,
}: {
  text: string;
}) {
  return <>{text}</>;
}


export default function StartScreen({
  lastPass,
  nextPass,
  nextPassLabel,
  lastPassLabel,
  now,
  userProfile,
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
  removeCustomExercise,
  removePlannedExercise,
  customExercisesByPass,
  checkInInput,
  setCheckInInput,
  checkInCoachReply,
  setCheckInCoachReply,
  startWorkout,
  history,
  coachMemory,
  latestReview,
  weeklyStats,
  setEditingProfile,
}: Props) {
  const passCount = Number.isFinite(weeklyStats.passCount)
    ? weeklyStats.passCount
    : 0;

  const [localCheckInSubmittedText, setLocalCheckInSubmittedText] = useState("");

  const cleanNextPassLabel = nextPassLabel.replace(" 1", "").replace(" 2", "");



function getLobbyIntro() {
  const lower = checkInInput.trim().toLowerCase();
  const passName = cleanNextPassLabel.toLowerCase();

  if (
    lower.includes("ont") ||
    lower.includes("smärta") ||
    lower.includes("stel") ||
    lower.includes("rygg")
  ) {
    return `Bra att du är här.\nNu kör vi ${passName}.\nFokus idag: ren teknik och jämna, stabila set från start.`;
  }

  if (
    lower.includes("trött") ||
    lower.includes("sliten") ||
    lower.includes("seg")
  ) {
    return `Bra att du är här. Nu kör vi ${passName}.\nVi tar det kontrollerat idag och låter första övningen sätta nivån.`;
  }

  if (
    lower.includes("stark") ||
    lower.includes("taggad") ||
    lower.includes("redo")
  ) {
    return `Bra att du är här. Nu kör vi ${passName}.\nDu känns redo idag, så vi bygger därifrån med bra kontroll från start.`;
  }

  if (latestReview?.coachMemoryTakeaway?.length) {
    return `Bra att du är här. Nu kör vi ${passName}.\n${latestReview.coachMemoryTakeaway[0]}`;
  }

  if (latestReview) {
    return `Bra att du är här. Nu kör vi ${passName}.\nSenast såg det stabilt ut, så idag bygger vi vidare därifrån.`;
  }

  return `Bra att du är här. Nu kör vi ${passName}.\nIdag vill jag se ren teknik och jämna set från start.`;
}



  function getTimeGreeting(date: Date, personName: string) {
    const hour = date.getHours();

    if (hour < 10) return `God morgon ${personName}.`;
    if (hour < 18) return `Hej ${personName}.`;
    return `God kväll ${personName}.`;
  }

  function getCheckInQuestion(currentPassCount: number) {
    const options = [
      "Hur känns kroppen idag?",
      "Hur känns det inför passet?",
      "Är du redo att köra?",
      "Något vi ska ta hänsyn till idag?",
    ];

    return options[currentPassCount % options.length];
  }

  function buildCheckInCoachReply(message: string) {
    const lower = message.trim().toLowerCase();

    if (!lower) return "";

    if (
      lower.includes("rygg") ||
      lower.includes("ländrygg") ||
      lower.includes("ont")
    ) {
      return "Okej. Då tar vi det kontrollerat idag. Fokusera på ren teknik från start och var försiktig om något känns fel.";
    }

    if (
      lower.includes("trött") ||
      lower.includes("sliten") ||
      lower.includes("seg") ||
      lower.includes("sovit dåligt")
    ) {
      return "Noterat. Då håller vi passet stabilt idag och bygger det lugnt från första övningen.";
    }

    if (
      lower.includes("stark") ||
      lower.includes("pigga ben") ||
      lower.includes("redo") ||
      lower.includes("taggad")
    ) {
      return "Bra. Då kan vi trycka på lite mer idag, men fortfarande med kontroll i första övningen.";
    }

    if (
      lower.includes("stel") ||
      lower.includes("stel i ryggen") ||
      lower.includes("stel i axeln")
    ) {
      return "Bra att du säger till. Då tar vi första delen av passet lugnt och känner in kroppen innan vi driver på.";
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

    return "Noterat. Jag tar med det in i dagens pass. Kör kontrollerat från start så justerar vi efter känslan.";
  }

  const latestCoachSummary =
    history[0]?.summary?.coachSummary ??
    latestReview?.coachSummary ??
    "Ingen notis än.";

  const latestBestSet = history[0]?.summary?.bestSetText ?? "-";
  const latestDuration = history[0]?.summary?.durationMinutes
    ? `${history[0].summary.durationMinutes} min`
    : "-";

  return (
    <div className="w-full max-w-lg space-y-5">
      <div className="rounded-3xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),rgba(24,24,27,0.92)_42%,rgba(10,10,15,0.98)_100%)] p-5 shadow-[0_0_60px_rgba(59,130,246,0.14)]">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-sm font-semibold text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.18)]">
              C
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                Coachen
              </p>
              <p className="text-sm font-medium text-white/85">
                Din personliga PT
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h1
              className="fade-up text-3xl font-semibold leading-tight text-white"
              style={{ animationDelay: "0s" }}
            >
              {getTimeGreeting(now, name)}
            </h1>

<p
  className="fade-up max-w-md whitespace-pre-line text-[15px] leading-7 text-white/90"
  style={{ animationDelay: "0.24s" }}
>
  {getLobbyIntro()}
</p>

    <p
  className="fade-up text-sm font-medium text-white/85"
  style={{ animationDelay: "0.36s" }}
>
  Något jag ska ta hänsyn till idag?
</p>

            <div
              className="fade-up flex items-center gap-2"
              style={{ animationDelay: "0.48s" }}
            >
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-400/30"
                value={checkInInput}
                onChange={(e) => setCheckInInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && checkInInput.trim()) {
                    setLocalCheckInSubmittedText(checkInInput);
                    setCheckInCoachReply(buildCheckInCoachReply(checkInInput));
                  }
                }}
                placeholder="t.ex. stel i ryggen, trött, stark..."
              />

              <button
                className="rounded-xl border border-blue-400/20 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_18px_rgba(59,130,246,0.16)] transition hover:bg-blue-500/20 hover:brightness-110"
                onClick={() => {
                  if (!checkInInput.trim()) return;
                  setLocalCheckInSubmittedText(checkInInput);
                  setCheckInCoachReply(buildCheckInCoachReply(checkInInput));
                }}
              >
                Skicka
              </button>
            </div>

            {localCheckInSubmittedText ? (
              <div className="fade-up rounded-2xl border border-white/10 bg-white/6 p-3 backdrop-blur-sm">
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
                className="fade-up rounded-2xl border border-blue-400/18 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),rgba(37,99,235,0.08)_55%,rgba(255,255,255,0.02)_100%)] p-3 backdrop-blur-sm"
                style={{ animationDelay: "0.56s" }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-[11px] font-semibold text-blue-200">
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
          
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-white/35">
              Dagens pass
            </p>

            <p className="mt-2 text-2xl font-semibold text-white">
              {cleanNextPassLabel}
            </p>
<p className="mt-1 text-sm text-white/50">
  {plan.length} övningar idag
</p>
          </div>

          <button
            className="w-full rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,1),rgba(37,99,235,0.9))] py-4 font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.35)] transition hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(59,130,246,0.5)]"
            onClick={startWorkout}
          >
            Starta passet
          </button>
        </div>
      </div>

      <div className={cardClassName}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Övningar idag
            </p>
          
          </div>

          <p className="text-sm font-medium text-white/55">{plan.length} övningar</p>
        </div>

        <div className="mt-3 space-y-2">
          {plan.map((ex, index) => (
            <div
              key={exerciseKey(ex)}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-3 transition hover:border-blue-400/20"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xs font-semibold text-white/35">
                  {index + 1}
                </span>
                <span className="truncate text-sm font-medium text-white/88">
                  {ex}
                </span>
              </div>

              <button
  className={secondaryButtonClassName}
  onClick={() => removePlannedExercise(ex)}
>
  Ta bort
</button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/6 bg-black/15 p-3 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/30">
              Lägg till övning
            </p>
            <p className="mt-1 text-sm text-white/58">
              Komplettera passet med något extra här.
            </p>
          </div>

          {(customExercisesByPass[nextPass]?.length ?? 0) > 0 ? (
            <p className="text-xs text-white/40">
              {customExercisesByPass[nextPass].length} tillagd
              {customExercisesByPass[nextPass].length > 1 ? "a" : ""}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-white/10 bg-black/30 p-2.5 text-sm text-white placeholder:text-white/25 outline-none"
            value={customExerciseInput}
            onChange={(e) => setCustomExerciseInput(e.target.value)}
            placeholder='t.ex. "Chins"'
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addCustomExercise(nextPass, customExerciseInput);
                setCustomExerciseInput("");
              }
            }}
          />

          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={() => {
              addCustomExercise(nextPass, customExerciseInput);
              setCustomExerciseInput("");
            }}
          >
            Lägg till
          </button>
        </div>

        {(customExercisesByPass[nextPass]?.length ?? 0) === 0 ? null : (
          <ul className="mt-3 space-y-2">
            {customExercisesByPass[nextPass].map((ex) => (
              <li
                key={exerciseKey(ex)}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2.5"
              >
                <span className="text-sm text-white/88">{ex}</span>
                <button
                  className={secondaryButtonClassName}
                  onClick={() => removeCustomExercise(nextPass, ex)}
                >
                  Ta bort
                </button>
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
              className="flex-1 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-400/30 focus:shadow-[0_0_20px_rgba(59,130,246,0.12)]"
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
              className="rounded-xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),rgba(37,99,235,0.88))] px-5 font-semibold text-white shadow-[0_0_22px_rgba(59,130,246,0.28)] transition hover:brightness-110"
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
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
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
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
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

      <div className={cardClassName}>
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">
          Snabb överblick
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p className="text-white/45">Senaste</p>
            <p className="text-white">{lastPass ? lastPassLabel : "Inget än"}</p>
          </div>

          <div>
            <p className="text-white/45">Nästa</p>
            <p className="font-semibold text-white">{cleanNextPassLabel}</p>
          </div>

          <div>
            <p className="text-white/45">Tid</p>
            <p className="text-white">{latestDuration}</p>
          </div>

          <div>
            <p className="text-white/45">Bästa set</p>
            <p className="truncate text-white">{latestBestSet}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs uppercase tracking-[0.12em] text-white/35">
            Senaste coachnotis
          </p>
          <p className="mt-2 text-sm text-white/75">{latestCoachSummary}</p>
        </div>
      </div>

      <button
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-lg font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:text-white hover:shadow-[0_0_18px_rgba(59,130,246,0.12)]"
        onClick={() => setEditingProfile(true)}
      >
        Ändra upplägg
      </button>
    </div>
  );
}