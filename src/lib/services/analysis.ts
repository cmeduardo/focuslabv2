import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { ParticipantRow } from "@/lib/analysis/participants";
import type { TrialRow } from "@/lib/analysis/trials";
import { createClient } from "@/lib/supabase/server";
import type { ActivityType } from "@/lib/types/database";

// Capa de acceso del análisis del investigador. Cada página de
// /admin/analisis llama a requireResearcher(): el layout de /admin no
// vuelve a ejecutarse en cada navegación (renderizado parcial), así que el
// rol se valida aquí, junto a los datos. Solo se leen vistas vw_* con el
// cliente del usuario; las de nivel participante además se filtran en la
// base con can_read_participant_level().
export const requireResearcher = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "investigador") redirect(profile?.role === "autoridad" ? "/admin" : "/dashboard");
  return supabase;
});

type Client = Awaited<ReturnType<typeof requireResearcher>>;

export const getParticipantRows = cache(async (supabase: Client): Promise<ParticipantRow[]> => {
  const { data, error } = await supabase
    .from("vw_participantes_analisis")
    .select("*")
    .order("participante");
  if (error) throw new Error("No se pudo cargar el análisis por participante.");
  return (data ?? []) as ParticipantRow[];
});

// PostgREST devuelve como máximo 1000 filas por consulta: se pagina, y
// solo se piden los desafíos y columnas que usa la página de ensayos.
const PAGE = 1000;

export async function getTrialRows(supabase: Client, activities: ActivityType[]): Promise<TrialRow[]> {
  const rows: TrialRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("vw_ensayos_analisis")
      .select("participante, activity_type, device_type, corrida_inicio, condition, rt_ms, correct, valid")
      .in("activity_type", activities)
      .order("participante")
      .order("corrida_inicio")
      .order("trial_index")
      .range(from, from + PAGE - 1);
    if (error) throw new Error("No se pudieron cargar los ensayos.");
    rows.push(...((data ?? []) as TrialRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function getJourneyData(supabase: Client) {
  const [participants, dimensions, sessions] = await Promise.all([
    getParticipantRows(supabase),
    supabase.from("vw_actividades_dimensiones").select("activity_type, device_type, participantes"),
    supabase.from("vw_sessions_summary").select("status, total_sesiones"),
  ]);
  if (dimensions.error || sessions.error) throw new Error("No se pudo cargar el recorrido del taller.");
  return { participants, dimensions: dimensions.data ?? [], sessions: sessions.data ?? [] };
}
