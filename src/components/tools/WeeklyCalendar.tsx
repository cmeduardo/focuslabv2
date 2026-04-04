'use client'

// Calendario semanal con bloques de estudio y visualización de tareas
import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, X, Clock, BookOpen, Zap } from 'lucide-react'
import { useTaskStore } from '@/lib/store/useTaskStore'
import { useEventTracker } from '@/hooks/useEventTracker'
import { cn } from '@/lib/utils'

// Horas visibles (8am – 22pm)
const START_HOUR = 8
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

// Altura en px por hora
const HOUR_HEIGHT = 56

// Colores para bloques
const BLOCK_COLORS = ['#8B5CF6', '#06B6D4', '#84CC16', '#EC4899', '#F59E0B', '#EF4444', '#10B981']

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Lunes de la semana que contiene la fecha dada
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

interface TimeBlock {
  id: string
  dateKey: string
  startHour: number  // float, ej: 9.5 = 9:30
  durationHours: number
  title: string
  color: string
  completed: boolean
  type: 'study' | 'pomodoro' | 'task'
}

interface NewBlockDraft {
  dateKey: string
  startHour: number
}

// ── Componente de bloque de tiempo ──────────────────────────────────────────

interface BlockProps {
  block: TimeBlock
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}

function Block({ block, onDelete, onToggle }: BlockProps) {
  const top = (block.startHour - START_HOUR) * HOUR_HEIGHT
  const height = Math.max(block.durationHours * HOUR_HEIGHT, 24)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scaleY: 0.8 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0.8 }}
      className="absolute left-1 right-1 rounded-lg overflow-hidden cursor-pointer group"
      style={{
        top,
        height,
        background: block.completed ? `${block.color}40` : `${block.color}25`,
        border: `1px solid ${block.color}60`,
        borderLeft: `3px solid ${block.color}`,
      }}
      onClick={() => onToggle(block.id)}
    >
      <div className="px-2 py-1 flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold truncate leading-tight"
            style={{ color: block.color, textDecoration: block.completed ? 'line-through' : undefined, opacity: block.completed ? 0.6 : 1 }}
          >
            {block.title}
          </p>
          {height >= 36 && (
            <p className="text-[10px] text-slate-500 mt-0.5">
              {formatHour(block.startHour)} – {formatHour(block.startHour + block.durationHours)}
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white shrink-0 mt-0.5"
        >
          <X size={11} />
        </button>
      </div>
    </motion.div>
  )
}

function formatHour(h: number): string {
  const hour = Math.floor(h)
  const min = Math.round((h - hour) * 60)
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

// ── Formulario de nuevo bloque ───────────────────────────────────────────────

interface NewBlockFormProps {
  draft: NewBlockDraft
  onSave: (block: Omit<TimeBlock, 'id'>) => void
  onClose: () => void
}

function NewBlockForm({ draft, onSave, onClose }: NewBlockFormProps) {
  const [title, setTitle] = useState('')
  const [startHour, setStartHour] = useState(draft.startHour)
  const [durationHours, setDurationHours] = useState(1)
  const [color, setColor] = useState(BLOCK_COLORS[0])
  const [type, setType] = useState<TimeBlock['type']>('study')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      dateKey: draft.dateKey,
      startHour,
      durationHours,
      title: title.trim(),
      color,
      completed: false,
      type,
    })
    onClose()
  }

  return (
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
          <h2 className="text-lg font-bold text-white">Nuevo bloque</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Título del bloque *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6]"
          />

          {/* Tipo */}
          <div className="grid grid-cols-3 gap-2">
            {(['study', 'pomodoro', 'task'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'py-2 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1',
                  type === t ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                )}
              >
                {t === 'study' ? <BookOpen size={14} /> : t === 'pomodoro' ? <Clock size={14} /> : <Zap size={14} />}
                {t === 'study' ? 'Estudio' : t === 'pomodoro' ? 'Pomodoro' : 'Tarea'}
              </button>
            ))}
          </div>

          {/* Hora inicio + duración */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Hora de inicio</label>
              <input
                type="time"
                value={`${String(Math.floor(startHour)).padStart(2, '0')}:${String(Math.round((startHour % 1) * 60)).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  setStartHour(h + m / 60)
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Duración: {durationHours}h
              </label>
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.5}
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full mt-2 accent-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Color</label>
            <div className="flex gap-2">
              {BLOCK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{ background: c, outline: color === c ? '2px solid white' : '2px solid transparent', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${color}, #8B5CF6)` }}
            >
              Añadir
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function WeeklyCalendar() {
  const { tasks } = useTaskStore()
  const { track } = useEventTracker()

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [newBlockDraft, setNewBlockDraft] = useState<NewBlockDraft | null>(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayKey = toDateKey(new Date())

  const prevWeek = () => setWeekStart((d) => addDays(d, -7))
  const nextWeek = () => setWeekStart((d) => addDays(d, 7))

  // Crear bloque al hacer click en una celda de tiempo
  const handleCellClick = useCallback((dateKey: string, hour: number) => {
    setNewBlockDraft({ dateKey, startHour: hour })
  }, [])

  const saveBlock = useCallback((blockData: Omit<TimeBlock, 'id'>) => {
    const block: TimeBlock = { ...blockData, id: crypto.randomUUID() }
    setBlocks((prev) => [...prev, block])
    track({
      event_type: 'calendar_block_created',
      category: 'tool_usage',
      metadata: { date: blockData.dateKey, start: blockData.startHour, duration: blockData.durationHours, type: blockData.type },
    })
  }, [track])

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const toggleBlock = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        const completed = !b.completed
        if (completed) {
          track({ event_type: 'calendar_block_completed', category: 'tool_usage', metadata: { block_id: id } })
        }
        return { ...b, completed }
      })
    )
  }, [track])

  // Tareas con fecha límite en la semana visible
  const tasksByDay = weekDays.reduce<Record<string, typeof tasks>>((acc, day) => {
    const key = toDateKey(day)
    acc[key] = tasks.filter((t) => t.dueDate?.startsWith(key) && t.status !== 'done')
    return acc
  }, {})

  // Resumen semanal
  const totalBlocks = blocks.filter((b) => {
    const d = new Date(b.dateKey)
    return d >= weekStart && d < addDays(weekStart, 7)
  })
  const completedBlocks = totalBlocks.filter((b) => b.completed)
  const totalFocusHours = totalBlocks.reduce((s, b) => s + b.durationHours, 0)

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#F59E0B] to-[#06B6D4] bg-clip-text text-transparent">
            Calendario Semanal
          </h1>
          <p className="text-slate-400 text-sm mt-1">Planifica tus bloques de estudio</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="px-4 py-2 rounded-xl bg-white/5 text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Hoy
          </button>
          <button onClick={nextWeek} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Rango de semana */}
      <p className="text-slate-400 text-sm capitalize">
        {weekStart.toLocaleDateString('es', { day: 'numeric', month: 'long' })} –{' '}
        {addDays(weekStart, 6).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Bloques esta semana', value: totalBlocks.length, icon: '📅' },
          { label: 'Completados', value: `${completedBlocks.length}/${totalBlocks.length}`, icon: '✅' },
          { label: 'Horas planificadas', value: `${totalFocusHours.toFixed(1)}h`, icon: '⏱️' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xl font-bold text-white">{s.icon} {s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid del calendario */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
        {/* Headers de días */}
        <div className="grid border-b border-white/10" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          <div className="border-r border-white/5" />
          {weekDays.map((day, i) => {
            const key = toDateKey(day)
            const isToday = key === todayKey
            const hasDeadlines = (tasksByDay[key] ?? []).length > 0

            return (
              <div
                key={key}
                className={cn(
                  'py-3 px-2 text-center border-r border-white/5 last:border-r-0',
                  isToday ? 'bg-[#8B5CF6]/10' : ''
                )}
              >
                <p className="text-xs text-slate-500 font-medium">{dayNames[i]}</p>
                <p className={cn('text-lg font-bold mt-0.5', isToday ? 'text-[#8B5CF6]' : 'text-white')}>
                  {day.getDate()}
                </p>
                {hasDeadlines && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    {(tasksByDay[key] ?? []).slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="w-1.5 h-1.5 rounded-full bg-pink-400"
                        title={t.title}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Cuerpo del horario */}
        <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
          <div className="grid relative" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            {/* Columna de horas */}
            <div className="border-r border-white/5">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2 pt-1 border-b border-white/5 text-[10px] text-slate-600"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {`${String(h).padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            {/* Columnas de días */}
            {weekDays.map((day) => {
              const key = toDateKey(day)
              const dayBlocks = blocks.filter((b) => b.dateKey === key)
              const isToday = key === todayKey

              return (
                <div
                  key={key}
                  className={cn(
                    'relative border-r border-white/5 last:border-r-0',
                    isToday ? 'bg-[#8B5CF6]/5' : ''
                  )}
                >
                  {/* Celdas de hora clickeables */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      onClick={() => handleCellClick(key, h)}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-full">
                        <Plus size={14} className="text-slate-600" />
                      </div>
                    </div>
                  ))}

                  {/* Bloques de tiempo */}
                  <AnimatePresence>
                    {dayBlocks.map((block) => (
                      <Block key={block.id} block={block} onDelete={deleteBlock} onToggle={toggleBlock} />
                    ))}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Leyenda de tareas con deadline esta semana */}
      {Object.values(tasksByDay).some((arr) => arr.length > 0) && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3">Deadlines esta semana</p>
          <div className="flex flex-wrap gap-2">
            {weekDays.flatMap((day) => {
              const key = toDateKey(day)
              return (tasksByDay[key] ?? []).map((task) => (
                <span
                  key={task.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-pink-400/10 border border-pink-400/20 text-pink-300 text-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" />
                  {task.title}
                  <span className="text-pink-500 ml-1">
                    {day.toLocaleDateString('es', { weekday: 'short' })}
                  </span>
                </span>
              ))
            })}
          </div>
        </div>
      )}

      {/* Modal de nuevo bloque */}
      <AnimatePresence>
        {newBlockDraft && (
          <NewBlockForm
            draft={newBlockDraft}
            onSave={saveBlock}
            onClose={() => setNewBlockDraft(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
