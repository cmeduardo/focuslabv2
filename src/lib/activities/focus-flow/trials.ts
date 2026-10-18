import type { FocusFlowConfig } from "@/lib/activities/config";
import { shuffle, type Rng } from "@/lib/activities/rng";
import type { RoundMode } from "@/lib/activities/types";

export type FocusFlowTrialPlan = {
  digit: number;
  isTarget: boolean;
  fontSizeRem: number;
};

// Sin dos objetivos seguidos.
export function planFocusFlowTrials(
  config: FocusFlowConfig,
  mode: RoundMode,
  rng: Rng,
): FocusFlowTrialPlan[] {
  const sizeAt = () =>
    config.fontSizesRem[Math.floor(rng() * config.fontSizesRem.length)];

  if (mode === "practice") {
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
