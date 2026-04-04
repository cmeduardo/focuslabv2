'use client'

import { create } from 'zustand'

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

interface TaskState {
  tasks: Task[]
  filterPriority: TaskPriority | null
  filterTag: string | null

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'completedPomodoros'>) => Task
  updateTask: (id: string, updates: Partial<Task>) => void
  moveTask: (id: string, status: TaskStatus) => void
  deleteTask: (id: string) => void
  incrementPomodoro: (id: string) => void
  setFilterPriority: (priority: TaskPriority | null) => void
  setFilterTag: (tag: string | null) => void
  getTasksByStatus: (status: TaskStatus) => Task[]
  getAllTags: () => string[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  filterPriority: null,
  filterTag: null,

  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      completedPomodoros: 0,
    }
    set((s) => ({ tasks: [...s.tasks, newTask] }))
    return newTask
  },

  updateTask: (id, updates) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }))
  },

  moveTask: (id, status) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, status, completedAt: status === 'done' ? new Date().toISOString() : t.completedAt }
          : t
      ),
    }))
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  incrementPomodoro: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completedPomodoros: t.completedPomodoros + 1 } : t
      ),
    }))
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
