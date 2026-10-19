import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { ParticipantRow } from "@/lib/analysis/participants";
import type { TrialRow } from "@/lib/analysis/trials";
import { createClient } from "@/lib/supabase/server";
import type { ActivityType } from "@/lib/types/database";

// El layout de /admin no se vuelve a ejecutar en cada navegación: el rol se valida aquí.
export const requireResearcher = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  if (profile?.rol !== "investigador") redirect(profile?.rol === "autoridad" ? "/admin" : "/dashboard");
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

// PostgREST devuelve hasta 1000 filas: se pagina.
const PAGE = 1000;

export async function getTrialRows(supabase: Client, activities: ActivityType[]): Promise<TrialRow[]> {
  const rows: TrialRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("vw_ensayos_analisis")
      .select("participante, tipo_actividad, tipo_dispositivo, corrida_inicio, condicion, tiempo_reaccion_ms, correcto, valido")
      .in("tipo_actividad", activities)
      .order("participante")
      .order("corrida_inicio")
      .order("indice_ensayo")
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
    supabase.from("vw_actividades_dimensiones").select("tipo_actividad, tipo_dispositivo, participantes"),
    supabase.from("vw_resumen_sesiones").select("estado, total_sesiones"),
  ]);
  if (dimensions.error || sessions.error) throw new Error("No se pudo cargar el recorrido del taller.");
  return { participants, dimensions: dimensions.data ?? [], sessions: sessions.data ?? [] };
}
