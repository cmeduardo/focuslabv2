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
// Un solo intento de "una vida" deja muy poca información si alguien
// falla temprano (nivel 1-2) — apenas unos pocos clics para que el
// agente de IA saque algo en limpio (pedido directo, 2026-08-28). Hasta
// MAX_ATTEMPTS intentos, pero solo si hace falta: si un intento llega a
// MIN_LEVEL_TO_STOP_EARLY o más (o lo completa perfecto), ya generó
// suficiente señal y no repite.
const MAX_ATTEMPTS = 3;
const MIN_LEVEL_TO_STOP_EARLY = 5;

type Phase = "playback" | "input";
type Feedback = "correct" | "wrong";
type AttemptResult = {
  attempt: number;
  levelReached: number;
  mistakeAtStep: number | null;
  mistakeCellDistance: number | null;
};

function generateSequence(level: number): number[] {
  const length = START_LENGTH + (level - 1);
  return Array.from({ length }, () => Math.floor(Math.random() * GRID_SIZE));
}

// Distancia (en celdas de la grilla 3×3) entre la celda tocada por error
// y la esperada — un resbalón motor (celda vecina) es distinto de un
// fallo real de memoria (celda lejana).
function cellDistance(a: number, b: number) {
  const ax = a % 3;
  const ay = Math.floor(a / 3);
  const bx = b % 3;
  const by = Math.floor(b / 3);
  return Math.round(Math.hypot(ax - bx, ay - by) * 10) / 10;
}

export function MemoryMatrixGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [attempt, setAttempt] = useState(1);
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
  const [attemptBanner, setAttemptBanner] = useState<number | null>(null);
  const correctClicksRef = useRef(0);
  const totalClicksRef = useRef(0);
  const scoreRef = useRef(0);
  const attemptRef = useRef(1);
  const attemptResultsRef = useRef<AttemptResult[]>([]);
  const sequenceLengthsRef = useRef<number[]>([]);
  const attemptOfEachSequenceRef = useRef<number[]>([]);
  const clickLatenciesRef = useRef<number[]>([]);
  const levelOfEachClickRef = useRef<number[]>([]);
  const attemptOfEachClickRef = useRef<number[]>([]);
  const lastActionAtRef = useRef(0);
  const finishedRef = useRef(false);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalClicks = totalClicksRef.current;
    const accuracy = totalClicks
      ? Math.round((correctClicksRef.current / totalClicks) * 100)
      : 0;
    const bestLevelReached = attemptResultsRef.current.reduce(
      (max, a) => Math.max(max, a.levelReached),
      0,
    );
    onFinish({
      accuracy,
      levelReached: bestLevelReached,
      metrics: {
        attempts: attemptResultsRef.current,
        sequenceLengths: sequenceLengthsRef.current,
        attemptOfEachSequence: attemptOfEachSequenceRef.current,
        clickLatenciesMs: clickLatenciesRef.current,
        levelOfEachClick: levelOfEachClickRef.current,
        attemptOfEachClick: attemptOfEachClickRef.current,
        score: scoreRef.current,
      },
    });
  }, [onFinish]);

  // Termina un intento (por error o por completar MAX_LEVEL) y decide si
  // hace falta uno nuevo: solo si quedó corto (menos de
  // MIN_LEVEL_TO_STOP_EARLY) y todavía hay intentos disponibles.
  const handleAttemptEnd = useCallback(
    (
      mistakeLevel: number | null,
      mistakeStep: number | null = null,
      mistakeCellDistance: number | null = null,
    ) => {
      if (finishedRef.current) return;
      const levelReachedThisAttempt =
        mistakeLevel !== null ? mistakeLevel - 1 : MAX_LEVEL;
      attemptResultsRef.current.push({
        attempt: attemptRef.current,
        levelReached: levelReachedThisAttempt,
        mistakeAtStep: mistakeStep,
        mistakeCellDistance,
      });

      const shouldStop =
        attemptRef.current >= MAX_ATTEMPTS ||
        levelReachedThisAttempt >= MIN_LEVEL_TO_STOP_EARLY;

      if (shouldStop) {
        finishGame();
        return;
      }

      const nextAttempt = attemptRef.current + 1;
      attemptRef.current = nextAttempt;
      setAttempt(nextAttempt);
      setAttemptBanner(nextAttempt);
      setTimeout(() => setAttemptBanner(null), 1200);
      setLevel(1);
      setUserStep(0);
      setFeedback({});
      setPhase("playback");
      setSequence(generateSequence(1));
    },
    [finishGame],
  );

  // Reproduce la secuencia actual (nueva en cada nivel). El setState real
  // ocurre dentro de los setTimeout, nunca de forma síncrona en el efecto.
  useEffect(() => {
    sequenceLengthsRef.current.push(sequence.length);
    attemptOfEachSequenceRef.current.push(attemptRef.current);
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
      levelOfEachClickRef.current.push(level);
      attemptOfEachClickRef.current.push(attemptRef.current);
      lastActionAtRef.current = now;
      totalClicksRef.current += 1;
      const expected = sequence[userStep];

      if (cell !== expected) {
        setFeedback((f) => ({ ...f, [cell]: "wrong" }));
        setGridFx("shake");
        setGridFxKey((k) => k + 1);
        playMiss();
        const distance = cellDistance(cell, expected);
        setTimeout(() => handleAttemptEnd(level, userStep, distance), 600);
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
        setTimeout(() => handleAttemptEnd(null), 500);
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
    [phase, sequence, userStep, level, handleAttemptEnd],
  );

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {phase === "playback"
            ? "Memorizá la secuencia…"
            : `Repetila — nivel ${level}`}
          {attempt > 1 && ` · intento ${attempt}/${MAX_ATTEMPTS}`}
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
        {attemptBanner !== null && (
          <div className="animate-pop absolute inset-x-0 -top-2 z-10 -translate-y-full">
            <span className="rounded-full bg-secondary px-4 py-1.5 text-sm font-heading font-semibold text-secondary-foreground shadow-lg">
              Intento {attemptBanner} de {MAX_ATTEMPTS}
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
