import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workout } from "../page";
import {
  getMonthKey,
  getMonthPersonalBests,
  getMonthStats,
  getMuscleGroupBreakdown,
  formatMinutes,
  type MonthPersonalBest,
} from "../components/StatisticsScreen";
import type { CoachWrappedContext, CoachWrappedResult } from "./coachAi";

// "fler än 2 pass" (Anton) — lågt nog att fånga nya/casual-användare, högt
// nog att volym-/muskelkortet inte blir 1-2 brusiga datapunkter.
export const MIN_WRAPPED_PASSES = 3;

// Kontot måste ha funnits minst 15 dagar in i målmånaden, annars visas
// ingen Wrapped för den månaden (skapar man konto den 20:e juli får man
// ingen juli-Wrapped — väl en augusti, om man loggar tillräckligt då).
export const MIN_ACCOUNT_AGE_DAYS_IN_MONTH = 15;

/**
 * Närvaron som mönster, inte som antal.
 *
 * "12 pass" är schemat, inte en prestation — det stod i planen innan månaden
 * började. Det som är förtjänat är att du faktiskt kom: hur många av de
 * planerade som blev av, och om du höll ihop veckorna utan lucka.
 */
export type WrappedConsistency = {
  /** Null när vi inte vet användarens daysPerWeek. */
  plannedPassCount: number | null;
  /** Längsta svit av sammanhängande veckor med minst ett pass. */
  longestWeekStreak: number;
  weeksInMonth: number;
  /** Bara när en veckodag sticker ut tydligt — annars null. */
  topWeekday: { name: string; count: number } | null;
};

/** Månadens tyngsta dag. Ett datum är en minnesbild, ett totaltal är abstrakt. */
export type WrappedHeaviestDay = {
  date: string;
  volumeKg: number;
};

export type WrappedStoredStats = {
  passCount: number;
  totalMinutes: number;
  totalVolumeKg: number;
  muscleBreakdown: { category: string; count: number; percent: number }[];
  biggestPb: MonthPersonalBest | null;
  // Totalt antal PB den här månaden — biggestPb är bara den största av dem.
  pbCount: number;
  /**
   * Vilka övningar som fick nya rekord. "Fem övningar fick nya rekord" är det
   * man faktiskt berättar för någon — det största enskilda PB:t är bara en av
   * dem. Max 6, sorterade som getMonthPersonalBests returnerar dem.
   */
  pbExerciseNames: string[];
  consistency: WrappedConsistency;
  heaviestDay: WrappedHeaviestDay | null;
};

// Alltid "kalendermånaden precis innan now" — per konstruktion alltid
// "avslutad", så inget separat har-månaden-tagit-slut-test behövs.
export function getWrappedTargetMonth(now: Date): { monthKey: string; monthLabel: string } {
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    monthKey: getMonthKey(targetDate),
    monthLabel: new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric" }).format(targetDate),
  };
}

// accountCreatedAt <= (målmånadens sista dag) - 15 dagar. accountCreatedAt
// kommer från Supabase-sessionens user.created_at (ISO-sträng -> Date) —
// redan tillgängligt där auth-gaten ändå läser sessionen.
export function isAccountOldEnoughForMonth(accountCreatedAt: Date, monthKey: string): boolean {
  const [year, month] = monthKey.split("-").map(Number);
  const cutoff = new Date(year, month, 0); // sista dagen i målmånaden
  cutoff.setDate(cutoff.getDate() - MIN_ACCOUNT_AGE_DAYS_IN_MONTH);
  return accountCreatedAt.getTime() <= cutoff.getTime();
}

// null om passCount < MIN_WRAPPED_PASSES. Kontoålder är en separat gate
// (isAccountOldEnoughForMonth) eftersom den här funktionen bara ser
// history, inte Supabase-sessionen — hooken kombinerar båda.
const WEEKDAY_NAMES = [
  "söndag",
  "måndag",
  "tisdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lördag",
];

/**
 * Lokalt datum som "YYYY-MM-DD". Inte toISOString() — den konverterar till
 * UTC, och i svensk sommartid blir lokal midnatt föregående dygn. Det gjorde
 * att kalenderns veckonycklar hamnade en dag fel medan passens hamnade rätt,
 * så de aldrig överlappade och sviten alltid blev noll.
 */
function toLocalDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

/** ISO-veckonummer räcker inte över årsskiften — vi vill bara gruppera pass
 *  inom en månad, så veckans måndag som nyckel är enklare och lika säkert. */
function getWeekStartKey(date: Date) {
  const monday = new Date(date);
  const offset = (date.getDay() + 6) % 7;
  monday.setDate(date.getDate() - offset);

  return toLocalDateKey(monday);
}

export function buildWrappedConsistency(
  monthHistory: Workout[],
  monthKey: string,
  daysPerWeek: number | null
): WrappedConsistency {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Alla veckor som månaden rör vid, i ordning. Vi går på måndagsnycklar så
  // en vecka som spänner över månadsskiftet räknas en gång.
  const weekKeys: string[] = [];
  for (
    let day = new Date(firstDay);
    day <= lastDay;
    day.setDate(day.getDate() + 1)
  ) {
    const key = getWeekStartKey(day);
    if (!weekKeys.includes(key)) weekKeys.push(key);
  }

  const trainedWeeks = new Set(
    monthHistory.map((workout) => getWeekStartKey(new Date(workout.startedAt)))
  );

  let longestWeekStreak = 0;
  let running = 0;
  weekKeys.forEach((key) => {
    if (trainedWeeks.has(key)) {
      running += 1;
      longestWeekStreak = Math.max(longestWeekStreak, running);
    } else {
      running = 0;
    }
  });

  const weekdayCounts = new Map<number, number>();
  monthHistory.forEach((workout) => {
    const day = new Date(workout.startedAt).getDay();
    weekdayCounts.set(day, (weekdayCounts.get(day) ?? 0) + 1);
  });

  const ranked = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1]);
  const [topDay, topCount] = ranked[0] ?? [];
  const runnerUpCount = ranked[1]?.[1] ?? 0;
  // Bara när dagen faktiskt sticker ut. Tre pass i veckan ger tre dagar med
  // samma antal, och då är "din tisdag" en slumpmässig av dem — inte ett
  // mönster användaren känner igen.
  const topWeekday =
    typeof topDay === "number" && topCount && topCount > runnerUpCount
      ? { name: WEEKDAY_NAMES[topDay], count: topCount }
      : null;

  return {
    plannedPassCount:
      daysPerWeek && daysPerWeek > 0
        ? Math.round((daysPerWeek * lastDay.getDate()) / 7)
        : null,
    longestWeekStreak,
    weeksInMonth: weekKeys.length,
    topWeekday,
  };
}

export function buildWrappedHeaviestDay(
  monthHistory: Workout[]
): WrappedHeaviestDay | null {
  const byDate = new Map<string, number>();

  monthHistory.forEach((workout) => {
    // Lokalt datum, samma skäl som i getWeekStartKey: ett pass klockan 09 på
    // morgonen ska inte hamna på gårdagen bara för att UTC ligger efter.
    const date = toLocalDateKey(new Date(workout.startedAt));
    const volume = workout.exercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.sets.reduce((setSum, set) => {
          if (set.metricType === "time" || typeof set.durationSeconds === "number") {
            return setSum;
          }
          return setSum + set.weight * set.reps;
        }, 0),
      0
    );
    byDate.set(date, (byDate.get(date) ?? 0) + volume);
  });

  const ranked = [...byDate.entries()].sort((a, b) => b[1] - a[1]);
  const [date, volumeKg] = ranked[0] ?? [];

  return date && volumeKg > 0 ? { date, volumeKg } : null;
}

export function buildWrappedStats(
  history: Workout[],
  monthKey: string,
  /** Från profilen. Utan den kan vi inte säga "12 av 13 planerade". */
  daysPerWeek?: number | null
): WrappedStoredStats | null {
  const monthStats = getMonthStats(history, monthKey);
  if (monthStats.passCount < MIN_WRAPPED_PASSES) return null;

  // Muskelfördelningen scopas medvetet till bara målmånaden här, till
  // skillnad från StatisticsScreen som alltid använder hela historiken
  // (för att inte visa missvisande "obalans" på ett kort träningsfönster).
  // För Wrapped är "vad tränade du i just den här månaden" hela poängen.
  const monthHistory = history.filter(
    (workout) => getMonthKey(new Date(workout.startedAt)) === monthKey
  );
  const muscleBreakdown = getMuscleGroupBreakdown(monthHistory);
  const monthPersonalBests = getMonthPersonalBests(history, monthKey);

  return {
    passCount: monthStats.passCount,
    totalMinutes: monthStats.totalMinutes,
    totalVolumeKg: monthStats.totalVolume,
    muscleBreakdown,
    biggestPb: monthPersonalBests[0] ?? null,
    pbCount: monthPersonalBests.length,
    pbExerciseNames: monthPersonalBests.slice(0, 6).map((pb) => pb.exerciseName),
    consistency: buildWrappedConsistency(monthHistory, monthKey, daysPerWeek ?? null),
    heaviestDay: buildWrappedHeaviestDay(monthHistory),
  };
}

/**
 * En källa till tröskeln, delad av kortet och AI-kontexten.
 *
 * "12 av 13" är ett kvitto. "9 av 13" är en anklagelse, och en Wrapped ska
 * man se fram emot. Kortet döljer jämförelsen under tröskeln — och modellen
 * får inte ens se siffran, annars säger den den ändå ("lite ojämnt mot
 * planen"). Två ställen som läser samma funktion kan inte glida isär.
 */
export function isPlannedComparisonFlattering(stats: WrappedStoredStats) {
  const planned = stats.consistency.plannedPassCount;
  if (!planned || planned <= 0) return false;

  return stats.passCount / planned >= 0.9;
}

/** "22 juli" — färdigformaterat, modellen ska inte tolka ISO-datum. */
function formatDayLabel(isoDate: string) {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long" }).format(parsed);
}

/** "maj" — utan år, banan gäller nästan alltid samma säsong. */
function formatMonthLabel(isoDate: string) {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("sv-SE", { month: "long" }).format(parsed);
}

export function toWrappedAiContext(
  stats: WrappedStoredStats,
  monthLabel: string,
  userName?: string
): CoachWrappedContext {
  return {
    kind: "wrapped_recap",
    userName,
    monthLabel,
    passCount: stats.passCount,
    // Bara när den smickrar. Se kommentaren vid fältet i coachAi.ts —
    // tröskeln är densamma som kortets getPlannedComparison använder.
    plannedPassCount: isPlannedComparisonFlattering(stats)
      ? stats.consistency.plannedPassCount
      : null,
    weeksInARow: stats.consistency.longestWeekStreak,
    totalTimeLabel: formatMinutes(stats.totalMinutes),
    totalVolumeLabel: `${(Math.round((stats.totalVolumeKg / 1000) * 10) / 10).toLocaleString("sv-SE")} ton`,
    heaviestDayLabel: stats.heaviestDay
      ? formatDayLabel(stats.heaviestDay.date)
      : null,
    pbCount: stats.pbCount,
    pbExerciseNames: stats.pbExerciseNames,
    biggestPb: stats.biggestPb
      ? {
          exerciseName: stats.biggestPb.exerciseName,
          weight: stats.biggestPb.weight,
          reps: stats.biggestPb.reps,
          durationSeconds: stats.biggestPb.durationSeconds,
          metricType: stats.biggestPb.metricType,
          improvementPercent: stats.biggestPb.improvementPercent,
          previousWeight: stats.biggestPb.previous?.weight ?? null,
          previousMonthLabel: stats.biggestPb.previous
            ? formatMonthLabel(stats.biggestPb.previous.createdAt)
            : null,
        }
      : null,
  };
}

// Deterministiska svenska mallar med riktiga siffror — det som visas om
// AI-anropet misslyckas, OCH det som skickas som fallbackCaptions i
// requesten. Ger distinkt, fortfarande varm text när biggestPb är null.
export function buildWrappedFallbackCaptions(
  stats: WrappedStoredStats,
  monthLabel: string
): CoachWrappedResult {
  const activityCaption = `${stats.passCount} pass loggade i ${monthLabel} — bra jobbat`;

  const pbCaption = stats.biggestPb
    ? `${stats.biggestPb.exerciseName}: nytt personbästa den här månaden`
    : "Inget nytt rekord den här månaden — men du höll igång, och det är precis så framsteg byggs";

  const reflectionCaption = "En månad till i loggen — vi kör vidare";

  return { activityCaption, pbCaption, reflectionCaption };
}

export async function fetchExistingWrappedSnapshot(
  supabase: SupabaseClient,
  userId: string,
  monthKey: string
) {
  return supabase
    .from("wrapped_snapshots")
    .select("stats, activity_caption, pb_caption, reflection_caption, caption_mode, seen_at")
    .eq("user_id", userId)
    .eq("month", monthKey)
    .maybeSingle();
}

export async function markWrappedSnapshotSeen(
  supabase: SupabaseClient,
  userId: string,
  monthKey: string
) {
  return supabase
    .from("wrapped_snapshots")
    .update({ seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("month", monthKey);
}
