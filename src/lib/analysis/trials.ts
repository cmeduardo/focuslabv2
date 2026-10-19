// Solo ensayos válidos, por dispositivo; en Word Sprint y Pattern Hunt, solo aciertos.

import { mean, toNumber } from "@/lib/analysis/participants";

export type TrialRow = {
  participante: string;
  tipo_actividad: string;
  tipo_dispositivo: string | null;
  corrida_inicio: string;
  condicion: Record<string, unknown> | null;
  tiempo_reaccion_ms: number | string | null;
  correcto: boolean | null;
  valido: boolean;
};

export const RT_BIN_MS = 50;

// Solo el primer intento de cada participante en cada desafío.
export function firstRunOnly<T extends Pick<TrialRow, "participante" | "tipo_actividad" | "corrida_inicio">>(
  rows: readonly T[],
): T[] {
  const first = new Map<string, string>();
  for (const r of rows) {
    const key = `${r.participante}|${r.tipo_actividad}`;
    const current = first.get(key);
    if (current === undefined || r.corrida_inicio < current) first.set(key, r.corrida_inicio);
  }
  return rows.filter((r) => first.get(`${r.participante}|${r.tipo_actividad}`) === r.corrida_inicio);
}

const deviceOf = (r: Pick<TrialRow, "tipo_dispositivo">) => r.tipo_dispositivo ?? "sin_dato";

export type HistogramBin = { desde: number; etiqueta: string; n: number };

// Intervalos de 50 ms, incluidos los vacíos.
export function rtHistogram(rows: readonly TrialRow[]): { dispositivo: string; bins: HistogramBin[]; n: number }[] {
  const byDevice = new Map<string, number[]>();
  for (const r of rows) {
    if (r.tipo_actividad !== "reaction_test" || !r.valido) continue;
    const rt = toNumber(r.tiempo_reaccion_ms);
    if (rt === null) continue;
    byDevice.set(deviceOf(r), [...(byDevice.get(deviceOf(r)) ?? []), rt]);
  }
  const all = [...byDevice.values()].flat();
  if (all.length === 0) return [];
  const lo = Math.floor(Math.min(...all) / RT_BIN_MS) * RT_BIN_MS;
  const hi = Math.floor(Math.max(...all) / RT_BIN_MS) * RT_BIN_MS;
  return [...byDevice].map(([dispositivo, rts]) => {
    const bins: HistogramBin[] = [];
    for (let from = lo; from <= hi; from += RT_BIN_MS) {
      bins.push({
        desde: from,
        etiqueta: `${from}–${from + RT_BIN_MS - 1}`,
        n: rts.filter((rt) => rt >= from && rt < from + RT_BIN_MS).length,
      });
    }
    return { dispositivo, bins, n: rts.length };
  });
}

export type MeanCell = { dispositivo: string; condicion: string; promedio: number; n: number };

function meanBy(
  rows: readonly TrialRow[],
  activity: string,
  condition: (c: Record<string, unknown>) => string | null,
): MeanCell[] {
  const groups = new Map<string, { dispositivo: string; condicion: string; rts: number[] }>();
  for (const r of rows) {
    if (r.tipo_actividad !== activity || !r.valido || r.correcto !== true || !r.condicion) continue;
    const rt = toNumber(r.tiempo_reaccion_ms);
    const cond = condition(r.condicion);
    if (rt === null || cond === null) continue;
    const key = `${deviceOf(r)}|${cond}`;
    const g = groups.get(key) ?? { dispositivo: deviceOf(r), condicion: cond, rts: [] };
    g.rts.push(rt);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    dispositivo: g.dispositivo,
    condicion: g.condicion,
    promedio: mean(g.rts) as number,
    n: g.rts.length,
  }));
}

export function stroopMeans(rows: readonly TrialRow[]): MeanCell[] {
  return meanBy(rows, "word_sprint", (c) =>
    typeof c.congruent === "boolean" ? (c.congruent ? "congruente" : "incongruente") : null,
  );
}

// Clave "tipo|tamaño", p. ej. "feature|6".
export function searchMeans(rows: readonly TrialRow[]): (MeanCell & { tipo: string; tamano: number })[] {
  return meanBy(rows, "pattern_hunt", (c) =>
    typeof c.type === "string" && typeof c.setSize === "number" ? `${c.type}|${c.setSize}` : null,
  )
    .map((cell) => {
      const [tipo, tamano] = cell.condicion.split("|");
      return { ...cell, tipo, tamano: Number(tamano) };
    })
    .sort((a, b) => a.tamano - b.tamano);
}
