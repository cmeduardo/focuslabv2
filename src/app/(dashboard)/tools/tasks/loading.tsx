import { Skeleton } from '@/components/ui/skeleton'

// Skeleton del Kanban de tareas
export default function TasksLoading() {
  return (
    <div className="h-full px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      {/* Columnas Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-4rem)]">
        {['To Do', 'En Progreso', 'Completado'].map((col) => (
          <div key={col} className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {Array.from({ length: col === 'To Do' ? 3 : col === 'En Progreso' ? 2 : 1 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-18 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
