'use client'

// Word Sprint — clasifica palabras en 60 segundos
// Mide velocidad de procesamiento cognitivo y atención selectiva
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Zap, TrendingUp, Brain, Target } from 'lucide-react'
import { useEventTracker } from '@/hooks/useEventTracker'
import { saveActivityResult } from '@/lib/activities/saveResult'
import type { WordSprintMetrics } from '@/types/activities'
import { cn } from '@/lib/utils'

// ── Datos ────────────────────────────────────────────────────────────────────

interface Word {
  text: string
  isAnimal: boolean
  difficulty: 'easy' | 'medium' | 'hard'
  isTrap: boolean
}

const WORD_LIST: Word[] = [
  // Fácil — animales obvios
  { text: 'Perro',        isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Gato',         isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Tigre',        isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'León',         isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Águila',       isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Elefante',     isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Delfín',       isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Caballo',      isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Oso',          isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Tortuga',      isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Pingüino',     isAnimal: true,  difficulty: 'easy',   isTrap: false },
  { text: 'Lobo',         isAnimal: true,  difficulty: 'easy',   isTrap: false },
  // Fácil — no animales obvios
  { text: 'Mesa',         isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Silla',        isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Libro',        isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Nube',         isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Río',          isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Montaña',      isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Ciudad',       isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Música',       isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Reloj',        isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Planeta',      isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Carro',        isAnimal: false, difficulty: 'easy',   isTrap: false },
  { text: 'Computadora',  isAnimal: false, difficulty: 'easy',   isTrap: false },
  // Medio — animales menos obvios
  { text: 'Esponja',      isAnimal: true,  difficulty: 'medium', isTrap: true  },
  { text: 'Coral',        isAnimal: true,  difficulty: 'medium', isTrap: true  },
  { text: 'Caracol',      isAnimal: true,  difficulty: 'medium', isTrap: false },
  { text: 'Lombriz',      isAnimal: true,  difficulty: 'medium', isTrap: false },
  { text: 'Medusa',       isAnimal: true,  difficulty: 'medium', isTrap: false },
  { text: 'Cangrejo',     isAnimal: true,  difficulty: 'medium', isTrap: false },
  { text: 'Pulpo',        isAnimal: true,  difficulty: 'medium', isTrap: false },
  { text: 'Erizo',        isAnimal: true,  difficulty: 'medium', isTrap: false },
  // Medio — no animales que parecen serlo
  { text: 'Hongo',        isAnimal: false, difficulty: 'medium', isTrap: true  },
  { text: 'Alga',         isAnimal: false, difficulty: 'medium', isTrap: true  },
  { text: 'Árbol',        isAnimal: false, difficulty: 'medium', isTrap: true  },
  { text: 'Musgo',        isAnimal: false, difficulty: 'medium', isTrap: true  },
  { text: 'Cactus',       isAnimal: false, difficulty: 'medium', isTrap: false },
  { text: 'Helecho',      isAnimal: false, difficulty: 'medium', isTrap: false },
  { text: 'Planta',       isAnimal: false, difficulty: 'medium', isTrap: false },
  // Difícil — trampas semánticas
  { text: 'Pez espada',         isAnimal: true,  difficulty: 'hard', isTrap: true  },
  { text: 'Estrella de mar',    isAnimal: true,  difficulty: 'hard', isTrap: true  },
  { text: 'Caballito de mar',   isAnimal: true,  difficulty: 'hard', isTrap: true  },
  { text: 'Gusano de seda',     isAnimal: true,  difficulty: 'hard', isTrap: false },
  { text: 'Mosca de mayo',      isAnimal: true,  difficulty: 'hard', isTrap: false },
  { text: 'Virus',              isAnimal: false, difficulty: 'hard', isTrap: true  },
  { text: 'Bacteria',           isAnimal: false, difficulty: 'hard', isTrap: true  },
  { text: 'Levadura',           isAnimal: false, difficulty: 'hard', isTrap: true  },
  { text: 'Enzima',             isAnimal: false, difficulty: 'hard', isTrap: false },
  { text: 'Glucosa',            isAnimal: false, difficulty: 'hard', isTrap: false },
  { text: 'Proteína',           isAnimal: false, difficulty: 'hard', isTrap: false },
]

// Baraja usando Fisher-Yates
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Tiempo por palabra (ms) según cuántas palabras lleva
function wordTimeout(count: number): number {
  if (count < 10) return 2500
  if (count < 20) return 2000
  return 1500
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Decision {
  word: string
  isAnimal: boolean
  userAnswer: boolean | null  // null = perdido (timeout)
  correct: boolean
  decisionTimeMs: number
  difficulty: 'easy' | 'medium' | 'hard'
  isTrap: boolean
}

type Phase = 'intro' | 'playing' | 'results'
type Feedback = 'correct' | 'incorrect' | 'missed' | null

// ── Cálculo de métricas ──────────────────────────────────────────────────────

function calcMetrics(decisions: Decision[]): WordSprintMetrics {
  const answered = decisions.filter(d => d.userAnswer !== null)
  const correct = answered.filter(d => d.correct)
  const incorrect = answered.filter(d => !d.correct)
  const missed = decisions.filter(d => d.userAnswer === null)

  const avgDecisionMs = answered.length > 0
    ? Math.round(answered.reduce((s, d) => s + d.decisionTimeMs, 0) / answered.length)
    : 0

  const accuracyPct = answered.length > 0
    ? Math.round((correct.length / answered.length) * 100)
    : 0

  // Detectar efecto stroop: las trampas tienen peor accuracy que no-trampas
  const traps = decisions.filter(d => d.isTrap && d.userAnswer !== null)
  const nonTraps = decisions.filter(d => !d.isTrap && d.difficulty !== 'easy' && d.userAnswer !== null)
  const trapAcc = traps.length > 0 ? traps.filter(d => d.correct).length / traps.length : 1
  const nonTrapAcc = nonTraps.length > 0 ? nonTraps.filter(d => d.correct).length / nonTraps.length : 1
  const stroopDetected = traps.length >= 3 && trapAcc < nonTrapAcc - 0.15

  // Speed-accuracy tradeoff: promedio ponderado de velocidad y accuracy
  const maxMs = wordTimeout(0)
  const speedScore = avgDecisionMs > 0 ? Math.max(0, 1 - avgDecisionMs / maxMs) : 0
  const sat = Math.round(((speedScore + accuracyPct / 100) / 2) * 100) / 100

  // Accuracy por dificultad
  const byDiff = (['easy', 'medium', 'hard'] as const).reduce<Record<string, number>>((acc, diff) => {
    const group = decisions.filter(d => d.difficulty === diff && d.userAnswer !== null)
    acc[diff] = group.length > 0 ? Math.round(group.filter(d => d.correct).length / group.length * 100) : 0
    return acc
  }, {})

  return {
    total_words: decisions.length,
    correct: correct.length,
    incorrect: incorrect.length,
    missed: missed.length,
    accuracy_percent: accuracyPct,
    avg_decision_time_ms: avgDecisionMs,
    stroop_effect_detected: stroopDetected,
    speed_accuracy_tradeoff: sat,
    performance_by_difficulty: byDiff,
  }
}

function calcScore(decisions: Decision[]): number {
  const answered = decisions.filter(d => d.userAnswer !== null)
  if (answered.length === 0) return 0
  const accuracy = answered.filter(d => d.correct).length / answered.length
  const volume = Math.min(decisions.length / 30, 1)  // bonus por muchas palabras
  return Math.round(accuracy * 70 + volume * 30)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function WordSprint() {
  const { track, sessionId } = useEventTracker()
  const [phase, setPhase] = useState<Phase>('intro')
  const [words, setWords] = useState<Word[]>([])
  const [wordIdx, setWordIdx] = useState(0)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [gameTimer, setGameTimer] = useState(60)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [streak, setStreak] = useState(0)
  const [exitDir, setExitDir] = useState<'left' | 'right' | 'up'>('up')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const wordStartRef = useRef<number>(0)
  const answeredRef = useRef(false)
  const wordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(Date.now())
  const decisionsRef = useRef<Decision[]>([])

  // Mantener ref sincronizado con state para acceso en callbacks
  useEffect(() => { decisionsRef.current = decisions }, [decisions])

  const clearWordTimer = useCallback(() => {
    if (wordTimerRef.current) { clearTimeout(wordTimerRef.current); wordTimerRef.current = null }
  }, [])

  // Avanza a la siguiente palabra o termina el juego
  const nextWord = useCallback((idx: number, currentWords: Word[]) => {
    answeredRef.current = false
    wordStartRef.current = Date.now()
    setFeedback(null)

    if (idx >= currentWords.length) {
      // Re-barajar si se agota el pool
      setWords(prev => {
        const reshuffled = [...prev, ...shuffle(WORD_LIST)]
        return reshuffled
      })
    }
  }, [])

  // Maneja una respuesta (animal=true, no-animal=false, null=timeout)
  const handleAnswer = useCallback((answer: boolean | null) => {
    if (answeredRef.current || phase !== 'playing') return
    answeredRef.current = true
    clearWordTimer()

    const currentWords = words
    const word = currentWords[wordIdx]
    if (!word) return

    const decisionMs = answer !== null ? Math.round(Date.now() - wordStartRef.current) : 0
    const correct = answer !== null && answer === word.isAnimal

    const decision: Decision = {
      word: word.text,
      isAnimal: word.isAnimal,
      userAnswer: answer,
      correct,
      decisionTimeMs: decisionMs,
      difficulty: word.difficulty,
      isTrap: word.isTrap,
    }

    setDecisions(prev => [...prev, decision])

    if (answer === null) {
      setFeedback('missed')
      setStreak(0)
    } else if (correct) {
      setFeedback('correct')
      setStreak(s => s + 1)
    } else {
      setFeedback('incorrect')
      setStreak(0)
    }

    if (answer !== null) {
      track({
        event_type: 'activity_response',
        category: 'activity',
        metadata: { word: word.text, correct, decision_ms: decisionMs, difficulty: word.difficulty },
      })
    }

    // Avanzar a la siguiente palabra tras breve pausa de feedback
    setTimeout(() => {
      const next = wordIdx + 1
      setWordIdx(next)
      nextWord(next, currentWords)
    }, 380)
  }, [phase, words, wordIdx, clearWordTimer, nextWord, track])

  // Temporizador por palabra (auto-miss al expirar)
  useEffect(() => {
    if (phase !== 'playing') return
    clearWordTimer()
    const ms = wordTimeout(wordIdx)
    wordTimerRef.current = setTimeout(() => {
      setExitDir('up')
      handleAnswer(null)
    }, ms)
    return clearWordTimer
  }, [wordIdx, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Temporizador global de 60 segundos
  useEffect(() => {
    if (phase !== 'playing') return
    gameIntervalRef.current = setInterval(() => {
      setGameTimer(t => {
        if (t <= 1) {
          clearInterval(gameIntervalRef.current!)
          clearWordTimer()
          setPhase('results')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (gameIntervalRef.current) clearInterval(gameIntervalRef.current) }
  }, [phase, clearWordTimer])

  // Guardar resultados al terminar
  useEffect(() => {
    if (phase !== 'results' || decisionsRef.current.length === 0) return
    const dec = decisionsRef.current
    const metrics = calcMetrics(dec)
    const score = calcScore(dec)
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)

    track({
      event_type: 'activity_complete',
      category: 'activity',
      metadata: { activity_type: 'word_sprint', score, duration: durationSeconds, metrics },
    })

    setSaving(true)
    saveActivityResult({
      activity: 'word_sprint',
      score,
      maxScore: 100,
      durationSeconds,
      metrics: metrics as unknown as Record<string, unknown>,
      sessionId: sessionId ?? undefined,
    })
      .catch(err => setSaveError(err instanceof Error ? err.message : 'Error al guardar'))
      .finally(() => setSaving(false))
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Soporte de teclado
  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  { setExitDir('left');  handleAnswer(true)  }
      if (e.key === 'ArrowRight') { setExitDir('right'); handleAnswer(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, handleAnswer])

  // Limpieza al desmontar
  useEffect(() => () => {
    clearWordTimer()
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current)
  }, [clearWordTimer])

  const handleStart = () => {
    const shuffled = shuffle(WORD_LIST)
    setWords(shuffled)
    setWordIdx(0)
    setDecisions([])
    setGameTimer(60)
    setStreak(0)
    setFeedback(null)
    startedAtRef.current = Date.now()
    track({ event_type: 'activity_start', category: 'activity', metadata: { activity_type: 'word_sprint' } })
    setPhase('playing')
    // Iniciar temporizador de palabra en el próximo tick
    wordStartRef.current = Date.now() + 50
  }

  // ── Pantalla intro ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
          <div className="text-7xl mb-6">💬</div>
          <h1 className="text-3xl font-bold text-white mb-3">Word Sprint</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Clasifica cada palabra como <span className="text-green-400 font-semibold">Animal</span> o <span className="text-pink-400 font-semibold">No es Animal</span> lo más rápido posible. Tienes <span className="text-white font-semibold">60 segundos</span>.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: '⏱️', label: '60 segundos', sub: 'Tiempo total' },
              { icon: '⚡', label: 'Más velocidad', sub: 'Con cada palabra' },
              { icon: '🧠', label: 'Trampas', sub: 'Palabras engañosas' },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Controles */}
          <div className="flex gap-3 mb-8">
            <div className="flex-1 rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center">
              <p className="text-green-400 font-semibold text-sm">← Tecla izquierda</p>
              <p className="text-slate-500 text-xs mt-0.5">o botón Animal</p>
            </div>
            <div className="flex-1 rounded-xl bg-pink-500/10 border border-pink-500/20 p-3 text-center">
              <p className="text-pink-400 font-semibold text-sm">Tecla derecha →</p>
              <p className="text-slate-500 text-xs mt-0.5">o botón No es Animal</p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="px-10 py-4 rounded-2xl text-white font-semibold text-lg"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #EC4899)', boxShadow: '0 8px 32px rgba(245,158,11,0.35)' }}
          >
            Comenzar
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ── Pantalla de resultados ──────────────────────────────────────────────────
  if (phase === 'results') {
    const metrics = calcMetrics(decisions)
    const score = calcScore(decisions)

    const chartData = [
      { diff: 'Fácil', correct: decisions.filter(d => d.difficulty === 'easy' && d.correct).length, incorrect: decisions.filter(d => d.difficulty === 'easy' && !d.correct && d.userAnswer !== null).length },
      { diff: 'Medio', correct: decisions.filter(d => d.difficulty === 'medium' && d.correct).length, incorrect: decisions.filter(d => d.difficulty === 'medium' && !d.correct && d.userAnswer !== null).length },
      { diff: 'Difícil', correct: decisions.filter(d => d.difficulty === 'hard' && d.correct).length, incorrect: decisions.filter(d => d.difficulty === 'hard' && !d.correct && d.userAnswer !== null).length },
    ]

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Score */}
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, delay: 0.1 }}>
            <div className="text-8xl font-bold bg-gradient-to-r from-[#F59E0B] to-[#EC4899] bg-clip-text text-transparent">{score}</div>
            <div className="text-slate-400 text-sm mt-1">/ 100 puntos</div>
          </motion.div>
          <h2 className="text-2xl font-bold text-white mt-3">
            {score >= 85 ? '🔥 Procesamiento élite' : score >= 65 ? '⚡ Buen rendimiento' : '💪 Sigue entrenando'}
          </h2>
          {metrics.stroop_effect_detected && (
            <p className="text-amber-400 text-sm mt-2">⚠️ Se detectó efecto Stroop — las trampas semánticas te afectaron</p>
          )}
          {saving && <p className="text-slate-500 text-xs mt-2">Guardando resultados...</p>}
          {saveError && <p className="text-red-400 text-xs mt-2">{saveError}</p>}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Brain size={18} className="text-[#F59E0B]" />,  label: 'Palabras',    value: String(metrics.total_words) },
            { icon: <Target size={18} className="text-green-400" />,  label: 'Correctas',   value: String(metrics.correct) },
            { icon: <Zap size={18} className="text-pink-400" />,      label: 'Perdidas',    value: String(metrics.missed) },
            { icon: <TrendingUp size={18} className="text-[#8B5CF6]" />, label: 'Precisión', value: `${metrics.accuracy_percent}%` },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <div className="flex justify-center mb-2">{s.icon}</div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-slate-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Gráfico por dificultad */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#F59E0B]" />
            Desempeño por dificultad
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <XAxis dataKey="diff" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Bar dataKey="correct" name="Correctas" fill="#84CC16" radius={[4, 4, 0, 0]} />
              <Bar dataKey="incorrect" name="Incorrectas" fill="#EC4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats extra */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-500 text-xs mb-1">Tiempo medio por decisión</p>
            <p className="text-white font-bold text-lg">{metrics.avg_decision_time_ms}ms</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Equilibrio velocidad/precisión</p>
            <p className="text-white font-bold text-lg">{(metrics.speed_accuracy_tradeoff * 100).toFixed(0)}%</p>
          </div>
        </div>

        <div className="text-center">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setPhase('intro'); setDecisions([]) }}
            className="px-8 py-3 rounded-xl text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #EC4899)' }}
          >
            Jugar de nuevo
          </motion.button>
        </div>
      </motion.div>
    )
  }

  // ── Pantalla de juego ───────────────────────────────────────────────────────
  const currentWord = words[wordIdx]
  const timerPct = (gameTimer / 60) * 100
  const wordMs = wordTimeout(wordIdx)

  const feedbackColors: Record<NonNullable<Feedback>, string> = {
    correct: 'rgba(132,204,22,0.15)',
    incorrect: 'rgba(239,68,68,0.15)',
    missed: 'rgba(245,158,11,0.1)',
  }

  return (
    <div
      className="fixed inset-0 flex flex-col select-none"
      style={{
        background: feedback ? feedbackColors[feedback] : '#0F0F1A',
        transition: 'background 0.2s ease',
      }}
    >
      {/* Top bar */}
      <div className="px-6 pt-5 pb-3 space-y-3">
        {/* Timer bar */}
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.8, ease: 'linear' }}
            style={{
              background: gameTimer > 20 ? 'linear-gradient(90deg, #F59E0B, #EC4899)' : '#EF4444',
            }}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400 font-mono">{gameTimer}s</span>
          <div className="flex items-center gap-1.5">
            {streak > 0 && (
              <motion.div
                key={streak}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30"
              >
                <span className="text-xs">🔥</span>
                <span className="text-orange-400 font-bold text-xs">{streak}</span>
              </motion.div>
            )}
          </div>
          <span className="text-slate-400 text-xs">{decisions.length} palabras</span>
        </div>
      </div>

      {/* Word area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {currentWord && (
            <motion.div
              key={wordIdx}
              initial={{ y: 25, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{
                x: exitDir === 'left' ? -60 : exitDir === 'right' ? 60 : 0,
                y: exitDir === 'up' ? -30 : 0,
                opacity: 0,
                scale: 0.85,
              }}
              transition={{ duration: 0.18 }}
              className="text-center"
            >
              {/* Dificultad */}
              <p className="text-xs font-medium mb-3 uppercase tracking-widest"
                style={{
                  color: currentWord.difficulty === 'easy' ? '#84CC16'
                    : currentWord.difficulty === 'medium' ? '#F59E0B' : '#EC4899'
                }}>
                {currentWord.difficulty === 'easy' ? 'fácil' : currentWord.difficulty === 'medium' ? 'medio' : 'difícil'}
              </p>

              <p className="text-6xl sm:text-7xl font-black text-white tracking-tight leading-tight">
                {currentWord.text}
              </p>

              {/* Barra de tiempo por palabra */}
              <div className="mt-6 h-1 w-48 mx-auto rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white/40"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: wordMs / 1000, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback flash */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              key={feedback}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-lg font-bold"
              style={{
                color: feedback === 'correct' ? '#84CC16' : feedback === 'incorrect' ? '#EF4444' : '#F59E0B',
              }}
            >
              {feedback === 'correct' ? '✓ Correcto' : feedback === 'incorrect' ? '✗ Incorrecto' : '⏱ Perdida'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Botones de respuesta */}
      <div className="px-4 pb-8 grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setExitDir('left'); handleAnswer(true) }}
          className="py-5 rounded-2xl font-bold text-lg text-white flex flex-col items-center gap-1"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.1))', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <span className="text-2xl">🐾</span>
          <span className="text-green-400 text-sm">Animal</span>
          <span className="text-slate-600 text-xs">← Flecha izq</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setExitDir('right'); handleAnswer(false) }}
          className="py-5 rounded-2xl font-bold text-lg text-white flex flex-col items-center gap-1"
          style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(236,72,153,0.1))', border: '1px solid rgba(236,72,153,0.3)' }}
        >
          <span className="text-2xl">🚫</span>
          <span className="text-pink-400 text-sm">No es Animal</span>
          <span className="text-slate-600 text-xs">Flecha der →</span>
        </motion.button>
      </div>
    </div>
  )
}
