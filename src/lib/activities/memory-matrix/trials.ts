import type { MemoryMatrixConfig } from "@/lib/activities/config";
import { shuffle, type Rng } from "@/lib/activities/rng";

// Posiciones irregulares de los 9 bloques (esquina superior izquierda, en %
// del tablero), inspiradas en el tablero original de Corsi: sin filas ni
// columnas que faciliten agrupar la secuencia. Tamaño de bloque: 16 %.
export const CORSI_BLOCK_SIZE_PCT = 16;
export const CORSI_BLOCKS: readonly { x: number; y: number }[] = [
  { x: 8, y: 10 },
  { x: 48, y: 4 },
  { x: 76, y: 18 },
  { x: 26, y: 34 },
  { x: 60, y: 38 },
  { x: 6, y: 58 },
  { x: 40, y: 62 },
  { x: 78, y: 60 },
  { x: 24, y: 82 },
];

// Secuencia sin repetir bloque (como en Corsi).
export function generateCorsiSequence(length: number, blockCount: number, rng: Rng): number[] {
  return shuffle(
    Array.from({ length: blockCount }, (_, i) => i),
    rng,
  ).slice(0, Math.min(length, blockCount));
}

export type CorsiState = { length: number; attempt: number };

// Regla de avance: un acierto sube un nivel; un fallo da un segundo
// intento en el mismo nivel; dos fallos en un nivel terminan el reto.
export function nextCorsiState(
  state: CorsiState,
  correct: boolean,
  config: Pick<MemoryMatrixConfig, "attemptsPerLevel" | "maxLength">,
): CorsiState | null {
  if (correct) {
    return state.length >= config.maxLength ? null : { length: state.length + 1, attempt: 1 };
  }
  return state.attempt < config.attemptsPerLevel
    ? { length: state.length, attempt: state.attempt + 1 }
    : null;
}

export type CorsiClassification = "correct" | "order_error" | "item_error";

// Error de orden: tocó los bloques correctos pero en otro orden (se
// recordó el "dónde" pero no el "cuándo"). Error de ítem: algún bloque no
// era parte de la secuencia.
export function classifyCorsi(sequence: readonly number[], taps: readonly number[]): CorsiClassification {
  if (sequence.length === taps.length && sequence.every((b, i) => taps[i] === b)) {
    return "correct";
  }
  const expected = [...sequence].sort().join();
  const given = [...taps].sort().join();
  return expected === given ? "order_error" : "item_error";
}
