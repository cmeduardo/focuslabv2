import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProgressRow } from "@/lib/activities/progress";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-12. Solo protocolo v2: las filas v1 no son comparables.
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
