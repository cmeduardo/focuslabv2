"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { cn } from "@/lib/utils";

const GAME_DURATION_MS = 30_000;
const DISTRACTOR_CHANCE = 0.25;

type Tier = { spawnMin: number; spawnMax: number; windowMs: number };
const TIERS: Tier[] = [
  { spawnMin: 1600, spawnMax: 2000, windowMs: 800 },
  { spawnMin: 1300, spawnMax: 1700, windowMs: 650 },
  { spawnMin: 1000, spawnMax: 1400, windowMs: 550 },
];

type Spawn = {
  id: number;
  kind: "target" | "distractor";
  top: number;
  left: number;
};

export function FocusFlowGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS);
  const [spawn, setSpawn] = useState<Spawn | null>(null);
  const startRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const spawnAtRef = useRef<number | null>(null);
  const spawnIdRef = useRef(0);
  const finishedRef = useRef(false);
  const tierReachedRef = useRef(1);

  const currentTier = useCallback(() => {
    const elapsed = performance.now() - startRef.current;
    const tierIndex = Math.min(
      TIERS.length - 1,
      Math.floor(elapsed / (GAME_DURATION_MS / TIERS.length)),
    );
    tierReachedRef.current = tierIndex + 1;
    return TIERS[tierIndex];
  }, []);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const hits = hitsRef.current;
    const misses = missesRef.current;
    const falseAlarms = falseAlarmsRef.current;
    const total = hits + misses + falseAlarms;
    const accuracy = total ? Math.round((hits / total) * 100) : 0;
    onFinish({
      accuracy,
      levelReached: tierReachedRef.current,
      metrics: {
        hits,
        misses,
        falseAlarms,
        reactionTimesMs: reactionTimesRef.current,
      },
    });
  }, [onFinish]);

  // Marca el inicio real del juego (ref, no estado) al montar.
  useEffect(() => {
    startRef.current = performance.now();
  }, []);

  // Corte a los 30s y contador visible — independiente del ciclo de spawns.
  useEffect(() => {
    const endTimer = setTimeout(finishGame, GAME_DURATION_MS);
    const tick = setInterval(() => {
      setTimeLeft(
        Math.max(0, GAME_DURATION_MS - (performance.now() - startRef.current)),
      );
    }, 200);
    return () => {
      clearTimeout(endTimer);
      clearInterval(tick);
    };
  }, [finishGame]);

  // Cuando no hay objetivo/distractor visible, programa el siguiente. El
  // setState real ocurre dentro del setTimeout, nunca de forma síncrona acá.
  useEffect(() => {
    if (finishedRef.current || spawn !== null) return;
    const tier = currentTier();
    const delay =
      tier.spawnMin + Math.random() * (tier.spawnMax - tier.spawnMin);
    const id = setTimeout(() => {
      const isDistractor = Math.random() < DISTRACTOR_CHANCE;
      spawnAtRef.current = performance.now();
      setSpawn({
        id: ++spawnIdRef.current,
        kind: isDistractor ? "distractor" : "target",
        top: 10 + Math.random() * 70,
        left: 10 + Math.random() * 70,
      });
    }, delay);
    return () => clearTimeout(id);
  }, [spawn, currentTier]);

  // Mientras haya un objetivo/distractor visible, lo hace expirar si nadie
  // hace clic dentro de la ventana de la dificultad actual.
  useEffect(() => {
    if (!spawn) return;
    const tier = currentTier();
    const id = setTimeout(() => {
      setSpawn((current) => {
        if (current?.id !== spawn.id) return current;
        if (current.kind === "target") missesRef.current += 1;
        return null;
      });
    }, tier.windowMs);
    return () => clearTimeout(id);
  }, [spawn, currentTier]);

  function handleSpawnClick() {
    if (!spawn || finishedRef.current) return;
    if (spawn.kind === "target") {
      hitsRef.current += 1;
      if (spawnAtRef.current !== null) {
        reactionTimesRef.current.push(
          Math.round(performance.now() - spawnAtRef.current),
        );
      }
    } else {
      falseAlarmsRef.current += 1;
    }
    setSpawn(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Hacé clic solo en el círculo <span className="text-primary">violeta</span>. Ignorá el <span className="text-pulse">coral</span>.
        </span>
        <span className="font-heading font-semibold text-foreground">
          {Math.ceil(timeLeft / 1000)}s
        </span>
      </div>
      <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-dashed border-border bg-muted/30">
        {spawn && (
          <button
            type="button"
            onClick={handleSpawnClick}
            style={{ top: `${spawn.top}%`, left: `${spawn.left}%` }}
            className={cn(
              "absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform active:scale-90",
              spawn.kind === "target" ? "bg-primary" : "bg-pulse",
            )}
            aria-label={spawn.kind === "target" ? "Objetivo" : "Distractor"}
          />
        )}
      </div>
    </div>
  );
}
