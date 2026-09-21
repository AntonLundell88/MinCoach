import { exerciseKey } from "./exercises";

/**
 * Vilket viktsteg utrustningen faktiskt verkar ha, läst ur användarens egna
 * loggade set i övningen.
 *
 * Appen räknar viktsteg från en schablon: 5 kg på stång, annars 2,5 kg. På en
 * benspark med bara 45 och 50 föreslog introt därför 47,5 — en vikt som inte
 * finns (betatest 2026-09-16). Ett register över varje maskin är struket: det
 * kräver att användaren svarar på frågor, och flera maskiner för samma övning
 * på samma gym gör svaret otillförlitligt ([[project-coach-memory-direction]]).
 *
 * Det här använder bara det vi redan vet. Ligger ALLA loggade vikter på jämna
 * 5 kg är stacken med all sannolikhet i 5-steg, och då ska motorn inte föreslå
 * något däremellan. Loggas en enda vikt på 2,5 faller vi tillbaka direkt — det
 * är beviset på att steget finns.
 *
 * Med för lite historik gäller schablonen: hellre ett steg för fint än att
 * gissa ett grovt ur två slumpvis valda vikter.
 */
const COARSE_STEP = 5;
const MIN_LOGGED_SETS = 3;
const MIN_DISTINCT_WEIGHTS = 2;

export function inferWeightStepFromHistory(args: {
  workouts: Array<{
    exercises: Array<{ name: string; sets: Array<{ weight: number }> }>;
  }>;
  exerciseName: string;
  defaultStep: number;
}): number {
  const { workouts, exerciseName, defaultStep } = args;

  // Stångövningar ligger redan på 5 kg, och hantlar har sin egen skala.
  if (defaultStep >= COARSE_STEP) return defaultStep;

  const key = exerciseKey(exerciseName);
  const weights: number[] = [];

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (exerciseKey(exercise.name) !== key) continue;

      for (const set of exercise.sets) {
        if (Number.isFinite(set.weight) && set.weight > 0) weights.push(set.weight);
      }
    }
  }

  if (weights.length < MIN_LOGGED_SETS) return defaultStep;

  const distinct = Array.from(new Set(weights));
  if (distinct.length < MIN_DISTINCT_WEIGHTS) return defaultStep;

  const allOnCoarseStep = distinct.every(
    (weight) => Math.abs(weight / COARSE_STEP - Math.round(weight / COARSE_STEP)) < 0.001
  );

  return allOnCoarseStep ? COARSE_STEP : defaultStep;
}

/**
 * Lägger en föreslagen vikt på närmaste vikt som finns, utan att byta riktning:
 * en höjning måste bli tyngre än vikten den utgår från, en sänkning lättare.
 *
 * Bara "nedåt" räckte inte. Motorn ville sänka 50 till 44 på en benspark med
 * 5-steg, och nedåt gav 40 — en femtedel i stället för en åttondel. Närmaste
 * vikt är 45, och den är fortfarande en sänkning.
 */
export function snapSuggestedWeight(args: {
  weight: number;
  from: number;
  step: number;
}) {
  const { weight, from, step } = args;
  if (!Number.isFinite(weight) || !Number.isFinite(from) || weight === from) return weight;

  // Exakt mitt emellan två steg väljs steget närmast vikten vi utgår från.
  // Förslaget har redan avrundats en gång till schablonens 2,5, så mitten är
  // en avrundningsrest, inte ett mål. Math.round tog alltid det tyngre:
  // benspark 55 × 17 med 2 kvar gav +22,5 % = 67,375, avrundat 67,5 och sedan
  // 70 på gymmets 5-steg, fast 67,375 ligger närmast 65 (betatest 2026-09-21).
  const factor = weight / step;
  const isMidway = Math.abs(factor - Math.floor(factor) - 0.5) < 0.0001;
  const snapped = isMidway
    ? snapWeightToStep(weight, step, weight > from ? "down" : "up")
    : snapWeightToStep(weight, step, "nearest");

  if (weight > from && snapped <= from) {
    return snapWeightToStep(from + step, step, "up");
  }

  if (weight < from && snapped >= from) {
    return snapWeightToStep(from - step, step, "down");
  }

  return snapped;
}

/** Närmaste steg i vald riktning. Under ett helt steg lämnas vikten som den är. */
export function snapWeightToStep(
  weight: number,
  step: number,
  mode: "nearest" | "down" | "up"
) {
  if (!Number.isFinite(weight) || weight <= 0 || step <= 0) return weight;

  const factor = weight / step;
  const rounded =
    mode === "down"
      ? Math.floor(factor + 0.0001)
      : mode === "up"
      ? Math.ceil(factor - 0.0001)
      : Math.round(factor);
  const snapped = Number((rounded * step).toFixed(2));

  // Under ett helt steg finns ingen lägre vikt att runda till.
  return snapped > 0 ? snapped : weight;
}
