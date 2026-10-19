import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { pickFirstAttempts } from "@/lib/activities/report";
import { markSessionCompleted } from "@/lib/services/sessions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiReportStatus, Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// Cliente admin: los participantes no tienen policy de insert.
export async function createPendingAiReport(
  supabase: Client,
  params: { sessionId: string; userId: string },
) {
  const { error } = await supabase.from("informes_ia").insert({
    sesion_id: params.sessionId,
    perfil_id: params.userId,
  });

  if (error) {
    throw new Error("No se pudo crear el informe de IA.");
  }
}

// El mismo workflow atiende dev y producción: la URL de retorno va en cada request.
function getCallbackUrl() {
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = productionHost
    ? `https://${productionHost}`
    : "http://172.17.0.1:3000";

  return `${origin}/api/webhooks/ai-report`;
}

async function buildSessionSummary(
  supabase: Client,
  session: { id: string; iniciada_en: string; finalizada_en: string | null },
) {
  const [{ data: activityResults }, { data: runs }, { data: events }] = await Promise.all([
    supabase
      .from("resultados_actividad")
      .select(
        "tipo_actividad, precision, nivel_alcanzado, duracion_ms, metricas, version_protocolo, intento_id",
      )
      .eq("sesion_id", session.id)
      .order("completado_en", { ascending: true }),
    supabase
      .from("intentos_actividad")
      .select("id, tipo_actividad, estado, tipo_dispositivo, entrada_principal")
      .eq("sesion_id", session.id),
    supabase
      .from("eventos_interaccion")
      .select("datos")
      .eq("sesion_id", session.id)
      .eq("tipo_evento", "tool_start"),
  ]);

  const toolCounts = new Map<string, number>();
  for (const event of events ?? []) {
    const tool = event.datos?.tool;
    if (typeof tool === "string") {
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
    }
  }

  const runById = new Map((runs ?? []).map((run) => [run.id, run]));
  const incompleteByActivity = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  for (const run of runs ?? []) {
    if (run.estado === "incompleta") {
      incompleteByActivity.set(
        run.tipo_actividad,
        (incompleteByActivity.get(run.tipo_actividad) ?? 0) + 1,
      );
    }
    if (run.tipo_dispositivo) {
      deviceCounts.set(run.tipo_dispositivo, (deviceCounts.get(run.tipo_dispositivo) ?? 0) + 1);
    }
  }
  const primaryDevice =
    [...deviceCounts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const startedAt = new Date(session.iniciada_en).getTime();
  const endedAt = session.finalizada_en ? new Date(session.finalizada_en).getTime() : Date.now();

  return {
    sessionId: session.id,
    callbackUrl: getCallbackUrl(),
    sessionDurationMs: Math.max(0, endedAt - startedAt),
    deviceType: primaryDevice,
    activities: pickFirstAttempts(activityResults ?? []).map(({ first, attempts }) => {
      const run = first.intento_id ? runById.get(first.intento_id) : undefined;
      const report = first.metricas?.report;
      return {
        activityType: first.tipo_actividad,
        protocolVersion: first.version_protocolo,
        accuracy: first.precision,
        levelReached: first.nivel_alcanzado,
        durationMs: first.duracion_ms,
        attemptsCompleted: attempts,
        incompleteAttempts: incompleteByActivity.get(first.tipo_actividad) ?? 0,
        deviceType: run?.tipo_dispositivo ?? null,
        inputType: run?.entrada_principal ?? null,
        ...(report && typeof report === "object" ? { metrics: report } : {}),
      };
    }),
    toolUsage: Array.from(toolCounts, ([tool, count]) => ({ tool, count })),
  };
}

// Sin N8N_AI_REPORT_WEBHOOK_URL no hace nada. Un fallo hacia n8n no rompe el cierre de sesión.
export async function generateAttentionReport(
  supabase: Client,
  session: { id: string; iniciada_en: string; finalizada_en: string | null },
) {
  const webhookUrl = process.env.N8N_AI_REPORT_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  const summary = await buildSessionSummary(supabase, session);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summary),
    });

    // fetch no lanza en respuestas no-2xx.
    if (!response.ok) {
      console.error(
        `El webhook de informe de IA respondió ${response.status} ${response.statusText}.`,
        await response.text().catch(() => ""),
      );
    }
  } catch (error) {
    console.error("No se pudo disparar el webhook de informe de IA.", error);
  }
}

// RF-10. null si la sesión no es del usuario o ya estaba cerrada; "sin_desafios" (sin
// cerrarla) si no completó ningún desafío.
export async function completeSessionAndRequestReport(
  supabase: Client,
  params: { sessionId: string; userId: string },
) {
  const { count, error } = await supabase
    .from("resultados_actividad")
    .select("id", { count: "exact", head: true })
    .eq("sesion_id", params.sessionId);

  if (error) {
    throw new Error("No se pudo revisar los desafíos de la sesión.");
  }

  if (!count) {
    return "sin_desafios" as const;
  }

  const session = await markSessionCompleted(
    supabase,
    params.sessionId,
    params.userId,
  );

  if (!session) {
    return null;
  }

  // Una ronda que quedó abierta ya no se va a completar.
  await supabase
    .from("intentos_actividad")
    .update({ estado: "incompleta", finalizado_en: new Date().toISOString() })
    .eq("sesion_id", params.sessionId)
    .eq("estado", "en_curso");

  const admin = createAdminClient();
  await createPendingAiReport(admin, params);
  await generateAttentionReport(supabase, session);

  return session;
}

// Reintento manual: un informe 'fallido' vuelve a 'pendiente' antes de reenviarse.
export async function retryAiReport(sessionId: string) {
  const admin = createAdminClient();

  const [{ data: session }, { data: report }] = await Promise.all([
    admin
      .from("sesiones")
      .select("id, iniciada_en, finalizada_en")
      .eq("id", sessionId)
      .maybeSingle(),
    admin
      .from("informes_ia")
      .select("id, estado")
      .eq("sesion_id", sessionId)
      .maybeSingle(),
  ]);

  if (!session || !report || report.estado === "completado") {
    return false;
  }

  if (report.estado === "fallido") {
    await admin
      .from("informes_ia")
      .update({ estado: "pendiente", completado_en: null })
      .eq("id", report.id);
  }

  await generateAttentionReport(admin, session);

  return true;
}

// RF-12
export async function listAiReports(supabase: Client, userId: string) {
  const { data: reports, error } = await supabase
    .from("informes_ia")
    .select("id, sesion_id, estado, solicitado_en, completado_en")
    .eq("perfil_id", userId)
    .order("solicitado_en", { ascending: false });

  if (error) {
    throw new Error("No se pudo cargar el historial de informes.");
  }

  if (!reports || reports.length === 0) {
    return [];
  }

  const { data: sessions } = await supabase
    .from("sesiones")
    .select("id, iniciada_en")
    .in(
      "id",
      reports.map((report) => report.sesion_id),
    );

  const startedAtBySession = new Map(
    (sessions ?? []).map((session) => [session.id, session.iniciada_en]),
  );

  return reports.map((report) => ({
    ...report,
    sessionStartedAt: startedAtBySession.get(report.sesion_id) ?? null,
  }));
}

// RF-11. El filtro por perfil_id es defensa en profundidad (RLS ya restringe).
export async function getAiReport(
  supabase: Client,
  sessionId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("informes_ia")
    .select(
      "estado, perfil_atencional, fortalezas, areas_de_mejora, recomendaciones, solicitado_en, completado_en",
    )
    .eq("sesion_id", sessionId)
    .eq("perfil_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo cargar el informe.");
  }

  return data;
}

// Solo se aplica si el informe sigue 'pendiente'.
export async function applyAiReportResult(
  supabase: Client,
  params: {
    sessionId: string;
    status: AiReportStatus;
    attentionalProfile: string | null;
    strengths: string[];
    areasForImprovement: string[];
    recommendations: string[];
    rawResponse: Record<string, unknown> | null;
  },
) {
  const { data, error } = await supabase
    .from("informes_ia")
    .update({
      estado: params.status,
      perfil_atencional: params.attentionalProfile,
      fortalezas: params.strengths,
      areas_de_mejora: params.areasForImprovement,
      recomendaciones: params.recommendations,
      respuesta_cruda: params.rawResponse,
      completado_en: new Date().toISOString(),
    })
    .eq("sesion_id", params.sessionId)
    .eq("estado", "pendiente")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo actualizar el informe de IA.");
  }

  return data;
}
