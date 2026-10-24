import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityType, Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export async function saveActivityResult(
  supabase: Client,
  params: {
    sessionId: string;
    userId: string;
    activityType: ActivityType;
    durationMs: number;
    accuracy?: number | null;
    levelReached?: number | null;
    metrics?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("resultados_actividad").insert({
    sesion_id: params.sessionId,
    perfil_id: params.userId,
    tipo_actividad: params.activityType,
    duracion_ms: params.durationMs,
    precision: params.accuracy ?? null,
    nivel_alcanzado: params.levelReached ?? null,
    metricas: params.metrics ?? {},
  });

  if (error) {
    throw new Error("No se pudo guardar el resultado de la actividad.");
  }
}
