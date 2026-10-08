import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProgressRow } from "@/lib/activities/progress";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// Historial propio para "Tu progreso" (RF-12). Solo protocolo v2: las filas
// v1 son de mecánicas anteriores y no se pueden comparar con las actuales.
// La RLS activity_results_select_own ya limita a las filas del usuario.
export async function listProgressRows(
  supabase: Client,
  userId: string,
): Promise<(ProgressRow & { session_id: string })[]> {
  const { data, error } = await supabase
    .from("activity_results")
    .select("activity_type, completed_at, level_reached, metrics, session_id")
    .eq("user_id", userId)
    .eq("protocol_version", "v2")
    .order("completed_at", { ascending: true });
  if (error) throw new Error(`No se pudo cargar tu progreso: ${error.message}`);
  return (data ?? []).map((row) => ({
    ...row,
    metrics: (row.metrics ?? {}) as Record<string, unknown>,
  }));
}
