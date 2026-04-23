// Helper para guardar resultados de actividades en Supabase
import { createClient } from '@/lib/supabase/client'
import type { ActivityType } from '@/types/activities'

interface SaveActivityResultParams {
  activity: ActivityType
  score: number
  maxScore: number
  durationSeconds: number
  metrics: Record<string, unknown>
  sessionId?: string
}

export async function saveActivityResult(params: SaveActivityResultParams) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  const { error } = await supabase.from('activity_results').insert({
    user_id: user.id,
    session_id: params.sessionId ?? null,
    activity: params.activity,
    score: params.score,
    max_score: params.maxScore,
    duration_seconds: params.durationSeconds,
    metrics: params.metrics,
  })

  if (error) throw error
}
