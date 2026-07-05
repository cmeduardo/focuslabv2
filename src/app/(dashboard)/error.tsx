'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Error boundary para el área del dashboard
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[FocusLab] Error en dashboard:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-5">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">Ocurrió un error</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          No se pudo cargar esta sección. Puede ser un problema temporal de conexión.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:border-white/20 transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
        {error.digest && (
          <p className="text-slate-600 text-xs mt-4">Código: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
