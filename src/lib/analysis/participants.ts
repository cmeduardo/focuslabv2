// Análisis por participante (páginas 3, 4, 6, 7, 8 y 10 del tablero del
// investigador). Funciones puras sobre las filas de vw_participantes_analisis:
// sin React ni Supabase, y con las mismas reglas que las medidas DAX de
// Power BI para que las cifras cuadren.

import {
  COGNITIVE_VARIABLES,
  PASSIVE_VARIABLES,
  VARIABLE_BY_KEY,
  VARIABLES,
  type VariableGroup,
  type VariableKey,
} from "@/lib/analysis/variables";

export type ParticipantRow = {
  participante: string;
  dispositivo_principal: string | null;
} & Record<string, string | number | null>;

export type LongRow = {
  participante: string;
  dispositivo: string;
  variable: VariableKey;
  grupo: VariableGroup;
  valor: number;
  // Puntaje z frente a su grupo de dispositivo; null si el grupo tiene
  // menos de 3 personas o no varía.
  z: number | null;
  // Tramo 1 a 5 (igual ancho) dentro de variable × dispositivo.
  tramo: number;
};

export const MIN_GROUP_FOR_Z = 3;
export const MIN_PAIRS_FOR_R = 5;
export const TRAMOS = 5;

// PostgREST devuelve numeric como número, pero algunos agregados llegan
// como texto: se normaliza y lo que no es número queda como null (nunca 0).
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function deviceOf(row: Pick<ParticipantRow, "dispositivo_principal">) {
  return row.dispositivo_principal ?? "sin_dato";
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// Desviación poblacional (STDEV.P en DAX), la que usa el puntaje z.
export function populationSd(values: readonly number[]): number | null {
  const m = mean(values);
  if (m === null) return null;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

// Percentil inclusivo con interpolación lineal (PERCENTILE.INC en DAX).
export function quantile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Tramo de igual ancho: min(5, floor((v − min) / (max − min) × 5) + 1).
export function tramoOf(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return Math.min(TRAMOS, Math.floor(((value - min) / (max - min)) * TRAMOS) + 1);
}

// Pearson sobre los pares completos. r es null con menos de 5 pares o si
// alguna variable no varía.
export function pearson(pairs: readonly (readonly [number, number])[]): { r: number | null; n: number } {
  const n = pairs.length;
  if (n < MIN_PAIRS_FOR_R) return { r: null, n };
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let cov = 0;
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pairs) {
    cov += (x - mx) * (y - my);
    sx += (x - mx) ** 2;
    sy += (y - my) ** 2;
  }
  return sx > 0 && sy > 0 ? { r: cov / Math.sqrt(sx * sy), n } : { r: null, n };
}

// ------------------------------------------------------------ formato largo
export function toLong(rows: readonly ParticipantRow[]): LongRow[] {
  const raw: Omit<LongRow, "z" | "tramo">[] = [];
  for (const row of rows) {
    for (const def of VARIABLES) {
      const valor = toNumber(row[def.key]);
      if (valor === null) continue;
      raw.push({
        participante: row.participante,
        dispositivo: deviceOf(row),
        variable: def.key as VariableKey,
        grupo: def.group,
        valor,
      });
    }
  }

  const groups = new Map<string, number[]>();
  for (const r of raw) {
    const key = `${r.variable}|${r.dispositivo}`;
    groups.set(key, [...(groups.get(key) ?? []), r.valor]);
  }
  const stats = new Map(
    [...groups].map(([key, values]) => [
      key,
      {
        n: values.length,
        mean: mean(values) as number,
        sd: populationSd(values) as number,
        min: Math.min(...values),
        max: Math.max(...values),
      },
    ]),
  );

  return raw.map((r) => {
    const g = stats.get(`${r.variable}|${r.dispositivo}`)!;
    const z = g.n >= MIN_GROUP_FOR_Z && g.sd > 0 ? (r.valor - g.mean) / g.sd : null;
    return { ...r, z, tramo: tramoOf(r.valor, g.min, g.max) };
  });
}

// ------------------------------------------------------- índices y estilos
export const STYLES = [
  { id: "sereno_fluido", label: "Ritmo sereno y fluido" },
  { id: "activo_buen_ritmo", label: "Muy activo con buen ritmo" },
  { id: "sereno_exigente", label: "Sereno, con desafíos exigentes" },
  { id: "activo_exigente", label: "Muy activo y con desafíos exigentes" },
  { id: "sin_datos", label: "Sin datos suficientes" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

export function styleOf(passive: number | null, difficulty: number | null): StyleId {
  if (passive === null || difficulty === null) return "sin_datos";
  if (passive <= 0) return difficulty <= 0 ? "sereno_fluido" : "sereno_exigente";
  return difficulty <= 0 ? "activo_buen_ritmo" : "activo_exigente";
}

export function styleLabel(id: StyleId) {
  return STYLES.find((s) => s.id === id)!.label;
}

export type ParticipantProfile = {
  participante: string;
  dispositivo: string;
  // Índice de actividad pasiva: promedio de los z de las variables pasivas.
  pasivo: number | null;
  // Índice de dificultad: promedio de los z cognitivos, con el signo
  // invertido en span y comprensión (ahí más alto es más fácil).
  dificultad: number | null;
  estilo: StyleId;
};

export function profiles(rows: readonly ParticipantRow[], long = toLong(rows)): ParticipantProfile[] {
  return rows.map((row) => {
    const own = long.filter((l) => l.participante === row.participante && l.z !== null);
    const passiveZ = own.filter((l) => l.grupo === "pasiva").map((l) => l.z as number);
    const difficultyZ = own
      .filter((l) => l.grupo === "cognitiva")
      .map((l) => (VARIABLE_BY_KEY.get(l.variable)?.higherIsEasier ? -1 : 1) * (l.z as number));
    const pasivo = mean(passiveZ);
    const dificultad = mean(difficultyZ);
    return {
      participante: row.participante,
      dispositivo: deviceOf(row),
      pasivo,
      dificultad,
      estilo: styleOf(pasivo, dificultad),
    };
  });
}

export function styleCounts(list: readonly ParticipantProfile[]) {
  return STYLES.map((s) => ({ ...s, n: list.filter((p) => p.estilo === s.id).length }));
}

// --------------------------------------------------------- correlaciones
export type CorrelationCell = { pasiva: VariableKey; cognitiva: VariableKey; r: number | null; n: number };

export function correlationMatrix(rows: readonly ParticipantRow[]): CorrelationCell[] {
  return PASSIVE_VARIABLES.flatMap((p) =>
    COGNITIVE_VARIABLES.map((c) => {
      const pairs = rows.flatMap((row) => {
        const x = toNumber(row[p.key]);
        const y = toNumber(row[c.key]);
        return x === null || y === null ? [] : [[x, y] as const];
      });
      return { pasiva: p.key, cognitiva: c.key, ...pearson(pairs) };
    }),
  );
}

// ---------------------------------------------------------- distribuciones
export type DeviceDistribution = {
  dispositivo: string;
  n: number;
  min: number;
  p25: number;
  mediana: number;
  p75: number;
  max: number;
  // Participantes por tramo (índice 0 = tramo 1).
  tramos: number[];
};

export function distribution(long: readonly LongRow[], variable: VariableKey): DeviceDistribution[] {
  const byDevice = new Map<string, LongRow[]>();
  for (const l of long) {
    if (l.variable !== variable) continue;
    byDevice.set(l.dispositivo, [...(byDevice.get(l.dispositivo) ?? []), l]);
  }
  return [...byDevice].map(([dispositivo, list]) => {
    const values = list.map((l) => l.valor);
    const tramos = Array.from({ length: TRAMOS }, (_, i) => list.filter((l) => l.tramo === i + 1).length);
    return {
      dispositivo,
      n: values.length,
      min: Math.min(...values),
      p25: quantile(values, 0.25) as number,
      mediana: quantile(values, 0.5) as number,
      p75: quantile(values, 0.75) as number,
      max: Math.max(...values),
      tramos,
    };
  });
}

// ------------------------------------------------------- perfil individual
export type PersonVariable = {
  variable: VariableKey;
  valor: number;
  z: number | null;
  promedioGrupo: number;
  nGrupo: number;
  // Proporción del grupo de dispositivo con valor ≤ al de la persona.
  percentil: number;
};

export function personDetail(long: readonly LongRow[], participante: string): PersonVariable[] {
  const own = long.filter((l) => l.participante === participante);
  return VARIABLES.flatMap((def) => {
    const mine = own.find((l) => l.variable === def.key);
    if (!mine) return [];
    const group = long
      .filter((l) => l.variable === def.key && l.dispositivo === mine.dispositivo)
      .map((l) => l.valor);
    return [
      {
        variable: def.key as VariableKey,
        valor: mine.valor,
        z: mine.z,
        promedioGrupo: mean(group) as number,
        nGrupo: group.length,
        percentil: group.filter((v) => v <= mine.valor).length / group.length,
      },
    ];
  });
}
