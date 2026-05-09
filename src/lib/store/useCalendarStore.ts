'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './useAuthStore'

export interface TimeBlock {
  id: string
  dateKey: string
  startHour: number    // decimal, ej: 9.5 = 09:30
  durationHours: number
  title: string
  color: string
  completed: boolean
  type: 'study' | 'pomodoro' | 'task'
}

interface CalendarState {
  blocks: TimeBlock[]
  loading: boolean

  fetchBlocks: (from: string, to: string) => Promise<void>
  addBlock: (block: Omit<TimeBlock, 'id'>) => Promise<void>
  toggleBlock: (id: string) => Promise<void>
  deleteBlock: (id: string) => Promise<void>
}

// Mapea fila de DB a TimeBlock
function rowToBlock(row: Record<string, unknown>): TimeBlock {
  return {
    id: row.id as string,
    dateKey: row.date_key as string,
    startHour: parseFloat(row.start_hour as string),
    durationHours: parseFloat(row.duration_hours as string),
    title: row.title as string,
    color: row.color as string,
    completed: row.completed as boolean,
    type: row.type as TimeBlock['type'],
  }
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  blocks: [],
  loading: false,

  fetchBlocks: async (from, to) => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ loading: true })
    const supabase = createClient()

    const { data, error } = await supabase
      .from('calendar_blocks')
      .select('*')
      .eq('user_id', user.id)
      .gte('date_key', from)
      .lte('date_key', to)
      .order('date_key', { ascending: true })
      .order('start_hour', { ascending: true })

    if (!error && data) {
      set({ blocks: data.map(rowToBlock) })
    }
    set({ loading: false })
  },

  addBlock: async (blockData) => {
    const user = useAuthStore.getState().user
    if (!user) return
    const supabase = createClient()

    const { data, error } = await supabase
      .from('calendar_blocks')
      .insert({
        user_id: user.id,
        date_key: blockData.dateKey,
        start_hour: blockData.startHour,
        duration_hours: blockData.durationHours,
        title: blockData.title,
        color: blockData.color,
        type: blockData.type,
        completed: false,
      })
      .select()
      .single()

    if (!error && data) {
      set((s) => ({ blocks: [...s.blocks, rowToBlock(data)] }))
    }
  },

  toggleBlock: async (id) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const block = get().blocks.find((b) => b.id === id)
    if (!block) return

    const completed = !block.completed

    // Optimista
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === id ? { ...b, completed } : b)),
    }))

    const supabase = createClient()
    const { error } = await supabase
      .from('calendar_blocks')
      .update({ completed })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      // Revertir
      set((s) => ({
        blocks: s.blocks.map((b) => (b.id === id ? { ...b, completed: !completed } : b)),
      }))
    }
  },

  deleteBlock: async (id) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const prev = get().blocks
    // Optimista
    set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) }))

    const supabase = createClient()
    const { error } = await supabase
      .from('calendar_blocks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      set({ blocks: prev })
    }
  },
}))
