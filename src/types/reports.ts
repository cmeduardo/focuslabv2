// Tipos para los reportes de análisis

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface RiskIndicators {
  burnout_risk: 'low' | 'moderate' | 'high'
  attention_deficit_indicators: 'none' | 'mild' | 'moderate' | 'significant'
  stress_patterns: string
}

export interface AIAnalysis {
  attention_profile: string
  summary: string
  strengths: string[]
  areas_to_improve: string[]
  patterns_detected: string[]
  recommendations: string[]
  risk_indicators: RiskIndicators
}

export interface Report {
  id: number
  user_id: string
  period_start: string
  period_end: string
  status: ReportStatus
  raw_data: Record<string, unknown>
  ai_analysis?: AIAnalysis
  attention_profile?: string
  recommendations?: string[]
  focus_score_avg?: number
  generated_at?: string
  analyzed_at?: string
  created_at: string
}
