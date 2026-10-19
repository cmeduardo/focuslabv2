import type { ActivityType } from "@/lib/types/database";

// Cada quien se compara solo consigo mismo: nunca contra otros ni con frases de retroceso.

export type ProgressRow = {
  tipo_actividad: ActivityType;
  completado_en: string;
  nivel_alcanzado: number | null;
  metricas: Record<string, unknown>;
};

type MetricDef = {
  label: string;
  better: "higher" | "lower";
  read: (row: ProgressRow) => number | null;
  format: (value: number, row: ProgressRow) => string;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const ms = (v: number) => `${Math.round(v)} ms`;

export const PROGRESS_METRICS: Record<ActivityType, MetricDef> = {
  reaction_test: {
    label: "Reacción promedio",
    better: "lower",
    read: (r) => num(r.metricas.rtMeanMs),
    format: ms,
  },
  focus_flow: {
    label: "Respuestas al 3",
    better: "lower",
    read: (r) => num(r.metricas.commissionRatePct),
    format: (v) => `${Math.round(v)}%`,
  },
  memory_matrix: {
    label: "Nivel máximo",
    better: "higher",
    read: (r) => num(r.nivel_alcanzado) ?? num(r.metricas.span),
    format: (v) => `${v} bloques`,
  },
  word_sprint: {
    label: "Precisión",
    better: "higher",
    read: (r) => num(r.metricas.accuracyPct),
    format: (v) => `${Math.round(v)}%`,
  },
  pattern_hunt: {
    label: "Velocidad de detección",
    better: "lower",
    read: (r) => num(r.metricas.detectionSpeedMs),
    format: ms,
  },
  deep_read: {
    label: "Comprensión",
    better: "higher",
    read: (r) => num(r.metricas.comprehensionScore),
    format: (v, r) => {
      const total = num(r.metricas.questions);
      return total ? `${v} de ${total}` : `${v}`;
    },
  },
};

export type ActivityProgress = {
  activity: ActivityType;
  label: string;
  better: "higher" | "lower";
  attempts: number;
  values: number[];
  latest: string | null;
  best: string | null;
  latestIsBest: boolean;
};

const MAX_POINTS = 12;

export function buildActivityProgress(
  activity: ActivityType,
  rows: readonly ProgressRow[],
): ActivityProgress {
  const def = PROGRESS_METRICS[activity];
  const own = rows
    .filter((r) => r.tipo_actividad === activity)
    .sort((a, b) => a.completado_en.localeCompare(b.completado_en));
  const scored = own
    .map((row) => ({ row, value: def.read(row) }))
    .filter((s): s is { row: ProgressRow; value: number } => s.value !== null);

  const last = scored.at(-1) ?? null;
  const best =
    scored.length === 0
      ? null
      : scored.reduce((a, b) =>
          (def.better === "higher" ? b.value > a.value : b.value < a.value) ? b : a,
        );

  return {
    activity,
    label: def.label,
    better: def.better,
    attempts: own.length,
    values: scored.slice(-MAX_POINTS).map((s) => s.value),
    latest: last ? def.format(last.value, last.row) : null,
    best: best ? def.format(best.value, best.row) : null,
    latestIsBest: last !== null && best !== null && last.value === best.value,
  };
}

// En hora de Guatemala: el servidor corre en UTC.
export function activeDays(rows: readonly ProgressRow[]): number {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" });
  return new Set(rows.map((r) => fmt.format(new Date(r.completado_en)))).size;
}
