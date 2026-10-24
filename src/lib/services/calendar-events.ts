import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export async function listCalendarEventsForWeek(
  supabase: Client,
  userId: string,
  weekStartIso: string,
  weekEndIso: string,
) {
  const { data, error } = await supabase
    .from("eventos_calendario")
    .select("*")
    .eq("perfil_id", userId)
    .gte("inicio_en", weekStartIso)
    .lt("inicio_en", weekEndIso)
    .order("inicio_en", { ascending: true });

  if (error) throw new Error("No se pudieron cargar los eventos.");
  return data;
}

export async function createCalendarEvent(
  supabase: Client,
  params: {
    userId: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
  },
) {
  const { data, error } = await supabase
    .from("eventos_calendario")
    .insert({
      perfil_id: params.userId,
      titulo: params.title,
      descripcion: params.description,
      inicio_en: params.startAt,
      fin_en: params.endAt,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("No se pudo crear el evento.");
  return data;
}

export async function markCalendarEventCompletion(
  supabase: Client,
  id: string,
  completed: boolean,
) {
  const { error } = await supabase
    .from("eventos_calendario")
    .update({ completado: completed })
    .eq("id", id);
  if (error) throw new Error("No se pudo registrar la respuesta.");
}

export async function deleteCalendarEvent(supabase: Client, id: string) {
  const { error } = await supabase
    .from("eventos_calendario")
    .delete()
    .eq("id", id);
  if (error) throw new Error("No se pudo borrar el evento.");
}
