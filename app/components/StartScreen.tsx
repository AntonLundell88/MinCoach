"use client";

import { useState } from "react";
import ExerciseInfoModal from "./ExerciseInfoModal";

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
  onRenameGym: (id: string, newName: string) => void;

  onBack: () => void;
  onRenamePass: (passKey: PassType, displayName: string) => void;
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
  onRenameGym,
  onBack,
  onRenamePass,
}: Props) {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showGymPicker, setShowGymPicker] = useState(false);
  const [addGymInput, setAddGymInput] = useState("");
  const [showAddGymInput, setShowAddGymInput] = useState(false);
  const [editingGymId, setEditingGymId] = useState<string | null>(null);
  const [editingGymName, setEditingGymName] = useState("");
  const [exerciseInfoName, setExerciseInfoName] = useState<string | null>(null);
  const [isEditingExercises, setIsEditingExercises] = useState(false);
  const [showNewGymModal, setShowNewGymModal] = useState(false);
  const [pendingNewGymName, setPendingNewGymName] = useState("");
  const [isEditingPassName, setIsEditingPassName] = useState(false);
  const [editingPassName, setEditingPassName] = useState("");

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
              className="shrink-0 rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07]"
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
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-base text-white placeholder-white/25 outline-none focus:border-white/20 sm:text-sm"
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
                      className="shrink-0 rounded-lg px-1.5 py-1 text-sm text-white/28 transition hover:bg-white/[0.06] hover:text-white/60"
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
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-base text-white placeholder-white/25 outline-none focus:border-white/20 sm:text-sm"
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
                      <div className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/[0.06]">
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
                          className="ml-2 shrink-0 rounded-lg px-2 py-1 text-xs text-white/28 transition hover:bg-white/[0.06] hover:text-white/60"
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
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-base text-white placeholder-white/25 outline-none focus:border-white/20 sm:text-sm"
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
            className="w-full rounded-xl border border-white/[0.09] bg-slate-950/18 p-2.5 text-base text-white placeholder:text-white/25 outline-none sm:text-sm"
            value={customExerciseInput}
            onChange={(e) => setCustomExerciseInput(e.target.value)}
            placeholder='t.ex. "Chins"'
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTodayExercise(nextPass, customExerciseInput);
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
              }}
            >
              Bara idag
            </button>

            <button
              type="button"
              className="start-add-mode-button rounded-xl border border-white/[0.09] bg-white/5 px-3 py-2.5 text-sm font-medium text-white/62 transition hover:bg-white/10 hover:text-white"
              onClick={() => {
                addCustomExercise(nextPass, customExerciseInput);
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
              className="flex-1 rounded-xl border border-white/[0.09] bg-slate-950/18 p-3 text-base text-white placeholder:text-white/30 outline-none transition focus:border-blue-400/30 sm:text-sm"
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
                Om en övning saknas kan du enkelt byta ut den direkt under passet. Bytet sparas automatiskt för <span className="font-medium text-white/88">{pendingNewGymName}</span>, så nästa gång används rätt övning direkt.
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
