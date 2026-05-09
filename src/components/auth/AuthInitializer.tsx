'use client'

// Inicializa el store de autenticación en el cliente a partir de la sesión de Supabase.
// Debe montarse dentro del layout del dashboard.
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function AuthInitializer() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // Cargar sesión actual inmediatamente
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Escuchar cambios de autenticación (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return null
}
