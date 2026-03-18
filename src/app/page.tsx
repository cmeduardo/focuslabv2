import Link from 'next/link'

// Landing page pública de FocusLab
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0F0F1A] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
          FocusLab
        </h1>
        <p className="text-xl text-slate-400 mb-4">
          Mide y mejora tus patrones de atención
        </p>
        <p className="text-slate-500 mb-10">
          Herramientas de productividad + actividades cognitivas + análisis IA.<br />
          Diseñado para universitarios.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/register"
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Comenzar gratis
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  )
}
