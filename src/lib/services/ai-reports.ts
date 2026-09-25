import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { markSessionCompleted } from "@/lib/services/sessions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiReportStatus, Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// Módulo 5 (Sprint 4): crea la fila 'pendiente' al completar la sesión (ver
// POST /api/sessions/[sessionId]/complete). Requiere el cliente admin: no
// hay policy de insert para participantes, ver 0011_ai_reports.sql.
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

// n8n corre en la máquina local del investigador (Docker), no en Vercel — el
// nodo "Callback a Next.js" no puede tener la URL de retorno hardcodeada
// porque el mismo workflow atiende tanto al Next.js local (dev) como al
// desplegado en Vercel (prod). Se la pasamos en cada request:
// `VERCEL_PROJECT_PRODUCTION_URL` la pone Vercel automáticamente en
// producción; sin esa variable (dev local), usa el gateway del bridge de
// Docker (ver ARCHITECTURE.md §7, nota de red local).
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
  const [{ data: activityResults }, { data: events }] = await Promise.all([
    supabase
      .from("activity_results")
      .select("activity_type, accuracy, level_reached, duration_ms")
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

  const startedAt = new Date(session.started_at).getTime();
  const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();

  return {
    sessionId: session.id,
    callbackUrl: getCallbackUrl(),
    sessionDurationMs: Math.max(0, endedAt - startedAt),
    activities: (activityResults ?? []).map((row) => ({
      activityType: row.activity_type,
      accuracy: row.accuracy,
      levelReached: row.level_reached,
      durationMs: row.duration_ms,
    })),
    toolUsage: Array.from(toolCounts, ([tool, count]) => ({ tool, count })),
  };
}

// Dispara el webhook hacia n8n con el resumen estructurado de la sesión (ver
// ARCHITECTURE.md §7). Sin N8N_AI_REPORT_WEBHOOK_URL configurada (dev sin
// instancia de n8n), no hace nada y el informe queda 'pendiente'. Un fallo
// de red hacia n8n tampoco debe romper el cierre de sesión del participante:
// solo se registra en el log del servidor.
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

    // fetch no lanza en respuestas no-2xx (p. ej. 530 del túnel de
    // Cloudflare caído, 404 si el workflow está inactivo): registrarlas
    // explícitamente para que no fallen en silencio.
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

// RF-10: orquesta el cierre de sesión completo (usada tanto por
// POST /api/sessions/[sessionId]/complete como por el botón "Terminar
// sesión" del AppShell, ver components/layout/complete-session-action.ts).
// Devuelve null si la sesión no es del usuario o ya estaba cerrada.
export async function completeSessionAndRequestReport(
  supabase: Client,
  params: { sessionId: string; userId: string },
) {
  const session = await markSessionCompleted(
    supabase,
    params.sessionId,
    params.userId,
  );

  if (!session) {
    return null;
  }

  const admin = createAdminClient();
  await createPendingAiReport(admin, params);
  await generateAttentionReport(supabase, session);

  return session;
}

// RF-12: historial de informes del participante, para /informes. Trae la
// fecha de la sesión en una segunda consulta (sin relaciones embebidas en
// database.ts, ver convención del resto de lib/services/).
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

// RF-11: detalle de un informe puntual, para /informes/[sessionId]. El
// filtro por user_id es defensa en profundidad (RLS ya restringe a lo
// propio), no la única barrera.
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

// Módulo 5 (Sprint 4): aplica el resultado que n8n/GPT-4o-mini devuelve al
// webhook de retorno (POST /api/webhooks/ai-report) sobre la fila 'pendiente'
// creada al completar la sesión. El filtro por status = 'pendiente' evita
// pisar un informe que ya se haya completado (reintentos del webhook, etc.).
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
