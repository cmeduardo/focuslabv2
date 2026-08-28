import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-09: calendario semanal simple.
export async function listCalendarEventsForWeek(
  supabase: Client,
  userId: string,
  weekStartIso: string,
  weekEndIso: string,
) {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_at", weekStartIso)
    .lt("start_at", weekEndIso)
    .order("start_at", { ascending: true });

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
    .from("calendar_events")
    .insert({
      user_id: params.userId,
      title: params.title,
      description: params.description,
      start_at: params.startAt,
      end_at: params.endAt,
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
    .from("calendar_events")
    .update({ completed })
    .eq("id", id);
  if (error) throw new Error("No se pudo registrar la respuesta.");
}

export async function deleteCalendarEvent(supabase: Client, id: string) {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
  if (error) throw new Error("No se pudo borrar el evento.");
}
