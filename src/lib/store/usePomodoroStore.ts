'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './useAuthStore'
import { useTaskStore } from './useTaskStore'

// Modos del timer
export type TimerMode = 'focus' | 'short_break' | 'long_break'

// Duraciones por defecto en segundos
export const DEFAULT_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
}

export interface LinkedTask {
  id: string
  title: string
}

interface PomodoroState {
  mode: TimerMode
  durations: Record<TimerMode, number>
  timeLeft: number
  isRunning: boolean
  isPaused: boolean
  completedToday: number
  interruptions: number
  linkedTask: LinkedTask | null
  showRating: boolean
  focusRating: number | null
  startedAt: number | null

  setMode: (mode: TimerMode) => void
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  tick: () => boolean // retorna true si completó
  setRating: (rating: number) => void
  dismissRating: () => void
  linkTask: (task: LinkedTask | null) => void
  setDuration: (mode: TimerMode, seconds: number) => void
  incrementInterruptions: () => void
  // Persiste la sesión de enfoque en Supabase y actualiza pomodoros de la tarea
  saveSession: (focusRating: number | null) => Promise<void>
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  mode: 'focus',
  durations: { ...DEFAULT_DURATIONS },
  timeLeft: DEFAULT_DURATIONS.focus,
  isRunning: false,
  isPaused: false,
  completedToday: 0,
  interruptions: 0,
  linkedTask: null,
  showRating: false,
  focusRating: null,
  startedAt: null,

  setMode: (mode) => {
    const { durations } = get()
    set({ mode, timeLeft: durations[mode], isRunning: false, isPaused: false, startedAt: null })
  },

  start: () => {
    const { durations, mode } = get()
    set({
      isRunning: true,
      isPaused: false,
      startedAt: Date.now(),
      timeLeft: durations[mode],
      interruptions: 0,
    })
  },

  pause: () => {
    set((s) => ({ isRunning: false, isPaused: true, interruptions: s.interruptions + 1 }))
  },

  resume: () => set({ isRunning: true, isPaused: false }),

  reset: () => {
    const { durations, mode } = get()
    set({ isRunning: false, isPaused: false, timeLeft: durations[mode], startedAt: null })
  },

  // Avanza un segundo; retorna true cuando el timer llega a 0
  tick: () => {
    const { timeLeft, mode, completedToday } = get()
    if (timeLeft <= 1) {
      const isFocus = mode === 'focus'
      set({
        isRunning: false,
        isPaused: false,
        timeLeft: 0,
        completedToday: isFocus ? completedToday + 1 : completedToday,
        showRating: isFocus,
      })
      return true
    }
    set({ timeLeft: timeLeft - 1 })
    return false
  },

  setRating: (rating) => set({ focusRating: rating }),

  dismissRating: () => set({ showRating: false, focusRating: null }),

  linkTask: (task) => set({ linkedTask: task }),

  setDuration: (mode, seconds) => {
    const { durations, mode: currentMode } = get()
    const newDurations = { ...durations, [mode]: seconds }
    if (currentMode === mode) {
      set({ durations: newDurations, timeLeft: seconds })
    } else {
      set({ durations: newDurations })
    }
  },

  incrementInterruptions: () => set((s) => ({ interruptions: s.interruptions + 1 })),

  saveSession: async (focusRating) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { mode, linkedTask, interruptions, startedAt, durations } = get()
    // Solo guardar sesiones de enfoque completadas
    if (mode !== 'focus') return

    const supabase = createClient()
    // Columnas reales: ended_at (no completed_at), completed (bool), sin campo mode
    await supabase.from('pomodoro_sessions').insert({
      user_id: user.id,
      task_id: linkedTask?.id ?? null,
      duration_seconds: durations[mode],
      started_at: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
      ended_at: new Date().toISOString(),
      completed: true,
      interruptions,
      focus_rating: focusRating,
    })

    // Incrementar contador de pomodoros en la tarea vinculada
    if (linkedTask) {
      await useTaskStore.getState().incrementPomodoro(linkedTask.id)
    }
  },
}))
