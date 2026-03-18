// Tipos para las actividades de atención

export type ActivityType =
  | 'reaction_test'
  | 'focus_flow'
  | 'memory_matrix'
  | 'word_sprint'
  | 'pattern_hunt'
  | 'deep_read'

export interface ActivityResult {
  id: number
  user_id: string
  session_id?: string
  activity: ActivityType
  score?: number
  max_score?: number
  duration_seconds?: number
  metrics: Record<string, unknown>
  completed_at: string
  created_at: string
}

export interface ReactionTestMetrics {
  avg_reaction_time_ms: number
  min_reaction_time_ms: number
  max_reaction_time_ms: number
  false_starts: number
  missed_signals: number
  consistency_score: number
  fatigue_trend: number[]
  reaction_times: number[]
}

export interface FocusFlowMetrics {
  total_tracking_time_ms: number
  time_on_target_ms: number
  time_off_target_ms: number
  accuracy_percent: number
  longest_focus_streak_ms: number
  distraction_responses: number
  performance_over_time: number[]
}

export interface MemoryMatrixMetrics {
  max_level_reached: number
  accuracy_per_level: number[]
  avg_response_time_per_cell_ms: number
  working_memory_span: number
  error_patterns: string
  total_correct: number
  total_attempts: number
}

export interface WordSprintMetrics {
  total_words: number
  correct: number
  incorrect: number
  missed: number
  accuracy_percent: number
  avg_decision_time_ms: number
  stroop_effect_detected: boolean
  speed_accuracy_tradeoff: number
  performance_by_difficulty: Record<string, number>
}

export interface PatternHuntMetrics {
  levels_completed: number
  avg_detection_time_ms: number
  accuracy_percent: number
  visual_search_efficiency: number
  difficulty_threshold: string
  false_positives: number
  pattern_types_mastered: string[]
}

export interface DeepReadMetrics {
  total_reading_time_ms: number
  time_per_paragraph_ms: number[]
  re_reads: number
  scroll_speed_avg: number
  comprehension_score: number
  detail_questions_correct: number
  inference_questions_correct: number
  reading_pattern: string
}
