// Estadística descriptiva pura, compartida por las métricas de todas las
// actividades. Todo devuelve null con datos insuficientes en vez de 0, para
// no confundir "no hay datos" con "valor cero" en el informe.

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Desviación estándar muestral (n − 1), la usual en reportes de tiempos de
// reacción.
export function standardDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values) as number;
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Pendiente de mínimos cuadrados de y sobre x (p. ej. ms por elemento
// adicional en búsqueda visual).
export function linearSlope(
  xs: readonly number[],
  ys: readonly number[],
): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const mx = mean(xs) as number;
  const my = mean(ys) as number;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

// Promedio del p% más rápido o más lento (p. ej. 10% en PVT).
export function extremeMean(
  values: readonly number[],
  fraction: number,
  which: "fastest" | "slowest",
): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) =>
    which === "fastest" ? a - b : b - a,
  );
  const n = Math.max(1, Math.round(sorted.length * fraction));
  return mean(sorted.slice(0, n));
}

export function round(value: number | null, decimals = 0): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function percentage(part: number, total: number): number | null {
  if (total <= 0) return null;
  return round((part / total) * 100, 2);
}
