import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-06: temporizador Pomodoro configurable. Se llama desde Client
// Components (igual que activity-results.ts) — la política RLS
// pomodoro_sessions_all_own exige user_id = auth.uid().
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
    .from("pomodoro_sessions")
    .insert({
      user_id: params.userId,
      session_id: params.sessionId,
      work_duration_minutes: params.workMinutes,
      break_duration_minutes: params.breakMinutes,
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
    .from("pomodoro_sessions")
    .update({ completed_cycles: completedCycles })
    .eq("id", id);
}

export async function endPomodoroSession(
  supabase: Client,
  id: string,
  params: { interrupted: boolean; pauseCount: number; pausedMs: number },
) {
  await supabase
    .from("pomodoro_sessions")
    .update({
      ended_at: new Date().toISOString(),
      interrupted: params.interrupted,
      pause_count: params.pauseCount,
      paused_ms: params.pausedMs,
    })
    .eq("id", id);
}
