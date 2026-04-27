"use client";

type Props = {
  onDone: () => void;
};

export default function WorkoutCompleteScreen({ onDone }: Props) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),rgba(24,24,27,0.92)_42%,rgba(10,10,15,0.98)_100%)] p-6 text-white shadow-[0_0_60px_rgba(59,130,246,0.14)]">
      <p className="text-xs uppercase tracking-[0.18em] text-white/40">
        Coachen
      </p>

      <h1 className="mt-4 text-3xl font-semibold leading-tight">
        Bra jobbat idag.
      </h1>

      <p className="mt-4 text-sm leading-7 text-white/78">
        Passet är sparat. Vila, ät och låt kroppen göra jobbet nu.
        <br />
        Nästa gång du är på gymmet kör vi vidare.
      </p>

      <button
        className="mt-6 w-full rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,1),rgba(37,99,235,0.9))] py-4 font-semibold text-white shadow-[0_0_30px_rgba(59,130,246,0.35)] transition hover:scale-[1.01]"
        onClick={onDone}
      >
        Till startsidan
      </button>
    </div>
  );
}