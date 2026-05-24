"use client";

type PersonalRecord = {
  exerciseName: string;
  weight: number;
  reps: number;
  createdAt: string;
};

type Props = {
  personalRecords: Record<string, PersonalRecord>;
  onBack: () => void;
  onOpenExercise: (exerciseName: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function daysSince(value: string) {
  const then = new Date(value).getTime();
  const now = Date.now();
  const days = Math.max(0, Math.floor((now - then) / 86_400_000));

  if (days === 0) return "Idag";
  if (days === 1) return "Igår";
  return `${days} dagar sedan`;
}

function getRecordLabel(record: PersonalRecord) {
  return `${record.weight} × ${record.reps}`;
}

export default function PersonalRecordsScreen({
  personalRecords,
  onBack,
  onOpenExercise,
}: Props) {
  const records = Object.values(personalRecords).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latestRecord = records[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-4 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.06),transparent_28%),linear-gradient(180deg,#0b1018_0%,#111a25_45%,#0b1018_100%)]" />

      <div className="flex items-center justify-between gap-3 pt-1 sm:pt-3">
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
          Personbästan
        </h1>

        <button
          onClick={onBack}
          className="rounded-xl border border-white/[0.09] bg-white/[0.048] px-3 py-2 text-sm font-medium text-white/76 transition hover:border-blue-400/20 hover:bg-[#4f83ff]/[0.07]"
        >
          Tillbaka
        </button>
      </div>

      {latestRecord ? (
        <>
          <button
            onClick={() => onOpenExercise(latestRecord.exerciseName)}
            className="mt-4 w-full rounded-[1.5rem] border border-white/[0.09] bg-white/[0.052] p-4 text-left shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:border-white/16 hover:bg-white/[0.06] sm:p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Senaste PR
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              {latestRecord.exerciseName}
            </h2>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
              {getRecordLabel(latestRecord)}
            </p>
            <p className="mt-2 text-sm text-white/55">
              {formatDate(latestRecord.createdAt)} · {daysSince(latestRecord.createdAt)}
            </p>
          </button>

          <section className="mt-4 rounded-[1.5rem] border border-white/[0.09] bg-white/[0.032] p-4 backdrop-blur-2xl sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Alla PR
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {records.map((record) => (
                <button
                  key={record.exerciseName}
                  onClick={() => onOpenExercise(record.exerciseName)}
                  className="rounded-[1.25rem] border border-white/[0.09] bg-slate-950/22 p-3.5 text-left transition hover:border-white/16 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">
                        {record.exerciseName}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatDate(record.createdAt)}
                      </p>
                    </div>

                    <p className="text-lg font-semibold tracking-[-0.04em] text-white">
                      {getRecordLabel(record)}
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-blue-100/68">
                    Visa progression
                  </p>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-4 rounded-[1.5rem] border border-white/[0.09] bg-white/[0.032] p-4 backdrop-blur-2xl sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Inga PR än
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
            När du sätter ditt första personbästa syns det här.
          </h2>
        </section>
      )}
    </div>
  );
}
