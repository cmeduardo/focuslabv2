// Detalle por ensayo (página 5 del tablero del investigador), sobre
// vw_ensayos_analisis. Siempre separado por dispositivo y solo ensayos
// válidos; en Word Sprint y Pattern Hunt, además, solo respuestas correctas.

import { mean, toNumber } from "@/lib/analysis/participants";

export type TrialRow = {
  participante: string;
  activity_type: string;
  device_type: string | null;
  corrida_inicio: string;
  condition: Record<string, unknown> | null;
  rt_ms: number | string | null;
  correct: boolean | null;
  valid: boolean;
};

export const RT_BIN_MS = 50;

// La vista trae todas las corridas completadas; el análisis usa solo el
// primer intento de cada participante en cada desafío (misma regla que
// vw_participantes_analisis y el informe de IA).
export function firstRunOnly<T extends Pick<TrialRow, "participante" | "activity_type" | "corrida_inicio">>(
  rows: readonly T[],
): T[] {
  const first = new Map<string, string>();
  for (const r of rows) {
    const key = `${r.participante}|${r.activity_type}`;
    const current = first.get(key);
    if (current === undefined || r.corrida_inicio < current) first.set(key, r.corrida_inicio);
  }
  return rows.filter((r) => first.get(`${r.participante}|${r.activity_type}`) === r.corrida_inicio);
}

const deviceOf = (r: Pick<TrialRow, "device_type">) => r.device_type ?? "sin_dato";

export type HistogramBin = { desde: number; etiqueta: string; n: number };

// Histograma de TR de Reaction Test en intervalos de 50 ms, con todos los
// intervalos intermedios aunque estén vacíos (eje categórico continuo).
export function rtHistogram(rows: readonly TrialRow[]): { dispositivo: string; bins: HistogramBin[]; n: number }[] {
  const byDevice = new Map<string, number[]>();
  for (const r of rows) {
    if (r.activity_type !== "reaction_test" || !r.valid) continue;
    const rt = toNumber(r.rt_ms);
    if (rt === null) continue;
    byDevice.set(deviceOf(r), [...(byDevice.get(deviceOf(r)) ?? []), rt]);
  }
  const all = [...byDevice.values()].flat();
  if (all.length === 0) return [];
  // Mismo eje para todos los dispositivos (cada uno en su panel).
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
    if (r.activity_type !== activity || !r.valid || r.correct !== true || !r.condition) continue;
    const rt = toNumber(r.rt_ms);
    const cond = condition(r.condition);
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

// Word Sprint: TR medio cuando la palabra coincide con la tinta o no.
export function stroopMeans(rows: readonly TrialRow[]): MeanCell[] {
  return meanBy(rows, "word_sprint", (c) =>
    typeof c.congruent === "boolean" ? (c.congruent ? "congruente" : "incongruente") : null,
  );
}

// Pattern Hunt: TR medio por tamaño del conjunto y tipo de búsqueda
// ("feature|6", "conjunction|12", …).
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
