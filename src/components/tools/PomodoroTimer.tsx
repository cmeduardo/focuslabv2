'use client'

// Timer Pomodoro con ring SVG animado, modos, vinculación de tarea y rating
import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Link2, Star, Settings } from 'lucide-react'
import { usePomodoroStore, type TimerMode } from '@/lib/store/usePomodoroStore'
import { useTaskStore } from '@/lib/store/useTaskStore'
import { useEventTracker } from '@/hooks/useEventTracker'
import { cn } from '@/lib/utils'

// Dimensiones del ring SVG
const RING_SIZE = 280
const STROKE_WIDTH = 14
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Configuración visual por modo
const MODE_CONFIG: Record<TimerMode, { label: string; color: string }> = {
  focus: { label: 'Enfoque', color: '#8B5CF6' },
  short_break: { label: 'Descanso corto', color: '#06B6D4' },
  long_break: { label: 'Descanso largo', color: '#84CC16' },
}

// Genera tono de notificación con Web Audio API
function playDone() {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)

    ;[440, 554, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.connect(gain)
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.start(ctx.currentTime + i * 0.15)
      osc.stop(ctx.currentTime + i * 0.15 + 0.4)
    })
  } catch {
    // Web Audio API no disponible
  }
}

// Formatea segundos como MM:SS
function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function PomodoroTimer() {
  const store = usePomodoroStore()
  const { tasks } = useTaskStore()
  const { track } = useEventTracker()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)

  const {
    mode, durations, timeLeft, isRunning, isPaused,
    completedToday, interruptions, linkedTask,
    showRating, focusRating,
    setMode, start, pause, resume, reset, tick,
    setRating, dismissRating, linkTask,
  } = store

  // Avanzar el timer cada segundo
  useEffect(() => {
    if (isRunning) {
      completedRef.current = false
      intervalRef.current = setInterval(() => {
        const done = tick()
        if (done && !completedRef.current) {
          completedRef.current = true
          playDone()
        }
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, tick])

  const totalDuration = durations[mode]
  const progress = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)
  const modeColor = MODE_CONFIG[mode].color

  const handleStart = useCallback(() => {
    start()
    track({
      event_type: 'pomodoro_start',
      category: 'tool_usage',
      metadata: { duration: durations[mode], task_id: linkedTask?.id ?? null, mode },
    })
  }, [start, track, durations, mode, linkedTask])

  const handlePause = useCallback(() => {
    pause()
    track({
      event_type: 'pomodoro_interrupt',
      category: 'tool_usage',
      metadata: { elapsed_seconds: durations[mode] - timeLeft, reason: 'manual_pause', mode },
    })
  }, [pause, track, durations, mode, timeLeft])

  const handleReset = useCallback(() => {
    if (isRunning || isPaused) {
      track({
        event_type: 'pomodoro_interrupt',
        category: 'tool_usage',
        metadata: { elapsed_seconds: durations[mode] - timeLeft, reason: 'reset', mode },
      })
    }
    reset()
  }, [reset, track, isRunning, isPaused, durations, mode, timeLeft])

  const handleSubmitRating = useCallback(() => {
    track({
      event_type: 'pomodoro_complete',
      category: 'tool_usage',
      metadata: { interruptions, focus_rating: focusRating, task_id: linkedTask?.id ?? null },
    })
    dismissRating()
    setMode('short_break')
  }, [track, interruptions, focusRating, linkedTask, dismissRating, setMode])

  const pendingTasks = tasks.filter((t) => t.status !== 'done')
  const totalFocusMin = Math.round((completedToday * durations.focus) / 60)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent mb-1">
          Pomodoro Timer
        </h1>
        <p className="text-slate-400 text-sm">Mantén el enfoque, descansa estratégicamente</p>
      </div>

      {/* Card principal */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8">
        {/* Tabs de modo */}
        <div className="flex gap-2 mb-8 bg-black/20 rounded-xl p-1">
          {(Object.keys(MODE_CONFIG) as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200',
                mode === m
                  ? 'text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
              style={mode === m ? { background: modeColor, boxShadow: `0 4px 16px ${modeColor}40` } : {}}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>

        {/* Ring SVG */}
        <div className="flex justify-center mb-8">
          <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              className="rotate-[-90deg]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              {/* Pista */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={STROKE_WIDTH}
              />
              {/* Progreso */}
              <motion.circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            </svg>

            {/* Tiempo y modo centrados */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <motion.span
                key={Math.floor(timeLeft / 60)}
                initial={{ opacity: 0.7, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-6xl font-bold text-white tabular-nums tracking-tight"
              >
                {fmt(timeLeft)}
              </motion.span>
              <span className="text-slate-400 text-sm">{MODE_CONFIG[mode].label}</span>

              {/* Puntos de pomodoros completados */}
              {completedToday > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap justify-center max-w-[180px]">
                  {Array.from({ length: Math.min(completedToday, 12) }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: '#8B5CF6' }}
                    />
                  ))}
                  {completedToday > 12 && (
                    <span className="text-slate-500 text-xs">+{completedToday - 12}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handleReset}
            className="p-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Reiniciar"
            data-tracking="pomodoro-reset"
          >
            <RotateCcw size={22} />
          </button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={isRunning ? handlePause : (isPaused ? resume : handleStart)}
            className="flex items-center gap-2 px-10 py-4 rounded-2xl text-white font-semibold text-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.35)',
            }}
            data-tracking="pomodoro-toggle"
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {isRunning ? 'Pausar' : isPaused ? 'Continuar' : 'Iniciar'}
          </motion.button>

          <div className="w-[50px]" />
        </div>

        {/* Vincular tarea (solo en modo focus) */}
        {mode === 'focus' && (
          <div className="border-t border-white/10 pt-5">
            <label className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-2">
              <Link2 size={13} />
              Vincular tarea
            </label>
            <select
              value={linkedTask?.id ?? ''}
              onChange={(e) => {
                const task = pendingTasks.find((t) => t.id === e.target.value)
                linkTask(task ? { id: task.id, title: task.title } : null)
              }}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8B5CF6] transition-colors"
            >
              <option value="">Sin tarea vinculada</option>
              {pendingTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            {linkedTask && (
              <p className="mt-2 text-xs text-[#8B5CF6]">
                🔗 Trabajando en: {linkedTask.title}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats del día */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completados hoy', value: String(completedToday), unit: '🍅' },
          { label: 'Tiempo enfocado', value: String(totalFocusMin), unit: 'min' },
          { label: 'Interrupciones', value: String(interruptions), unit: '⚡' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-center"
          >
            <p className="text-2xl font-bold text-white">
              {stat.value}{' '}
              <span className="text-base font-normal text-slate-400">{stat.unit}</span>
            </p>
            <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Configuración de duraciones */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-4">
          <Settings size={15} />
          Configurar duraciones
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(MODE_CONFIG) as TimerMode[]).map((m) => (
            <div key={m}>
              <label className="text-xs text-slate-500 mb-1 block">{MODE_CONFIG[m].label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={Math.floor(durations[m] / 60)}
                  onChange={(e) => {
                    const mins = Math.max(1, Math.min(90, Number(e.target.value)))
                    store.setDuration(m, mins * 60)
                  }}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-[#8B5CF6]"
                />
                <span className="text-slate-500 text-xs">min</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de rating al completar */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              {/* Celebración animada */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-1">¡Pomodoro completado!</h2>
              <p className="text-slate-400 text-sm mb-6">
                {linkedTask ? `Trabajaste en: ${linkedTask.title}` : '¿Qué tan enfocado estuviste?'}
              </p>

              {/* Estrellas de rating */}
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      size={36}
                      className={cn(
                        'transition-colors',
                        star <= (focusRating ?? 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-600'
                      )}
                    />
                  </motion.button>
                ))}
              </div>

              {focusRating && (
                <p className="text-slate-400 text-sm mb-4">
                  {['', 'Muy distraído 😞', 'Algo distraído 😐', 'Normal 🙂', 'Muy enfocado 😊', 'En flujo total 🔥'][focusRating]}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { dismissRating(); setMode('short_break') }}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Saltar
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={!focusRating}
                  className="flex-1 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
