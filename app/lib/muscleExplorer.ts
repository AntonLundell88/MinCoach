import type { Workout } from "../page";
import { getBestSet, getExerciseProgress, getSetLabel } from "./exerciseProgress";
import {
  getExercisesForBodyPartId,
  getMuscleLabelForBodyPartId,
  getReviewedExerciseMuscleMap,
  type MuscleMapToken,
  type MuscleTier,
} from "./muscleMapRules";

const TIER_WEIGHT: Record<MuscleTier, number> = { primary: 3, active: 2, secondary: 1 };

// Samma fönster som Framsteg-ringen i Lobbyn (senaste 28 dagarna) — kartan
// ska visa vad du tränat på sistone, inte all historik som bara skulle bli
// helt tänd för en van användare.
export const MUSCLE_INTENSITY_WINDOW_DAYS = 28;

// Räknar en grov träningsvolym per muskel-token: primär/aktiv/sekundär-vikt
// gånger antal set, inom fönstret. Normaliseras sedan mot användarens eget
// max (inte ett absolut tak) så skalan alltid säger något, oavsett om
// användaren tränar lite eller mycket totalt.
export function getMuscleTrainingIntensity(
  history: Workout[],
  windowDays: number = MUSCLE_INTENSITY_WINDOW_DAYS
): Partial<Record<MuscleMapToken, number>> {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const rawScores: Partial<Record<MuscleMapToken, number>> = {};

  history.forEach((workout) => {
    if (new Date(workout.startedAt).getTime() < cutoff) return;

    workout.exercises?.forEach((exercise) => {
      const setCount = exercise.sets?.length ?? 0;
      if (setCount === 0) return;

      const review = getReviewedExerciseMuscleMap(exercise.name);
      if (!review) return;

      const addTier = (tokens: MuscleMapToken[], tier: MuscleTier) => {
        tokens.forEach((token) => {
          rawScores[token] = (rawScores[token] ?? 0) + TIER_WEIGHT[tier] * setCount;
        });
      };

      addTier(review.map.primary, "primary");
      addTier(review.map.active, "active");
      addTier(review.map.secondary, "secondary");
    });
  });

  const max = Math.max(0, ...Object.values(rawScores));
  if (max === 0) return {};

  const intensity: Partial<Record<MuscleMapToken, number>> = {};
  (Object.keys(rawScores) as MuscleMapToken[]).forEach((token) => {
    intensity[token] = Math.round(((rawScores[token] ?? 0) / max) * 10);
  });

  return intensity;
}

export type MuscleExplorerExercise = {
  name: string;
  tier: MuscleTier;
  sessionsCount: number;
  bestSetLabel: string | null;
};

export type MuscleExplorerResult = {
  muscleLabel: string | null;
  tried: MuscleExplorerExercise[];
  untried: MuscleExplorerExercise[];
};

// Given ett kroppsdel-id från kartan: dina egna tränade övningar för den
// muskeln (med stats, sorterat primär -> sekundär), och bibliotekets
// övriga övningar du inte testat än (samma sortering).
export function getMuscleExplorerList(
  bodyPartId: string,
  history: Workout[]
): MuscleExplorerResult {
  const candidates = getExercisesForBodyPartId(bodyPartId);
  const progressByName = new Map(
    getExerciseProgress(history).map((progress) => [progress.name, progress])
  );

  const tried: MuscleExplorerExercise[] = [];
  const untried: MuscleExplorerExercise[] = [];

  candidates.forEach(({ name, tier }) => {
    const progress = progressByName.get(name);

    if (!progress || progress.sets.length === 0) {
      untried.push({ name, tier, sessionsCount: 0, bestSetLabel: null });
      return;
    }

    const best = getBestSet(progress.sets);
    tried.push({
      name,
      tier,
      sessionsCount: progress.sessions.length,
      bestSetLabel: best ? getSetLabel(best) : null,
    });
  });

  return {
    muscleLabel: getMuscleLabelForBodyPartId(bodyPartId),
    tried,
    untried,
  };
}
