import type { ReactionTestConfig } from "@/lib/activities/config";
import { uniform, type Rng } from "@/lib/activities/rng";
import type { RoundMode } from "@/lib/activities/types";

export type ReactionTrialPlan = { isiMs: number };

// Espera aleatoria uniforme entre estímulos (el corazón del PVT: la
// incertidumbre temporal es lo que exige mantener la alerta).
export function planReactionTrials(
  config: ReactionTestConfig,
  mode: RoundMode,
  rng: Rng,
): ReactionTrialPlan[] {
  const n = mode === "practice" ? config.practiceTrials : config.registeredTrials;
  const min = mode === "practice" ? config.practiceIsiMinMs : config.isiMinMs;
  const max = mode === "practice" ? config.practiceIsiMaxMs : config.isiMaxMs;
  return Array.from({ length: n }, () => ({
    isiMs: Math.round(uniform(rng, min, max)),
  }));
}

export type ReactionClassification = "valid" | "lapse" | "anticipation";

// Clasificación de un ensayo PVT:
//   anticipación: respuesta antes del estímulo o TR < 100 ms
//   válida: 100–500 ms
//   lapso: TR > 500 ms o sin respuesta dentro de la ventana
export function classifyReaction(
  rtMs: number | null,
  config: Pick<ReactionTestConfig, "anticipationThresholdMs" | "lapseThresholdMs">,
): ReactionClassification {
  if (rtMs === null) return "lapse";
  if (rtMs < config.anticipationThresholdMs) return "anticipation";
  if (rtMs > config.lapseThresholdMs) return "lapse";
  return "valid";
}
