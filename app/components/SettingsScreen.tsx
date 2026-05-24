"use client";

type AppTheme = "dark" | "light";

type Props = {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenProgram?: () => void;
};

export default function SettingsScreen({
  theme,
  onThemeChange,
  onBack,
  onOpenProfile,
  onOpenProgram,
}: Props) {
  const isLight = theme === "light";
  const cardClassName = isLight
    ? "border border-[#d8cfc0]/80 bg-white/68 shadow-[0_16px_46px_rgba(91,72,48,0.10)] backdrop-blur-xl"
    : "border border-white/[0.09] bg-white/[0.052] shadow-[0_14px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl";
  const labelClassName = isLight
    ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#667085]"
    : "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35";
  const titleClassName = isLight ? "text-[#172033]" : "text-white";
  const bodyClassName = isLight ? "text-[#4d5a6b]" : "text-white/58";
  const subtleButtonClassName = isLight
    ? "rounded-xl border border-[#d8cfc0]/80 bg-white/58 px-3 py-2 text-xs font-medium text-[#5b6678] transition hover:border-blue-300/45 hover:bg-white/82"
    : "rounded-xl border border-white/[0.09] bg-white/[0.042] px-3 py-2 text-xs font-medium text-white/55 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.06] hover:text-white/78";
  const activeThemeClassName =
    "border-blue-300/70 bg-[#2f6df6] text-white shadow-[0_10px_26px_rgba(47,109,246,0.22)]";
  const inactiveThemeClassName = isLight
    ? "border-[#d8cfc0]/80 bg-white/58 text-[#5b6678]"
    : "border-white/[0.09] bg-white/[0.042] text-white/58";
  const accountListClassName = isLight
    ? "divide-y divide-black/10 overflow-hidden rounded-[1.25rem] border border-black/10 bg-white/25"
    : "divide-y divide-white/10 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.03]";
  const panelClassName = isLight
    ? "border-[#d8cfc0]/85 bg-[#f8f4ec]/92 text-[#172033] shadow-[0_24px_80px_rgba(91,72,48,0.18)]"
    : "border-white/[0.09] bg-[#101824]/92 text-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-3 py-3 sm:items-center sm:justify-end sm:px-5 sm:py-5">
      <button
        type="button"
        className="settings-backdrop absolute inset-0 bg-black/28 backdrop-blur-[10px]"
        aria-label="Stäng inställningar"
        onClick={onBack}
      />

      <aside
        className={`relative z-10 max-h-[calc(100svh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border p-4 backdrop-blur-2xl sm:p-5 ${panelClassName}`}
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
      </div>
      </aside>
    </div>
  );
}
