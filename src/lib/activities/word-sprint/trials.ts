import type { WordSprintConfig } from "@/lib/activities/config";
import { shuffle, type Rng } from "@/lib/activities/rng";
import type { RoundMode } from "@/lib/activities/types";

// Tintas pensadas para el panel oscuro del estímulo (#16172b): todas
// superan 4.5:1 de contraste. Los botones de respuesta llevan además la
// palabra escrita, para no depender solo del color.
export const STROOP_COLORS = [
  { id: "rojo", label: "ROJO", hex: "#ff5c5c", key: "KeyD" },
  { id: "azul", label: "AZUL", hex: "#5b9bff", key: "KeyF" },
  { id: "verde", label: "VERDE", hex: "#34d17a", key: "KeyJ" },
  { id: "amarillo", label: "AMARILLO", hex: "#ffd23f", key: "KeyK" },
] as const;

export const STROOP_PANEL_HEX = "#16172b";

export type StroopColorId = (typeof STROOP_COLORS)[number]["id"];

export type WordSprintTrialPlan = {
  word: StroopColorId;
  ink: StroopColorId;
  congruent: boolean;
};

const IDS = STROOP_COLORS.map((c) => c.id);

// 50 % congruentes, orden aleatorio, sin repetir la misma tinta en dos
// ensayos seguidos (la repetición de respuesta acelera artificialmente).
export function planWordSprintTrials(
  config: WordSprintConfig,
  mode: RoundMode,
  rng: Rng,
): WordSprintTrialPlan[] {
  const congruent: WordSprintTrialPlan[] = IDS.flatMap((id) =>
    Array.from({ length: config.congruentPerColor }, () => ({ word: id, ink: id, congruent: true })),
  );
  const incongruent: WordSprintTrialPlan[] = IDS.flatMap((word) =>
    IDS.filter((ink) => ink !== word).flatMap((ink) =>
      Array.from({ length: config.incongruentPerPair }, () => ({ word, ink, congruent: false })),
    ),
  );

  let pool = [...congruent, ...incongruent];
  if (mode === "practice") {
    const half = Math.floor(config.practiceTrials / 2);
    pool = [
      ...shuffle(congruent, rng).slice(0, half),
      ...shuffle(incongruent, rng).slice(0, config.practiceTrials - half),
    ];
  }

  return orderWithoutInkRepeats(pool, rng);
}

// Construcción paso a paso: en cada posición elige al azar entre los
// ensayos restantes cuya tinta difiere de la anterior. Prioriza la tinta
// con más ensayos pendientes cuando ya no queda margen, y reinicia si se
// atasca (raro). Barajar y descartar no sirve: con 48 ensayos y 4 tintas
// casi ninguna permutación al azar cumple la condición.
function orderWithoutInkRepeats(pool: readonly WordSprintTrialPlan[], rng: Rng) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const remaining = shuffle(pool, rng);
    const order: WordSprintTrialPlan[] = [];
    while (remaining.length > 0) {
      const prevInk = order[order.length - 1]?.ink;
      const counts = new Map<StroopColorId, number>();
      for (const t of remaining) counts.set(t.ink, (counts.get(t.ink) ?? 0) + 1);
      const [busiestInk, busiest] = [...counts].sort((a, b) => b[1] - a[1])[0];
      const mustUseBusiest = busiest > Math.ceil(remaining.length / 2) - 1 && busiestInk !== prevInk;
      const candidates = remaining
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.ink !== prevInk && (!mustUseBusiest || t.ink === busiestInk));
      if (candidates.length === 0) break;
      const { i } = candidates[Math.floor(rng() * candidates.length)];
      order.push(remaining.splice(i, 1)[0]);
    }
    if (order.length === pool.length) return order;
  }
  return shuffle(pool, rng);
}

export function hasInkRepeat(order: readonly WordSprintTrialPlan[]) {
  return order.some((t, i) => i > 0 && t.ink === order[i - 1].ink);
}
