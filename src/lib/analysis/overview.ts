type DimensionRow = {
  tipo_actividad: string;
  tipo_dispositivo: string;
  participantes: number | string | null;
};

// Total del taller: el máximo entre desafíos de la suma de dispositivos.
export function participantsWithResults(rows: readonly DimensionRow[]): number {
  const byActivity = new Map<string, number>();
  for (const row of rows) {
    byActivity.set(
      row.tipo_actividad,
      (byActivity.get(row.tipo_actividad) ?? 0) + Number(row.participantes ?? 0),
    );
  }
  return Math.max(0, ...byActivity.values());
}

// Participantes por dispositivo en un desafío (por defecto Reaction Test).
export function participantsByDevice(
  rows: readonly DimensionRow[],
  activityType = "reaction_test",
): Map<string, number> {
  const byDevice = new Map<string, number>();
  for (const row of rows) {
    if (row.tipo_actividad !== activityType) continue;
    byDevice.set(row.tipo_dispositivo, (byDevice.get(row.tipo_dispositivo) ?? 0) + Number(row.participantes ?? 0));
  }
  return byDevice;
}

// `dia` es medianoche de Guatemala (06:00 UTC) o, en datos viejos, medianoche UTC: en
// ambos casos la fecha UTC es la correcta. Formato dd/MM/yyyy.
export function formatDia(value: string | null | undefined): string {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

type SessionRow = { estado: string; total_sesiones: number | string | null };

export function sessionTotals(rows: readonly SessionRow[]) {
  const byStatus = new Map<string, number>();
  for (const row of rows) {
    byStatus.set(row.estado, (byStatus.get(row.estado) ?? 0) + Number(row.total_sesiones ?? 0));
  }
  const total = [...byStatus.values()].reduce((s, v) => s + v, 0);
  const completadas = byStatus.get("completada") ?? 0;
  return {
    total,
    completadas,
    pctCompletadas: total > 0 ? (completadas / total) * 100 : null,
    byStatus,
  };
}

export function participantsPerActivity(rows: readonly DimensionRow[]): Map<string, number> {
  const byActivity = new Map<string, number>();
  for (const row of rows) {
    byActivity.set(
      row.tipo_actividad,
      (byActivity.get(row.tipo_actividad) ?? 0) + Number(row.participantes ?? 0),
    );
  }
  return byActivity;
}

export function completedPerPerson(
  rows: readonly Record<string, unknown>[],
  maxActivities = 6,
) {
  const counts = Array.from({ length: maxActivities }, (_, i) => ({ completados: i + 1, n: 0 }));
  for (const row of rows) {
    const k = Number(row.actividades_completadas ?? 0);
    if (k >= 1 && k <= maxActivities) counts[k - 1].n += 1;
  }
  return counts;
}
