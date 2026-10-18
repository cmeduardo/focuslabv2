import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-02: reutiliza la sesión en progreso si ya existe.
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

// RF-10. El filtro por user_id y 'en_progreso' evita cerrar una sesión ajena o dos veces.
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
