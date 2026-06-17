import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  period_start: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  period_end: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
})

// POST /api/reports/generate
// Agrega datos del período, crea reporte y envía webhook a n8n
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parámetros inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { period_start, period_end } = parsed.data

    // Asegurar formato ISO para las queries
    const startISO = period_start.includes('T') ? period_start : `${period_start}T00:00:00.000Z`
    const endISO = period_end.includes('T') ? period_end : `${period_end}T23:59:59.999Z`

    // Obtener datos del período en paralelo
    const [
      { data: profile },
      { data: sesiones },
      { data: pomodoroSesiones },
      { data: tareas },
      { data: habitos },
      { data: habitLogs },
      { data: actividades },
      { data: eventos },
    ] = await Promise.all([
      supabase.from('profiles').select('university, career, semester').eq('id', user.id).single(),

      supabase
        .from('sessions')
        .select('id, started_at, ended_at, duration_seconds, total_events, focus_score')
        .eq('user_id', user.id)
        .gte('started_at', startISO)
        .lte('started_at', endISO),

      supabase
        .from('pomodoro_sessions')
        .select('id, started_at, ended_at, duration_seconds, completed, interruptions, focus_rating')
        .eq('user_id', user.id)
        .gte('started_at', startISO)
        .lte('started_at', endISO),

      supabase
        .from('tasks')
        .select('id, status, priority, created_at, completed_at, due_date, estimated_pomodoros, completed_pomodoros')
        .eq('user_id', user.id)
        .gte('created_at', startISO)
        .lte('created_at', endISO),

      supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', user.id),

      supabase
        .from('habit_logs')
        .select('habit_id, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', period_start.split('T')[0])
        .lte('completed_at', period_end.split('T')[0]),

      supabase
        .from('activity_results')
        .select('activity, score, max_score, duration_seconds, metrics, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', startISO)
        .lte('completed_at', endISO),

      supabase
        .from('events')
        .select('category, event_type, timestamp')
        .eq('user_id', user.id)
        .gte('timestamp', startISO)
        .lte('timestamp', endISO),
    ])

    // --- Calcular métricas agregadas ---

    // Sesiones
    const totalSesiones = sesiones?.length ?? 0
    const totalDuracionSeg = sesiones?.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0) ?? 0
    const avgDuracionMin = totalSesiones > 0 ? Math.round(totalDuracionSeg / totalSesiones / 60) : 0
    const totalEventos = eventos?.length ?? 0

    // Días activos (días únicos con al menos una sesión)
    const diasActivos = new Set(
      sesiones?.map((s) => s.started_at.split('T')[0]) ?? []
    ).size

    // Pomodoros
    const pomodorosCompletados = pomodoroSesiones?.filter((p) => p.completed).length ?? 0
    const pomodorosInterrumpidos = pomodoroSesiones?.filter((p) => !p.completed).length ?? 0
    const completionRate = pomodoroSesiones?.length
      ? Math.round((pomodorosCompletados / pomodoroSesiones.length) * 100) / 100
      : 0
    const ratingsValidos = pomodoroSesiones
      ?.map((p) => p.focus_rating)
      .filter((r): r is number => r !== null && r !== undefined) ?? []
    const avgFocusRating = ratingsValidos.length
      ? Math.round((ratingsValidos.reduce((a, b) => a + b, 0) / ratingsValidos.length) * 10) / 10
      : null
    const focusScoreAvg = avgFocusRating ? Math.round(avgFocusRating * 20) : null

    // Tareas
    const tareasCompletadas = tareas?.filter((t) => t.status === 'completed').length ?? 0
    const tareasVencidas = tareas?.filter((t) => {
      if (!t.due_date || t.status === 'completed') return false
      return new Date(t.due_date) < new Date()
    }).length ?? 0

    // Hábitos — consistencia (días cumplidos / días del período)
    const diasPeriodo = Math.max(
      1,
      Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 86400000)
    )
    const totalHabitos = habitos?.length ?? 0
    const logsTotales = habitLogs?.length ?? 0
    const habitConsistency = totalHabitos > 0
      ? Math.round((logsTotales / (totalHabitos * diasPeriodo)) * 100) / 100
      : 0

    // Patrones por hora (actividad pico)
    const porHora: Record<number, number> = {}
    for (const e of eventos ?? []) {
      const h = new Date(e.timestamp).getHours()
      porHora[h] = (porHora[h] ?? 0) + 1
    }
    const horaOrdenada = Object.entries(porHora)
      .sort((a, b) => b[1] - a[1])
    const horasPico = horaOrdenada.slice(0, 3).map(([h]) => Number(h))
    const horasBajas = horaOrdenada.slice(-3).map(([h]) => Number(h))

    // Métricas de atención de actividades
    const reactionTests = actividades?.filter((a) => a.activity === 'reaction_test') ?? []
    const focusFlows = actividades?.filter((a) => a.activity === 'focus_flow') ?? []
    const memoryMatrix = actividades?.filter((a) => a.activity === 'memory_matrix') ?? []

    const avgReactionTime = reactionTests.length
      ? Math.round(
          reactionTests
            .map((a) => (a.metrics as Record<string, number>).avg_reaction_time_ms ?? 0)
            .reduce((a, b) => a + b, 0) / reactionTests.length
        )
      : null

    const avgFocusAccuracy = focusFlows.length
      ? Math.round(
          focusFlows
            .map((a) => (a.metrics as Record<string, number>).accuracy_percent ?? 0)
            .reduce((a, b) => a + b, 0) / focusFlows.length
        )
      : null

    const avgMemorySpan = memoryMatrix.length
      ? Math.round(
          memoryMatrix
            .map((a) => (a.metrics as Record<string, number>).working_memory_span ?? 0)
            .reduce((a, b) => a + b, 0) / memoryMatrix.length
        )
      : null

    // Construir raw_data completo
    const rawData = {
      summary: {
        total_sessions: totalSesiones,
        total_focus_time_minutes: Math.round(totalDuracionSeg / 60),
        total_events: totalEventos,
        active_days: diasActivos,
        avg_session_duration_minutes: avgDuracionMin,
      },
      attention_metrics: {
        avg_reaction_time_ms: avgReactionTime,
        sustained_attention_score: avgFocusAccuracy,
        working_memory_span: avgMemorySpan,
        focus_consistency: completionRate,
      },
      productivity_metrics: {
        pomodoros_completed: pomodorosCompletados,
        pomodoros_interrupted: pomodorosInterrumpidos,
        completion_rate: completionRate,
        avg_focus_rating: avgFocusRating,
        tasks_completed: tareasCompletadas,
        tasks_overdue: tareasVencidas,
        habit_consistency: habitConsistency,
      },
      patterns: {
        peak_focus_hours: horasPico,
        low_focus_hours: horasBajas,
      },
      activity_history: (actividades ?? []).map((a) => ({
        activity: a.activity,
        score: a.score,
        max_score: a.max_score,
        completed_at: a.completed_at,
      })),
    }

    // Crear el reporte en Supabase con estado 'pending'
    const { data: reporte, error: reporteError } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        period_start: startISO,
        period_end: endISO,
        status: 'pending',
        raw_data: rawData,
        focus_score_avg: focusScoreAvg,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reporteError || !reporte) {
      console.error('Error creando reporte:', reporteError)
      return NextResponse.json({ error: 'Error al crear el reporte' }, { status: 500 })
    }

    // Enviar webhook a n8n si la URL está configurada
    const n8nUrl = process.env.N8N_WEBHOOK_URL
    if (n8nUrl && !n8nUrl.includes('example.com')) {
      const webhookPayload = {
        report_id: reporte.id,
        user_id: user.id,
        period: { start: startISO, end: endISO },
        user_profile: {
          university: profile?.university ?? null,
          career: profile?.career ?? null,
          semester: profile?.semester ?? null,
        },
        ...rawData,
      }

      // Marcar como processing
      await supabase
        .from('reports')
        .update({ status: 'processing' })
        .eq('id', reporte.id)

      // Disparar webhook en background (sin await para no bloquear la respuesta)
      fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.N8N_WEBHOOK_SECRET
            ? { 'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET }
            : {}),
        },
        body: JSON.stringify(webhookPayload),
      }).catch((err) => console.error('Error enviando webhook a n8n:', err))
    }

    return NextResponse.json({ report_id: reporte.id, status: reporte.status }, { status: 201 })
  } catch (err) {
    console.error('Error en /api/reports/generate:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
