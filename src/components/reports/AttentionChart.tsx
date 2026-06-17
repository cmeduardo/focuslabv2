'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

interface Props {
  rawData: Record<string, unknown>
}

// Tooltip personalizado para el bar chart
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl px-3 py-2 text-xs border border-white/10">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="text-white font-semibold">{payload[0].value}</p>
    </div>
  )
}

// Gráficos de atención basados en los datos del reporte
export default function AttentionChart({ rawData }: Props) {
  const attention = rawData.attention_metrics as Record<string, number | null> | undefined
  const productivity = rawData.productivity_metrics as Record<string, number | null> | undefined
  const patterns = rawData.patterns as Record<string, number[]> | undefined
  const summary = rawData.summary as Record<string, number> | undefined

  // Datos para el radar de métricas cognitivas (normalizado 0-100)
  const radarData = [
    {
      metric: 'Reacción',
      value: attention?.avg_reaction_time_ms
        ? Math.max(0, Math.round(100 - (attention.avg_reaction_time_ms - 150) / 5))
        : 0,
    },
    {
      metric: 'Atención sostenida',
      value: Math.round((attention?.sustained_attention_score ?? 0)),
    },
    {
      metric: 'Memoria',
      value: Math.min(100, Math.round(((attention?.working_memory_span ?? 0) / 9) * 100)),
    },
    {
      metric: 'Consistencia',
      value: Math.round((productivity?.completion_rate ?? 0) * 100),
    },
    {
      metric: 'Hábitos',
      value: Math.round((productivity?.habit_consistency ?? 0) * 100),
    },
  ]

  // Distribución de horas pico para bar chart
  const horasPico = patterns?.peak_focus_hours ?? []
  const horasBajas = patterns?.low_focus_hours ?? []
  const horasData = Array.from({ length: 24 }, (_, h) => ({
    hora: h < 10 ? `0${h}h` : `${h}h`,
    valor: horasPico.includes(h) ? 3 : horasBajas.includes(h) ? 1 : 2,
    isPico: horasPico.includes(h),
  })).filter((_, i) => i >= 6 && i <= 23) // solo horas de día

  return (
    <div className="space-y-6">
      {/* Resumen numérico */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tiempo de enfoque', value: `${summary.total_focus_time_minutes ?? 0}m`, color: '#8B5CF6', emoji: '⏱️' },
            { label: 'Días activos', value: `${summary.active_days ?? 0}`, color: '#06B6D4', emoji: '📅' },
            { label: 'Pomodoros completados', value: `${productivity?.pomodoros_completed ?? 0}`, color: '#84CC16', emoji: '🍅' },
            { label: 'Tareas completadas', value: `${productivity?.tasks_completed ?? 0}`, color: '#EC4899', emoji: '✅' },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar de métricas cognitivas */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">🧠 Perfil cognitivo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <Radar
                name="score"
                dataKey="value"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.25}
                dot={{ fill: '#8B5CF6', r: 3 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Horas de actividad */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">🕐 Actividad por hora</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={horasData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="hora"
                tick={{ fill: '#64748b', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
                {horasData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isPico ? '#8B5CF6' : 'rgba(255,255,255,0.08)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-[#8B5CF6] inline-block" /> Hora pico
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-white/10 inline-block" /> Normal
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
