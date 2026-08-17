"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "../lib/supabase/client";
import { saveLocalBetaDataToAccount } from "../lib/accountDataSync";
import type { Workout } from "../page";

// Håller kontots Supabase-kopia av lokal data färsk automatiskt, utan att
// användaren behöver hitta knappen i Inställningar själv. Två triggers:
// 1. Efter varje avslutat pass (history växer) — det vanliga fallet,
//    håller säkerhetskopian nära realtid.
// 2. Vid inloggning, om enheten redan hade lokal data — en enstaka
//    ikapp-körning för konton som aldrig sparat tidigare (t.ex. innan den
//    här funktionen fanns).
// Fire-and-forget mot Supabase — misslyckas det tyst, stör det aldrig
// passflödet. Ingen UI, ingen felyta; SettingsScreen har redan en manuell
// knapp med felmeddelanden för den som vill se status.
export function useAutoAccountBackup(history: Workout[], appTheme: "dark" | "light") {
  const [supabase] = useState(() =>
    isSupabaseBrowserConfigured() ? createSupabaseBrowserClient() : null
  );
  const [session, setSession] = useState<Session | null>(null);
  const previousHistoryLengthRef = useRef<number | null>(null);
  const loginBackupDoneRef = useRef(false);

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

  // Trigger 1: nytt avslutat pass (history-längden ökade sedan senast).
  useEffect(() => {
    if (!supabase || !session?.user) return;

    const previousLength = previousHistoryLengthRef.current;
    previousHistoryLengthRef.current = history.length;

    // Hoppa över första inladdningen (skulle annars spara vid varje mount,
    // inte bara vid ett faktiskt nytt pass) och allt som inte är en ökning.
    if (previousLength === null || history.length <= previousLength) return;

    void saveLocalBetaDataToAccount({ supabase, user: session.user, appTheme });
  }, [supabase, session, history.length, appTheme]);

  // Trigger 2: inloggning där enheten redan har lokal historik (annars
  // hämtar AuthStartScreen ner data istället — den här är bara en
  // ikapp-körning, en gång per sessionsstart).
  useEffect(() => {
    if (!supabase || !session?.user) return;
    if (loginBackupDoneRef.current) return;
    if (history.length === 0) return;

    loginBackupDoneRef.current = true;
    void saveLocalBetaDataToAccount({ supabase, user: session.user, appTheme });
  }, [supabase, session, history.length, appTheme]);
}
