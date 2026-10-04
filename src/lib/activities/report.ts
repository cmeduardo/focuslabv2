export type ActivityResultRow = {
  activity_type: string;
  accuracy: number | null;
  level_reached: number | null;
  duration_ms: number;
  metrics: Record<string, unknown>;
  protocol_version: string;
  run_id: string | null;
};

// Para el informe se usa el PRIMER intento completado de cada actividad en
// la sesión (decisión 2026-10-04: los reintentos no deben pesar más que el
// primer contacto con el desafío); los demás solo se cuentan.
export function pickFirstAttempts(rows: readonly ActivityResultRow[]) {
  const byActivity = new Map<string, { first: ActivityResultRow; attempts: number }>();
  for (const row of rows) {
    const entry = byActivity.get(row.activity_type);
    if (entry) entry.attempts += 1;
    else byActivity.set(row.activity_type, { first: row, attempts: 1 });
  }
  return [...byActivity.values()];
}
