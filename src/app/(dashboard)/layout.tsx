import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import MobileNav from '@/components/layout/MobileNav'
import { EventCaptureProvider } from '@/components/tracking/EventCapture'
import AuthInitializer from '@/components/auth/AuthInitializer'
import PageTransition from '@/components/layout/PageTransition'

// Layout del dashboard — protegido, requiere autenticación
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, onboarding_completed')
    .eq('id', user.id)
    .single()

  // Redirigir a onboarding si el usuario no lo ha completado
  // (excepto si ya está en /onboarding para evitar loop)
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  if (profile && !profile.onboarding_completed && !pathname.startsWith('/onboarding')) {
    redirect('/onboarding')
  }

  return (
    <EventCaptureProvider>
      {/* Inicializa useAuthStore en el cliente a partir de la sesión Supabase */}
      <AuthInitializer />
      <div className="flex h-screen bg-[#0F0F1A] overflow-hidden">
        {/* Sidebar (desktop) */}
        <Sidebar />

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            userEmail={user.email}
            userName={profile?.full_name || profile?.username || user.email?.split('@')[0]}
          />
          <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Bottom nav (mobile) */}
        <MobileNav />
      </div>
    </EventCaptureProvider>
  )
}
