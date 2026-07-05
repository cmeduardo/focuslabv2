'use client'

import { useMemo, memo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface SparklineDay {
  day: string
  pomodoros: number
  score: number | null
}

interface ActivityReciente {
  activity: string
  score: number | null
  max_score: number | null
  completed_at: string
}

interface TareaReciente {
  title: string
  completed_at: string | null
  status: string
}

interface Props {
  greeting: string
  displayName: string
  onboardingCompleted: boolean
  stats: {
    pomodorosHoy: number
    tareasCompletadas: number
    rachaHabitos: number
    focusScore: number | null
  }
  sparklineData: SparklineDay[]
  actividadesRecientes: ActivityReciente[]
  tareasRecientes: TareaReciente[]
}

// Etiquetas legibles para los tipos de actividad
const activityLabels: Record<string, string> = {
  reaction_test: 'Reaction Test',
  focus_flow: 'Focus Flow',
  memory_matrix: 'Memory Matrix',
  word_sprint: 'Word Sprint',
  pattern_hunt: 'Pattern Hunt',
  deep_read: 'Deep Read',
}

const activityEmojis: Record<string, string> = {
  reaction_test: '⚡',
  focus_flow: '🎯',
  memory_matrix: '🧩',
  word_sprint: '📝',
  pattern_hunt: '🔍',
  deep_read: '📖',
}

// Formatea tiempo relativo
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// Tooltip personalizado para el chart (memoizado para evitar re-renders en hover)
const CustomTooltip = memo(function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl px-3 py-2 text-xs border border-white/10">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-white font-medium">
          {p.name === 'pomodoros' ? `🍅 ${p.value} pomodoros` : `⚡ Score: ${p.value}`}
        </p>
      ))}
    </div>
  )
})

export default function DashboardClient({
  greeting,
  displayName,
  onboardingCompleted,
  stats,
  sparklineData,
  actividadesRecientes,
  tareasRecientes,
}: Props) {
  // Memoizado: solo recalcula si cambian las stats
  const statsConfig = useMemo(() => [
    {
      label: 'Pomodoros hoy',
      value: stats.pomodorosHoy.toString(),
      color: '#8B5CF6',
      emoji: '🍅',
      href: '/tools/pomodoro',
    },
    {
      label: 'Tareas completadas',
      value: stats.tareasCompletadas.toString(),
      color: '#06B6D4',
      emoji: '✅',
      href: '/tools/tasks',
    },
    {
      label: 'Racha de hábitos',
      value: `${stats.rachaHabitos}d`,
      color: '#84CC16',
      emoji: '🔥',
      href: '/tools/habits',
    },
    {
      label: 'Focus Score',
      value: stats.focusScore !== null ? `${stats.focusScore}` : '--',
      color: '#EC4899',
      emoji: '⚡',
      href: '/reports',
    },
  ], [stats])

  // Memoizado: timeline unificado de actividad reciente
  const timeline = useMemo(() => [
    ...actividadesRecientes.map((a) => ({
      type: 'activity' as const,
      label: activityLabels[a.activity] ?? a.activity,
      emoji: activityEmojis[a.activity] ?? '🧠',
      time: timeAgo(a.completed_at),
      score: a.score !== null && a.max_score
        ? `${Math.round((a.score / a.max_score) * 100)}%`
        : undefined,
    })),
    ...tareasRecientes
      .filter((t) => t.completed_at)
      .map((t) => ({
        type: 'task' as const,
        label: t.title,
        emoji: '✅',
        time: timeAgo(t.completed_at!),
      })),
  ]
    .sort(() => 0) // ya vienen ordenados por fecha del servidor
    .slice(0, 6), [actividadesRecientes, tareasRecientes])

  return (
    <div className="max-w-7xl mx-auto">
      {/* Saludo */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-white">
          {greeting},{' '}
          <span className="bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
            {displayName}
          </span>{' '}
          👋
        </h1>
        <p className="text-slate-400 mt-1">Aquí tienes el resumen de tu actividad.</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statsConfig.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
          >
            <Link
              href={stat.href}
              className="glass-card rounded-2xl p-5 hover:border-white/20 transition-all hover:scale-[1.02] block"
            >
              <div className="text-2xl mb-2">{stat.emoji}</div>
              <div className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Gráfico sparkline + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sparkline últimos 7 días */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-base font-semibold text-white mb-4">
            📈 Últimos 7 días
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={sparklineData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradPomodoros" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pomodoros"
                name="pomodoros"
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="url(#gradPomodoros)"
                dot={{ fill: '#8B5CF6', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 mt-2 text-center">Pomodoros completados por día</p>
        </motion.div>

        {/* Timeline de actividad reciente */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h2 className="text-base font-semibold text-white mb-4">🕐 Actividad reciente</h2>
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm">
              <span className="text-3xl mb-2">🌱</span>
              Sin actividad reciente
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.label}</p>
                    {'score' in item && item.score && (
                      <p className="text-xs text-[#84CC16]">{item.score}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Accesos rápidos */}
      <motion.div
        className="glass-card rounded-2xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <h2 className="text-base font-semibold text-white mb-4">🚀 Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Iniciar Pomodoro', href: '/tools/pomodoro', gradient: 'from-[#8B5CF6] to-[#06B6D4]', emoji: '🍅' },
            { label: 'Nueva tarea', href: '/tools/tasks', gradient: 'from-[#06B6D4] to-[#84CC16]', emoji: '✏️' },
            { label: 'Actividad rápida', href: '/activities', gradient: 'from-[#EC4899] to-[#F59E0B]', emoji: '🧠' },
            { label: 'Ver reportes', href: '/reports', gradient: 'from-[#84CC16] to-[#06B6D4]', emoji: '📊' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${action.gradient} hover:opacity-90 transition-opacity`}
            >
              <span className="text-xl">{action.emoji}</span>
              <span className="font-semibold text-white text-sm">{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Banner de bienvenida si no completó onboarding */}
      {!onboardingCompleted && (
        <motion.div
          className="glass-card rounded-2xl p-6 border border-[#8B5CF6]/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <h3 className="text-base font-semibold text-white mb-2">
            🎉 ¡Bienvenido a FocusLab!
          </h3>
          <p className="text-slate-400 text-sm">
            Explora las herramientas de productividad, completa actividades cognitivas
            y genera tu primer reporte de atención. ¡Tu viaje hacia un mejor enfoque comienza aquí!
          </p>
        </motion.div>
      )}
    </div>
  )
}
