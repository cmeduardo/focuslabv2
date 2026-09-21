import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-08: rastreador de hábitos. habit_logs tiene unique(habit_id,
// log_date) — togglear un día es un upsert sobre esa clave.
export async function listHabits(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error("No se pudieron cargar los hábitos.");
  return data;
}

export async function createHabit(
  supabase: Client,
  params: { userId: string; name: string },
) {
  const { data, error } = await supabase
    .from("habits")
    .insert({ user_id: params.userId, name: params.name })
    .select("*")
    .single();

  if (error || !data) throw new Error("No se pudo crear el hábito.");
  return data;
}

export async function archiveHabit(supabase: Client, id: string) {
  const { error } = await supabase
    .from("habits")
    .update({ archived: true })
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
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", fromDate)
    .lte("log_date", toDate);

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
  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: params.habitId,
      user_id: params.userId,
      log_date: params.logDate,
      completed: params.completed,
    },
    { onConflict: "habit_id,log_date" },
  );

  if (error) throw new Error("No se pudo actualizar el hábito.");
}
