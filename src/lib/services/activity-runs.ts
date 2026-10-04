import type { SupabaseClient } from "@supabase/supabase-js";

import type { DeviceContext, JsonObject, TrialRecord } from "@/lib/activities/types";
import type { ActivityType, Database, InputType } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// Corridas registradas de las actividades v2 (ver migración
// 20261004000001). Se llama desde Client Components: las políticas RLS
// exigen user_id = auth.uid() y consentimiento aceptado (RS-02, RS-05).

export type RunIdentity = {
  runId: string;
  sessionId: string;
  userId: string;
  activityType: ActivityType;
  protocolVersion: string;
};

export type CompletedRunPayload = RunIdentity & {
  startedAt: string;
  endedAt: string;
  practiceRounds: number;
  config: JsonObject;
  device: DeviceContext;
  inputCounts: Partial<Record<InputType, number>>;
  inputPrimary: InputType | null;
  visibilityLosses: number;
  trials: TrialRecord[];
  durationMs: number;
  accuracy: number | null;
  levelReached: number | null;
  metrics: JsonObject;
};

// Abre la corrida al empezar la ronda registrada (la práctica nunca crea
// filas). Si falla, el guardado final la vuelve a crear con el mismo id.
export async function startActivityRun(
  supabase: Client,
  run: RunIdentity & { practiceRounds: number; config: JsonObject },
) {
  const { error } = await supabase.from("activity_runs").upsert({
    id: run.runId,
    session_id: run.sessionId,
    user_id: run.userId,
    activity_type: run.activityType,
    protocol_version: run.protocolVersion,
    practice_rounds: run.practiceRounds,
    config: run.config,
    status: "en_curso",
  });
  if (error) throw new Error(`No se pudo abrir la corrida: ${error.message}`);
}

// Guardado final en lote, idempotente: el orden (corrida → ensayos →
// resumen → estado completada) hace que un reintento a mitad de camino
// nunca duplique nada (upserts sobre claves únicas).
export async function saveCompletedRun(supabase: Client, p: CompletedRunPayload) {
  const run = await supabase.from("activity_runs").upsert({
    id: p.runId,
    session_id: p.sessionId,
    user_id: p.userId,
    activity_type: p.activityType,
    protocol_version: p.protocolVersion,
    started_at: p.startedAt,
    practice_rounds: p.practiceRounds,
    config: p.config,
    device_type: p.device.deviceType,
    input_primary: p.inputPrimary,
    input_counts: p.inputCounts,
    viewport_w: p.device.viewportW,
    viewport_h: p.device.viewportH,
    device_pixel_ratio: p.device.devicePixelRatio,
    orientation: p.device.orientation,
    browser: p.device.browser,
    os: p.device.os,
    refresh_hz_est: p.device.refreshHzEst,
    visibility_losses: p.visibilityLosses,
  });
  if (run.error) throw new Error(`Corrida: ${run.error.message}`);

  if (p.trials.length > 0) {
    const trials = await supabase.from("activity_trials").upsert(
      p.trials.map((t) => ({
        run_id: p.runId,
        user_id: p.userId,
        trial_index: t.trialIndex,
        condition: t.condition,
        stimulus_onset_ms: t.stimulusOnsetMs,
        response_at_ms: t.responseAtMs,
        rt_ms: t.rtMs,
        response: t.response,
        response_detail: t.detail ?? null,
        correct: t.correct,
        classification: t.classification,
        input_type: t.inputType,
        valid: t.valid,
        invalid_reason: t.invalidReason,
      })),
      { onConflict: "run_id,trial_index", ignoreDuplicates: true },
    );
    if (trials.error) throw new Error(`Ensayos: ${trials.error.message}`);
  }

  const result = await supabase.from("activity_results").upsert(
    {
      run_id: p.runId,
      session_id: p.sessionId,
      user_id: p.userId,
      activity_type: p.activityType,
      protocol_version: p.protocolVersion,
      duration_ms: Math.max(0, Math.round(p.durationMs)),
      accuracy: p.accuracy,
      level_reached: p.levelReached,
      metrics: p.metrics,
    },
    { onConflict: "run_id", ignoreDuplicates: true },
  );
  if (result.error) throw new Error(`Resumen: ${result.error.message}`);

  const done = await supabase
    .from("activity_runs")
    .update({ status: "completada", ended_at: p.endedAt })
    .eq("id", p.runId);
  if (done.error) throw new Error(`Estado: ${done.error.message}`);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number,
  baseDelayMs: number,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastError;
}

export async function markRunIncomplete(supabase: Client, runId: string) {
  await supabase
    .from("activity_runs")
    .update({ status: "incompleta", ended_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("status", "en_curso");
}

// Cierre de pestaña/página a mitad de la ronda: fetch normal no sobrevive a
// pagehide, sendBeacon sí (y manda las cookies de sesión, mismo origen).
export function beaconRunIncomplete(runId: string) {
  navigator.sendBeacon(`/api/activity-runs/${runId}/abandon`);
}

// Cola local para guardados que fallaron tras todos los reintentos (red
// caída en el taller): se reintenta al volver a /actividades. Es la única
// copia del resultado hasta que suba, por eso no se descarta en silencio.
const PENDING_KEY = "focuslab:pending-runs";

function readPending(): CompletedRunPayload[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as CompletedRunPayload[]) : [];
  } catch {
    return [];
  }
}

function writePending(items: CompletedRunPayload[]) {
  try {
    if (items.length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  } catch {
    // Almacenamiento bloqueado (modo privado): no hay más que hacer.
  }
}

export function queuePendingRun(payload: CompletedRunPayload) {
  writePending([...readPending().filter((p) => p.runId !== payload.runId), payload]);
}

export async function flushPendingRuns(supabase: Client, userId: string) {
  const pending = readPending();
  if (pending.length === 0) return 0;
  const remaining: CompletedRunPayload[] = [];
  let saved = 0;
  for (const payload of pending) {
    // Solo los del usuario actual (laptop compartida en el taller).
    if (payload.userId !== userId) {
      remaining.push(payload);
      continue;
    }
    try {
      await saveCompletedRun(supabase, payload);
      saved += 1;
    } catch {
      remaining.push(payload);
    }
  }
  writePending(remaining);
  return saved;
}
