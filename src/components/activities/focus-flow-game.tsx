"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StreakBadge } from "@/components/activities/streak-badge";
import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { playHit, playMiss } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

// Sustained Attention to Response Task (SART, Robertson et al., 1997) con
// incertidumbre espacial: el estímulo aparece a cadencia fija pero en una
// de 9 celdas al azar — hay que ubicarlo cada vez, no solo mirar un punto
// fijo. Responder al frecuente (círculo), inhibir el infrecuente
// (cuadrado). La monotonía de fondo es intencional: exige atención
// sostenida real.
const TOTAL_DURATION_MS = 90_000;
const SOA_MS = 1400;
const VISIBLE_MS = 800;
const NOGO_CHANCE = 0.2;
const TOTAL_TRIALS = Math.floor(TOTAL_DURATION_MS / SOA_MS);
const MAX_METER_STREAK = 15;
const GRID_SLOTS = 9;

type StimulusKind = "go" | "noGo";

export function FocusFlowGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [trialIndex, setTrialIndex] = useState(0);
  const [stimulus, setStimulus] = useState<StimulusKind | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fx, setFx] = useState<"pop" | "shake" | null>(null);
  const [fxKey, setFxKey] = useState(0);
  const hitsRef = useRef(0);
  const omissionsRef = useRef(0);
  const commissionsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const commissionTimesRef = useRef<number[]>([]);
  const trialOutcomesRef = useRef<("hit" | "omission" | "commission" | "inhibit")[]>([]);
  const stimulusAtRef = useRef<number | null>(null);
  const currentKindRef = useRef<StimulusKind | null>(null);
  const currentSlotRef = useRef<number | null>(null);
  const respondedRef = useRef(false);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const bestStreakRef = useRef(0);
  const finishedRef = useRef(false);

  function applyOutcome(kind: "hit" | "inhibit" | "miss", points = 0) {
    if (kind === "miss") {
      streakRef.current = 0;
    } else {
      streakRef.current += 1;
      scoreRef.current += points;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
    }
    setStreak(streakRef.current);
    setScore(scoreRef.current);
    if (kind !== "inhibit") {
      setFx(kind === "hit" ? "pop" : "shake");
      setFxKey((k) => k + 1);
    }
  }

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const hits = hitsRef.current;
    const omissions = omissionsRef.current;
    const commissions = commissionsRef.current;
    const accuracy =
      hits + omissions ? Math.round((hits / (hits + omissions)) * 100) : 0;
    const rt = reactionTimesRef.current;
    const avgMs = rt.length
      ? Math.round(rt.reduce((a, b) => a + b, 0) / rt.length)
      : 0;
    const rtSD = rt.length
      ? Math.round(
          Math.sqrt(rt.reduce((sum, t) => sum + (t - avgMs) ** 2, 0) / rt.length),
        )
      : 0;
    // Decaimiento de vigilancia: tasa de omisión en cada tercio de la
    // prueba — la señal clásica de que la atención sostenida decae con el
    // tiempo (o no).
    const outcomes = trialOutcomesRef.current;
    const thirdSize = Math.ceil(outcomes.length / 3) || 1;
    const omissionRateFor = (slice: typeof outcomes) => {
      const goTrials = slice.filter((o) => o === "hit" || o === "omission");
      return goTrials.length
        ? Math.round(
            (slice.filter((o) => o === "omission").length / goTrials.length) * 100,
          )
        : 0;
    };
    const omissionsByThird = [
      omissionRateFor(outcomes.slice(0, thirdSize)),
      omissionRateFor(outcomes.slice(thirdSize, thirdSize * 2)),
      omissionRateFor(outcomes.slice(thirdSize * 2)),
    ];
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        hits,
        omissions,
        commissions,
        reactionTimesMs: rt,
        avgReactionMs: avgMs,
        reactionRtSD: rtSD,
        commissionTimesMs: commissionTimesRef.current,
        omissionsByThirdPct: omissionsByThird,
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
      },
    });
  }, [onFinish]);

  // Cada ensayo decide go/no-go y una celda al azar donde mostrarlo. El
  // setState real ocurre dentro de los setTimeout, nunca de forma síncrona.
  useEffect(() => {
    if (finishedRef.current) return;
    if (trialIndex >= TOTAL_TRIALS) {
      const endTimer = setTimeout(finishGame, 0);
      return () => clearTimeout(endTimer);
    }

    const kind: StimulusKind = Math.random() < NOGO_CHANCE ? "noGo" : "go";
    const slot = Math.floor(Math.random() * GRID_SLOTS);

    const showTimer = setTimeout(() => {
      currentKindRef.current = kind;
      currentSlotRef.current = slot;
      respondedRef.current = false;
      stimulusAtRef.current = performance.now();
      setStimulus(kind);
      setActiveSlot(slot);
    }, 0);

    const hideTimer = setTimeout(() => {
      setStimulus(null);
      setActiveSlot(null);
      if (!respondedRef.current) {
        if (kind === "go") {
          omissionsRef.current += 1;
          trialOutcomesRef.current.push("omission");
          applyOutcome("miss");
        } else {
          trialOutcomesRef.current.push("inhibit");
          applyOutcome("inhibit", 25);
        }
      }
      currentKindRef.current = null;
      currentSlotRef.current = null;
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

  const handleSlotClick = useCallback((slot: number) => {
    if (
      respondedRef.current ||
      finishedRef.current ||
      !currentKindRef.current ||
      currentSlotRef.current !== slot
    ) {
      return;
    }
    respondedRef.current = true;
    let rt = 0;
    if (stimulusAtRef.current !== null) {
      rt = Math.round(performance.now() - stimulusAtRef.current);
    }
    if (currentKindRef.current === "go") {
      hitsRef.current += 1;
      reactionTimesRef.current.push(rt);
      trialOutcomesRef.current.push("hit");
      playHit();
      applyOutcome("hit", Math.max(20, 320 - rt));
    } else {
      commissionsRef.current += 1;
      commissionTimesRef.current.push(rt);
      trialOutcomesRef.current.push("commission");
      playMiss();
      applyOutcome("miss");
    }
  }, []);

  const meterPct = Math.min(100, (streak / MAX_METER_STREAK) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Hacé clic apenas veas un <span className="text-primary">círculo violeta</span>. Si es un <span className="text-pulse">cuadrado coral</span>, no hagas nada.
        </span>
        <span className="flex items-center gap-2 font-heading font-semibold text-foreground">
          {score}
          <StreakBadge streak={streak} />
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${meterPct}%` }}
        />
      </div>
      <div
        key={fxKey}
        className={cn(
          "mx-auto grid w-fit grid-cols-3 gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-4",
          fx === "shake" && "animate-shake",
        )}
      >
        {Array.from({ length: GRID_SLOTS }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSlotClick(i)}
            className="flex size-24 items-center justify-center rounded-xl border border-border bg-background/60"
          >
            {activeSlot === i && stimulus === "go" && (
              <span
                className={cn("size-14 rounded-full bg-primary", fx === "pop" && "animate-pop")}
              />
            )}
            {activeSlot === i && stimulus === "noGo" && (
              <span className="size-14 rounded-lg bg-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
