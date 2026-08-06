"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type LoggedSet = {
  createdAt: string;
  weight: number;
  reps: number;
  durationSeconds?: number;
  metricType?: "reps" | "time";
  rir?: number;
};

type Props = {
  currentSets: LoggedSet[];
  onEditSet?: (
    setIdx: number,
    weight: number,
    reps: number,
    rir: number,
    durationSeconds?: number
  ) => void;
  validateWeight?: (weight: number) => string | null;
};

function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;

  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getSetLabel(set: LoggedSet) {
  if (set.metricType === "time" || typeof set.durationSeconds === "number") {
    const base = formatDuration(set.durationSeconds ?? 0);
    return set.weight > 0 ? `${base} + ${set.weight} kg` : base;
  }

  return `${set.weight} × ${set.reps}`;
}

function getEffortLabel(set: LoggedSet) {
  if (typeof set.rir !== "number") return "-";
  if (set.metricType === "time" || typeof set.durationSeconds === "number") return "";
  return `RIR ${set.rir}`;
}

export default function SetList({ currentSets, onEditSet, validateWeight }: Props) {
  const setListContainerRef = useRef<HTMLDivElement | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editRir, setEditRir] = useState(2);
  const [editDuration, setEditDuration] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (currentSets.length === 0) return;
    const el = setListContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [currentSets.length]);

  function openEdit(index: number) {
    const set = currentSets[index];
    setEditWeight(set.weight > 0 ? String(set.weight) : "");
    setEditReps(set.reps > 0 ? String(set.reps) : "");
    setEditRir(set.rir ?? 2);
    setEditDuration(
      typeof set.durationSeconds === "number" && set.durationSeconds > 0
        ? String(Math.round(set.durationSeconds))
        : ""
    );
    setEditError(null);
    setEditingIndex(index);
  }

  function saveEdit() {
    if (editingIndex === null || !onEditSet) return;
    const isTimedEdit =
      currentSets[editingIndex].metricType === "time" ||
      typeof currentSets[editingIndex].durationSeconds === "number";

    if (isTimedEdit) {
      const d = parseInt(editDuration, 10);
      if (!Number.isFinite(d) || d <= 0) { setEditError("Tiden ser inte rätt ut. Kontrollera och försök igen."); return; }
      if (d > 21600) { setEditError("Tiden ser ut som en felskrivning. Kontrollera och försök igen."); return; }
      onEditSet(editingIndex, currentSets[editingIndex].weight, currentSets[editingIndex].reps, editRir, d);
      setEditingIndex(null);
      return;
    }

    const w = parseFloat(editWeight.replace(",", "."));
    const r = parseInt(editReps, 10);
    if (!Number.isFinite(w) || !Number.isFinite(r)) return;
    if (r > 200) { setEditError("Repsen ser ut som en felskrivning. Kontrollera och försök igen."); return; }
    if (validateWeight) {
      const err = validateWeight(w);
      if (err) { setEditError(err); return; }
    }
    onEditSet(editingIndex, w, r, editRir);
    setEditingIndex(null);
  }

  if (currentSets.length === 0) return null;

  const editingSet = editingIndex !== null ? currentSets[editingIndex] : null;
  const isTimed = editingSet?.metricType === "time" || typeof editingSet?.durationSeconds === "number";

  return (
    <>
      <div
        ref={setListContainerRef}
        className="max-h-24 overflow-y-auto rounded-[1.15rem] border border-white/[0.06] bg-white/[0.018] p-1.5"
      >
        <ul className="space-y-1 text-sm text-gray-300">
          {currentSets.map((set, index) => (
            <li
              key={set.createdAt + index}
              onClick={() => onEditSet && openEdit(index)}
              className={`flex items-center justify-between rounded-xl border border-white/[0.045] bg-slate-950/24 px-2.5 py-1.5 ${onEditSet ? "cursor-pointer active:bg-white/[0.06]" : ""}`}
            >
              <span className="text-sm font-semibold text-white/90">
                {index + 1}. {getSetLabel(set)}
              </span>
              {getEffortLabel(set) ? (
                <span className="text-[11px] text-gray-400">{getEffortLabel(set)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {editingIndex !== null && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[3px]" />
          <div className="relative mx-4 mb-10 w-full max-w-md space-y-4 rounded-3xl bg-[#0f172a] px-6 py-6 shadow-2xl">
            <p className="text-base font-semibold text-white text-center">
              Redigera set {(editingIndex ?? 0) + 1}
            </p>

            {isTimed && (
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

            {!isTimed && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-white/50">Vikt (kg)</label>
                  <input
                    className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-3 py-2.5 text-center text-base font-semibold text-white outline-none focus:border-blue-400/40"
                    inputMode="decimal"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">Reps</label>
                  <input
                    className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.05] px-3 py-2.5 text-center text-base font-semibold text-white outline-none focus:border-blue-400/40"
                    inputMode="numeric"
                    value={editReps}
                    onChange={(e) => setEditReps(e.target.value)}
                  />
                </div>
              </div>
            )}

            {!isTimed && (
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
                onClick={() => setEditingIndex(null)}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
