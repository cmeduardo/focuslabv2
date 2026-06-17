import { createClient } from '@/lib/supabase/server'
import ReportsClient from '@/components/reports/ReportsClient'
import type { Report } from '@/types/reports'

// Página de reportes — listado y generación
export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <ReportsClient reports={(reports ?? []) as Report[]} />
}
