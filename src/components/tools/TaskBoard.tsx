'use client'

// Kanban con drag & drop usando @dnd-kit
import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, GripVertical, Timer, CalendarDays, Tag,
  AlertCircle, ChevronDown, Check, Trash2,
} from 'lucide-react'
import { useTaskStore, type Task, type TaskStatus, type TaskPriority } from '@/lib/store/useTaskStore'
import { usePomodoroStore } from '@/lib/store/usePomodoroStore'
import { useEventTracker } from '@/hooks/useEventTracker'
import { cn } from '@/lib/utils'

// Configuración de columnas
const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'Por hacer', color: '#94A3B8' },
  { id: 'in_progress', label: 'En progreso', color: '#06B6D4' },
  { id: 'done', label: 'Completado', color: '#84CC16' },
]

// Color por prioridad
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Baja',     color: '#84CC16', bg: 'bg-lime-500/10 text-lime-400' },
  medium: { label: 'Media',    color: '#06B6D4', bg: 'bg-cyan-500/10 text-cyan-400' },
  high:   { label: 'Alta',     color: '#F59E0B', bg: 'bg-amber-500/10 text-amber-400' },
  urgent: { label: 'Urgente',  color: '#EC4899', bg: 'bg-pink-500/10 text-pink-400' },
}

// ── Tarjeta de tarea individual ──────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  overlay?: boolean
}

function TaskCard({ task, overlay = false }: TaskCardProps) {
  const { deleteTask, moveTask } = useTaskStore()
  const { linkTask, setMode } = usePomodoroStore()
  const { track } = useEventTracker()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityCfg = PRIORITY_CONFIG[task.priority]
  const pomodoroProgress = task.estimatedPomodoros > 0
    ? task.completedPomodoros / task.estimatedPomodoros
    : 0
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

  const handleStartPomodoro = useCallback(() => {
    linkTask({ id: task.id, title: task.title })
    setMode('focus')
    track({ event_type: 'pomodoro_start_from_task', category: 'tool_usage', metadata: { task_id: task.id } })
  }, [task, linkTask, setMode, track])

  const handleComplete = useCallback(() => {
    moveTask(task.id, 'done')
    track({
      event_type: 'task_completed',
      category: 'tool_usage',
      metadata: { task_id: task.id, title: task.title },
    })
  }, [task, moveTask, track])

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: priorityCfg.color }}
      className={cn(
        'group relative rounded-xl border bg-[#0F0F1A] p-4 cursor-default transition-all border-l-2',
        isDragging || overlay ? 'opacity-50 scale-105 shadow-2xl' : 'hover:border-white/20'
      )}
    >
      {/* Handle de arrastre */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={16} />
      </div>

      {/* Título */}
      <div className="flex items-start gap-2 mb-2 pr-6">
        {task.status !== 'done' && (
          <button
            onClick={handleComplete}
            className="mt-0.5 w-4 h-4 rounded-full border border-slate-600 hover:border-[#84CC16] hover:bg-[#84CC16]/10 shrink-0 transition-colors flex items-center justify-center"
            data-tracking="task-complete"
          />
        )}
        {task.status === 'done' && (
          <div className="mt-0.5 w-4 h-4 rounded-full bg-[#84CC16]/20 border border-[#84CC16] shrink-0 flex items-center justify-center">
            <Check size={10} className="text-[#84CC16]" />
          </div>
        )}
        <span className={cn('text-sm font-medium leading-snug', task.status === 'done' ? 'line-through text-slate-500' : 'text-white')}>
          {task.title}
        </span>
      </div>

      {/* Descripción */}
      {task.description && (
        <p className="text-xs text-slate-500 mb-3 ml-6 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 ml-6">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] flex items-center gap-1">
              <Tag size={9} />{tag}
            </span>
          ))}
        </div>
      )}

      {/* Barra de pomodoros */}
      {task.estimatedPomodoros > 0 && (
        <div className="ml-6 mb-3">
          <div className="flex items-center gap-1 mb-1">
            <Timer size={11} className="text-[#8B5CF6]" />
            <span className="text-[10px] text-slate-500">
              {task.completedPomodoros}/{task.estimatedPomodoros} 🍅
            </span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: task.estimatedPomodoros }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ background: i < task.completedPomodoros ? '#8B5CF6' : 'rgba(255,255,255,0.1)' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer: prioridad, fecha, acciones */}
      <div className="flex items-center justify-between ml-6 gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', priorityCfg.bg)}>
            {priorityCfg.label}
          </span>
          {task.dueDate && (
            <span className={cn('flex items-center gap-1 text-[10px]', isOverdue ? 'text-pink-400' : 'text-slate-500')}>
              {isOverdue && <AlertCircle size={10} />}
              <CalendarDays size={10} />
              {new Date(task.dueDate).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.status !== 'done' && (
            <button
              onClick={handleStartPomodoro}
              className="p-1 rounded-lg text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors"
              title="Iniciar pomodoro"
              data-tracking="task-start-pomodoro"
            >
              <Timer size={14} />
            </button>
          )}
          <button
            onClick={() => deleteTask(task.id)}
            className="p-1 rounded-lg text-slate-600 hover:text-pink-400 hover:bg-pink-400/10 transition-colors"
            title="Eliminar"
            data-tracking="task-delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Columna Kanban droppable ──────────────────────────────────────────────────

interface KanbanColumnProps {
  column: typeof COLUMNS[number]
  tasks: Task[]
}

function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-2xl border bg-white/5 backdrop-blur-md transition-colors min-h-[400px]',
        isOver ? 'border-white/20 bg-white/10' : 'border-white/10'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-sm font-semibold text-white">{column.label}</span>
        </div>
        <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Tarjetas */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <TaskCard task={task} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-slate-600 text-sm">
            Sin tareas
          </div>
        )}
      </div>
    </div>
  )
}

// ── Formulario nueva tarea ─────────────────────────────────────────────────────

interface NewTaskFormProps {
  onClose: () => void
}

function NewTaskForm({ onClose }: NewTaskFormProps) {
  const { addTask, loading } = useTaskStore()
  const { track } = useEventTracker()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const task = await addTask({
      title: title.trim(),
      description: description.trim(),
      status: 'todo',
      priority,
      dueDate: dueDate || null,
      estimatedPomodoros,
      tags,
    })

    if (task) {
      track({
        event_type: 'task_created',
        category: 'tool_usage',
        metadata: { priority, estimated_pomodoros: estimatedPomodoros, task_id: task.id },
      })
    }

    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Nueva tarea</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <input
              autoFocus
              type="text"
              placeholder="Título de la tarea *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] transition-colors"
            />
          </div>

          {/* Descripción */}
          <textarea
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] transition-colors resize-none"
          />

          {/* Prioridad + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          {/* Pomodoros estimados */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              🍅 Pomodoros estimados: {estimatedPomodoros}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={estimatedPomodoros}
              onChange={(e) => setEstimatedPomodoros(Number(e.target.value))}
              className="w-full accent-[#8B5CF6]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Etiquetas</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Añadir etiqueta"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-xl bg-white/10 text-slate-300 hover:text-white text-sm transition-colors"
              >
                +
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] text-xs"
                  >
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}
            >
              Crear tarea
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function TaskBoard() {
  const { getTasksByStatus, moveTask, fetchTasks, filterPriority, filterTag, setFilterPriority, setFilterTag, getAllTags } = useTaskStore()
  const { track } = useEventTracker()

  // Cargar tareas desde Supabase al montar
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])
  const [showForm, setShowForm] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const allTags = getAllTags()

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id))
    const tasks = [...getTasksByStatus('todo'), ...getTasksByStatus('in_progress'), ...getTasksByStatus('done')]
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setActiveTask(null)
    if (!over) return

    const newStatus = over.id as TaskStatus
    if (COLUMNS.some((c) => c.id === newStatus)) {
      const task = [...getTasksByStatus('todo'), ...getTasksByStatus('in_progress'), ...getTasksByStatus('done')]
        .find((t) => t.id === active.id)

      if (task && task.status !== newStatus) {
        moveTask(String(active.id), newStatus)
        track({
          event_type: 'task_moved',
          category: 'tool_usage',
          metadata: { task_id: active.id, from: task.status, to: newStatus },
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06B6D4] to-[#84CC16] bg-clip-text text-transparent">
            Gestión de Tareas
          </h1>
          <p className="text-slate-400 text-sm mt-1">Organiza tu trabajo con Kanban</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}
          data-tracking="new-task"
        >
          <Plus size={18} />
          Nueva tarea
        </motion.button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterPriority(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            !filterPriority ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-slate-400 hover:text-white'
          )}
        >
          Todas
        </button>
        {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
          <button
            key={p}
            onClick={() => setFilterPriority(filterPriority === p ? null : p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filterPriority === p ? 'text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            )}
            style={filterPriority === p ? { background: PRIORITY_CONFIG[p].color } : {}}
          >
            {PRIORITY_CONFIG[p].label}
          </button>
        ))}
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1',
              filterTag === tag ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            )}
          >
            <Tag size={10} />
            {tag}
          </button>
        ))}
      </div>

      {/* Tablero Kanban */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn key={col.id} column={col} tasks={getTasksByStatus(col.id)} />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} overlay />}
        </DragOverlay>
      </DndContext>

      {/* Modal nueva tarea */}
      <AnimatePresence>
        {showForm && <NewTaskForm onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  )
}
