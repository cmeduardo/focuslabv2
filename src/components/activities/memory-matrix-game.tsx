"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { playLevelUp, playMiss, playNote } from "@/lib/audio/beep";
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
  const [score, setScore] = useState(0);
  const [gridFx, setGridFx] = useState<"shake" | null>(null);
  const [gridFxKey, setGridFxKey] = useState(0);
  const [levelUpBanner, setLevelUpBanner] = useState<number | null>(null);
  const correctClicksRef = useRef(0);
  const totalClicksRef = useRef(0);
  const scoreRef = useRef(0);
  const sequenceLengthsRef = useRef<number[]>([]);
  const clickLatenciesRef = useRef<number[]>([]);
  const lastActionAtRef = useRef(0);
  const finishedRef = useRef(false);

  const finishGame = useCallback(
    (mistakeLevel: number | null, mistakeStep: number | null = null) => {
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
          mistakeAtStep: mistakeStep,
          clickLatenciesMs: clickLatenciesRef.current,
          score: scoreRef.current,
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
      timers.push(
        setTimeout(() => {
          setLitIndex(cell);
          playNote(cell);
        }, t),
      );
      timers.push(setTimeout(() => setLitIndex(null), t + FLASH_MS - 100));
      t += FLASH_MS + GAP_MS;
    });
    timers.push(
      setTimeout(() => {
        lastActionAtRef.current = performance.now();
        setPhase("input");
      }, t),
    );
    return () => timers.forEach(clearTimeout);
  }, [sequence]);

  const handleCellClick = useCallback(
    (cell: number) => {
      if (phase !== "input" || finishedRef.current) return;
      const now = performance.now();
      clickLatenciesRef.current.push(Math.round(now - lastActionAtRef.current));
      lastActionAtRef.current = now;
      totalClicksRef.current += 1;
      const expected = sequence[userStep];

      if (cell !== expected) {
        setFeedback((f) => ({ ...f, [cell]: "wrong" }));
        setGridFx("shake");
        setGridFxKey((k) => k + 1);
        playMiss();
        setTimeout(() => finishGame(level, userStep), 600);
        return;
      }

      correctClicksRef.current += 1;
      scoreRef.current += 10;
      setScore(scoreRef.current);
      setFeedback((f) => ({ ...f, [cell]: "correct" }));
      playNote(cell);
      const nextStep = userStep + 1;

      if (nextStep < sequence.length) {
        setUserStep(nextStep);
        return;
      }

      if (level >= MAX_LEVEL) {
        setTimeout(() => finishGame(null), 500);
        return;
      }

      scoreRef.current += 100;
      setScore(scoreRef.current);
      const nextLevel = level + 1;
      setTimeout(() => {
        playLevelUp();
        setLevelUpBanner(nextLevel);
        setTimeout(() => setLevelUpBanner(null), 900);
        setPhase("playback");
        setUserStep(0);
        setFeedback({});
        setLevel(nextLevel);
        setSequence(generateSequence(nextLevel));
      }, 500);
    },
    [phase, sequence, userStep, level, finishGame],
  );

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {phase === "playback"
            ? "Memorizá la secuencia…"
            : `Repetila — nivel ${level}`}
        </span>
        <span className="font-heading font-semibold text-foreground">
          {score} pts
        </span>
      </div>
      <div className="relative mx-auto w-fit">
        {levelUpBanner !== null && (
          <div className="animate-pop absolute inset-x-0 -top-2 z-10 -translate-y-full">
            <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-heading font-semibold text-primary-foreground shadow-lg">
              ¡Nivel {levelUpBanner}!
            </span>
          </div>
        )}
        <div
          key={gridFxKey}
          className={cn(
            "grid grid-cols-3 gap-3",
            gridFx === "shake" && "animate-shake",
          )}
        >
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
    </div>
  );
}
