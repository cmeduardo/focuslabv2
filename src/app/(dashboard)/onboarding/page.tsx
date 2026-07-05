'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/useAuthStore'

// Opciones de universidad, carrera y semestre
const UNIVERSIDADES = [
  'USAC', 'URL', 'UVG', 'UFM', 'UNIS', 'USEMI', 'Galileo', 'Mariano Gálvez', 'Otra',
]

const CARRERAS = [
  'Ingeniería en Sistemas',
  'Ingeniería en Ciencias y Sistemas',
  'Ciencias de la Computación',
  'Ingeniería Industrial',
  'Administración de Empresas',
  'Psicología',
  'Medicina',
  'Derecho',
  'Arquitectura',
  'Diseño Gráfico',
  'Comunicación',
  'Otra',
]

const TIMEZONES = [
  { value: 'America/Guatemala', label: 'Guatemala (UTC-6)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
  { value: 'America/Lima', label: 'Lima (UTC-5)' },
  { value: 'America/Santiago', label: 'Santiago (UTC-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'America/New_York', label: 'Nueva York (UTC-5)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1)' },
]

// Animación para las slides del wizard
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    fullName: '',
    university: '',
    universityCustom: '',
    career: '',
    careerCustom: '',
    semester: '1',
    timezone: 'America/Guatemala',
  })

  const totalSteps = 3

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function goNext() {
    setDirection(1)
    setStep(s => s + 1)
  }

  function goBack() {
    setDirection(-1)
    setStep(s => s - 1)
  }

  async function handleFinish() {
    if (!user) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.fullName || undefined,
        university: form.university === 'Otra' ? form.universityCustom : form.university,
        career: form.career === 'Otra' ? form.careerCustom : form.career,
        semester: parseInt(form.semester),
        timezone: form.timezone,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      setError('No se pudo guardar la información. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  // Validación por paso
  const canProceed = [
    form.fullName.trim().length >= 2,
    form.university.length > 0 && form.career.length > 0,
    true, // último paso siempre puede continuar
  ]

  const steps = [
    {
      title: '¿Cómo te llamas?',
      subtitle: 'Personalizamos tu experiencia con tu nombre.',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={e => update('fullName', e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors text-lg"
              placeholder="Tu nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Zona horaria
            </label>
            <select
              value={form.timezone}
              onChange={e => update('timezone', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value} className="bg-[#1A1A2E]">
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ),
    },
    {
      title: '¿Dónde estudias?',
      subtitle: 'Esto nos ayuda a contextualizar tu perfil atencional.',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Universidad
            </label>
            <select
              value={form.university}
              onChange={e => update('university', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
            >
              <option value="" className="bg-[#1A1A2E]">Selecciona tu universidad</option>
              {UNIVERSIDADES.map(u => (
                <option key={u} value={u} className="bg-[#1A1A2E]">{u}</option>
              ))}
            </select>
            {form.university === 'Otra' && (
              <input
                type="text"
                value={form.universityCustom}
                onChange={e => update('universityCustom', e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
                placeholder="Nombre de tu universidad"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Carrera
            </label>
            <select
              value={form.career}
              onChange={e => update('career', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
            >
              <option value="" className="bg-[#1A1A2E]">Selecciona tu carrera</option>
              {CARRERAS.map(c => (
                <option key={c} value={c} className="bg-[#1A1A2E]">{c}</option>
              ))}
            </select>
            {form.career === 'Otra' && (
              <input
                type="text"
                value={form.careerCustom}
                onChange={e => update('careerCustom', e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
                placeholder="Nombre de tu carrera"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Semestre actual
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => String(i + 1)).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update('semester', s)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    form.semester === s
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '¡Todo listo!',
      subtitle: 'Tu perfil está configurado. Empieza explorando FocusLab.',
      content: (
        <div className="space-y-4">
          {/* Resumen del perfil */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center text-white font-bold text-lg">
                {(form.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{form.fullName || 'Usuario'}</p>
                <p className="text-slate-400 text-sm">
                  {form.career === 'Otra' ? form.careerCustom : form.career || 'Sin carrera'}
                  {' · '}
                  {form.university === 'Otra' ? form.universityCustom : form.university || 'Sin universidad'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-white/10">
              <span className="text-sm text-slate-400">
                📚 Semestre {form.semester}
              </span>
              <span className="text-sm text-slate-400">
                🌍 {TIMEZONES.find(t => t.value === form.timezone)?.label}
              </span>
            </div>
          </div>

          {/* Sugerencias de inicio */}
          <div className="space-y-2">
            {[
              { emoji: '🍅', text: 'Prueba el Pomodoro Timer para tu primera sesión de estudio' },
              { emoji: '⚡', text: 'Haz el Reaction Test para calibrar tu línea base' },
              { emoji: '📊', text: 'Después de una semana, genera tu primer reporte' },
            ].map((tip, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-lg">{tip.emoji}</span>
                <p className="text-slate-300 text-sm">{tip.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo + progreso */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent mb-6">
            FocusLab
          </h1>
          {/* Barra de progreso */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= step
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]'
                    : 'bg-white/10'
                }`}
                style={{ width: i === step ? '2.5rem' : '1rem' }}
              />
            ))}
          </div>
          <p className="text-slate-500 text-xs">Paso {step + 1} de {totalSteps}</p>
        </div>

        {/* Card del wizard */}
        <div className="glass-card rounded-2xl p-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {/* Header del paso */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {steps[step].title}
                </h2>
                <p className="text-slate-400 text-sm">{steps[step].subtitle}</p>
              </div>

              {/* Contenido del paso */}
              {steps[step].content}
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Navegación */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={goBack}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:border-white/20 transition-colors"
              >
                Atrás
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps - 1 ? (
              <button
                onClick={goNext}
                disabled={!canProceed[step]}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Continuar →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Guardando...' : '¡Empezar! 🚀'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
