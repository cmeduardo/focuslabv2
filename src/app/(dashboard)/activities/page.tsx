'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

// Metadatos de cada actividad
const ACTIVITIES = [
  {
    slug: 'reaction-test',
    emoji: '⚡',
    name: 'Reaction Test',
    tagline: 'Tiempo de reacción y control inhibitorio',
    duration: '~3 min',
    difficulty: 'Fácil',
    gradient: 'from-[#8B5CF6] to-[#06B6D4]',
    glow: 'rgba(139,92,246,0.3)',
    tags: ['Go/No-Go', '20 rondas', 'Velocidad'],
    available: true,
  },
  {
    slug: 'focus-flow',
    emoji: '🎯',
    name: 'Focus Flow',
    tagline: 'Atención sostenida siguiendo una partícula',
    duration: '2 min',
    difficulty: 'Medio',
    gradient: 'from-[#06B6D4] to-[#84CC16]',
    glow: 'rgba(6,182,212,0.3)',
    tags: ['Cursor tracking', '2 minutos', 'Concentración'],
    available: true,
  },
  {
    slug: 'memory-matrix',
    emoji: '🧩',
    name: 'Memory Matrix',
    tagline: 'Memoriza y reproduce patrones en grid',
    duration: '~5 min',
    difficulty: 'Progresivo',
    gradient: 'from-[#8B5CF6] to-[#EC4899]',
    glow: 'rgba(236,72,153,0.3)',
    tags: ['3×3 → 7×7', '9 niveles', 'Memoria'],
    available: true,
  },
  {
    slug: 'word-sprint',
    emoji: '💬',
    name: 'Word Sprint',
    tagline: 'Clasifica palabras contra el tiempo',
    duration: '60 seg',
    difficulty: 'Medio',
    gradient: 'from-[#F59E0B] to-[#EC4899]',
    glow: 'rgba(245,158,11,0.3)',
    tags: ['Semántica', '60 segundos', 'Velocidad'],
    available: true,
  },
  {
    slug: 'pattern-hunt',
    emoji: '🔍',
    name: 'Pattern Hunt',
    tagline: 'Encuentra el elemento diferente en el grid',
    duration: '~4 min',
    difficulty: 'Variable',
    gradient: 'from-[#84CC16] to-[#06B6D4]',
    glow: 'rgba(132,204,22,0.3)',
    tags: ['Visual', 'Odd-one-out', 'Percepción'],
    available: true,
  },
  {
    slug: 'deep-read',
    emoji: '📖',
    name: 'Deep Read',
    tagline: 'Lectura comprensiva con tracking detallado',
    duration: '~6 min',
    difficulty: 'Fácil',
    gradient: 'from-[#EC4899] to-[#F59E0B]',
    glow: 'rgba(236,72,153,0.3)',
    tags: ['Comprensión', 'Quiz', 'Lectura'],
    available: true,
  },
]

const DIFF_COLOR: Record<string, string> = {
  Fácil: 'text-green-400 bg-green-400/10',
  Medio: 'text-yellow-400 bg-yellow-400/10',
  Progresivo: 'text-[#8B5CF6] bg-[#8B5CF6]/10',
  Variable: 'text-[#06B6D4] bg-[#06B6D4]/10',
}

export default function ActivitiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Actividades de Atención</h1>
        <p className="text-slate-400">Mini-juegos diseñados para medir y entrenar tu capacidad de concentración.</p>
      </motion.div>

      {/* Grid de actividades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACTIVITIES.map((act, idx) => {
          const card = (
            <motion.div
              className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 flex flex-col gap-4 transition-all duration-300 hover:border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              whileHover={act.available ? { scale: 1.02, y: -2 } : {}}
            >
              {/* Emoji + badge disponibilidad */}
              <div className="flex items-start justify-between">
                <span className="text-4xl">{act.emoji}</span>
                {act.available ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">
                    Disponible
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/5 text-slate-500 border border-white/10">
                    Próximamente
                  </span>
                )}
              </div>

              {/* Nombre y descripción */}
              <div>
                <h2 className={`text-lg font-bold mb-1 ${act.available ? `bg-gradient-to-r ${act.gradient} bg-clip-text text-transparent` : 'text-slate-400'}`}>
                  {act.name}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">{act.tagline}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {act.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs">⏱ {act.duration}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLOR[act.difficulty]}`}>
                    {act.difficulty}
                  </span>
                </div>
                {act.available && (
                  <span className={`text-xs font-semibold bg-gradient-to-r ${act.gradient} bg-clip-text text-transparent`}>
                    Jugar →
                  </span>
                )}
              </div>
            </motion.div>
          )

          return act.available ? (
            <Link key={act.slug} href={`/activities/${act.slug}`} className="block">
              {card}
            </Link>
          ) : (
            <div key={act.slug} className="opacity-50 cursor-not-allowed">
              {card}
            </div>
          )
        })}
      </div>

      {/* Info de métricas */}
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-white font-semibold mb-3">¿Cómo funcionan?</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-4">
          Cada actividad captura métricas detalladas que se almacenan en tu perfil. El agente IA de FocusLab analiza estos datos para generar tu perfil atencional personalizado.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '⚡', label: 'Tiempo de reacción' },
            { icon: '🧠', label: 'Memoria de trabajo' },
            { icon: '👁️', label: 'Atención sostenida' },
            { icon: '🎯', label: 'Control inhibitorio' },
          ].map(m => (
            <div key={m.label} className="text-center">
              <div className="text-2xl mb-1">{m.icon}</div>
              <p className="text-slate-400 text-xs">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
