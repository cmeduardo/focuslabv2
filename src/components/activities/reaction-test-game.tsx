"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StreakBadge } from "@/components/activities/streak-badge";
import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { playHit, playMiss } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

// Estilo Psychomotor Vigilance Task (PVT) + puntería: el objetivo aparece
// en una posición aleatoria dentro del campo y se achica con la racha —
// mide tiempo de reacción Y precisión bajo presión, no solo "clic en
// cualquier lugar de una caja fija".
const TOTAL_TRIALS = 20;
const MAX_RETRIES = 2;
const MIN_DELAY_MS = 1200;
const MAX_DELAY_MS = 3000;
const LAPSE_THRESHOLD_MS = 500;
const TARGET_WINDOW_MS = 1200;
const BASE_SIZE = 72;
const MIN_SIZE = 32;
const SIZE_STEP = 4;

type Phase = "waiting" | "go" | "tooSoon";
type Target = { top: number; left: number; size: number };

function pointsFor(rt: number, streak: number) {
  const base = Math.max(50, 700 - rt);
  const multiplier = 1 + Math.min(streak, 10) * 0.1;
  return Math.round(base * multiplier);
}

function sizeForStreak(streak: number) {
  return Math.max(MIN_SIZE, BASE_SIZE - streak * SIZE_STEP);
}

export function ReactionTestGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [target, setTarget] = useState<Target | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fxKey, setFxKey] = useState(0);
  const [fx, setFx] = useState<"pop" | "shake" | null>(null);

  const timesRef = useRef<number[]>([]);
  const falseStartsRef = useRef(0);
  const aimMissesRef = useRef(0);
  const aimMissDistancesRef = useRef<number[]>([]);
  const targetSizesRef = useRef<number[]>([]);
  const timeoutsRef = useRef(0);
  const goAtRef = useRef<number | null>(null);
  const appearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const bestStreakRef = useRef(0);
  const resolvedRef = useRef(false);
  const finishedRef = useRef(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const times = timesRef.current;
    const accuracy = Math.round((times.length / TOTAL_TRIALS) * 100);
    const averageMs = times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;
    const rtSD = times.length
      ? Math.round(
          Math.sqrt(
            times.reduce((sum, t) => sum + (t - averageMs) ** 2, 0) /
              times.length,
          ),
        )
      : 0;
    const rtCV = averageMs ? Math.round((rtSD / averageMs) * 100) : 0;
    const lapses = times.filter((t) => t > LAPSE_THRESHOLD_MS).length;
    // Decaimiento de vigilancia: ¿empeora la reacción a medida que avanza
    // la prueba? Es la señal clásica de fatiga atencional en un PVT.
    const half = Math.floor(times.length / 2);
    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const earlyAvgMs = avg(times.slice(0, half));
    const lateAvgMs = avg(times.slice(half));
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        trials: times,
        falseStarts: falseStartsRef.current,
        aimMisses: aimMissesRef.current,
        aimMissDistancesPx: aimMissDistancesRef.current,
        targetSizesPx: targetSizesRef.current,
        timeouts: timeoutsRef.current,
        averageMs,
        rtSD,
        rtCV,
        lapses,
        earlyAvgMs,
        lateAvgMs,
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
      },
    });
  }, [onFinish]);

  const goNextTrial = useCallback(() => {
    retriesRef.current = 0;
    setTarget(null);
    if (trialIndex + 1 >= TOTAL_TRIALS) {
      finishGame();
    } else {
      setPhase("waiting");
      setTrialIndex((i) => i + 1);
    }
  }, [trialIndex, finishGame]);

  // Arma el ensayo: espera aleatoria y luego el objetivo aparece en una
  // posición al azar. El setState real va dentro de los setTimeout.
  const armTrial = useCallback(() => {
    resolvedRef.current = false;
    goAtRef.current = null;
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    appearTimerRef.current = setTimeout(() => {
      const size = sizeForStreak(streakRef.current);
      targetSizesRef.current.push(size);
      goAtRef.current = performance.now();
      setTarget({
        top: 15 + Math.random() * 70,
        left: 15 + Math.random() * 70,
        size,
      });
      setPhase("go");
      windowTimerRef.current = setTimeout(() => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        timeoutsRef.current += 1;
        streakRef.current = 0;
        setStreak(0);
        setFx("shake");
        setFxKey((k) => k + 1);
        playMiss();
        window.setTimeout(goNextTrial, 400);
      }, TARGET_WINDOW_MS);
    }, delay);
  }, [goNextTrial]);

  useEffect(() => {
    armTrial();
    return () => {
      if (appearTimerRef.current) clearTimeout(appearTimerRef.current);
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
    };
  }, [trialIndex, armTrial]);

  function handleFalseStart() {
    if (appearTimerRef.current) clearTimeout(appearTimerRef.current);
    falseStartsRef.current += 1;
    retriesRef.current += 1;
    streakRef.current = 0;
    setStreak(0);
    setPhase("tooSoon");
    setFx("shake");
    setFxKey((k) => k + 1);
    playMiss();
    window.setTimeout(() => {
      if (retriesRef.current > MAX_RETRIES) {
        goNextTrial();
      } else {
        setPhase("waiting");
        armTrial();
      }
    }, 900);
  }

  function handleFieldClick(event: React.MouseEvent<HTMLDivElement>) {
    if (phase === "waiting") {
      handleFalseStart();
      return;
    }
    if (phase === "go" && !resolvedRef.current) {
      resolvedRef.current = true;
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
      aimMissesRef.current += 1;
      if (target && fieldRef.current) {
        const rect = fieldRef.current.getBoundingClientRect();
        const targetCx = rect.width * (target.left / 100);
        const targetCy = rect.height * (target.top / 100);
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        aimMissDistancesRef.current.push(
          Math.round(Math.hypot(clickX - targetCx, clickY - targetCy)),
        );
      }
      streakRef.current = 0;
      setStreak(0);
      setFx("shake");
      setFxKey((k) => k + 1);
      playMiss();
      window.setTimeout(goNextTrial, 400);
    }
  }

  function handleTargetClick(event: React.MouseEvent) {
    event.stopPropagation();
    if (phase !== "go" || resolvedRef.current || goAtRef.current === null) return;
    resolvedRef.current = true;
    if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
    const rt = Math.round(performance.now() - goAtRef.current);
    timesRef.current.push(rt);
    const nextStreak = streakRef.current + 1;
    streakRef.current = nextStreak;
    bestStreakRef.current = Math.max(bestStreakRef.current, nextStreak);
    scoreRef.current += pointsFor(rt, nextStreak - 1);
    setStreak(nextStreak);
    setScore(scoreRef.current);
    setFx("pop");
    setFxKey((k) => k + 1);
    playHit();
    window.setTimeout(goNextTrial, 150);
  }

  return (
    <div className="space-y-3 text-center">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Ronda {trialIndex + 1} de {TOTAL_TRIALS}
        </span>
        <span className="flex items-center gap-2 font-heading font-semibold text-foreground">
          {score}
          <StreakBadge streak={streak} />
        </span>
      </div>
      <div
        key={fxKey}
        ref={fieldRef}
        onClick={handleFieldClick}
        className={cn(
          "relative flex h-72 w-full cursor-pointer select-none items-center justify-center overflow-hidden rounded-2xl border-2 transition-colors",
          phase === "tooSoon"
            ? "border-destructive bg-destructive/10"
            : "border-dashed border-border bg-muted/30",
          fx === "shake" && "animate-shake",
        )}
      >
        {phase === "waiting" && (
          <p className="text-sm text-muted-foreground">Prepárate…</p>
        )}
        {phase === "tooSoon" && (
          <p className="text-sm font-medium text-destructive">
            Muy pronto — esperá la señal
          </p>
        )}
        {phase === "go" && target && (
          <button
            type="button"
            onClick={handleTargetClick}
            style={{
              top: `${target.top}%`,
              left: `${target.left}%`,
              width: target.size,
              height: target.size,
            }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg shadow-primary/30",
              fx === "pop" && "animate-pop",
            )}
            aria-label="Objetivo"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Hacé clic en el círculo violeta apenas aparezca — cuanto más rápido y
        más larga la racha, más chico se pone.
      </p>
    </div>
  );
}
