import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workout } from "../page";
import {
  getMonthKey,
  getMonthPersonalBests,
  getMonthStats,
  getMuscleGroupBreakdown,
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

export type WrappedStoredStats = {
  passCount: number;
  totalMinutes: number;
  totalVolumeKg: number;
  muscleBreakdown: { category: string; count: number; percent: number }[];
  biggestPb: MonthPersonalBest | null;
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
export function buildWrappedStats(history: Workout[], monthKey: string): WrappedStoredStats | null {
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
  const biggestPb = getMonthPersonalBests(history, monthKey)[0] ?? null;

  return {
    passCount: monthStats.passCount,
    totalMinutes: monthStats.totalMinutes,
    totalVolumeKg: monthStats.totalVolume,
    muscleBreakdown,
    biggestPb,
  };
}

export function toWrappedAiContext(
  stats: WrappedStoredStats,
  monthLabel: string,
  userName?: string
): CoachWrappedContext {
  const topMuscle = stats.muscleBreakdown[0] ?? null;

  return {
    kind: "wrapped_recap",
    userName,
    monthLabel,
    passCount: stats.passCount,
    totalMinutes: stats.totalMinutes,
    totalVolumeKg: stats.totalVolumeKg,
    topMuscleCategory: topMuscle?.category ?? null,
    topMuscleCategoryPercent: topMuscle?.percent ?? null,
    biggestPb: stats.biggestPb
      ? {
          exerciseName: stats.biggestPb.exerciseName,
          weight: stats.biggestPb.weight,
          reps: stats.biggestPb.reps,
          durationSeconds: stats.biggestPb.durationSeconds,
          metricType: stats.biggestPb.metricType,
          improvementPercent: stats.biggestPb.improvementPercent,
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
    : "Ingen ny toppnotering den här månaden — men du höll igång, och det är precis så framsteg byggs";

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
