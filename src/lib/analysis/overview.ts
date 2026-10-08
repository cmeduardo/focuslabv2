// Cálculos del panel agregado y del reporte (sin React ni Supabase, para
// poder probarlos).

type DimensionRow = {
  activity_type: string;
  device_type: string;
  participantes: number | string | null;
};

// vw_actividades_dimensiones trae una fila por desafío × dispositivo. Los
// participantes de un desafío son la suma de sus dispositivos (cada
// persona hace cada desafío en un solo dispositivo, su primer intento); el
// total del taller es el máximo entre desafíos. Tomar el máximo de las
// filas sueltas daba solo el del dispositivo más usado (16 en vez de 20).
export function participantsWithResults(rows: readonly DimensionRow[]): number {
  const byActivity = new Map<string, number>();
  for (const row of rows) {
    byActivity.set(
      row.activity_type,
      (byActivity.get(row.activity_type) ?? 0) + Number(row.participantes ?? 0),
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
    if (row.activity_type !== activityType) continue;
    byDevice.set(row.device_type, (byDevice.get(row.device_type) ?? 0) + Number(row.participantes ?? 0));
  }
  return byDevice;
}

// `dia` de las vistas: desde la migración 20261005000002 es la medianoche
// de Guatemala (06:00 UTC); antes era la medianoche UTC. En ambos casos la
// fecha UTC es el día correcto del bucket, así que se formatea en UTC: si
// se formateara en America/Guatemala, un bucket a medianoche UTC se
// correría al día anterior ("2 oct, 6 PM" en Power BI). También acepta
// fechas simples "YYYY-MM-DD". Formato dd/MM/yyyy.
export function formatDia(value: string | null | undefined): string {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

// ------------------------------------------------- recorrido del taller
type SessionRow = { status: string; total_sesiones: number | string | null };

export function sessionTotals(rows: readonly SessionRow[]) {
  const byStatus = new Map<string, number>();
  for (const row of rows) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + Number(row.total_sesiones ?? 0));
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

// Participantes que completaron cada desafío (suma de dispositivos).
export function participantsPerActivity(rows: readonly DimensionRow[]): Map<string, number> {
  const byActivity = new Map<string, number>();
  for (const row of rows) {
    byActivity.set(
      row.activity_type,
      (byActivity.get(row.activity_type) ?? 0) + Number(row.participantes ?? 0),
    );
  }
  return byActivity;
}

// Cuántas personas completaron 1, 2, … 6 desafíos.
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
