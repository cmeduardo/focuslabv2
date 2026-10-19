import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProgressRow } from "@/lib/activities/progress";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-12. Solo protocolo v2: las filas v1 no son comparables.
export async function listProgressRows(
  supabase: Client,
  userId: string,
): Promise<(ProgressRow & { sesion_id: string })[]> {
  const { data, error } = await supabase
    .from("resultados_actividad")
    .select("tipo_actividad, completado_en, nivel_alcanzado, metricas, sesion_id")
    .eq("perfil_id", userId)
    .eq("version_protocolo", "v2")
    .order("completado_en", { ascending: true });
  if (error) throw new Error(`No se pudo cargar tu progreso: ${error.message}`);
  return (data ?? []).map((row) => ({
    ...row,
    metricas: (row.metricas ?? {}) as Record<string, unknown>,
  }));
}
