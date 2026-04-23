'use client'

// Focus Flow — Seguir partícula con el cursor durante 2 minutos
// Mide atención sostenida y resistencia a distractores
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Eye, Clock, Crosshair, Zap } from 'lucide-react'
import { useEventTracker } from '@/hooks/useEventTracker'
import { saveActivityResult } from '@/lib/activities/saveResult'
import type { FocusFlowMetrics } from '@/types/activities'

// Duración total en ms
const TOTAL_DURATION_MS = 2 * 60 * 1000
// Radio en px para considerar "en target"
const HIT_RADIUS = 55
// Tamaño del canvas lógico
const CANVAS_W = 800
const CANVAS_H = 500
// Muestras de rendimiento (cada 24s = 5 segmentos)
const PERF_SEGMENTS = 5

// Distractor: círculo visual periférico que aparece y desaparece
interface Distractor {
  id: number
  x: number
  y: number
  born: number
}

// Posición de la partícula usando función de Lissajous + ruido
function particlePos(t: number): { x: number; y: number } {
  const speed = 1 + Math.min(t / TOTAL_DURATION_MS, 1) * 1.5   // velocidad progresiva
  const ax = 0.35 * speed
  const ay = 0.27 * speed
  const px = CANVAS_W * 0.5 + CANVAS_W * 0.38 * Math.sin(ax * t / 1000 + 0.5)
  const py = CANVAS_H * 0.5 + CANVAS_H * 0.35 * Math.cos(ay * t / 1000)
  return { x: px, y: py }
}

type Phase = 'intro' | 'playing' | 'results'

export default function FocusFlow() {
  const { track, sessionId } = useEventTracker()
  const [phase, setPhase] = useState<Phase>('intro')
  const [timeLeft, setTimeLeft] = useState(TOTAL_DURATION_MS)
  const [accuracy, setAccuracy] = useState(100)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [perfData, setPerfData] = useState<{ t: number; acc: number }[]>([])
  const [finalMetrics, setFinalMetrics] = useState<FocusFlowMetrics | null>(null)
  const [distractors, setDistractors] = useState<Distractor[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const cursorRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H / 2 })
  const onTargetRef = useRef(false)
  const timeOnTargetRef = useRef(0)
  const timeOffTargetRef = useRef(0)
  const lastTickRef = useRef(0)
  const longestStreakRef = useRef(0)
  const currentStreakRef = useRef(0)
  const distractorClicksRef = useRef(0)
  const segmentDataRef = useRef<number[]>([])
  const segmentOnRef = useRef(0)
  const segmentTotalRef = useRef(0)
  const nextDistractorRef = useRef(0)
  const distractorCounterRef = useRef(0)

  // Convierte coordenadas del mouse relativas al contenedor → espacio lógico del canvas
  const toLogical = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return { x: clientX, y: clientY }
    const rect = el.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    cursorRef.current = toLogical(e.clientX, e.clientY)
  }, [toLogical])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    const t = e.touches[0]
    cursorRef.current = toLogical(t.clientX, t.clientY)
  }, [toLogical])

  const handleDistractorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    distractorClicksRef.current++
  }, [])

  // Loop principal
  const gameLoop = useCallback((timestamp: number) => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const elapsed = timestamp - startTimeRef.current
    const remaining = TOTAL_DURATION_MS - elapsed

    if (remaining <= 0) {
      // Guardar último segmento
      const segAcc = segmentTotalRef.current > 0
        ? Math.round((segmentOnRef.current / segmentTotalRef.current) * 100)
        : 0
      segmentDataRef.current.push(segAcc)

      const totalTime = timeOnTargetRef.current + timeOffTargetRef.current
      const accPct = totalTime > 0 ? Math.round((timeOnTargetRef.current / totalTime) * 100) : 0

      const metrics: FocusFlowMetrics = {
        total_tracking_time_ms: TOTAL_DURATION_MS,
        time_on_target_ms: timeOnTargetRef.current,
        time_off_target_ms: timeOffTargetRef.current,
        accuracy_percent: accPct,
        longest_focus_streak_ms: longestStreakRef.current,
        distraction_responses: distractorClicksRef.current,
        performance_over_time: segmentDataRef.current,
      }
      setFinalMetrics(metrics)
      setPhase('results')
      return
    }

    setTimeLeft(remaining)

    // Delta
    const delta = lastTickRef.current > 0 ? timestamp - lastTickRef.current : 16
    lastTickRef.current = timestamp

    // Posición de la partícula
    const pos = particlePos(elapsed)

    // Distancia cursor → partícula
    const dx = cursorRef.current.x - pos.x
    const dy = cursorRef.current.y - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const onTarget = dist <= HIT_RADIUS

    onTargetRef.current = onTarget
    if (onTarget) {
      timeOnTargetRef.current += delta
      currentStreakRef.current += delta
      if (currentStreakRef.current > longestStreakRef.current) {
        longestStreakRef.current = currentStreakRef.current
      }
      segmentOnRef.current += delta
    } else {
      timeOffTargetRef.current += delta
      currentStreakRef.current = 0
    }
    segmentTotalRef.current += delta

    // Segmentos de rendimiento
    const segDuration = TOTAL_DURATION_MS / PERF_SEGMENTS
    const segIndex = Math.floor(elapsed / segDuration)
    if (segIndex > segmentDataRef.current.length) {
      const segAcc = segmentTotalRef.current > 0
        ? Math.round((segmentOnRef.current / segmentTotalRef.current) * 100)
        : 0
      segmentDataRef.current.push(segAcc)
      segmentOnRef.current = 0
      segmentTotalRef.current = 0
    }

    const totalSoFar = timeOnTargetRef.current + timeOffTargetRef.current
    const liveAcc = totalSoFar > 0 ? Math.round((timeOnTargetRef.current / totalSoFar) * 100) : 100
    setAccuracy(liveAcc)

    // Distractor periódico
    if (elapsed > nextDistractorRef.current && elapsed > 15000) {
      nextDistractorRef.current = elapsed + 8000 + Math.random() * 7000
      const margin = 60
      const newD: Distractor = {
        id: distractorCounterRef.current++,
        x: margin + Math.random() * (CANVAS_W - margin * 2),
        y: margin + Math.random() * (CANVAS_H - margin * 2),
        born: elapsed,
      }
      setDistractors(prev => [...prev.filter(d => elapsed - d.born < 3000), newD])
    }

    // ── Renderizar canvas ─────────────────────────────────────────
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Trail de la partícula
    for (let i = 1; i <= 8; i++) {
      const tp = particlePos(elapsed - i * 60)
      const alpha = (1 - i / 9) * 0.35
      ctx.beginPath()
      ctx.arc(tp.x, tp.y, 6 + i * 2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`
      ctx.fill()
    }

    // Zona de captura (solo visible si desenfocado)
    if (!onTarget) {
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, HIT_RADIUS, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Glow de la partícula
    const grad = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, 28)
    grad.addColorStop(0, '#06B6D4')
    grad.addColorStop(0.5, 'rgba(6,182,212,0.4)')
    grad.addColorStop(1, 'rgba(6,182,212,0)')
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    // Núcleo
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, onTarget ? 10 : 8, 0, Math.PI * 2)
    ctx.fillStyle = onTarget ? '#fff' : '#06B6D4'
    ctx.shadowBlur = onTarget ? 20 : 10
    ctx.shadowColor = '#06B6D4'
    ctx.fill()
    ctx.shadowBlur = 0

    animFrameRef.current = requestAnimationFrame(gameLoop)
  }, [])

  const startGame = useCallback(() => {
    startTimeRef.current = 0
    lastTickRef.current = 0
    timeOnTargetRef.current = 0
    timeOffTargetRef.current = 0
    longestStreakRef.current = 0
    currentStreakRef.current = 0
    distractorClicksRef.current = 0
    segmentDataRef.current = []
    segmentOnRef.current = 0
    segmentTotalRef.current = 0
    nextDistractorRef.current = 15000
    distractorCounterRef.current = 0
    setDistractors([])
    setAccuracy(100)
    setTimeLeft(TOTAL_DURATION_MS)

    track({ event_type: 'activity_start', category: 'activity', metadata: { activity_type: 'focus_flow' } })
    setPhase('playing')
  }, [track])

  // Iniciar loop cuando phase === 'playing'
  useEffect(() => {
    if (phase !== 'playing') return

    const start = (ts: number) => {
      startTimeRef.current = ts
      lastTickRef.current = ts
      animFrameRef.current = requestAnimationFrame(gameLoop)
    }
    animFrameRef.current = requestAnimationFrame(start)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [phase, gameLoop, handleMouseMove, handleTouchMove])

  // Guardar resultados
  useEffect(() => {
    if (phase !== 'results' || !finalMetrics) return

    const score = Math.round(
      finalMetrics.accuracy_percent * 0.7 +
      Math.min(finalMetrics.longest_focus_streak_ms / 60000, 1) * 20 +
      Math.max(0, 10 - finalMetrics.distraction_responses * 2)
    )

    track({ event_type: 'activity_complete', category: 'activity', metadata: { activity_type: 'focus_flow', score, metrics: finalMetrics } })

    setSaving(true)
    saveActivityResult({
      activity: 'focus_flow',
      score,
      maxScore: 100,
      durationSeconds: Math.round(TOTAL_DURATION_MS / 1000),
      metrics: finalMetrics as unknown as Record<string, unknown>,
      sessionId: sessionId ?? undefined,
    })
      .catch(err => setSaveError(err instanceof Error ? err.message : 'Error al guardar'))
      .finally(() => setSaving(false))
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmtTime = (ms: number) => {
    const s = Math.ceil(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  // ── Intro ───────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
          <div className="text-7xl mb-6">🎯</div>
          <h1 className="text-3xl font-bold text-white mb-3">Focus Flow</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Mantén tu cursor sobre la partícula brillante durante <span className="text-[#06B6D4] font-semibold">2 minutos</span>. La velocidad aumenta progresivamente. Ignora los distractores periféricos.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: '🕐', label: '2 minutos', sub: 'Duración total' },
              { icon: '💫', label: 'Partícula', sub: 'Movimiento suave' },
              { icon: '👁️', label: 'Atención', sub: 'Sostenida' },
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
            onClick={startGame}
            className="px-10 py-4 rounded-2xl text-white font-semibold text-lg"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #84CC16)', boxShadow: '0 8px 32px rgba(6,182,212,0.4)' }}
          >
            Comenzar
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ── Resultados ──────────────────────────────────────────────────
  if (phase === 'results' && finalMetrics) {
    const score = Math.round(
      finalMetrics.accuracy_percent * 0.7 +
      Math.min(finalMetrics.longest_focus_streak_ms / 60000, 1) * 20 +
      Math.max(0, 10 - finalMetrics.distraction_responses * 2)
    )

    const chartData = finalMetrics.performance_over_time.map((acc, i) => ({
      seg: `${(i + 1) * Math.round(TOTAL_DURATION_MS / PERF_SEGMENTS / 1000)}s`,
      acc,
    }))

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, delay: 0.1 }} className="inline-block">
            <div className="text-8xl font-bold bg-gradient-to-r from-[#06B6D4] to-[#84CC16] bg-clip-text text-transparent">{score}</div>
            <div className="text-slate-400 text-sm mt-1">/ 100 puntos</div>
          </motion.div>
          <h2 className="text-2xl font-bold text-white mt-3">
            {score >= 80 ? '🔥 Atención excepcional' : score >= 60 ? '👁️ Buena concentración' : '💪 Sigue entrenando'}
          </h2>
          {saving && <p className="text-slate-500 text-xs mt-2">Guardando...</p>}
          {saveError && <p className="text-red-400 text-xs mt-2">{saveError}</p>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Eye size={18} className="text-[#06B6D4]" />, label: 'Precisión', value: `${finalMetrics.accuracy_percent}%` },
            { icon: <Zap size={18} className="text-yellow-400" />, label: 'Racha máx.', value: `${Math.round(finalMetrics.longest_focus_streak_ms / 1000)}s` },
            { icon: <Clock size={18} className="text-[#84CC16]" />, label: 'En objetivo', value: `${Math.round(finalMetrics.time_on_target_ms / 1000)}s` },
            { icon: <Crosshair size={18} className="text-red-400" />, label: 'Distracciones', value: String(finalMetrics.distraction_responses) },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <div className="flex justify-center mb-2">{stat.icon}</div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-4">Atención a lo largo del tiempo</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <defs>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="seg" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => [`${v}%`, 'Precisión']} />
                <Area type="monotone" dataKey="acc" stroke="#06B6D4" fill="url(#accGrad)" strokeWidth={2} dot={{ fill: '#06B6D4', r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="text-center">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase('intro')}
            className="px-8 py-3 rounded-xl text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #84CC16)' }}>
            Volver a jugar
          </motion.button>
        </div>
      </motion.div>
    )
  }

  // ── Juego ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4 select-none">
      {/* HUD */}
      <div className="w-full max-w-3xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Clock size={15} className="text-[#06B6D4]" />
          <span className="text-white font-mono text-lg">{fmtTime(timeLeft)}</span>
        </div>
        <div className="flex-1 mx-6">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: accuracy >= 70 ? 'linear-gradient(90deg,#06B6D4,#84CC16)' : accuracy >= 40 ? '#F59E0B' : '#EF4444' }}
              animate={{ width: `${accuracy}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-xs text-slate-500 mt-1">Precisión: {accuracy}%</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Eye size={15} className={accuracy >= 60 ? 'text-green-400' : 'text-red-400'} />
          <span className={accuracy >= 60 ? 'text-green-400' : 'text-red-400'}>
            {accuracy >= 60 ? 'Enfocado' : 'Desenfocado'}
          </span>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-white/10"
        style={{ background: '#0A0A14', aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-full"
        />

        {/* Distractores */}
        {distractors.map(d => (
          <motion.button
            key={d.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={handleDistractorClick}
            className="absolute rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-pointer"
            style={{
              left: `${(d.x / CANVAS_W) * 100}%`,
              top: `${(d.y / CANVAS_H) * 100}%`,
              transform: 'translate(-50%,-50%)',
              width: 44,
              height: 44,
              borderColor: '#EC4899',
              color: '#EC4899',
              background: 'rgba(236,72,153,0.1)',
            }}
          >
            ✦
          </motion.button>
        ))}
      </div>
    </div>
  )
}
