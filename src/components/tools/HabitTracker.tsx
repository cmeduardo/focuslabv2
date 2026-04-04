'use client'

// Habit Tracker estilo GitHub contributions — grid mensual con check diario
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Flame, Trophy, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEventTracker } from '@/hooks/useEventTracker'
import { cn } from '@/lib/utils'

// Emojis disponibles para hábitos
const EMOJI_OPTIONS = ['🎯', '💪', '📚', '🏃', '💧', '🧘', '🍎', '😴', '✍️', '🎵', '🌱', '🧠']

// Colores de acento disponibles
const COLOR_OPTIONS = [
  '#8B5CF6', '#06B6D4', '#84CC16', '#EC4899', '#F59E0B', '#EF4444', '#10B981', '#3B82F6',
]

// Formato de fecha local como YYYY-MM-DD
function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function today(): string {
  return toDateKey(new Date())
}

// Días del mes actual
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

// Calcula racha actual a partir de logs (array de YYYY-MM-DD ordenado desc)
function calcStreak(logs: string[]): number {
  if (logs.length === 0) return 0
  const sorted = [...logs].sort((a, b) => b.localeCompare(a))
  let streak = 0
  let cursor = new Date()
  // Comenzar desde hoy o ayer si no se completó hoy
  if (sorted[0] !== today()) cursor.setDate(cursor.getDate() - 1)

  for (const log of sorted) {
    if (log === toDateKey(cursor)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ── Confetti canvas ligero ─────────────────────────────────────────────────────

function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5 - canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      color: COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationV: (Math.random() - 0.5) * 10,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of particles) {
        if (p.y < canvas.height + 20) {
          alive = true
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.1
          p.rotation += p.rotationV
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2)
          ctx.restore()
        }
      }
      if (alive) rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  )
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Habit {
  id: string
  name: string
  icon: string
  color: string
  logs: string[] // YYYY-MM-DD
  createdAt: string
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function HabitTracker() {
  const { track } = useEventTracker()

  const [habits, setHabits] = useState<Habit[]>([
    { id: '1', name: 'Ejercicio', icon: '💪', color: '#8B5CF6', logs: [], createdAt: today() },
    { id: '2', name: 'Lectura', icon: '📚', color: '#06B6D4', logs: [], createdAt: today() },
    { id: '3', name: 'Hidratación', icon: '💧', color: '#84CC16', logs: [], createdAt: today() },
  ])

  const [showForm, setShowForm] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [viewDate, setViewDate] = useState(new Date())
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🎯')
  const [newColor, setNewColor] = useState('#8B5CF6')

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const days = getDaysInMonth(year, month)
  const todayKey = today()

  // Primer día de la semana del mes (para alinear grid)
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  // Togglear check de un hábito
  const toggleCheck = useCallback((habitId: string, dateKey: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h
        const isChecked = h.logs.includes(dateKey)
        const newLogs = isChecked
          ? h.logs.filter((d) => d !== dateKey)
          : [...h.logs, dateKey]

        if (!isChecked) {
          setConfetti(true)
          setTimeout(() => setConfetti(false), 2500)
          track({
            event_type: 'habit_checked',
            category: 'tool_usage',
            metadata: { habit_id: habitId, date: dateKey },
          })
        }
        return { ...h, logs: newLogs }
      })
    )
  }, [track])

  // Crear nuevo hábito
  const handleCreateHabit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      icon: newIcon,
      color: newColor,
      logs: [],
      createdAt: today(),
    }
    setHabits((prev) => [...prev, habit])
    track({ event_type: 'habit_created', category: 'tool_usage', metadata: { name: habit.name } })
    setNewName('')
    setNewIcon('🎯')
    setNewColor('#8B5CF6')
    setShowForm(false)
  }, [newName, newIcon, newColor, track])

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id))
  }

  // Nombres de días de la semana
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <ConfettiCanvas active={confetti} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] bg-clip-text text-transparent">
            Habit Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">Construye rutinas consistentes</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm"
          style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}
          data-tracking="new-habit"
        >
          <Plus size={18} />
          Nuevo hábito
        </motion.button>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-5 py-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold capitalize">
          {viewDate.toLocaleDateString('es', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Lista de hábitos con grids */}
      {habits.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <div className="text-5xl mb-4">🌱</div>
          <p>Crea tu primer hábito</p>
        </div>
      )}

      {habits.map((habit) => {
        const streak = calcStreak(habit.logs)
        const bestStreak = Math.max(streak, habit.logs.length > 0 ? streak : 0)
        const completedThisMonth = habit.logs.filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length
        const completionPct = days.length > 0 ? Math.round((completedThisMonth / days.length) * 100) : 0

        return (
          <motion.div
            key={habit.id}
            layout
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
          >
            {/* Habit header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
                >
                  {habit.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{habit.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Flame size={12} style={{ color: streak > 0 ? '#F59E0B' : undefined }} />
                      {streak} días de racha
                    </span>
                    <span className="text-xs text-slate-500">{completionPct}% este mes</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botón check de hoy */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleCheck(habit.id, todayKey)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={
                    habit.logs.includes(todayKey)
                      ? { background: `${habit.color}30`, color: habit.color, border: `1px solid ${habit.color}60` }
                      : { background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                  data-tracking={`habit-toggle-${habit.id}`}
                >
                  <Check size={12} />
                  {habit.logs.includes(todayKey) ? '¡Hecho!' : 'Marcar hoy'}
                </motion.button>

                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-pink-400 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Grid estilo GitHub contributions */}
            <div>
              {/* Header días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-[10px] text-slate-600 font-medium">{d}</div>
                ))}
              </div>

              {/* Celdas del mes con offset */}
              <div className="grid grid-cols-7 gap-1">
                {/* Celdas vacías para alinear el primer día */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {days.map((day) => {
                  const key = toDateKey(day)
                  const isChecked = habit.logs.includes(key)
                  const isToday = key === todayKey
                  const isFuture = key > todayKey

                  return (
                    <motion.button
                      key={key}
                      whileHover={!isFuture ? { scale: 1.15 } : {}}
                      whileTap={!isFuture ? { scale: 0.9 } : {}}
                      onClick={() => !isFuture && toggleCheck(habit.id, key)}
                      disabled={isFuture}
                      title={day.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                      className={cn(
                        'aspect-square rounded-md transition-all',
                        isFuture ? 'cursor-default opacity-30' : 'cursor-pointer'
                      )}
                      style={{
                        background: isChecked
                          ? habit.color
                          : isToday
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(255,255,255,0.04)',
                        boxShadow: isChecked ? `0 0 8px ${habit.color}60` : undefined,
                        outline: isToday ? `1px solid ${habit.color}60` : undefined,
                      }}
                    >
                      <span className="sr-only">{key}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Barra de completado mensual */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{completedThisMonth} de {days.length} días</span>
                <span>{completionPct}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: habit.color }}
                />
              </div>
            </div>
          </motion.div>
        )
      })}

      {/* Modal nuevo hábito */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Nuevo hábito</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateHabit} className="space-y-4">
                {/* Nombre */}
                <input
                  autoFocus
                  type="text"
                  placeholder="Nombre del hábito *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6]"
                />

                {/* Emojis */}
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Icono</label>
                  <div className="grid grid-cols-6 gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewIcon(emoji)}
                        className={cn(
                          'p-2 rounded-xl text-lg transition-all',
                          newIcon === emoji ? 'bg-white/15 scale-110' : 'bg-white/5 hover:bg-white/10'
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colores */}
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className="w-7 h-7 rounded-full transition-all"
                        style={{
                          background: color,
                          outline: newColor === color ? `2px solid white` : '2px solid transparent',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ borderColor: `${newColor}40`, background: `${newColor}10` }}
                >
                  <div className="text-2xl">{newIcon}</div>
                  <span className="text-white text-sm font-medium">{newName || 'Vista previa'}</span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${newColor}, #8B5CF6)` }}
                  >
                    Crear
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
