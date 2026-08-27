// Word Sprint ahora es una tarea de Stroop (color-palabra): el cerebro lee
// la palabra automáticamente, pero hay que responder al color de la
// tinta — esa interferencia es justamente lo que mide atención selectiva
// e inhibición (Stroop, 1935), y es un efecto que cualquier persona nota
// al instante, a diferencia de una decisión léxica abstracta.
export const STROOP_COLORS = [
  { name: "Rojo", hex: "#e4483a" },
  { name: "Azul", hex: "#3b6fe4" },
  { name: "Verde", hex: "#2fae74" },
  { name: "Amarillo", hex: "#e4b23a" },
] as const;

export type StroopTrial = {
  wordIndex: number;
  inkIndex: number;
  congruent: boolean;
};

export function generateStroopTrial(): StroopTrial {
  const wordIndex = Math.floor(Math.random() * STROOP_COLORS.length);
  const congruent = Math.random() < 0.3;
  const inkIndex = congruent
    ? wordIndex
    : (wordIndex + 1 + Math.floor(Math.random() * (STROOP_COLORS.length - 1))) %
      STROOP_COLORS.length;
  return { wordIndex, inkIndex, congruent };
}
