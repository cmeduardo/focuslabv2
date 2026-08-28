"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StreakBadge } from "@/components/activities/streak-badge";
import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { playCombo, playHit, playMiss } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

// Multiple Object Tracking (Pylyshyn & Storm, 1988): en cada ronda se
// resaltan unos pocos puntos entre varios ("blancos"), luego todos quedan
// idénticos y se mueven al azar durante unos segundos — hay que seguirlos
// con la mirada sin perderlos — y al detenerse, marcar cuáles eran los
// blancos originales. Es el paradigma real detrás de "seguimiento visual
// continuo" (el one-liner de la tesis para Focus Flow), y una mecánica
// distinta al resto de las actividades del sprint (nada más usa
// movimiento continuo). El movimiento vive en refs y se escribe
// directamente al DOM vía requestAnimationFrame — nunca por setState — el
// setState real ocurre solo en cambios de fase, no cuadro a cuadro.
const TOTAL_ROUNDS = 8;
const FLASH_MS = 1800;
const RESOLVE_PAUSE_MS = 700;
const MAX_DOTS = 13;

function dotsForRound(round: number) {
  return Math.min(6 + round, MAX_DOTS);
}
function targetsForRound(round: number) {
  return round < 3 ? 2 : 3;
}
function speedForRound(round: number) {
  return 44 + round * 9; // px/s
}
function trackMsForRound(round: number) {
  return 4200 + round * 450;
}
function diameterForRound(round: number) {
  return Math.max(18, 28 - round);
}

type Dot = { x: number; y: number; vx: number; vy: number; isTarget: boolean };
type Phase = "flash" | "tracking" | "recall";

function generateDots(
  round: number,
  width: number,
  height: number,
): Dot[] {
  const count = dotsForRound(round);
  const targetCount = targetsForRound(round);
  const speed = speedForRound(round);
  const radius = diameterForRound(round) / 2;
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    let x = radius;
    let y = radius;
    for (let attempt = 0; attempt < 20; attempt++) {
      x = radius + Math.random() * Math.max(1, width - radius * 2);
      y = radius + Math.random() * Math.max(1, height - radius * 2);
      const tooClose = dots.some(
        (d) => Math.hypot(d.x - x, d.y - y) < radius * 2.4,
      );
      if (!tooClose) break;
    }
    const angle = Math.random() * Math.PI * 2;
    dots.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      isTarget: false,
    });
  }
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (const i of indices.slice(0, targetCount)) {
    dots[i].isTarget = true;
  }
  return dots;
}

export function FocusFlowGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("flash");
  const [activeCount, setActiveCount] = useState(() => dotsForRound(0));
  const [targetSet, setTargetSet] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Map<number, boolean>>(new Map());
  const [barActive, setBarActive] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const arenaRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dotsRef = useRef<Dot[]>([]);
  const arenaSizeRef = useRef({ width: 320, height: 288 });
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const trackStartRef = useRef(0);
  const trackMsRef = useRef(0);
  const recallStartRef = useRef(0);
  const recallFirstClickRef = useRef<number | null>(null);
  const lastPickAtRef = useRef(0);
  const pickLatenciesThisRoundRef = useRef<number[]>([]);
  const falsePositiveDistancesThisRoundRef = useRef<number[]>([]);
  const correctThisRoundRef = useRef(0);
  const falseThisRoundRef = useRef(0);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const bestStreakRef = useRef(0);
  const finishedRef = useRef(false);

  const targetsPerRoundRef = useRef<number[]>([]);
  const correctPerRoundRef = useRef<number[]>([]);
  const falsePositivesPerRoundRef = useRef<number[]>([]);
  const missedPerRoundRef = useRef<number[]>([]);
  const speedPerRoundRef = useRef<number[]>([]);
  const dotsPerRoundRef = useRef<number[]>([]);
  const trackingDurationMsPerRoundRef = useRef<number[]>([]);
  const recallLatencyMsRef = useRef<number[]>([]);
  const pickLatenciesMsPerRoundRef = useRef<number[][]>([]);
  const falsePositiveDistancesPxPerRoundRef = useRef<number[][]>([]);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const totalTargets = targetsPerRoundRef.current.reduce((a, b) => a + b, 0);
    const totalCorrect = correctPerRoundRef.current.reduce((a, b) => a + b, 0);
    const accuracy = totalTargets
      ? Math.round((totalCorrect / totalTargets) * 100)
      : 0;
    onFinish({
      accuracy,
      levelReached: dotsPerRoundRef.current[dotsPerRoundRef.current.length - 1] ?? null,
      metrics: {
        targetsPerRound: targetsPerRoundRef.current,
        correctPerRound: correctPerRoundRef.current,
        falsePositivesPerRound: falsePositivesPerRoundRef.current,
        missedPerRound: missedPerRoundRef.current,
        speedPxPerSec: speedPerRoundRef.current,
        dotsPerRound: dotsPerRoundRef.current,
        trackingDurationMsPerRound: trackingDurationMsPerRoundRef.current,
        recallLatencyMs: recallLatencyMsRef.current,
        pickLatenciesMsPerRound: pickLatenciesMsPerRoundRef.current,
        falsePositiveDistancesPxPerRound: falsePositiveDistancesPxPerRoundRef.current,
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
      },
    });
  }, [onFinish]);

  // --dot-x/--dot-y son la fuente de verdad de la posición: además de
  // aplicarlas directo acá, las animaciones de acierto/error en recall
  // (animate-dot-pop/animate-dot-shake, globals.css) las leen para no
  // perder la posición — un transform de CSS (scale/translateX) pisa por
  // completo cualquier translate inline si no se combinan explícitamente.
  const writeTransform = useCallback((i: number, d: Dot, radius: number) => {
    const node = nodeRefs.current[i];
    if (node) {
      const x = `${d.x - radius}px`;
      const y = `${d.y - radius}px`;
      node.style.setProperty("--dot-x", x);
      node.style.setProperty("--dot-y", y);
      node.style.transform = `translate(${x}, ${y})`;
    }
  }, []);

  const startTracking = useCallback(() => {
    setPhase("tracking");
    setTargetSet(new Set());
    setBarActive(false);
    requestAnimationFrame(() => setBarActive(true));
    trackStartRef.current = performance.now();
    lastFrameRef.current = performance.now();
    const radius = diameterForRound(round) / 2;
    const { width, height } = arenaSizeRef.current;

    const loop = (now: number) => {
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;
      const dots = dotsRef.current;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.x - radius < 0) {
          d.x = radius;
          d.vx = Math.abs(d.vx);
        } else if (d.x + radius > width) {
          d.x = width - radius;
          d.vx = -Math.abs(d.vx);
        }
        if (d.y - radius < 0) {
          d.y = radius;
          d.vy = Math.abs(d.vy);
        } else if (d.y + radius > height) {
          d.y = height - radius;
          d.vy = -Math.abs(d.vy);
        }
        writeTransform(i, d, radius);
      }
      if (now - trackStartRef.current >= trackMsRef.current) {
        recallStartRef.current = performance.now();
        lastPickAtRef.current = recallStartRef.current;
        recallFirstClickRef.current = null;
        setPhase("recall");
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [round, writeTransform]);

  // Arma la ronda: mide la arena, genera puntos y blancos, y programa el
  // fin de la fase de flash. El setState real ocurre en callbacks
  // (setTimeout / rAF), nunca de forma síncrona en el efecto.
  useEffect(() => {
    if (finishedRef.current) return;
    const rect = arenaRef.current?.getBoundingClientRect();
    const width = rect?.width || arenaSizeRef.current.width;
    const height = rect?.height || arenaSizeRef.current.height;
    arenaSizeRef.current = { width, height };

    const dots = generateDots(round, width, height);
    dotsRef.current = dots;
    trackMsRef.current = trackMsForRound(round);
    correctThisRoundRef.current = 0;
    falseThisRoundRef.current = 0;
    pickLatenciesThisRoundRef.current = [];
    falsePositiveDistancesThisRoundRef.current = [];

    const radius = diameterForRound(round) / 2;
    dots.forEach((d, i) => writeTransform(i, d, radius));

    setActiveCount(dots.length);
    setPhase("flash");
    setSelected(new Map());
    setTargetSet(new Set(dots.flatMap((d, i) => (d.isTarget ? [i] : []))));

    const flashTimer = setTimeout(startTracking, FLASH_MS);
    return () => {
      clearTimeout(flashTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [round, startTracking, writeTransform]);

  const advanceRound = useCallback(() => {
    if (round + 1 >= TOTAL_ROUNDS) {
      finishGame();
    } else {
      setRound((r) => r + 1);
    }
  }, [round, finishGame]);

  const handleDotClick = useCallback(
    (i: number) => {
      if (phase !== "recall" || finishedRef.current) return;
      if (selected.has(i)) return;
      const targetCount = targetsForRound(round);
      if (selected.size >= targetCount) return;
      const now = performance.now();
      if (recallFirstClickRef.current === null) {
        recallFirstClickRef.current = now;
      }
      pickLatenciesThisRoundRef.current.push(Math.round(now - lastPickAtRef.current));
      lastPickAtRef.current = now;

      const dot = dotsRef.current[i];
      const isCorrect = dot.isTarget;
      if (isCorrect) {
        correctThisRoundRef.current += 1;
        streakRef.current += 1;
        scoreRef.current += 100 + Math.min(streakRef.current, 10) * 10;
        bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
        if (streakRef.current % 5 === 0) playCombo();
        playHit();
      } else {
        falseThisRoundRef.current += 1;
        streakRef.current = 0;
        // Distancia del clic errado al blanco real más cercano (posiciones
        // ya congeladas al detenerse) — confundir con un distractor
        // cercano es distinto de adivinar al azar.
        const targets = dotsRef.current.filter((d) => d.isTarget);
        const nearestTargetDistance = targets.length
          ? Math.round(
              Math.min(...targets.map((t) => Math.hypot(t.x - dot.x, t.y - dot.y))),
            )
          : 0;
        falsePositiveDistancesThisRoundRef.current.push(nearestTargetDistance);
        playMiss();
      }
      setStreak(streakRef.current);
      setScore(scoreRef.current);

      const nextSelected = new Map(selected);
      nextSelected.set(i, isCorrect);
      setSelected(nextSelected);

      if (nextSelected.size >= targetCount) {
        const missed = dotsRef.current.filter((d) => d.isTarget).length -
          correctThisRoundRef.current;
        targetsPerRoundRef.current.push(targetCount);
        correctPerRoundRef.current.push(correctThisRoundRef.current);
        falsePositivesPerRoundRef.current.push(falseThisRoundRef.current);
        missedPerRoundRef.current.push(missed);
        speedPerRoundRef.current.push(speedForRound(round));
        dotsPerRoundRef.current.push(dotsRef.current.length);
        trackingDurationMsPerRoundRef.current.push(trackMsRef.current);
        recallLatencyMsRef.current.push(
          recallFirstClickRef.current !== null
            ? Math.round(recallFirstClickRef.current - recallStartRef.current)
            : 0,
        );
        pickLatenciesMsPerRoundRef.current.push(pickLatenciesThisRoundRef.current);
        falsePositiveDistancesPxPerRoundRef.current.push(
          falsePositiveDistancesThisRoundRef.current,
        );
        setTimeout(advanceRound, RESOLVE_PAUSE_MS);
      }
    },
    [phase, round, selected, advanceRound],
  );

  const phaseLabel =
    phase === "flash"
      ? "Memorizá estos puntos…"
      : phase === "tracking"
        ? "Seguilos con la mirada…"
        : "¿Cuáles eran los blancos?";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Ronda {round + 1} de {TOTAL_ROUNDS}
        </span>
        <span className="flex items-center gap-2 font-heading font-semibold text-foreground">
          {score}
          <StreakBadge streak={streak} />
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: barActive ? "0%" : "100%",
            transition:
              phase === "tracking" && barActive
                ? `width ${trackMsForRound(round)}ms linear`
                : "none",
            opacity: phase === "tracking" ? 1 : 0,
          }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">{phaseLabel}</p>
      <div
        ref={arenaRef}
        className="relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-2xl border border-dashed border-border bg-muted/20"
      >
        {Array.from({ length: MAX_DOTS }).map((_, i) => {
          const isActive = i < activeCount;
          const isTarget = targetSet.has(i);
          const pick = selected.get(i);
          const diameter = diameterForRound(round);
          return (
            <button
              key={i}
              type="button"
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              onClick={() => handleDotClick(i)}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              style={{
                width: diameter,
                height: diameter,
                display: isActive ? "block" : "none",
              }}
              className={cn(
                "absolute left-0 top-0 rounded-full border-2 border-transparent",
                phase === "flash" && isTarget && "animate-dot-pop bg-primary ring-4 ring-primary/30",
                phase === "flash" && !isTarget && "bg-muted-foreground/40",
                phase === "tracking" && "bg-muted-foreground/70",
                phase === "recall" &&
                  pick === undefined &&
                  "cursor-pointer bg-muted-foreground/70 hover:bg-muted-foreground",
                phase === "recall" &&
                  pick === true &&
                  "animate-dot-pop border-primary bg-primary/80",
                phase === "recall" &&
                  pick === false &&
                  "animate-dot-shake border-destructive bg-destructive/60",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
