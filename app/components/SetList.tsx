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

  return (
    <div
      ref={setListContainerRef}
      className="rounded-2xl bg-zinc-900/80 p-2 max-h-24 overflow-y-auto"
    >
      {currentSets.length > 0 ? (
        <ul className="space-y-1 text-sm text-gray-300">
          {currentSets.map((s, i) => (
            <li
              key={s.createdAt + i}
              className="flex items-center justify-between rounded-lg bg-black/80 border border-zinc-800 px-2 py-1"
            >
              <span className="text-white/90">
                {i + 1}. {s.weight} × {s.reps}
              </span>

              <span className="text-[11px] text-gray-400">
                {typeof s.rir === "number" ? `RIR ${s.rir}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Inga set ännu.</p>
      )}
    </div>
  );
}