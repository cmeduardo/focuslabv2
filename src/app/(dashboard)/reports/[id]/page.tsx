import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InsightPanel from '@/components/reports/InsightPanel'
import AttentionChart from '@/components/reports/AttentionChart'
import type { Report } from '@/types/reports'

interface Props {
  params: Promise<{ id: string }>
}

// Página de detalle de un reporte con análisis IA
export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params
  const reportId = Number(id)
  if (isNaN(reportId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .single()

  if (!report) notFound()

  const r = report as Report

  // Formatear período
  const start = new Date(r.period_start)
  const end = new Date(r.period_end)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const period = `${start.toLocaleDateString('es', opts)} – ${end.toLocaleDateString('es', opts)}`

  return (
    <div className="max-w-4xl mx-auto">
      {/* Navegación */}
      <div className="mb-6">
        <Link
          href="/reports"
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
        >
          ← Volver a reportes
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">📊 Reporte de atención</h1>
        <p className="text-slate-400 text-sm">{period}</p>
      </div>

      {/* Estado pendiente/processing */}
      {(r.status === 'pending' || r.status === 'processing') && (
        <div className="glass-card rounded-2xl p-8 text-center border border-[#06B6D4]/20">
          <div className="text-5xl mb-4 animate-pulse">🔄</div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {r.status === 'pending' ? 'Reporte generado' : 'Analizando datos...'}
          </h2>
          <p className="text-slate-400 text-sm">
            El agente IA está procesando tus datos. Vuelve en unos minutos.
          </p>
          <Link
            href="/reports"
            className="inline-block mt-4 text-sm text-[#06B6D4] hover:underline"
          >
            Ver todos los reportes
          </Link>
        </div>
      )}

      {/* Estado fallido */}
      {r.status === 'failed' && (
        <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-lg font-semibold text-white mb-2">Error en el análisis</h2>
          <p className="text-slate-400 text-sm">
            Hubo un problema al analizar este reporte. Intenta generar uno nuevo.
          </p>
        </div>
      )}

      {/* Reporte completado */}
      {r.status === 'completed' && (
        <div className="space-y-8">
          {/* Gráficos de atención */}
          <div>
            <h2 className="text-base font-semibold text-slate-300 mb-4">📈 Métricas del período</h2>
            <AttentionChart rawData={r.raw_data} />
          </div>

          {/* Análisis IA */}
          {r.ai_analysis && (
            <div>
              <h2 className="text-base font-semibold text-slate-300 mb-4">🤖 Análisis de la IA</h2>
              <InsightPanel analysis={r.ai_analysis} focusScoreAvg={r.focus_score_avg} />
            </div>
          )}

          {/* Sin análisis IA aún */}
          {!r.ai_analysis && (
            <div className="glass-card rounded-2xl p-6 text-center border border-white/10">
              <p className="text-slate-400 text-sm">
                El análisis de IA no está disponible para este reporte.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
