import { SkeletonStatCard, SkeletonChart, SkeletonListItem, Skeleton } from '@/components/ui/skeleton'

// Skeleton del dashboard mientras cargan los datos del servidor
export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Greeting */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Sparkline chart + timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonChart height="h-56" />
        {/* Timeline */}
        <div className="glass-card rounded-2xl p-5">
          <Skeleton className="h-4 w-32 mb-5" />
          <div className="divide-y divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
