'use client'

// Provider global de captura de eventos — envuelve todo el dashboard layout
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { EventCollector } from '@/lib/tracking/collector'
import type { EventCategory, TrackingEvent } from '@/types/events'

// Forma simplificada que expone el hook (page y timestamp se infieren)
export interface TrackEventInput {
  event_type: string
  category: EventCategory
  target?: string
  metadata?: Record<string, unknown>
  page?: string
}

interface EventCaptureContextValue {
  track: (event: TrackEventInput) => void
  sessionId: string | null
}

const EventCaptureContext = createContext<EventCaptureContextValue>({
  track: () => {},
  sessionId: null,
})

// Eventos de actividad del usuario que resetean el timer de idle
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart'] as const

// Segundos de inactividad antes de emitir idle_start
const IDLE_TIMEOUT_MS = 30_000

// Obtiene una etiqueta legible del elemento clickeado
function getTargetLabel(target: EventTarget | null): string {
  if (!(target instanceof HTMLElement)) return 'unknown'

  // Priorizar atributo explícito de tracking
  const dataTracking = target.closest('[data-tracking]')?.getAttribute('data-tracking')
  if (dataTracking) return dataTracking

  // aria-label del elemento o su ancestro interactivo
  const ariaLabel =
    target.getAttribute('aria-label') ||
    target.closest('[aria-label]')?.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel

  // Texto visible de botones y enlaces
  const interactive = target.closest('button, a, [role="button"]')
  if (interactive) {
    const text = interactive.textContent?.trim().slice(0, 50)
    if (text) return text
  }

  return target.tagName.toLowerCase()
}

export function EventCaptureProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const collectorRef = useRef<EventCollector | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Referencias para page-view y métricas de scroll
  const prevPathRef = useRef<string>(pathname)
  const pageEntryTimeRef = useRef<number>(Date.now())
  const lastScrollYRef = useRef<number>(0)
  const scrollTimeRef = useRef<number>(Date.now())

  // Referencias para detección de idle
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isIdleRef = useRef<boolean>(false)

  // Emite un evento al collector (estable, no cambia entre renders)
  const track = useCallback((input: TrackEventInput) => {
    const collector = collectorRef.current
    if (!collector) return

    const event: TrackingEvent = {
      event_type: input.event_type,
      category: input.category,
      page: input.page ?? window.location.pathname,
      target: input.target,
      metadata: input.metadata,
      timestamp: new Date().toISOString(),
    }

    collector.push(event)
  }, [])

  // Reinicia el contador de idle; emite idle_end si el usuario vuelve de un idle
  const resetIdleTimer = useCallback(() => {
    if (isIdleRef.current) {
      isIdleRef.current = false
      track({ event_type: 'idle_end', category: 'idle', metadata: { idle_duration_ms: IDLE_TIMEOUT_MS } })
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true
      track({
        event_type: 'idle_start',
        category: 'idle',
        metadata: { last_active_element: document.activeElement?.tagName?.toLowerCase() ?? 'unknown' },
      })
    }, IDLE_TIMEOUT_MS)
  }, [track])

  // ── Inicializar collector y sesión ──────────────────────────────────────
  useEffect(() => {
    const collector = new EventCollector()
    collectorRef.current = collector

    collector.startSession().then((session) => {
      if (!session) return

      setSessionId(session.id)

      // Evento de inicio de sesión con info del dispositivo
      collector.push({
        event_type: 'session_start',
        category: 'session',
        page: window.location.pathname,
        metadata: {
          device_info: session.device_info,
          screen_size: `${window.screen.width}x${window.screen.height}`,
        },
        timestamp: new Date().toISOString(),
      })

      // Primera vista de página
      collector.push({
        event_type: 'page_view',
        category: 'navigation',
        page: window.location.pathname,
        metadata: { from: null, to: window.location.pathname },
        timestamp: new Date().toISOString(),
      })
    })

    return () => {
      collector.destroy()
      collectorRef.current = null
    }
  }, [])

  // ── beforeunload: flush final + cerrar sesión vía sendBeacon ────────────
  useEffect(() => {
    const handleUnload = () => {
      track({
        event_type: 'session_end',
        category: 'session',
        metadata: { total_duration: Date.now() - pageEntryTimeRef.current },
      })
      collectorRef.current?.endSession()
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [track])

  // ── Clicks en el documento ──────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      resetIdleTimer()
      const label = getTargetLabel(e.target)
      const el = e.target instanceof HTMLElement ? e.target : null

      track({
        event_type: 'click',
        category: 'interaction',
        target: label,
        metadata: {
          target_label: label,
          target_type: el?.tagName?.toLowerCase() ?? 'unknown',
          coordinates: { x: e.clientX, y: e.clientY },
        },
      })
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [track, resetIdleTimer])

  // ── Scroll (debounced 300 ms) ───────────────────────────────────────────
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null

    const handleScroll = () => {
      resetIdleTimer()
      if (debounce) clearTimeout(debounce)

      debounce = setTimeout(() => {
        const scrollY = window.scrollY
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        const depthPercent = maxScroll > 0 ? Math.round((scrollY / maxScroll) * 100) : 0
        const now = Date.now()
        const elapsed = now - scrollTimeRef.current
        const velocity = elapsed > 0 ? Math.round(Math.abs(scrollY - lastScrollYRef.current) / elapsed * 1000) : 0
        const direction = scrollY >= lastScrollYRef.current ? 'down' : 'up'

        lastScrollYRef.current = scrollY
        scrollTimeRef.current = now

        track({
          event_type: 'scroll',
          category: 'interaction',
          metadata: { depth_percent: depthPercent, direction, velocity },
        })
      }, 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (debounce) clearTimeout(debounce)
    }
  }, [track, resetIdleTimer])

  // ── Visibilidad de la pestaña (focus / blur) ────────────────────────────
  useEffect(() => {
    let hiddenAt = 0

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        track({
          event_type: 'tab_blur',
          category: 'focus',
          metadata: { active_element: document.activeElement?.tagName?.toLowerCase() ?? 'unknown' },
        })
      } else {
        track({
          event_type: 'tab_focus',
          category: 'focus',
          metadata: { was_hidden_for_ms: hiddenAt > 0 ? Date.now() - hiddenAt : 0 },
        })
        resetIdleTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [track, resetIdleTimer])

  // ── Actividad del usuario para resetear idle ────────────────────────────
  useEffect(() => {
    const handler = () => resetIdleTimer()

    ACTIVITY_EVENTS.forEach((ev) => document.addEventListener(ev, handler, { passive: true }))
    resetIdleTimer() // Arrancar el timer desde el principio

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => document.removeEventListener(ev, handler))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer])

  // ── Page view al cambiar de ruta (App Router) ───────────────────────────
  useEffect(() => {
    const prev = prevPathRef.current
    const now = Date.now()

    if (prev !== pathname) {
      track({
        event_type: 'page_view',
        category: 'navigation',
        page: pathname,
        metadata: {
          from: prev,
          to: pathname,
          duration_on_page: now - pageEntryTimeRef.current,
        },
      })
      prevPathRef.current = pathname
      pageEntryTimeRef.current = now
    }
  }, [pathname, track])

  return (
    <EventCaptureContext.Provider value={{ track, sessionId }}>
      {children}
    </EventCaptureContext.Provider>
  )
}

export function useEventCaptureContext(): EventCaptureContextValue {
  return useContext(EventCaptureContext)
}
