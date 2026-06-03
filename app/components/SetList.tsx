"use client";

import { useEffect, useRef } from "react";

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

  return `${set.weight} x ${set.reps}`;
}

export default function SetList({ currentSets }: Props) {
  const setListContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentSets.length === 0) return;

    const el = setListContainerRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [currentSets.length]);

  if (currentSets.length === 0) return null;

  return (
    <div
      ref={setListContainerRef}
      className="max-h-24 overflow-y-auto rounded-[1.15rem] border border-white/[0.06] bg-white/[0.018] p-1.5"
    >
      <ul className="space-y-1 text-sm text-gray-300">
        {currentSets.map((set, index) => (
          <li
            key={set.createdAt + index}
            className="flex items-center justify-between rounded-xl border border-white/[0.045] bg-slate-950/24 px-2.5 py-1.5"
          >
            <span className="text-sm font-semibold text-white/90">
              {index + 1}. {getSetLabel(set)}
            </span>

            <span className="text-[11px] text-gray-400">
              {typeof set.rir === "number" ? `RIR ${set.rir}` : "-"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
