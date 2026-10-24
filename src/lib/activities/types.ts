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

// Tiempos en ms relativos al inicio de la ronda.
export type TrialRecord = {
  trialIndex: number;
  condition: JsonObject;
  stimulusOnsetMs: number | null;
  responseAtMs: number | null;
  rtMs: number | null;
  response: string | null;
  // Detalle opcional de la respuesta (ensayos_actividad.detalle_respuesta).
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

export type ActivitySummary = {
  // Precisión (0 a 100) y nivel cuando aplique.
  accuracy: number | null;
  levelReached: number | null;
  primary: { key: string; label: string; value: number | null; unit: string };
  // Todas las métricas calculadas (resultados_actividad.metricas).
  metrics: JsonObject;
  // Subconjunto curado que viaja a n8n para el agente de IA.
  report: JsonObject;
  // Frase de "estilo" para la pantalla de resultado: tendencia, nunca falla.
  styleNote: string;
};
