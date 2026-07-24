// app/api/reports/generate/route.ts
// Endpoint que el frontend llama para generar un reporte.
// Recopila datos del usuario, los envía al webhook de n8n,
// y devuelve inmediatamente { report_id, status: "processing" }.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Recibir período del body (opcional, default: última semana)
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const periodStart = body.period_start
      ? new Date(body.period_start)
      : weekAgo;
    const periodEnd = body.period_end ? new Date(body.period_end) : now;

    // --- Obtener perfil del usuario ---
    const { data: profile } = await supabase
      .from("profiles")
      .select("university, career, semester")
      .eq("id", user.id)
      .single();

    // --- Crear registro del reporte en DB ---
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        user_id: user.id,
        status: "processing",
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .select("id")
      .single();

    if (reportError || !report) {
      console.error("Error creando reporte:", reportError);
      return NextResponse.json(
        { error: "Error al crear el reporte" },
        { status: 500 }
      );
    }

    // --- Obtener sesiones de pomodoro del período ---
    const { data: sessions } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());

    const allSessions = sessions || [];
    // pomodoro_sessions usa campo `completed boolean`, no `status`
    const completedPomodoros = allSessions.filter((s) => s.completed === true);
    const interruptedPomodoros = allSessions.filter(
      (s) => s.completed === false && s.ended_at != null
    );

    // --- Obtener actividades cognitivas del período ---
    const { data: activities } = await supabase
      .from("activity_results")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_at", periodStart.toISOString())
      .lte("completed_at", periodEnd.toISOString())
      .order("completed_at", { ascending: true });

    const allActivities = activities || [];

    // --- Obtener tareas del período ---
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());

    const allTasks = tasks || [];
    const tasksCompleted = allTasks.filter((t) => t.status === "completed");
    const tasksOverdue = allTasks.filter(
      (t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < now
    );

    // --- Calcular métricas de atención ---
    const reactionTests = allActivities.filter(
      (a) => a.activity === "reaction_test"
    );
    const focusFlows = allActivities.filter(
      (a) => a.activity === "focus_flow"
    );
    const memoryMatrix = allActivities.filter(
      (a) => a.activity === "memory_matrix"
    );

    const avgReactionTime =
      reactionTests.length > 0
        ? Math.round(
            reactionTests.reduce((sum, a) => sum + (a.reaction_time_ms || 0), 0) /
              reactionTests.length
          )
        : null;

    const sustainedScore =
      focusFlows.length > 0
        ? parseFloat(
            (
              focusFlows.reduce((sum, a) => sum + (a.score || 0), 0) /
              focusFlows.length
            ).toFixed(1)
          )
        : null;

    const memorySpan =
      memoryMatrix.length > 0
        ? Math.round(
            memoryMatrix.reduce((sum, a) => sum + (a.span || 0), 0) /
              memoryMatrix.length
          )
        : null;

    // --- Calcular patrones horarios ---
    const hourCounts: Record<number, number> = {};
    allSessions.forEach((s) => {
      const hour = new Date(s.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const sortedHours = Object.entries(hourCounts)
      .map(([h, c]) => ({ hour: parseInt(h), count: c }))
      .sort((a, b) => b.count - a.count);

    const peakHours = sortedHours.slice(0, 3).map((h) => h.hour);
    const lowHours = sortedHours.slice(-3).map((h) => h.hour);

    // --- Calcular días activos ---
    const activeDays = new Set(
      allSessions.map((s) => new Date(s.created_at).toISOString().split("T")[0])
    ).size;

    // --- Calcular focus_consistency ---
    const totalPomodoros = completedPomodoros.length + interruptedPomodoros.length;
    const focusConsistency =
      totalPomodoros > 0
        ? parseFloat(
            (completedPomodoros.length / totalPomodoros).toFixed(2)
          )
        : 0;

    // --- Calcular total focus time ---
    const totalFocusMinutes = completedPomodoros.reduce(
      (sum, s) => sum + (s.duration_minutes || 25),
      0
    );

    // --- Calcular avg focus rating ---
    const ratings = completedPomodoros
      .filter((s) => s.focus_rating != null)
      .map((s) => s.focus_rating);
    const avgFocusRating =
      ratings.length > 0
        ? parseFloat(
            (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          )
        : null;

    // --- Calcular habit consistency ---
    const totalDaysInPeriod = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const habitConsistency =
      totalDaysInPeriod > 0
        ? parseFloat((activeDays / totalDaysInPeriod).toFixed(2))
        : 0;

    // --- Construir payload para n8n ---
    const payload = {
      report_id: report.id,
      user_id: user.id,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      user_profile: {
        university: profile?.university || null,
        career: profile?.career || null,
        semester: profile?.semester || null,
      },
      summary: {
        total_sessions: allSessions.length,
        total_focus_time_minutes: totalFocusMinutes,
        total_events: allActivities.length,
        active_days: activeDays,
        avg_session_duration_minutes:
          completedPomodoros.length > 0
            ? Math.round(totalFocusMinutes / completedPomodoros.length)
            : 0,
      },
      attention_metrics: {
        avg_reaction_time_ms: avgReactionTime,
        sustained_attention_score: sustainedScore,
        working_memory_span: memorySpan,
        focus_consistency: focusConsistency,
      },
      productivity_metrics: {
        pomodoros_completed: completedPomodoros.length,
        pomodoros_interrupted: interruptedPomodoros.length,
        completion_rate: focusConsistency,
        avg_focus_rating: avgFocusRating,
        tasks_completed: tasksCompleted.length,
        tasks_overdue: tasksOverdue.length,
        habit_consistency: habitConsistency,
      },
      patterns: {
        peak_focus_hours: peakHours,
        low_focus_hours: lowHours,
      },
      activity_history: allActivities.slice(-20).map((a) => ({
        activity: a.activity,
        score: a.score,
        max_score: a.max_score || 100,
        completed_at: a.completed_at,
      })),
    };

    // --- Enviar a n8n (async, no esperamos la respuesta del análisis) ---
    fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("Error enviando webhook a n8n:", err);
      // Marcar reporte como fallido si no se pudo enviar
      supabase
        .from("reports")
        .update({ status: "failed" })
        .eq("id", report.id)
        .then(() => {});
    });

    return NextResponse.json({
      report_id: report.id,
      status: "processing",
    });
  } catch (error) {
    console.error("Error generando reporte:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
