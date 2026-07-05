import { Skeleton } from '@/components/ui/skeleton'

// Skeleton del habit tracker mientras carga desde Supabase
export default function HabitsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Hábitos */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, j) => (
              <Skeleton key={j} className="h-6 w-6 rounded-sm" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
