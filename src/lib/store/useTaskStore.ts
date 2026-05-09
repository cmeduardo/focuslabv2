'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './useAuthStore'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  estimatedPomodoros: number
  completedPomodoros: number
  tags: string[]
  createdAt: string
  completedAt: string | null
}

// Mapea status del frontend al ENUM de PostgreSQL
// DB enum: 'pending' | 'in_progress' | 'completed' | 'cancelled'
// Frontend: 'todo' | 'in_progress' | 'done'
function statusToDb(status: TaskStatus): string {
  if (status === 'todo') return 'pending'
  if (status === 'done') return 'completed'
  return status // 'in_progress' coincide
}

function statusFromDb(status: string): TaskStatus {
  if (status === 'pending') return 'todo'
  if (status === 'completed' || status === 'cancelled') return 'done'
  return 'in_progress'
}

// Mapea fila de DB (snake_case) a Task (camelCase)
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id), // BIGINT en DB → string en frontend
    title: row.title as string,
    description: (row.description as string) ?? '',
    status: statusFromDb(row.status as string),
    priority: row.priority as TaskPriority,
    dueDate: (row.due_date as string) ?? null,
    estimatedPomodoros: (row.estimated_pomodoros as number) ?? 0,
    completedPomodoros: (row.completed_pomodoros as number) ?? 0,
    tags: (row.tags as string[]) ?? [],
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) ?? null,
  }
}

interface TaskState {
  tasks: Task[]
  loading: boolean
  filterPriority: TaskPriority | null
  filterTag: string | null

  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'completedPomodoros'>) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  moveTask: (id: string, status: TaskStatus) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  incrementPomodoro: (id: string) => Promise<void>
  setFilterPriority: (priority: TaskPriority | null) => void
  setFilterTag: (tag: string | null) => void
  getTasksByStatus: (status: TaskStatus) => Task[]
  getAllTags: () => string[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  filterPriority: null,
  filterTag: null,

  fetchTasks: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error && data) {
      set({ tasks: data.map(rowToTask) })
    }
    set({ loading: false })
  },

  addTask: async (taskData) => {
    const user = useAuthStore.getState().user
    if (!user) return null
    const supabase = createClient()

    // Optimista: insertar con ID temporal mientras espera Supabase
    const tempId = crypto.randomUUID()
    const tempTask: Task = {
      ...taskData,
      id: tempId,
      createdAt: new Date().toISOString(),
      completedAt: null,
      completedPomodoros: 0,
    }
    set((s) => ({ tasks: [tempTask, ...s.tasks] }))

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: taskData.title,
        description: taskData.description,
        status: statusToDb(taskData.status), // mapear 'todo'→'pending', 'done'→'completed'
        priority: taskData.priority,
        due_date: taskData.dueDate,
        estimated_pomodoros: taskData.estimatedPomodoros,
        completed_pomodoros: 0,
        tags: taskData.tags,
      })
      .select()
      .single()

    if (error) {
      // Revertir optimismo ante error
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== tempId) }))
      return null
    }

    // Reemplazar ID temporal con el real devuelto por Supabase
    const realTask = rowToTask(data)
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === tempId ? realTask : t)) }))
    return realTask
  },

  updateTask: async (id, updates) => {
    const user = useAuthStore.getState().user
    if (!user) return

    // Optimista
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }))

    const dbUpdates: Record<string, unknown> = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.status !== undefined) dbUpdates.status = statusToDb(updates.status)
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate
    if (updates.estimatedPomodoros !== undefined) dbUpdates.estimated_pomodoros = updates.estimatedPomodoros
    if (updates.completedPomodoros !== undefined) dbUpdates.completed_pomodoros = updates.completedPomodoros
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt

    const supabase = createClient()
    await supabase.from('tasks').update(dbUpdates).eq('id', id).eq('user_id', user.id)
  },

  moveTask: async (id, status) => {
    const user = useAuthStore.getState().user
    if (!user) return

    // Optimista
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, status, completedAt: status === 'done' ? new Date().toISOString() : t.completedAt }
          : t
      ),
    }))

    const supabase = createClient()
    await supabase
      .from('tasks')
      .update({ status: statusToDb(status), completed_at: status === 'done' ? new Date().toISOString() : null })
      .eq('id', id)
      .eq('user_id', user.id)
  },

  deleteTask: async (id) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const prev = get().tasks
    // Optimista
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))

    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      // Revertir si falla
      set({ tasks: prev })
    }
  },

  incrementPomodoro: async (id) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    const newCount = task.completedPomodoros + 1
    // Optimista
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, completedPomodoros: newCount } : t)),
    }))

    const supabase = createClient()
    await supabase
      .from('tasks')
      .update({ completed_pomodoros: newCount })
      .eq('id', id)
      .eq('user_id', user.id)
  },

  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setFilterTag: (tag) => set({ filterTag: tag }),

  getTasksByStatus: (status) => {
    const { tasks, filterPriority, filterTag } = get()
    return tasks.filter((t) => {
      if (t.status !== status) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (filterTag && !t.tags.includes(filterTag)) return false
      return true
    })
  },

  getAllTags: () => {
    const { tasks } = get()
    return [...new Set(tasks.flatMap((t) => t.tags))]
  },
}))
