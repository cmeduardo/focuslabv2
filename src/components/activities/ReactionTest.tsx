'use client'

// Reaction Test — Go/No-Go con 20 rondas
// Mide tiempo de reacción y control inhibitorio
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Zap, AlertTriangle, Target, TrendingUp } from 'lucide-react'
import { useEventTracker } from '@/hooks/useEventTracker'
import { saveActivityResult } from '@/lib/activities/saveResult'
import { cn } from '@/lib/utils'
import type { ReactionTestMetrics } from '@/types/activities'

// Configuración de la actividad
const TOTAL_ROUNDS = 20
const MIN_WAIT_MS = 2000
const MAX_WAIT_MS = 7000
const RESPONSE_WINDOW_MS = 2000   // tiempo para responder antes de marcar como perdido
// ~70% rondas GO (verde), ~30% NO-GO (rojo)
const GO_PROBABILITY = 0.7

type Phase =
  | 'intro'
  | 'waiting'    // esperando que cambie el fondo
  | 'go'         // verde — responde
  | 'nogo'       // rojo — no respondas
  | 'feedback'   // feedback de la respuesta
  | 'results'

interface Round {
  isGo: boolean
  reactionTime: number | null   // null = perdido o no aplica
  falseStart: boolean
}

interface FeedbackState {
  type: 'correct' | 'false_start' | 'too_slow' | 'correct_inhibit'
  ms?: number
}

// Calcula score final (0-100)
function calcScore(rounds: Round[]): number {
  const goRounds = rounds.filter(r => r.isGo)
  const correctGo = goRounds.filter(r => r.reactionTime !== null && !r.falseStart).length
  const falseStarts = rounds.filter(r => r.falseStart).length
  const missed = goRounds.filter(r => r.reactionTime === null && !r.falseStart).length
  const base = goRounds.length > 0 ? (correctGo / goRounds.length) * 100 : 0
  const penalty = (falseStarts * 5) + (missed * 3)
  return Math.max(0, Math.round(base - penalty))
}

// Calcula métricas detalladas
function calcMetrics(rounds: Round[]): ReactionTestMetrics {
  const goRounds = rounds.filter(r => r.isGo && !r.falseStart && r.reactionTime !== null)
  const times = goRounds.map(r => r.reactionTime as number)

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  const min = times.length > 0 ? Math.min(...times) : 0
  const max = times.length > 0 ? Math.max(...times) : 0

  // Consistencia: 100 - (desviación estándar / media * 100)
  let consistency = 0
  if (times.length > 1 && avg > 0) {
    const variance = times.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / times.length
    const std = Math.sqrt(variance)
    consistency = Math.max(0, Math.round(100 - (std / avg) * 100))
  }

  // Tendencia de fatiga en grupos de 4 rondas
  const chunkSize = 4
  const fatigueTrend: number[] = []
  for (let i = 0; i < rounds.length; i += chunkSize) {
    const chunk = rounds.slice(i, i + chunkSize)
      .filter(r => r.isGo && !r.falseStart && r.reactionTime !== null)
      .map(r => r.reactionTime as number)
    if (chunk.length > 0) {
      fatigueTrend.push(Math.round(chunk.reduce((a, b) => a + b, 0) / chunk.length))
    }
  }

  return {
    avg_reaction_time_ms: avg,
    min_reaction_time_ms: min,
    max_reaction_time_ms: max,
    false_starts: rounds.filter(r => r.falseStart).length,
    missed_signals: rounds.filter(r => r.isGo && r.reactionTime === null && !r.falseStart).length,
    consistency_score: consistency,
    fatigue_trend: fatigueTrend,
    reaction_times: times,
  }
}

export default function ReactionTest() {
  const { track, sessionId } = useEventTracker()
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentRound, setCurrentRound] = useState(0)
  const [rounds, setRounds] = useState<Round[]>([])
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const startTimeRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isGoRef = useRef(false)
  const respondedRef = useRef(false)
  const startedAtRef = useRef<number>(Date.now())

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Inicia una ronda: espera aleatoria → muestra GO o NO-GO
  const startRound = useCallback((roundIndex: number) => {
    respondedRef.current = false
    setPhase('waiting')

    const waitMs = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS)
    const isGo = Math.random() < GO_PROBABILITY

    timeoutRef.current = setTimeout(() => {
      isGoRef.current = isGo
      startTimeRef.current = Date.now()
      setPhase(isGo ? 'go' : 'nogo')

      if (isGo) {
        // Ventana de respuesta; si no responde = missed
        timeoutRef.current = setTimeout(() => {
          if (!respondedRef.current) {
            respondedRef.current = true
            setRounds(prev => [...prev, { isGo: true, reactionTime: null, falseStart: false }])
            setFeedback({ type: 'too_slow' })
            setPhase('feedback')

            timeoutRef.current = setTimeout(() => {
              const next = roundIndex + 1
              if (next >= TOTAL_ROUNDS) {
                setPhase('results')
              } else {
                setCurrentRound(next)
                startRound(next)
              }
            }, 1000)
          }
        }, RESPONSE_WINDOW_MS)
      } else {
        // NO-GO: espera a que el usuario no haga nada (1.5s)
        timeoutRef.current = setTimeout(() => {
          if (!respondedRef.current) {
            respondedRef.current = true
            setRounds(prev => [...prev, { isGo: false, reactionTime: null, falseStart: false }])
            setFeedback({ type: 'correct_inhibit' })
            setPhase('feedback')

            timeoutRef.current = setTimeout(() => {
              const next = roundIndex + 1
              if (next >= TOTAL_ROUNDS) {
                setPhase('results')
              } else {
                setCurrentRound(next)
                startRound(next)
              }
            }, 800)
          }
        }, 1500)
      }
    }, waitMs)
  }, [])

  // Respuesta del usuario (click / tap)
  const handleResponse = useCallback(() => {
    if (phase === 'waiting') {
      // Click anticipado durante la espera = false start
      if (!respondedRef.current) {
        respondedRef.current = true
        clearTimers()
        setRounds(prev => [...prev, { isGo: isGoRef.current, reactionTime: null, falseStart: true }])
        setFeedback({ type: 'false_start' })
        setPhase('feedback')

        timeoutRef.current = setTimeout(() => {
          const next = currentRound + 1
          if (next >= TOTAL_ROUNDS) {
            setPhase('results')
          } else {
            setCurrentRound(next)
            startRound(next)
          }
        }, 1200)
      }
      return
    }

    if (phase === 'go' && !respondedRef.current) {
      respondedRef.current = true
      clearTimers()
      const rt = Date.now() - startTimeRef.current
      setRounds(prev => [...prev, { isGo: true, reactionTime: rt, falseStart: false }])
      setFeedback({ type: 'correct', ms: rt })
      setPhase('feedback')

      track({ event_type: 'activity_response', category: 'activity', metadata: { reaction_time_ms: rt, correct: true, attempt: currentRound + 1 } })

      timeoutRef.current = setTimeout(() => {
        const next = currentRound + 1
        if (next >= TOTAL_ROUNDS) {
          setPhase('results')
        } else {
          setCurrentRound(next)
          startRound(next)
        }
      }, 900)
      return
    }

    if (phase === 'nogo' && !respondedRef.current) {
      respondedRef.current = true
      clearTimers()
      setRounds(prev => [...prev, { isGo: false, reactionTime: null, falseStart: true }])
      setFeedback({ type: 'false_start' })
      setPhase('feedback')

      track({ event_type: 'activity_response', category: 'activity', metadata: { correct: false, attempt: currentRound + 1, reason: 'nogo_click' } })

      timeoutRef.current = setTimeout(() => {
        const next = currentRound + 1
        if (next >= TOTAL_ROUNDS) {
          setPhase('results')
        } else {
          setCurrentRound(next)
          startRound(next)
        }
      }, 1200)
    }
  }, [phase, currentRound, clearTimers, startRound, track])

  // Guardar resultados al llegar a la pantalla de resultados
  useEffect(() => {
    if (phase !== 'results' || rounds.length === 0) return

    const metrics = calcMetrics(rounds)
    const score = calcScore(rounds)
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)

    track({ event_type: 'activity_complete', category: 'activity', metadata: { activity_type: 'reaction_test', score, duration: durationSeconds, metrics } })

    setSaving(true)
    saveActivityResult({
      activity: 'reaction_test',
      score,
      maxScore: 100,
      durationSeconds,
      metrics: metrics as unknown as Record<string, unknown>,
      sessionId: sessionId ?? undefined,
    })
      .catch(err => setSaveError(err instanceof Error ? err.message : 'Error al guardar'))
      .finally(() => setSaving(false))
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimers(), [clearTimers])

  const handleStart = () => {
    startedAtRef.current = Date.now()
    track({ event_type: 'activity_start', category: 'activity', metadata: { activity_type: 'reaction_test' } })
    setRounds([])
    setCurrentRound(0)
    startRound(0)
  }

  // ── Pantalla de intro ────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
          <div className="text-7xl mb-6">⚡</div>
          <h1 className="text-3xl font-bold text-white mb-3">Reaction Test</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Mide tu tiempo de reacción y control inhibitorio. Haz click <span className="text-green-400 font-semibold">solo cuando el fondo sea VERDE</span>. Si ves rojo, <span className="text-red-400 font-semibold">NO hagas click</span>.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: '🟢', label: '20 rondas', sub: 'Go / No-Go' },
              { icon: '⏱️', label: '~3 minutos', sub: 'Duración total' },
              { icon: '🎯', label: 'Reacción', sub: 'Precisión e impulso' },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-slate-500 text-xs">{item.sub}</p>
              </div>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="px-10 py-4 rounded-2xl text-white font-semibold text-lg"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}
          >
            Comenzar
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ── Pantalla de resultados ───────────────────────────────────────
  if (phase === 'results') {
    const metrics = calcMetrics(rounds)
    const score = calcScore(rounds)
    const goRounds = rounds.filter(r => r.isGo)
    const correctGo = goRounds.filter(r => r.reactionTime !== null && !r.falseStart).length

    const chartData = metrics.reaction_times.map((t, i) => ({ ronda: i + 1, ms: t }))

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Score principal */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.1 }}
            className="inline-block"
          >
            <div className="text-8xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">{score}</div>
            <div className="text-slate-400 text-sm mt-1">/ 100 puntos</div>
          </motion.div>
          <h2 className="text-2xl font-bold text-white mt-3">
            {score >= 85 ? '🔥 Reflejos de élite' : score >= 65 ? '⚡ Buena reacción' : '💪 Sigue practicando'}
          </h2>
          {saving && <p className="text-slate-500 text-xs mt-2">Guardando resultados...</p>}
          {saveError && <p className="text-red-400 text-xs mt-2">{saveError}</p>}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Zap size={18} className="text-yellow-400" />, label: 'Tiempo promedio', value: `${metrics.avg_reaction_time_ms}ms` },
            { icon: <Target size={18} className="text-green-400" />, label: 'Precisión GO', value: `${goRounds.length > 0 ? Math.round((correctGo / goRounds.length) * 100) : 0}%` },
            { icon: <AlertTriangle size={18} className="text-red-400" />, label: 'Falsos inicios', value: String(metrics.false_starts) },
            { icon: <TrendingUp size={18} className="text-[#8B5CF6]" />, label: 'Consistencia', value: `${metrics.consistency_score}%` },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <div className="flex justify-center mb-2">{stat.icon}</div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Gráfico de tiempos de reacción */}
        {chartData.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#06B6D4]" />
              Tiempos de reacción por ronda
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <XAxis dataKey="ronda" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#94A3B8' }}
                  formatter={(v) => [`${v}ms`, 'Reacción']}
                />
                <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={chartData[i].ms < (metrics.avg_reaction_time_ms * 0.9) ? '#84CC16' :
                            chartData[i].ms > (metrics.avg_reaction_time_ms * 1.2) ? '#EF4444' : '#8B5CF6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-slate-500 text-xs mt-2 text-center">Verde = rápido · Púrpura = normal · Rojo = lento</p>
          </div>
        )}

        {/* Botón reintentar */}
        <div className="text-center">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setPhase('intro'); setRounds([]) }}
            className="px-8 py-3 rounded-xl text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}
          >
            Volver a jugar
          </motion.button>
        </div>
      </motion.div>
    )
  }

  // ── Pantalla de juego ────────────────────────────────────────────
  const bgColor = phase === 'go' ? '#16A34A'
    : phase === 'nogo' ? '#DC2626'
    : '#1A1A2E'

  const feedbackText: Record<FeedbackState['type'], { text: string; color: string }> = {
    correct: { text: '✓ ¡Perfecto!', color: '#84CC16' },
    false_start: { text: '✗ Demasiado rápido', color: '#EF4444' },
    too_slow: { text: '⏱ Muy lento', color: '#F59E0B' },
    correct_inhibit: { text: '✓ ¡Buen control!', color: '#06B6D4' },
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer select-none"
      style={{ background: bgColor, transition: 'background 0.25s ease' }}
      onClick={handleResponse}
    >
      {/* Progreso */}
      <div className="absolute top-6 left-0 right-0 px-8">
        <div className="flex justify-between text-sm mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span>Ronda {Math.min(currentRound + 1, TOTAL_ROUNDS)} de {TOTAL_ROUNDS}</span>
          <span>{rounds.filter(r => r.isGo && r.reactionTime !== null && !r.falseStart).length} correctas</span>
        </div>
        <div className="h-1 rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full bg-white/60"
            animate={{ width: `${(currentRound / TOTAL_ROUNDS) * 100}%` }}
          />
        </div>
      </div>

      {/* Instrucción central */}
      <AnimatePresence mode="wait">
        {phase === 'waiting' && (
          <motion.div
            key="wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-white/50 text-xl font-light tracking-widest">ESPERA...</p>
          </motion.div>
        )}

        {phase === 'go' && (
          <motion.div
            key="go"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="text-center"
          >
            <p className="text-white text-6xl font-black tracking-wider">¡AHORA!</p>
            <p className="text-white/70 text-lg mt-2">Haz click</p>
          </motion.div>
        )}

        {phase === 'nogo' && (
          <motion.div
            key="nogo"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="text-center"
          >
            <p className="text-white text-6xl font-black tracking-wider">ESPERA</p>
            <p className="text-white/70 text-lg mt-2">No hagas click</p>
          </motion.div>
        )}

        {phase === 'feedback' && feedback && (
          <motion.div
            key="feedback"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-4xl font-bold" style={{ color: feedbackText[feedback.type].color }}>
              {feedbackText[feedback.type].text}
            </p>
            {feedback.ms && (
              <p className="text-white/60 text-xl mt-2">{feedback.ms}ms</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint inferior */}
      {(phase === 'go' || phase === 'waiting') && (
        <div className="absolute bottom-8 text-white/40 text-sm">
          Toca o haz click en cualquier lugar
        </div>
      )}
    </div>
  )
}
