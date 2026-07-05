import { SkeletonReportCard, Skeleton } from '@/components/ui/skeleton'

// Skeleton de la página de reportes mientras se cargan desde Supabase
export default function ReportsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Tarjetas de reporte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonReportCard key={i} />
        ))}
      </div>
    </div>
  )
}
