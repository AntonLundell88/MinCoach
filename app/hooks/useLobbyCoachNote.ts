"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestAiLobbyNote, type CoachLobbyContext } from "../lib/coachAi";
import type { LobbyCoachNote } from "../lib/lobbyContext";

/**
 * Lobbycoachen skriver när appen öppnas, inte när förra passet tar slut. En
 * text från passets slut visste aldrig vad klockan var eller hur många dagar
 * som gått sedan dess.
 *
 * En ny text skrivs en gång per dag, och igen när ett nytt pass har loggats.
 * Däremellan visas den sparade. De tre senaste följer med till coachen, så
 * att den vet vad den redan har sagt.
 */
const STORAGE_KEY = "lobbyCoachNotes";
const KEPT_NOTES = 3;

function loadNotes(): LobbyCoachNote[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as LobbyCoachNote[]) : [];
  } catch {
    return [];
  }
}

function isToday(iso: string) {
  const date = new Date(iso);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function useLobbyCoachNote(args: {
  /** Lokal data inläst och en profil finns — annars ser loggen tom ut. */
  ready: boolean;
  latestWorkoutId: string | null;
  buildContext: (previousNotes: LobbyCoachNote[]) => CoachLobbyContext | null;
}) {
  const { ready, latestWorkoutId, buildContext } = args;
  const [notes, setNotes] = useState<LobbyCoachNote[]>(loadNotes);
  // Läget (dag och senaste pass) där ett försök misslyckades. Då visas
  // reservtexten, och lobbyn försöker inte igen förrän läget ändras.
  const [failedAttempt, setFailedAttempt] = useState<string | null>(null);
  const buildContextRef = useRef(buildContext);
  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    buildContextRef.current = buildContext;
  });

  const current = notes[0];
  const isFresh = Boolean(
    current && isToday(current.createdAt) && current.lastWorkoutId === latestWorkoutId
  );
  const attempt = `${new Date().toDateString()}|${latestWorkoutId ?? ""}`;
  // Sant redan innan anropet gått iväg, så att reservtexten inte hinner
  // blinka förbi medan coachen skriver.
  const isWriting = ready && !isFresh && failedAttempt !== attempt;

  const refresh = useCallback(() => {
    if (!ready || isFresh || failedAttempt === attempt) return;
    if (inFlightRef.current === attempt) return;

    const context = buildContextRef.current(notes);
    if (!context) return;

    inFlightRef.current = attempt;

    void requestAiLobbyNote({ context })
      .then((result) => {
        if (result.mode !== "ai" || !result.text) {
          setFailedAttempt(attempt);
          return;
        }

        const next: LobbyCoachNote[] = [
          {
            text: result.text,
            createdAt: new Date().toISOString(),
            lastWorkoutId: latestWorkoutId,
          },
          ...notes,
        ].slice(0, KEPT_NOTES);

        setNotes(next);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          // Den gamla lobbytexten skrevs av passgranskningen och läses inte längre.
          localStorage.removeItem("lobbyCoachText");
        } catch {
          // Fullt eller blockerat lagringsutrymme: texten visas ändå den här gången.
        }
      })
      .finally(() => {
        inFlightRef.current = null;
      });
  }, [ready, isFresh, failedAttempt, attempt, latestWorkoutId, notes]);

  return { text: isFresh ? current?.text : undefined, loading: isWriting, refresh };
}
