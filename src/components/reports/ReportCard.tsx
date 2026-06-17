'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Report, ReportStatus } from '@/types/reports'

interface Props {
  report: Report
  index: number
}

const statusConfig: Record<ReportStatus, { label: string; color: string; bg: string; emoji: string }> = {
  pending: { label: 'Pendiente', color: '#F59E0B', bg: 'bg-amber-500/10', emoji: '⏳' },
  processing: { label: 'Analizando...', color: '#06B6D4', bg: 'bg-cyan-500/10', emoji: '🔄' },
  completed: { label: 'Completado', color: '#84CC16', bg: 'bg-lime-500/10', emoji: '✅' },
  failed: { label: 'Error', color: '#EF4444', bg: 'bg-red-500/10', emoji: '❌' },
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${s.toLocaleDateString('es', opts)} – ${e.toLocaleDateString('es', opts)}, ${e.getFullYear()}`
}

export default function ReportCard({ report, index }: Props) {
  const cfg = statusConfig[report.status]
  const summary = report.raw_data?.summary as Record<string, number> | undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Link
        href={report.status === 'completed' ? `/reports/${report.id}` : '#'}
        className={`glass-card rounded-2xl p-5 block hover:border-white/20 transition-all ${
          report.status === 'completed' ? 'hover:scale-[1.01] cursor-pointer' : 'cursor-default'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white font-semibold text-sm">
              📅 {formatPeriod(report.period_start, report.period_end)}
            </p>
            {report.attention_profile && (
              <p className="text-[#8B5CF6] text-xs mt-0.5 font-medium">
                {report.attention_profile}
              </p>
            )}
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg}`} style={{ color: cfg.color }}>
            {cfg.emoji} {cfg.label}
          </span>
        </div>

        {/* Stats del reporte */}
        {summary && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-[#8B5CF6]">
                {summary.total_focus_time_minutes ?? 0}m
              </p>
              <p className="text-xs text-slate-500">Tiempo enfoque</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#06B6D4]">
                {summary.active_days ?? 0}
              </p>
              <p className="text-xs text-slate-500">Días activos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#84CC16]">
                {report.focus_score_avg ?? '--'}
              </p>
              <p className="text-xs text-slate-500">Focus score</p>
            </div>
          </div>
        )}

        {/* Recomendaciones preview */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="border-t border-white/5 pt-3">
            <p className="text-xs text-slate-500 mb-1.5">💡 Top recomendación</p>
            <p className="text-sm text-slate-300 line-clamp-2">{report.recommendations[0]}</p>
          </div>
        )}

        {/* CTA si completado */}
        {report.status === 'completed' && (
          <div className="mt-3 text-xs text-[#8B5CF6] font-medium">
            Ver análisis completo →
          </div>
        )}
      </Link>
    </motion.div>
  )
}
