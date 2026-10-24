import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export async function startPomodoroSession(
  supabase: Client,
  params: {
    userId: string;
    sessionId: string;
    workMinutes: number;
    breakMinutes: number;
  },
) {
  const { data, error } = await supabase
    .from("sesiones_pomodoro")
    .insert({
      perfil_id: params.userId,
      sesion_id: params.sessionId,
      duracion_trabajo_minutos: params.workMinutes,
      duracion_descanso_minutos: params.breakMinutes,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("No se pudo iniciar el bloque de Pomodoro.");
  }
  return data.id;
}

export async function incrementPomodoroCycle(
  supabase: Client,
  id: string,
  completedCycles: number,
) {
  await supabase
    .from("sesiones_pomodoro")
    .update({ ciclos_completados: completedCycles })
    .eq("id", id);
}

export async function endPomodoroSession(
  supabase: Client,
  id: string,
  params: { interrupted: boolean; pauseCount: number; pausedMs: number },
) {
  await supabase
    .from("sesiones_pomodoro")
    .update({
      finalizada_en: new Date().toISOString(),
      interrumpida: params.interrupted,
      veces_pausado: params.pauseCount,
      ms_pausado: params.pausedMs,
    })
    .eq("id", id);
}
