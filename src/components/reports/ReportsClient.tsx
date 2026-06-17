'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ReportCard from './ReportCard'
import type { Report } from '@/types/reports'

interface Props {
  reports: Report[]
}

// Devuelve el rango de la última semana en formato YYYY-MM-DD
function getLastWeekRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 7)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function getLastMonthRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export default function ReportsClient({ reports: initialReports }: Props) {
  const router = useRouter()
  const [reports, setReports] = useState(initialReports)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  async function generateReport(start: string, end: string) {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: start, period_end: end }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al generar el reporte')
        return
      }
      // Recargar la página para mostrar el nuevo reporte
      router.refresh()
      setShowModal(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        className="flex items-start justify-between mb-8 gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white">📊 Reportes</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Análisis de tus patrones de atención generados por IA
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          + Nuevo reporte
        </button>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Lista de reportes */}
      {reports.length === 0 ? (
        <motion.div
          className="glass-card rounded-2xl p-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-white mb-2">Sin reportes aún</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Usa FocusLab durante unos días y genera tu primer análisis de patrones de atención.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Generar primer reporte
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report, i) => (
            <ReportCard key={report.id} report={report} index={i} />
          ))}
        </div>
      )}

      {/* Modal de generación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            className="glass-card rounded-2xl p-6 w-full max-w-md border border-white/10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-white mb-1">Generar reporte</h2>
            <p className="text-slate-400 text-sm mb-5">
              Selecciona el período a analizar
            </p>

            {/* Accesos rápidos */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => {
                  const r = getLastWeekRange()
                  generateReport(r.start, r.end)
                }}
                disabled={generating}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white transition-colors disabled:opacity-50"
              >
                📅 Última semana
              </button>
              <button
                onClick={() => {
                  const r = getLastMonthRange()
                  generateReport(r.start, r.end)
                }}
                disabled={generating}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white transition-colors disabled:opacity-50"
              >
                🗓️ Último mes
              </button>
            </div>

            <div className="border-t border-white/10 pt-4 mb-4">
              <p className="text-xs text-slate-500 mb-3">O elige un período personalizado:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Inicio</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fin</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (customStart && customEnd) generateReport(customStart, customEnd)
                }}
                disabled={!customStart || !customEnd || generating}
                className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {generating ? 'Generando...' : 'Generar'}
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
