import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// Reutiliza la sesión en progreso si ya existe.
export async function getOrCreateActiveSession(supabase: Client, userId: string) {
  const { data: existing } = await supabase
    .from("sesiones")
    .select("id")
    .eq("perfil_id", userId)
    .eq("estado", "en_progreso")
    .order("iniciada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("sesiones")
    .insert({ perfil_id: userId })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error("No se pudo iniciar la sesión de uso.");
  }

  return created;
}

export async function markSessionAbandoned(supabase: Client, sessionId: string) {
  await supabase
    .from("sesiones")
    .update({ estado: "abandonada", finalizada_en: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("estado", "en_progreso");
}

// El filtro por perfil_id y 'en_progreso' evita cerrar una sesión ajena o dos veces.
export async function markSessionCompleted(
  supabase: Client,
  sessionId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("sesiones")
    .update({ estado: "completada", finalizada_en: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("perfil_id", userId)
    .eq("estado", "en_progreso")
    .select("id, iniciada_en, finalizada_en")
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo completar la sesión.");
  }

  return data;
}
