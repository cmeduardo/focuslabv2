import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-02: inicia una sesión de uso vinculada al participante. Si ya tiene una
// sesión en progreso (p. ej. otra pestaña, o simplemente sigue navegando la
// app), la reutiliza en vez de abrir sesiones duplicadas.
export async function getOrCreateActiveSession(supabase: Client, userId: string) {
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "en_progreso")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error("No se pudo iniciar la sesión de uso.");
  }

  return created;
}

export async function markSessionAbandoned(supabase: Client, sessionId: string) {
  await supabase
    .from("sessions")
    .update({ status: "abandonada", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "en_progreso");
}

// RF-10: cierra la sesión al pedido del participante (POST
// /api/sessions/[sessionId]/complete), disparando el flujo de informe de IA.
// El filtro por user_id + status = 'en_progreso' evita completar la sesión
// de otro participante o completar dos veces la misma.
export async function markSessionCompleted(
  supabase: Client,
  sessionId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "completada", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "en_progreso")
    .select("id, started_at, ended_at")
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo completar la sesión.");
  }

  return data;
}
