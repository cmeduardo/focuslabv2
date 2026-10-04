import type { FocusFlowConfig } from "@/lib/activities/config";
import { shuffle, type Rng } from "@/lib/activities/rng";
import type { RoundMode } from "@/lib/activities/types";

export type FocusFlowTrialPlan = {
  digit: number;
  isTarget: boolean;
  fontSizeRem: number;
};

// Secuencia SART: cada dígito del 1 al 9 el mismo número de veces, en orden
// aleatorio, sin dos objetivos seguidos (dos "3" consecutivos dejarían de
// ser un evento infrecuente e inesperado).
export function planFocusFlowTrials(
  config: FocusFlowConfig,
  mode: RoundMode,
  rng: Rng,
): FocusFlowTrialPlan[] {
  const sizeAt = () =>
    config.fontSizesRem[Math.floor(rng() * config.fontSizesRem.length)];

  if (mode === "practice") {
    // Práctica corta con un único objetivo, en una posición intermedia.
    const others = shuffle(
      [1, 2, 4, 5, 6, 7, 8, 9].filter((d) => d !== config.targetDigit),
      rng,
    ).slice(0, config.practiceTrials - 1);
    const targetAt = 2 + Math.floor(rng() * (config.practiceTrials - 3));
    others.splice(targetAt, 0, config.targetDigit);
    return others.map((digit) => ({
      digit,
      isTarget: digit === config.targetDigit,
      fontSizeRem: sizeAt(),
    }));
  }

  const digits = Array.from({ length: 9 }, (_, i) => i + 1).flatMap((d) =>
    Array<number>(config.repetitionsPerDigit).fill(d),
  );
  let order = shuffle(digits, rng);
  for (let attempt = 0; attempt < 200 && hasAdjacentTargets(order, config.targetDigit); attempt++) {
    order = shuffle(digits, rng);
  }
  return order.map((digit) => ({
    digit,
    isTarget: digit === config.targetDigit,
    fontSizeRem: sizeAt(),
  }));
}

export function hasAdjacentTargets(order: readonly number[], target: number) {
  return order.some((d, i) => i > 0 && d === target && order[i - 1] === target);
}

export type FocusFlowClassification =
  | "hit"
  | "omission"
  | "commission"
  | "correct_withhold";

export function classifyFocusFlow(isTarget: boolean, responded: boolean): FocusFlowClassification {
  if (isTarget) return responded ? "commission" : "correct_withhold";
  return responded ? "hit" : "omission";
}
