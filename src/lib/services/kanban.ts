import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, KanbanTaskStatus } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-07: tablero Kanban personal. `position` usa segundos desde epoch al
// crear o mover una tarjeta — alcanza para ordenar sin una consulta de
// conteo por columna en cada movimiento. Ojo: la columna es `integer`
// (máx. ~2.1 mil millones) — Date.now() en milisegundos se pasa de rango,
// por eso se divide entre 1000.
export async function listKanbanTasks(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("kanban_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error) throw new Error("No se pudieron cargar las tareas del tablero.");
  return data;
}

export async function createKanbanTask(
  supabase: Client,
  params: { userId: string; title: string; description: string | null },
) {
  const { data, error } = await supabase
    .from("kanban_tasks")
    .insert({
      user_id: params.userId,
      title: params.title,
      description: params.description,
      position: Math.floor(Date.now() / 1000),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("No se pudo crear la tarea.");
  return data;
}

export async function moveKanbanTask(
  supabase: Client,
  id: string,
  status: KanbanTaskStatus,
) {
  const { error } = await supabase
    .from("kanban_tasks")
    .update({ status, position: Math.floor(Date.now() / 1000) })
    .eq("id", id);

  if (error) throw new Error("No se pudo mover la tarea.");
}

export async function deleteKanbanTask(supabase: Client, id: string) {
  const { error } = await supabase.from("kanban_tasks").delete().eq("id", id);
  if (error) throw new Error("No se pudo borrar la tarea.");
}
