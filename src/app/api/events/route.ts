import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Esquema de validación para el batch de eventos
const EventSchema = z.object({
  event_type: z.string(),
  category: z.enum(['navigation', 'interaction', 'focus', 'idle', 'tool_usage', 'activity', 'session']),
  page: z.string(),
  target: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
})

const BatchSchema = z.object({
  session_id: z.string().uuid(),
  events: z.array(EventSchema).min(1).max(100),
})

// Endpoint para recibir batches de eventos de tracking
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = BatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 })
    }

    const { session_id, events } = parsed.data

    // Insertar eventos en batch
    const eventsToInsert = events.map(event => ({
      user_id: user.id,
      session_id,
      event_type: event.event_type,
      category: event.category,
      page: event.page,
      target: event.target,
      metadata: event.metadata || {},
      timestamp: event.timestamp,
    }))

    const { error } = await supabase.from('events').insert(eventsToInsert)

    if (error) {
      console.error('Error insertando eventos:', error)
      return NextResponse.json({ error: 'Error al guardar eventos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: events.length })
  } catch (error) {
    console.error('Error en /api/events:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
