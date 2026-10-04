import type { DeviceType, InputType } from "@/lib/types/database";

export type { DeviceType, InputType };

export type RoundMode = "practice" | "registered";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | readonly JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

// Un ensayo tal como se guarda en activity_trials. Los tiempos son ms
// relativos al inicio de la ronda registrada (performance.now()).
export type TrialRecord = {
  trialIndex: number;
  condition: JsonObject;
  stimulusOnsetMs: number | null;
  responseAtMs: number | null;
  rtMs: number | null;
  response: string | null;
  // Detalle opcional de la respuesta (→ activity_trials.response_detail).
  detail?: JsonObject | null;
  correct: boolean | null;
  classification: string | null;
  inputType: InputType | null;
  valid: boolean;
  invalidReason: string | null;
};

export type DeviceContext = {
  deviceType: DeviceType;
  viewportW: number;
  viewportH: number;
  devicePixelRatio: number;
  orientation: "portrait" | "landscape";
  browser: string;
  os: string;
  refreshHzEst: number | null;
};

// Lo que cada actividad calcula a partir de sus ensayos (función pura en
// lib/activities/<actividad>/metrics.ts).
export type ActivitySummary = {
  // RF-05: precisión (0–100) y nivel cuando aplique.
  accuracy: number | null;
  levelReached: number | null;
  // Métrica principal documentada en la tesis.
  primary: { key: string; label: string; value: number | null; unit: string };
  // Todas las métricas calculadas → activity_results.metrics.
  metrics: JsonObject;
  // Subconjunto curado que viaja a n8n para el agente de IA.
  report: JsonObject;
  // Frase de "estilo" para la pantalla de resultado: tendencia, nunca falla.
  styleNote: string;
};
