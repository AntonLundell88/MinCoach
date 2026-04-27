"use client";
import { useState } from "react";

export default function SetupScreen({
  daysPerWeekInput,
  setDaysPerWeekInput,
  minutesPerSessionInput,
  setMinutesPerSessionInput,
  locationInput,
  setLocationInput,
  limitationsInput,
  setLimitationsInput,
  goalInput,
  setGoalInput,
  isEditing,
  onSubmit,
}: {
  daysPerWeekInput: string;
  setDaysPerWeekInput: (v: string) => void;
  minutesPerSessionInput: string;
  setMinutesPerSessionInput: (v: string) => void;
  locationInput: "gym" | "hemma";
  setLocationInput: (v: "gym" | "hemma") => void;
 limitationsInput: string;
setLimitationsInput: (v: string) => void;

goalInput: "muskel" | "styrka" | "fett";
setGoalInput: (v: "muskel" | "styrka" | "fett") => void;
isEditing: boolean;
onSubmit: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),#000_60%)] px-6 text-white">
      <div className="flex justify-center">
        <img
          src="/logo-dark.png"
          alt="MinCoach"
          className="h-70 w-auto opacity-95 drop-shadow-[0_0_22px_rgba(59,130,246,0.45)] animate-[logoFloat_3.2s_ease-in-out_infinite]"
        />
      </div>

      <div className="mt-[-16px] w-full max-w-md space-y-4">
        <div className="rounded-3xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),rgba(24,24,27,0.88)_38%,rgba(10,10,15,0.94)_100%)] p-5 shadow-[0_0_60px_rgba(59,130,246,0.18),inset_0_1px_0_rgba(255,255,255,0.05)] animate-[fadeUp_.45s_ease-out]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-sm font-semibold text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.18)]">
                C
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Coachen
                </p>
                <p className="text-sm font-medium text-white/85">
                  {isEditing ? "Vi justerar ditt upplägg" : "Vi börjar med att bygga ditt upplägg"}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold text-white">
  {isEditing ? "Justera ditt upplägg" : "Berätta lite om dina förutsättningar"}
</h1>

<p className="text-sm leading-relaxed text-white/65">
  {isEditing
    ? "Vi går igenom din struktur igen och justerar planen tillsammans."
    : "Svara på några snabba frågor så sätter vi en bra grund för ditt schema."}
</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-white/40">
                Första steget
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Jag vill förstå hur ofta du vill träna, hur mycket tid du har
                och om det finns något vi behöver ta hänsyn till.
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                await new Promise((resolve) => setTimeout(resolve, 900));
                onSubmit();
              }}
            >
              <label className="block text-sm text-white/78">
                Hur många dagar i veckan vill du träna?
                <div className="relative mt-1">
                  <select
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/60 p-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                     value={daysPerWeekInput}
  onChange={(e) => setDaysPerWeekInput(e.target.value)}
>
  <option value="1">1 dag</option>
  <option value="2">2 dagar</option>
  <option value="3">3 dagar</option>
  <option value="4">4 dagar</option>
  <option value="5">5 dagar</option>
  <option value="6">6 dagar</option>
</select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                    ▼
                  </div>
                </div>
              </label>

              <label className="block text-sm text-white/78">
                Hur lång tid vill du lägga per pass?
                <div className="relative mt-1">
                  <select
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/60 p-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    value={minutesPerSessionInput}
  onChange={(e) => setMinutesPerSessionInput(e.target.value)}
>
  <option value="30">30 minuter</option>
  <option value="45">45 minuter</option>
  <option value="60">60 minuter</option>
  <option value="75">75 minuter</option>
  <option value="90">90 minuter</option>
  <option value="120">120 minuter</option>
</select>

                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                    ▼
                  </div>
                </div>
              </label>

              <label className="block text-sm text-white/78">
                Var kommer du att träna?
                <div className="relative mt-1">
                  <select
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/60 p-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    value={locationInput}
                    onChange={(e) =>
                      setLocationInput(e.target.value as "gym" | "hemma")
                    }
                  >
                    <option value="gym">Gym</option>
                    <option value="hemma">Hemma</option>
                  </select>

                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                    ▼
                  </div>
                </div>
              </label>

              <label className="block text-sm text-white/78">
                Några skador eller begränsningar?
                <p className="mt-1 text-xs text-white/45">
                  Valfritt. Skriv bara om det finns något jag behöver ta hänsyn
                  till.
                </p>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm text-white placeholder:text-white/30"
                  value={limitationsInput}
                  onChange={(e) => setLimitationsInput(e.target.value)}
                  placeholder='t.ex. "ländrygg" eller "axel"'
                />
              </label>
              <label className="block text-sm text-gray-300">
  Vad är ditt mål?
  <div className="grid grid-cols-3 gap-2 mt-2">
    <button
      type="button"
      onClick={() => setGoalInput("muskel")}
      className={`rounded-xl p-3 text-sm border ${
        goalInput === "muskel"
          ? "bg-blue-500/30 border-blue-400"
          : "bg-black/40 border-white/10"
      }`}
    >
      Bygga muskler
    </button>

    <button
      type="button"
      onClick={() => setGoalInput("styrka")}
      className={`rounded-xl p-3 text-sm border ${
        goalInput === "styrka"
          ? "bg-blue-500/30 border-blue-400"
          : "bg-black/40 border-white/10"
      }`}
    >
      Styrka
    </button>

    <button
      type="button"
      onClick={() => setGoalInput("fett")}
      className={`rounded-xl p-3 text-sm border ${
        goalInput === "fett"
          ? "bg-blue-500/30 border-blue-400"
          : "bg-black/40 border-white/10"
      }`}
    >
      Fettförlust
    </button>
  </div>
</label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,1),rgba(37,99,235,0.9))] py-4 font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] transition hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSubmitting ? "Jag bygger grunden..." : "Fortsätt till ditt upplägg"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}