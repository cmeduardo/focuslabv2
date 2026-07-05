'use client'

import { useEffect } from 'react'

// Error boundary global de la aplicación
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[FocusLab] Error global:', error)
  }, [error])

  return (
    <html lang="es">
      <body className="bg-[#0F0F1A] flex items-center justify-center min-h-screen">
        <div className="text-center px-6 max-w-md">
          <div className="text-6xl mb-6">💥</div>
          <h1 className="text-2xl font-bold text-white mb-3">Algo salió mal</h1>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Ocurrió un error inesperado. Puedes intentar recargar la página o volver al inicio.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
