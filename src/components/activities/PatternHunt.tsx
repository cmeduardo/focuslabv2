'use client'

// Pattern Hunt — encuentra el elemento diferente en el grid
// Mide atención visual y detección de patrones
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Eye, Target, Zap, TrendingUp } from 'lucide-react'
import { useEventTracker } from '@/hooks/useEventTracker'
import { saveActivityResult } from '@/lib/activities/saveResult'
import type { PatternHuntMetrics } from '@/types/activities'
import { cn } from '@/lib/utils'

// ── Tipos de formas y diferencias ───────────────────────────────────────────

type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'star'
type DiffType  = 'shape' | 'color' | 'size' | 'rotation' | 'shade'

interface ShapeConfig {
  shape: ShapeType
  color: string
  size: number      // 50 = normal, 30 = small, 70 = big
  rotation: number  // grados
}

interface LevelConfig {
  gridSize: number
  diffType: DiffType
  timeLimit: number
}

// ── Configuración de niveles ──────────────────────────────────────────────────

const LEVELS: LevelConfig[] = [
  { gridSize: 3, diffType: 'shape',    timeLimit: 15 },  // 1
  { gridSize: 3, diffType: 'shape',    timeLimit: 13 },  // 2
  { gridSize: 3, diffType: 'color',    timeLimit: 13 },  // 3
  { gridSize: 3, diffType: 'color',    timeLimit: 11 },  // 4
  { gridSize: 4, diffType: 'shape',    timeLimit: 12 },  // 5
  { gridSize: 4, diffType: 'color',    timeLimit: 12 },  // 6
  { gridSize: 4, diffType: 'size',     timeLimit: 12 },  // 7
  { gridSize: 4, diffType: 'size',     timeLimit: 10 },  // 8
  { gridSize: 4, diffType: 'rotation', timeLimit: 10 },  // 9
  { gridSize: 5, diffType: 'shape',    timeLimit: 10 },  // 10
  { gridSize: 5, diffType: 'color',    timeLimit: 10 },  // 11
  { gridSize: 5, diffType: 'size',     timeLimit: 9  },  // 12
  { gridSize: 5, diffType: 'rotation', timeLimit: 8  },  // 13
  { gridSize: 5, diffType: 'shade',    timeLimit: 8  },  // 14
  { gridSize: 6, diffType: 'shade',    timeLimit: 8  },  // 15
]

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'star']
const COLORS = ['#8B5CF6', '#06B6D4', '#84CC16', '#EC4899', '#F59E0B', '#EF4444']

// Aclara un color hex un porcentaje dado (0–1)
function lightenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.min(255, Math.round(r + (255 - r) * amount))
  const lg = Math.min(255, Math.round(g + (255 - g) * amount))
  const lb = Math.min(255, Math.round(b + (255 - b) * amount))
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

// Genera la cuadrícula para un nivel dado
function generateGrid(config: LevelConfig): { grid: ShapeConfig[], oddIdx: number } {
  const total = config.gridSize * config.gridSize
  const oddIdx = Math.floor(Math.random() * total)

  let baseShape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)]
  let baseSize = 50
  let baseRotation = 0

  let oddShape: ShapeType = baseShape
  let oddColor: string = baseColor
  let oddSize = 50
  let oddRotation = 0

  switch (config.diffType) {
    case 'shape': {
      const others = SHAPES.filter(s => s !== baseShape)
      oddShape = others[Math.floor(Math.random() * others.length)]
      break
    }
    case 'color': {
      const others = COLORS.filter(c => c !== baseColor)
      oddColor = others[Math.floor(Math.random() * others.length)]
      break
    }
    case 'size': {
      oddSize = 28  // notablemente más pequeño
      break
    }
    case 'rotation': {
      // Para que la rotación sea visible, usar formas con asimetría rotacional
      const rotatable: ShapeType[] = ['triangle', 'pentagon', 'star']
      baseShape = rotatable[Math.floor(Math.random() * rotatable.length)]
      oddShape = baseShape
      oddRotation = 45
      break
    }
    case 'shade': {
      // Mismo color pero más claro — diferencia sutil
      oddColor = lightenHex(baseColor, 0.4)
      break
    }
  }

  const base: ShapeConfig = { shape: baseShape, color: baseColor, size: baseSize, rotation: baseRotation }
  const odd: ShapeConfig  = { shape: oddShape, color: oddColor, size: oddSize, rotation: oddRotation }

  const grid: ShapeConfig[] = Array.from({ length: total }, (_, i) => i === oddIdx ? odd : base)
  return { grid, oddIdx }
}

// ── SVG de formas ─────────────────────────────────────────────────────────────

function ShapeIcon({ shape, color, size, rotation }: ShapeConfig) {
  const c = 50   // centro del viewBox
  const r = size * 0.42

  const getPoints = (): string => {
    switch (shape) {
      case 'triangle': {
        const h = r * Math.sqrt(3) / 2
        return `${c},${c - r} ${c + r * 0.866},${c + r * 0.5} ${c - r * 0.866},${c + r * 0.5}`
      }
      case 'diamond':
        return `${c},${c - r} ${c + r},${c} ${c},${c + r} ${c - r},${c}`
      case 'pentagon': {
        const pts = []
        for (let i = 0; i < 5; i++) {
          const a = (i * 72 - 90) * Math.PI / 180
          pts.push(`${c + r * Math.cos(a)},${c + r * Math.sin(a)}`)
        }
        return pts.join(' ')
      }
      case 'star': {
        const outer = r, inner = r * 0.42
        const pts = []
        for (let i = 0; i < 10; i++) {
          const a = (i * 36 - 90) * Math.PI / 180
          const rad = i % 2 === 0 ? outer : inner
          pts.push(`${c + rad * Math.cos(a)},${c + rad * Math.sin(a)}`)
        }
        return pts.join(' ')
      }
      default: return ''
    }
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
      <g transform={`rotate(${rotation}, ${c}, ${c})`} style={{ filter: `drop-shadow(0 0 5px ${color}99)` }}>
        {shape === 'circle' && <circle cx={c} cy={c} r={r} fill={color} />}
        {shape === 'square' && <rect x={c - r} y={c - r} width={r * 2} height={r * 2} fill={color} rx={5} />}
        {['triangle', 'diamond', 'pentagon', 'star'].includes(shape) && (
          <polygon points={getPoints()} fill={color} />
        )}
      </g>
    </svg>
  )
}

// ── Tipos de estado de juego ─────────────────────────────────────────────────

interface LevelAttempt {
  level: number
  config: LevelConfig
  detectionTimeMs: number | null  // null = tiempo agotado
  falsePositives: number
  success: boolean
}

type Phase = 'intro' | 'playing' | 'levelup' | 'timeout' | 'results'

// ── Cálculo de métricas ──────────────────────────────────────────────────────

function calcMetrics(attempts: LevelAttempt[]): PatternHuntMetrics {
  const successful = attempts.filter(a => a.success)
  const times = successful.map(a => a.detectionTimeMs as number)
  const avgMs = times.length > 0 ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : 0

  const totalFP = attempts.reduce((s, a) => s + a.falsePositives, 0)
  const totalClicks = attempts.reduce((s, a) => s + a.falsePositives + (a.success ? 1 : 0), 0)
  const efficiency = totalClicks > 0 ? Math.round((successful.length / totalClicks) * 100) / 100 : 0
  const accuracy = attempts.length > 0 ? Math.round(successful.length / attempts.length * 100) : 0

  // Umbral de dificultad: último diffType completado exitosamente
  const lastSuccess = [...successful].reverse()[0]
  const threshold = lastSuccess ? lastSuccess.config.diffType : 'none'

  // Tipos de patrones dominados (diffType con al menos 1 éxito)
  const mastered = [...new Set(successful.map(a => a.config.diffType))]

  return {
    levels_completed: successful.length,
    avg_detection_time_ms: avgMs,
    accuracy_percent: accuracy,
    visual_search_efficiency: efficiency,
    difficulty_threshold: threshold,
    false_positives: totalFP,
    pattern_types_mastered: mastered,
  }
}

function calcScore(attempts: LevelAttempt[]): number {
  if (attempts.length === 0) return 0
  const metrics = calcMetrics(attempts)
  const levelBonus = Math.min(metrics.levels_completed * 5, 60)
  const fpPenalty = Math.min(metrics.false_positives * 2, 20)
  const speedBonus = metrics.avg_detection_time_ms > 0
    ? Math.max(0, 20 - Math.floor(metrics.avg_detection_time_ms / 500))
    : 0
  return Math.max(0, Math.min(100, levelBonus + speedBonus - fpPenalty + 20))
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PatternHunt() {
  const { track, sessionId } = useEventTracker()
  const [phase, setPhase] = useState<Phase>('intro')
  const [levelIdx, setLevelIdx] = useState(0)
  const [grid, setGrid] = useState<ShapeConfig[]>([])
  const [oddIdx, setOddIdx] = useState(-1)
  const [levelTimer, setLevelTimer] = useState(15)
  const [attempts, setAttempts] = useState<LevelAttempt[]>([])
  const [lives, setLives] = useState(3)
  const [falsePosThisLevel, setFalsePosThisLevel] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [flashCell, setFlashCell] = useState<{ idx: number; correct: boolean } | null>(null)

  const levelStartRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(Date.now())
  const attemptsRef = useRef<LevelAttempt[]>([])

  useEffect(() => { attemptsRef.current = attempts }, [attempts])

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  // Carga un nivel nuevo
  const loadLevel = useCallback((idx: number) => {
    const cfg = idx < LEVELS.length ? LEVELS[idx] : { ...LEVELS[LEVELS.length - 1], timeLimit: Math.max(5, LEVELS[LEVELS.length - 1].timeLimit - 1) }
    const { grid: newGrid, oddIdx: newOdd } = generateGrid(cfg)
    setGrid(newGrid)
    setOddIdx(newOdd)
    setLevelTimer(cfg.timeLimit)
    setFalsePosThisLevel(0)
    setFlashCell(null)
    levelStartRef.current = Date.now()
    setPhase('playing')
  }, [])

  // Timer de cuenta regresiva por nivel
  useEffect(() => {
    if (phase !== 'playing') return
    clearTimer()
    timerRef.current = setInterval(() => {
      setLevelTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return clearTimer
  }, [phase, levelIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeout = useCallback(() => {
    clearTimer()
    const cfg = levelIdx < LEVELS.length ? LEVELS[levelIdx] : LEVELS[LEVELS.length - 1]
    const attempt: LevelAttempt = {
      level: levelIdx + 1,
      config: cfg,
      detectionTimeMs: null,
      falsePositives: falsePosThisLevel,
      success: false,
    }
    setAttempts(prev => [...prev, attempt])

    const newLives = lives - 1
    setLives(newLives)

    if (newLives <= 0) {
      setPhase('results')
    } else {
      setPhase('timeout')
      setTimeout(() => loadLevel(levelIdx + 1), 1500)
      setLevelIdx(lv => lv + 1)
    }
  }, [clearTimer, levelIdx, falsePosThisLevel, lives, loadLevel])

  // Click en celda
  const handleCellClick = useCallback((cellIdx: number) => {
    if (phase !== 'playing') return

    if (cellIdx === oddIdx) {
      // ¡Correcto!
      clearTimer()
      const dt = Date.now() - levelStartRef.current
      setFlashCell({ idx: cellIdx, correct: true })

      const cfg = levelIdx < LEVELS.length ? LEVELS[levelIdx] : LEVELS[LEVELS.length - 1]
      const attempt: LevelAttempt = {
        level: levelIdx + 1,
        config: cfg,
        detectionTimeMs: dt,
        falsePositives: falsePosThisLevel,
        success: true,
      }
      setAttempts(prev => [...prev, attempt])

      track({ event_type: 'activity_response', category: 'activity', metadata: { level: levelIdx + 1, detection_ms: dt, correct: true } })

      setPhase('levelup')
      setTimeout(() => {
        const next = levelIdx + 1
        if (next >= LEVELS.length + 5) {
          setPhase('results')
        } else {
          setLevelIdx(next)
          loadLevel(next)
        }
      }, 1000)
    } else {
      // Falso positivo
      setFlashCell({ idx: cellIdx, correct: false })
      setFalsePosThisLevel(f => f + 1)
      setTimeout(() => setFlashCell(null), 400)
      track({ event_type: 'activity_response', category: 'activity', metadata: { level: levelIdx + 1, correct: false, false_positive: true } })
    }
  }, [phase, oddIdx, levelIdx, falsePosThisLevel, clearTimer, loadLevel, track])

  // Guardar resultados
  useEffect(() => {
    if (phase !== 'results' || attemptsRef.current.length === 0) return
    const att = attemptsRef.current
    const metrics = calcMetrics(att)
    const score = calcScore(att)
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)

    track({ event_type: 'activity_complete', category: 'activity', metadata: { activity_type: 'pattern_hunt', score, duration: durationSeconds, metrics } })

    setSaving(true)
    saveActivityResult({
      activity: 'pattern_hunt',
      score,
      maxScore: 100,
      durationSeconds,
      metrics: metrics as unknown as Record<string, unknown>,
      sessionId: sessionId ?? undefined,
    })
      .catch(err => setSaveError(err instanceof Error ? err.message : 'Error al guardar'))
      .finally(() => setSaving(false))
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimer(), [clearTimer])

  const handleStart = () => {
    setAttempts([])
    setLives(3)
    setLevelIdx(0)
    startedAtRef.current = Date.now()
    track({ event_type: 'activity_start', category: 'activity', metadata: { activity_type: 'pattern_hunt' } })
    loadLevel(0)
  }

  const levelConfig = levelIdx < LEVELS.length ? LEVELS[levelIdx] : LEVELS[LEVELS.length - 1]

  // ── Pantalla intro ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
          <div className="text-7xl mb-6">🔍</div>
          <h1 className="text-3xl font-bold text-white mb-3">Pattern Hunt</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            En cada nivel hay un grid de formas. <span className="text-[#84CC16] font-semibold">Una es diferente</span> al resto. Encuéntrala antes de que se acabe el tiempo. La diferencia se vuelve <span className="text-[#EC4899] font-semibold">más sutil</span> con cada nivel.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: '❤️', label: '3 vidas', sub: 'Fallos permitidos' },
              { icon: '⏱️', label: 'Timer', sub: 'Decrece con niveles' },
              { icon: '👁️', label: 'Formas → sombras', sub: 'Dificultad creciente' },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="px-10 py-4 rounded-2xl text-white font-semibold text-lg"
            style={{ background: 'linear-gradient(135deg, #84CC16, #06B6D4)', boxShadow: '0 8px 32px rgba(132,204,22,0.35)' }}
          >
            Comenzar
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ── Pantalla de resultados ──────────────────────────────────────────────────
  if (phase === 'results') {
    const metrics = calcMetrics(attempts)
    const score = calcScore(attempts)

    const diffLabels: Record<DiffType, string> = {
      shape: 'Forma', color: 'Color', size: 'Tamaño', rotation: 'Rotación', shade: 'Sombra',
    }

    const chartData = attempts.slice(0, 15).map((a, i) => ({
      level: i + 1,
      ms: a.detectionTimeMs ?? 0,
      success: a.success,
    }))

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Score */}
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, delay: 0.1 }}>
            <div className="text-8xl font-bold bg-gradient-to-r from-[#84CC16] to-[#06B6D4] bg-clip-text text-transparent">{score}</div>
            <div className="text-slate-400 text-sm mt-1">/ 100 puntos</div>
          </motion.div>
          <h2 className="text-2xl font-bold text-white mt-3">
            {score >= 80 ? '🔥 Visión de halcón' : score >= 55 ? '🎯 Buen ojo' : '👀 Sigue entrenando'}
          </h2>
          {saving && <p className="text-slate-500 text-xs mt-2">Guardando resultados...</p>}
          {saveError && <p className="text-red-400 text-xs mt-2">{saveError}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Target size={18} className="text-[#84CC16]" />,   label: 'Niveles',      value: String(metrics.levels_completed) },
            { icon: <Eye size={18} className="text-[#06B6D4]" />,       label: 'Precisión',    value: `${metrics.accuracy_percent}%` },
            { icon: <Zap size={18} className="text-[#F59E0B]" />,       label: 'Tiempo medio', value: `${(metrics.avg_detection_time_ms / 1000).toFixed(1)}s` },
            { icon: <TrendingUp size={18} className="text-[#EC4899]" />, label: 'Falsos clicks', value: String(metrics.false_positives) },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <div className="flex justify-center mb-2">{s.icon}</div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-slate-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tipos de patrones dominados */}
        {metrics.pattern_types_mastered.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">Tipos de patrón dominados</h3>
            <div className="flex flex-wrap gap-2">
              {(metrics.pattern_types_mastered as DiffType[]).map(t => (
                <span key={t} className="px-3 py-1 rounded-full text-xs font-medium bg-[#84CC16]/15 text-[#84CC16] border border-[#84CC16]/25">
                  ✓ {diffLabels[t]}
                </span>
              ))}
              {(['shape', 'color', 'size', 'rotation', 'shade'] as DiffType[])
                .filter(t => !metrics.pattern_types_mastered.includes(t))
                .map(t => (
                  <span key={t} className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-600 border border-white/10">
                    {diffLabels[t]}
                  </span>
                ))
              }
            </div>
          </div>
        )}

        {/* Gráfico de tiempos */}
        {chartData.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#84CC16]" />
              Tiempo de detección por nivel
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <XAxis dataKey="level" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={v => `${v / 1000}s`} />
                <Tooltip
                  contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v) => [`${((v as number) / 1000).toFixed(1)}s`, 'Detección']}
                />
                <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.success ? '#84CC16' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-slate-500 text-xs mt-2 text-center">Verde = éxito · Rojo = tiempo agotado</p>
          </div>
        )}

        <div className="text-center">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setAttempts([]); setLives(3); setPhase('intro') }}
            className="px-8 py-3 rounded-xl text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #84CC16, #06B6D4)' }}
          >
            Jugar de nuevo
          </motion.button>
        </div>
      </motion.div>
    )
  }

  // ── Pantalla de juego ───────────────────────────────────────────────────────

  const gridSize = levelConfig.gridSize
  const timerPct = (levelTimer / levelConfig.timeLimit) * 100
  const cellSize = gridSize <= 3 ? 'w-24 h-24' : gridSize <= 4 ? 'w-18 h-18' : gridSize <= 5 ? 'w-14 h-14' : 'w-12 h-12'
  const cellPx   = gridSize <= 3 ? 96 : gridSize <= 4 ? 72 : gridSize <= 5 ? 56 : 48

  const diffLabel: Record<DiffType, string> = {
    shape: 'Forma diferente', color: 'Color diferente', size: 'Tamaño diferente',
    rotation: 'Rotación diferente', shade: 'Tono diferente',
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center gap-5">
      {/* Header */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">Nivel {levelIdx + 1}</span>
            <span className="text-slate-500 text-sm">/ {gridSize}×{gridSize}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">{diffLabel[levelConfig.diffType]}</span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <span key={i} className="text-lg">{i < lives ? '❤️' : '🖤'}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
            style={{
              background: timerPct > 40 ? 'linear-gradient(90deg, #84CC16, #06B6D4)'
                : timerPct > 20 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>{levelTimer}s restantes</span>
          <span>{attempts.filter(a => a.success).length} completados</span>
        </div>
      </div>

      {/* Feedback overlay */}
      <AnimatePresence>
        {phase === 'levelup' && (
          <motion.div
            key="levelup"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="text-center">
              <p className="text-7xl">✓</p>
              <p className="text-white text-2xl font-bold mt-2">¡Correcto!</p>
            </div>
          </motion.div>
        )}
        {phase === 'timeout' && (
          <motion.div
            key="timeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="text-center">
              <p className="text-6xl">⏱</p>
              <p className="text-[#F59E0B] text-2xl font-bold mt-2">Tiempo agotado</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid de shapes */}
      <AnimatePresence mode="wait">
        <motion.div
          key={levelIdx}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25 }}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gridSize}, ${cellPx}px)` }}
        >
          {grid.map((item, i) => {
            const isFlashed = flashCell?.idx === i
            const flashCorrect = flashCell?.correct
            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleCellClick(i)}
                className="rounded-xl flex items-center justify-center relative overflow-hidden"
                style={{
                  width: cellPx,
                  height: cellPx,
                  background: isFlashed
                    ? (flashCorrect ? 'rgba(132,204,22,0.3)' : 'rgba(239,68,68,0.3)')
                    : 'rgba(255,255,255,0.06)',
                  border: isFlashed
                    ? (flashCorrect ? '1px solid rgba(132,204,22,0.6)' : '1px solid rgba(239,68,68,0.6)')
                    : '1px solid rgba(255,255,255,0.1)',
                  transition: 'background 0.15s, border 0.15s',
                }}
              >
                <div style={{ width: cellPx * 0.65, height: cellPx * 0.65 }}>
                  <ShapeIcon {...item} />
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {/* Instrucción */}
      <p className="text-slate-500 text-xs text-center">
        Toca la {diffLabel[levelConfig.diffType].toLowerCase()} para avanzar
      </p>
    </div>
  )
}
