'use client'

// Memory Matrix — Grid progresivo de 3x3 a 7x7
// Mide memoria de trabajo y retención a corto plazo
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Brain, Grid3x3, CheckCircle2, XCircle } from 'lucide-react'
import { useEventTracker } from '@/hooks/useEventTracker'
import { saveActivityResult } from '@/lib/activities/saveResult'
import type { MemoryMatrixMetrics } from '@/types/activities'

// Configuración de niveles: gridSize × celdas a iluminar
const LEVELS: { size: number; cells: number }[] = [
  { size: 3, cells: 3 },   // nivel 1
  { size: 3, cells: 4 },   // nivel 2
  { size: 4, cells: 5 },   // nivel 3
  { size: 4, cells: 6 },   // nivel 4
  { size: 5, cells: 7 },   // nivel 5
  { size: 5, cells: 9 },   // nivel 6
  { size: 6, cells: 10 },  // nivel 7
  { size: 6, cells: 12 },  // nivel 8
  { size: 7, cells: 14 },  // nivel 9 — máximo
]

const MAX_ATTEMPTS_PER_LEVEL = 3
const SHOW_MS = 3000         // tiempo de visualización del patrón

type GamePhase = 'intro' | 'showing' | 'input' | 'correct' | 'wrong' | 'levelup' | 'gameover' | 'results'

interface LevelResult {
  level: number
  size: number
  correct: boolean
  attempts: number
  responseTimes: number[]   // ms por celda seleccionada
}

// Genera índices aleatorios únicos
function randomCells(total: number, count: number): number[] {
  const pool = Array.from({ length: total }, (_, i) => i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).sort((a, b) => a - b)
}

// Analiza si hay sesgo hacia bordes
function detectEdgeBias(errors: number[], size: number): string {
  if (errors.length === 0) return 'none'
  const edgeIndices = new Set<number>()
  for (let i = 0; i < size * size; i++) {
    const row = Math.floor(i / size)
    const col = i % size
    if (row === 0 || row === size - 1 || col === 0 || col === size - 1) edgeIndices.add(i)
  }
  const edgeErrors = errors.filter(e => edgeIndices.has(e)).length
  const ratio = edgeErrors / errors.length
  if (ratio > 0.6) return 'edge_bias'
  if (ratio < 0.3) return 'center_bias'
  return 'distributed'
}

export default function MemoryMatrix() {
  const { track, sessionId } = useEventTracker()
  const [phase, setPhase] = useState<GamePhase>('intro')
  const [levelIndex, setLevelIndex] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [pattern, setPattern] = useState<number[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [levelResults, setLevelResults] = useState<LevelResult[]>([])
  const [countdown, setCountdown] = useState(3)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const startTimeRef = useRef<number>(Date.now())
  const cellTimesRef = useRef<number[]>([])
  const lastCellTimeRef = useRef<number>(0)
  const allErrorsRef = useRef<number[]>([])
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const level = LEVELS[levelIndex]
  const totalCells = level.size * level.size

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
  }, [])

  // Muestra el patrón por SHOW_MS y luego pasa a input
  const showPattern = useCallback((pat: number[]) => {
    setPattern(pat)
    setSelected([])
    setPhase('showing')
    setCountdown(Math.ceil(SHOW_MS / 1000))

    // Countdown visual
    let remaining = Math.ceil(SHOW_MS / 1000)
    const tick = setInterval(() => {
      remaining--
      setCountdown(remaining)
      if (remaining <= 0) clearInterval(tick)
    }, 1000)

    showTimerRef.current = setTimeout(() => {
      clearInterval(tick)
      lastCellTimeRef.current = Date.now()
      cellTimesRef.current = []
      setPhase('input')
    }, SHOW_MS)
  }, [])

  const startLevel = useCallback((idx: number) => {
    clearShowTimer()
    const lvl = LEVELS[idx]
    const pat = randomCells(lvl.size * lvl.size, lvl.cells)
    setAttempts(0)
    showPattern(pat)
  }, [clearShowTimer, showPattern])

  const handleStart = () => {
    startTimeRef.current = Date.now()
    allErrorsRef.current = []
    setLevelResults([])
    track({ event_type: 'activity_start', category: 'activity', metadata: { activity_type: 'memory_matrix' } })
    startLevel(0)
  }

  // Selección de celda durante input
  const handleCellClick = useCallback((idx: number) => {
    if (phase !== 'input') return
    if (selected.includes(idx)) return

    const now = Date.now()
    cellTimesRef.current.push(now - lastCellTimeRef.current)
    lastCellTimeRef.current = now

    const newSelected = [...selected, idx]
    setSelected(newSelected)

    // Verificar si completó la selección
    if (newSelected.length === pattern.length) {
      const correct = pattern.every(p => newSelected.includes(p))
      const errors = newSelected.filter(s => !pattern.includes(s))
      allErrorsRef.current.push(...errors)

      if (correct) {
        setPhase('correct')
        const result: LevelResult = {
          level: levelIndex + 1,
          size: level.size,
          correct: true,
          attempts: attempts + 1,
          responseTimes: [...cellTimesRef.current],
        }
        setLevelResults(prev => [...prev, result])

        track({ event_type: 'activity_response', category: 'activity', metadata: { level: levelIndex + 1, correct: true, attempt: attempts + 1 } })

        setTimeout(() => {
          const next = levelIndex + 1
          if (next >= LEVELS.length) {
            setPhase('gameover')
          } else {
            setPhase('levelup')
            setTimeout(() => {
              setLevelIndex(next)
              startLevel(next)
            }, 1200)
          }
        }, 1000)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setPhase('wrong')
        track({ event_type: 'activity_response', category: 'activity', metadata: { level: levelIndex + 1, correct: false, attempt: newAttempts } })

        if (newAttempts >= MAX_ATTEMPTS_PER_LEVEL) {
          const result: LevelResult = {
            level: levelIndex + 1,
            size: level.size,
            correct: false,
            attempts: newAttempts,
            responseTimes: [...cellTimesRef.current],
          }
          setLevelResults(prev => [...prev, result])
          setTimeout(() => setPhase('gameover'), 1200)
        } else {
          setTimeout(() => showPattern(pattern), 1500)
        }
      }
    }
  }, [phase, selected, pattern, levelIndex, level.size, attempts, showPattern, track])

  // Game Over → ir a resultados
  useEffect(() => {
    if (phase !== 'gameover') return
    setTimeout(() => setPhase('results'), 800)
  }, [phase])

  // Guardar resultados
  useEffect(() => {
    if (phase !== 'results' || levelResults.length === 0) return

    const maxLevel = Math.max(...levelResults.map(r => r.correct ? r.level : r.level - 1), 0)
    const accuracyPerLevel = levelResults.map(r => r.correct ? 100 : 0)
    const allTimes = levelResults.flatMap(r => r.responseTimes).filter(t => t > 0)
    const avgTimePerCell = allTimes.length > 0 ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length) : 0
    const totalCorrect = levelResults.filter(r => r.correct).length
    const totalAttempts = levelResults.reduce((s, r) => s + r.attempts, 0)

    const metrics: MemoryMatrixMetrics = {
      max_level_reached: maxLevel,
      accuracy_per_level: accuracyPerLevel,
      avg_response_time_per_cell_ms: avgTimePerCell,
      working_memory_span: LEVELS[Math.max(0, maxLevel - 1)]?.cells ?? 0,
      error_patterns: detectEdgeBias(allErrorsRef.current, LEVELS[Math.max(0, maxLevel - 1)]?.size ?? 3),
      total_correct: totalCorrect,
      total_attempts: totalAttempts,
    }

    const score = Math.round((maxLevel / LEVELS.length) * 70 + (totalCorrect / Math.max(levelResults.length, 1)) * 30)
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)

    track({ event_type: 'activity_complete', category: 'activity', metadata: { activity_type: 'memory_matrix', score, metrics } })

    setSaving(true)
    saveActivityResult({
      activity: 'memory_matrix',
      score,
      maxScore: 100,
      durationSeconds,
      metrics: metrics as unknown as Record<string, unknown>,
      sessionId: sessionId ?? undefined,
    })
      .catch(err => setSaveError(err instanceof Error ? err.message : 'Error al guardar'))
      .finally(() => setSaving(false))
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearShowTimer(), [clearShowTimer])

  // ── Intro ───────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
          <div className="text-7xl mb-6">🧩</div>
          <h1 className="text-3xl font-bold text-white mb-3">Memory Matrix</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Memoriza el patrón de celdas iluminadas y reprodúcelo. El grid crece de <span className="text-[#8B5CF6] font-semibold">3×3</span> hasta <span className="text-[#8B5CF6] font-semibold">7×7</span>. Tienes 3 intentos por nivel.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: '📐', label: '9 niveles', sub: '3×3 → 7×7' },
              { icon: '🔢', label: '3 intentos', sub: 'Por nivel' },
              { icon: '🧠', label: 'Memoria', sub: 'De trabajo' },
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
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}
          >
            Comenzar
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ── Resultados ──────────────────────────────────────────────────
  if (phase === 'results') {
    const maxLevel = Math.max(...levelResults.map(r => r.correct ? r.level : r.level - 1), 0)
    const totalCorrect = levelResults.filter(r => r.correct).length
    const score = Math.round((maxLevel / LEVELS.length) * 70 + (totalCorrect / Math.max(levelResults.length, 1)) * 30)
    const span = LEVELS[Math.max(0, maxLevel - 1)]?.cells ?? 0

    const radarData = [
      { stat: 'Nivel', value: Math.round((maxLevel / LEVELS.length) * 100) },
      { stat: 'Precisión', value: Math.round((totalCorrect / Math.max(levelResults.length, 1)) * 100) },
      { stat: 'Velocidad', value: Math.min(100, Math.round(1000 / Math.max(1, levelResults.flatMap(r => r.responseTimes).filter(t => t > 0).reduce((a, b) => a + b, 0) / Math.max(1, levelResults.flatMap(r => r.responseTimes).filter(t => t > 0).length)) * 100)) },
    ]

    const barData = levelResults.map(r => ({
      nivel: `N${r.level}`,
      resultado: r.correct ? 100 : 0,
    }))

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, delay: 0.1 }} className="inline-block">
            <div className="text-8xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">{score}</div>
            <div className="text-slate-400 text-sm mt-1">/ 100 puntos</div>
          </motion.div>
          <h2 className="text-2xl font-bold text-white mt-3">
            {score >= 80 ? '🧠 Memoria extraordinaria' : score >= 55 ? '🎯 Buena memoria' : '💪 Sigue entrenando'}
          </h2>
          {saving && <p className="text-slate-500 text-xs mt-2">Guardando...</p>}
          {saveError && <p className="text-red-400 text-xs mt-2">{saveError}</p>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Grid3x3 size={18} className="text-[#8B5CF6]" />, label: 'Nivel máximo', value: `${maxLevel} / ${LEVELS.length}` },
            { icon: <Brain size={18} className="text-[#EC4899]" />, label: 'Span memoria', value: `${span} celdas` },
            { icon: <CheckCircle2 size={18} className="text-green-400" />, label: 'Niveles ok', value: `${totalCorrect}` },
            { icon: <XCircle size={18} className="text-red-400" />, label: 'Fallados', value: `${levelResults.length - totalCorrect}` },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <div className="flex justify-center mb-2">{stat.icon}</div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Progreso por nivel */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">Resultado por nivel</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <XAxis dataKey="nivel" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => [v === 100 ? '✓ Correcto' : '✗ Fallado', '']} />
                <Bar dataKey="resultado" radius={[4, 4, 0, 0]}>
                  {barData.map((d, i) => <Cell key={i} fill={d.resultado === 100 ? '#84CC16' : '#EF4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">Perfil cognitivo</h3>
            <ResponsiveContainer width="100%" height={150}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Radar dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="text-center">
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => { setPhase('intro'); setLevelIndex(0); setLevelResults([]) }}
            className="px-8 py-3 rounded-xl text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
            Volver a jugar
          </motion.button>
        </div>
      </motion.div>
    )
  }

  // ── Grid de juego ───────────────────────────────────────────────
  const isShowing = phase === 'showing'
  const isInput = phase === 'input'
  const isCorrect = phase === 'correct'
  const isWrong = phase === 'wrong'
  const isLevelUp = phase === 'levelup'

  // Color de celda
  const cellStyle = (idx: number): { bg: string; shadow: string } => {
    if (isShowing && pattern.includes(idx)) {
      return { bg: '#8B5CF6', shadow: '0 0 20px rgba(139,92,246,0.8)' }
    }
    if ((isInput || isCorrect || isWrong) && selected.includes(idx)) {
      if (isCorrect) return { bg: '#84CC16', shadow: '0 0 16px rgba(132,204,22,0.7)' }
      if (isWrong && pattern.includes(idx)) return { bg: '#84CC16', shadow: '0 0 16px rgba(132,204,22,0.7)' }
      if (isWrong && !pattern.includes(idx)) return { bg: '#EF4444', shadow: '0 0 16px rgba(239,68,68,0.7)' }
      return { bg: '#06B6D4', shadow: '0 0 16px rgba(6,182,212,0.7)' }
    }
    if (isWrong && pattern.includes(idx) && !selected.includes(idx)) {
      return { bg: 'rgba(132,204,22,0.25)', shadow: 'none' }
    }
    return { bg: 'rgba(255,255,255,0.06)', shadow: 'none' }
  }

  const maxGridPx = Math.min(480, typeof window !== 'undefined' ? window.innerWidth - 48 : 480)
  const cellPx = Math.floor((maxGridPx - (level.size - 1) * 8) / level.size)

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-6">
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between">
        <div className="text-center">
          <p className="text-slate-500 text-xs">Nivel</p>
          <p className="text-white font-bold text-xl">{levelIndex + 1} / {LEVELS.length}</p>
        </div>
        <div className="text-center">
          <p className="text-slate-500 text-xs">Grid</p>
          <p className="text-white font-bold text-xl">{level.size}×{level.size}</p>
        </div>
        <div className="text-center">
          <p className="text-slate-500 text-xs">Intentos</p>
          <div className="flex gap-1 justify-center mt-1">
            {Array.from({ length: MAX_ATTEMPTS_PER_LEVEL }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i < attempts ? 'bg-red-400' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Instrucción */}
      <AnimatePresence mode="wait">
        {isShowing && (
          <motion.div key="show" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center">
            <p className="text-[#8B5CF6] font-semibold">Memoriza el patrón</p>
            <p className="text-slate-500 text-sm">{countdown}s...</p>
          </motion.div>
        )}
        {isInput && (
          <motion.div key="input" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center">
            <p className="text-[#06B6D4] font-semibold">¡Reproduce el patrón!</p>
            <p className="text-slate-500 text-sm">{selected.length} / {pattern.length} seleccionadas</p>
          </motion.div>
        )}
        {isCorrect && (
          <motion.div key="correct" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center">
            <p className="text-green-400 font-bold text-lg">✓ ¡Correcto!</p>
          </motion.div>
        )}
        {isWrong && (
          <motion.div key="wrong" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center">
            <p className="text-red-400 font-bold text-lg">✗ Incorrecto</p>
            <p className="text-slate-500 text-sm">
              {attempts >= MAX_ATTEMPTS_PER_LEVEL ? 'Sin intentos restantes' : `${MAX_ATTEMPTS_PER_LEVEL - attempts} intento(s) restantes`}
            </p>
          </motion.div>
        )}
        {isLevelUp && (
          <motion.div key="levelup" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center">
            <p className="text-yellow-400 font-bold text-xl">🎉 ¡Nivel superado!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <motion.div
        key={`grid-${levelIndex}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18 }}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${level.size}, ${cellPx}px)`, gap: 8 }}
      >
        {Array.from({ length: totalCells }).map((_, idx) => {
          const style = cellStyle(idx)
          return (
            <motion.button
              key={idx}
              whileTap={isInput ? { scale: 0.88 } : {}}
              onClick={() => handleCellClick(idx)}
              disabled={!isInput}
              style={{
                width: cellPx,
                height: cellPx,
                background: style.bg,
                boxShadow: style.shadow,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'background 0.2s, box-shadow 0.2s',
                cursor: isInput ? 'pointer' : 'default',
              }}
            />
          )
        })}
      </motion.div>

      {/* Progreso de niveles */}
      <div className="flex gap-1.5">
        {LEVELS.map((_, i) => {
          const res = levelResults.find(r => r.level === i + 1)
          return (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                background: res ? (res.correct ? '#84CC16' : '#EF4444') : i === levelIndex ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                boxShadow: i === levelIndex ? '0 0 8px rgba(139,92,246,0.6)' : 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
