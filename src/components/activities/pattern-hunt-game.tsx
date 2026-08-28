"use client";

import { Circle, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { StreakBadge } from "@/components/activities/streak-badge";
import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { playHit, playMiss } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

// Búsqueda por conjunción (Treisman & Gelade, 1980): el objetivo es una
// combinación específica de forma + color + tamaño (estrella violeta
// grande). Los distractores comparten una o dos de esas dimensiones
// (estrellas grises, círculos violeta, y estrellas violeta chicas como
// "casi-objetivo") — nada salta a la vista solo, exige revisar celda por
// celda contrarreloj.
const TOTAL_ROUNDS = 10;
const ROUND_TIME_LIMIT_MS = 7000;

type CellType =
  | "target"
  | "distractorStar"
  | "distractorCircle"
  | "distractorNear";

function gridSizeForRound(round: number): number {
  if (round < 2) return 5;
  if (round < 4) return 6;
  if (round < 6) return 7;
  if (round < 8) return 8;
  return 9;
}

// Pendiente de búsqueda (ms por celda extra): la señal diagnóstica clásica
// de atención selectiva serial — si el tiempo crece con el tamaño de la
// cuadrícula, la búsqueda es serial (esperado en conjunción); una
// pendiente ~0 indicaría búsqueda paralela/pop-out.
function linearSlope(xs: number[], ys: number[]): number {
  if (xs.length < 2) return 0;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den ? Math.round((num / den) * 10) / 10 : 0;
}

function generateRound(round: number): CellType[] {
  const size = gridSizeForRound(round);
  const count = size * size;
  const targetIndex = Math.floor(Math.random() * count);
  return Array.from({ length: count }, (_, i) => {
    if (i === targetIndex) return "target";
    const r = Math.random();
    if (r < 0.34) return "distractorStar";
    if (r < 0.67) return "distractorCircle";
    return "distractorNear";
  });
}

type Resolution = "none" | "found" | "timeout";

export function PatternHuntGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [round, setRound] = useState(0);
  const [cells, setCells] = useState<CellType[]>(() => generateRound(0));
  const [resolution, setResolution] = useState<Resolution>("none");
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [barActive, setBarActive] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const roundStartRef = useRef(0);
  const roundResolvedRef = useRef(false);
  const searchTimesRef = useRef<number[]>([]);
  const foundGridSizesRef = useRef<number[]>([]);
  const wrongClicksRef = useRef<number[]>([]);
  const gridSizesRef = useRef<number[]>([]);
  const timeoutsRef = useRef(0);
  const wrongThisRoundRef = useRef(0);
  const wrongClicksByTypeRef = useRef({
    distractorStar: 0,
    distractorCircle: 0,
    distractorNear: 0,
  });
  const clickSequenceRef = useRef<
    { round: number; cellIndex: number; timeSinceRoundStartMs: number; wasTarget: boolean }[]
  >([]);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const finishedRef = useRef(false);

  const size = gridSizeForRound(round);
  const targetIndex = cells.indexOf("target");

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const perfectRounds = wrongClicksRef.current.filter((w) => w === 0).length;
    const accuracy = Math.round((perfectRounds / TOTAL_ROUNDS) * 100);
    onFinish({
      accuracy,
      levelReached: gridSizeForRound(TOTAL_ROUNDS - 1),
      metrics: {
        searchTimesMs: searchTimesRef.current,
        wrongClicksPerRound: wrongClicksRef.current,
        gridSizes: gridSizesRef.current,
        searchSlopeMsPerCell: linearSlope(
          foundGridSizesRef.current.map((s) => s * s),
          searchTimesRef.current,
        ),
        wrongClicksByType: wrongClicksByTypeRef.current,
        clickSequencePerRound: clickSequenceRef.current,
        timeouts: timeoutsRef.current,
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
      },
    });
  }, [onFinish]);

  const advanceRound = useCallback(() => {
    setResolution("none");
    setBarActive(false);
    setWrongCell(null);
    if (round + 1 >= TOTAL_ROUNDS) {
      finishGame();
    } else {
      const nextRound = round + 1;
      setCells(generateRound(nextRound));
      setRound(nextRound);
    }
  }, [round, finishGame]);

  // Arranca el reloj de la ronda: tiempo límite fijo, el setState real va
  // dentro de los setTimeout/rAF, nunca de forma síncrona en el efecto.
  useEffect(() => {
    roundStartRef.current = performance.now();
    roundResolvedRef.current = false;
    wrongThisRoundRef.current = 0;
    const raf = requestAnimationFrame(() => setBarActive(true));
    const limitTimer = setTimeout(() => {
      if (roundResolvedRef.current) return;
      roundResolvedRef.current = true;
      timeoutsRef.current += 1;
      wrongClicksRef.current.push(wrongThisRoundRef.current + 1);
      gridSizesRef.current.push(size);
      streakRef.current = 0;
      setStreak(0);
      setResolution("timeout");
      playMiss();
      setTimeout(advanceRound, 700);
    }, ROUND_TIME_LIMIT_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(limitTimer);
    };
  }, [round, size, advanceRound]);

  const handleCellClick = useCallback(
    (i: number) => {
      if (roundResolvedRef.current || finishedRef.current) return;
      const clickedType = cells[i];
      const timeSinceRoundStartMs = Math.round(
        performance.now() - roundStartRef.current,
      );
      if (clickedType !== "target") {
        wrongThisRoundRef.current += 1;
        wrongClicksByTypeRef.current[clickedType] += 1;
        clickSequenceRef.current.push({
          round,
          cellIndex: i,
          timeSinceRoundStartMs,
          wasTarget: false,
        });
        setWrongCell(i);
        playMiss();
        setTimeout(() => setWrongCell(null), 300);
        return;
      }
      roundResolvedRef.current = true;
      clickSequenceRef.current.push({
        round,
        cellIndex: i,
        timeSinceRoundStartMs,
        wasTarget: true,
      });
      const elapsed = timeSinceRoundStartMs;
      searchTimesRef.current.push(elapsed);
      foundGridSizesRef.current.push(size);
      wrongClicksRef.current.push(wrongThisRoundRef.current);
      gridSizesRef.current.push(size);

      const perfect = wrongThisRoundRef.current === 0;
      const points = Math.max(50, 400 - Math.round(elapsed / 10)) + (perfect ? 100 : 0);
      scoreRef.current += points;
      streakRef.current = perfect ? streakRef.current + 1 : 0;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setResolution("found");
      playHit();

      setTimeout(advanceRound, 500);
    },
    [cells, size, round, advanceRound],
  );

  return (
    <div className="space-y-3 text-center">
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
          className="h-full rounded-full bg-pulse"
          style={{
            width: barActive ? "0%" : "100%",
            transition: barActive ? `width ${ROUND_TIME_LIMIT_MS}ms linear` : "none",
          }}
        />
      </div>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Star className="size-3.5 text-primary" /> Encontrá la única estrella
        violeta grande
      </p>
      <div
        className="mx-auto grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          maxWidth: `${size * 3.2}rem`,
        }}
      >
        {cells.map((type, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCellClick(i)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border border-border bg-muted/40 transition-colors hover:bg-muted",
              resolution === "found" &&
                i === targetIndex &&
                "animate-pop border-primary bg-primary/10",
              resolution === "timeout" &&
                i === targetIndex &&
                "border-destructive/50 bg-destructive/10",
              wrongCell === i && "border-destructive bg-destructive/20",
            )}
            aria-label={type === "target" ? "Objetivo" : "Distractor"}
          >
            {type === "distractorStar" && (
              <Star className="size-4 text-muted-foreground" />
            )}
            {type === "distractorCircle" && (
              <Circle className="size-4 text-primary" />
            )}
            {type === "distractorNear" && (
              <Star className="size-2.5 text-primary" />
            )}
            {type === "target" && <Star className="size-4 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}
