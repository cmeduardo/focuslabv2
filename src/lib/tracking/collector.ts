'use client'

// Collector de eventos: acumula en buffer, envía en batch y gestiona la sesión
import type { TrackingEvent, BatchPayload } from '@/types/events'
import type { SessionInfo, DeviceInfo, CollectorConfig } from './types'

const DEFAULT_CONFIG: CollectorConfig = {
  maxBufferSize: 50,
  flushInterval: 10_000,
  endpoint: '/api/events',
  sessionsEndpoint: '/api/sessions',
}

// Recoge información del dispositivo en el momento de iniciar la sesión
function getDeviceInfo(): DeviceInfo {
  return {
    user_agent: navigator.userAgent,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
  }
}

// Envía datos usando sendBeacon (no bloqueante, ideal para beforeunload)
function sendViaBeacon(url: string, data: unknown): boolean {
  try {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    return navigator.sendBeacon(url, blob)
  } catch {
    return false
  }
}

export class EventCollector {
  private buffer: TrackingEvent[] = []
  private sessionInfo: SessionInfo | null = null
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private config: CollectorConfig
  private destroyed = false

  constructor(config: Partial<CollectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Crea la sesión en el servidor y arranca los timers periódicos
  async startSession(): Promise<SessionInfo | null> {
    try {
      const deviceInfo = getDeviceInfo()

      const response = await fetch(this.config.sessionsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', device_info: deviceInfo }),
      })

      if (!response.ok) {
        console.warn('No se pudo iniciar la sesión de tracking, status:', response.status)
        return null
      }

      const data = await response.json()
      this.sessionInfo = {
        id: data.session_id,
        started_at: data.started_at,
        device_info: deviceInfo,
      }

      // Heartbeat cada 30 s para mantener la sesión activa y registrar páginas
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 30_000)

      // Flush periódico del buffer cada flushInterval ms
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval)

      return this.sessionInfo
    } catch (error) {
      console.error('Error iniciando sesión de tracking:', error)
      return null
    }
  }

  // Heartbeat: actualiza la sesión con la página actual (usa sendBeacon para no bloquear)
  private sendHeartbeat(): void {
    if (!this.sessionInfo || this.destroyed) return

    sendViaBeacon(this.config.sessionsEndpoint, {
      action: 'heartbeat',
      session_id: this.sessionInfo.id,
      current_page: window.location.pathname,
    })
  }

  // Agrega un evento al buffer; hace flush inmediato si se alcanza el máximo
  push(event: TrackingEvent): void {
    if (this.destroyed || !this.sessionInfo) return

    this.buffer.push(event)

    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush()
    }
  }

  // Envía el buffer actual al servidor vía fetch; reintegra eventos si falla
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.sessionInfo) return

    const events = this.buffer.splice(0)
    const payload: BatchPayload = { session_id: this.sessionInfo.id, events }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      // Devolver eventos al frente del buffer para no perderlos
      this.buffer.unshift(...events)
      console.error('Error enviando batch de eventos:', error)
    }
  }

  // Envía el buffer usando sendBeacon (para beforeunload, no bloquea el cierre)
  flushWithBeacon(): void {
    if (this.buffer.length === 0 || !this.sessionInfo) return

    const events = this.buffer.splice(0)
    const payload: BatchPayload = { session_id: this.sessionInfo.id, events }
    sendViaBeacon(this.config.endpoint, payload)
  }

  // Cierra la sesión: flush final + señal de fin de sesión al servidor
  endSession(): void {
    if (!this.sessionInfo) return

    this.flushWithBeacon()

    sendViaBeacon(this.config.sessionsEndpoint, {
      action: 'end',
      session_id: this.sessionInfo.id,
    })
  }

  getSession(): SessionInfo | null {
    return this.sessionInfo
  }

  // Limpia todos los timers y vacía el buffer
  destroy(): void {
    this.destroyed = true

    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.buffer = []
  }
}
