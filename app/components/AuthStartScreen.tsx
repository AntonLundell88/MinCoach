"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "../lib/supabase/client";
import { restoreAccountDataToLocalDevice } from "../lib/accountDataSync";

type Props = {
  onAuthenticated: () => void;
  onContinueWithoutAccount: () => void;
  theme: "dark" | "light";
};

function getLoginErrorMessage(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return `För många försök på kort tid. Vänta en stund och testa igen.`;
  }

  if (lower.includes("signup") || lower.includes("sign up")) {
    return `Den här mejlen kunde inte skapa ett konto just nu. Dubbelkolla mejladressen och testa igen.`;
  }

  if (lower.includes("redirect") || lower.includes("url")) {
    return `Något är fel i inloggningsinställningarna just nu — det är inte du som gjort något fel. Testa igen om en stund.`;
  }

  if (lower.includes("email")) {
    return `Mejlet kunde inte skickas just nu. Dubbelkolla mejladressen och testa igen.`;
  }

  return `Kunde inte skicka koden just nu. Testa igen om en liten stund.`;
}

function getVerifyErrorMessage(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("expired") || lower.includes("invalid")) {
    return `Koden stämmer inte eller har hunnit gå ut. Skicka en ny kod och försök igen.`;
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return `För många försök på kort tid. Vänta en stund och testa igen.`;
  }

  return `Kunde inte verifiera koden just nu. Testa igen om en liten stund.`;
}

export default function AuthStartScreen({
  onAuthenticated,
  onContinueWithoutAccount,
  theme,
}: Props) {
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sentToEmail, setSentToEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [restoringAccount, setRestoringAccount] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  const authConfigured = isSupabaseBrowserConfigured();
  const supabase = useMemo(
    () => (authConfigured ? createSupabaseBrowserClient() : null),
    [authConfigured]
  );

  const restoreThenContinue = useCallback(
    async (activeSupabase: NonNullable<typeof supabase>, user: Session["user"]) => {
      setRestoringAccount(true);
      setRestoreError("");
      const status = await restoreAccountDataToLocalDevice({
        supabase: activeSupabase,
        user,
      });

      if (!status.ok) {
        setRestoringAccount(false);
        setRestoreError(
          "Kunde inte hämta ditt sparade upplägg just nu. Kontrollera anslutningen och försök igen."
        );
        return;
      }

      if (status.mode === "restored" && (status.restoredKeys?.length ?? 0) > 0) {
        // Datan ligger nu i localStorage, men appens state hydrerades redan
        // vid mount — en fräsch inladdning läser in allt korrekt i ett svep.
        window.location.reload();
        return;
      }

      setRestoringAccount(false);
      onAuthenticated();
    },
    [onAuthenticated]
  );

  useEffect(() => {
    if (!supabase) return;
    const activeSupabase = supabase;

    function handleSession(nextSession: Session | null) {
      if (!nextSession) return;

      if (localStorage.getItem("userProfile")) {
        onAuthenticated();
        return;
      }

      void restoreThenContinue(activeSupabase, nextSession.user);
    }

    void activeSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      handleSession(data.session);
    });

    const { data } = activeSupabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      handleSession(nextSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [onAuthenticated, supabase, restoreThenContinue]);

  const retryRestore = () => {
    if (!session || !supabase) return;
    void restoreThenContinue(supabase, session.user);
  };

  const sendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !supabase) return;

    setBusy(true);
    setMessage("");
    setError("");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/confirm?next=/`
        : undefined;
    const { error: loginError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: redirectTo },
    });

    setBusy(false);

    if (loginError) {
      console.error("Supabase login code failed", loginError);
      setError(getLoginErrorMessage(loginError.message));
      return;
    }

    setSentToEmail(cleanEmail);
    setOtpCode("");
    setOtpSent(true);
    setMessage("Kod skickad. Kolla mejlet och skriv in koden nedan.");
  };

  const verifyCode = async () => {
    const code = otpCode.trim();
    if (!code || !supabase || !sentToEmail) return;

    setVerifying(true);
    setError("");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: sentToEmail,
      token: code,
      type: "email",
    });

    setVerifying(false);

    if (verifyError) {
      console.error("Supabase code verification failed", verifyError);
      setError(getVerifyErrorMessage(verifyError.message));
      return;
    }
    // onAuthStateChange plockar upp den nya sessionen och kallar onAuthenticated().
  };

  const resetToEmailStep = () => {
    setOtpSent(false);
    setOtpCode("");
    setMessage("");
    setError("");
  };

  return (
    <main data-theme={theme} className="flex min-h-screen items-center justify-center bg-[#080d14] px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,#080d14_0%,#0d1420_52%,#080d14_100%)]" />

      <section className="w-full max-w-md rounded-[1.65rem] border border-white/[0.07] bg-white/[0.045] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] border border-blue-400/18 bg-blue-500/[0.075]">
            <Image
              src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
              alt="MinCoach"
              width={76}
              height={76}
              className="h-12 w-12 object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100/45">
              MinCoach
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight text-white">
              Logga in först.
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-white/70">
          Då kan coachen spara pass, upplägg, minnen och progression till ditt
          konto. Det är särskilt viktigt i beta.
        </p>

        {!authConfigured ? (
          <div className="mt-4 rounded-2xl border border-amber-300/14 bg-amber-400/[0.06] p-3 text-sm leading-5 text-white/68">
            Inloggning är inte konfigurerad i den här miljön. Du kan fortsätta
            utan konto och testa appen på den här enheten.
          </div>
        ) : session && restoreError ? (
          <div className="mt-4 rounded-2xl border border-red-300/14 bg-red-500/[0.08] p-3 text-sm text-white/76">
            <p>{restoreError}</p>
            <button
              type="button"
              onClick={retryRestore}
              className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Försök igen
            </button>
          </div>
        ) : session ? (
          <div className="mt-4 rounded-2xl border border-blue-300/14 bg-blue-500/[0.08] p-3 text-sm text-white/76">
            {restoringAccount
              ? "Hämtar ditt sparade upplägg..."
              : "Du är inloggad. Appen öppnas strax."}
          </div>
        ) : otpSent ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm leading-6 text-white/70">
              Kod skickad till <span className="text-white/90">{sentToEmail}</span>. Skriv in koden från mejlet.
            </p>
            <label className="block text-[13px] font-medium text-white/76">
              Kod
              <input
                className="mt-1.5 w-full rounded-2xl border border-white/[0.07] bg-slate-950/32 px-3.5 py-3 text-center text-xl tracking-[0.35em] text-white outline-none transition placeholder:tracking-normal placeholder:text-white/28 focus:border-blue-300/35 focus:ring-2 focus:ring-blue-500/20"
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") verifyCode();
                }}
                placeholder="12345678"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
              />
            </label>
            <button
              type="button"
              onClick={verifyCode}
              disabled={!otpCode.trim() || verifying}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {verifying ? "Loggar in..." : "Logga in"}
            </button>
            <div className="flex items-center justify-between gap-3 px-1 text-[12px] text-white/50">
              <button type="button" onClick={sendCode} disabled={busy} className="underline decoration-white/25 underline-offset-2 hover:text-white/76">
                Skicka ny kod
              </button>
              <button type="button" onClick={resetToEmailStep} className="underline decoration-white/25 underline-offset-2 hover:text-white/76">
                Byt mejladress
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <label className="block text-[13px] font-medium text-white/76">
              E-post
              <input
                className="mt-1.5 w-full rounded-2xl border border-white/[0.07] bg-slate-950/32 px-3.5 py-3 text-base text-white outline-none transition placeholder:text-white/28 focus:border-blue-300/35 focus:ring-2 focus:ring-blue-500/20 sm:text-[15px]"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendCode();
                }}
                placeholder="namn@example.com"
                type="email"
              />
            </label>
            <button
              type="button"
              onClick={sendCode}
              disabled={!email.trim() || busy || !authConfigured}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Skickar..." : "Skicka inloggningskod"}
            </button>
          </div>
        )}

        {message ? (
          <p className="mt-3 rounded-xl bg-blue-500/[0.08] px-3 py-2 text-sm text-blue-100/78">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-xl bg-red-500/[0.08] px-3 py-2 text-sm text-red-100/82">
            {error}
          </p>
        ) : null}

        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <button
            type="button"
            onClick={onContinueWithoutAccount}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] py-3 text-sm font-semibold text-white/76 transition hover:bg-white/[0.06] hover:text-white"
          >
            Fortsätt utan inloggning
          </button>
          <p className="mt-2 px-1 text-center text-[12px] leading-5 text-white/42">
            Då får du ingen konto-backup. Data kan försvinna om webbläsaren,
            enheten eller local storage rensas.
          </p>
        </div>
      </section>
    </main>
  );
}
