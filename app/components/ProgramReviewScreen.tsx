"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BodyChart, ViewSide, type BodyState } from "body-muscles";
import {
  getExerciseProfile,
  getExerciseUserInfo,
  getProgramExercisePool,
  normalizeExerciseSearchText,
} from "../lib/exercises";
import { getReviewedExerciseInfoTemplate } from "../lib/exerciseInfoTemplates";
import {
  BODY_MUSCLE_TOKEN_IDS,
  getReviewedExerciseMuscleMap,
  type ReviewedMuscleMap,
} from "../lib/muscleMapRules";
import type {
  CoachProgramSuggestion,
  CoachProgramSuggestionAction,
} from "../lib/coachAi";
import { reviewManualProgram } from "../lib/programReview";
import type { ManualProgramReviewSuggestion } from "../lib/programReview";
import { CloseGlyph, PencilGlyph, SendGlyph } from "./IconGlyphs";

type Goal = "muskel" | "styrka" | "fett";
type PassType = "A" | "B" | "C" | "D" | "E" | "F" | "G";

type UserProfile = {
  name: string;
  age?: number | null;
  gender?: "kvinna" | "man" | "annat" | "vill-inte-saga";
  trainingExperience?: "nyborjare" | "van" | "erfaren";
  goalPrimary: Goal;
  goalSecondary?: Goal[];
  daysPerWeek: number;
  minutesPerSession: number;
  location: "gym" | "hemma";
  equipment: string[];
  limitations: string;
};

type WorkoutPass = {
  key: PassType;
  displayName: string;
  intent?: string;
  exercises: {
    exerciseKey?: string;
    name: string;
    purpose?: string;
    sets?: string;
    reps?: string;
    rir?: string;
    caution?: string;
    alternatives?: string[];
  }[];
};

type WorkoutPlan = {
  title: string;
  goalPrimary: Goal;
  daysPerWeek: number;
  coachSummary?: string;
  planReason?: string;
  structureReason?: string;
  safetyNotes?: string[];
  source?: "ai" | "fallback" | "manual";
  passes: WorkoutPass[];
};

type AddExerciseResult = {
  clearInput: boolean;
  nextInput?: string;
  message?: string;
  suggestion?: string;
  tone?: "success" | "suggestion" | "question";
};

type CoachReviewSuggestion = ManualProgramReviewSuggestion;

const CUSTOM_EXERCISE_CATEGORIES = [
  "ben",
  "rygg",
  "bröst",
  "axlar",
  "armar",
  "mage",
] as const;

const LIBRARY_CATEGORIES = [
  "alla",
  "bröst",
  "rygg",
  "ben",
  "axlar",
  "armar",
  "mage",
] as const;

type Props = {
  profile: UserProfile;
  workoutPlan: WorkoutPlan;
  preferenceInput: string;
  setPreferenceInput: (value: string) => void;
  preferenceReply: string;
  pendingProgramSuggestion: CoachProgramSuggestion | null;
  programBuildStatus: "idle" | "building" | "ready" | "fallback";
  onSavePreference: () => void | Promise<void>;
  onApproveProgramSuggestion: () => void;
  onDismissProgramSuggestion: () => void;
  onRebuildProgram: () => void;
  onRenamePass: (passKey: PassType, displayName: string) => void;
  onAddExercise: (passKey: PassType, exerciseName: string) => AddExerciseResult;
  onRemoveExercise: (passKey: PassType, exerciseName: string) => void;
  onApprove: () => void;
  onEditProfile: () => void;
};

const PROGRAM_COPY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bköttade\b/gi, "körde hårt"],
  [/\bkötta\b/gi, "köra hårt"],
  [/\bköttigt\b/gi, "tungt"],
  [/\bköttiga\b/gi, "tunga"],
  [/\bköttig\b/gi, "tung"],
  [/\bmanglade\b/gi, "körde kontrollerat"],
  [/\bmangla\b/gi, "köra kontrollerat"],
  [/\bbrutalt\b/gi, "tungt"],
  [/\bbrutala\b/gi, "tunga"],
  [/\bbrutal\b/gi, "tung"],
  [/Handledermär/g, "Om handlederna känns ömma"],
  [/handledermär/g, "om handlederna känns ömma"],
  [/handledsmär/gi, "handledsbesvär"],
  [/\bRyggraden\b/g, "Ryggen"],
  [/\bryggraden\b/g, "ryggen"],
  [/\bRyggrad\b/g, "Rygg"],
  [/\bryggrad\b/g, "rygg"],
];

function cleanProgramCopy(value?: string | null) {
  if (!value) return "";

  return PROGRAM_COPY_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value
  )
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPassNameForDisplay(value: string) {
  const cleaned = cleanProgramCopy(value)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(
      /\s*[–—-]\s*(?:medelvolym|högvolym|lågvolym|volym|standard|nybörjare|erfaren)\s*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "Pass";
}

function getManualPassLabel(pass: WorkoutPass) {
  const displayName = cleanPassNameForDisplay(pass.displayName);
  return /^Pass\s+\d+$/i.test(displayName) ? `Pass ${pass.key}` : displayName;
}

function formatMissingPasses(passes: WorkoutPass[]) {
  const labels = passes.map((pass) => `Pass ${pass.key}`);
  if (labels.length === 0) return "";
  if (labels.length === 1) return `${labels[0]} saknar övningar`;
  if (labels.length === 2) return `${labels[0]} och ${labels[1]} saknar övningar`;
  return `${labels.slice(0, -1).join(", ")} och ${labels.at(-1)} saknar övningar`;
}

function exerciseCountLabel(count: number) {
  return count === 1 ? "1 övning" : `${count} övningar`;
}

function isFallbackProgramBuildStatus(status: Props["programBuildStatus"]) {
  return status === "fallback";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function directUserCopy(value: string, profile: UserProfile) {
  const userName = profile.name.trim();
  let text = cleanProgramCopy(value);

  if (userName) {
    const namePattern = new RegExp(`\\b${escapeRegExp(userName)}\\b`, "gi");
    text = text
      .replace(new RegExp(`\\b${escapeRegExp(userName)}\\s+är\\b`, "gi"), "Du är")
      .replace(new RegExp(`\\b${escapeRegExp(userName)}\\s+har\\b`, "gi"), "Du har")
      .replace(new RegExp(`\\b${escapeRegExp(userName)}\\s+tränar\\b`, "gi"), "Du tränar")
      .replace(new RegExp(`\\b${escapeRegExp(userName)}\\s+vill\\b`, "gi"), "Du vill")
      .replace(new RegExp(`\\bför\\s+${escapeRegExp(userName)}\\b`, "gi"), "för dig")
      .replace(namePattern, "du");
  }

  return text
    .replace(/\banvändaren är\b/gi, "du är")
    .replace(/\banvändaren har\b/gi, "du har")
    .replace(/\banvändaren tränar\b/gi, "du tränar")
    .replace(/\banvändaren vill\b/gi, "du vill")
    .replace(/\bför användaren\b/gi, "för dig")
    .replace(/\s+/g, " ")
    .trim();
}

function splitCoachPoints(value: string, profile: UserProfile, max = 3) {
  return directUserCopy(value, profile)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function fallbackCoachSummary(profile: UserProfile) {
  return [
    `Du tränar ${profile.daysPerWeek} dagar i veckan i cirka ${profile.minutesPerSession} minuter.`,
    "Jag har byggt ett upplägg som går att följa, mäta och justera.",
  ];
}

function fallbackCoachExplanation(workoutPlan: WorkoutPlan) {
  const passNames = workoutPlan.passes
    .map((pass) => cleanPassNameForDisplay(pass.displayName))
    .filter(Boolean);

  return [
    passNames.length > 0
      ? `Schemat är uppdelat i ${passNames.join(", ")}.`
      : "Schemat är uppdelat i tydliga pass.",
    "Basövningarna gör mest jobb. Kompletterande övningar används där de fyller en tydlig funktion.",
  ];
}

function fallbackCoachWarnings(profile: UserProfile) {
  return [
    "Skarp eller ökande smärta betyder att du stoppar, sänker vikten eller byter övning.",
    "Lägg inte på vikt bara för att det känns möjligt. Första veckan ska kännas kontrollerad.",
    "Avbryt passet om kroppen känns fel, yrsel kommer eller tekniken faller isär.",
    profile.limitations.trim()
      ? `Ta extra hänsyn till: ${profile.limitations.trim()}.`
      : "",
  ];
}

function actionLabel(action: CoachProgramSuggestionAction) {
  if (action.type === "add_exercise") {
    const exerciseName = cleanProgramCopy(action.exerciseName);
    const target = action.passName
      ? cleanPassNameForDisplay(action.passName)
      : action.passKey;
    return target
      ? `Lägg till ${exerciseName} i ${target}`
      : `Lägg till ${exerciseName}`;
  }

  if (action.type === "remove_exercise") {
    return `Ta bort ${cleanProgramCopy(action.exerciseName)}`;
  }

  if (action.type === "replace_exercise") {
    return `Byt ${cleanProgramCopy(action.fromExerciseName)} mot ${cleanProgramCopy(action.toExerciseName)}`;
  }

  return `Döp pass ${action.passKey} till ${cleanPassNameForDisplay(action.displayName)}`;
}

type BodyMapRegion =
  | "chest"
  | "frontShoulders"
  | "sideShoulders"
  | "rearShoulders"
  | "upperBack"
  | "lats"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "obliques"
  | "lowerBack"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves"
  | "hipFlexors"
  | "innerThigh"
  | "outerHip";

function getBodyMapRegions(muscle: string): BodyMapRegion[] {
  const normalized = normalizeExerciseSearchText(muscle);

  if (normalized.includes("ovre brost") || normalized.includes("brost")) {
    return ["chest"];
  }
  if (normalized.includes("framsida axel")) return ["frontShoulders"];
  if (normalized.includes("sida axel")) return ["sideShoulders"];
  if (normalized.includes("baksida axel") || normalized.includes("rotatorcuff")) {
    return ["rearShoulders"];
  }
  if (normalized === "axlar" || normalized.includes("axel")) {
    return ["frontShoulders", "sideShoulders", "rearShoulders"];
  }
  if (normalized.includes("ovre rygg")) return ["upperBack"];
  if (normalized.includes("lats")) return ["lats"];
  if (normalized.includes("rygg")) return ["upperBack", "lats"];
  if (normalized.includes("biceps")) return ["biceps"];
  if (normalized.includes("triceps")) return ["triceps"];
  if (normalized.includes("underarm") || normalized.includes("grepp")) {
    return ["forearms"];
  }
  if (normalized.includes("sneda")) return ["obliques"];
  if (normalized.includes("bal") || normalized.includes("mage")) return ["core"];
  if (normalized.includes("landrygg")) return ["lowerBack"];
  if (normalized.includes("sate")) return ["glutes"];
  if (normalized.includes("baksida lar")) return ["hamstrings"];
  if (normalized.includes("framsida lar")) return ["quads"];
  if (normalized.includes("hoftbojare")) return ["hipFlexors"];
  if (normalized.includes("insida lar")) return ["innerThigh"];
  if (normalized.includes("utsida hoft")) return ["outerHip"];
  if (normalized.includes("vader")) return ["calves"];
  if (normalized === "ben") return ["quads", "hamstrings", "glutes", "calves"];

  return [];
}

function getMuscleRegionState(primary: string, secondary: string[]) {
  const primaryRegions = new Set<BodyMapRegion>();
  const secondaryRegions = new Set<BodyMapRegion>();

  for (const region of getBodyMapRegions(primary)) {
    primaryRegions.add(region);
  }

  for (const muscle of secondary) {
    for (const region of getBodyMapRegions(muscle)) {
      if (!primaryRegions.has(region)) {
        secondaryRegions.add(region);
      }
    }
  }

  return { primaryRegions, secondaryRegions };
}

function MuscleShape({
  region,
  primaryRegions,
  secondaryRegions,
  d,
  className = "",
}: {
  region: BodyMapRegion;
  primaryRegions: Set<BodyMapRegion>;
  secondaryRegions: Set<BodyMapRegion>;
  d: string;
  className?: string;
}) {
  const activeClass = primaryRegions.has(region)
    ? "fill-red-400/90 stroke-red-200/60"
    : secondaryRegions.has(region)
      ? "fill-amber-300/90 stroke-amber-100/55"
      : "fill-white/[0.055] stroke-white/[0.08]";

  return <path d={d} className={`${activeClass} ${className}`} strokeWidth="1.2" />;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ExerciseMuscleMap({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string[];
}) {
  const { primaryRegions, secondaryRegions } = getMuscleRegionState(
    primary,
    secondary
  );

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
      <div className="grid gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/38">
          Muskelkarta
        </p>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-white/42">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            Primär
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            Sekundär
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 220 150"
        role="img"
        aria-label={`Primärt: ${primary}${secondary.length ? `. Sekundärt: ${secondary.join(", ")}` : ""}`}
        className="mt-2 h-36 w-full"
      >
        <g className="stroke-white/[0.08]">
          <circle cx="58" cy="18" r="10" className="fill-white/[0.05]" />
          <path d="M47 33 Q58 27 69 33 L75 62 Q77 87 68 116 L48 116 Q39 87 41 62 Z" className="fill-white/[0.035]" />
          <circle cx="162" cy="18" r="10" className="fill-white/[0.05]" />
          <path d="M151 33 Q162 27 173 33 L179 62 Q181 87 172 116 L152 116 Q143 87 145 62 Z" className="fill-white/[0.035]" />
        </g>

        <g>
          <MuscleShape region="chest" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M49 37 Q58 32 67 37 L66 53 Q58 57 50 53 Z" />
          <MuscleShape region="frontShoulders" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M39 39 Q45 34 50 39 L47 55 Q41 55 36 50 Z" />
          <MuscleShape region="frontShoulders" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M67 39 Q72 34 78 39 L81 50 Q75 55 69 55 Z" />
          <MuscleShape region="sideShoulders" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M34 48 Q40 54 39 69 L31 72 Q28 58 34 48 Z" />
          <MuscleShape region="sideShoulders" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M82 48 Q76 54 77 69 L85 72 Q88 58 82 48 Z" />
          <MuscleShape region="biceps" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M31 72 Q39 69 41 80 L38 96 Q31 96 29 84 Z" />
          <MuscleShape region="biceps" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M85 72 Q77 69 75 80 L78 96 Q85 96 87 84 Z" />
          <MuscleShape region="forearms" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M29 94 Q37 94 37 112 L31 126 Q25 110 29 94 Z" />
          <MuscleShape region="forearms" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M87 94 Q79 94 79 112 L85 126 Q91 110 87 94 Z" />
          <MuscleShape region="core" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M50 56 L66 56 L68 82 Q58 86 48 82 Z" />
          <MuscleShape region="obliques" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M42 57 L50 57 L48 82 L43 89 Q39 73 42 57 Z" />
          <MuscleShape region="obliques" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M66 57 L74 57 Q77 73 73 89 L68 82 Z" />
          <MuscleShape region="hipFlexors" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M47 84 Q58 89 69 84 L68 96 Q58 101 48 96 Z" />
          <MuscleShape region="quads" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M47 98 L57 100 L55 132 L45 132 Q42 113 47 98 Z" />
          <MuscleShape region="quads" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M59 100 L69 98 Q74 113 71 132 L61 132 Z" />
          <MuscleShape region="innerThigh" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M56 101 L60 101 L59 130 L56 130 Z" />
          <MuscleShape region="calves" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M45 132 L55 132 L53 145 L43 145 Z" />
          <MuscleShape region="calves" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M61 132 L71 132 L73 145 L63 145 Z" />

          <MuscleShape region="upperBack" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M153 36 Q162 31 171 36 L170 54 Q162 61 154 54 Z" />
          <MuscleShape region="rearShoulders" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M142 40 Q148 35 154 39 L151 56 Q144 55 140 49 Z" />
          <MuscleShape region="rearShoulders" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M170 39 Q176 35 182 40 L184 49 Q180 55 173 56 Z" />
          <MuscleShape region="lats" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M148 55 Q153 63 153 83 L145 91 Q141 70 145 55 Z" />
          <MuscleShape region="lats" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M176 55 Q171 63 171 83 L179 91 Q183 70 179 55 Z" />
          <MuscleShape region="lowerBack" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M154 58 L170 58 L171 86 Q162 91 153 86 Z" />
          <MuscleShape region="triceps" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M139 69 Q147 67 149 80 L146 97 Q139 96 137 84 Z" />
          <MuscleShape region="triceps" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M185 69 Q177 67 175 80 L178 97 Q185 96 187 84 Z" />
          <MuscleShape region="forearms" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M137 95 Q145 95 145 112 L139 126 Q133 110 137 95 Z" />
          <MuscleShape region="forearms" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M187 95 Q179 95 179 112 L185 126 Q191 110 187 95 Z" />
          <MuscleShape region="glutes" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M152 86 Q162 93 172 86 L173 101 Q162 108 151 101 Z" />
          <MuscleShape region="outerHip" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M145 89 L152 88 L151 105 L144 110 Q141 98 145 89 Z" />
          <MuscleShape region="outerHip" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M172 88 L179 89 Q183 98 180 110 L173 105 Z" />
          <MuscleShape region="hamstrings" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M151 104 L161 107 L159 133 L149 133 Q146 116 151 104 Z" />
          <MuscleShape region="hamstrings" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M163 107 L173 104 Q178 116 175 133 L165 133 Z" />
          <MuscleShape region="calves" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M149 133 L159 133 L157 145 L147 145 Z" />
          <MuscleShape region="calves" primaryRegions={primaryRegions} secondaryRegions={secondaryRegions} d="M165 133 L175 133 L177 145 L167 145 Z" />
        </g>

        <text x="58" y="148" textAnchor="middle" className="fill-white/35 text-[8px]">
          Fram
        </text>
        <text x="162" y="148" textAnchor="middle" className="fill-white/35 text-[8px]">
          Bak
        </text>
      </svg>
    </div>
  );
}

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

function ExerciseMuscleMapReal({ review }: { review: ReviewedMuscleMap }) {
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
        aria-label={`Primärt: ${review.labels.primary}${review.labels.active ? `. Jobbar också: ${review.labels.active}` : ""}${review.labels.secondary ? `. Sekundärt: ${review.labels.secondary}` : ""}`}
        className="grid grid-cols-2 gap-3"
      >
        <div>
          <BodyChartView view={ViewSide.FRONT} bodyState={bodyState} />
          <p
            className="mt-1 text-center text-[10px] font-medium"
            style={{ color: "rgba(255, 255, 255, 0.42)" }}
          >
            Fram
          </p>
        </div>
        <div>
          <BodyChartView view={ViewSide.BACK} bodyState={bodyState} />
          <p
            className="mt-1 text-center text-[10px] font-medium"
            style={{ color: "rgba(255, 255, 255, 0.42)" }}
          >
            Bak
          </p>
        </div>
      </div>
    </div>
  );
}

function cleanSafetyLine(value: string) {
  return cleanProgramCopy(value)
    .replace(/\.\s*,/g, ".")
    .replace(/\/+/g, " eller ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*Vid\s+/g, ". Vid ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,\s]+$/g, "");
}

export default function ProgramReviewScreen({
  profile,
  workoutPlan,
  preferenceInput,
  setPreferenceInput,
  preferenceReply,
  pendingProgramSuggestion,
  programBuildStatus,
  onSavePreference,
  onApproveProgramSuggestion,
  onDismissProgramSuggestion,
  onRebuildProgram,
  onRenamePass,
  onAddExercise,
  onRemoveExercise,
  onApprove,
  onEditProfile,
}: Props) {
  const [infoPass, setInfoPass] = useState<WorkoutPass | null>(null);
  const [libraryPassKey, setLibraryPassKey] = useState<PassType | null>(null);
  const [libraryInfoExerciseKey, setLibraryInfoExerciseKey] = useState<
    string | null
  >(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] =
    useState<(typeof LIBRARY_CATEGORIES)[number]>("alla");
  const [showInputHelp, setShowInputHelp] = useState(false);
  const [showCoachDetails, setShowCoachDetails] = useState(false);
  const [showTermsHelp, setShowTermsHelp] = useState(false);
  const [isPreferenceSubmitting, setIsPreferenceSubmitting] = useState(false);
  const [editingPassKey, setEditingPassKey] = useState<PassType | null>(null);
  const [passNameInput, setPassNameInput] = useState("");
  const [activePassKey, setActivePassKey] = useState<PassType>(
    workoutPlan.passes[0]?.key ?? "A"
  );
  const [exerciseInputsByPass, setExerciseInputsByPass] = useState<
    Partial<Record<PassType, string>>
  >({});
  const [addFeedbackByPass, setAddFeedbackByPass] = useState<
    Partial<Record<PassType, AddExerciseResult>>
  >({});
  const [showCustomCategoriesByPass, setShowCustomCategoriesByPass] = useState<
    Partial<Record<PassType, boolean>>
  >({});
  const [coachReviewSuggestions, setCoachReviewSuggestions] = useState<
    CoachReviewSuggestion[]
  >([]);
  const [hasRunManualReview, setHasRunManualReview] = useState(false);
  const [isManualReviewing, setIsManualReviewing] = useState(false);
  const [manualReviewSummary, setManualReviewSummary] = useState("");
  async function submitPreference() {
    if (!preferenceInput.trim() || isPreferenceSubmitting) return;

    setIsPreferenceSubmitting(true);
    try {
      await onSavePreference();
    } finally {
      setIsPreferenceSubmitting(false);
    }
  }

  function startEditingPassName(pass: WorkoutPass) {
    setEditingPassKey(pass.key);
    setPassNameInput(cleanPassNameForDisplay(pass.displayName));
  }

  function savePassName(pass: WorkoutPass) {
    const nextName = cleanPassNameForDisplay(passNameInput);

    if (!nextName) {
      setEditingPassKey(null);
      setPassNameInput("");
      return;
    }

    onRenamePass(pass.key, nextName);
    setEditingPassKey(null);
    setPassNameInput("");
  }

  function addExerciseToPass(passKey: PassType) {
    const exerciseName = (exerciseInputsByPass[passKey] ?? "").trim();
    if (!exerciseName) return;

    const result = onAddExercise(passKey, exerciseName);
    setExerciseInputsByPass((prev) => ({
      ...prev,
      [passKey]: result.clearInput ? "" : result.nextInput ?? exerciseName,
    }));
    setAddFeedbackByPass((prev) => ({
      ...prev,
      [passKey]: result,
    }));
    if (result.tone === "question") {
      setShowCustomCategoriesByPass((prev) => ({
        ...prev,
        [passKey]: true,
      }));
    }
  }

  function addCustomExerciseToPass(
    passKey: PassType,
    category: (typeof CUSTOM_EXERCISE_CATEGORIES)[number]
  ) {
    const exerciseName = (exerciseInputsByPass[passKey] ?? "")
      .replace(/^(egen|eget)\s+(ben|rygg|bröst|brost|axlar|armar|mage|helkropp)\s*:?\s+/i, "")
      .replace(/^(egen|eget)\s*:?\s+/i, "")
      .trim();

    if (!exerciseName) return;

    const result = onAddExercise(passKey, `egen ${category}: ${exerciseName}`);
    setExerciseInputsByPass((prev) => ({
      ...prev,
      [passKey]: result.clearInput ? "" : result.nextInput ?? exerciseName,
    }));
    setAddFeedbackByPass((prev) => ({
      ...prev,
      [passKey]: result,
    }));
    setShowCustomCategoriesByPass((prev) => ({
      ...prev,
      [passKey]: false,
    }));
  }

  const libraryExercises = getProgramExercisePool({
    location: profile.location,
    equipment: profile.equipment,
    trainingExperience: profile.trainingExperience,
    limit: 120,
  });
  const normalizedLibrarySearch = normalizeExerciseSearchText(librarySearch);
  const filteredLibraryExercises = libraryExercises.filter((exercise) => {
    const matchesCategory =
      libraryCategory === "alla" || exercise.category === libraryCategory;
    const matchesSearch =
      !normalizedLibrarySearch ||
      normalizeExerciseSearchText(
        `${exercise.name} ${exercise.primaryMuscle} ${exercise.equipment}`
      ).includes(normalizedLibrarySearch);

    return matchesCategory && matchesSearch;
  });
  function addLibraryExercise(passKey: PassType, exerciseName: string) {
    const result = onAddExercise(passKey, exerciseName);
    setExerciseInputsByPass((prev) => ({
      ...prev,
      [passKey]: "",
    }));
    setAddFeedbackByPass((prev) => ({
      ...prev,
      [passKey]: result.message
        ? result
        : {
            clearInput: true,
            tone: "success",
            message: `${exerciseName} är tillagd i Pass ${passKey}.`,
          },
    }));
  }

  function acceptCoachReviewSuggestion(suggestion: CoachReviewSuggestion) {
    if (suggestion.kind === "remove") {
      onRemoveExercise(suggestion.passKey, suggestion.name);
      setCoachReviewSuggestions((prev) =>
        prev.filter((item) => item.id !== suggestion.id)
      );
      setAddFeedbackByPass((prev) => ({
        ...prev,
        [suggestion.passKey]: undefined,
      }));
      return;
    }

    onAddExercise(suggestion.passKey, suggestion.name);
    setCoachReviewSuggestions((prev) =>
      prev.filter((item) => item.id !== suggestion.id)
    );
    setAddFeedbackByPass((prev) => ({
      ...prev,
      [suggestion.passKey]: undefined,
    }));
  }

  function dismissCoachReviewSuggestion(id: string) {
    const suggestion = coachReviewSuggestions.find((item) => item.id === id);
    setCoachReviewSuggestions((prev) => prev.filter((item) => item.id !== id));
    if (suggestion) {
      setAddFeedbackByPass((prev) => ({
        ...prev,
        [suggestion.passKey]: undefined,
      }));
    }
  }

  function handleApprove() {
    if (!isManualBuilder) {
      onApprove();
      return;
    }

    if (!hasRunManualReview) {
      setAddFeedbackByPass({});
      setIsManualReviewing(true);
      window.setTimeout(() => {
        const suggestions = reviewManualProgram(profile, workoutPlan);
        const addCount = suggestions.filter((item) => item.kind === "add").length;
        const removeCount = suggestions.filter((item) => item.kind === "remove").length;

        setHasRunManualReview(true);
        setCoachReviewSuggestions(suggestions);
        setManualReviewSummary(
          suggestions.length > 0
            ? `Jag har gått igenom ditt schema. Jag föreslår ${addCount > 0 ? `${addCount} tillägg` : ""}${addCount > 0 && removeCount > 0 ? " och " : ""}${removeCount > 0 ? `${removeCount} borttagning${removeCount === 1 ? "" : "ar"}` : ""}. Kolla de dimmade raderna i passen.`
            : "Jag har gått igenom ditt schema. Det ser rimligt ut att starta med."
        );
        setIsManualReviewing(false);

        if (suggestions.length > 0) {
          setActivePassKey(suggestions[0].passKey);
        }
      }, 1500);
      return;
    }

    onApprove();
  }

  const totalExercises = workoutPlan.passes.reduce(
    (sum, pass) => sum + pass.exercises.length,
    0
  );
  const safetyLines = (
    workoutPlan.safetyNotes?.length
      ? workoutPlan.safetyNotes
      : fallbackCoachWarnings(profile)
  )
    .map((line) => cleanSafetyLine(directUserCopy(line, profile)))
    .filter(Boolean)
    .slice(0, 4);
  const coachSummaryPoints = splitCoachPoints(
    workoutPlan.coachSummary ?? "",
    profile,
    3
  );
  const coachExplanationPoints = splitCoachPoints(
    workoutPlan.structureReason || workoutPlan.planReason || "",
    profile,
    4
  );
  const visibleCoachSummaryPoints =
    coachSummaryPoints.length > 0 ? coachSummaryPoints : fallbackCoachSummary(profile);
  const visibleCoachExplanationPoints =
    coachExplanationPoints.length > 0
      ? coachExplanationPoints
      : fallbackCoachExplanation(workoutPlan);
  const isManualBuilder = workoutPlan.source === "manual";
  const activePass =
    workoutPlan.passes.find((pass) => pass.key === activePassKey) ??
    workoutPlan.passes[0];
  const visiblePasses = workoutPlan.passes;
  const missingPasses = isManualBuilder
    ? workoutPlan.passes.filter((pass) => pass.exercises.length === 0)
    : [];
  const missingPassText = formatMissingPasses(missingPasses);
  const canApproveProgram =
    programBuildStatus !== "fallback" &&
    totalExercises > 0 &&
    missingPasses.length === 0;
  const hasCoachReviewSuggestions = coachReviewSuggestions.length > 0;
  const libraryPass = libraryPassKey
    ? workoutPlan.passes.find((pass) => pass.key === libraryPassKey)
    : null;
  const libraryInfoExercise = libraryInfoExerciseKey
    ? libraryExercises.find(
        (exercise) => exercise.exerciseKey === libraryInfoExerciseKey
      ) ?? null
    : null;
  const libraryPassExerciseKeys = new Set(
    libraryPass?.exercises.map((exercise) =>
      normalizeExerciseSearchText(exercise.name)
    ) ?? []
  );
  const termsHelpOverlay =
    showTermsHelp && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/12 px-4 pt-24 backdrop-blur-[1px]"
            onClick={() => setShowTermsHelp(false)}
          >
            <div
              role="dialog"
              aria-label="Begrepp under passet"
              className="program-terms-help mx-auto w-full max-w-[21rem] rounded-2xl bg-[#0d1724] p-3.5 shadow-[0_28px_80px_rgba(0,0,0,0.46),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/72">
                    Snabbguide
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/58">
                    Begreppen coachen använder när du loggar ett set.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsHelp(false)}
                  aria-label="Stäng begreppsförklaring"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-sm leading-none text-white/54 transition hover:bg-white/[0.10] hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="mt-3 grid gap-2.5">
                {[
                  {
                    label: "Vikt",
                    text: "Belastningen du använder.",
                    example: "Exempel: 20 kg per hantel.",
                  },
                  {
                    label: "Reps",
                    text: "Hur många repetitioner du gör.",
                    example: "Exempel: 10 reps.",
                  },
                  {
                    label: "RIR",
                    text: "Hur många repetitioner du tror att du hade kvar med bra teknik.",
                    example:
                      "RIR 2 betyder att du gjorde setet men tror att du kunde klarat 2 till.",
                  },
                  {
                    label: "Tid",
                    text: "Används för tidsövningar i stället för reps.",
                    example: "Exempel: planka 30 sek.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-white/[0.045] px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold leading-4 text-white">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/62">
                      {item.text}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-white/42">
                      {item.example}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
    {termsHelpOverlay}
    <main className="min-h-screen bg-[#0b1018] px-4 pb-5 pt-16 text-white">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4">
        <section className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/45">
            Coachen
          </p>

          <h1 className="mt-3 text-[1.45rem] font-semibold leading-tight tracking-normal text-white">
            {programBuildStatus === "fallback"
              ? "AI-bygget behöver köras om."
              : isManualBuilder
              ? "Fyll passen med övningar."
              : "Jag har byggt ditt upplägg."}
          </h1>

          {!isManualBuilder ? (
            <>
              {programBuildStatus === "fallback" ? (
                <p className="mt-3 text-sm leading-6 text-white/72">
                  Jag vill inte ge dig ett standardpass här. Tryck bygg om, så låter vi coachen göra upplägget ordentligt.
                </p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {visibleCoachSummaryPoints.map((point) => (
                    <p key={point} className="text-sm leading-5 text-white/70">
                      {point}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : manualReviewSummary ? (
            <div className="mt-4 rounded-2xl border border-blue-300/14 bg-blue-400/[0.055] px-3.5 py-3 text-sm leading-6 text-white/70">
              {manualReviewSummary}
            </div>
          ) : null}

          {programBuildStatus === "building" ? (
            <div className="mt-4 rounded-2xl border border-blue-300/16 bg-blue-400/[0.07] p-3 text-sm font-semibold leading-6 text-blue-50/78">
              Jag bygger upplägget med AI nu. Du ser ett enkelt säkerhetsupplägg medan jag tänker klart.
            </div>
          ) : null}

          {programBuildStatus === "fallback" ? (
            <div className="mt-4 rounded-2xl border border-amber-300/18 bg-amber-300/[0.07] p-3 text-sm leading-6 text-amber-50/74">
              AI-bygget gick inte igenom. Det här upplägget är bara ett tillfälligt säkerhetsläge och ska inte godkännas som ditt program.
            </div>
          ) : null}

          {!isManualBuilder ? (
          <div className="mt-4 overflow-hidden rounded-2xl bg-white/[0.035] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
            <button
              type="button"
              onClick={() => setShowCoachDetails((value) => !value)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.035]"
            >
              <span>
                <span className="block text-sm font-semibold text-white/78">
                  {showCoachDetails
                    ? "Dölj förklaringen"
                    : "Hur har coachen tänkt?"}
                </span>
                <span className="mt-1 block text-xs leading-5 text-white/44">
                  Varför passen, övningarna och nivån ser ut som de gör.
                </span>
              </span>
              <span className="text-lg leading-none text-white/42">
                {showCoachDetails ? "−" : "+"}
              </span>
            </button>

            {showCoachDetails ? (
              <div className="border-t border-white/[0.055] px-3.5 pb-3.5 pt-3">
                <div className="grid gap-2">
                  {visibleCoachExplanationPoints.map((point) => (
                    <p key={point} className="text-sm leading-5 text-white/66">
                      {point}
                    </p>
                  ))}
                </div>

                <div className="mt-3 rounded-2xl bg-white/[0.035] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/36">
                    Viktigt under passen
                  </p>
                  <div className="grid gap-1.5">
                    {safetyLines.map((line) => (
                      <p key={line} className="text-xs leading-5 text-white/56">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : hasCoachReviewSuggestions ? (
              <p className="text-center text-xs font-medium leading-5 text-blue-100/54">
                Coachens förslag visas dimmat i passen. Tryck + för att lägga till.
              </p>
            ) : manualReviewSummary ? (
              <p className="text-center text-xs font-medium leading-5 text-white/48">
                {manualReviewSummary}
              </p>
            ) : null}
          </div>
          ) : null}

          {!isManualBuilder ? (
          <div className="program-terms-panel relative mt-3 rounded-2xl bg-[#101b28] px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/72">
              Begrepp under passet
                </p>
                <p className="mt-1 text-xs leading-5 text-white/58">
                  Ord coachen använder när du loggar seten.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsHelp((current) => !current)}
                aria-expanded={showTermsHelp}
                aria-label="Visa förklaring av begreppen"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/13 text-sm font-semibold leading-none text-blue-100/86 shadow-[0_10px_24px_rgba(37,99,235,0.16),inset_0_0_0_1px_rgba(96,165,250,0.20)] transition hover:bg-blue-500/18 hover:text-white"
              >
                i
              </button>
            </div>
            {false ? (
              <div
                role="dialog"
                aria-label="Begrepp under passet"
                className="program-terms-help fixed left-1/2 top-[7.25rem] z-[999] w-[min(21rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl bg-[#0d1724] p-3.5 shadow-[0_28px_80px_rgba(0,0,0,0.46),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/72">
                      Snabbguide
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/58">
                      Begreppen coachen använder när du loggar ett set.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTermsHelp(false)}
                    aria-label="Stäng begreppsförklaring"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-sm leading-none text-white/54 transition hover:bg-white/[0.10] hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-3 grid gap-2.5">
                  {[
                    {
                      label: "Vikt",
                      text: "Belastningen du använder.",
                      example: "Exempel: 20 kg per hantel.",
                    },
                    {
                      label: "Reps",
                      text: "Hur många repetitioner du gör.",
                      example: "Exempel: 10 reps.",
                    },
                    {
                      label: "RIR",
                      text: "Hur många repetitioner du tror att du hade kvar med bra teknik.",
                      example: "RIR 2 betyder att du gjorde setet men tror att du kunde klarat 2 till.",
                    },
                    {
                      label: "Tid",
                      text: "Används för tidsövningar i stället för reps.",
                      example: "Exempel: planka 30 sek.",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/[0.045] px-3 py-2.5">
                      <p className="text-sm font-semibold leading-4 text-white">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/62">{item.text}</p>
                      <p className="mt-1 text-[11px] leading-4 text-white/42">{item.example}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: "Vikt", text: "Belastningen du kör med." },
                { label: "Reps", text: "Hur många lyft du gör." },
                { label: "RIR", text: "Reps du hade kvar." },
                { label: "Tid", text: "Sekunder i tidsövningar." },
              ].map(({ label, text }) => (
                <div
                  key={label}
                  className="rounded-xl bg-white/[0.045] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]"
                >
                  <p className="text-sm font-semibold leading-4 text-white">{label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-white/54">{text}</p>
                </div>
              ))}
            </div>
          </div>
          ) : null}

          {!isManualBuilder && programBuildStatus !== "fallback" ? (
            <div className="program-coach-nudge mt-3 rounded-2xl px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/72">
                Behöver något justeras?
              </p>
              <p className="mt-1 text-sm leading-5 text-white/66">
                Prata med coachen längst ner. Du får se förslaget innan upplägget ändras.
              </p>
            </div>
          ) : null}

          {!isManualBuilder && programBuildStatus === "fallback" ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onRebuildProgram}
              className="rounded-xl bg-[#2f6df6] px-3 py-2 text-xs font-semibold text-white shadow-[0_0_22px_rgba(37,99,235,0.2)] transition hover:bg-[#4f83ff]"
            >
              Bygg om med coachen
            </button>
          </div>
          ) : null}
        </section>

        {programBuildStatus !== "fallback" ? (
        <section className="rounded-[1.5rem] bg-white/[0.035] p-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
                {isManualBuilder ? "Översikt" : "Upplägg"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {isManualBuilder
                  ? "Pass och övningar"
                  : `${profile.daysPerWeek} dagar · ${profile.minutesPerSession} min`}
              </h2>
            </div>

            {!isManualBuilder ? (
              <button
                className="rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-xs font-semibold text-white/68 transition hover:bg-white/[0.07] hover:text-white"
                onClick={onEditProfile}
              >
                Ändra
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2.5">
            {isManualBuilder ? (
              <div className="rounded-2xl bg-slate-950/20 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                  <span aria-hidden="true" />
                  <p className="text-xs font-semibold text-white/38">
                    {exerciseCountLabel(totalExercises)} totalt
                  </p>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {workoutPlan.passes.map((pass) => {
                    const active = pass.key === activePass?.key;

                    return (
                      <button
                        key={pass.key}
                        type="button"
                        onClick={() => setActivePassKey(pass.key)}
                        className={`min-w-[72px] rounded-xl border px-2.5 py-2 text-center transition ${
                          active
                            ? "border-blue-300/45 bg-blue-500/[0.18] text-white"
                            : "border-white/[0.07] bg-white/[0.025] text-white/58 hover:bg-white/[0.055] hover:text-white/78"
                        }`}
                      >
                        <span className="block text-sm font-semibold">
                          {pass.key}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-semibold text-white/42">
                          {pass.exercises.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {visiblePasses.map((pass, visiblePassIndex) => {
              const passIndex = workoutPlan.passes.findIndex(
                (item) => item.key === pass.key
              );
              const normalizedPassIndex = passIndex >= 0 ? passIndex : visiblePassIndex;
              const passDisplayName = isManualBuilder
                ? getManualPassLabel(pass)
                : cleanPassNameForDisplay(pass.displayName);
              const hasExercises = pass.exercises.length > 0;
              const passIntent = cleanProgramCopy(pass.intent);
              const addFeedback = addFeedbackByPass[pass.key];
              const inputValue = exerciseInputsByPass[pass.key] ?? "";
              const hasExerciseInput = inputValue.trim().length > 0;
              const showCustomCategories =
                showCustomCategoriesByPass[pass.key] ||
                addFeedback?.tone === "question";
              const passReviewSuggestions = coachReviewSuggestions.filter(
                (suggestion) => suggestion.passKey === pass.key
              );
              const addReviewSuggestions = passReviewSuggestions.filter(
                (suggestion) => suggestion.kind === "add"
              );
              const removeReviewSuggestions = passReviewSuggestions.filter(
                (suggestion) => suggestion.kind === "remove"
              );

              return (
              <div
                key={pass.key}
              className="overflow-hidden rounded-[1.35rem] bg-slate-950/16 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]"
              >
                <div className="flex items-center justify-between gap-3 px-3 py-3">
                  {editingPassKey === pass.key ? (
                    <div className="flex min-w-0 flex-1 gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-slate-950/45 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-white/28 focus:border-blue-300/45"
                        value={passNameInput}
                        onChange={(event) => setPassNameInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") savePassName(pass);
                          if (event.key === "Escape") {
                            setEditingPassKey(null);
                            setPassNameInput("");
                          }
                        }}
                        autoFocus
                      />
                      <button
                        className="rounded-xl bg-[#2f6df6] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4f83ff]"
                        onClick={() => savePassName(pass)}
                      >
                        Spara
                      </button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-400/[0.10] text-xs font-semibold text-blue-100/76 shadow-[inset_0_0_0_1px_rgba(147,197,253,0.12)]">
                        {normalizedPassIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-white">
                          {passDisplayName}
                        </h3>
                        <p className="mt-0.5 text-[11px] font-medium text-white/38">
                          {exerciseCountLabel(pass.exercises.length)}
                        </p>
                        {passIntent && !isManualBuilder ? (
                          <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-white/48">
                            {passIntent}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={`Visa info om ${passDisplayName}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.045] text-xs font-semibold text-white/52 transition hover:bg-white/[0.08] hover:text-white"
                      onClick={() => setInfoPass(pass)}
                    >
                      i
                    </button>
                  </div>
                </div>

                {editingPassKey !== pass.key ? (
                  <div className="flex items-center justify-end px-3 pb-2">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-semibold text-white/52 transition hover:bg-white/[0.07] hover:text-white"
                      onClick={() => startEditingPassName(pass)}
                    >
                      <PencilGlyph className="h-3.5 w-3.5" />
                      Byt passnamn
                    </button>
                  </div>
                ) : null}

                <div className="grid gap-1.5 px-2.5 pb-2.5">
                  {pass.exercises.map((exercise) => {
                    const exercisePurpose = cleanProgramCopy(exercise.purpose);
                    const removeSuggestion = removeReviewSuggestions.find(
                      (suggestion) =>
                        normalizeExerciseSearchText(suggestion.name) ===
                        normalizeExerciseSearchText(exercise.name)
                    );

                    return (
                    <div
                      key={`${pass.key}-${exercise.name}`}
                      className={`flex items-start justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)] ${
                        removeSuggestion
                          ? "border border-red-300/16 bg-red-400/[0.06] text-white/50"
                          : "bg-white/[0.032] text-white/74"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{exercise.name}</span>
                        {exercisePurpose ? (
                          <span className="mt-0.5 block text-[11px] font-medium leading-4 text-white/42">
                            {exercisePurpose}
                          </span>
                        ) : null}
                        {exercise.sets || exercise.reps || exercise.rir ? (
                          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100/36">
                            {[exercise.sets && `${exercise.sets} set`, exercise.reps && `${exercise.reps} reps`, exercise.rir && `RIR ${exercise.rir}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                        {removeSuggestion ? (
                          <span className="mt-1 block text-[11px] font-medium leading-4 text-red-100/48">
                            Coachens förslag: ta bort. {removeSuggestion.reason}
                          </span>
                        ) : null}
                      </span>
                      {removeSuggestion ? (
                        <span className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            onClick={() => acceptCoachReviewSuggestion(removeSuggestion)}
                            className="rounded-full bg-red-500/80 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-red-400"
                          >
                            Ta bort
                          </button>
                          <button
                            type="button"
                            onClick={() => dismissCoachReviewSuggestion(removeSuggestion.id)}
                            className="rounded-full border border-white/[0.07] bg-slate-950/18 px-2.5 py-1 text-[10px] font-semibold text-white/42 transition hover:bg-white/[0.08] hover:text-white"
                          >
                            Behåll
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemoveExercise(pass.key, exercise.name)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-slate-950/18 text-white/38 transition hover:bg-white/[0.08] hover:text-white"
                          aria-label={`Ta bort ${exercise.name}`}
                        >
                          <CloseGlyph className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    );
                  })}
                  {addReviewSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-blue-300/12 bg-blue-400/[0.045] px-3 py-2 text-sm font-semibold text-white/46"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{suggestion.name}</span>
                        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100/44">
                          Coachens förslag
                        </span>
                        <span className="mt-1 block text-[11px] font-medium leading-4 text-white/38">
                          {suggestion.reason}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => acceptCoachReviewSuggestion(suggestion)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f6df6] text-sm font-semibold text-white transition hover:bg-[#4f83ff]"
                          aria-label={`Lägg till ${suggestion.name}`}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissCoachReviewSuggestion(suggestion.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.07] bg-slate-950/18 text-white/38 transition hover:bg-white/[0.08] hover:text-white"
                          aria-label={`Ignorera ${suggestion.name}`}
                        >
                          <CloseGlyph className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 rounded-2xl border border-blue-300/10 bg-blue-400/[0.035] p-3 shadow-[inset_0_0_0_1px_rgba(147,197,253,0.06)]">
                    <div className="mb-2 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/44">
                          Lägg till i {passDisplayName}
                        </p>
                        <p className="mt-1 text-xs text-white/44">
                          Skriv övningsnamnet här.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-xl border border-white/[0.075] bg-slate-950/34 px-3.5 py-3 text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-blue-300/55 focus:bg-slate-950/46"
                        value={inputValue}
                        onChange={(event) => {
                          setExerciseInputsByPass((prev) => ({
                            ...prev,
                            [pass.key]: event.target.value,
                          }));
                          setAddFeedbackByPass((prev) => ({
                            ...prev,
                            [pass.key]: undefined,
                          }));
                          setShowCustomCategoriesByPass((prev) => ({
                            ...prev,
                            [pass.key]: false,
                          }));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addExerciseToPass(pass.key);
                          }
                        }}
                        placeholder={
                          hasExercises
                            ? "Nästa övning..."
                            : "Bänkpress, latsdrag, sidolyft..."
                        }
                      />
                      <button
                        type="button"
                        onClick={() => addExerciseToPass(pass.key)}
                        disabled={!hasExerciseInput}
                        className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                          hasExerciseInput
                            ? "bg-[#2f6df6] text-white shadow-[0_0_22px_rgba(47,109,246,0.18)] hover:bg-[#4f83ff]"
                            : "bg-white/[0.06] text-white/28"
                        }`}
                      >
                        Lägg till
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLibraryPassKey(pass.key);
                        setLibraryInfoExerciseKey(null);
                        setLibrarySearch("");
                        setLibraryCategory("alla");
                      }}
                      className="mt-2.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm font-semibold text-white/58 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      Bläddra i övningsbiblioteket
                    </button>
                    {addFeedback?.message ? (
                      <div className={`mt-2 rounded-xl border px-3 py-2 text-xs leading-5 ${
                        addFeedback.tone === "success"
                          ? "border-emerald-300/14 bg-emerald-300/[0.055] text-white/68"
                          : "border-blue-300/16 bg-blue-400/[0.07] text-white/70"
                      }`}>
                        <p>{cleanProgramCopy(addFeedback.message)}</p>
                        {addFeedback.suggestion ? (
                          <button
                            type="button"
                            onClick={() => addExerciseToPass(pass.key)}
                            className="mt-2 w-full rounded-lg bg-[#2f6df6] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4f83ff]"
                          >
                            Lägg till {addFeedback.suggestion}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {inputValue.trim() ? (
                      <div className="mt-2 rounded-xl bg-white/[0.025] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                        {!showCustomCategories ? (
                          <button
                            type="button"
                            onClick={() =>
                              setShowCustomCategoriesByPass((prev) => ({
                                ...prev,
                                [pass.key]: true,
                              }))
                            }
                            className="w-full rounded-lg border border-white/[0.07] bg-slate-950/18 px-3 py-2 text-left text-[12px] font-semibold text-white/58 transition hover:border-blue-300/32 hover:bg-blue-500/[0.10] hover:text-white"
                          >
                            Lägg in som egen övning
                          </button>
                        ) : (
                          <>
                            <p className="px-1 text-[11px] font-medium leading-4 text-white/42">
                              Vad tränar den främst?
                            </p>
                            <div className="mt-2 grid grid-cols-3 gap-1.5">
                              {CUSTOM_EXERCISE_CATEGORIES.map((category) => (
                                <button
                                  key={category}
                                  type="button"
                                  onClick={() => addCustomExerciseToPass(pass.key, category)}
                                  className="rounded-lg border border-white/[0.07] bg-slate-950/18 px-2 py-2 text-[11px] font-semibold capitalize text-white/58 transition hover:border-blue-300/32 hover:bg-blue-500/[0.10] hover:text-white"
                                >
                                  {category}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </section>
        ) : null}

        {infoPass ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
            <div className="max-h-[calc(100svh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                Övningar
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-normal text-white">
                    Vad betyder övningarna?
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-white/62">
                    Här ser du vilket redskap du ska använda.
                  </p>
                </div>
                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  onClick={() => setInfoPass(null)}
                  aria-label="Stäng"
                >
                  <CloseGlyph className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-2.5">
                {infoPass.exercises.map((exercise) => {
                  const info = getExerciseProfile(exercise.name);
                  const userInfo = getExerciseUserInfo(
                    exercise.exerciseKey || exercise.name
                  );
                  const reviewedMuscleMap = getReviewedExerciseMuscleMap(
                    exercise.exerciseKey || exercise.name
                  );
                  const purpose =
                    cleanProgramCopy(exercise.purpose) ||
                    cleanProgramCopy(userInfo.whyChosen) ||
                    cleanProgramCopy(info.detail);
                  const caution =
                    cleanProgramCopy(exercise.caution) ||
                    cleanProgramCopy(userInfo.keepInMind) ||
                    cleanProgramCopy(info.progressionRule);
                  const metricLabel =
                    userInfo.logTypeText.includes("tid") ||
                    userInfo.logTypeText.includes("Tid")
                      ? "Tid"
                      : "Reps";
                  const reviewedInfoTemplate = getReviewedExerciseInfoTemplate(
                    exercise.exerciseKey || exercise.name
                  );

                  return (
                    <div
                      key={`${infoPass.key}-info-${exercise.name}`}
                      className="rounded-2xl border border-white/8 bg-slate-950/20 p-3"
                    >
                      <h3 className="text-sm font-semibold text-white">
                        {exercise.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/38">
                        {reviewedInfoTemplate?.equipment ?? info.equipment}
                      </p>
                      {reviewedMuscleMap ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-white/[0.035] px-3 py-2">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                              Primärt
                            </p>
                            <p className="mt-1 text-xs font-semibold text-white/76">
                              {reviewedMuscleMap.labels.primary}
                            </p>
                          </div>
                          {reviewedMuscleMap.labels.active ? (
                            <div className="rounded-xl bg-white/[0.035] px-3 py-2">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                                Också
                              </p>
                              <p className="mt-1 text-xs font-semibold text-white/76">
                                {reviewedMuscleMap.labels.active}
                              </p>
                            </div>
                          ) : null}
                          <div
                            className={`rounded-xl bg-white/[0.035] px-3 py-2 ${
                              reviewedMuscleMap.labels.active ? "col-span-2" : ""
                            }`}
                          >
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                              Sekundärt
                            </p>
                            <p className="mt-1 text-xs font-semibold text-white/76">
                              {reviewedMuscleMap.labels.secondary}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs leading-5 text-white/52">
                          Tränar: {cleanProgramCopy(userInfo.trains)}
                        </p>
                      )}
                      {reviewedMuscleMap ? (
                        <ExerciseMuscleMapReal review={reviewedMuscleMap} />
                      ) : null}
                      {reviewedInfoTemplate ? (
                        <div className="mt-3 grid gap-3">
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
                        <>
                          <p className="mt-2 text-sm leading-6 text-white/68">
                            {purpose}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-white/48">
                            {cleanProgramCopy(userInfo.logTypeText)}
                          </p>
                        </>
                      )}
                      {exercise.sets || exercise.reps || exercise.rir ? (
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                          {exercise.sets ? (
                            <div className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                                Set
                              </p>
                              <p className="mt-1 text-xs font-semibold text-white/72">
                                {exercise.sets}
                              </p>
                            </div>
                          ) : null}
                          {exercise.reps ? (
                            <div className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                                {metricLabel}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-white/72">
                                {exercise.reps}
                              </p>
                            </div>
                          ) : null}
                          {exercise.rir ? (
                            <div className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                                RIR
                              </p>
                              <p className="mt-1 text-xs font-semibold text-white/72">
                                {exercise.rir}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {!reviewedInfoTemplate ? (
                        <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] p-2.5">
                          <p className="text-xs leading-5 text-white/64">
                            {cleanProgramCopy(info.techniqueCue)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-white/44">
                            {caution}
                          </p>
                          {userInfo.easierAlternative ? (
                            <p className="mt-1 text-xs leading-5 text-white/44">
                              Lättare variant: {cleanProgramCopy(userInfo.easierAlternative)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {libraryPassKey ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
            <div className="max-h-[calc(100svh-2rem)] w-full max-w-[430px] overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
              <div className="border-b border-white/[0.07] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                      Övningsbibliotek
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
                      Lägg till i Pass {libraryPassKey}
                    </h2>
                  </div>
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                    onClick={() => {
                      setLibraryInfoExerciseKey(null);
                      setLibraryPassKey(null);
                    }}
                    aria-label="Stäng"
                  >
                    <CloseGlyph className="h-4 w-4" />
                  </button>
                </div>

                <input
                  className="mt-4 w-full rounded-xl border border-white/[0.09] bg-slate-950/45 px-3 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-blue-300/45"
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Sök övning, muskel eller redskap"
                />

                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
                  {LIBRARY_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setLibraryCategory(category)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        libraryCategory === category
                          ? "border-blue-300/45 bg-blue-500/[0.18] text-white"
                          : "border-white/[0.08] bg-white/[0.035] text-white/50 hover:bg-white/[0.07] hover:text-white/72"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[58svh] overflow-y-auto p-3">
                <div className="grid gap-2">
                  {filteredLibraryExercises.map((exercise) => {
                    const alreadyAdded = libraryPassExerciseKeys.has(
                      normalizeExerciseSearchText(exercise.name)
                    );

                    return (
                    <div
                      key={exercise.exerciseKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => setLibraryInfoExerciseKey(exercise.exerciseKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setLibraryInfoExerciseKey(exercise.exerciseKey);
                        }
                      }}
                      className={`rounded-2xl border p-3 ${
                        alreadyAdded
                          ? "border-emerald-300/14 bg-emerald-300/[0.04]"
                          : "border-white/[0.07] bg-slate-950/22"
                      } cursor-pointer text-left transition hover:border-blue-300/24 hover:bg-white/[0.045] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/35`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-white">
                            {exercise.name}
                          </h3>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100/38">
                            {exercise.category} · {exercise.equipment}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addLibraryExercise(libraryPassKey, exercise.name);
                          }}
                          disabled={alreadyAdded}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                            alreadyAdded
                              ? "bg-emerald-300/[0.14] text-emerald-100/78"
                              : "bg-[#2f6df6] text-white hover:bg-[#4f83ff]"
                          }`}
                          aria-label={
                            alreadyAdded
                              ? `${exercise.name} är tillagd`
                              : `Lägg till ${exercise.name}`
                          }
                        >
                          {alreadyAdded ? "✓" : "+"}
                        </button>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/54">
                        {cleanProgramCopy(exercise.detail)}
                      </p>
                      <p className="mt-2 text-[11px] leading-4 text-white/38">
                        Loggas: {exercise.logType === "time_rir" ? "tid och marginal" : "vikt, reps och RIR"}
                      </p>
                    </div>
                    );
                  })}
                </div>

                {filteredLibraryExercises.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.07] bg-slate-950/22 p-4 text-sm leading-6 text-white/58">
                    Ingen övning matchar filtret. Testa en annan sökning eller lägg in den som egen övning.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {libraryPassKey && libraryInfoExercise ? (
          (() => {
            const info = getExerciseProfile(libraryInfoExercise.name);
            const userInfo = getExerciseUserInfo(
              libraryInfoExercise.exerciseKey || libraryInfoExercise.name
            );
            const reviewedMuscleMap = getReviewedExerciseMuscleMap(
              libraryInfoExercise.exerciseKey || libraryInfoExercise.name
            );
            const reviewedInfoTemplate = getReviewedExerciseInfoTemplate(
              libraryInfoExercise.exerciseKey || libraryInfoExercise.name
            );
            const alreadyAdded = libraryPassExerciseKeys.has(
              normalizeExerciseSearchText(libraryInfoExercise.name)
            );

            return (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 px-4 py-4 backdrop-blur-sm">
                <div className="max-h-[calc(100svh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                        Övningsinfo
                      </p>
                      <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
                        {libraryInfoExercise.name}
                      </h2>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/38">
                        {reviewedInfoTemplate?.equipment ?? info.equipment}
                      </p>
                    </div>
                    <button
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                      onClick={() => setLibraryInfoExerciseKey(null)}
                      aria-label="Stäng övningsinfo"
                    >
                      <CloseGlyph className="h-4 w-4" />
                    </button>
                  </div>

                  {reviewedMuscleMap ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-white/[0.035] px-3 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                          Primärt
                        </p>
                        <p className="mt-1 text-xs font-semibold text-white/76">
                          {reviewedMuscleMap.labels.primary}
                        </p>
                      </div>
                      {reviewedMuscleMap.labels.active ? (
                        <div className="rounded-xl bg-white/[0.035] px-3 py-2">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                            Också
                          </p>
                          <p className="mt-1 text-xs font-semibold text-white/76">
                            {reviewedMuscleMap.labels.active}
                          </p>
                        </div>
                      ) : null}
                      <div
                        className={`rounded-xl bg-white/[0.035] px-3 py-2 ${
                          reviewedMuscleMap.labels.active ? "col-span-2" : ""
                        }`}
                      >
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
                          Sekundärt
                        </p>
                        <p className="mt-1 text-xs font-semibold text-white/76">
                          {reviewedMuscleMap.labels.secondary}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-white/58">
                      Tränar: {cleanProgramCopy(userInfo.trains)}
                    </p>
                  )}

                  {reviewedMuscleMap ? (
                    <ExerciseMuscleMapReal review={reviewedMuscleMap} />
                  ) : null}

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
                    <>
                      <p className="mt-4 text-sm leading-6 text-white/68">
                        {cleanProgramCopy(userInfo.whyChosen || info.detail)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-white/44">
                        Loggas: {userInfo.logTypeText}
                      </p>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      addLibraryExercise(libraryPassKey, libraryInfoExercise.name)
                    }
                    disabled={alreadyAdded}
                    className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      alreadyAdded
                        ? "bg-emerald-300/[0.14] text-emerald-100/78"
                        : "bg-[#2f6df6] text-white hover:bg-[#4f83ff]"
                    }`}
                  >
                    {alreadyAdded ? "Tillagd i passet" : `Lägg till i Pass ${libraryPassKey}`}
                  </button>
                </div>
              </div>
            );
          })()
        ) : null}

        {isManualReviewing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 backdrop-blur-sm">
            <div className="w-full max-w-[360px] rounded-[1.5rem] border border-blue-300/14 bg-[#131c27] p-5 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/[0.12] shadow-[0_0_34px_rgba(47,109,246,0.22)]">
                <div className="h-6 w-6 animate-pulse rounded-full bg-[#2f6df6]" />
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/48">
                Coachen granskar
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                Jag kollar balansen i schemat.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Jag tittar på passlängd, muskelgrupper och om något verkar saknas eller bli för mycket.
              </p>
            </div>
          </div>
        ) : null}

        {!isManualBuilder && !isFallbackProgramBuildStatus(programBuildStatus) ? (
        <section className={`program-coach-dialog rounded-[1.5rem] border border-white/[0.09] backdrop-blur-xl ${
          isManualBuilder ? "bg-white/[0.028] p-3" : "bg-white/[0.048] p-3.5"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/42">
                {isManualBuilder ? "Fråga coachen" : "Prata med coachen"}
              </p>
              <p className={`${isManualBuilder ? "mt-1 text-xs" : "mt-2 text-sm"} leading-6 text-white/72`}>
                {isManualBuilder
                  ? "Behöver du hjälp att välja, byta eller förstå en övning?"
                  : "Fråga, säg om något känns fel eller be mig justera upplägget."}
              </p>
              {!isManualBuilder ? (
                <p className="mt-1 text-xs leading-5 text-white/46">
                  Du godkänner alltid ändringar innan de läggs in.
                </p>
              ) : hasCoachReviewSuggestions ? (
                <p className="text-center text-xs font-medium leading-5 text-blue-100/54">
                  Coachens förslag visas dimmat i passen. Tryck + för att lägga till.
                </p>
              ) : hasCoachReviewSuggestions ? (
                <p className="text-center text-xs font-medium leading-5 text-blue-100/54">
                  Coachens förslag syns i passen. Blå rader kan läggas till, röda kan tas bort.
                </p>
              ) : manualReviewSummary ? (
                <p className="text-center text-xs font-medium leading-5 text-white/48">
                  {manualReviewSummary}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setShowInputHelp(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.052] text-xs font-semibold text-white/58 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Visa exempel på vad du kan ändra"
            >
              i
            </button>
          </div>

          <div
            className={`program-coach-input-panel mt-3 rounded-2xl border p-2.5 transition ${
              preferenceReply || pendingProgramSuggestion
                ? "border-blue-300/18 bg-blue-400/[0.055]"
                : "border-transparent bg-transparent p-0"
            }`}
          >
            {preferenceReply || pendingProgramSuggestion ? (
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/52">
                  Skriv vidare här
                </p>
                <p className="text-[11px] font-medium text-white/38">
                  Samma samtal
                </p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-white/[0.09] bg-slate-950/45 px-3 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-blue-300/45"
                value={preferenceInput}
                onChange={(event) => setPreferenceInput(event.target.value)}
                disabled={isPreferenceSubmitting}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitPreference();
                  }
                }}
                placeholder={
                  preferenceReply || pendingProgramSuggestion
                    ? "Svara coachen eller skriv en ny ändring..."
                    : 't.ex. "ont i bröstet", "mer rygg", "byt marklyft"'
                }
              />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2f6df6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4f83ff] disabled:opacity-45"
                disabled={!preferenceInput.trim() || isPreferenceSubmitting}
                onClick={submitPreference}
              >
                <SendGlyph className="h-4 w-4" />
                {isPreferenceSubmitting ? "Skickar" : "Skicka"}
              </button>
            </div>

            {isPreferenceSubmitting ? (
              <div className="mt-2 flex items-center gap-2 px-1 text-xs font-medium leading-5 text-blue-100/58">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#2f6df6] shadow-[0_0_14px_rgba(47,109,246,0.65)]" />
                Coachen skriver...
              </div>
            ) : null}

            {preferenceReply || pendingProgramSuggestion ? (
              <p className="mt-2 px-1 text-xs leading-5 text-white/44">
                Om coachen föreslår en ändring godkänner du den med knappen nedan.
              </p>
            ) : null}
          </div>

          {showInputHelp ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4 backdrop-blur-sm">
              <div className="w-full max-w-[430px] rounded-[1.5rem] border border-white/[0.09] bg-[#131c27] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                      Exempel
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
                      Vad kan jag säga?
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.048] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                    onClick={() => setShowInputHelp(false)}
                    aria-label="Stäng"
                  >
                    <CloseGlyph className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid gap-2.5">
                  {[
                    "lägg till knäböj men ta bort marklyft",
                    "jag gillar inte vadpress",
                    "jag vill ha mer bröst",
                    "jag har ont i knät",
                    "Dag 1: bänkpress, hantelpress. Dag 2: latsdrag, rodd.",
                    "lägg till egen ben: benspark med z-stång",
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setPreferenceInput(example);
                        setShowInputHelp(false);
                      }}
                      className="rounded-2xl border border-white/8 bg-slate-950/20 px-3 py-2.5 text-left text-sm font-semibold leading-5 text-white/76 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-white/46">
                  Coachen föreslår ändringar. Du godkänner innan upplägget blir ditt.
                </p>
              </div>
            </div>
          ) : null}

          {preferenceReply ? (
            <div className="mt-3 rounded-2xl border border-blue-300/14 bg-slate-950/22 p-3 text-sm leading-6 text-white/72">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/48">
                {pendingProgramSuggestion ? "Coachens kommentar" : "Coachens svar"}
              </p>
              <p>{cleanProgramCopy(preferenceReply)}</p>
              <p className="mt-2 border-t border-white/[0.06] pt-2 text-xs font-medium leading-5 text-white/42">
                Skriv vidare i rutan ovan.
              </p>
            </div>
          ) : null}

          {pendingProgramSuggestion ? (
            <div className="program-coach-suggestion-card mt-3 rounded-2xl p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/52">
                Coachens förslag
              </p>
              <p className="mt-2 text-sm leading-6 text-white/78">
                {cleanProgramCopy(pendingProgramSuggestion.summary)}
              </p>
              <div className="mt-3 grid gap-1.5">
                {pendingProgramSuggestion.actions.map((action, index) => (
                  <div
                    key={`${action.type}-${index}`}
                    className="rounded-xl border border-white/8 bg-slate-950/20 px-3 py-2 text-sm font-semibold text-white/76"
                  >
                    {actionLabel(action)}
                    {action.reason ? (
                      <p className="mt-1 text-xs font-medium leading-5 text-white/48">
                        {cleanProgramCopy(action.reason)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="rounded-xl bg-[#2f6df6] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4f83ff]"
                  onClick={onApproveProgramSuggestion}
                >
                  Gör ändringen
                </button>
                <button
                  className="rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2.5 text-sm font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white"
                  onClick={onDismissProgramSuggestion}
                >
                  Behåll som det är
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2">
            {!canApproveProgram ? (
              <p className="text-center text-xs font-medium leading-5 text-white/44">
                {(programBuildStatus as Props["programBuildStatus"]) === "fallback"
                  ? "Bygg med AI först."
                  : totalExercises === 0
                  ? "Lägg till minst en övning."
                  : missingPassText || "Lägg till övningar först."}
              </p>
            ) : null}
            <button
              className="w-full rounded-2xl bg-[#2f6df6] py-3.5 text-sm font-semibold text-white shadow-[0_0_26px_rgba(37,99,235,0.24)] transition hover:bg-[#4f83ff] disabled:bg-white/[0.07] disabled:text-white/32 disabled:shadow-none"
              onClick={handleApprove}
              disabled={!canApproveProgram}
            >
              {(programBuildStatus as Props["programBuildStatus"]) === "fallback"
                ? "Bygg med AI först"
                : totalExercises === 0
                ? "Lägg till övningar först"
                : missingPassText
                ? "Fyll i saknade pass"
                : hasCoachReviewSuggestions
                ? "Godkänn utan fler ändringar"
                : hasRunManualReview && isManualBuilder
                ? "Godkänn schema"
                : isManualBuilder
                ? "Granska med coachen"
                : "Godkänn upplägget"}
            </button>
            <button
              className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.048] py-3 text-sm font-medium text-white/62 transition hover:bg-white/[0.07] hover:text-white"
              onClick={onEditProfile}
            >
              Ändra mina svar
            </button>
          </div>
        </section>
        ) : isManualBuilder ? (
          <section className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.035] p-3.5 backdrop-blur-xl">
            <div className="mt-1 grid gap-2">
              {!canApproveProgram ? (
                <p className="text-center text-xs font-medium leading-5 text-white/44">
                  {programBuildStatus === "fallback"
                    ? "Bygg med AI först."
                    : totalExercises === 0
                    ? "Lägg till minst en övning i varje pass."
                    : missingPassText || "Lägg till övningar först."}
                </p>
              ) : null}
              <button
                className="w-full rounded-2xl bg-[#2f6df6] py-3.5 text-sm font-semibold text-white shadow-[0_0_26px_rgba(37,99,235,0.24)] transition hover:bg-[#4f83ff] disabled:bg-white/[0.07] disabled:text-white/32 disabled:shadow-none"
                onClick={handleApprove}
                disabled={!canApproveProgram}
              >
                  {programBuildStatus === "fallback"
                  ? "Bygg med AI först"
                  : totalExercises === 0
                  ? "Fyll passen först"
                  : missingPassText
                  ? "Fyll i saknade pass"
                  : hasCoachReviewSuggestions
                  ? "Godkänn utan fler ändringar"
                  : hasRunManualReview
                  ? "Godkänn schema"
                  : "Granska med coachen"}
              </button>
              <button
                className="w-full rounded-2xl border border-white/[0.09] bg-white/[0.048] py-3 text-sm font-medium text-white/62 transition hover:bg-white/[0.07] hover:text-white"
                onClick={onEditProfile}
              >
                Ändra mina svar
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
    </>
  );
}

