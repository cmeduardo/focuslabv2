"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { cn } from "@/lib/utils";

const GRID_SIZE = 9;
const START_LENGTH = 3;
const MAX_LEVEL = 10;
const FLASH_MS = 500;
const GAP_MS = 250;

type Phase = "playback" | "input";
type Feedback = "correct" | "wrong";

function generateSequence(level: number): number[] {
  const length = START_LENGTH + (level - 1);
  return Array.from({ length }, () => Math.floor(Math.random() * GRID_SIZE));
}

export function MemoryMatrixGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>(() => generateSequence(1));
  const [litIndex, setLitIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("playback");
  const [userStep, setUserStep] = useState(0);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const correctClicksRef = useRef(0);
  const totalClicksRef = useRef(0);
  const sequenceLengthsRef = useRef<number[]>([]);
  const finishedRef = useRef(false);

  const finishGame = useCallback(
    (mistakeLevel: number | null) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const totalClicks = totalClicksRef.current;
      const accuracy = totalClicks
        ? Math.round((correctClicksRef.current / totalClicks) * 100)
        : 0;
      onFinish({
        accuracy,
        levelReached: mistakeLevel !== null ? mistakeLevel - 1 : MAX_LEVEL,
        metrics: {
          sequenceLengths: sequenceLengthsRef.current,
          mistakeAtLevel: mistakeLevel,
        },
      });
    },
    [onFinish],
  );

  // Reproduce la secuencia actual (nueva en cada nivel). El setState real
  // ocurre dentro de los setTimeout, nunca de forma síncrona en el efecto.
  useEffect(() => {
    sequenceLengthsRef.current.push(sequence.length);
    let t = 300;
    const timers: ReturnType<typeof setTimeout>[] = [];
    sequence.forEach((cell) => {
      timers.push(setTimeout(() => setLitIndex(cell), t));
      timers.push(setTimeout(() => setLitIndex(null), t + FLASH_MS - 100));
      t += FLASH_MS + GAP_MS;
    });
    timers.push(setTimeout(() => setPhase("input"), t));
    return () => timers.forEach(clearTimeout);
  }, [sequence]);

  function handleCellClick(cell: number) {
    if (phase !== "input" || finishedRef.current) return;
    totalClicksRef.current += 1;
    const expected = sequence[userStep];

    if (cell !== expected) {
      setFeedback((f) => ({ ...f, [cell]: "wrong" }));
      setTimeout(() => finishGame(level), 500);
      return;
    }

    correctClicksRef.current += 1;
    setFeedback((f) => ({ ...f, [cell]: "correct" }));
    const nextStep = userStep + 1;

    if (nextStep < sequence.length) {
      setUserStep(nextStep);
      return;
    }

    if (level >= MAX_LEVEL) {
      setTimeout(() => finishGame(null), 500);
      return;
    }

    const nextLevel = level + 1;
    setTimeout(() => {
      setPhase("playback");
      setUserStep(0);
      setFeedback({});
      setLevel(nextLevel);
      setSequence(generateSequence(nextLevel));
    }, 500);
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        {phase === "playback"
          ? "Memorizá la secuencia…"
          : `Repetila — nivel ${level}`}
      </p>
      <div className="mx-auto grid w-fit grid-cols-3 gap-3">
        {Array.from({ length: GRID_SIZE }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCellClick(i)}
            disabled={phase !== "input"}
            className={cn(
              "size-20 rounded-xl border-2 transition-colors disabled:cursor-not-allowed",
              litIndex === i
                ? "border-primary bg-primary"
                : "border-border bg-muted/40",
              feedback[i] === "correct" && "border-primary bg-primary/60",
              feedback[i] === "wrong" && "border-destructive bg-destructive/20",
            )}
            aria-label={`Celda ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
