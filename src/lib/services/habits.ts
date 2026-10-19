import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-08. Marcar un día es un upsert sobre unique(habito_id, fecha).
export async function listHabits(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("habitos")
    .select("*")
    .eq("perfil_id", userId)
    .eq("archivado", false)
    .order("creado_en", { ascending: true });

  if (error) throw new Error("No se pudieron cargar los hábitos.");
  return data;
}

export async function createHabit(
  supabase: Client,
  params: { userId: string; name: string },
) {
  const { data, error } = await supabase
    .from("habitos")
    .insert({ perfil_id: params.userId, nombre: params.name })
    .select("*")
    .single();

  if (error || !data) throw new Error("No se pudo crear el hábito.");
  return data;
}

export async function archiveHabit(supabase: Client, id: string) {
  const { error } = await supabase
    .from("habitos")
    .update({ archivado: true })
    .eq("id", id);
  if (error) throw new Error("No se pudo archivar el hábito.");
}

export async function listHabitLogs(
  supabase: Client,
  userId: string,
  fromDate: string,
  toDate: string,
) {
  const { data, error } = await supabase
    .from("registros_habito")
    .select("*")
    .eq("perfil_id", userId)
    .gte("fecha", fromDate)
    .lte("fecha", toDate);

  if (error) throw new Error("No se pudo cargar el historial de hábitos.");
  return data;
}

export async function toggleHabitLog(
  supabase: Client,
  params: {
    habitId: string;
    userId: string;
    logDate: string;
    completed: boolean;
  },
) {
  const { error } = await supabase.from("registros_habito").upsert(
    {
      habito_id: params.habitId,
      perfil_id: params.userId,
      fecha: params.logDate,
      completado: params.completed,
    },
    { onConflict: "habito_id,fecha" },
  );

  if (error) throw new Error("No se pudo actualizar el hábito.");
}
