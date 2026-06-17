'use client'

import { motion } from 'framer-motion'
import type { AIAnalysis } from '@/types/reports'

interface Props {
  analysis: AIAnalysis
  focusScoreAvg?: number | null
}

const riskColors = {
  low: { color: '#84CC16', label: 'Bajo' },
  moderate: { color: '#F59E0B', label: 'Moderado' },
  high: { color: '#EF4444', label: 'Alto' },
}

const attentionColors = {
  none: { color: '#84CC16', label: 'Ninguno' },
  mild: { color: '#F59E0B', label: 'Leve' },
  moderate: { color: '#F59E0B', label: 'Moderado' },
  significant: { color: '#EF4444', label: 'Significativo' },
}

// Panel con el análisis completo de la IA
export default function InsightPanel({ analysis, focusScoreAvg }: Props) {
  const burnoutCfg = riskColors[analysis.risk_indicators.burnout_risk]
  const attentionCfg = attentionColors[analysis.risk_indicators.attention_deficit_indicators]

  return (
    <div className="space-y-6">
      {/* Perfil atencional + score */}
      <motion.div
        className="glass-card rounded-2xl p-6 border border-[#8B5CF6]/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Perfil atencional</p>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
              {analysis.attention_profile}
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-2xl">
              {analysis.summary}
            </p>
          </div>
          {focusScoreAvg !== null && focusScoreAvg !== undefined && (
            <div className="shrink-0 text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-4"
                style={{
                  borderColor: focusScoreAvg >= 70 ? '#84CC16' : focusScoreAvg >= 40 ? '#F59E0B' : '#EF4444',
                  color: focusScoreAvg >= 70 ? '#84CC16' : focusScoreAvg >= 40 ? '#F59E0B' : '#EF4444',
                }}
              >
                {focusScoreAvg}
              </div>
              <p className="text-xs text-slate-500 mt-1">Focus Score</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Fortalezas y áreas de mejora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          className="glass-card rounded-2xl p-5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-[#84CC16] mb-3 flex items-center gap-2">
            💪 Fortalezas
          </h3>
          <ul className="space-y-2">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-[#84CC16] mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="glass-card rounded-2xl p-5"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold text-[#F59E0B] mb-3 flex items-center gap-2">
            🎯 Áreas de mejora
          </h3>
          <ul className="space-y-2">
            {analysis.areas_to_improve.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-[#F59E0B] mt-0.5">•</span>
                {a}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Patrones detectados */}
      <motion.div
        className="glass-card rounded-2xl p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-sm font-semibold text-[#06B6D4] mb-3">🔍 Patrones detectados</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.patterns_detected.map((p, i) => (
            <span
              key={i}
              className="text-xs px-3 py-1.5 rounded-full bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20"
            >
              {p}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Recomendaciones */}
      <motion.div
        className="glass-card rounded-2xl p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <h3 className="text-sm font-semibold text-[#8B5CF6] mb-3">💡 Recomendaciones</h3>
        <ol className="space-y-3">
          {analysis.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              {r}
            </li>
          ))}
        </ol>
      </motion.div>

      {/* Indicadores de riesgo */}
      <motion.div
        className="glass-card rounded-2xl p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h3 className="text-sm font-semibold text-slate-400 mb-4">🩺 Indicadores de riesgo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-xs text-slate-500 mb-1">Riesgo burnout</p>
            <p className="font-bold" style={{ color: burnoutCfg.color }}>{burnoutCfg.label}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-xs text-slate-500 mb-1">Indicadores déficit atencional</p>
            <p className="font-bold" style={{ color: attentionCfg.color }}>{attentionCfg.label}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-xs text-slate-500 mb-1">Patrones de estrés</p>
            <p className="font-bold text-slate-300 text-sm">{analysis.risk_indicators.stress_patterns}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
