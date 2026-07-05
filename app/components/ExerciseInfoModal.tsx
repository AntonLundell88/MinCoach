"use client";

import { useEffect, useMemo, useRef } from "react";
import { BodyChart, ViewSide, type BodyState } from "body-muscles";
import { getExerciseInfo } from "../lib/exercises";
import { getReviewedExerciseInfoTemplate } from "../lib/exerciseInfoTemplates";
import {
  BODY_MUSCLE_TOKEN_IDS,
  getReviewedExerciseMuscleMap,
  type ReviewedMuscleMap,
} from "../lib/muscleMapRules";
import { CloseGlyph } from "./IconGlyphs";

function getReviewedBodyMapState(review: ReviewedMuscleMap): BodyState {
  const bodyState: BodyState = {};
  const primaryIds = new Set<string>();
  const activeIds = new Set<string>();

  for (const token of review.map.primary) {
    for (const id of BODY_MUSCLE_TOKEN_IDS[token]) {
      primaryIds.add(id);
      bodyState[id] = { intensity: 7, selected: true };
    }
  }

  for (const token of review.map.active) {
    for (const id of BODY_MUSCLE_TOKEN_IDS[token]) {
      if (!primaryIds.has(id)) {
        activeIds.add(id);
        bodyState[id] = { intensity: 4, selected: true };
      }
    }
  }

  for (const token of review.map.secondary) {
    for (const id of BODY_MUSCLE_TOKEN_IDS[token]) {
      if (!primaryIds.has(id) && !activeIds.has(id)) {
        bodyState[id] = { intensity: 2, selected: true };
      }
    }
  }

  return bodyState;
}

function getTrainsAlsoLabel(review: ReviewedMuscleMap) {
  return [review.labels.active, review.labels.secondary]
    .filter((label): label is string => Boolean(label?.trim()))
    .filter(
      (label, index, labels) =>
        labels.findIndex(
          (item) => item.toLowerCase() === label.toLowerCase()
        ) === index
    )
    .join(", ");
}

function MuscleFocusCards({ review }: { review: ReviewedMuscleMap }) {
  const alsoLabel = getTrainsAlsoLabel(review);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div
        className={`rounded-xl bg-white/[0.035] px-3 py-2 ${
          alsoLabel ? "" : "col-span-2"
        }`}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
          Tränar framförallt
        </p>
        <p className="mt-1 text-xs font-semibold text-white/76">
          {review.labels.primary}
        </p>
      </div>
      {alsoLabel ? (
        <div className="rounded-xl bg-white/[0.035] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
            Tränar också
          </p>
          <p className="mt-1 text-xs font-semibold text-white/76">
            {alsoLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function BodyChartView({
  view,
  bodyState,
}: {
  view: ViewSide;
  bodyState: BodyState;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<BodyChart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = new BodyChart(containerRef.current, {
      view,
      bodyState: {},
      ariaLabel: view === ViewSide.FRONT ? "Muskelkarta fram" : "Muskelkarta bak",
      enableTransitions: false,
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
    }

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [view]);

  useEffect(() => {
    chartRef.current?.update({ bodyState });
  }, [bodyState]);

  return <div ref={containerRef} className="mx-auto h-52 w-full max-w-[120px]" />;
}

function ExerciseMuscleMap({ review }: { review: ReviewedMuscleMap }) {
  const bodyState = useMemo(() => getReviewedBodyMapState(review), [review]);

  return (
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
      <div
        role="img"
        aria-label={`Tränar framförallt: ${review.labels.primary}${
          getTrainsAlsoLabel(review)
            ? `. Tränar också: ${getTrainsAlsoLabel(review)}`
            : ""
        }`}
        className="grid grid-cols-2 gap-3"
      >
        <div>
          <BodyChartView view={ViewSide.FRONT} bodyState={bodyState} />
          <p className="mt-1 text-center text-[10px] font-medium text-white/42">
            Fram
          </p>
        </div>
        <div>
          <BodyChartView view={ViewSide.BACK} bodyState={bodyState} />
          <p className="mt-1 text-center text-[10px] font-medium text-white/42">
            Bak
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ExerciseInfoModal({
  exerciseName,
  onClose,
}: {
  exerciseName: string;
  onClose: () => void;
}) {
  const info = getExerciseInfo(exerciseName);
  const reviewedMuscleMap = getReviewedExerciseMuscleMap(exerciseName);
  const reviewedInfoTemplate = getReviewedExerciseInfoTemplate(exerciseName);

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
              {exerciseName}
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/38">
              {reviewedInfoTemplate?.equipment ?? info.equipment}
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

        {reviewedMuscleMap ? (
          <MuscleFocusCards review={reviewedMuscleMap} />
        ) : (
          <p className="mt-3 text-sm leading-6 text-white/58">
            {info.detail}
          </p>
        )}

        {reviewedMuscleMap ? <ExerciseMuscleMap review={reviewedMuscleMap} /> : null}

        {reviewedInfoTemplate ? (
          <div className="mt-4 grid gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/38">
                Så gör du
              </p>
              <div className="mt-1 grid gap-1.5 text-sm leading-6 text-white/68">
                {reviewedInfoTemplate.steps.map((step) => (
                  <p key={step}>{step}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/38">
                Känn efter
              </p>
              <p className="mt-1 text-sm leading-6 text-white/68">
                {reviewedInfoTemplate.feel}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/38">
                Logga
              </p>
              <p className="mt-1 text-sm leading-6 text-white/68">
                {reviewedInfoTemplate.log}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/20 p-3">
            <p className="text-sm leading-6 text-white/72">{info.detail}</p>
          </div>
        )}
      </div>
    </div>
  );
}
