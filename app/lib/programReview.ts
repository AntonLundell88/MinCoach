import {
  getExerciseDefinition,
  getExerciseProfile,
  getProgramExercisePool,
  normalizeExerciseSearchText,
} from "./exercises";
import type { ExerciseMovementPattern, ExerciseProfile } from "./exercises";

type ReviewPassKey = "A" | "B" | "C" | "D" | "E" | "F" | "G";

type ReviewProfile = {
  trainingExperience?: "nyborjare" | "van" | "erfaren";
  minutesPerSession: number;
  location: "gym" | "hemma";
  equipment: string[];
  limitations: string;
};

type ReviewExercise = {
  exerciseKey?: string;
  name: string;
};

type ReviewPass = {
  key: ReviewPassKey;
  displayName: string;
  exercises: ReviewExercise[];
};

type ReviewPlan = {
  passes: ReviewPass[];
};

export type ManualProgramReviewSuggestion = {
  id: string;
  kind: "add" | "remove";
  passKey: ReviewPassKey;
  name: string;
  reason: string;
};

type ExerciseAnalysis = {
  name: string;
  category: ExerciseProfile["category"];
  movementPattern?: ExerciseMovementPattern;
  exerciseType?: string;
  trainingValue?: string;
};

type ReviewCounts = {
  chest: number;
  back: number;
  lower: number;
  quads: number;
  hamstringsGlutes: number;
  press: number;
  pull: number;
};

const PRESS_PATTERNS = new Set<ExerciseMovementPattern>([
  "horisontell_press",
  "vertikal_press",
]);

const PULL_PATTERNS = new Set<ExerciseMovementPattern>([
  "horisontellt_drag",
  "vertikalt_drag",
]);

const LOWER_PATTERNS = new Set<ExerciseMovementPattern>([
  "knaboj",
  "utfall_ett_ben",
  "hoftfallning",
  "hoftstrackning",
  "knadominant_isolering",
  "hamstring_isolering",
  "vad",
]);

const HAMSTRING_GLUTE_PATTERNS = new Set<ExerciseMovementPattern>([
  "hoftfallning",
  "hoftstrackning",
  "hamstring_isolering",
]);

const QUAD_PATTERNS = new Set<ExerciseMovementPattern>([
  "knaboj",
  "utfall_ett_ben",
  "knadominant_isolering",
]);

function exerciseCountLabel(count: number) {
  return count === 1 ? "1 övning" : `${count} övningar`;
}

function getPassExerciseTarget(minutesPerSession: number) {
  if (minutesPerSession <= 30) return { min: 3, max: 4 };
  if (minutesPerSession <= 45) return { min: 3, max: 5 };
  if (minutesPerSession <= 60) return { min: 3, max: 6 };
  return { min: 4, max: 7 };
}

function inferMovementPattern(
  name: string,
  primaryMuscle: string,
  category: ExerciseProfile["category"]
): ExerciseMovementPattern | undefined {
  const key = normalizeExerciseSearchText(`${name} ${primaryMuscle}`);

  if (key.includes("bankpress") || key.includes("brostpress") || key.includes("flyes")) {
    return "horisontell_press";
  }
  if (key.includes("axelpress")) return "vertikal_press";
  if (key.includes("rodd")) return "horisontellt_drag";
  if (key.includes("latsdrag") || key.includes("chins")) return "vertikalt_drag";
  if (key.includes("marklyft") || key.includes("rdl")) return "hoftfallning";
  if (key.includes("hip thrust") || key.includes("hoftlyft") || key.includes("sate")) {
    return "hoftstrackning";
  }
  if (key.includes("larcurl") || key.includes("baksida lar")) {
    return "hamstring_isolering";
  }
  if (key.includes("benpress") || key.includes("knaboj")) return "knaboj";
  if (key.includes("benspark") || key.includes("framsida lar")) {
    return "knadominant_isolering";
  }
  if (key.includes("vad")) return "vad";
  if (key.includes("curl") || key.includes("biceps")) return "armbojning";
  if (key.includes("triceps") || key.includes("dips")) return "armstrackning";
  if (category === "mage") return "bal_stabilitet";

  return undefined;
}

function inferCategory(
  name: string,
  fallback: ExerciseProfile["category"]
): ExerciseProfile["category"] {
  const key = normalizeExerciseSearchText(name);

  if (key.includes("flyes") || key.includes("pec deck")) return "bröst";
  if (key.includes("marklyft") || key.includes("benpress") || key.includes("benspark")) {
    return "ben";
  }
  if (key.includes("latsdrag") || key.includes("rodd")) return "rygg";
  if (key.includes("curl") || key.includes("triceps")) return "armar";
  if (key.includes("sidolyft") || key.includes("axel")) return "axlar";
  if (key.includes("planka") || key.includes("situps") || key.includes("crunch")) {
    return "mage";
  }

  return fallback;
}

function analyzeExercise(exercise: ReviewExercise): ExerciseAnalysis {
  const definition = getExerciseDefinition(exercise.exerciseKey || exercise.name);
  if (definition) {
    return {
      name: definition.name,
      category: definition.category,
      movementPattern:
        definition.movementPattern ??
        inferMovementPattern(
          definition.name,
          definition.primaryMuscle,
          definition.category
        ),
      exerciseType: definition.exerciseType,
      trainingValue: definition.trainingValue,
    };
  }

  const profile = getExerciseProfile(exercise.name);
  const category = inferCategory(exercise.name, profile.category);
  return {
    name: exercise.name,
    category,
    movementPattern: inferMovementPattern(
      exercise.name,
      category,
      category
    ),
  };
}

function isPress(exercise: ExerciseAnalysis) {
  return Boolean(exercise.movementPattern && PRESS_PATTERNS.has(exercise.movementPattern));
}

function isPull(exercise: ExerciseAnalysis) {
  return Boolean(exercise.movementPattern && PULL_PATTERNS.has(exercise.movementPattern));
}

function isLower(exercise: ExerciseAnalysis) {
  return (
    exercise.category === "ben" ||
    Boolean(exercise.movementPattern && LOWER_PATTERNS.has(exercise.movementPattern))
  );
}

function isHamstringOrGlute(exercise: ExerciseAnalysis) {
  return Boolean(
    exercise.movementPattern && HAMSTRING_GLUTE_PATTERNS.has(exercise.movementPattern)
  );
}

function isQuadDominant(exercise: ExerciseAnalysis) {
  return Boolean(exercise.movementPattern && QUAD_PATTERNS.has(exercise.movementPattern));
}

function getRemovalPriority(exercise: ExerciseAnalysis) {
  const normalized = normalizeExerciseSearchText(exercise.name);
  let score = 0;

  if (exercise.exerciseType === "isolationsövning") score += 4;
  if (exercise.trainingValue === "låg") score += 3;
  if (exercise.trainingValue === "medel") score += 1;
  if (normalized.includes("flyes")) score += 5;
  if (normalized.includes("pec deck")) score += 5;
  if (normalized.includes("brostpress")) score += 2;
  if (normalized.includes("sidolyft")) score += 1;

  return score;
}

function emptyReviewCounts(): ReviewCounts {
  return {
    chest: 0,
    back: 0,
    lower: 0,
    quads: 0,
    hamstringsGlutes: 0,
    press: 0,
    pull: 0,
  };
}

function addExerciseToCounts(counts: ReviewCounts, exercise: ExerciseAnalysis) {
  if (exercise.category === "bröst") counts.chest += 1;
  if (exercise.category === "rygg") counts.back += 1;
  if (isLower(exercise)) counts.lower += 1;
  if (isQuadDominant(exercise)) counts.quads += 1;
  if (isHamstringOrGlute(exercise)) counts.hamstringsGlutes += 1;
  if (isPress(exercise)) counts.press += 1;
  if (isPull(exercise)) counts.pull += 1;
}

function combinedCount(
  actual: ReviewCounts,
  suggested: ReviewCounts,
  key: keyof ReviewCounts
) {
  return actual[key] + suggested[key];
}

export function reviewManualProgram(profile: ReviewProfile, plan: ReviewPlan) {
  const suggestions: ManualProgramReviewSuggestion[] = [];
  const suggestedWeekly = emptyReviewCounts();
  const suggestedByPass = new Map<ReviewPassKey, ReviewCounts>();
  const passTarget = getPassExerciseTarget(profile.minutesPerSession);
  const libraryExercises = getProgramExercisePool({
    location: profile.location,
    equipment: profile.equipment,
    trainingExperience: profile.trainingExperience,
    limit: 140,
  });
  const blockedExerciseKeys = new Set(
    plan.passes.flatMap((pass) =>
      pass.exercises.map((exercise) =>
        normalizeExerciseSearchText(exercise.name)
      )
    )
  );

  function addSuggestion(suggestion: Omit<ManualProgramReviewSuggestion, "id">) {
    const key = `${suggestion.kind}-${suggestion.passKey}-${normalizeExerciseSearchText(
      suggestion.name
    )}`;
    if (
      suggestions.some(
        (item) =>
          `${item.kind}-${item.passKey}-${normalizeExerciseSearchText(item.name)}` ===
          key
      )
    ) {
      return false;
    }

    suggestions.push({
      ...suggestion,
      id: `${suggestion.passKey}-${normalizeExerciseSearchText(
        suggestion.name
      )}-${suggestions.length}`,
    });

    return true;
  }

  function pickExercise(args: {
    category?: ExerciseProfile["category"];
    patterns?: ExerciseMovementPattern[];
    fallback: string;
  }) {
    const match = libraryExercises.find((exercise) => {
      if (blockedExerciseKeys.has(normalizeExerciseSearchText(exercise.name))) {
        return false;
      }
      if (args.category && exercise.category !== args.category) return false;
      if (args.patterns?.length && !args.patterns.includes(exercise.movementPattern)) {
        return false;
      }
      return true;
    });
    const name = match?.name ?? args.fallback;
    blockedExerciseKeys.add(normalizeExerciseSearchText(name));
    return name;
  }

  function suggestAdd(
    pass: ReviewPass,
    args: {
      category?: ExerciseProfile["category"];
      patterns?: ExerciseMovementPattern[];
      fallback: string;
      reason: string;
    }
  ) {
    const name = pickExercise(args);
    const added = addSuggestion({
      kind: "add",
      passKey: pass.key,
      name,
      reason: args.reason,
    });

    if (added) {
      const analysis = analyzeExercise({ name });
      addExerciseToCounts(suggestedWeekly, analysis);
      const passCounts = suggestedByPass.get(pass.key) ?? emptyReviewCounts();
      addExerciseToCounts(passCounts, analysis);
      suggestedByPass.set(pass.key, passCounts);
    }
  }

  const weekly = emptyReviewCounts();
  const analyzedPasses = plan.passes.map((pass) => {
    const exercises = pass.exercises.map(analyzeExercise);
    const counts = emptyReviewCounts();

    for (const exercise of exercises) {
      addExerciseToCounts(counts, exercise);
      addExerciseToCounts(weekly, exercise);
    }

    return { pass, exercises, counts };
  });

  for (const { pass, exercises, counts } of analyzedPasses) {
    const currentPassSuggested = () =>
      suggestedByPass.get(pass.key) ?? emptyReviewCounts();

    if (pass.exercises.length > 0 && pass.exercises.length < passTarget.min) {
      const missingCount = passTarget.min - pass.exercises.length;
      const passCategories = new Set(exercises.map((exercise) => exercise.category));
      const hasUpper =
        passCategories.has("bröst") ||
        passCategories.has("rygg") ||
        passCategories.has("axlar") ||
        passCategories.has("armar") ||
        counts.press > 0 ||
        counts.pull > 0;
      const hasLower = counts.lower > 0;
      const categoryOrder: Array<ExerciseProfile["category"]> =
        hasLower && !hasUpper
          ? ["ben", "mage"]
          : hasUpper && !hasLower
            ? [
                counts.pull === 0 ? "rygg" : "axlar",
                counts.chest === 0 ? "bröst" : "armar",
                "mage",
              ]
            : [
                counts.pull === 0 ? "rygg" : "ben",
                counts.chest === 0 ? "bröst" : "axlar",
                "mage",
                "armar",
              ];

      for (const category of categoryOrder.slice(0, missingCount)) {
        suggestAdd(pass, {
          category,
          fallback:
            category === "rygg"
              ? "Sittande kabelrodd"
              : category === "ben"
                ? profile.location === "hemma"
                  ? "Utfall"
                  : "Benpress"
                : category === "bröst"
                  ? "Bröstpress"
                  : category === "axlar"
                    ? "Axelpress"
                    : category === "mage"
                      ? "Planka"
                      : "Bicepscurl",
          reason: `Pass ${pass.key} har ${exerciseCountLabel(pass.exercises.length)}. Jag hade fyllt ut det till minst ${passTarget.min} övningar.`,
        });
      }
    }

    if (pass.exercises.length > passTarget.max) {
      const removalCandidates = exercises
        .map((exercise, index) => ({ exercise, index }))
        .sort((a, b) => getRemovalPriority(b.exercise) - getRemovalPriority(a.exercise))
        .slice(0, pass.exercises.length - passTarget.max);

      for (const candidate of removalCandidates) {
        addSuggestion({
          kind: "remove",
          passKey: pass.key,
          name: pass.exercises[candidate.index].name,
          reason: `Pass ${pass.key} är långt för ${profile.minutesPerSession} minuter. Jag hade tagit bort något med lägre prioritet.`,
        });
      }
    }

    if (counts.chest >= 3 && combinedCount(counts, currentPassSuggested(), "back") <= 1) {
      const chestCandidates = exercises
        .map((exercise, index) => ({ exercise, index }))
        .filter((item) => item.exercise.category === "bröst")
        .sort((a, b) => getRemovalPriority(b.exercise) - getRemovalPriority(a.exercise))
        .slice(0, Math.min(2, counts.chest - 2));

      for (const candidate of chestCandidates) {
        addSuggestion({
          kind: "remove",
          passKey: pass.key,
          name: pass.exercises[candidate.index].name,
          reason: `Pass ${pass.key} har mycket bröst jämfört med rygg. Jag hade tagit bort en överlappande bröstövning.`,
        });
      }

      if (combinedCount(counts, currentPassSuggested(), "pull") < 2) {
        suggestAdd(pass, {
          category: "rygg",
          patterns: ["horisontellt_drag"],
          fallback: profile.location === "hemma" ? "Hantelrodd" : "Sittande kabelrodd",
          reason: `Pass ${pass.key} har mycket press men för lite drag. Jag hade lagt till en roddövning.`,
        });
      }
    } else if (
      combinedCount(counts, currentPassSuggested(), "press") >= 3 &&
      combinedCount(counts, currentPassSuggested(), "pull") <= 1
    ) {
      suggestAdd(pass, {
        category: "rygg",
        patterns: ["horisontellt_drag", "vertikalt_drag"],
        fallback: profile.location === "hemma" ? "Hantelrodd" : "Latsdrag",
        reason: `Pass ${pass.key} har mer press än drag. Jag hade lagt till rygg för bättre balans.`,
      });
    }

    if (
      counts.lower >= 2 &&
      combinedCount(counts, currentPassSuggested(), "hamstringsGlutes") === 0
    ) {
      suggestAdd(pass, {
        category: "ben",
        patterns:
          profile.trainingExperience === "nyborjare"
            ? ["hamstring_isolering", "hoftstrackning"]
            : ["hamstring_isolering", "hoftfallning", "hoftstrackning"],
        fallback: profile.location === "hemma" ? "Höftlyft" : "Lårcurl",
        reason: `Pass ${pass.key} har ben, men saknar baksida lår eller säte.`,
      });
    }
  }

  if (
    combinedCount(weekly, suggestedWeekly, "chest") > 0 &&
    combinedCount(weekly, suggestedWeekly, "back") === 0
  ) {
    const targetPass = plan.passes.find((pass) =>
      pass.exercises.some((exercise) => analyzeExercise(exercise).category === "bröst")
    ) ?? plan.passes[0];
    if (targetPass) {
      suggestAdd(targetPass, {
        category: "rygg",
        patterns: ["horisontellt_drag", "vertikalt_drag"],
        fallback: profile.location === "hemma" ? "Hantelrodd" : "Latsdrag",
        reason: "Rygg saknas i veckan, men bröst finns.",
      });
    }
  }

  if (combinedCount(weekly, suggestedWeekly, "lower") === 0) {
    const targetPass = plan.passes.at(-1) ?? plan.passes[0];
    if (targetPass) {
      suggestAdd(targetPass, {
        category: "ben",
        patterns: ["knaboj", "utfall_ett_ben"],
        fallback: profile.location === "hemma" ? "Utfall" : "Benpress",
        reason: "Underkropp saknas i veckan.",
      });
    }
  }

  if (
    combinedCount(weekly, suggestedWeekly, "quads") > 0 &&
    combinedCount(weekly, suggestedWeekly, "hamstringsGlutes") === 0
  ) {
    const targetPass =
      analyzedPasses.find((item) => item.counts.lower > 0)?.pass ??
      plan.passes.at(-1) ??
      plan.passes[0];
    if (targetPass) {
      suggestAdd(targetPass, {
        category: "ben",
        patterns:
          profile.trainingExperience === "nyborjare"
            ? ["hamstring_isolering", "hoftstrackning"]
            : ["hamstring_isolering", "hoftfallning", "hoftstrackning"],
        fallback: profile.location === "hemma" ? "Höftlyft" : "Lårcurl",
        reason: "Baksida lår eller säte saknas i veckan.",
      });
    }
  }

  if (
    combinedCount(weekly, suggestedWeekly, "press") >= 4 &&
    combinedCount(weekly, suggestedWeekly, "pull") <= 1
  ) {
    const targetPass =
      analyzedPasses.find((item) => item.counts.press > item.counts.pull)?.pass ??
      plan.passes[0];
    if (targetPass) {
      suggestAdd(targetPass, {
        category: "rygg",
        patterns: ["horisontellt_drag"],
        fallback: profile.location === "hemma" ? "Hantelrodd" : "Sittande kabelrodd",
        reason: "Veckan har mycket press och lite drag. Jag hade lagt till en rodd.",
      });
    }
  }

  return suggestions;
}
