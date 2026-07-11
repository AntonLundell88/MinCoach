"use client";

import { useMemo, useState } from "react";
import ExerciseInfoModal from "./ExerciseInfoModal";
import { getExerciseDefinition, normalizeExerciseSearchText, KNOWN_EXERCISE_NAMES, getProgramExercisePool } from "../lib/exercises";

type PassType = "A" | "B" | "C" | "D" | "E" | "F" | "G";

type Gym = {
  id: string;
  name: string;
  createdAt: string;
  exerciseOverrides?: Record<string, string>;
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

  gyms: Gym[];
  activeGymId: string | null;
  onSelectGym: (id: string) => void;
  onAddGym: (name: string) => void;
  onUpdateGymOverride: (gymId: string, originalName: string, overrideName: string) => void;
  allProgramExercises: { passKey: string; passName: string; exercises: string[] }[];
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
  gyms,
  activeGymId,
  onSelectGym,
  onAddGym,
  onUpdateGymOverride,
  allProgramExercises,
}: Props) {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showGymPicker, setShowGymPicker] = useState(false);
  const [addGymInput, setAddGymInput] = useState("");
  const [showAddGymInput, setShowAddGymInput] = useState(false);
  const [customizingGymId, setCustomizingGymId] = useState<string | null>(null);
  const [pickingForExercise, setPickingForExercise] = useState<string | null>(null);
  const [overrideSearch, setOverrideSearch] = useState("");
  const [browsingForExercise, setBrowsingForExercise] = useState<string | null>(null);
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseCategory, setBrowseCategory] = useState("alla");
  const [exerciseInfoName, setExerciseInfoName] = useState<string | null>(null);
  const [isEditingExercises, setIsEditingExercises] = useState(false);

  const BROWSE_CATEGORIES = ["alla", "bröst", "rygg", "ben", "axlar", "armar", "mage"] as const;
  const gymLibrary = useMemo(() => getProgramExercisePool({ location: "gym", limit: 200 }), []);
  const normalizedBrowseSearch = normalizeExerciseSearchText(browseSearch);
  const filteredBrowseExercises = useMemo(
    () =>
      gymLibrary.filter((ex) => {
        const matchCat = browseCategory === "alla" || ex.category === browseCategory;
        const matchSearch =
          !normalizedBrowseSearch ||
          normalizeExerciseSearchText(`${ex.name} ${ex.primaryMuscle} ${ex.equipment}`).includes(
            normalizedBrowseSearch
          );
        return matchCat && matchSearch;
      }),
    [gymLibrary, browseCategory, normalizedBrowseSearch]
  );

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

          {/* Gymväljare */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
            <p className="mb-2 text-xs text-white/35">Var tränar vi idag?</p>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2"
              onClick={() => {
                setShowGymPicker((v) => !v);
                setShowAddGymInput(false);
              }}
            >
              <span className="truncate text-sm font-medium text-white/80">
                {gyms.find((g) => g.id === activeGymId)?.name ?? "Välj gym"}
              </span>
              <span className="text-white/30 text-xs shrink-0">{showGymPicker ? "▲" : "▼"}</span>
            </button>

            {showGymPicker && (
              <div className="mt-3 space-y-1 border-t border-white/[0.07] pt-3">
                {gyms.map((g) => (
                  <div key={g.id}>
                    <div className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/[0.06]">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left"
                        onClick={() => {
                          onSelectGym(g.id);
                          setShowGymPicker(false);
                          setCustomizingGymId(null);
                        }}
                      >
                        <span className={g.id === activeGymId ? "text-white/90 font-medium" : "text-white/55"}>
                          {g.name}
                        </span>
                        {g.id === activeGymId && <span className="text-[#2f6df6] text-xs">✓</span>}
                      </button>
                      <button
                        type="button"
                        className="ml-2 shrink-0 text-xs text-white/30 transition hover:text-white/55"
                        onClick={() => setCustomizingGymId(customizingGymId === g.id ? null : g.id)}
                      >
                        {customizingGymId === g.id ? "Stäng" : "Anpassa"}
                      </button>
                    </div>

                    {customizingGymId === g.id && allProgramExercises.length > 0 && (
                      <div className="mx-3 mb-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                        <p className="mb-2 text-xs text-white/45">
                          Saknas en övning på det här gymmet? Byt ut den mot något som tränar samma muskel. Ju mer schemat liknar originalet, desto bättre kan coachen följa din utveckling.
                        </p>
                        <div className="space-y-3">
                          {allProgramExercises.map((passGroup) => (
                            <div key={passGroup.passKey}>
                              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/30">
                                {passGroup.passName}
                              </p>
                              <div className="space-y-1.5 border-l border-white/[0.08] pl-3">
                                {(passGroup.exercises ?? []).map((exName) => {
                                  const override = g.exerciseOverrides?.[exName];
                                  const isPicking = pickingForExercise === exName && customizingGymId === g.id;
                                  const suggestions = getExerciseDefinition(exName)?.substitutions ?? [];
                                  const searchResults = overrideSearch.trim()
                                    ? KNOWN_EXERCISE_NAMES.filter((n) =>
                                        normalizeExerciseSearchText(n).includes(
                                          normalizeExerciseSearchText(overrideSearch)
                                        ) && n !== exName
                                      ).slice(0, 6)
                                    : [];

                                  return (
                                    <div key={exName}>
                                      <div className="flex items-center gap-2">
                                        <span className="w-28 shrink-0 truncate text-xs text-white/50">{exName}</span>
                                        <span className="text-xs text-white/25">→</span>
                                        <button
                                          type="button"
                                          className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                                            isPicking
                                              ? "border-white/25 bg-white/[0.08] text-white"
                                              : override
                                              ? "border-white/10 bg-white/[0.06] text-white/80"
                                              : "border-white/10 bg-white/[0.04] text-white/25"
                                          }`}
                                          onClick={() => {
                                            if (isPicking) {
                                              setPickingForExercise(null);
                                              setOverrideSearch("");
                                            } else {
                                              setPickingForExercise(exName);
                                              setOverrideSearch("");
                                            }
                                          }}
                                        >
                                          {override || exName}
                                        </button>
                                        {override && (
                                          <button
                                            type="button"
                                            className="shrink-0 text-xs text-white/25 hover:text-white/50"
                                            onClick={() => onUpdateGymOverride(g.id, exName, "")}
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>

                                      {isPicking && (
                                        <div className="mt-1.5 rounded-xl border border-white/10 bg-black/30 p-2">
                                          <input
                                            type="text"
                                            autoFocus
                                            value={overrideSearch}
                                            onChange={(e) => setOverrideSearch(e.target.value)}
                                            placeholder="Sök övning..."
                                            className="mb-2 w-full rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-white/20"
                                          />
                                          {overrideSearch.trim() === "" && suggestions.length > 0 && (
                                            <div>
                                              <p className="mb-1 px-1 text-[10px] text-white/30">Liknande övningar</p>
                                              <div className="flex flex-wrap gap-1">
                                                {suggestions.map((s) => (
                                                  <div key={s} className="flex items-center gap-0.5">
                                                    <button
                                                      type="button"
                                                      className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white/90"
                                                      onClick={() => {
                                                        onUpdateGymOverride(g.id, exName, s);
                                                        setPickingForExercise(null);
                                                        setOverrideSearch("");
                                                      }}
                                                    >
                                                      {s}
                                                    </button>
                                                    <button
                                                      type="button"
                                                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white/25 transition hover:text-white/55"
                                                      onClick={() => setExerciseInfoName(s)}
                                                    >
                                                      i
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {searchResults.length > 0 && (
                                            <div className="mt-1 space-y-0.5">
                                              {searchResults.map((s) => (
                                                <div key={s} className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-xs text-white/70 transition hover:bg-white/[0.06] hover:text-white/90"
                                                    onClick={() => {
                                                      onUpdateGymOverride(g.id, exName, s);
                                                      setPickingForExercise(null);
                                                      setOverrideSearch("");
                                                    }}
                                                  >
                                                    {s}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] text-white/25 transition hover:text-white/55"
                                                    onClick={() => setExerciseInfoName(s)}
                                                  >
                                                    i
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          <button
                                            type="button"
                                            className="mt-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-white/45 transition hover:bg-white/[0.07] hover:text-white/68"
                                            onClick={() => {
                                              setBrowsingForExercise(exName);
                                              setBrowseSearch(overrideSearch);
                                              setBrowseCategory("alla");
                                            }}
                                          >
                                            Bläddra i övningsbiblioteket
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
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
                            onAddGym(addGymInput.trim());
                            setAddGymInput("");
                            setShowAddGymInput(false);
                            setShowGymPicker(false);
                          }
                          if (e.key === "Escape") {
                            setShowAddGymInput(false);
                            setAddGymInput("");
                          }
                        }}
                        placeholder="Gymnamn"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/20"
                      />
                      <button
                        type="button"
                        disabled={!addGymInput.trim()}
                        className="rounded-xl bg-[#2f6df6] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                        onClick={() => {
                          if (addGymInput.trim()) {
                            onAddGym(addGymInput.trim());
                            setAddGymInput("");
                            setShowAddGymInput(false);
                            setShowGymPicker(false);
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
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/38 transition hover:bg-white/[0.06] hover:text-white/55"
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
              Spara i schemat
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
      {browsingForExercise ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#0e1520]">
          <div className="border-b border-white/[0.07] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                  Övningsbibliotek
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
                  Välj ersättning för {browsingForExercise}
                </h2>
              </div>
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                onClick={() => setBrowsingForExercise(null)}
                aria-label="Stäng"
              >
                ✕
              </button>
            </div>

            <input
              className="mt-4 w-full rounded-xl border border-white/[0.09] bg-slate-950/45 px-3 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-blue-300/45"
              value={browseSearch}
              onChange={(e) => setBrowseSearch(e.target.value)}
              autoFocus
              placeholder="Sök övning, muskel eller redskap"
            />

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
              {BROWSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setBrowseCategory(cat)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    browseCategory === cat
                      ? "border-blue-300/45 bg-blue-500/[0.18] text-white"
                      : "border-white/[0.08] bg-white/[0.035] text-white/50 hover:bg-white/[0.07] hover:text-white/72"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid gap-2">
              {filteredBrowseExercises.map((ex) => (
                <div
                  key={ex.exerciseKey}
                  className="rounded-2xl border border-white/[0.07] bg-slate-950/22 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">{ex.name}</h3>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100/38">
                        {ex.category} · {ex.equipment}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-xs text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                        onClick={() => setExerciseInfoName(ex.name)}
                        aria-label={`Info om ${ex.name}`}
                      >
                        i
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-[#2f6df6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4f83ff]"
                        onClick={() => {
                          if (customizingGymId) {
                            onUpdateGymOverride(customizingGymId, browsingForExercise, ex.name);
                          }
                          setBrowsingForExercise(null);
                          setPickingForExercise(null);
                          setOverrideSearch("");
                        }}
                      >
                        Välj
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredBrowseExercises.length === 0 && (
                <p className="rounded-2xl border border-white/[0.07] bg-slate-950/22 p-4 text-sm text-white/58">
                  Inga övningar matchar. Prova en annan sökning.
                </p>
              )}
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
