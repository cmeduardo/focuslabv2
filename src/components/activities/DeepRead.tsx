'use client'

// Deep Read — lectura con tracking de comportamiento y quiz de comprensión
// Mide comprensión lectora, patrones de lectura y atención durante la lectura
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, BookOpen, Clock, RotateCcw, ArrowRight } from 'lucide-react'
import { useEventTracker } from '@/hooks/useEventTracker'
import { saveActivityResult } from '@/lib/activities/saveResult'
import type { DeepReadMetrics } from '@/types/activities'
import { cn } from '@/lib/utils'

// ── Contenido de los artículos ────────────────────────────────────────────────

interface QuizQuestion {
  question: string
  options: string[]
  correctIdx: number
  type: 'detail' | 'inference'
}

interface Article {
  title: string
  paragraphs: string[]
  questions: QuizQuestion[]
}

const ARTICLES: Article[] = [
  {
    title: 'El Cerebro en la Era Digital',
    paragraphs: [
      'Los científicos del comportamiento llevan décadas estudiando cómo procesamos la información. Uno de los hallazgos más sorprendentes de la última década es que el cerebro humano no está diseñado para realizar múltiples tareas simultáneamente; en cambio, lo que hacemos realmente se llama task-switching: cambiar rápidamente entre tareas, con un costo cognitivo en cada transición.',
      'Un estudio de la Universidad de California encontró que después de una interrupción, el cerebro tarda en promedio 23 minutos en recuperar el mismo nivel de concentración. Esto explica por qué las notificaciones del teléfono pueden ser tan dañinas para la productividad: cada ping no solo consume los segundos que tardamos en revisarlo, sino que fragmenta bloques enteros de pensamiento profundo.',
      'La técnica Pomodoro, desarrollada en los años 80 por Francesco Cirillo, aprovecha este conocimiento. Al dividir el trabajo en bloques de 25 minutos seguidos de descansos breves, ayuda al cerebro a entrar en un estado de flujo sin agotar los recursos atencionales. La clave está en proteger esos bloques de cualquier interrupción externa.',
      'Los investigadores también han documentado un fenómeno llamado vigilance decrement: la tendencia natural del cerebro a reducir la atención sostenida después de 20 a 30 minutos de tareas repetitivas. Paradójicamente, los breves descansos no debilitan la concentración, sino que la restauran, permitiendo un rendimiento sostenido durante períodos mucho más largos.',
      'El movimiento del deep work, popularizado por Cal Newport, propone reservar bloques de tiempo sin interrupciones para el trabajo cognitivo más exigente. Sus investigaciones sugieren que quienes practican este tipo de concentración profunda producen resultados de mayor calidad y lo hacen en menos tiempo total que quienes trabajan en modo multitarea constante.',
    ],
    questions: [
      {
        question: '¿Cuánto tiempo tarda el cerebro en recuperar la concentración tras una interrupción?',
        options: ['5 minutos', '23 minutos', '1 hora', '10 minutos'],
        correctIdx: 1,
        type: 'detail',
      },
      {
        question: '¿En qué década se desarrolló la técnica Pomodoro?',
        options: ['1970s', '1990s', '1980s', '2000s'],
        correctIdx: 2,
        type: 'detail',
      },
      {
        question: '¿Cuánto duran los bloques de trabajo en la técnica Pomodoro?',
        options: ['15 minutos', '30 minutos', '45 minutos', '25 minutos'],
        correctIdx: 3,
        type: 'detail',
      },
      {
        question: '¿Cuál es la implicación principal de que el cerebro hace task-switching en lugar de multitarea real?',
        options: [
          'Las personas son más inteligentes de lo que se cree',
          'Hacer muchas tareas a la vez es menos eficiente de lo que parece',
          'Las interrupciones no afectan el trabajo',
          'Los teléfonos son necesarios para la productividad',
        ],
        correctIdx: 1,
        type: 'inference',
      },
      {
        question: 'Según el texto, ¿por qué los descansos breves mejoran la concentración?',
        options: [
          'Porque permiten revisar el teléfono',
          'Porque reducen el esfuerzo total requerido',
          'Porque restauran los recursos atencionales que se agotan',
          'Porque aumentan la velocidad del pensamiento',
        ],
        correctIdx: 2,
        type: 'inference',
      },
    ],
  },
  {
    title: 'La Ciencia del Estado de Flujo',
    paragraphs: [
      'El psicólogo Mihály Csíkszentmihályi describió por primera vez el estado de flujo en la década de 1970 como una experiencia de completa absorción en una actividad. Durante el flujo, el tiempo parece distorsionarse, la autoconciencia desaparece y el rendimiento alcanza su pico máximo. Csíkszentmihályi entrevistó a miles de personas en todo el mundo y descubrió que este estado es universal, presente en músicos, atletas, cirujanos y programadores por igual.',
      'Para que el flujo ocurra, deben darse tres condiciones clave: la tarea debe tener objetivos claros, debe ofrecer retroalimentación inmediata sobre el progreso, y el nivel de desafío debe estar calibrado justo por encima de las habilidades actuales de la persona. Si la tarea es demasiado fácil, produce aburrimiento; si es demasiado difícil, genera ansiedad.',
      'Desde el punto de vista neurológico, el flujo se asocia con una reducción de la actividad en la corteza prefrontal, la región responsable del juicio crítico y la autoconsciencia. Esto explica la sensación de "desconectar el crítico interno" que muchas personas reportan durante el flujo. Al mismo tiempo, aumenta la liberación de dopamina, norepinefrina y endorfinas, creando una experiencia intrínsecamente motivadora.',
      'Los videojuegos bien diseñados son maestros del flujo: ajustan constantemente la dificultad para mantener al jugador en esa zona óptima entre el desafío y la habilidad. Los juegos más adictivos no son necesariamente los más fáciles, sino los que mantienen ese equilibrio con mayor precisión. Esta es una de las razones por las que los investigadores de productividad estudian el diseño de videojuegos.',
      'Provocar el flujo deliberadamente requiere práctica. Los profesionales lo hacen creando rituales de entrada: un lugar específico, una música particular, eliminar distracciones. Con el tiempo, estos rituales actúan como señales que le indican al cerebro que es momento de concentrarse profundamente. La neurociencia sugiere que estos hábitos fortalecen las conexiones neurales asociadas con la concentración.',
    ],
    questions: [
      {
        question: '¿Quién describió por primera vez el estado de flujo?',
        options: ['Cal Newport', 'Francesco Cirillo', 'Mihály Csíkszentmihályi', 'William James'],
        correctIdx: 2,
        type: 'detail',
      },
      {
        question: '¿Qué ocurre a nivel neurológico durante el flujo?',
        options: [
          'Aumenta la actividad prefrontal',
          'Se reduce la actividad en la corteza prefrontal',
          'Disminuye la dopamina',
          'El cerebro entra en modo de descanso',
        ],
        correctIdx: 1,
        type: 'detail',
      },
      {
        question: '¿Cuál de estas NO es una condición necesaria para el flujo según el texto?',
        options: [
          'Objetivos claros',
          'Retroalimentación inmediata',
          'Trabajo en equipo',
          'Desafío calibrado a las habilidades',
        ],
        correctIdx: 2,
        type: 'detail',
      },
      {
        question: '¿Por qué el texto menciona los videojuegos como "maestros del flujo"?',
        options: [
          'Porque son fáciles de jugar',
          'Porque ajustan la dificultad para mantener el equilibrio reto-habilidad',
          'Porque generan adicción química',
          'Porque no requieren concentración',
        ],
        correctIdx: 1,
        type: 'inference',
      },
      {
        question: 'Según el texto, ¿qué función cumplen los rituales de entrada para el trabajo profundo?',
        options: [
          'Reducen el estrés laboral',
          'Actúan como señales que preparan al cerebro para concentrarse',
          'Aumentan la velocidad de lectura',
          'Eliminan la necesidad de descansos',
        ],
        correctIdx: 1,
        type: 'inference',
      },
    ],
  },
]

// ── Tipos ────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'reading' | 'quiz' | 'results'

// ── Componente principal ──────────────────────────────────────────────────────

export default function DeepRead() {
  const { track, sessionId } = useEventTracker()
  const [phase, setPhase] = useState<Phase>('intro')
  const [article, setArticle] = useState<Article>(ARTICLES[0])
  const [questionIdx, setQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [allRead, setAllRead] = useState(false)

  // Tracking de lectura
  const readingStartRef = useRef<number>(0)
  const paragraphEnterRef = useRef<number[]>([])      // timestamps de cuando entró cada párrafo
  const paragraphTimeRef  = useRef<number[]>([])      // ms acumulados por párrafo
  const reReadsRef        = useRef<number>(0)
  const lastScrollYRef    = useRef<number>(0)
  const scrollSpeedSumRef = useRef<number>(0)
  const scrollEventsRef   = useRef<number>(0)
  const paragraphsSeenRef = useRef<Set<number>>(new Set())
  const startedAtRef      = useRef<number>(Date.now())

  const containerRef = useRef<HTMLDivElement>(null)
  const paraRefs     = useRef<(HTMLDivElement | null)[]>([])
  const answersRef   = useRef<(number | null)[]>([])

  useEffect(() => { answersRef.current = answers }, [answers])

  // IntersectionObserver para tracking de tiempo por párrafo
  useEffect(() => {
    if (phase !== 'reading') return

    const n = article.paragraphs.length
    paragraphEnterRef.current = Array(n).fill(0)
    paragraphTimeRef.current  = Array(n).fill(0)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = parseInt(entry.target.getAttribute('data-para-idx') ?? '-1')
          if (idx < 0) return
          if (entry.isIntersecting) {
            paragraphEnterRef.current[idx] = Date.now()
            // Re-lectura: si ya había sido visto antes
            if (paragraphsSeenRef.current.has(idx)) {
              reReadsRef.current += 1
            }
            paragraphsSeenRef.current.add(idx)
          } else if (paragraphEnterRef.current[idx] > 0) {
            paragraphTimeRef.current[idx] += Date.now() - paragraphEnterRef.current[idx]
            paragraphEnterRef.current[idx] = 0
          }
        })
        // Marcar como leído todo si todos los párrafos han sido vistos
        if (paragraphsSeenRef.current.size === n) {
          setAllRead(true)
        }
      },
      { threshold: 0.5 }
    )

    paraRefs.current.forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [phase, article.paragraphs.length])

  // Tracking de scroll (velocidad y re-reads)
  useEffect(() => {
    if (phase !== 'reading') return
    const container = containerRef.current
    if (!container) return

    const onScroll = () => {
      const y = container.scrollTop
      const delta = Math.abs(y - lastScrollYRef.current)
      scrollSpeedSumRef.current += delta
      scrollEventsRef.current += 1
      lastScrollYRef.current = y
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [phase])

  const handleStartReading = () => {
    const chosen = ARTICLES[Math.floor(Math.random() * ARTICLES.length)]
    setArticle(chosen)
    paragraphsSeenRef.current = new Set()
    reReadsRef.current = 0
    scrollSpeedSumRef.current = 0
    scrollEventsRef.current = 0
    readingStartRef.current = Date.now()
    startedAtRef.current = Date.now()
    setAllRead(false)
    track({ event_type: 'activity_start', category: 'activity', metadata: { activity_type: 'deep_read' } })
    setPhase('reading')
  }

  const handleStartQuiz = () => {
    // Guardar tiempos finales de párrafos aún visibles
    const n = article.paragraphs.length
    for (let i = 0; i < n; i++) {
      if (paragraphEnterRef.current[i] > 0) {
        paragraphTimeRef.current[i] += Date.now() - paragraphEnterRef.current[i]
        paragraphEnterRef.current[i] = 0
      }
    }
    setAnswers(Array(article.questions.length).fill(null))
    setQuestionIdx(0)
    setSelectedOption(null)
    setShowAnswer(false)
    setPhase('quiz')
  }

  const handleSelectOption = (optIdx: number) => {
    if (showAnswer) return
    setSelectedOption(optIdx)
    setShowAnswer(true)

    const q = article.questions[questionIdx]
    const correct = optIdx === q.correctIdx
    track({
      event_type: 'activity_response',
      category: 'activity',
      metadata: { question: questionIdx + 1, correct, type: q.type },
    })

    setAnswers(prev => {
      const updated = [...prev]
      updated[questionIdx] = optIdx
      return updated
    })

    setTimeout(() => {
      if (questionIdx < article.questions.length - 1) {
        setQuestionIdx(qi => qi + 1)
        setSelectedOption(null)
        setShowAnswer(false)
      } else {
        setPhase('results')
      }
    }, 1200)
  }

  // Guardar resultados al llegar a la pantalla de resultados
  useEffect(() => {
    if (phase !== 'results') return
    const ans = answersRef.current
    if (ans.length === 0 || ans.every(a => a === null)) return

    const questions = article.questions
    const correct = ans.filter((a, i) => a === questions[i]?.correctIdx)
    const detailCorrect   = ans.filter((a, i) => questions[i]?.type === 'detail'    && a === questions[i]?.correctIdx).length
    const inferCorrect    = ans.filter((a, i) => questions[i]?.type === 'inference' && a === questions[i]?.correctIdx).length
    const comprehension   = Math.round((correct.length / questions.length) * 100)

    const paraMs = [...paragraphTimeRef.current]
    const avgScrollSpeed = scrollEventsRef.current > 0
      ? Math.round(scrollSpeedSumRef.current / scrollEventsRef.current)
      : 0

    const totalReadMs = Date.now() - readingStartRef.current
    const pattern = reReadsRef.current > 3
      ? 'non_linear_many_rereads'
      : reReadsRef.current > 0
      ? 'linear_with_rereads'
      : 'linear'

    const metrics: DeepReadMetrics = {
      total_reading_time_ms: totalReadMs,
      time_per_paragraph_ms: paraMs,
      re_reads: reReadsRef.current,
      scroll_speed_avg: avgScrollSpeed,
      comprehension_score: comprehension,
      detail_questions_correct: detailCorrect,
      inference_questions_correct: inferCorrect,
      reading_pattern: pattern,
    }

    const score = Math.round(comprehension * 0.7 + Math.min(30, (detailCorrect + inferCorrect) * 6))
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)

    track({ event_type: 'activity_complete', category: 'activity', metadata: { activity_type: 'deep_read', score, duration: durationSeconds, metrics } })

    setSaving(true)
    saveActivityResult({
      activity: 'deep_read',
      score,
      maxScore: 100,
      durationSeconds,
      metrics: metrics as unknown as Record<string, unknown>,
      sessionId: sessionId ?? undefined,
    })
      .catch(err => setSaveError(err instanceof Error ? err.message : 'Error al guardar'))
      .finally(() => setSaving(false))
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pantalla intro ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
          <div className="text-7xl mb-6">📖</div>
          <h1 className="text-3xl font-bold text-white mb-3">Deep Read</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Lee un artículo con atención. Luego responde <span className="text-white font-semibold">5 preguntas</span> de comprensión. El sistema mide cómo lees: velocidad, re-lecturas y tiempo por párrafo.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: '📄', label: '~300 palabras', sub: 'Lectura rápida' },
              { icon: '🧠', label: '5 preguntas', sub: 'Detalle + inferencia' },
              { icon: '📊', label: 'Tracking real', sub: 'Patrones de lectura' },
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
            onClick={handleStartReading}
            className="px-10 py-4 rounded-2xl text-white font-semibold text-lg"
            style={{ background: 'linear-gradient(135deg, #EC4899, #F59E0B)', boxShadow: '0 8px 32px rgba(236,72,153,0.35)' }}
          >
            Comenzar lectura
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ── Pantalla de lectura ─────────────────────────────────────────────────────
  if (phase === 'reading') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Header de lectura */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[#EC4899]" />
            <span className="text-white font-semibold">{article.title}</span>
          </div>
          <span className="text-slate-500 text-sm">
            {paragraphsSeenRef.current.size}/{article.paragraphs.length} párrafos
          </span>
        </div>

        {/* Indicador de progreso de párrafos */}
        <div className="flex gap-1 mb-6">
          {article.paragraphs.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{ background: paragraphsSeenRef.current.has(i) ? '#EC4899' : 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </div>

        {/* Texto principal — scrollable */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto pr-2 space-y-6"
          style={{ maxHeight: '55vh' }}
        >
          {article.paragraphs.map((para, i) => (
            <motion.div
              key={i}
              ref={(el) => { paraRefs.current[i] = el }}
              data-para-idx={String(i)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="text-slate-200 leading-relaxed text-base"
              style={{ lineHeight: 1.85 }}
            >
              {para}
            </motion.div>
          ))}
          {/* Espaciado extra al final para poder ver el último párrafo */}
          <div className="h-8" />
        </div>

        {/* Botón continuar al quiz */}
        <AnimatePresence>
          {allRead && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <p className="text-slate-400 text-sm mb-4">
                ¡Terminaste de leer! ¿Listo para el quiz?
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleStartQuiz}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #EC4899, #F59E0B)' }}
              >
                Ir al quiz
                <ArrowRight size={18} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint si no ha leído todo */}
        {!allRead && (
          <p className="text-slate-600 text-xs text-center mt-4">
            ↓ Desplázate para leer todo el artículo
          </p>
        )}
      </div>
    )
  }

  // ── Pantalla de quiz ────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = article.questions[questionIdx]
    const progress = ((questionIdx) / article.questions.length) * 100

    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Barra de progreso del quiz */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Pregunta {questionIdx + 1} de {article.questions.length}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-xs', q.type === 'detail' ? 'bg-[#06B6D4]/10 text-[#06B6D4]' : 'bg-[#8B5CF6]/10 text-[#8B5CF6]')}>
              {q.type === 'detail' ? 'Detalle' : 'Inferencia'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${progress}%` }}
              style={{ background: 'linear-gradient(90deg, #EC4899, #F59E0B)' }}
            />
          </div>
        </div>

        {/* Pregunta */}
        <AnimatePresence mode="wait">
          <motion.div
            key={questionIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-white text-lg font-semibold leading-snug mb-6">
              {q.question}
            </h2>

            {/* Opciones */}
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const isSelected = selectedOption === i
                const isCorrect  = i === q.correctIdx
                let bg = 'bg-white/5 border-white/10 text-slate-300'

                if (showAnswer) {
                  if (isCorrect) bg = 'bg-green-500/20 border-green-500/40 text-green-300'
                  else if (isSelected && !isCorrect) bg = 'bg-red-500/20 border-red-500/40 text-red-300'
                  else bg = 'bg-white/3 border-white/5 text-slate-600'
                } else if (isSelected) {
                  bg = 'bg-[#EC4899]/15 border-[#EC4899]/35 text-white'
                }

                return (
                  <motion.button
                    key={i}
                    whileTap={!showAnswer ? { scale: 0.98 } : {}}
                    onClick={() => handleSelectOption(i)}
                    disabled={showAnswer}
                    className={cn(
                      'w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 text-sm flex items-center gap-3',
                      bg
                    )}
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold"
                      style={{ borderColor: 'currentColor' }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {showAnswer && isCorrect && <CheckCircle size={16} className="shrink-0 text-green-400" />}
                    {showAnswer && isSelected && !isCorrect && <XCircle size={16} className="shrink-0 text-red-400" />}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  // ── Pantalla de resultados ──────────────────────────────────────────────────
  const totalQuestions = article.questions.length
  const correctCount   = answers.filter((a, i) => a === article.questions[i]?.correctIdx).length
  const detailCorrect  = answers.filter((a, i) => article.questions[i]?.type === 'detail' && a === article.questions[i]?.correctIdx).length
  const inferCorrect   = answers.filter((a, i) => article.questions[i]?.type === 'inference' && a === article.questions[i]?.correctIdx).length
  const comprehension  = Math.round((correctCount / totalQuestions) * 100)
  const score          = Math.round(comprehension * 0.7 + Math.min(30, (detailCorrect + inferCorrect) * 6))
  const readingMinutes = Math.round((Date.now() - readingStartRef.current) / 60000)

  const patternLabel: Record<string, string> = {
    linear: 'Lectura lineal',
    linear_with_rereads: 'Lineal con re-lecturas',
    non_linear_many_rereads: 'No lineal — muchas re-lecturas',
  }
  const pattern = reReadsRef.current > 3 ? 'non_linear_many_rereads'
    : reReadsRef.current > 0 ? 'linear_with_rereads' : 'linear'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Score */}
      <div className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, delay: 0.1 }}>
          <div className="text-8xl font-bold bg-gradient-to-r from-[#EC4899] to-[#F59E0B] bg-clip-text text-transparent">{score}</div>
          <div className="text-slate-400 text-sm mt-1">/ 100 puntos</div>
        </motion.div>
        <h2 className="text-2xl font-bold text-white mt-3">
          {score >= 85 ? '📚 Lector experto' : score >= 65 ? '🎯 Buena comprensión' : '📖 Sigue practicando'}
        </h2>
        {saving && <p className="text-slate-500 text-xs mt-2">Guardando resultados...</p>}
        {saveError && <p className="text-red-400 text-xs mt-2">{saveError}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '📊', label: 'Comprensión', value: `${comprehension}%` },
          { icon: '🔍', label: 'Detalle',     value: `${detailCorrect}/3` },
          { icon: '💡', label: 'Inferencia',  value: `${inferCorrect}/2` },
          { icon: '🔄', label: 'Re-lecturas', value: String(reReadsRef.current) },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-slate-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revisión de respuestas */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
        <h3 className="text-white font-semibold mb-4">Revisión de respuestas</h3>
        {article.questions.map((q, i) => {
          const userAns = answers[i]
          const correct = userAns === q.correctIdx
          return (
            <div key={i} className="flex gap-3 items-start">
              <div className="shrink-0 mt-0.5">
                {correct
                  ? <CheckCircle size={16} className="text-green-400" />
                  : <XCircle size={16} className="text-red-400" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-300 leading-snug">{q.question}</p>
                {!correct && userAns !== null && (
                  <p className="text-xs text-red-400 mt-0.5">Tu respuesta: {q.options[userAns]}</p>
                )}
                {!correct && (
                  <p className="text-xs text-green-400 mt-0.5">Correcta: {q.options[q.correctIdx]}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Patrón de lectura */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <h3 className="text-white font-semibold mb-3">Patrón de lectura detectado</h3>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{pattern === 'linear' ? '➡️' : pattern === 'linear_with_rereads' ? '↩️' : '🔀'}</span>
          <div>
            <p className="text-white font-medium">{patternLabel[pattern]}</p>
            <p className="text-slate-500 text-sm mt-0.5">
              {reReadsRef.current === 0
                ? 'Lectura de una sola pasada — muy eficiente'
                : `${reReadsRef.current} re-lectura${reReadsRef.current > 1 ? 's' : ''} detectada${reReadsRef.current > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setPhase('intro'); setAnswers([]) }}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-medium"
          style={{ background: 'linear-gradient(135deg, #EC4899, #F59E0B)' }}
        >
          <RotateCcw size={16} />
          Leer otro artículo
        </motion.button>
      </div>
    </motion.div>
  )
}
