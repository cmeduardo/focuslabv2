import type { SupabaseClient } from "@supabase/supabase-js";

import type { DeviceContext, JsonObject, TrialRecord } from "@/lib/activities/types";
import type { ActivityType, Database, InputType } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

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

// Si falla, el guardado final la crea con el mismo id.
export async function startActivityRun(
  supabase: Client,
  run: RunIdentity & { practiceRounds: number; config: JsonObject },
) {
  const { error } = await supabase.from("intentos_actividad").upsert({
    id: run.runId,
    sesion_id: run.sessionId,
    perfil_id: run.userId,
    tipo_actividad: run.activityType,
    version_protocolo: run.protocolVersion,
    rondas_practica: run.practiceRounds,
    configuracion: run.config,
    estado: "en_curso",
  });
  if (error) throw new Error(`No se pudo abrir la corrida: ${error.message}`);
}

// Idempotente: corrida → ensayos → resumen → completada, con upserts.
export async function saveCompletedRun(supabase: Client, p: CompletedRunPayload) {
  const run = await supabase.from("intentos_actividad").upsert({
    id: p.runId,
    sesion_id: p.sessionId,
    perfil_id: p.userId,
    tipo_actividad: p.activityType,
    version_protocolo: p.protocolVersion,
    iniciado_en: p.startedAt,
    rondas_practica: p.practiceRounds,
    configuracion: p.config,
    tipo_dispositivo: p.device.deviceType,
    entrada_principal: p.inputPrimary,
    conteo_entradas: p.inputCounts,
    ancho_ventana: p.device.viewportW,
    alto_ventana: p.device.viewportH,
    proporcion_pixeles: p.device.devicePixelRatio,
    orientacion: p.device.orientation,
    navegador: p.device.browser,
    sistema_operativo: p.device.os,
    frecuencia_refresco_est: p.device.refreshHzEst,
    perdidas_visibilidad: p.visibilityLosses,
  });
  if (run.error) throw new Error(`Corrida: ${run.error.message}`);

  if (p.trials.length > 0) {
    const trials = await supabase.from("ensayos_actividad").upsert(
      p.trials.map((t) => ({
        intento_id: p.runId,
        perfil_id: p.userId,
        indice_ensayo: t.trialIndex,
        condicion: t.condition,
        inicio_estimulo_ms: t.stimulusOnsetMs,
        respuesta_en_ms: t.responseAtMs,
        tiempo_reaccion_ms: t.rtMs,
        respuesta: t.response,
        detalle_respuesta: t.detail ?? null,
        correcto: t.correct,
        clasificacion: t.classification,
        tipo_entrada: t.inputType,
        valido: t.valid,
        motivo_invalidez: t.invalidReason,
      })),
      { onConflict: "intento_id,indice_ensayo", ignoreDuplicates: true },
    );
    if (trials.error) throw new Error(`Ensayos: ${trials.error.message}`);
  }

  const result = await supabase.from("resultados_actividad").upsert(
    {
      intento_id: p.runId,
      sesion_id: p.sessionId,
      perfil_id: p.userId,
      tipo_actividad: p.activityType,
      version_protocolo: p.protocolVersion,
      duracion_ms: Math.max(0, Math.round(p.durationMs)),
      precision: p.accuracy,
      nivel_alcanzado: p.levelReached,
      metricas: p.metrics,
    },
    { onConflict: "intento_id", ignoreDuplicates: true },
  );
  if (result.error) throw new Error(`Resumen: ${result.error.message}`);

  const done = await supabase
    .from("intentos_actividad")
    .update({ estado: "completada", finalizado_en: p.endedAt })
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
    .from("intentos_actividad")
    .update({ estado: "incompleta", finalizado_en: new Date().toISOString() })
    .eq("id", runId)
    .eq("estado", "en_curso");
}

// fetch no sobrevive a pagehide; sendBeacon sí.
export function beaconRunIncomplete(runId: string) {
  navigator.sendBeacon(`/api/activity-runs/${runId}/abandon`);
}

// Guardados fallidos: se reintentan al volver a /actividades.
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
