"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActivityOutcome } from "@/hooks/use-activity-result";

// Sustained Attention to Response Task (SART, Robertson et al., 1997):
// flujo central de estímulos a cadencia fija — responder a cada uno
// excepto al infrecuente, que hay que inhibir. La monotonía es
// intencional: es lo que hace que la tarea exija atención sostenida real.
const TOTAL_DURATION_MS = 90_000;
const SOA_MS = 900;
const VISIBLE_MS = 350;
const NOGO_CHANCE = 0.2;
const TOTAL_TRIALS = Math.floor(TOTAL_DURATION_MS / SOA_MS);

type StimulusKind = "go" | "noGo";

export function FocusFlowGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [trialIndex, setTrialIndex] = useState(0);
  const [stimulus, setStimulus] = useState<StimulusKind | null>(null);
  const hitsRef = useRef(0);
  const omissionsRef = useRef(0);
  const commissionsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const stimulusAtRef = useRef<number | null>(null);
  const currentKindRef = useRef<StimulusKind | null>(null);
  const respondedRef = useRef(false);
  const finishedRef = useRef(false);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const hits = hitsRef.current;
    const omissions = omissionsRef.current;
    const commissions = commissionsRef.current;
    const accuracy =
      hits + omissions ? Math.round((hits / (hits + omissions)) * 100) : 0;
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        hits,
        omissions,
        commissions,
        reactionTimesMs: reactionTimesRef.current,
      },
    });
  }, [onFinish]);

  // Cada ensayo decide go/no-go y lo muestra un instante fijo. El setState
  // real ocurre dentro de los setTimeout, nunca de forma síncrona acá.
  useEffect(() => {
    if (finishedRef.current) return;
    if (trialIndex >= TOTAL_TRIALS) {
      const endTimer = setTimeout(finishGame, 0);
      return () => clearTimeout(endTimer);
    }

    const kind: StimulusKind = Math.random() < NOGO_CHANCE ? "noGo" : "go";

    const showTimer = setTimeout(() => {
      currentKindRef.current = kind;
      respondedRef.current = false;
      stimulusAtRef.current = performance.now();
      setStimulus(kind);
    }, 0);

    const hideTimer = setTimeout(() => {
      setStimulus(null);
      if (kind === "go" && !respondedRef.current) {
        omissionsRef.current += 1;
      }
      currentKindRef.current = null;
    }, VISIBLE_MS);

    const nextTimer = setTimeout(() => {
      setTrialIndex((i) => i + 1);
    }, SOA_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [trialIndex, finishGame]);

  function handleStimulusClick() {
    if (respondedRef.current || finishedRef.current || !currentKindRef.current) {
      return;
    }
    respondedRef.current = true;
    if (currentKindRef.current === "go") {
      hitsRef.current += 1;
      if (stimulusAtRef.current !== null) {
        reactionTimesRef.current.push(
          Math.round(performance.now() - stimulusAtRef.current),
        );
      }
    } else {
      commissionsRef.current += 1;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Hacé clic en cada <span className="text-primary">círculo violeta</span>. Cuando aparezca un <span className="text-pulse">cuadrado coral</span>, no hagas nada.
        </span>
        <span className="font-heading font-semibold text-foreground">
          {Math.min(trialIndex + 1, TOTAL_TRIALS)}/{TOTAL_TRIALS}
        </span>
      </div>
      <button
        type="button"
        onClick={handleStimulusClick}
        disabled={!stimulus}
        className="flex h-72 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 disabled:cursor-default"
      >
        {stimulus === "go" && <span className="size-16 rounded-full bg-primary" />}
        {stimulus === "noGo" && <span className="size-16 rounded-lg bg-pulse" />}
      </button>
    </div>
  );
}
