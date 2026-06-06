"use client";

import { useEffect, useMemo, useState } from "react";
import ToggleSwitch from "./ToggleSwitch";
import { CloseGlyph, SendGlyph } from "./IconGlyphs";
import { sendBetaFeedback } from "../lib/betaFeedback";
import { restoreBetaSnapshotFromServer, syncBetaSnapshotNow } from "../lib/betaSync";
import {
  flushBetaSyncQueue,
  getBetaSyncQueueSummary,
  type BetaSyncQueueSummary,
} from "../lib/betaSyncQueue";

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

type StoredSyncStatus = {
  at?: string;
  ok?: boolean;
  queued?: boolean;
  httpStatus?: number;
  result?: unknown;
};

const SYNC_STATUS_KEYS = [
  { key: "mincoachBetaSyncStatus", label: "Appdata" },
  { key: "mincoachBetaProfileSyncStatus", label: "Profil" },
  { key: "mincoachBetaProgramSyncStatus", label: "Upplägg" },
  { key: "mincoachBetaWorkoutSyncStatus", label: "Pass" },
  { key: "mincoachBetaPersonalRecordSyncStatus", label: "Personbästan" },
  { key: "mincoachBetaCoachMemorySyncStatus", label: "Coachminne" },
  { key: "mincoachBetaFeedbackSyncStatus", label: "Feedback" },
] as const;

function readStoredStatus(key: string): StoredSyncStatus | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredSyncStatus) : null;
  } catch {
    return null;
  }
}
function formatStatusTime(value?: string) {
  if (!value) return "inte sparad än";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "okänd tid";
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusMode(status: StoredSyncStatus | null) {
  if (!status) return "Väntar";
  if (status.queued) return "Väntar";
  if (status.ok) return "Sparad";
  return status.httpStatus ? `Fel ${status.httpStatus}` : "Fel";
}

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
  const [restoreStatusText, setRestoreStatusText] = useState("");
  const [isRestoringSync, setIsRestoringSync] = useState(false);
  const [syncStatuses, setSyncStatuses] = useState<
    Array<{ key: string; label: string; status: StoredSyncStatus | null }>
  >([]);
  const [queueSummary, setQueueSummary] = useState<BetaSyncQueueSummary>({
    pending: 0,
  });
  const [showAdvancedBeta, setShowAdvancedBeta] = useState(false);

  const isLight = theme === "light";
  const cardClassName = isLight
    ? "bg-white/58 shadow-[0_18px_48px_rgba(91,72,48,0.08)] backdrop-blur-xl"
    : "bg-white/[0.045] shadow-[0_16px_44px_rgba(0,0,0,0.14)] backdrop-blur-xl";
  const labelClassName = isLight
    ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7661]"
    : "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35";
  const titleClassName = isLight ? "text-[#2d251c]" : "text-white";
  const bodyClassName = isLight ? "text-[#665b4f]" : "text-white/58";
  const subtleButtonClassName = isLight
    ? "rounded-xl bg-white/48 px-3 py-2 text-xs font-medium text-[#665b4f] shadow-[inset_0_0_0_1px_rgba(122,101,72,0.12)] transition hover:bg-white/72"
    : "rounded-xl bg-white/[0.045] px-3 py-2 text-xs font-medium text-white/58 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)] transition hover:bg-[#4f83ff]/[0.08] hover:text-white/80";
  const accountListClassName = isLight
    ? "divide-y divide-[#7a6548]/10 overflow-hidden rounded-[1.25rem] bg-white/28 shadow-[inset_0_0_0_1px_rgba(122,101,72,0.10)]"
    : "divide-y divide-white/[0.045] overflow-hidden rounded-[1.25rem] bg-white/[0.024] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]";
  const panelClassName = isLight
    ? "bg-[#f7f1e8]/95 text-[#2d251c] shadow-[0_24px_80px_rgba(91,72,48,0.14)]"
    : "bg-[#101824]/92 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]";
  const feedbackFieldClassName = isLight
    ? "bg-white/54 text-[#2d251c] placeholder:text-[#9b8b78] shadow-[inset_0_0_0_1px_rgba(122,101,72,0.12)]"
    : "bg-slate-950/26 text-white placeholder:text-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]";
  const primaryButtonClassName =
    "rounded-xl bg-[#2f6df6] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(47,109,246,0.24)] transition hover:bg-[#4f83ff] disabled:cursor-not-allowed disabled:opacity-45";

  const refreshSyncStatuses = () => {
    setSyncStatuses(
      SYNC_STATUS_KEYS.map((item) => ({
        ...item,
        status: readStoredStatus(item.key),
      }))
    );
    setQueueSummary(getBetaSyncQueueSummary());
  };

  useEffect(() => {
    refreshSyncStatuses();
    void flushBetaSyncQueue().then(refreshSyncStatuses);
  }, []);

  const latestSavedAt = useMemo(() => {
    const dates = syncStatuses
      .map((item) => (item.status?.ok ? item.status.at : null))
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return dates[0]?.toISOString();
  }, [syncStatuses]);

  const savedStatusCount = syncStatuses.filter((item) => item.status?.ok).length;
  const queuedStatusCount = syncStatuses.filter((item) => item.status?.queued).length;
  const failedStatusCount = syncStatuses.filter(
    (item) => item.status && !item.status.ok && !item.status.queued
  ).length;
  const pendingQueueCount = queueSummary.pending || queuedStatusCount;
  const databaseStatusText = pendingQueueCount
    ? "Sparar igen i bakgrunden"
    : failedStatusCount
    ? "Behöver kollas"
    : savedStatusCount
    ? `Sparad ${formatStatusTime(latestSavedAt)}`
    : "Väntar på första sparningen";

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
      await sendBetaFeedback(feedbackText.trim(), {
        type: "settings-feedback",
        theme,
      });

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
    refreshSyncStatuses();

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
      status.queued
        ? "Appen har sparat lokalt och försöker igen."
        : `Synken fick fel: ${"httpStatus" in status ? status.httpStatus : "okänt"}`
    );
  };

  const retryQueuedSync = async () => {
    setIsTestingSync(true);
    setSyncStatusText("");

    const summary = await flushBetaSyncQueue();
    setIsTestingSync(false);
    refreshSyncStatuses();

    setSyncStatusText(
      summary.pending
        ? `${summary.pending} saker väntar fortfarande. Appen försöker igen senare.`
        : "Allt som väntade är skickat."
    );
  };

  const restoreBetaSync = async () => {
    setIsRestoringSync(true);
    setRestoreStatusText("");

    const status = await restoreBetaSnapshotFromServer();
    setIsRestoringSync(false);
    refreshSyncStatuses();

    if (!status || !status.ok) {
      setRestoreStatusText("Kunde inte hämta sparad data just nu.");
      return;
    }

    if ("mode" in status && status.mode === "restored") {
      setRestoreStatusText("Sparad data hämtad. Appen laddas om.");
      window.setTimeout(() => window.location.reload(), 900);
      return;
    }

    if ("mode" in status && status.mode === "disabled") {
      setRestoreStatusText("Databasen är inte kopplad just nu.");
      return;
    }

    setRestoreStatusText("Ingen sparad data hittades för den här enheten.");
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
        className={`relative z-10 max-h-[100svh] min-h-[100svh] w-full max-w-none overflow-y-auto rounded-none border-0 p-4 backdrop-blur-2xl sm:max-h-[calc(100svh-1.5rem)] sm:min-h-0 sm:max-w-lg sm:rounded-[1.75rem] sm:border sm:border-white/5 sm:p-5 ${panelClassName}`}
      >
        <div className="space-y-4">
          <header className="flex items-start justify-between gap-3 pt-1 sm:pt-3">
            <div>
              <p className={labelClassName}>MinCoach</p>
              <h1 className={`mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl ${titleClassName}`}>
                Inställningar
              </h1>
            </div>

            <button
              onClick={onBack}
              className={`${subtleButtonClassName} flex h-9 w-9 items-center justify-center rounded-full px-0 py-0`}
              aria-label="Stäng"
            >
              <CloseGlyph className="h-4 w-4" />
            </button>
          </header>

          <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
            <p className={labelClassName}>Utseende</p>
            <h2 className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}>
              Tema
            </h2>
            <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
              Välj känslan du vill ha i appen.
            </p>

            <div
              className={`mt-4 rounded-2xl p-4 ${
                isLight ? "bg-white/34" : "bg-black/12"
              }`}
            >
              <ToggleSwitch
                checked={isLight}
                onChange={(next) => onThemeChange(next ? "light" : "dark")}
                theme={theme}
                label={isLight ? "Ljust läge" : "Mörkt läge"}
                description={isLight ? "Varmare och mjukare yta." : "Mörkare coachvy med blå accent."}
              />
            </div>
          </section>

          <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
            <p className={labelClassName}>Konto</p>
            <div className={`mt-4 ${accountListClassName}`}>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className={`text-sm font-semibold ${titleClassName}`}>E-post</p>
                  <p className={`mt-0.5 text-xs ${bodyClassName}`}>Läggs till när konton kopplas på.</p>
                </div>
                <button className={subtleButtonClassName} disabled>Snart</button>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className={`text-sm font-semibold ${titleClassName}`}>Lösenord</p>
                  <p className={`mt-0.5 text-xs ${bodyClassName}`}>Kommer med inloggning.</p>
                </div>
                <button className={subtleButtonClassName} disabled>Snart</button>
              </div>
            </div>
          </section>

          <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
            <p className={labelClassName}>Coachprofil</p>
            <h2 className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}>
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
              <h2 className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}>
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
            <h2 className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}>
              Beta-feedback
            </h2>
            <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
              Skriv vad som hände. Feedbacken sparas direkt till beta-listan.
            </p>
            <textarea
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
              rows={4}
              className={`mt-4 w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6 outline-none transition focus:shadow-[inset_0_0_0_1px_rgba(96,165,250,0.55)] ${feedbackFieldClassName}`}
              placeholder={'t.ex. "Coachen missförstod mig efter set 2"'}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={submitFeedback}
                disabled={!feedbackText.trim() || isSendingFeedback}
                className={`${primaryButtonClassName} inline-flex items-center justify-center gap-2`}
              >
                {!isSendingFeedback && !feedbackSent ? <SendGlyph className="h-4 w-4" /> : null}
                <span>{isSendingFeedback ? "Skickar..." : feedbackSent ? "Skickat" : "Skicka"}</span>
              </button>
              <button onClick={copyFeedback} disabled={!feedbackText.trim()} className={subtleButtonClassName}>
                {feedbackCopied ? "Kopierat" : "Kopiera"}
              </button>
            </div>
            <p className={`mt-2 text-xs leading-5 ${bodyClassName}`}>
              Vill du visa en bild kan du skicka screenshot separat till Anton.
            </p>
            {feedbackSent ? (
              <p className="mt-2 rounded-xl bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-100/85">
                Feedbacken är skickad.
              </p>
            ) : null}
            {feedbackError ? (
              <p className="mt-2 rounded-xl bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100/80">
                Kunde inte skicka just nu. Kopiera texten och skicka den till Anton.
              </p>
            ) : null}
          </section>

          <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={labelClassName}>Avancerat</p>
                <h2 className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}>
                  Beta / avancerat
                </h2>
                <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
                  Databaskontroll och återställning för testperioden.
                </p>
              </div>
              <button onClick={() => setShowAdvancedBeta((value) => !value)} className={subtleButtonClassName}>
                {showAdvancedBeta ? "Dölj" : "Visa"}
              </button>
            </div>
          </section>

          {showAdvancedBeta ? (
            <>
              <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
                <p className={labelClassName}>Databas</p>
                <h2 className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}>
                  Sparande
                </h2>
                <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
                  MinCoach sparar beta-data i bakgrunden så coachens minne inte bara bor i mobilen.
                </p>
                <div className={`mt-4 rounded-2xl p-4 ${isLight ? "bg-white/34" : "bg-black/12"}`}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        pendingQueueCount
                          ? "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.35)]"
                          : failedStatusCount
                          ? "bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
                          : savedStatusCount
                          ? "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.35)]"
                          : isLight
                          ? "bg-[#b8a895]"
                          : "bg-white/28"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${titleClassName}`}>{databaseStatusText}</p>
                      <p className={`mt-0.5 text-xs leading-5 ${bodyClassName}`}>
                        {pendingQueueCount
                          ? `${pendingQueueCount} saker är sparade lokalt och skickas så fort databasen svarar.`
                          : failedStatusCount
                          ? "Någon del svarade inte. Testa sparningen igen."
                          : savedStatusCount
                          ? `${savedStatusCount} delar har nått databasen.`
                          : "Första sparningen sker när profilen, passet eller historiken ändras."}
                      </p>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className={`cursor-pointer list-none text-xs font-semibold ${bodyClassName}`}>
                      Visa detaljer
                    </summary>
                    <div className="mt-3 grid gap-2">
                      {pendingQueueCount ? (
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className={bodyClassName}>Väntar</span>
                          <span className="text-sky-300/90">{pendingQueueCount} saker</span>
                        </div>
                      ) : null}
                      {syncStatuses.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
                          <span className={bodyClassName}>{item.label}</span>
                          <span
                            className={
                              item.status?.ok
                                ? "text-emerald-300/90"
                                : item.status?.queued
                                ? "text-sky-300/90"
                                : bodyClassName
                            }
                          >
                            {getStatusMode(item.status)} · {formatStatusTime(item.status?.at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={testBetaSync} disabled={isTestingSync} className={subtleButtonClassName}>
                    {isTestingSync ? "Kontrollerar..." : "Kontrollera sparning"}
                  </button>
                  {pendingQueueCount ? (
                    <button onClick={retryQueuedSync} disabled={isTestingSync} className={subtleButtonClassName}>
                      Försök igen
                    </button>
                  ) : null}
                  <button onClick={restoreBetaSync} disabled={isRestoringSync} className={subtleButtonClassName}>
                    {isRestoringSync ? "Hämtar..." : "Hämta från databasen"}
                  </button>
                </div>
                {syncStatusText ? <p className={`mt-3 text-xs leading-5 ${bodyClassName}`}>{syncStatusText}</p> : null}
                {restoreStatusText ? <p className={`mt-2 text-xs leading-5 ${bodyClassName}`}>{restoreStatusText}</p> : null}
              </section>

              <section className={`rounded-[1.5rem] p-4 sm:p-5 ${cardClassName}`}>
                <p className={labelClassName}>Testdata</p>
                <h2 className={`mt-2 text-xl font-semibold tracking-[-0.03em] ${titleClassName}`}>
                  Återställ appen
                </h2>
                <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>
                  Tar bort all lokal testdata på den här enheten.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm("Vill du återställa all lokal data? Det går inte att ångra.")) {
                      onResetAll();
                    }
                  }}
                  className={`mt-4 ${subtleButtonClassName}`}
                >
                  Återställ
                </button>
              </section>
            </>
          ) : null}

          <p className={`pb-2 text-center text-xs font-medium ${bodyClassName}`}>
            MinCoach {APP_VERSION}
          </p>
        </div>
      </aside>
    </div>
  );
}
