// Variables del análisis del investigador (mismas que el tablero de Power
// BI "FocusLab-Investigador"). Salen de vw_participantes_analisis: una fila
// por participante, primer intento v2 de cada desafío.

export type VariableGroup = "pasiva" | "cognitiva";

export type VariableDef = {
  key: string;
  label: string;
  group: VariableGroup;
  // En el índice de dificultad se invierte el signo de las variables en
  // que un valor más alto indica más facilidad (span, comprensión).
  higherIsEasier?: boolean;
};

export const PASSIVE_VARIABLES = [
  { key: "cambios_pestana_por_sesion", label: "Cambios de pestaña por sesión", group: "pasiva" },
  { key: "dr_salidas_pestana", label: "Deep Read · salidas de pestaña", group: "pasiva" },
  { key: "inactividad_promedio_s", label: "Inactividad promedio (s)", group: "pasiva" },
  { key: "pomodoro_interrupcion_pct", label: "Interrupción de Pomodoro (%)", group: "pasiva" },
  { key: "pomodoro_pausas_promedio", label: "Pausas por Pomodoro", group: "pasiva" },
  { key: "periodos_inactividad", label: "Periodos de inactividad", group: "pasiva" },
] as const satisfies readonly VariableDef[];

export const COGNITIVE_VARIABLES = [
  { key: "rt_promedio_ms", label: "Reaction Test · TR promedio (ms)", group: "cognitiva" },
  { key: "rt_lapsos", label: "Reaction Test · lapsos", group: "cognitiva" },
  { key: "ff_comision_pct", label: "Focus Flow · comisiones (%)", group: "cognitiva" },
  { key: "ff_omision_pct", label: "Focus Flow · omisiones (%)", group: "cognitiva" },
  { key: "mm_span", label: "Memory Matrix · span", group: "cognitiva", higherIsEasier: true },
  { key: "ws_interferencia_ms", label: "Word Sprint · interferencia (ms)", group: "cognitiva" },
  { key: "ph_deteccion_ms", label: "Pattern Hunt · detección (ms)", group: "cognitiva" },
  { key: "ph_pendiente_conjuncion", label: "Pattern Hunt · pendiente conjunción", group: "cognitiva" },
  {
    key: "dr_comprension",
    label: "Deep Read · comprensión (aciertos)",
    group: "cognitiva",
    higherIsEasier: true,
  },
] as const satisfies readonly VariableDef[];

export const VARIABLES: readonly VariableDef[] = [...PASSIVE_VARIABLES, ...COGNITIVE_VARIABLES];

export type VariableKey =
  | (typeof PASSIVE_VARIABLES)[number]["key"]
  | (typeof COGNITIVE_VARIABLES)[number]["key"];

export const VARIABLE_BY_KEY: ReadonlyMap<string, VariableDef> = new Map(
  VARIABLES.map((v) => [v.key, v]),
);

export function isVariableKey(value: string | undefined | null): value is VariableKey {
  return !!value && VARIABLE_BY_KEY.has(value);
}

export const DEVICE_LABEL: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Laptop",
  sin_dato: "Sin dato",
};

export function deviceLabel(device: string) {
  return DEVICE_LABEL[device] ?? device;
}

// Orden fijo de los grupos de dispositivo en tablas y leyendas.
export const DEVICE_ORDER = ["mobile", "desktop", "tablet", "sin_dato"];

export function sortDevices(devices: Iterable<string>) {
  return [...new Set(devices)].sort((a, b) => {
    const ia = DEVICE_ORDER.indexOf(a);
    const ib = DEVICE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
}
