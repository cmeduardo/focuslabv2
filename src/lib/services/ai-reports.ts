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
  const { error } = await supabase.from("ai_reports").insert({
    session_id: params.sessionId,
    user_id: params.userId,
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
  session: { id: string; started_at: string; ended_at: string | null },
) {
  const [{ data: activityResults }, { data: runs }, { data: events }] = await Promise.all([
    supabase
      .from("activity_results")
      .select(
        "activity_type, accuracy, level_reached, duration_ms, metrics, protocol_version, run_id",
      )
      .eq("session_id", session.id)
      .order("completed_at", { ascending: true }),
    supabase
      .from("activity_runs")
      .select("id, activity_type, status, device_type, input_primary")
      .eq("session_id", session.id),
    supabase
      .from("interaction_events")
      .select("payload")
      .eq("session_id", session.id)
      .eq("event_type", "tool_start"),
  ]);

  const toolCounts = new Map<string, number>();
  for (const event of events ?? []) {
    const tool = event.payload?.tool;
    if (typeof tool === "string") {
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
    }
  }

  const runById = new Map((runs ?? []).map((run) => [run.id, run]));
  const incompleteByActivity = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  for (const run of runs ?? []) {
    if (run.status === "incompleta") {
      incompleteByActivity.set(
        run.activity_type,
        (incompleteByActivity.get(run.activity_type) ?? 0) + 1,
      );
    }
    if (run.device_type) {
      deviceCounts.set(run.device_type, (deviceCounts.get(run.device_type) ?? 0) + 1);
    }
  }
  const primaryDevice =
    [...deviceCounts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const startedAt = new Date(session.started_at).getTime();
  const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();

  return {
    sessionId: session.id,
    callbackUrl: getCallbackUrl(),
    sessionDurationMs: Math.max(0, endedAt - startedAt),
    deviceType: primaryDevice,
    activities: pickFirstAttempts(activityResults ?? []).map(({ first, attempts }) => {
      const run = first.run_id ? runById.get(first.run_id) : undefined;
      const report = first.metrics?.report;
      return {
        activityType: first.activity_type,
        protocolVersion: first.protocol_version,
        accuracy: first.accuracy,
        levelReached: first.level_reached,
        durationMs: first.duration_ms,
        attemptsCompleted: attempts,
        incompleteAttempts: incompleteByActivity.get(first.activity_type) ?? 0,
        deviceType: run?.device_type ?? null,
        inputType: run?.input_primary ?? null,
        ...(report && typeof report === "object" ? { metrics: report } : {}),
      };
    }),
    toolUsage: Array.from(toolCounts, ([tool, count]) => ({ tool, count })),
  };
}

// Sin N8N_AI_REPORT_WEBHOOK_URL no hace nada. Un fallo hacia n8n no rompe el cierre de sesión.
export async function generateAttentionReport(
  supabase: Client,
  session: { id: string; started_at: string; ended_at: string | null },
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
    .from("activity_results")
    .select("id", { count: "exact", head: true })
    .eq("session_id", params.sessionId);

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
    .from("activity_runs")
    .update({ status: "incompleta", ended_at: new Date().toISOString() })
    .eq("session_id", params.sessionId)
    .eq("status", "en_curso");

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
      .from("sessions")
      .select("id, started_at, ended_at")
      .eq("id", sessionId)
      .maybeSingle(),
    admin
      .from("ai_reports")
      .select("id, status")
      .eq("session_id", sessionId)
      .maybeSingle(),
  ]);

  if (!session || !report || report.status === "completado") {
    return false;
  }

  if (report.status === "fallido") {
    await admin
      .from("ai_reports")
      .update({ status: "pendiente", completed_at: null })
      .eq("id", report.id);
  }

  await generateAttentionReport(admin, session);

  return true;
}

// RF-12
export async function listAiReports(supabase: Client, userId: string) {
  const { data: reports, error } = await supabase
    .from("ai_reports")
    .select("id, session_id, status, requested_at, completed_at")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false });

  if (error) {
    throw new Error("No se pudo cargar el historial de informes.");
  }

  if (!reports || reports.length === 0) {
    return [];
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, started_at")
    .in(
      "id",
      reports.map((report) => report.session_id),
    );

  const startedAtBySession = new Map(
    (sessions ?? []).map((session) => [session.id, session.started_at]),
  );

  return reports.map((report) => ({
    ...report,
    sessionStartedAt: startedAtBySession.get(report.session_id) ?? null,
  }));
}

// RF-11. El filtro por user_id es defensa en profundidad (RLS ya restringe).
export async function getAiReport(
  supabase: Client,
  sessionId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("ai_reports")
    .select(
      "status, attentional_profile, strengths, areas_for_improvement, recommendations, requested_at, completed_at",
    )
    .eq("session_id", sessionId)
    .eq("user_id", userId)
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
    .from("ai_reports")
    .update({
      status: params.status,
      attentional_profile: params.attentionalProfile,
      strengths: params.strengths,
      areas_for_improvement: params.areasForImprovement,
      recommendations: params.recommendations,
      raw_response: params.rawResponse,
      completed_at: new Date().toISOString(),
    })
    .eq("session_id", params.sessionId)
    .eq("status", "pendiente")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo actualizar el informe de IA.");
  }

  return data;
}
