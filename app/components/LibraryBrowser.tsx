"use client";
import { CloseGlyph } from "./IconGlyphs";

export const LIBRARY_CATEGORIES = [
  "alla",
  "bröst",
  "rygg",
  "ben",
  "axlar",
  "armar",
  "mage",
  "helkropp",
] as const;

export type LibraryExercise = {
  exerciseKey: string;
  name: string;
  category: string;
  equipment: string;
  primaryMuscle: string;
  logType?: string;
  aliases?: string[];
};

export function LibraryBrowser({
  title,
  search,
  setSearch,
  category,
  setCategory,
  exercises,
  onClose,
  onPick,
  onUseManual,
}: {
  title: string;
  search: string;
  setSearch: (v: string) => void;
  category: (typeof LIBRARY_CATEGORIES)[number];
  setCategory: (v: (typeof LIBRARY_CATEGORIES)[number]) => void;
  exercises: LibraryExercise[];
  onClose: () => void;
  onPick: (name: string) => void;
  onUseManual?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-white">{title}</p>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
          onClick={onClose}
          aria-label="Stäng"
        >
          <CloseGlyph className="h-3.5 w-3.5" />
        </button>
      </div>

      {onUseManual ? (
        <p className="text-xs leading-5 text-white/48">
          Finns inte övningen du letar efter i mitt bibliotek? Ingen fara!{" "}
          <button
            type="button"
            onClick={onUseManual}
            className="font-semibold text-blue-300/85 transition hover:text-blue-200"
          >
            Lägg till den manuellt
          </button>
          .
        </p>
      ) : null}

      <input
        autoFocus
        className="w-full rounded-xl border border-white/[0.09] bg-slate-950/50 px-3 py-3 text-base text-white outline-none placeholder:text-white/28 focus:border-blue-300/35 sm:text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Sök övning, muskel eller redskap"
      />

      <div className="flex flex-wrap gap-1.5">
        {LIBRARY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              category === cat
                ? "border-blue-300/45 bg-blue-500/[0.18] text-white"
                : "border-white/[0.08] bg-white/[0.035] text-white/50 hover:bg-white/[0.07] hover:text-white/72"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="max-h-[42vh] space-y-2 overflow-y-auto overscroll-contain">
        {exercises.map((exercise) => (
          <button
            key={exercise.exerciseKey}
            type="button"
            onClick={() => onPick(exercise.name)}
            className="w-full rounded-2xl border border-white/[0.07] bg-slate-950/22 p-3 text-left transition hover:border-blue-300/24 hover:bg-white/[0.045]"
          >
            <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100/38">
              {exercise.category} · {exercise.equipment}
            </p>
          </button>
        ))}

        {exercises.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-slate-950/22 p-4">
            <p className="text-sm leading-6 text-white/58">Ingen övning matchar. Testa en annan sökning.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
