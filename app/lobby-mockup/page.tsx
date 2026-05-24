export default function MinCoachLobbyMockup() {
  return (
    <main className="min-h-screen bg-[#080d14] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.06),transparent_28%),linear-gradient(180deg,#080d14_0%,#0d1420_45%,#080d14_100%)]" />

      <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 pt-2 sm:pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] shadow-[0_0_28px_rgba(59,130,246,0.11)] backdrop-blur-xl">
              <img
                src="/logo-dark.png"
                alt="MinCoach"
                className="h-28 w-28 object-contain"
              />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/45">
                MinCoach
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Lobbyn
              </h1>
            </div>
          </div>

          <button className="hidden rounded-2xl border border-white/[0.09] bg-white/[0.048] px-4 py-2 text-sm font-medium text-white/72 backdrop-blur-xl transition hover:bg-white/[0.07] sm:block">
            Inställningar
          </button>
        </header>

        {/* Coach + milestones */}
        <section className="grid gap-4 lg:grid-cols-[1.55fr_0.9fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-blue-400/18 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),rgba(255,255,255,0.045)_42%,rgba(255,255,255,0.025)_100%)] p-5 shadow-[0_0_60px_rgba(59,130,246,0.08)] backdrop-blur-2xl sm:p-7">
            <div className="pointer-events-none absolute right-[-80px] top-[-90px] h-48 w-48 rounded-full bg-blue-500/[0.07] blur-3xl" />

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300/20 bg-blue-500/[0.07] shadow-[0_0_22px_rgba(59,130,246,0.08)]">
                <img
                  src="/logo-dark.png"
                  alt=""
                  className="h-14 w-14 object-contain opacity-90"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Coachen
                </p>
                <p className="text-sm text-white/58">Väntar här när du vill titta in.</p>
              </div>
            </div>

            <div className="max-w-2xl space-y-4">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                Hej Lisa.
              </h2>

              <p className="text-base leading-7 text-white/76 sm:text-[17px]">
                Du har haft stabil progression i överkroppen senaste passen.
              </p>

              <p className="text-base leading-7 text-white/68 sm:text-[17px]">
                Kroppen verkar återhämta sig bra trots flera pass i rad. Fortsätt lyssna på energinivån mellan passen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="rounded-[1.6rem] border border-white/[0.09] bg-white/[0.052] p-4 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.18)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Senaste PR
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                120 × 12
              </p>
              <p className="mt-1 text-sm text-white/55">Vadpress</p>
            </div>

            <div className="rounded-[1.6rem] border border-blue-400/15 bg-blue-500/[0.075] p-4 backdrop-blur-2xl shadow-[0_0_40px_rgba(59,130,246,0.10)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Veckan
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                4 / 5
              </p>
              <p className="mt-1 text-sm text-white/55">pass klara</p>
            </div>
          </div>
        </section>

        {/* Future visual graph placeholder */}
        <section className="rounded-[2rem] border border-white/[0.09] bg-white/[0.042] p-5 backdrop-blur-2xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Progression sedan start
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                Trenden går uppåt
              </h2>
            </div>

            <button className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/[0.10]">
              Statistik
            </button>
          </div>

          <div className="relative h-32 overflow-hidden rounded-3xl border border-white/8 bg-slate-950/20 sm:h-40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.08),transparent_32%)]" />
            <svg viewBox="0 0 600 160" className="absolute inset-0 h-full w-full">
              <path
                d="M20 125 C100 118, 130 95, 190 98 C260 102, 270 65, 340 70 C420 76, 440 38, 520 44 C555 46, 575 34, 590 30"
                fill="none"
                stroke="rgba(96,165,250,0.92)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M20 125 C100 118, 130 95, 190 98 C260 102, 270 65, 340 70 C420 76, 440 38, 520 44 C555 46, 575 34, 590 30"
                fill="none"
                stroke="rgba(96,165,250,0.22)"
                strokeWidth="16"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </section>

        {/* Highlights */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-white/[0.09] bg-white/[0.042] p-5 backdrop-blur-2xl sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Progression
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              +10 kg
            </p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Ökning i stångrodd senaste månaden.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/[0.09] bg-white/[0.042] p-5 backdrop-blur-2xl sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Senaste pass
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              Underkropp
            </p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              48 min · 2 PR · stabil energi
            </p>
          </div>
        </section>

        {/* Navigation */}
        <section className="space-y-3">
          <p className="pl-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/32">
            Översikt
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Statistik", "Progression och volym"],
              ["Historik", "Tidigare pass"],
              ["Övningar", "Utveckling per övning"],
              ["Personbästan", "Dina starkaste set"],
            ].map(([title, subtitle]) => (
              <button
                key={title}
                className="rounded-[1.4rem] border border-white/[0.09] bg-white/[0.042] p-4 text-left backdrop-blur-2xl transition hover:border-blue-400/20 hover:bg-blue-500/[0.06]"
              >
                <p className="text-sm font-semibold text-white/90">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/45">{subtitle}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Today's workout */}
        <section className="pb-6 pt-2">
          <div className="rounded-[2rem] border border-blue-400/18 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),rgba(255,255,255,0.04)_45%,rgba(255,255,255,0.025)_100%)] p-5 shadow-[0_0_44px_rgba(59,130,246,0.10)] backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Nästa pass
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                  Överkropp
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  Fokus på press, drag och kontrollerade arbetsset.
                </p>
              </div>

              <button className="w-full rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,1),rgba(37,99,235,0.92))] px-6 py-4 text-sm font-semibold text-white shadow-[0_0_28px_rgba(59,130,246,0.11)] transition hover:scale-[1.01] hover:shadow-[0_0_38px_rgba(59,130,246,0.36)] sm:w-auto">
                Starta pass
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
