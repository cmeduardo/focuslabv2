"use client";

import { Circle, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { cn } from "@/lib/utils";

// Búsqueda por conjunción (Treisman & Gelade, 1980): el objetivo es una
// combinación específica de forma + color (estrella violeta). Los
// distractores comparten UNA de las dos dimensiones (estrellas grises,
// círculos violeta) — ninguna "salta a la vista" sola, así que exige
// revisar celda por celda en vez de una detección preatentiva.
const TOTAL_ROUNDS = 8;

type CellType = "target" | "distractorStar" | "distractorCircle";

function gridSizeForRound(round: number): number {
  if (round < 2) return 5;
  if (round < 4) return 6;
  if (round < 6) return 7;
  return 8;
}

function generateRound(round: number): CellType[] {
  const size = gridSizeForRound(round);
  const count = size * size;
  const targetIndex = Math.floor(Math.random() * count);
  return Array.from({ length: count }, (_, i) =>
    i === targetIndex
      ? "target"
      : Math.random() < 0.5
        ? "distractorStar"
        : "distractorCircle",
  );
}

export function PatternHuntGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [round, setRound] = useState(0);
  const [cells, setCells] = useState<CellType[]>(() => generateRound(0));
  const [found, setFound] = useState(false);
  const roundStartRef = useRef(0);
  const searchTimesRef = useRef<number[]>([]);
  const wrongClicksRef = useRef<number[]>([]);
  const gridSizesRef = useRef<number[]>([]);
  const wrongThisRoundRef = useRef(0);
  const finishedRef = useRef(false);

  const size = gridSizeForRound(round);
  const targetIndex = cells.indexOf("target");

  // Marca el inicio de la primera ronda (ref, no estado) al montar.
  useEffect(() => {
    roundStartRef.current = performance.now();
  }, []);

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
      },
    });
  }, [onFinish]);

  const handleCellClick = useCallback(
    (i: number) => {
      if (found || finishedRef.current) return;
      if (cells[i] !== "target") {
        wrongThisRoundRef.current += 1;
        return;
      }
      const elapsed = Math.round(performance.now() - roundStartRef.current);
      searchTimesRef.current.push(elapsed);
      wrongClicksRef.current.push(wrongThisRoundRef.current);
      gridSizesRef.current.push(size);
      setFound(true);
      setTimeout(() => {
        if (round + 1 >= TOTAL_ROUNDS) {
          finishGame();
        } else {
          const nextRound = round + 1;
          wrongThisRoundRef.current = 0;
          roundStartRef.current = performance.now();
          setCells(generateRound(nextRound));
          setFound(false);
          setRound(nextRound);
        }
      }, 500);
    },
    [found, cells, round, size, finishGame],
  );

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Ronda {round + 1} de {TOTAL_ROUNDS}
        </span>
        <span className="flex items-center gap-1.5">
          <Star className="size-3.5 text-primary" /> Encontrá la única estrella violeta
        </span>
      </div>
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
              found && i === targetIndex && "border-primary bg-primary/10",
            )}
            aria-label={type === "target" ? "Objetivo" : "Distractor"}
          >
            {type === "distractorStar" && (
              <Star className="size-4 text-muted-foreground" />
            )}
            {type === "distractorCircle" && (
              <Circle className="size-4 text-primary" />
            )}
            {type === "target" && <Star className="size-4 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}
