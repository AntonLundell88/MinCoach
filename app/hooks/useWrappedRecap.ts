"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "../lib/supabase/client";
import {
  buildWrappedFallbackCaptions,
  buildWrappedStats,
  fetchExistingWrappedSnapshot,
  getWrappedTargetMonth,
  isAccountOldEnoughForMonth,
  markWrappedSnapshotSeen,
  toWrappedAiContext,
  type WrappedStoredStats,
} from "../lib/wrapped";
import { requestAiWrapped, type CoachWrappedResult } from "../lib/coachAi";
import type { Workout } from "../page";

type WrappedRecap = {
  monthLabel: string;
  stats: WrappedStoredStats;
  captions: CoachWrappedResult;
};

// TEMP DEV-ONLY PREVIEW (för Anton att testa Lobby-kortet + storyn utan
// riktig Supabase-data) — ?wrappedPreview=1, aldrig aktiv i produktion.
// Visar spotlight-varianten (glow) som standard; lägg till &wrappedQuiet=1
// för att se den tysta varianten under Framsteg istället. Tas bort igen
// efter testet, hör inte till v1-specen.
function readWrappedPreviewOverride() {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("wrappedPreview") === "1";
}

function readWrappedPreviewQuietOverride() {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("wrappedQuiet") === "1";
}

const WRAPPED_PREVIEW_RECAP: WrappedRecap = {
  monthLabel: "juli 2026",
  stats: {
    passCount: 14,
    totalMinutes: 780,
    totalVolumeKg: 48250,
    muscleBreakdown: [
      { category: "Rygg", count: 22, percent: 38 },
      { category: "Bröst", count: 14, percent: 24 },
      { category: "Ben", count: 12, percent: 20 },
    ],
    biggestPb: {
      exerciseName: "Marklyft",
      weight: 120,
      reps: 5,
      createdAt: new Date().toISOString(),
      improvementPercent: 9,
      previous: {
        weight: 110,
        reps: 5,
        createdAt: new Date(Date.now() - 62 * 86400000).toISOString(),
      },
    },
    pbCount: 3,
    pbExerciseNames: ["Marklyft", "Bänkpress", "Latsdrag"],
    consistency: {
      plannedPassCount: 13,
      longestWeekStreak: 4,
      weeksInMonth: 5,
      topWeekday: { name: "tisdag", count: 5 },
    },
    heaviestDay: {
      date: new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10),
      volumeKg: 6420,
    },
  },
  captions: {
    activityCaption: "14 pass loggade i juli — bra tempo genom hela månaden",
    pbCaption: "Marklyft, 120 kg — nytt personbästa den här månaden",
    reflectionCaption:
      "Fjorton pass, tydligt ryggfokus och ett nytt personbästa på marklyft — juli var inte en lugn månad",
  },
};

// Spotlight-fönstret (glow, framträdande plats i Lobbyn) gäller bara de
// första två dagarna av en ny månad — som Spotify Wrapped. Efter det finns
// samma sammanfattning kvar, bara tystare och längre ner (se LobbyScreen).
const SPOTLIGHT_WINDOW_DAYS = 2;

function isWithinSpotlightWindow(now: Date) {
  return now.getDate() <= SPOTLIGHT_WINDOW_DAYS;
}

export function useWrappedRecap(
  history: Workout[],
  userName?: string,
  /** Från profilen — används för "12 av 13 planerade". */
  daysPerWeek?: number | null
) {
  const [previewOverride] = useState(readWrappedPreviewOverride);
  const [previewQuietOverride] = useState(readWrappedPreviewQuietOverride);
  const [supabase] = useState(() =>
    isSupabaseBrowserConfigured() ? createSupabaseBrowserClient() : null
  );
  const [session, setSession] = useState<Session | null>(null);
  const [recap, setRecap] = useState<WrappedRecap | null>(() =>
    previewOverride ? WRAPPED_PREVIEW_RECAP : null
  );
  const [isOpen, setIsOpen] = useState(false);
  const checkedMonthKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    // TEMP DEV-ONLY PREVIEW: hoppar över hela den riktiga behörighets-/
    // Supabase-kedjan när ?wrappedPreview=1 är aktivt.
    if (previewOverride) return;
    // Gäster ("Fortsätt utan inloggning") har ingen session och ser
    // aldrig Wrapped — inget user_id att nyckla en rad på.
    if (!supabase || !session?.user) return;

    const { monthKey, monthLabel } = getWrappedTargetMonth(new Date());

    // Redan kollat den här månaden i den här sessionen — förhindrar att ett
    // history-referensbyte (samma data, ny array) triggar om hela flödet
    // och skickar ett andra parallellt AI-anrop.
    if (checkedMonthKeyRef.current === monthKey) return;

    const stats = buildWrappedStats(history, monthKey, daysPerWeek);
    if (!stats) return;

    const accountCreatedAt = session.user.created_at
      ? new Date(session.user.created_at)
      : null;
    if (!accountCreatedAt || !isAccountOldEnoughForMonth(accountCreatedAt, monthKey)) {
      return;
    }

    checkedMonthKeyRef.current = monthKey;
    let cancelled = false;

    async function resolveRecap() {
      const { data: existing } = await fetchExistingWrappedSnapshot(
        supabase!,
        session!.user.id,
        monthKey
      );

      if (existing) {
        if (cancelled) return;

        setRecap({
          monthLabel,
          stats: (existing.stats as WrappedStoredStats) ?? stats!,
          captions: {
            activityCaption: existing.activity_caption,
            pbCaption: existing.pb_caption,
            reflectionCaption: existing.reflection_caption,
          },
        });
        return;
      }

      const fallbackCaptions = buildWrappedFallbackCaptions(stats!, monthLabel);
      const result = await requestAiWrapped({
        month: monthKey,
        context: toWrappedAiContext(stats!, monthLabel, userName),
        stats,
        fallbackCaptions,
      });

      if (cancelled) return;

      setRecap({ monthLabel, stats: stats!, captions: result.captions });
    }

    void resolveRecap();

    return () => {
      cancelled = true;
    };
  }, [previewOverride, supabase, session, history, userName]);

  const onOpen = () => {
    setIsOpen(true);

    if (!previewOverride && supabase && session?.user) {
      const { monthKey } = getWrappedTargetMonth(new Date());
      // Rent bokförande — styr inte längre synlighet (se isSpotlight),
      // bara en markering av att den faktiskt öppnats minst en gång.
      // Fire-and-forget — stänger användaren appen mitt i storyn ska
      // det inte blockera något.
      void markWrappedSnapshotSeen(supabase, session.user.id, monthKey);
    }
  };

  const onClose = () => setIsOpen(false);

  const isSpotlight = previewOverride
    ? !previewQuietOverride
    : isWithinSpotlightWindow(new Date());

  return {
    wrapped: recap ? { monthLabel: recap.monthLabel, onOpen, isSpotlight } : null,
    story: recap,
    isOpen,
    onClose,
  };
}
