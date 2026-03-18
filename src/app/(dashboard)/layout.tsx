import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import MobileNav from '@/components/layout/MobileNav'

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
    .select('username, full_name')
    .eq('id', user.id)
    .single()

  return (
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
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <MobileNav />
    </div>
  )
}
