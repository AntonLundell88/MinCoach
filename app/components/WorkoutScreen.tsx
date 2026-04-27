"use client";
import { useEffect, useState } from "react";
import ExerciseCard from "./ExerciseCard";
import SetList from "./SetList";
import CoachPanel from "./CoachPanel";
import WorkoutHeader from "./WorkoutHeader";
import WorkoutNavigation from "./WorkoutNavigation";

type WorkoutHeaderData = {
  pass: string;
  gym: string;
  startedAt: string;
} | null;

type Props = {
  workout: WorkoutHeaderData;
  progression: { weight: number; reps: number }[];
  exerciseIndex: number;
  activePlan: string[];
  passLabel: string;
  coachData: {
    intro: string;
    pass: string;
    gym: string;
    exercise: string;
    lastText: string;
    plan: string;
    target: string;
    insight: string;
  } | null;
  dayForm: "trött" | "normal" | "stark" | null;
  setDayForm: (v: "trött" | "normal" | "stark") => void;
  formatTime: (d: Date) => string;
  chatLog: { role: "you" | "coach"; text: string }[];
  chatInput: string;
  setChatInput: (v: string) => void;
  addCoachMessage: (text: string) => void;
  sendChat: () => void;
  currentExerciseName: string;
  lastByExercise: Record<
    string,
    {
      weight: number;
      reps: number;
      rir: number | null;
      failNote: string | null;
      updatedAt: string;
    }
  >;
  exerciseKey: (name: string) => string;
  weightInput: string;
  setWeightInput: (v: string) => void;
  repsInput: string;
  setRepsInput: (v: string) => void;
  rirInput: number;
  setRirInput: React.Dispatch<React.SetStateAction<number>>;
  didFailInput: boolean;
  setDidFailInput: (v: boolean) => void;
  failNoteInput: string;
  setFailNoteInput: (v: string) => void;
  addSet: () => void;
  removeLastSet: () => void;
  currentSets: { createdAt: string; weight: number; reps: number; rir?: number }[];
  prevExercise: () => void;
  nextExercise: () => void;
  finishWorkout: () => void;
  personalRecords: Record<
    string,
    {
      exerciseName: string;
      weight: number;
      reps: number;
      createdAt: string;
    }
  >;
};

function getTopSet(progression: { weight: number; reps: number }[]) {
  if (progression.length === 0) return null;

  return [...progression].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.reps - a.reps;
  })[0];
}

function buildExerciseIntroCoachText(args: {
  exerciseName: string;
  progression: { weight: number; reps: number }[];
  lastByExercise: Props["lastByExercise"];
  exerciseKey: (name: string) => string;
}) {
  const { exerciseName, progression, lastByExercise, exerciseKey } = args;

  const key = exerciseKey(exerciseName);
  const last = lastByExercise[key];
  const topSet = getTopSet(progression);

  if (!last && !topSet) {
    return `Nu kör vi ${exerciseName}.

Jag har ingen tydlig historik här ännu.
Börja kontrollerat med en låg vikt.
Jobba upp tills första setet känns stabilt.`;
  }

  const lines: string[] = [`Nu kör vi ${exerciseName}.`, ""];

  if (progression.length > 0) {
    const summary = progression
      .map((set) => `${set.weight} × ${set.reps}`)
      .join("\n");

    lines.push("Förra gången:");
    lines.push(summary);
    lines.push("");
  } else if (last) {
    lines.push("Senast:");
    lines.push(`${last.weight} × ${last.reps}`);
    lines.push("");
  }

  const baseWeight = topSet?.weight ?? last?.weight ?? null;
  const baseReps = topSet?.reps ?? last?.reps ?? null;

  if (baseWeight !== null && baseReps !== null) {
    const targetReps = baseReps >= 12 ? baseReps : baseReps + 1;

    lines.push(`Starta på ${baseWeight} kg.`);
    lines.push(`Målet är ${targetReps} reps med bra teknik.`);

    if (topSet && topSet.reps >= 10) {
      lines.push("Känns det lätt kan vi höja efter första setet.");
    } else {
      lines.push("Känns det tungt håller vi vikten och bygger rent.");
    }
  } else {
    lines.push("Börja lågt och hitta rätt belastning.");
    lines.push("Första setet får styra resten.");
  }

  return lines.join("\n");
}
export default function WorkoutScreen({
  personalRecords,
  workout,
  exerciseIndex,
  activePlan,
  passLabel,
  coachData,
  dayForm,
  setDayForm,
  chatLog,
  chatInput,
  setChatInput,
  sendChat,
  formatTime,
  currentExerciseName,
  lastByExercise,
  exerciseKey,
  weightInput,
  setWeightInput,
  repsInput,
  setRepsInput,
  rirInput,
  setRirInput,
  didFailInput,
  setDidFailInput,
  failNoteInput,
  setFailNoteInput,
  addSet,
  removeLastSet,
  currentSets,
  prevExercise,
  nextExercise,
  finishWorkout,
  progression,
  addCoachMessage,
}: Props) {
  
// eslint-disable-next-line react-hooks/exhaustive-deps
// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => {
  if (!currentExerciseName) return;

  addCoachMessage(
    buildExerciseIntroCoachText({
      exerciseName: currentExerciseName,
      progression,
      lastByExercise,
      exerciseKey,
    })
  );
}, [exerciseIndex]);

useEffect(() => {
  if (!currentExerciseName) return;
 if (currentSets.length < 3) return;

if (currentSets.length > 3) {
  addCoachMessage(
    `Du har redan fått in ${currentSets.length} set här.
Jag rekommenderar att vi går vidare nu och sparar kvalitet till resten av passet.`
  );
  return;
}

  const hardSets = currentSets.filter(
    (set) => set.rir === 0 || set.rir === 1
  ).length;

  const easySets = currentSets.filter(
    (set) => typeof set.rir === "number" && set.rir >= 3
  ).length;

  let message = "";

  if (hardSets >= 2) {
    message = `Bra jobbat. 3 tunga set klara.\nJag tycker vi går vidare nu och sparar kvalitet till nästa övning.`;
  } else if (easySets >= 2) {
    message = `3 set klara och du hade bra marginal.\nVill du köra ett extraset kan du göra det, annars går vi vidare.`;
  } else {
    message = `Bra. 3 set klara.\nJag rekommenderar att vi går vidare till nästa övning.`;
  }
// eslint-disable-next-line react-hooks/set-state-in-effect
 addCoachMessage(message);
}, [currentSets, currentExerciseName]);
  return (
    <div className="w-full max-w-md space-y-3">
<CoachPanel
  coachData={coachData}
  dayForm={dayForm}
  setDayForm={setDayForm}
  chatLog={chatLog}
  chatInput={chatInput}
  setChatInput={setChatInput}
  sendChat={sendChat}
/>

      <WorkoutHeader
        workout={workout}
        exerciseIndex={exerciseIndex}
        activePlan={activePlan}
        passLabel={passLabel}
        formatTime={formatTime}
      />

      <ExerciseCard
        currentExerciseName={currentExerciseName}
        lastByExercise={lastByExercise}
        exerciseKey={exerciseKey}
        weightInput={weightInput}
        setWeightInput={setWeightInput}
        repsInput={repsInput}
        setRepsInput={setRepsInput}
        rirInput={rirInput}
        setRirInput={setRirInput}
        didFailInput={didFailInput}
        setDidFailInput={setDidFailInput}
        failNoteInput={failNoteInput}
        setFailNoteInput={setFailNoteInput}
        addSet={addSet}
        removeLastSet={removeLastSet}
        personalRecords={personalRecords}
        progression={progression}
      />

      <SetList currentSets={currentSets} />

      <div className="space-y-3">
        <WorkoutNavigation
          exerciseIndex={exerciseIndex}
          activePlan={activePlan}
          prevExercise={prevExercise}
          nextExercise={nextExercise}
          finishWorkout={finishWorkout}
        />
      </div>
    </div>
  );
}