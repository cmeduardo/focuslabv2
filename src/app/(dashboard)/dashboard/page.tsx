import { createClient } from '@/lib/supabase/server'

// Dashboard principal — overview
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const displayName = profile?.full_name || profile?.username || 'Usuario'

  return (
    <div className="max-w-7xl mx-auto">
      {/* Saludo */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {greeting}, <span className="text-gradient-primary">{displayName}</span> 👋
        </h1>
        <p className="text-slate-400 mt-1">
          Aquí tienes el resumen de tu actividad de hoy.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pomodoros hoy', value: '0', color: '#8B5CF6', emoji: '🍅' },
          { label: 'Tareas completadas', value: '0', color: '#06B6D4', emoji: '✅' },
          { label: 'Racha de hábitos', value: '0 días', color: '#84CC16', emoji: '🔥' },
          { label: 'Focus Score', value: '--', color: '#EC4899', emoji: '⚡' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl p-5 hover:border-white/20 transition-colors"
          >
            <div className="text-2xl mb-2">{stat.emoji}</div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Iniciar Pomodoro', href: '/tools/pomodoro', gradient: 'from-[#8B5CF6] to-[#06B6D4]', emoji: '🍅' },
            { label: 'Nueva tarea', href: '/tools/tasks', gradient: 'from-[#06B6D4] to-[#84CC16]', emoji: '✏️' },
            { label: 'Actividad rápida', href: '/activities', gradient: 'from-[#EC4899] to-[#F59E0B]', emoji: '🧠' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${action.gradient} hover:opacity-90 transition-opacity`}
            >
              <span className="text-2xl">{action.emoji}</span>
              <span className="font-semibold text-white text-sm">{action.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Mensaje de bienvenida si es nuevo */}
      {!profile?.onboarding_completed && (
        <div className="glass-card rounded-2xl p-6 border border-[#8B5CF6]/30">
          <h3 className="text-lg font-semibold text-white mb-2">
            🎉 ¡Bienvenido a FocusLab!
          </h3>
          <p className="text-slate-400 text-sm">
            Explora las herramientas de productividad, completa actividades cognitivas
            y genera tu primer reporte de atención. ¡Tu viaje hacia un mejor enfoque comienza aquí!
          </p>
        </div>
      )}
    </div>
  )
}
