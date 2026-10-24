// Todo número que afecta la medición vive aquí y se copia a intentos_actividad.configuracion.
// NEXT_PUBLIC_ACTIVITY_FAST=1 (solo E2E) acorta las esperas.
const FAST = process.env.NEXT_PUBLIC_ACTIVITY_FAST === "1";

export const PROTOCOL_VERSION = "v2";

export const SHELL_CONFIG = {
  countdownSeconds: FAST ? 1 : 3,
  maxPracticeRounds: 2,
  saveAttempts: 3,
  saveRetryBaseMs: FAST ? 100 : 800,
  // Ventana de rAF usada para estimar la frecuencia de refresco.
  refreshSampleFrames: 30,
} as const;

// Reaction Test: alerta / vigilancia (Psychomotor Vigilance Task,
// Dinges & Powell, 1985).
export const REACTION_TEST_CONFIG = {
  registeredTrials: 22,
  practiceTrials: 3,
  isiMinMs: FAST ? 300 : 2000,
  isiMaxMs: FAST ? 600 : 10_000,
  practiceIsiMinMs: FAST ? 300 : 2000,
  practiceIsiMaxMs: FAST ? 600 : 4000,
  // Sin respuesta en este tiempo, el ensayo se cierra como lapso.
  responseWindowMs: 3000,
  anticipationThresholdMs: 100,
  lapseThresholdMs: 500,
  practiceFeedbackMs: FAST ? 300 : 1400,
  interTrialMs: FAST ? 150 : 600,
} as const;

export type ReactionTestConfig = typeof REACTION_TEST_CONFIG;

// Focus Flow: atención sostenida (Sustained Attention to Response Task,
// Robertson et al., 1997). 12 apariciones de cada dígito del 1 al 9: 108
// ensayos, 12 objetivos "3" (11,1 %).
export const FOCUS_FLOW_CONFIG = {
  targetDigit: 3,
  repetitionsPerDigit: 12,
  practiceTrials: 6,
  digitVisibleMs: FAST ? 120 : 250,
  maskMs: FAST ? 330 : 900,
  // Tamaños de fuente variables (rem), como en el SART original: evita que
  // se responda a la forma exacta en vez de al número.
  fontSizesRem: [3, 4, 5, 6, 7],
  anticipationThresholdMs: 100,
  practiceFeedbackMs: FAST ? 300 : 1200,
} as const;

export type FocusFlowConfig = typeof FOCUS_FLOW_CONFIG;

// Memory Matrix: memoria de trabajo visoespacial (bloques de Corsi, 1972).
export const MEMORY_MATRIX_CONFIG = {
  blockCount: 9,
  startLength: 2,
  maxLength: 9,
  attemptsPerLevel: 2,
  practiceSequences: 2,
  practiceLength: 2,
  blockOnMs: FAST ? 200 : 700,
  blockGapMs: FAST ? 100 : 300,
  preSequenceMs: FAST ? 300 : 900,
  feedbackMs: FAST ? 300 : 1100,
  checkMs: FAST ? 150 : 500,
  tapFlashMs: 180,
} as const;

export type MemoryMatrixConfig = typeof MEMORY_MATRIX_CONFIG;

// Word Sprint: atención selectiva e inhibición (efecto Stroop, 1935).
// 48 ensayos: 24 congruentes (6 por color) y 24 incongruentes (cada
// palabra con cada una de las otras 3 tintas, 2 veces).
export const WORD_SPRINT_CONFIG = {
  congruentPerColor: 6,
  incongruentPerPair: 2,
  practiceTrials: 6,
  fixationMs: FAST ? 150 : 500,
  responseWindowMs: 2500,
  interTrialMs: FAST ? 100 : 300,
  practiceFeedbackMs: FAST ? 300 : 1200,
} as const;

export type WordSprintConfig = typeof WORD_SPRINT_CONFIG;

// Pattern Hunt: búsqueda visual (Treisman & Gelade, 1980). 2 tipos × 3
// tamaños de conjunto × presente/ausente × 4 repeticiones = 48 ensayos.
export const PATTERN_HUNT_CONFIG = {
  setSizes: [6, 12, 18],
  repetitionsPerCell: 4,
  practiceTrials: 6,
  // Grilla invisible: los elementos nunca se superponen.
  gridCols: 6,
  gridRows: 6,
  jitter: 0.15,
  fixationMs: FAST ? 150 : 500,
  responseWindowMs: 6000,
  interTrialMs: FAST ? 100 : 400,
  practiceFeedbackMs: FAST ? 300 : 1300,
} as const;

export type PatternHuntConfig = typeof PATTERN_HUNT_CONFIG;

// Deep Read: resistencia a la distracción durante la lectura.
export const DEEP_READ_CONFIG = {
  notificationAtMs: FAST ? [300, 800, 1300] : [18_000, 50_000, 85_000],
  practiceNotificationAtMs: FAST ? [200] : [4000],
  notificationVisibleMs: FAST ? 400 : 6000,
  // Techo suave: pasado este tiempo, se avanza solo a las preguntas.
  readingCapMs: FAST ? 20_000 : 360_000,
  practiceFeedbackMs: FAST ? 300 : 2200,
} as const;

export type DeepReadConfig = typeof DEEP_READ_CONFIG;
