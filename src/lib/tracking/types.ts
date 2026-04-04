// Tipos internos del sistema de tracking (no expuestos como API pública)

export interface SessionInfo {
  id: string
  started_at: string
  device_info: DeviceInfo
}

export interface DeviceInfo {
  user_agent: string
  screen_width: number
  screen_height: number
  viewport_width: number
  viewport_height: number
  language: string
  timezone: string
  platform: string
}

export interface CollectorConfig {
  // Máximo de eventos en buffer antes de flush inmediato
  maxBufferSize: number
  // Intervalo en ms para flush periódico automático (default: 10 000)
  flushInterval: number
  endpoint: string
  sessionsEndpoint: string
}
