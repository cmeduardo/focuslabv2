export type ActivityResultRow = {
  tipo_actividad: string;
  precision: number | null;
  nivel_alcanzado: number | null;
  duracion_ms: number;
  metricas: Record<string, unknown>;
  version_protocolo: string;
  intento_id: string | null;
};

// Solo el primer intento completado de cada actividad; los demás solo se cuentan.
export function pickFirstAttempts(rows: readonly ActivityResultRow[]) {
  const byActivity = new Map<string, { first: ActivityResultRow; attempts: number }>();
  for (const row of rows) {
    const entry = byActivity.get(row.tipo_actividad);
    if (entry) entry.attempts += 1;
    else byActivity.set(row.tipo_actividad, { first: row, attempts: 1 });
  }
  return [...byActivity.values()];
}
