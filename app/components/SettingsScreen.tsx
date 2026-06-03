"use client";

import { useState } from "react";
import { sendBetaFeedback } from "../lib/betaFeedback";
import { syncBetaSnapshotNow } from "../lib/betaSync";

type AppTheme = "dark" | "light";

const APP_VERSION = "Beta 0.2.0";

type Props = {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenProgram?: () => void;
  onResetAll: () => void;
};

export default function SettingsScreen({
  theme,
  onThemeChange,
  onBack,
  onOpenProfile,
  onOpenProgram,
  onResetAll,
}: Props) {
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCopied, setFeedbackCopied] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState("");
  const [isTestingSync, setIsTestingSync] = useState(false);
  const isLight = theme === "light";
  const cardClassName = isLight
    ? "border border-[#7a6548]/15 bg-white/56 shadow-[0_18px_48px_rgba(91,72,48,0.09)] backdrop-blur-xl"
    : "border border-white/[0.04] bg-white/[0.04] shadow-[0_16px_44px_rgba(0,0,0,0.16)] backdrop-blur-xl";
  const labelClassName = isLight
    ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7661]"
    : "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35";
  const titleClassName = isLight ? "text-[#2d251c]" : "text-white";
  const bodyClassName = isLight ? "text-[#665b4f]" : "text-white/58";
  const subtleButtonClassName = isLight
    ? "rounded-xl border border-[#7a6548]/18 bg-white/45 px-3 py-2 text-xs font-medium text-[#665b4f] transition hover:border-blue-300/45 hover:bg-white/72"
    : "rounded-xl border border-white/[0.045] bg-white/[0.032] px-3 py-2 text-xs font-medium text-white/55 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.06] hover:text-white/78";
  const activeThemeClassName =
    "border-blue-300/70 bg-[#2f6df6] text-white shadow-[0_10px_26px_rgba(47,109,246,0.22)]";
  const inactiveThemeClassName = isLight
    ? "border-[#7a6548]/18 bg-white/45 text-[#665b4f]"
    : "border-white/[0.045] bg-white/[0.032] text-white/58";
  const accountListClassName = isLight
    ? "divide-y divide-[#7a6548]/12 overflow-hidden rounded-[1.25rem] border border-[#7a6548]/14 bg-white/28"
    : "divide-y divide-white/[0.05] overflow-hidden rounded-[1.25rem] border border-white/[0.045] bg-white/[0.024]";
  const panelClassName = isLight
    ? "border-[#7a6548]/12 bg-[#f8f4ec]/94 text-[#2d251c] shadow-[0_24px_80px_rgba(91,72,48,0.14)]"
    : "border-white/[0.04] bg-[#101824]/92 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]";
  const feedbackFieldClassName = isLight
    ? "border-[#7a6548]/18 bg-white/54 text-[#2d251c] placeholder:text-[#9b8b78]"
    : "border-white/[0.045] bg-slate-950/26 text-white placeholder:text-white/30";
  const primaryButtonClassName =
    "rounded-xl bg-[#2f6df6] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(47,109,246,0.24)] transition hover:bg-[#4f83ff] disabled:cursor-not-allowed disabled:opacity-45";

  const buildFeedbackBody = () => {
    const text = feedbackText.trim();
    if (!text) return "";

    return [
      "MinCoach beta-feedback",
      `Tid: ${new Date().toLocaleString("sv-SE")}`,
      typeof window !== "undefined" ? `Sida: ${window.location.href}` : "",
      "",
      text,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const copyFeedback = async () => {
    const body = buildFeedbackBody();
    if (!body) return;

    try {
      await navigator.clipboard.writeText(body);
      setFeedbackError(false);
      setFeedbackCopied(true);
      window.setTimeout(() => setFeedbackCopied(false), 2200);
    } catch {
      setFeedbackError(true);
      setFeedbackCopied(false);
    }
  };

  const submitFeedback = async () => {
    const body = buildFeedbackBody();
    if (!body) return;

    setIsSendingFeedback(true);
    setFeedbackError(false);
    setFeedbackSent(false);

    try {
      const result = await sendBetaFeedback(feedbackText.trim(), {
        type: "settings-feedback",
        theme,
      });

      if (result?.mode === "disabled") {
        setFeedbackError(true);
        return;
      }

      setFeedbackText("");
      setFeedbackSent(true);
      window.setTimeout(() => setFeedbackSent(false), 2600);
    } catch {
      setFeedbackError(true);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const testBetaSync = async () => {
    setIsTestingSync(true);
    setSyncStatusText("");

    const status = await syncBetaSnapshotNow({ reason: "manual-settings-test" });
    setIsTestingSync(false);

    if (!status) {
      setSyncStatusText("Kunde inte testa just nu.");
      return;
    }

    if (status.ok && status.result && typeof status.result === "object") {
      const mode = "mode" in status.result ? String(status.result.mode) : "";
      setSyncStatusText(
        mode === "saved"
          ? "Databasen svarar. Synken fungerar."
          : `Synken svarade: ${mode || "ok"}`
      );
      return;
    }

    setSyncStatusText(
      `Synken fick fel: ${"httpStatus" in status ? status.httpStatus : "okänt"}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-0 py-0 sm:items-center sm:justify-end sm:px-5 sm:py-5">
      <button
        type="button"
        className="settings-backdrop absolute inset-0 bg-black/28 backdrop-blur-[10px]"
        aria-label="Stäng inställningar"
        onClick={onBack}
      />

      <aside
        className={`relative z-10 max-h-[100svh] min-h-[100svh] w-full max-w-none overflow-y-auto rounded-none border-0 p-4 backdrop-blur-2xl sm:max-h-[calc(100svh-1.5rem)] sm:min-h-0 sm:max-w-lg sm:rounded-[1.75rem] sm:border sm:p-5 ${panelClassName}`}
      >
        <div className="space-y-4">
        <header className="flex items-start justify-between gap-3 pt-1 sm:pt-3">
          <div>
            <p className={labelClassName}>MinCoach</p>
            <h1
              className={`mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl ${titleClassName}`}
            >
              Inställningar
            </h1>
          </div>

          <button onClick={onBack} className={subtleButtonClassName}>
            Stäng
          </button>
        </header>

        <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
          <p className={labelClassName}>Utseende</p>
          <h2
            className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}
          >
            Tema
          </h2>
          <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
            Välj känslan du vill ha i appen.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["dark", "light"] as const).map((option) => (
              <button
                key={option}
                onClick={() => onThemeChange(option)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  theme === option ? activeThemeClassName : inactiveThemeClassName
                }`}
              >
                {option === "dark" ? "Mörkt" : "Ljust"}
              </button>
            ))}
          </div>
        </section>

        <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
          <p className={labelClassName}>Konto</p>
          <div className={`mt-4 ${accountListClassName}`}>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className={`text-sm font-semibold ${titleClassName}`}>E-post</p>
                <p className={`mt-0.5 text-xs ${bodyClassName}`}>
                  Läggs till när konton kopplas på.
                </p>
              </div>
              <button className={subtleButtonClassName} disabled>
                Snart
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className={`text-sm font-semibold ${titleClassName}`}>
                  Lösenord
                </p>
                <p className={`mt-0.5 text-xs ${bodyClassName}`}>
                  Kommer med inloggning.
                </p>
              </div>
              <button className={subtleButtonClassName} disabled>
                Snart
              </button>
            </div>
          </div>
        </section>

        <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
          <p className={labelClassName}>Coachprofil</p>
          <h2
            className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}
          >
            Träningsunderlag
          </h2>
          <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
            Mål, träningsdagar, utrustning och begränsningar styr hur coachen bygger passen.
          </p>
          <button onClick={onOpenProfile} className={`mt-4 ${subtleButtonClassName}`}>
            Öppna profil
          </button>
        </section>

        {onOpenProgram ? (
          <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
            <p className={labelClassName}>Upplägg</p>
            <h2
              className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}
            >
              Ändra schema
            </h2>
            <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
              Öppna coachens uppläggssteg om du vill lägga in ett eget schema eller justera övningar.
            </p>
            <button onClick={onOpenProgram} className={`mt-4 ${subtleButtonClassName}`}>
              Öppna upplägg
            </button>
          </section>
        ) : null}

        <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
          <p className={labelClassName}>Beta</p>
          <h2
            className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}
          >
            Beta-feedback
          </h2>
          <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
            Skriv vad som hände. Feedbacken sparas direkt till beta-listan.
          </p>
          <textarea
            value={feedbackText}
            onChange={(event) => setFeedbackText(event.target.value)}
            rows={4}
            className={`mt-4 w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-300/60 ${feedbackFieldClassName}`}
            placeholder={'t.ex. "Coachen missförstod mig efter set 2"'}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={submitFeedback}
              disabled={!feedbackText.trim() || isSendingFeedback}
              className={primaryButtonClassName}
            >
              {isSendingFeedback ? "Skickar..." : feedbackSent ? "Skickat" : "Skicka"}
            </button>
            <button
              onClick={copyFeedback}
              disabled={!feedbackText.trim()}
              className={subtleButtonClassName}
            >
              {feedbackCopied ? "Kopierat" : "Kopiera"}
            </button>
          </div>
          <p className={`mt-2 text-xs leading-5 ${bodyClassName}`}>
            Vill du visa en bild kan du skicka screenshot separat till Anton.
          </p>
          {feedbackSent ? (
            <p className="mt-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-100/85">
              Feedbacken är skickad.
            </p>
          ) : null}
          {feedbackError ? (
            <p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100/80">
              Kunde inte skicka just nu. Kopiera texten och skicka den till Anton.
            </p>
          ) : null}
        </section>

        <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
          <p className={labelClassName}>Databas</p>
          <h2
            className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}
          >
            Synk
          </h2>
          <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
            Tillfällig betakoll så vi ser att data når databasen.
          </p>
          <button
            onClick={testBetaSync}
            disabled={isTestingSync}
            className={`mt-4 ${subtleButtonClassName}`}
          >
            {isTestingSync ? "Testar..." : "Testa databas"}
          </button>
          {syncStatusText ? (
            <p className={`mt-3 text-xs leading-5 ${bodyClassName}`}>
              {syncStatusText}
            </p>
          ) : null}
        </section>

        <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
          <p className={labelClassName}>Testdata</p>
          <h2
            className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}
          >
            Återställ appen
          </h2>
          <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
            Tar bort all lokal testdata på den här enheten.
          </p>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Vill du återställa all lokal data? Det går inte att ångra."
                )
              ) {
                onResetAll();
              }
            }}
            className={`mt-4 ${subtleButtonClassName}`}
          >
            Återställ
          </button>
        </section>

        <p className={`pb-2 text-center text-xs font-medium ${bodyClassName}`}>
          MinCoach {APP_VERSION}
        </p>
      </div>
      </aside>
    </div>
  );
}
