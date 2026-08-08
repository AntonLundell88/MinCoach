"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { exerciseKey, parsePlannedSetCount, resolveExerciseName } from "../lib/exercises";
import type { Workout, WorkoutPlan } from "../page";

type LoggedExerciseShape = Workout["exercises"][number];
type PlannedExerciseShape = WorkoutPlan["passes"][number]["exercises"][number];

export type ExerciseActionResult = { handled: boolean; message?: string };

type ChatMessage = {
  role: "you" | "coach";
  text: string;
  setNumber?: number;
  exerciseName?: string;
  source?: "engine" | "llm" | "fallback" | "video";
  highlight?: boolean;
  eventKey?: string;
};

export function useExerciseSwapActions(args: {
  workout: Workout | null;
  setWorkout: (workout: Workout) => void;
  workoutPlan: WorkoutPlan | null;
  exerciseIndex: number;
  setExerciseIndex: Dispatch<SetStateAction<number>>;
  currentExerciseName: string;
  setChatLog: Dispatch<SetStateAction<ChatMessage[]>>;
  resetWorkoutInputs: () => void;
  setSwapFrom: Dispatch<SetStateAction<string | null>>;
  setSwapToInput: Dispatch<SetStateAction<string>>;
  skippedExercise: { exercise: { name: string } } | null;
  setSkippedExercise: (value: null) => void;
}) {
  const {
    workout,
    setWorkout,
    workoutPlan,
    exerciseIndex,
    setExerciseIndex,
    currentExerciseName,
    setChatLog,
    resetWorkoutInputs,
    setSwapFrom,
    setSwapToInput,
    skippedExercise,
    setSkippedExercise,
  } = args;

  const [workoutExerciseInput, setWorkoutExerciseInput] = useState("");
  const [swapExerciseInput, setSwapExerciseInput] = useState("");

  function addExerciseToCurrentWorkout(
    nameRaw: string,
    options?: { silent?: boolean }
  ): ExerciseActionResult {
    const silent = options?.silent ?? false;
    if (!workout) return { handled: true };

    const resolved = resolveExerciseName(nameRaw);
    if (resolved.status === "empty") return { handled: true };

    if (resolved.status === "suggest") {
      setWorkoutExerciseInput(resolved.suggestion);
      const message = `Menar du ${resolved.suggestion}? Jag har fyllt i det namnet. Tryck Lägg till igen om det stämmer.`;
      if (!silent) setChatLog((prev) => [...prev, { role: "coach", text: message }]);
      return { handled: false, message };
    }

    if (resolved.status === "needsCategory") {
      setWorkoutExerciseInput(`egen ben: ${resolved.name}`);
      const message =
        "Vad tränar den främst? Skriv till exempel egen ben:, egen rygg: eller egen armar:. Jag fyllde i ben som exempel.";
      if (!silent) setChatLog((prev) => [...prev, { role: "coach", text: message }]);
      return { handled: false, message };
    }

    if (resolved.status === "unknown") {
      const message =
        "Jag är osäker på vilken övning du menar. Skriv gärna det vanligaste namnet, eller börja med egen: om du vill lägga in den exakt så.";
      if (!silent) setChatLog((prev) => [...prev, { role: "coach", text: message }]);
      return { handled: false, message };
    }

    const name = resolved.name;

    const key = exerciseKey(name);
    const alreadyInWorkout = workout.exercises.some(
      (exercise) => exerciseKey(exercise.name) === key
    );

    if (alreadyInWorkout) {
      const message = `${name} ligger redan i passet.`;
      if (!silent) {
        setChatLog((prev) => [...prev, { role: "coach", text: message }]);
        setWorkoutExerciseInput("");
        return { handled: true };
      }
      return { handled: false, message };
    }

    setWorkout({
      ...workout,
      exercises: [...workout.exercises, { name, sets: [] }],
    });
    if (skippedExercise && exerciseKey(skippedExercise.exercise.name) === key) {
      setSkippedExercise(null);
    }
    setWorkoutExerciseInput("");
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        text: `Bra, vi lägger till ${name}.`,
      },
    ]);
    return { handled: true };
  }

  function replaceExerciseInCurrentWorkout(
    fromName: string,
    toNameRaw: string,
    options?: { silent?: boolean }
  ): ExerciseActionResult {
    const silent = options?.silent ?? false;
    if (!workout) return { handled: true };

    const resolved = resolveExerciseName(toNameRaw);

    if (resolved.status === "empty") return { handled: true };

    if (resolved.status === "suggest") {
      if (silent) {
        setSwapExerciseInput(resolved.suggestion);
        const message = `Menar du ${resolved.suggestion}? Jag har fyllt i det namnet. Tryck Byt igen om det stämmer.`;
        return { handled: false, message };
      }
      return replaceExerciseInCurrentWorkout(fromName, resolved.suggestion, options);
    }

    if (resolved.status === "needsCategory") {
      setSwapExerciseInput(`egen ben: ${resolved.name}`);
      const message =
        "Vad tränar den främst? Skriv till exempel egen ben:, egen rygg: eller egen armar:. Jag fyllde i ben som exempel.";
      if (!silent) setChatLog((prev) => [...prev, { role: "coach", text: message }]);
      return { handled: false, message };
    }

    if (resolved.status === "unknown") {
      const message =
        "Jag är osäker på vilken övning du menar. Skriv gärna det vanligaste namnet, eller börja med egen: om du vill lägga in den exakt så.";
      if (!silent) setChatLog((prev) => [...prev, { role: "coach", text: message }]);
      return { handled: false, message };
    }

    const fromKey = exerciseKey(fromName);
    const replacementName = resolved.name;
    const replacementPlanExercise =
      (workoutPlan?.passes
        .find((pass) => pass.key === workout.pass)
        ?.exercises.find(
          (exercise) => exerciseKey(exercise.name) === exerciseKey(replacementName)
        ) ?? null) as PlannedExerciseShape | null;
    const alreadyInWorkout = workout.exercises.some(
      (exercise) => exerciseKey(exercise.name) === exerciseKey(replacementName)
    );

    if (alreadyInWorkout) {
      const message = `${replacementName} ligger redan i dagens pass.`;
      if (!silent) setChatLog((prev) => [...prev, { role: "coach", text: message }]);
      return { handled: false, message };
    }

    let replacedCurrentExercise = false;
    let resetLoggedExercise = false;
    let insertedReplacementIndex: number | null = null;

    setWorkout({
      ...workout,
      exercises: workout.exercises.flatMap((exercise, index) => {
        if (exerciseKey(exercise.name) !== fromKey) return [exercise];

        replacedCurrentExercise = index === exerciseIndex;
        resetLoggedExercise = exercise.sets.length > 0 || Boolean(exercise.completed);

        const replacementExercise: LoggedExerciseShape = {
          name: replacementName,
          plannedSets:
            parsePlannedSetCount(replacementPlanExercise?.sets) ??
            exercise.plannedSets,
          plannedReps: replacementPlanExercise?.reps ?? exercise.plannedReps,
          plannedRir: replacementPlanExercise?.rir ?? exercise.plannedRir,
          completed: false,
          sets: [],
        };

        if (resetLoggedExercise) {
          insertedReplacementIndex = index + 1;
          return [
            {
              ...exercise,
              completed: true,
            },
            replacementExercise,
          ];
        }

        return [replacementExercise];
      }),
      events: [
        ...(workout.events ?? []),
        {
          type: "exercise_replaced",
          exerciseName: fromName,
          replacementName,
          setCount:
            workout.exercises.find((exercise) => exerciseKey(exercise.name) === fromKey)
              ?.sets.length ?? 0,
          note: resetLoggedExercise
            ? "Övningen var påbörjad och ersattes under passet."
            : "Övningen byttes innan den loggades.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    if (replacedCurrentExercise) {
      resetWorkoutInputs();
      if (insertedReplacementIndex !== null) {
        setExerciseIndex(insertedReplacementIndex);
      }
    }
    setSwapFrom(null);
    setSwapToInput("");
    setChatLog((prev) => [
      ...prev,
      {
        role: "coach",
        source: "engine" as const,
        text: resetLoggedExercise
          ? `Bra, vi kör ${replacementName} istället. Jag sparar ${fromName} som avslutad så loggen blir rätt.`
          : `Bra, vi kör ${replacementName} istället.`,
      },
    ]);
    return { handled: true };
  }

  function addExerciseDuringWorkout(): ExerciseActionResult {
    if (!workoutExerciseInput.trim()) {
      return { handled: false, message: "Skriv ett namn på övningen." };
    }
    return addExerciseToCurrentWorkout(workoutExerciseInput, { silent: true });
  }

  function swapCurrentExerciseDuringWorkout(): ExerciseActionResult {
    if (!swapExerciseInput.trim()) {
      return { handled: false, message: "Skriv ett namn på övningen." };
    }
    const result = replaceExerciseInCurrentWorkout(currentExerciseName, swapExerciseInput, {
      silent: true,
    });
    if (result.handled) setSwapExerciseInput("");
    return result;
  }

  function pickExerciseForAdd(name: string): ExerciseActionResult {
    return addExerciseToCurrentWorkout(name, { silent: true });
  }

  function pickExerciseForSwap(name: string): ExerciseActionResult {
    return replaceExerciseInCurrentWorkout(currentExerciseName, name, { silent: true });
  }

  function stripCustomExercisePrefix(nameRaw: string): string {
    return nameRaw
      .replace(/^(egen|eget)\s+(ben|rygg|bröst|brost|axlar|armar|mage|helkropp)\s*:?\s+/i, "")
      .replace(/^(egen|eget)\s*:?\s+/i, "")
      .trim();
  }

  function pickCustomExerciseForAdd(nameRaw: string, category: string): ExerciseActionResult {
    const cleanName = stripCustomExercisePrefix(nameRaw);
    if (!cleanName) return { handled: false };
    return addExerciseToCurrentWorkout(`egen ${category}: ${cleanName}`, { silent: true });
  }

  function pickCustomExerciseForSwap(nameRaw: string, category: string): ExerciseActionResult {
    const cleanName = stripCustomExercisePrefix(nameRaw);
    if (!cleanName) return { handled: false };
    return replaceExerciseInCurrentWorkout(
      currentExerciseName,
      `egen ${category}: ${cleanName}`,
      { silent: true }
    );
  }

  return {
    workoutExerciseInput,
    setWorkoutExerciseInput,
    swapExerciseInput,
    setSwapExerciseInput,
    addExerciseToCurrentWorkout,
    replaceExerciseInCurrentWorkout,
    addExerciseDuringWorkout,
    swapCurrentExerciseDuringWorkout,
    pickExerciseForAdd,
    pickExerciseForSwap,
    pickCustomExerciseForAdd,
    pickCustomExerciseForSwap,
  };
}
