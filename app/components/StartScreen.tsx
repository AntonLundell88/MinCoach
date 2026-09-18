"use client";

import { useState } from "react";
import ExerciseInfoModal from "./ExerciseInfoModal";
import { LibraryBrowser, LIBRARY_CATEGORIES, filterLibraryExercises, type LibraryExercise } from "./LibraryBrowser";
import { CloseGlyph } from "./IconGlyphs";
import { CUSTOM_EXERCISE_CATEGORIES, resolveExerciseName } from "../lib/exercises";

type PassType = "A" | "B" | "C" | "D" | "E" | "F" | "G";

type Gym = {
  id: string;
  name: string;
  createdAt: string;
};

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

  todaySwaps: Record<string, string>;
  swapPlannedExercise: (
    scheduleName: string,
    toName: string,
    scope: "today" | "schedule"
  ) => string | null;

  customExerciseInput: string;
  setCustomExerciseInput: (v: string) => void;
  addCustomExercise: (pass: PassType, name: string) => void;
  addTodayExercise: (pass: PassType, name: string) => void;
  removeTodayExercise: (pass: PassType, name: string) => void;
  removeCustomExercise: (pass: PassType, name: string) => void;
  removePlannedExercise: (name: string) => void;
  customExercisesByPass: CustomExercisesByPass;
  todayExercisesByPass: CustomExercisesByPass;
  libraryExercises: LibraryExercise[];

  startWorkout: () => void;
  hasAcceptedTrainingSafety: boolean;
  onAcceptTrainingSafety: () => void;

  setEditingProfile: (v: boolean) => void;

  gyms: Gym[];
  activeGymId: string | null;
  gymConfirmationRequired: boolean;
  onSelectGym: (id: string) => void;
  onAddGym: (name: string) => void;
  onRenameGym: (id: string, newName: string) => void;

  onBack: () => void;
  onRenamePass: (passKey: PassType, displayName: string) => void;
};

const cardClassName =
  "rounded-[1.5rem] border border-white/[0.09] bg-white/[0.05] p-4 backdrop-blur-xl";

const secondaryButtonClassName =
  "rounded-xl px-2.5 py-1 text-xs font-medium text-white/42 transition hover:bg-white/5 hover:text-white/78";

const unknownExerciseFeedback =
  "Den finns inte i biblioteket. Bläddra i listan, eller lägg in den som egen övning:";

const suggestionFeedback = (suggestion: string) =>
  `Menar du ${suggestion}? Tryck igen om det stämmer.`;

// Kategoriknappar för en egen övning. Utan hover:bg-blue-500: den klassen
// matchar en ljus-regel i globals.css och gör knapparna helblå.
function CustomCategoryButtons({ onPick }: { onPick: (category: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {CUSTOM_EXERCISE_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onPick(category)}
          className="rounded-xl border border-white/[0.09] bg-slate-950/22 px-2 py-2 text-[11px] font-semibold capitalize text-white/64 transition hover:border-blue-300/32 hover:text-white"
        >
          {category}
        </button>
      ))}
    </div>
  );
}

export default function StartScreen({
  nextPass,
  nextPassLabel,
  recommendedPass,
  availablePasses,
  onSelectPass,
  plan,
  exerciseKey,
  todaySwaps,
  swapPlannedExercise,
  customExerciseInput,
  setCustomExerciseInput,
  addCustomExercise,
  addTodayExercise,
  removeTodayExercise,
  removeCustomExercise,
  removePlannedExercise,
  customExercisesByPass,
  todayExercisesByPass,
  libraryExercises,
  startWorkout,
  hasAcceptedTrainingSafety,
  onAcceptTrainingSafety,
  setEditingProfile,
  gyms,
  activeGymId,
  gymConfirmationRequired,
  onSelectGym,
  onAddGym,
  onRenameGym,
  onBack,
  onRenamePass,
}: Props) {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showGymPicker, setShowGymPicker] = useState(false);
  const [addGymInput, setAddGymInput] = useState("");
  const [showAddGymInput, setShowAddGymInput] = useState(false);
  const [gymConfirmationNudge, setGymConfirmationNudge] = useState(false);
  const [editingGymId, setEditingGymId] = useState<string | null>(null);
  const [editingGymName, setEditingGymName] = useState("");
  const [exerciseInfoName, setExerciseInfoName] = useState<string | null>(null);
  const [isEditingExercises, setIsEditingExercises] = useState(false);
  const [showNewGymModal, setShowNewGymModal] = useState(false);
  const [pendingNewGymName, setPendingNewGymName] = useState("");
  const [isEditingPassName, setIsEditingPassName] = useState(false);
  const [editingPassName, setEditingPassName] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] =
    useState<(typeof LIBRARY_CATEGORIES)[number]>("alla");
  const [addFeedback, setAddFeedback] = useState<string | null>(null);
  const [addCustomMode, setAddCustomMode] = useState<"today" | "schedule" | null>(null);
  // Byte av en övning i listan: vilken plats som byts (schemats namn), och om
  // man väljer i biblioteket eller bekräftar namnet.
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [swapStep, setSwapStep] = useState<"browse" | "choose">("browse");
  const [swapToInput, setSwapToInput] = useState("");
  const [swapFeedback, setSwapFeedback] = useState<string | null>(null);
  const [swapCustomScope, setSwapCustomScope] = useState<"today" | "schedule" | null>(null);

  // Namnet går genom biblioteket innan det läggs till. Tidigare hände ingenting
  // alls när biblioteket inte kände igen namnet.
  function addFromInput(mode: "today" | "schedule") {
    const resolved = resolveExerciseName(customExerciseInput);
    if (resolved.status === "unknown" || resolved.status === "needsCategory") {
      setAddFeedback(unknownExerciseFeedback);
      setAddCustomMode(mode);
      return;
    }
    setAddFeedback(
      resolved.status === "suggest" ? suggestionFeedback(resolved.suggestion) : null
    );
    setAddCustomMode(null);
    (mode === "today" ? addTodayExercise : addCustomExercise)(nextPass, customExerciseInput);
  }

  function addAsCustomExercise(category: string) {
    if (!addCustomMode) return;
    const resolved = resolveExerciseName(customExerciseInput);
    const baseName =
      resolved.status === "unknown" || resolved.status === "needsCategory"
        ? resolved.name
        : customExerciseInput.trim();
    if (!baseName) return;
    (addCustomMode === "today" ? addTodayExercise : addCustomExercise)(
      nextPass,
      `egen ${category}: ${baseName}`
    );
    setAddFeedback(null);
    setAddCustomMode(null);
  }

  function openSwap(scheduleName: string) {
    setSwapTarget(scheduleName);
    setSwapStep("browse");
    setSwapToInput("");
    setSwapFeedback(null);
    setSwapCustomScope(null);
    setLibrarySearch("");
    setLibraryCategory("alla");
  }

  function finishSwap(toName: string, scope: "today" | "schedule") {
    if (!swapTarget) return;
    const problem = swapPlannedExercise(swapTarget, toName, scope);
    if (problem) {
      setSwapFeedback(problem);
      setSwapCustomScope(null);
      return;
    }
    setSwapTarget(null);
  }

  // Samma väg genom biblioteket som när man lägger till. Bara idag eller Spara
  // i schemat avgör hur länge bytet gäller.
  function swapFromInput(scope: "today" | "schedule") {
    const resolved = resolveExerciseName(swapToInput);
    if (resolved.status === "empty") return;
    if (resolved.status === "unknown" || resolved.status === "needsCategory") {
      setSwapFeedback(unknownExerciseFeedback);
      setSwapCustomScope(scope);
      return;
    }
    if (resolved.status === "suggest") {
      setSwapToInput(resolved.suggestion);
      setSwapFeedback(suggestionFeedback(resolved.suggestion));
      setSwapCustomScope(null);
      return;
    }
    finishSwap(resolved.name, scope);
  }

  function swapAsCustomExercise(category: string) {
    if (!swapCustomScope) return;
    const resolved = resolveExerciseName(swapToInput);
    const baseName =
      resolved.status === "unknown" || resolved.status === "needsCategory"
        ? resolved.name
        : swapToInput.trim();
    if (!baseName) return;
    finishSwap(`egen ${category}: ${baseName}`, swapCustomScope);
  }

  const cleanNextPassLabel = nextPassLabel.replace(" 1", "").replace(" 2", "");
  const todayExercises = todayExercisesByPass[nextPass] ?? [];
  const savedCustomExercises = customExercisesByPass[nextPass] ?? [];
  // Dagens namn för en plats i schemat: bytet om det finns, annars schemats.
  const todayNameOf = (ex: string) => todaySwaps[exerciseKey(ex)] ?? ex;
  const plannedExerciseKeys = new Set(plan.map((ex) => exerciseKey(todayNameOf(ex))));
  const visibleTodayExercises = todayExercises.filter(
    (ex) => !plannedExerciseKeys.has(exerciseKey(ex))
  );
  const visibleSavedCustomExercises = savedCustomExercises.filter(
    (ex) => !plannedExerciseKeys.has(exerciseKey(ex))
  );
  const addedExerciseCount =
    visibleTodayExercises.length + visibleSavedCustomExercises.length;
  // Biblioteket vid byte visar inte det som redan finns i dagens pass. Schemats
  // namn på en bytt plats räknas inte, så att man kan byta tillbaka.
  const takenTodayKeys = new Set([
    ...plannedExerciseKeys,
    ...todayExercises.map((ex) => exerciseKey(ex)),
  ]);

  function tryStartWorkout() {
    if (gymConfirmationRequired) {
      setShowGymPicker(true);
      if (gyms.length === 0) setShowAddGymInput(true);
      setGymConfirmationNudge(true);
      return;
    }

    if (!hasAcceptedTrainingSafety) {
      setShowSafetyModal(true);
      return;
    }

    startWorkout();
  }



  return (
    <div className="w-full max-w-lg space-y-5">
      <div className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.05] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.14)] backdrop-blur-xl">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1
              className="fade-up text-2xl font-semibold leading-tight text-white"
              style={{ animationDelay: "0s" }}
            >
              Dagens pass är redo.
            </h1>

            <button
              type="button"
              onClick={onBack}
              className="shrink-0 rounded-xl border border-white/[0.09] bg-white/[0.05] px-3 py-2 text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07]"
            >
              Tillbaka
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.09] bg-slate-950/18 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                  Dagens pass
                </p>
                {isEditingPassName ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      autoFocus
                      value={editingPassName}
                      onChange={(e) => setEditingPassName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingPassName.trim()) {
                          onRenamePass(nextPass, editingPassName.trim());
                          setIsEditingPassName(false);
                        }
                        if (e.key === "Escape") setIsEditingPassName(false);
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 text-base text-white placeholder-white/25 outline-none focus:border-white/20 sm:text-sm"
                    />
                    <button
                      type="button"
                      disabled={!editingPassName.trim()}
                      onClick={() => {
                        if (editingPassName.trim()) {
                          onRenamePass(nextPass, editingPassName.trim());
                          setIsEditingPassName(false);
                        }
                      }}
                      className="shrink-0 rounded-xl bg-[#2f6df6] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                    >
                      Spara
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPassName(false)}
                      className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50"
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-start gap-2">
                    <p className="text-xl font-semibold leading-tight text-white">
                      {cleanNextPassLabel}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPassName(cleanNextPassLabel);
                        setIsEditingPassName(true);
                      }}
                      aria-label="Byt namn på passet"
                      className="shrink-0 rounded-xl px-1.5 py-1 text-sm text-white/28 transition hover:bg-white/[0.07] hover:text-white/60"
                    >
                      ✎
                    </button>
                  </div>
                )}
                <p className="mt-1 text-sm text-white/50">
                  {plan.length + todayExercises.length} övningar idag
                </p>
              </div>

              {nextPass === recommendedPass ? (
                <span className="rounded-full border border-blue-300/18 bg-blue-500/[0.10] px-2.5 py-1 text-[11px] font-semibold text-blue-100/80">
                  Coachens val
                </span>
              ) : (
                <span className="rounded-full border border-white/[0.09] bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/55">
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
                          : "border-white/[0.09] bg-white/[0.035] text-white/58 hover:bg-white/[0.07] hover:text-white"
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

          {/* Gymväljare */}
          <div
            className={`rounded-2xl border px-4 py-3 transition ${
              gymConfirmationRequired && gymConfirmationNudge
                ? "border-amber-400/40 bg-amber-400/[0.06]"
                : "border-white/[0.09] bg-white/[0.035]"
            }`}
          >
            <p className="mb-2 text-xs text-white/35">
              {gyms.length === 1 ? "Ditt gym" : "Var tränar vi idag?"}
            </p>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2"
              onClick={() => {
                setShowGymPicker((v) => !v);
                setShowAddGymInput(false);
              }}
            >
              {/* Kräver appen att gymmet bekräftas idag är det INTE valt än,
                  hur väl vi än minns var man körde sist. Visade vi namnet ändå
                  såg valet gjort ut, och sedan vägrade Starta passet tills man
                  valde precis det som redan stod där. Etiketten följer det
                  tillstånd som redan finns — ingen ny logik. */}
              <span
                className={`truncate text-sm font-medium ${
                  gymConfirmationRequired ? "text-white/45" : "text-white/80"
                }`}
              >
                {gymConfirmationRequired
                  ? "Välj gym"
                  : gyms.find((g) => g.id === activeGymId)?.name ?? "Välj gym"}
              </span>
              <span className="text-white/30 text-xs shrink-0">{showGymPicker ? "▲" : "▼"}</span>
            </button>

            {gymConfirmationRequired && gymConfirmationNudge && (
              <p className="mt-2 text-xs text-amber-300/80">
                {gyms.length === 0
                  ? "Döp ditt gym innan du kör igång, så blir vikterna rätt från start."
                  : "Bekräfta vilket gym du kör på idag innan du startar."}
              </p>
            )}

            {showGymPicker && (
              <div className="mt-3 space-y-1 border-t border-white/[0.09] pt-3">
                {gyms.map((g) => (
                  <div key={g.id}>
                    {editingGymId === g.id ? (
                      <div className="flex gap-2 px-1 py-1">
                        <input
                          autoFocus
                          value={editingGymName}
                          onChange={(e) => setEditingGymName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingGymName.trim()) {
                              onRenameGym(g.id, editingGymName.trim());
                              setEditingGymId(null);
                            }
                            if (e.key === "Escape") setEditingGymId(null);
                          }}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 text-base text-white placeholder-white/25 outline-none focus:border-white/20 sm:text-sm"
                        />
                        <button
                          type="button"
                          disabled={!editingGymName.trim()}
                          onClick={() => {
                            if (editingGymName.trim()) {
                              onRenameGym(g.id, editingGymName.trim());
                              setEditingGymId(null);
                            }
                          }}
                          className="rounded-xl bg-[#2f6df6] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                        >
                          Spara
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGymId(null)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50"
                        >
                          Avbryt
                        </button>
                      </div>
                    ) : (
                      <div className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/[0.07]">
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-2 text-left"
                          onClick={() => {
                            onSelectGym(g.id);
                            setShowGymPicker(false);
                          }}
                        >
                          <span className={g.id === activeGymId ? "text-white/90 font-medium" : "text-white/55"}>
                            {g.name}
                          </span>
                          {g.id === activeGymId && <span className="text-[#2f6df6] text-xs">✓</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGymId(g.id);
                            setEditingGymName(g.name);
                          }}
                          className="ml-2 shrink-0 rounded-xl px-2 py-1 text-xs text-white/28 transition hover:bg-white/[0.07] hover:text-white/60"
                          aria-label={`Byt namn på ${g.name}`}
                        >
                          Byt namn
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {showAddGymInput ? (
                  <div className="flex flex-col gap-2 pt-1">
                    {gyms.length === 0 && (
                      <p className="px-1 text-xs text-white/45">
                        Vad heter gymmet du redan tränar på?
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={addGymInput}
                        onChange={(e) => setAddGymInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && addGymInput.trim()) {
                            const isFirst = gyms.length === 0;
                            if (isFirst) {
                              onAddGym(addGymInput.trim());
                              setAddGymInput("");
                            } else {
                              setPendingNewGymName(addGymInput.trim());
                              setAddGymInput("");
                              setShowAddGymInput(false);
                              setShowGymPicker(false);
                              setShowNewGymModal(true);
                            }
                          }
                          if (e.key === "Escape") {
                            setShowAddGymInput(false);
                            setAddGymInput("");
                          }
                        }}
                        placeholder="Gymnamn"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 text-base text-white placeholder-white/25 outline-none focus:border-white/20 sm:text-sm"
                      />
                      <button
                        type="button"
                        disabled={!addGymInput.trim()}
                        className="rounded-xl bg-[#2f6df6] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                        onClick={() => {
                          if (addGymInput.trim()) {
                            const isFirst = gyms.length === 0;
                            if (isFirst) {
                              onAddGym(addGymInput.trim());
                              setAddGymInput("");
                            } else {
                              setPendingNewGymName(addGymInput.trim());
                              setAddGymInput("");
                              setShowAddGymInput(false);
                              setShowGymPicker(false);
                              setShowNewGymModal(true);
                            }
                          }
                        }}
                      >
                        Spara
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/38 transition hover:bg-white/[0.07] hover:text-white/55"
                    onClick={() => setShowAddGymInput(true)}
                  >
                    <span>+</span>
                    <span>{gyms.length === 0 ? "Döp ditt gym" : "Lägg till gym"}</span>
                  </button>
                )}

                {gyms.length === 0 && !showAddGymInput && (
                  <p className="px-3 py-1 text-xs text-white/30">
                    Lägg till ett gym om maskinvikterna skiljer sig åt. Tränar du på identiska maskiner behöver du inte separata profiler.
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            className="w-full rounded-2xl bg-[#2f6df6] py-4 font-semibold text-white transition hover:bg-[#4f83ff]"
            onClick={tryStartWorkout}
          >
            Starta passet
          </button>

        </div>
      </div>

      <div className={cardClassName}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/30">Övningar</p>
          <button
            type="button"
            onClick={() => setIsEditingExercises((v) => !v)}
            className="rounded-xl px-2.5 py-1 text-xs font-medium text-white/42 transition hover:bg-white/5 hover:text-white/78"
          >
            {isEditingExercises ? "Klar" : "Redigera"}
          </button>
        </div>
        <div className="space-y-2">
          {plan.map((ex, index) => {
            const swappedTo = todaySwaps[exerciseKey(ex)];

            return (
              <div
                key={exerciseKey(ex)}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-slate-950/20 px-3 py-3 transition hover:border-white/14 hover:bg-white/[0.035]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xs font-semibold text-white/35">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white/88">
                      {todayNameOf(ex)}
                    </span>
                    {swappedTo ? (
                      <span className="block truncate text-[11px] text-white/35">
                        Bara idag · istället för {ex}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-xs font-semibold text-white/58 transition hover:bg-white/[0.10] hover:text-white"
                    onClick={() => setExerciseInfoName(todayNameOf(ex))}
                    aria-label={`Visa info om ${todayNameOf(ex)}`}
                  >
                    i
                  </button>
                  {isEditingExercises && (
                    <>
                      <button
                        type="button"
                        className={secondaryButtonClassName}
                        onClick={() => openSwap(ex)}
                      >
                        Byt
                      </button>
                      <button
                        className={secondaryButtonClassName}
                        onClick={() => removePlannedExercise(ex)}
                      >
                        Ta bort
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950/18 p-2.5 text-base text-white placeholder:text-white/25 outline-none sm:text-sm"
            value={customExerciseInput}
            onChange={(e) => {
              setCustomExerciseInput(e.target.value);
              setAddFeedback(null);
              setAddCustomMode(null);
            }}
            placeholder='t.ex. "Chins"'
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addFromInput("today");
              }
            }}
          />

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              className="start-add-mode-button rounded-xl border border-white/[0.09] bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/62 transition hover:bg-white/10 hover:text-white"
              style={{ color: "rgba(255, 255, 255, 0.72)" }}
              onClick={() => {
                addFromInput("today");
              }}
            >
              Bara idag
            </button>

            <button
              type="button"
              className="start-add-mode-button rounded-xl border border-white/[0.09] bg-white/5 px-3 py-2.5 text-sm font-medium text-white/62 transition hover:bg-white/10 hover:text-white"
              onClick={() => {
                addFromInput("schedule");
              }}
            >
              Spara i schemat
            </button>
          </div>
          {addFeedback ? (
            <p className="text-sm leading-5 text-amber-200/85">{addFeedback}</p>
          ) : null}
          {addCustomMode ? <CustomCategoryButtons onPick={addAsCustomExercise} /> : null}
          <button
            type="button"
            onClick={() => {
              setLibrarySearch("");
              setLibraryCategory("alla");
              setShowLibrary(true);
            }}
            className="w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 text-sm font-semibold text-white/58 transition hover:bg-white/[0.07] hover:text-white"
          >
            Bläddra i biblioteket
          </button>
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
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-xs font-semibold text-white/58 transition hover:bg-white/[0.10] hover:text-white"
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
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-xs font-semibold text-white/58 transition hover:bg-white/[0.10] hover:text-white"
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


      <button
        className="w-full rounded-xl px-4 py-2 text-sm font-medium text-white/35 transition hover:bg-white/5 hover:text-white/65"
        onClick={() => setEditingProfile(true)}
      >
        Ändra upplägg
      </button>
      {showLibrary ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 px-4 py-4 backdrop-blur-sm">
          <div className="max-h-[calc(100svh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
            <LibraryBrowser
              title="Lägg till övning"
              search={librarySearch}
              setSearch={setLibrarySearch}
              category={libraryCategory}
              setCategory={setLibraryCategory}
              exercises={filterLibraryExercises(libraryExercises, librarySearch, libraryCategory)}
              onClose={() => setShowLibrary(false)}
              onPick={(name) => {
                // Valet fyller i namnet; Bara idag eller Spara i schemat avgör var
                // övningen hamnar, som när man skriver själv.
                setCustomExerciseInput(name);
                setAddFeedback(null);
                setAddCustomMode(null);
                setShowLibrary(false);
              }}
              onUseManual={() => {
                setCustomExerciseInput(librarySearch);
                setShowLibrary(false);
              }}
            />
          </div>
        </div>
      ) : null}
      {swapTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 px-4 py-4 backdrop-blur-sm">
          <div className="max-h-[calc(100svh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
            {swapStep === "browse" ? (
              <LibraryBrowser
                title={`Byt ${todayNameOf(swapTarget)}`}
                search={librarySearch}
                setSearch={setLibrarySearch}
                category={libraryCategory}
                setCategory={setLibraryCategory}
                exercises={filterLibraryExercises(
                  libraryExercises.filter((exercise) => !takenTodayKeys.has(exerciseKey(exercise.name))),
                  librarySearch,
                  libraryCategory
                )}
                onClose={() => setSwapTarget(null)}
                onPick={(name) => {
                  setSwapToInput(name);
                  setSwapFeedback(null);
                  setSwapCustomScope(null);
                  setSwapStep("choose");
                }}
                onUseManual={() => {
                  setSwapToInput(librarySearch);
                  setSwapFeedback(null);
                  setSwapCustomScope(null);
                  setSwapStep("choose");
                }}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-white">
                    Byt {todayNameOf(swapTarget)} mot
                  </p>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-white/60 transition hover:bg-white/[0.10] hover:text-white"
                    onClick={() => setSwapTarget(null)}
                    aria-label="Stäng"
                  >
                    <CloseGlyph className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  className="w-full rounded-xl border border-white/[0.09] bg-slate-950/18 p-2.5 text-base text-white placeholder:text-white/25 outline-none sm:text-sm"
                  value={swapToInput}
                  onChange={(e) => {
                    setSwapToInput(e.target.value);
                    setSwapFeedback(null);
                    setSwapCustomScope(null);
                  }}
                  placeholder='t.ex. "Chins"'
                />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button
                    type="button"
                    className="start-add-mode-button rounded-xl border border-white/[0.09] bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"
                    onClick={() => swapFromInput("today")}
                  >
                    Bara idag
                  </button>
                  <button
                    type="button"
                    className="start-add-mode-button rounded-xl border border-white/[0.09] bg-white/5 px-3 py-2.5 text-sm font-medium text-white/62 transition hover:bg-white/10 hover:text-white"
                    onClick={() => swapFromInput("schedule")}
                  >
                    Spara i schemat
                  </button>
                </div>
                {swapFeedback ? (
                  <p className="text-sm leading-5 text-amber-200/85">{swapFeedback}</p>
                ) : null}
                {swapCustomScope ? <CustomCategoryButtons onPick={swapAsCustomExercise} /> : null}
                <button
                  type="button"
                  onClick={() => setSwapStep("browse")}
                  className="w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 text-sm font-semibold text-white/58 transition hover:bg-white/[0.07] hover:text-white"
                >
                  Tillbaka till listan
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {exerciseInfoName ? (
        <ExerciseInfoModal
          exerciseName={exerciseInfoName}
          onClose={() => setExerciseInfoName(null)}
        />
      ) : null}
      {showNewGymModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 px-4 py-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
              Nytt gym
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
              {pendingNewGymName}
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-white/68">
              <p>
                Ditt nya gym kanske inte har exakt samma maskiner som ditt vanliga. Det är helt okej.
              </p>
              <p>
                Om en övning saknas kan du enkelt byta ut den direkt under passet.
              </p>
              <p>
                Försök välja en övning som tränar samma muskel och har ungefär samma syfte. Ju mer den liknar originalövningen, desto bättre kan coachen följa din utveckling.
              </p>
              <p>
                Olika gym och maskiner kan kännas tyngre eller lättare trots att vikten visar samma siffra. Det är helt normalt – MinCoach håller isär historiken mellan dina gym och anpassar coachningen därefter.
              </p>
              <p>
                Du behöver inte göra några ändringar nu. Om en övning saknas hjälper MinCoach dig att lösa det när det behövs.
              </p>
            </div>

            <button
              className="mt-5 w-full rounded-2xl bg-[#2f6df6] py-3.5 text-sm font-semibold text-white transition hover:bg-[#4f83ff]"
              onClick={() => {
                onAddGym(pendingNewGymName);
                setShowNewGymModal(false);
                setPendingNewGymName("");
              }}
            >
              Jag förstår
            </button>
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
                Värm upp innan tunga set — ett par lätta set på vikten du ska
                köra minskar skaderisk och gör att musklerna presterar bättre.
              </p>
              {/* Egen rad med accentkant: rutan uppmanar till uppvärmning och
                  användaren står strax framför en loggknapp. Missas den här
                  raden räknas uppvärmningsset som arbetsset. */}
              <p className="border-l-2 border-[#2f6df6] pl-3 text-base font-semibold leading-6 text-white">
                Logga inte uppvärmningsseten — bara arbetsseten.
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
                className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.05] py-3 text-sm font-medium text-white/62 transition hover:bg-white/[0.07] hover:text-white"
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
