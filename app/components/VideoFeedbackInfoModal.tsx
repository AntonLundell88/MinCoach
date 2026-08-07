"use client";

export default function VideoFeedbackInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] rounded-2xl border border-white/[0.09] bg-[#131c27] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm font-semibold text-white/90">Filma ett set</p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Filma dig själv medan du kör setet, så tittar jag på klippet och
          säger vad jag ser.
        </p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Filmen sparas aldrig och kan inte ses igen — bara mina anteckningar
          om setet sparas.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Okej
        </button>
      </div>
    </div>
  );
}
