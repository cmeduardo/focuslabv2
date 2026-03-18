'use client'

import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
  university?: string
  career?: string
  semester?: number
  onboarding_completed: boolean
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

// Store de autenticación global
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, profile: null, loading: false }),
}))
