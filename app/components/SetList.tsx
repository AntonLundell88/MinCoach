"use client";

import { useEffect, useRef } from "react";

type LoggedSet = {
  createdAt: string;
  weight: number;
  reps: number;
  rir?: number;
};

type Props = {
  currentSets: LoggedSet[];
};

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
      className="max-h-24 overflow-y-auto rounded-[1.15rem] border border-white/[0.09] bg-white/[0.042] p-2"
    >
      <ul className="space-y-1 text-sm text-gray-300">
        {currentSets.map((set, index) => (
          <li
            key={set.createdAt + index}
            className="flex items-center justify-between rounded-lg border border-white/8 bg-slate-950/40 px-2.5 py-1.5"
          >
            <span className="text-sm font-semibold text-white/90">
              {index + 1}. {set.weight} x {set.reps}
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
