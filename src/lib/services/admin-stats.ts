import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, UserRole } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-13/RF-14: las vistas vw_* ya filtran por rol (can_read_aggregates /
// can_read_participant_level en la base) y nunca exponen user_id (RS-04),
// así que se leen con el cliente del usuario. Desde el rediseño v2 solo
// cuentan participantes y datos v2 (ver 20261004000002_analysis_views.sql).
//
// scope "aggregate": investigador y autoridad. scope "participant": solo
// investigador (una fila por participante o por ensayo, con seudónimo).
export const EXPORT_DATASETS = {
  dimensiones: {
    view: "vw_actividades_dimensiones",
    scope: "aggregate",
    label: "Dimensiones",
    columns: [
      "activity_type",
      "dimension",
      "metrica_principal",
      "device_type",
      "participantes",
      "valor_promedio",
      "valor_desv_estandar",
      "valor_minimo",
      "valor_maximo",
      "precision_promedio",
      "duracion_s_promedio",
    ],
  },
  actividades: {
    view: "vw_activity_results_summary",
    scope: "aggregate",
    label: "Actividades",
    columns: [
      "activity_type",
      "total_resultados",
      "duracion_ms_promedio",
      "precision_promedio",
      "nivel_promedio",
      "precision_desv_estandar",
    ],
  },
  eventos: {
    view: "vw_interaction_events_summary",
    scope: "aggregate",
    label: "Eventos",
    columns: ["event_type", "dia", "total_eventos"],
  },
  sesiones: {
    view: "vw_sessions_summary",
    scope: "aggregate",
    label: "Sesiones",
    columns: ["dia", "status", "total_sesiones", "duracion_segundos_promedio"],
  },
  herramientas: {
    view: "vw_tool_usage_summary",
    scope: "aggregate",
    label: "Herramientas",
    columns: ["herramienta", "dia", "total_usos", "total_interrupciones"],
  },
  participantes: {
    view: "vw_participantes_analisis",
    scope: "participant",
    label: "Participantes (seudónimo)",
    columns: null,
  },
  ensayos: {
    view: "vw_ensayos_analisis",
    scope: "participant",
    label: "Ensayos (seudónimo)",
    columns: [
      "participante",
      "activity_type",
      "device_type",
      "entrada_principal",
      "refresh_hz_est",
      "corrida_inicio",
      "trial_index",
      "condition",
      "stimulus_onset_ms",
      "rt_ms",
      "response",
      "correct",
      "classification",
      "input_type",
      "valid",
      "invalid_reason",
    ],
  },
} as const satisfies Record<
  string,
  {
    view: keyof Database["public"]["Views"];
    scope: "aggregate" | "participant";
    label: string;
    columns: readonly string[] | null;
  }
>;

export type ExportDataset = keyof typeof EXPORT_DATASETS;

export function isExportDataset(value: string | null): value is ExportDataset {
  return value !== null && value in EXPORT_DATASETS;
}

export function canExport(dataset: ExportDataset, role: UserRole | null | undefined) {
  if (EXPORT_DATASETS[dataset].scope === "participant") return role === "investigador";
  return role === "investigador" || role === "autoridad";
}

// PostgREST corta cada respuesta en 1000 filas: los ensayos de un taller
// completo son decenas de miles.
const PAGE_SIZE = 1000;

async function fetchAllRows(supabase: Client, view: keyof Database["public"]["Views"]) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(view)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("No se pudo generar la exportación.");
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function getAdminOverview(supabase: Client) {
  const [dimensions, activities, events, sessions, tools] = await Promise.all([
    supabase.from("vw_actividades_dimensiones").select("*"),
    supabase.from("vw_activity_results_summary").select("*"),
    supabase.from("vw_interaction_events_summary").select("*"),
    supabase.from("vw_sessions_summary").select("*").order("dia"),
    supabase.from("vw_tool_usage_summary").select("*").order("dia"),
  ]);

  if (dimensions.error || activities.error || events.error || sessions.error || tools.error) {
    throw new Error("No se pudo cargar el panel agregado.");
  }

  return {
    dimensions: dimensions.data ?? [],
    activities: activities.data ?? [],
    events: events.data ?? [],
    sessions: sessions.data ?? [],
    tools: tools.data ?? [],
  };
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = typeof value === "object" ? JSON.stringify(value) : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function buildDatasetCsv(supabase: Client, dataset: ExportDataset) {
  const { view, columns } = EXPORT_DATASETS[dataset];
  const rows = await fetchAllRows(supabase, view);
  // participantes: columnas anchas definidas en la vista (no se repiten acá).
  const header: readonly string[] = columns ?? (rows[0] ? Object.keys(rows[0]) : ["participante"]);
  const lines = [
    header.join(","),
    ...rows.map((row) => header.map((column) => escapeCsv(row[column])).join(",")),
  ];

  // BOM para que Excel interprete el UTF-8 correctamente.
  return `\uFEFF${lines.join("\n")}\n`;
}
