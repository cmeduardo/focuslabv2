'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Search, LogOut, User } from 'lucide-react'
import { useState } from 'react'

interface TopBarProps {
  userEmail?: string
  userName?: string
}

// Barra superior del dashboard
export default function TopBar({ userEmail, userName }: TopBarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-[#1A1A2E]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Búsqueda */}
      <div className="flex items-center gap-3 flex-1 max-w-sm">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] transition-colors"
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        {/* Notificaciones */}
        <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#8B5CF6] rounded-full"></span>
        </button>

        {/* Avatar / menú usuario */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center text-white text-sm font-semibold">
              {userName ? userName[0].toUpperCase() : <User size={16} />}
            </div>
            {userName && (
              <span className="text-sm text-slate-300 hidden sm:block">{userName}</span>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#1A1A2E] border border-white/10 shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm font-medium text-white">{userName || 'Usuario'}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
