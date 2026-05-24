"use client";

import { useState } from "react";
import { getExerciseProfile } from "../lib/exercises";
import type {
  CoachProgramSuggestion,
  CoachProgramSuggestionAction,
} from "../lib/coachAi";

type Goal = "muskel" | "styrka" | "fett";
type PassType = "A" | "B" | "C" | "D";

type UserProfile = {
  name: string;
  goalPrimary: Goal;
  goalSecondary?: Goal[];
  daysPerWeek: number;
  minutesPerSession: number;
  location: "gym" | "hemma";
  equipment: string[];
  limitations: string;
};

type WorkoutPass = {
  key: PassType;
  displayName: string;
  exercises: { name: string }[];
};

type WorkoutPlan = {
  title: string;
  goalPrimary: Goal;
  daysPerWeek: number;
  passes: WorkoutPass[];
};

type Props = {
  profile: UserProfile;
  workoutPlan: WorkoutPlan;
  preferenceInput: string;
  setPreferenceInput: (value: string) => void;
  preferenceReply: string;
  pendingProgramSuggestion: CoachProgramSuggestion | null;
  onSavePreference: () => void;
  onApproveProgramSuggestion: () => void;
  onDismissProgramSuggestion: () => void;
  onRenamePass: (passKey: PassType, displayName: string) => void;
  onRemoveExercise: (passKey: PassType, exerciseName: string) => void;
  onApprove: () => void;
  onEditProfile: () => void;
};

function goalLabel(goal: Goal) {
  if (goal === "styrka") return "styrka";
  if (goal === "fett") return "fettförlust";
  return "muskler";
}

function buildPlanReason(profile: UserProfile) {
  if (profile.goalPrimary === "styrka") {
    return `Jag prioriterar övningar där vi kan följa vikterna tydligt vecka för vecka. ${profile.daysPerWeek} dagar passar bra när vi vill bli starkare utan att varje pass blir för långt.`;
  }

  if (profile.goalPrimary === "fett") {
    return `Jag bygger pass som ger mycket gjort utan att bli stökiga. ${profile.daysPerWeek} dagar och ${profile.minutesPerSession} minuter ger oss träning som går att komma tillbaka till.`;
  }

  return `Jag lägger fokus på tillräckligt många bra set varje vecka. ${profile.daysPerWeek} dagar ger oss utrymme att bygga muskler utan att varje pass blir för långt.`;
}

function buildStructureReason(profile: UserProfile, workoutPlan: WorkoutPlan) {
  const passNames = workoutPlan.passes.map((pass) => pass.displayName).join(", ");

  if (profile.daysPerWeek <= 2) {
    return `Därför kör vi helkropp. Då får bröst, rygg och ben arbete varje vecka även med få pass.`;
  }

  if (profile.daysPerWeek === 3) {
    return `Därför delar jag upp veckan i ${passNames.toLowerCase()}. Överkropp får eget pass, benen får eget pass och helkropp fångar upp resten.`;
  }

  return `Därför delar jag upp veckan i ${passNames.toLowerCase()}. Då får varje pass ett tydligt jobb och vi slipper trycka in allt på samma dag.`;
}

function actionLabel(action: CoachProgramSuggestionAction) {
  if (action.type === "add_exercise") {
    const target = action.passName || action.passKey;
    return target
      ? `Lägg till ${action.exerciseName} i ${target}`
      : `Lägg till ${action.exerciseName}`;
  }

  if (action.type === "remove_exercise") {
    return `Ta bort ${action.exerciseName}`;
  }

  if (action.type === "replace_exercise") {
    return `Byt ${action.fromExerciseName} mot ${action.toExerciseName}`;
  }

  return `Döp pass ${action.passKey} till ${action.displayName}`;
}

export default function ProgramReviewScreen({
  profile,
  workoutPlan,
  preferenceInput,
  setPreferenceInput,
  preferenceReply,
  pendingProgramSuggestion,
  onSavePreference,
  onApproveProgramSuggestion,
  onDismissProgramSuggestion,
  onRenamePass,
  onRemoveExercise,
  onApprove,
  onEditProfile,
}: Props) {
  const [infoPass, setInfoPass] = useState<WorkoutPass | null>(null);
  const [showInputHelp, setShowInputHelp] = useState(false);
  const [editingPassKey, setEditingPassKey] = useState<PassType | null>(null);
  const [passNameInput, setPassNameInput] = useState("");
  const secondaryGoals =
    profile.goalSecondary?.filter((goal) => goal !== profile.goalPrimary) ?? [];

  function startEditingPassName(pass: WorkoutPass) {
    setEditingPassKey(pass.key);
    setPassNameInput(pass.displayName);
  }

  function savePassName(pass: WorkoutPass) {
    const nextName = passNameInput.trim();

    if (!nextName) {
      setEditingPassKey(null);
      setPassNameInput("");
      return;
    }

    onRenamePass(pass.key, nextName);
    setEditingPassKey(null);
    setPassNameInput("");
  }

  return (
    <main className="min-h-screen bg-[#0b1018] px-4 pb-5 pt-16 text-white">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4">
        <section className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/45">
            Coachen bygger upplägget
          </p>

          <h1 className="mt-3 text-[1.45rem] font-semibold leading-tight tracking-normal text-white">
            Så här tänker jag lägga upp träningen.
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/72">
            Målet först: {goalLabel(profile.goalPrimary)}.{" "}
            {secondaryGoals.length > 0
              ? `Jag tar också hänsyn till ${secondaryGoals
                  .map(goalLabel)
                  .join(" och ")}.`
              : null}
          </p>

          <div className="mt-4 rounded-2xl border border-blue-300/12 bg-blue-400/[0.055] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/48">
              Varför detta upplägg
            </p>
            <p className="mt-2 text-sm leading-6 text-white/78">
              {buildPlanReason(profile)}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/68">
              {buildStructureReason(profile, workoutPlan)}
            </p>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.048] p-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
                Upplägg
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {profile.daysPerWeek} dagar · {profile.minutesPerSession} min
              </h2>
            </div>

            <button
              className="rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-xs font-semibold text-white/68 transition hover:bg-white/[0.07] hover:text-white"
              onClick={onEditProfile}
            >
              Ändra
            </button>
          </div>

          <div className="mt-3 grid gap-2.5">
            {workoutPlan.passes.map((pass, passIndex) => (
              <div
                key={pass.key}
                className="overflow-hidden rounded-[1.35rem] border border-white/[0.085] bg-slate-950/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.032] px-3 py-3">
                  {editingPassKey === pass.key ? (
                    <div className="flex min-w-0 flex-1 gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-slate-950/45 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-white/28 focus:border-blue-300/45"
                        value={passNameInput}
                        onChange={(event) => setPassNameInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") savePassName(pass);
                          if (event.key === "Escape") {
                            setEditingPassKey(null);
                            setPassNameInput("");
                          }
                        }}
                        autoFocus
                      />
                      <button
                        className="rounded-xl bg-[#2f6df6] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4f83ff]"
                        onClick={() => savePassName(pass)}
                      >
                        Spara
                      </button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-300/14 bg-blue-400/[0.08] text-xs font-semibold text-blue-100/76">
                        {passIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-white">
                          {pass.displayName}
                        </h3>
                        <p className="mt-0.5 text-[11px] font-medium text-white/38">
                          {pass.exercises.length} övningar
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={`Visa info om ${pass.displayName}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.052] text-xs font-semibold text-white/58 transition hover:bg-white/[0.08] hover:text-white"
                      onClick={() => setInfoPass(pass)}
                    >
                      i
                    </button>
                  </div>
                </div>

                {editingPassKey !== pass.key ? (
                  <div className="flex items-center justify-end border-b border-white/[0.055] px-3 py-2">
                    <button
                      className="rounded-lg border border-white/[0.08] bg-white/[0.038] px-2.5 py-1.5 text-[11px] font-semibold text-white/56 transition hover:bg-white/[0.07] hover:text-white"
                      onClick={() => startEditingPassName(pass)}
                    >
                      Byt passnamn
                    </button>
                  </div>
                ) : null}

                <div className="grid gap-1.5 p-2.5">
                  {pass.exercises.map((exercise) => (
                    <div
                      key={`${pass.key}-${exercise.name}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 text-sm font-semibold text-white/74"
                    >
                      <span className="min-w-0 truncate">{exercise.name}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveExercise(pass.key, exercise.name)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-slate-950/18 text-sm leading-none text-white/38 transition hover:bg-white/[0.08] hover:text-white"
                        aria-label={`Ta bort ${exercise.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {infoPass ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
            <div className="max-h-[calc(100svh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                Övningar
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-normal text-white">
                    Vad betyder övningarna?
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-white/62">
                    Här ser du vilket redskap du ska använda.
                  </p>
                </div>
                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-lg leading-none text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  onClick={() => setInfoPass(null)}
                  aria-label="Stäng"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 grid gap-2.5">
                {infoPass.exercises.map((exercise) => {
                  const info = getExerciseProfile(exercise.name);

                  return (
                    <div
                      key={`${infoPass.key}-info-${exercise.name}`}
                      className="rounded-2xl border border-white/8 bg-slate-950/20 p-3"
                    >
                      <h3 className="text-sm font-semibold text-white">
                        {exercise.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/38">
                        {info.equipment}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/68">
                        {info.detail}
                      </p>
                      <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] p-2.5">
                        <p className="text-xs leading-5 text-white/64">
                          {info.techniqueCue}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/44">
                          {info.progressionRule}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.048] p-3.5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/42">
                Din input
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                Säg till om något ska ändras, om du har frågor eller om något känns fel.
              </p>
              <p className="mt-1 text-xs leading-5 text-white/46">
                Eget schema? Skriv t.ex. &quot;Dag 1: bänkpress, rodd. Dag 2: benpress, benspark.&quot;
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowInputHelp(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.052] text-xs font-semibold text-white/58 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Visa exempel på vad du kan ändra"
            >
              i
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-slate-950/45 px-3 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-blue-300/45"
              value={preferenceInput}
              onChange={(event) => setPreferenceInput(event.target.value)}
              placeholder='t.ex. "mer bröst", "inte marklyft"'
            />
            <button
              className="rounded-xl bg-[#2f6df6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4f83ff] disabled:opacity-45"
              disabled={!preferenceInput.trim()}
              onClick={onSavePreference}
            >
              Skicka
            </button>
          </div>

          {showInputHelp ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
              <div className="w-full max-w-[430px] rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                      Exempel
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
                      Vad kan jag säga?
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-lg leading-none text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                    onClick={() => setShowInputHelp(false)}
                    aria-label="Stäng"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 grid gap-2.5">
                  {[
                    "lägg till knäböj men ta bort marklyft",
                    "jag gillar inte vadpress",
                    "jag vill ha mer bröst",
                    "jag har ont i knät",
                    "Dag 1: bänkpress, hantelpress. Dag 2: latsdrag, rodd.",
                    "lägg till egen ben: benspark med z-stång",
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setPreferenceInput(example);
                        setShowInputHelp(false);
                      }}
                      className="rounded-2xl border border-white/8 bg-slate-950/20 px-3 py-2.5 text-left text-sm font-semibold leading-5 text-white/76 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-white/46">
                  Coachen föreslår ändringar. Du godkänner innan upplägget blir ditt.
                </p>
              </div>
            </div>
          ) : null}

          {preferenceReply ? (
            <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/22 p-3 text-sm leading-6 text-white/72">
              {preferenceReply}
            </div>
          ) : null}

          {pendingProgramSuggestion ? (
            <div className="mt-3 rounded-2xl border border-blue-300/18 bg-blue-400/[0.07] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/52">
                Förslag
              </p>
              <p className="mt-2 text-sm leading-6 text-white/78">
                {pendingProgramSuggestion.summary}
              </p>
              <div className="mt-3 grid gap-1.5">
                {pendingProgramSuggestion.actions.map((action, index) => (
                  <div
                    key={`${action.type}-${index}`}
                    className="rounded-xl border border-white/8 bg-slate-950/20 px-3 py-2 text-sm font-semibold text-white/76"
                  >
                    {actionLabel(action)}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="rounded-xl bg-[#2f6df6] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4f83ff]"
                  onClick={onApproveProgramSuggestion}
                >
                  Godkänn ändring
                </button>
                <button
                  className="rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2.5 text-sm font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white"
                  onClick={onDismissProgramSuggestion}
                >
                  Avbryt
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2">
            <button
              className="w-full rounded-2xl bg-[#2f6df6] py-3.5 text-sm font-semibold text-white shadow-[0_0_26px_rgba(37,99,235,0.24)] transition hover:bg-[#4f83ff]"
              onClick={onApprove}
            >
              Godkänn upplägget
            </button>
            <button
              className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.048] py-3 text-sm font-medium text-white/62 transition hover:bg-white/[0.07] hover:text-white"
              onClick={onEditProfile}
            >
              Ändra mina svar
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
