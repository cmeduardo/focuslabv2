"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { cn } from "@/lib/utils";

// Estilo Psychomotor Vigilance Task (PVT): muchos ensayos con intervalo
// variable — la variabilidad del tiempo de reacción y los lapsos (RT por
// encima del umbral) son marcadores de atención más fuertes que el
// promedio.
const TOTAL_TRIALS = 20;
const MAX_RETRIES = 2;
const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 3500;
const LAPSE_THRESHOLD_MS = 500;

type TrialPhase = "waiting" | "go" | "tooSoon";

export function ReactionTestGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState<TrialPhase>("waiting");
  const timesRef = useRef<number[]>([]);
  const falseStartsRef = useRef(0);
  const goAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const finishedRef = useRef(false);

  // Solo arma el temporizador que eventualmente muestra "¡YA!" — nunca
  // cambia estado de forma síncrona (para poder llamarse desde un efecto).
  const armTimer = useCallback(() => {
    goAtRef.current = null;
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    timerRef.current = setTimeout(() => {
      goAtRef.current = performance.now();
      setPhase("go");
    }, delay);
  }, []);

  useEffect(() => {
    armTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trialIndex, armTimer]);

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
    const lapses = times.filter((t) => t > LAPSE_THRESHOLD_MS).length;
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        trials: times,
        falseStarts: falseStartsRef.current,
        averageMs,
        rtSD,
        lapses,
      },
    });
  }, [onFinish]);

  const goNextTrial = useCallback(() => {
    retriesRef.current = 0;
    if (trialIndex + 1 >= TOTAL_TRIALS) {
      finishGame();
    } else {
      setPhase("waiting");
      setTrialIndex((i) => i + 1);
    }
  }, [trialIndex, finishGame]);

  function handleTargetClick() {
    if (phase === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      falseStartsRef.current += 1;
      retriesRef.current += 1;
      setPhase("tooSoon");
      window.setTimeout(() => {
        if (retriesRef.current > MAX_RETRIES) {
          goNextTrial();
        } else {
          setPhase("waiting");
          armTimer();
        }
      }, 900);
      return;
    }
    if (phase === "go" && goAtRef.current !== null) {
      const rt = Math.round(performance.now() - goAtRef.current);
      timesRef.current.push(rt);
      goNextTrial();
    }
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        Ronda {trialIndex + 1} de {TOTAL_TRIALS}
      </p>
      <button
        type="button"
        onClick={handleTargetClick}
        className={cn(
          "flex h-64 w-full select-none items-center justify-center rounded-2xl border-2 font-heading text-lg font-semibold transition-colors",
          phase === "go" &&
            "border-primary bg-primary text-primary-foreground",
          phase === "waiting" &&
            "border-dashed border-border bg-muted/40 text-muted-foreground",
          phase === "tooSoon" &&
            "border-destructive bg-destructive/10 text-destructive"
        )}
      >
        {phase === "go"
          ? "¡YA!"
          : phase === "tooSoon"
            ? "Muy pronto — esperá la señal"
            : "Prepárate…"}
      </button>
      <p className="text-xs text-muted-foreground">
        Hacé clic en el recuadro apenas cambie a &ldquo;¡YA!&rdquo;
      </p>
    </div>
  );
}
