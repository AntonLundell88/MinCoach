"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BodyChart, ViewSide, type BodyState } from "body-muscles";
import type { Workout } from "../page";
import {
  BODY_MUSCLE_TOKEN_IDS,
  getRelatedBodyPartIds,
  type MuscleMapToken,
} from "../lib/muscleMapRules";
import {
  getMuscleExplorerList,
  getMuscleTrainingIntensity,
  type MuscleExplorerExercise,
} from "../lib/muscleExplorer";
import { CloseGlyph } from "./IconGlyphs";

const RESULT_PREVIEW_COUNT = 6;

// Easter egg — inte riktiga övningar, bara roliga klickytor på huvudet.
// Medvetet inte i EXERCISE_LIBRARY: ska aldrig dyka upp i sök, programbygge
// eller övrig riktig data, bara i just den här klickytan.
const HEAD_IDS = new Set(["head", "head-back"]);
const FACE_ID = "face";
const FRISOR_FRONT_STATE: BodyState = { head: { intensity: 8, selected: true } };
const FRISOR_BACK_STATE: BodyState = { "head-back": { intensity: 8, selected: true } };

function FrisorEasterEgg({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 px-4 py-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-[1.8rem] bg-black/42 backdrop-blur-sm sm:inset-5"
      />
      <div className="relative z-10 max-h-[calc(100svh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
              Övningsinfo
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
              Frisör
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/38">
              Personlig vård
            </p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
            onClick={onClose}
            aria-label="Stäng övningsinfo"
          >
            <CloseGlyph className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.035] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
              Tränar framförallt
            </p>
            <p className="mt-1 text-xs font-semibold text-white/76">Självförtroende</p>
          </div>
          <div className="rounded-xl bg-white/[0.035] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
              Tränar också
            </p>
            <p className="mt-1 text-xs font-semibold text-white/76">Tålamod, småprat</p>
          </div>
        </div>

        <div
          className="exercise-muscle-map mt-3 rounded-2xl p-3"
          style={{
            background:
              "radial-gradient(circle at 50% 28%, rgba(96, 165, 250, 0.09), transparent 38%), linear-gradient(180deg, #111a25 0%, #0b1018 100%)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            boxShadow:
              "inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 16px 36px rgba(2, 6, 24, 0.16)",
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <BodyChartView view={ViewSide.FRONT} bodyState={FRISOR_FRONT_STATE} onMuscleClick={() => {}} />
              <p className="mt-1 text-center text-[10px] font-medium text-white/42">Fram</p>
            </div>
            <div>
              <BodyChartView view={ViewSide.BACK} bodyState={FRISOR_BACK_STATE} onMuscleClick={() => {}} />
              <p className="mt-1 text-center text-[10px] font-medium text-white/42">Bak</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/38">
              Så gör du
            </p>
            <div className="mt-1 grid gap-1.5 text-sm leading-6 text-white/68">
              <p>Sätt dig bekvämt.</p>
              <p>Förklara ungefär hur du vill ha det.</p>
              <p>Sitt still och lita på processen.</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/38">
              Känn efter
            </p>
            <p className="mt-1 text-sm leading-6 text-white/68">
              Det ska främst kännas bättre när du tittar i spegeln. Om det känns värre: byt frisör.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/38">
              Logga
            </p>
            <p className="mt-1 text-sm leading-6 text-white/68">
              Ett set var 4–6 vecka räcker för de flesta. Failure rekommenderas inte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BodyChartView({
  view,
  bodyState,
  onMuscleClick,
}: {
  view: ViewSide;
  bodyState: BodyState;
  onMuscleClick: (id: string, name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<BodyChart | null>(null);
  const onMuscleClickRef = useRef(onMuscleClick);

  useEffect(() => {
    onMuscleClickRef.current = onMuscleClick;
  }, [onMuscleClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = new BodyChart(containerRef.current, {
      view,
      bodyState: {},
      ariaLabel: view === ViewSide.FRONT ? "Muskelkarta fram" : "Muskelkarta bak",
      onMuscleClick: (id, name) => onMuscleClickRef.current(id, name),
    });

    const wrapper = containerRef.current.querySelector(
      ".body-chart-container"
    ) as HTMLDivElement | null;
    const svg = containerRef.current.querySelector(
      ".body-chart-svg"
    ) as SVGSVGElement | null;

    if (wrapper) {
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.justifyContent = "center";
    }

    if (svg) {
      svg.style.height = "100%";
      svg.style.width = "auto";
      svg.style.maxWidth = "100%";
      svg.style.cursor = "pointer";
    }

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [view]);

  useEffect(() => {
    chartRef.current?.update({ bodyState });
  }, [bodyState]);

  return <div ref={containerRef} className="mx-auto h-96 w-full max-w-[280px] sm:h-[28rem]" />;
}

function ExerciseRow({
  exercise,
  onSelect,
}: {
  exercise: MuscleExplorerExercise;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-xl border border-white/[0.09] bg-white/[0.048] px-3.5 py-2.5 text-left transition hover:border-white/16 hover:bg-white/[0.06]"
    >
      <span className="block truncate text-sm font-semibold text-white">
        {exercise.name}
      </span>
      <span className="mt-1 block text-xs text-white/48">
        {exercise.sessionsCount > 0
          ? `${exercise.sessionsCount} pass${
              exercise.bestSetLabel ? ` · bäst ${exercise.bestSetLabel}` : ""
            }`
          : "Inte testat än"}
      </span>
    </button>
  );
}

function ExerciseSection({
  title,
  exercises,
  onSelect,
}: {
  title: string;
  exercises: MuscleExplorerExercise[];
  onSelect: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? exercises : exercises.slice(0, RESULT_PREVIEW_COUNT);
  const remaining = exercises.length - visible.length;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {title}
      </p>
      <div className="space-y-2">
        {visible.map((exercise) => (
          <ExerciseRow
            key={exercise.name}
            exercise={exercise}
            onSelect={() => onSelect(exercise.name)}
          />
        ))}
      </div>
      {remaining > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full rounded-xl border border-white/[0.07] bg-transparent px-3.5 py-2 text-center text-xs font-semibold text-blue-300/85 transition hover:text-blue-200"
        >
          Visa {remaining} till
        </button>
      ) : null}
    </div>
  );
}

export default function MuscleExplorer({
  history,
  onSelectExercise,
}: {
  history: Workout[];
  onSelectExercise: (name: string, tried: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFrisor, setShowFrisor] = useState(false);

  const handleMuscleClick = (id: string) => {
    if (HEAD_IDS.has(id)) {
      setShowFrisor(true);
      return;
    }
    setSelectedId(id);
  };

  const intensity = useMemo(() => getMuscleTrainingIntensity(history), [history]);
  const hasTrainingData = Object.keys(intensity).length > 0;
  const explorerList = useMemo(
    () => (selectedId ? getMuscleExplorerList(selectedId, history) : null),
    [selectedId, history]
  );

  const bodyState = useMemo<BodyState>(() => {
    const state: BodyState = {};

    (Object.keys(BODY_MUSCLE_TOKEN_IDS) as MuscleMapToken[]).forEach((token) => {
      const value = intensity[token] ?? 0;
      BODY_MUSCLE_TOKEN_IDS[token].forEach((id) => {
        const existing = state[id];
        if (!existing || value > existing.intensity) {
          state[id] = { intensity: value, selected: false };
        }
      });
    });

    if (selectedId) {
      getRelatedBodyPartIds(selectedId).forEach((id) => {
        state[id] = { intensity: state[id]?.intensity ?? 0, selected: true };
      });
    }

    return state;
  }, [intensity, selectedId]);

  const muscleLabel = explorerList?.muscleLabel ?? null;
  const hasResults =
    explorerList && (explorerList.tried.length > 0 || explorerList.untried.length > 0);

  return (
    <section
      className="rounded-[1.5rem] border border-white/[0.09] p-4 backdrop-blur-xl sm:p-5"
      style={{
        background:
          "radial-gradient(circle at 50% 22%, rgba(96, 165, 250, 0.08), transparent 42%), linear-gradient(180deg, #131c27 0%, #0b1018 100%)",
        boxShadow: "0 14px 40px rgba(0,0,0,0.16)",
      }}
    >
      <p className="text-center text-sm text-white/58">
        Tryck på en muskel för att se övningar som tränar den.
      </p>
      {!hasTrainingData ? (
        <p className="mt-1 text-center text-xs text-white/38">
          Kroppen färgas efter din träning — logga ett pass så tänds den.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <BodyChartView
            view={ViewSide.FRONT}
            bodyState={bodyState}
            onMuscleClick={handleMuscleClick}
          />
          <p className="mt-1 text-center text-[10px] font-medium text-white/42">Fram</p>
        </div>
        <div>
          <BodyChartView
            view={ViewSide.BACK}
            bodyState={bodyState}
            onMuscleClick={handleMuscleClick}
          />
          <p className="mt-1 text-center text-[10px] font-medium text-white/42">Bak</p>
        </div>
      </div>

      {selectedId ? (
        <div className="mt-4 rounded-2xl border border-white/[0.09] bg-slate-950/22 p-3.5">
          <div className="flex items-center justify-between gap-3">
            {muscleLabel ? (
              <h3 className="text-base font-semibold text-white">{muscleLabel}</h3>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs font-semibold text-blue-300/85 transition hover:text-blue-200"
            >
              Stäng
            </button>
          </div>

          {selectedId === FACE_ID ? (
            <p className="mt-3 text-sm leading-6 text-white/52">
              Ingen progression behövs, vi går vidare.
            </p>
          ) : hasResults && explorerList ? (
            <div key={selectedId} className="mt-3 space-y-4">
              {explorerList.tried.length > 0 ? (
                <ExerciseSection
                  title="Dina övningar"
                  exercises={explorerList.tried}
                  onSelect={(name) => onSelectExercise(name, true)}
                />
              ) : null}

              {explorerList.untried.length > 0 ? (
                <ExerciseSection
                  title="Fler att testa"
                  exercises={explorerList.untried}
                  onSelect={(name) => onSelectExercise(name, false)}
                />
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-white/52">
              Inga övningar taggade för det området än.
            </p>
          )}
        </div>
      ) : null}

      {showFrisor ? <FrisorEasterEgg onClose={() => setShowFrisor(false)} /> : null}
    </section>
  );
}
