'use client'

// Hook para emitir eventos de tracking desde cualquier componente del dashboard
import { useEventCaptureContext, type TrackEventInput } from '@/components/tracking/EventCapture'

export type { TrackEventInput }

// Devuelve la función track y el session_id activo
export function useEventTracker() {
  const { track, sessionId } = useEventCaptureContext()
  return { track, sessionId }
}
