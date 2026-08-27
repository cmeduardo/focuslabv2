import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActivityType, Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-05: guarda el resultado estructurado de una actividad cognitiva. Se
// llama desde Client Components (igual que useEventTracker con
// interaction_events) — la política RLS activity_results_insert_own exige
// user_id = auth.uid().
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
  const { error } = await supabase.from("activity_results").insert({
    session_id: params.sessionId,
    user_id: params.userId,
    activity_type: params.activityType,
    duration_ms: params.durationMs,
    accuracy: params.accuracy ?? null,
    level_reached: params.levelReached ?? null,
    metrics: params.metrics ?? {},
  });

  if (error) {
    throw new Error("No se pudo guardar el resultado de la actividad.");
  }
}
