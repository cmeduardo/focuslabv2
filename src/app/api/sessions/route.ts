import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Esquemas para las tres acciones posibles
const StartSchema = z.object({
  action: z.literal('start'),
  device_info: z.record(z.string(), z.unknown()),
})

const HeartbeatSchema = z.object({
  action: z.literal('heartbeat'),
  session_id: z.string().uuid(),
  current_page: z.string().optional(),
})

const EndSchema = z.object({
  action: z.literal('end'),
  session_id: z.string().uuid(),
})

const SessionActionSchema = z.discriminatedUnion('action', [StartSchema, HeartbeatSchema, EndSchema])

// Endpoint de gestión de sesiones (inicio, heartbeat, fin)
// sendBeacon lo llama con Content-Type: application/json (Blob)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = SessionActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 })
    }

    const data = parsed.data

    // ── Iniciar sesión ────────────────────────────────────────────────────
    if (data.action === 'start') {
      // Fallback: si el trigger no creó el perfil, lo creamos aquí
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        const username = user.user_metadata?.username ?? user.email?.split('@')[0] ?? user.id
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username,
            full_name: user.user_metadata?.full_name ?? '',
            avatar_url: user.user_metadata?.avatar_url ?? '',
          })

        if (profileError && profileError.code !== '23505') {
          // 23505 = unique_violation: el perfil ya existe, ignorar
          console.error('Error creando perfil fallback:', profileError)
          return NextResponse.json({ error: 'Error al inicializar perfil' }, { status: 500 })
        }
      }

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          device_info: data.device_info,
          pages_visited: [],
          total_events: 0,
        })
        .select('id, started_at')
        .single()

      if (error) {
        console.error('Error creando sesión:', error)
        return NextResponse.json({ error: 'Error al crear sesión' }, { status: 500 })
      }

      return NextResponse.json({ session_id: session.id, started_at: session.started_at })
    }

    // ── Heartbeat: actualizar páginas visitadas ───────────────────────────
    if (data.action === 'heartbeat') {
      const { data: session } = await supabase
        .from('sessions')
        .select('pages_visited')
        .eq('id', data.session_id)
        .eq('user_id', user.id)
        .single()

      const pages: string[] = session?.pages_visited ?? []
      const page = data.current_page

      if (page && !pages.includes(page)) {
        pages.push(page)
      }

      // Ignorar errores en heartbeat para no interrumpir al usuario
      await supabase
        .from('sessions')
        .update({ pages_visited: pages })
        .eq('id', data.session_id)
        .eq('user_id', user.id)

      return NextResponse.json({ ok: true })
    }

    // ── Cerrar sesión: registrar ended_at y duración ──────────────────────
    if (data.action === 'end') {
      const { data: session } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('id', data.session_id)
        .eq('user_id', user.id)
        .single()

      const endedAt = new Date()
      const durationSeconds = session?.started_at
        ? Math.round((endedAt.getTime() - new Date(session.started_at).getTime()) / 1000)
        : null

      await supabase
        .from('sessions')
        .update({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds })
        .eq('id', data.session_id)
        .eq('user_id', user.id)

      return NextResponse.json({ ok: true })
    }
  } catch (error) {
    console.error('Error en /api/sessions:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
