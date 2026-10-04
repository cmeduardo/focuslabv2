import type { PatternHuntConfig } from "@/lib/activities/config";
import { shuffle, uniform, type Rng } from "@/lib/activities/rng";
import type { RoundMode } from "@/lib/activities/types";

// Objetivo: óvalo vertical. Solo forma y orientación (nunca color).
//   Rasgo:      distractores = barras verticales (difiere solo en forma).
//   Conjunción: distractores = óvalos horizontales + barras verticales
//               (comparte forma con unos y orientación con otros).
export type SearchType = "feature" | "conjunction";
export type ItemShape = "oval" | "bar";
export type ItemOrientation = "vertical" | "horizontal";

export type SearchItem = {
  // Centro del elemento, en unidades del tablero (0–1).
  x: number;
  y: number;
  shape: ItemShape;
  orientation: ItemOrientation;
  isTarget: boolean;
};

export type PatternHuntTrialPlan = {
  type: SearchType;
  setSize: number;
  present: boolean;
  items: SearchItem[];
};

function distractorFor(type: SearchType, i: number): Pick<SearchItem, "shape" | "orientation"> {
  if (type === "feature") return { shape: "bar", orientation: "vertical" };
  return i % 2 === 0
    ? { shape: "oval", orientation: "horizontal" }
    : { shape: "bar", orientation: "vertical" };
}

// Cada elemento ocupa una celda distinta de la grilla, con un jitter menor
// a media celda: nunca se superponen, a cualquier tamaño de pantalla.
export function layoutSearchItems(
  type: SearchType,
  setSize: number,
  present: boolean,
  config: Pick<PatternHuntConfig, "gridCols" | "gridRows" | "jitter">,
  rng: Rng,
): SearchItem[] {
  const cells = shuffle(
    Array.from({ length: config.gridCols * config.gridRows }, (_, i) => i),
    rng,
  ).slice(0, setSize);
  const kinds = shuffle(
    Array.from({ length: setSize }, (_, i) =>
      present && i === 0
        ? { shape: "oval" as const, orientation: "vertical" as const, isTarget: true }
        : { ...distractorFor(type, i), isTarget: false },
    ),
    rng,
  );
  return cells.map((cell, i) => {
    const col = cell % config.gridCols;
    const row = Math.floor(cell / config.gridCols);
    return {
      x: (col + 0.5 + uniform(rng, -config.jitter, config.jitter)) / config.gridCols,
      y: (row + 0.5 + uniform(rng, -config.jitter, config.jitter)) / config.gridRows,
      ...kinds[i],
    };
  });
}

export function planPatternHuntTrials(
  config: PatternHuntConfig,
  mode: RoundMode,
  rng: Rng,
): PatternHuntTrialPlan[] {
  const types: SearchType[] = ["feature", "conjunction"];
  const cellsDesign = types.flatMap((type) =>
    config.setSizes.flatMap((setSize) =>
      [true, false].map((present) => ({ type, setSize, present })),
    ),
  );

  const design =
    mode === "practice"
      ? shuffle(cellsDesign, rng)
          .filter((d) => d.setSize !== config.setSizes[config.setSizes.length - 1])
          .slice(0, config.practiceTrials)
      : shuffle(
          cellsDesign.flatMap((d) => Array.from({ length: config.repetitionsPerCell }, () => d)),
          rng,
        );

  return design.map((d) => ({
    ...d,
    items: layoutSearchItems(d.type, d.setSize, d.present, config, rng),
  }));
}
