// Tipos para el sistema de captura de eventos

export type EventCategory =
  | 'navigation'
  | 'interaction'
  | 'focus'
  | 'idle'
  | 'tool_usage'
  | 'activity'
  | 'session'

export interface TrackingEvent {
  event_type: string
  category: EventCategory
  page: string
  target?: string
  metadata?: Record<string, unknown>
  timestamp: string // ISO 8601
}

export interface BatchPayload {
  session_id: string
  events: TrackingEvent[]
}
