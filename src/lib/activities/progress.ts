import type { ActivityType } from "@/lib/types/database";

// Cada quien se compara solo consigo mismo: nunca contra otros ni con frases de retroceso.

export type ProgressRow = {
  activity_type: ActivityType;
  completed_at: string;
  level_reached: number | null;
  metrics: Record<string, unknown>;
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
    read: (r) => num(r.metrics.rtMeanMs),
    format: ms,
  },
  focus_flow: {
    label: "Respuestas al 3",
    better: "lower",
    read: (r) => num(r.metrics.commissionRatePct),
    format: (v) => `${Math.round(v)}%`,
  },
  memory_matrix: {
    label: "Nivel máximo",
    better: "higher",
    read: (r) => num(r.level_reached) ?? num(r.metrics.span),
    format: (v) => `${v} bloques`,
  },
  word_sprint: {
    label: "Precisión",
    better: "higher",
    read: (r) => num(r.metrics.accuracyPct),
    format: (v) => `${Math.round(v)}%`,
  },
  pattern_hunt: {
    label: "Velocidad de detección",
    better: "lower",
    read: (r) => num(r.metrics.detectionSpeedMs),
    format: ms,
  },
  deep_read: {
    label: "Comprensión",
    better: "higher",
    read: (r) => num(r.metrics.comprehensionScore),
    format: (v, r) => {
      const total = num(r.metrics.questions);
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
    .filter((r) => r.activity_type === activity)
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
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
  return new Set(rows.map((r) => fmt.format(new Date(r.completed_at)))).size;
}
