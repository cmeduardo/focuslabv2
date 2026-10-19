import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, KanbanTaskStatus } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-07. `posicion` en segundos: la columna es integer y Date.now() en ms se sale de rango.
export async function listKanbanTasks(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("tareas_kanban")
    .select("*")
    .eq("perfil_id", userId)
    .order("posicion", { ascending: true });

  if (error) throw new Error("No se pudieron cargar las tareas del tablero.");
  return data;
}

export async function createKanbanTask(
  supabase: Client,
  params: { userId: string; title: string; description: string | null },
) {
  const { data, error } = await supabase
    .from("tareas_kanban")
    .insert({
      perfil_id: params.userId,
      titulo: params.title,
      descripcion: params.description,
      posicion: Math.floor(Date.now() / 1000),
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
    .from("tareas_kanban")
    .update({ estado: status, posicion: Math.floor(Date.now() / 1000) })
    .eq("id", id);

  if (error) throw new Error("No se pudo mover la tarea.");
}

export async function deleteKanbanTask(supabase: Client, id: string) {
  const { error } = await supabase.from("tareas_kanban").delete().eq("id", id);
  if (error) throw new Error("No se pudo borrar la tarea.");
}
