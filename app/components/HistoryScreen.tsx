"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

type LoggedSet = {
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
  failNote?: string;
  createdAt: string;
};

type LoggedExercise = {
  name: string;
  sets: LoggedSet[];
};

type WorkoutSummary = {
  durationMinutes: number;
  totalSets: number;
  exerciseCount: number;
  completedExerciseCount?: number;
  isPartial?: boolean;
  bestSetText: string;
  coachSummary: string;
};

type Workout = {
  id: string;
  startedAt: string;
  gym: string;
  displayName: string;
  exercises: LoggedExercise[];
  summary?: WorkoutSummary;
};

type EditingSet = {
  workoutId: string;
  exerciseName: string;
  setIdx: number;
  isTimed: boolean;
};

type Props = {
  history: Workout[];
  onBack: () => void;
  onOpenExercise: (exerciseName: string) => void;
  onEditSet?: (
    workoutId: string,
    exerciseName: string,
    setIdx: number,
    weight: number,
    reps: number,
    rir: number,
    durationSeconds?: number
  ) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function getSetLabel(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    const base = formatDuration(set.durationSeconds ?? 0);
    return set.weight > 0 ? `${base} + ${set.weight} kg` : base;
  }

  return `${set.weight} × ${set.reps}`;
}

function getSetEffortLabel(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    return "";
  }

  return `RIR ${set.rir ?? "-"}`;
}

function getSetScore(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    return (set.durationSeconds ?? 0) + set.weight * 0.1;
  }

  return set.weight * set.reps;
}

function getBestSet(exercises: LoggedExercise[]) {
  const sets = exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({ ...set, exerciseName: exercise.name }))
  );

  return sets.reduce<(LoggedSet & { exerciseName: string }) | null>(
    (best, set) => {
      if (!best) return set;
      if (getSetScore(set) > getSetScore(best)) return set;
      if (getSetScore(set) === getSetScore(best) && set.weight > best.weight) {
        return set;
      }
      return best;
    },
    null
  );
}

export default function HistoryScreen({
  history,
  onBack,
  onOpenExercise,
  onEditSet,
}: Props) {
  const workouts = useMemo(() => history, [history]);
  const [selectedId, setSelectedId] = useState<string | null>(
    workouts[0]?.id ?? null
  );
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editRir, setEditRir] = useState(2);
  const [editDuration, setEditDuration] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(workoutId: string, exerciseName: string, setIdx: number, set: LoggedSet) {
    setEditWeight(set.weight > 0 ? String(set.weight) : "");
    setEditReps(set.reps > 0 ? String(set.reps) : "");
    setEditRir(set.rir ?? 2);
    setEditDuration(
      typeof set.durationSeconds === "number" && set.durationSeconds > 0
        ? String(Math.round(set.durationSeconds))
        : ""
    );
    setEditError(null);
    setEditingSet({
      workoutId,
      exerciseName,
      setIdx,
      isTimed: set.metricType === "time" || typeof set.durationSeconds === "number",
    });
  }

  function saveEdit() {
    if (!editingSet || !onEditSet) return;

    if (editingSet.isTimed) {
      const d = parseInt(editDuration, 10);
      if (!Number.isFinite(d) || d <= 0) { setEditError("Tiden ser inte rätt ut. Kontrollera och försök igen."); return; }
      if (d > 21600) { setEditError("Tiden ser ut som en felskrivning. Kontrollera och försök igen."); return; }
      const originalWeight = parseFloat(editWeight.replace(",", ".")) || 0;
      const originalReps = parseInt(editReps, 10) || 0;
      onEditSet(editingSet.workoutId, editingSet.exerciseName, editingSet.setIdx, originalWeight, originalReps, editRir, d);
      setEditingSet(null);
      return;
    }

    const w = parseFloat(editWeight.replace(",", "."));
    const r = parseInt(editReps, 10);
    if (!Number.isFinite(w) || !Number.isFinite(r)) return;
    if (r > 200) { setEditError("Repsen ser ut som en felskrivning. Kontrollera och försök igen."); return; }
    if (w > 1000) { setEditError("Vikten verkar vara en felskrivning. Kontrollera och försök igen."); return; }
    if (w > 500) { setEditError("Ovanligt hög vikt för ett gymset. Är du säker?"); return; }
    onEditSet(editingSet.workoutId, editingSet.exerciseName, editingSet.setIdx, w, r, editRir);
    setEditingSet(null);
  }
  const selected =
    workouts.find((workout) => workout.id === selectedId) ?? workouts[0] ?? null;
  const bestSet = selected ? getBestSet(selected.exercises) : null;
  const completedExercises =
    selected?.summary?.completedExerciseCount ??
    selected?.exercises.filter((exercise) => exercise.sets.length > 0).length ??
    0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.06),transparent_28%),linear-gradient(180deg,#0b1018_0%,#111a25_45%,#0b1018_100%)]" />

      <div className="flex items-center justify-between gap-3 pt-1 sm:pt-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/45">
            Historik
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Mina pass
          </h1>
        </div>

        <button
          onClick={showWorkoutDetail ? () => setShowWorkoutDetail(false) : onBack}
          className="rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07]"
        >
          Tillbaka
        </button>
      </div>

      {selected ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.45fr]">
          <section
            className={`rounded-[1.5rem] border border-white/[0.09] bg-white/[0.032] p-3.5 backdrop-blur-2xl sm:p-4 ${
              showWorkoutDetail ? "hidden lg:block" : ""
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Mina pass
            </p>

            <div className="mt-3 space-y-2">
              {workouts.map((workout) => {
                const isActive = workout.id === selected.id;

                return (
                  <button
                    key={workout.id}
                    onClick={() => {
                      setSelectedId(workout.id);
                      setShowWorkoutDetail(true);
                    }}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                      isActive
                        ? "border-blue-400/25 bg-blue-500/[0.14]"
                        : "border-white/[0.09] bg-white/[0.048] hover:border-white/16 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-white">
                      {workout.displayName}
                    </span>
                    <span className="mt-1 block text-xs text-white/48">
                      {formatDate(workout.startedAt)} ·{" "}
                      {workout.summary?.totalSets ?? 0} set
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className={`space-y-4 ${
              showWorkoutDetail ? "" : "hidden lg:block"
            }`}
          >
            <button
              onClick={() => setShowWorkoutDetail(false)}
              className="w-full rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2.5 text-left text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07] lg:hidden"
            >
              Passlista
            </button>

            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                {formatDate(selected.startedAt)} · {formatTime(selected.startedAt)}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                {selected.displayName}
              </h2>
              {selected.summary?.coachSummary ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/74">
                  {selected.summary.coachSummary}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Tid", `${selected.summary?.durationMinutes ?? 0} min`],
                ["Set", selected.summary?.totalSets ?? 0],
                [
                  "Övningar",
                  `${completedExercises} / ${
                    selected.summary?.exerciseCount ?? selected.exercises.length
                  }`,
                ],
                [
                  "Bästa set",
                  bestSet
                    ? `${bestSet.exerciseName} · ${getSetLabel(bestSet)}`
                    : selected.summary?.bestSetText ?? "-",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1.15rem] border border-white/[0.09] bg-white/[0.032] p-3 backdrop-blur-2xl"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    {label}
                  </p>
                  <p className="mt-1.5 truncate text-base font-semibold tracking-[-0.03em] text-white sm:text-lg">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.032] p-4 backdrop-blur-2xl sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Passinnehåll
              </p>

              <div className="mt-3 space-y-2.5">
                {selected.exercises.map((exercise) => (
                  <div
                    key={exercise.name}
                    className="rounded-[1.25rem] border border-white/[0.09] bg-slate-950/22 p-3.5"
                  >
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">
                          {exercise.name}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {exercise.sets.length} set
                        </p>
                      </div>

                      {exercise.sets.length > 0 ? (
                        <button
                          onClick={() => onOpenExercise(exercise.name)}
                          className="w-full rounded-xl border border-white/[0.09] bg-white/[0.052] px-3.5 py-2 text-sm font-medium text-blue-100 transition hover:border-blue-400/25 hover:bg-[#4f83ff]/[0.10] sm:w-auto"
                        >
                          Visa progression
                        </button>
                      ) : null}
                    </div>

                    {exercise.sets.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        {exercise.sets.map((set, index) => (
                          <div
                            key={`${set.createdAt}-${index}`}
                            onClick={() => onEditSet && openEdit(selected.id, exercise.name, index, set)}
                            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-white/[0.032] px-3 py-1.5 ${onEditSet ? "cursor-pointer active:bg-white/[0.06]" : ""}`}
                          >
                            <span className="text-xs font-semibold text-white/35">
                              {index + 1}
                            </span>
                            <span className="text-base font-semibold text-white">
                              {getSetLabel(set)}
                            </span>
                            {getSetEffortLabel(set) ? (
                              <span className="text-xs font-medium text-blue-100/70">
                                {getSetEffortLabel(set)}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-white/45">
                        Inga set loggade.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="mt-4 rounded-[1.5rem] border border-white/[0.09] bg-white/[0.032] p-4 backdrop-blur-2xl sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Inga pass än
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
            När första passet är sparat syns det här.
          </h2>
        </section>
      )}

      {editingSet && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[3px]" onClick={() => setEditingSet(null)} />
          <div className="relative mx-4 mb-10 w-full max-w-md space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
            <p className="text-center text-base font-semibold text-white">
              Redigera set {editingSet.setIdx + 1}
            </p>
            <p className="text-center text-xs text-white/40">{editingSet.exerciseName}</p>

            {editingSet.isTimed && (
              <div className="space-y-1">
                <label className="text-xs text-white/50">Tid (sekunder)</label>
                <input
                  autoFocus
                  className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-3 py-2.5 text-center text-base font-semibold text-white outline-none focus:border-blue-400/40"
                  inputMode="numeric"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
            )}

            {!editingSet.isTimed && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-white/50">Vikt (kg)</label>
                  <input
                    className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-3 py-2.5 text-center text-base font-semibold text-white outline-none focus:border-blue-400/40"
                    inputMode="decimal"
                    value={editWeight}
                    onChange={(e) => { setEditWeight(e.target.value); setEditError(null); }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">Reps</label>
                  <input
                    className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-3 py-2.5 text-center text-base font-semibold text-white outline-none focus:border-blue-400/40"
                    inputMode="numeric"
                    value={editReps}
                    onChange={(e) => { setEditReps(e.target.value); setEditError(null); }}
                  />
                </div>
              </div>
            )}

            {!editingSet.isTimed && (
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">RIR</label>
                <div className="grid grid-cols-6 gap-1.5 rounded-2xl bg-white/[0.035] p-1">
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditRir(v)}
                      className={`rounded-xl border px-2 py-1.5 text-sm font-semibold transition ${
                        editRir === v
                          ? "border-blue-400/25 bg-blue-500/[0.16] text-white"
                          : "border-transparent bg-transparent text-white/64"
                      }`}
                    >
                      {v === 5 ? "5+" : v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editError && (
              <p className="rounded-2xl border border-red-400/20 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                {editError}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white transition active:scale-[0.98]"
                onClick={saveEdit}
              >
                Spara
              </button>
              <button
                className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-3.5 text-base font-semibold text-white/60 transition active:scale-[0.98]"
                onClick={() => setEditingSet(null)}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
