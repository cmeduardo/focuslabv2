import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const webhookSchema = z.object({
  report_id: z.number(),
  status: z.enum(['completed', 'failed']),
  ai_analysis: z.object({
    attention_profile: z.string(),
    summary: z.string(),
    strengths: z.array(z.string()),
    areas_to_improve: z.array(z.string()),
    patterns_detected: z.array(z.string()),
    recommendations: z.array(z.string()),
    risk_indicators: z.object({
      burnout_risk: z.enum(['low', 'moderate', 'high']),
      attention_deficit_indicators: z.enum(['none', 'mild', 'moderate', 'significant']),
      stress_patterns: z.string(),
    }),
  }).optional(),
})

// POST /api/reports/webhook
// Callback de n8n — recibe el análisis IA y actualiza el reporte en Supabase
export async function POST(request: NextRequest) {
  try {
    // Verificar secret si está configurado
    const secret = process.env.N8N_WEBHOOK_SECRET
    if (secret) {
      const incomingSecret = request.headers.get('X-Webhook-Secret')
      if (incomingSecret !== secret) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const body = await request.json()
    const parsed = webhookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido', details: parsed.error.flatten() }, { status: 400 })
    }

    const { report_id, status, ai_analysis } = parsed.data

    // Usar service role para poder actualizar sin restricciones de RLS
    const supabase = await createClient()

    const updates: Record<string, unknown> = {
      status,
      analyzed_at: new Date().toISOString(),
    }

    if (ai_analysis) {
      updates.ai_analysis = ai_analysis
      updates.attention_profile = ai_analysis.attention_profile
      updates.recommendations = ai_analysis.recommendations
    }

    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', report_id)

    if (error) {
      console.error('Error actualizando reporte:', error)
      return NextResponse.json({ error: 'Error al actualizar reporte' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error en /api/reports/webhook:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
