import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/DashboardClient'

// Calcula la racha actual de un hábito dado sus logs
function calcStreak(logs: string[]): number {
  if (!logs.length) return 0
  const sorted = [...new Set(logs)].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  let streak = 0
  let current = new Date(today)

  for (const log of sorted) {
    const logDate = log.split('T')[0]
    const expected = current.toISOString().split('T')[0]
    if (logDate === expected) {
      streak++
      current.setDate(current.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// Dashboard principal — carga datos reales desde Supabase (server component)
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const startOfDay = `${todayStr}T00:00:00.000Z`
  const endOfDay = `${todayStr}T23:59:59.999Z`

  // Últimos 7 días para sparkline
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  // Fetch paralelo de todos los datos necesarios
  const [
    { data: profile },
    { data: pomodorosHoy },
    { data: tareasCompletadasHoy },
    { data: habitLogs },
    { data: pomodorosUltimos7 },
    { data: actividadesRecientes },
    { data: tareasRecientes },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    // Pomodoros completados hoy
    supabase
      .from('pomodoro_sessions')
      .select('id, focus_rating, started_at')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('started_at', startOfDay)
      .lte('started_at', endOfDay),

    // Tareas completadas hoy
    supabase
      .from('tasks')
      .select('id, title, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay),

    // Logs de hábitos del mes para calcular racha
    supabase
      .from('habit_logs')
      .select('habit_id, completed_at')
      .eq('user_id', user.id)
      .gte('completed_at', sevenDaysAgoStr),

    // Pomodoros de los últimos 7 días para sparkline
    supabase
      .from('pomodoro_sessions')
      .select('started_at, focus_rating, completed')
      .eq('user_id', user.id)
      .gte('started_at', `${sevenDaysAgoStr}T00:00:00.000Z`)
      .order('started_at', { ascending: true }),

    // Actividades recientes (últimas 5)
    supabase
      .from('activity_results')
      .select('activity, score, max_score, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(5),

    // Tareas recientes completadas (últimas 3)
    supabase
      .from('tasks')
      .select('title, completed_at, status')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(3),
  ])

  // Calcular racha máxima de hábitos (el hábito con mayor racha hoy)
  const logsByHabit: Record<string, string[]> = {}
  for (const log of habitLogs ?? []) {
    const key = String(log.habit_id)
    if (!logsByHabit[key]) logsByHabit[key] = []
    logsByHabit[key].push(log.completed_at)
  }
  const rachaMax = Math.max(0, ...Object.values(logsByHabit).map(calcStreak))

  // Calcular focus score promedio del día (de los pomodoros hoy con rating)
  const ratingsHoy = (pomodorosHoy ?? [])
    .map((p) => p.focus_rating)
    .filter((r): r is number => r !== null && r !== undefined)
  const focusScoreHoy = ratingsHoy.length
    ? Math.round((ratingsHoy.reduce((a, b) => a + b, 0) / ratingsHoy.length) * 20)
    : null

  // Construir datos de sparkline por día
  const sparklineData: Array<{ day: string; pomodoros: number; score: number | null }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dayStr = d.toISOString().split('T')[0]
    const dayLabel = d.toLocaleDateString('es', { weekday: 'short' })

    const sesionesDelDia = (pomodorosUltimos7 ?? []).filter((p) =>
      p.started_at.startsWith(dayStr)
    )
    const completadas = sesionesDelDia.filter((p) => p.completed)
    const ratingsDelDia = completadas
      .map((p) => p.focus_rating)
      .filter((r): r is number => r !== null && r !== undefined)
    const scoreDelDia = ratingsDelDia.length
      ? Math.round((ratingsDelDia.reduce((a, b) => a + b, 0) / ratingsDelDia.length) * 20)
      : null

    sparklineData.push({ day: dayLabel, pomodoros: completadas.length, score: scoreDelDia })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const displayName = profile?.full_name || profile?.username || 'Usuario'

  return (
    <DashboardClient
      greeting={greeting}
      displayName={displayName}
      onboardingCompleted={profile?.onboarding_completed ?? false}
      stats={{
        pomodorosHoy: pomodorosHoy?.length ?? 0,
        tareasCompletadas: tareasCompletadasHoy?.length ?? 0,
        rachaHabitos: rachaMax,
        focusScore: focusScoreHoy,
      }}
      sparklineData={sparklineData}
      actividadesRecientes={actividadesRecientes ?? []}
      tareasRecientes={tareasRecientes ?? []}
    />
  )
}
